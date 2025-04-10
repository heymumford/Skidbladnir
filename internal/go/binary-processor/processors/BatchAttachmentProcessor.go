package processors

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// BatchProcessingResult contains the results of batch processing multiple attachments
type BatchProcessingResult struct {
	ProcessedAttachments  []string             `json:"processedAttachments"`
	FailedAttachments     map[string]string    `json:"failedAttachments"` // Map of ID to error message
	ConversionWarnings    map[string][]string  `json:"conversionWarnings"` // Map of ID to warnings
	TotalAttachments      int                  `json:"totalAttachments"`
	SuccessCount          int                  `json:"successCount"`
	FailureCount          int                  `json:"failureCount"`
	TotalProcessingTime   time.Duration        `json:"totalProcessingTime"`
	AverageProcessingTime time.Duration        `json:"averageProcessingTime"`
	BatchID               string               `json:"batchId"`
	StartTime             time.Time            `json:"startTime"`
	EndTime               time.Time            `json:"endTime"`
	ProviderSpecific      map[string]int       `json:"providerSpecific"`
	Stats                 BatchProcessingStats `json:"stats"`
}

// BatchProcessingStats contains statistics about the batch processing
type BatchProcessingStats struct {
	TotalBytesProcessed   int64 `json:"totalBytesProcessed"`
	TotalChunksProcessed  int   `json:"totalChunksProcessed"`
	MaxAttachmentSize     int64 `json:"maxAttachmentSize"`
	MinAttachmentSize     int64 `json:"minAttachmentSize"`
	AvgAttachmentSize     int64 `json:"avgAttachmentSize"`
	TotalConversions      int   `json:"totalConversions"`
	FullConversions       int   `json:"fullConversions"`
	PartialConversions    int   `json:"partialConversions"`
	SkippedConversions    int   `json:"skippedConversions"`
	ImageConversions      int   `json:"imageConversions"`
	TextConversions       int   `json:"textConversions"`
	BinaryConversions     int   `json:"binaryConversions"`
	ZephyrConversions     int   `json:"zephyrConversions"`
	QTestConversions      int   `json:"qTestConversions"`
	AzureDevOpsConversions int  `json:"azureDevOpsConversions"`
	RallyConversions      int   `json:"rallyConversions"`
}

// BatchAttachmentProcessor handles batch processing of multiple attachments
type BatchAttachmentProcessor struct {
	attachmentProcessor *AttachmentProcessor
	formatConverter     *FormatConverter
	log                 *logger.Logger
	workerCount         int
	maxBatchSize        int
}

// BatchProcessingOptions contains options for batch attachment processing
type BatchProcessingOptions struct {
	ProcessingOptions   ProcessingOptions `json:"processingOptions"`
	MaxConcurrentJobs   int               `json:"maxConcurrentJobs"`
	AbortOnFailure      bool              `json:"abortOnFailure"`
	TimeoutSeconds      int               `json:"timeoutSeconds"`
	RetryCount          int               `json:"retryCount"`
	RetryDelayMs        int               `json:"retryDelayMs"`
	CollectDetailedStats bool              `json:"collectDetailedStats"`
	ProviderMappings     map[string]string `json:"providerMappings"`
	FilterByContentType  []string          `json:"filterByContentType"`
	FilterByFileName     []string          `json:"filterByFileName"`
	SkipExisting         bool              `json:"skipExisting"`
}

// NewBatchAttachmentProcessor creates a new batch attachment processor
func NewBatchAttachmentProcessor(
	attachmentProcessor *AttachmentProcessor,
	formatConverter *FormatConverter,
	log *logger.Logger,
) *BatchAttachmentProcessor {
	if log == nil {
		log = logger.CreateLogger("BatchAttachmentProcessor", logger.INFO)
	}

	return &BatchAttachmentProcessor{
		attachmentProcessor: attachmentProcessor,
		formatConverter:     formatConverter,
		log:                 log,
		workerCount:         5, // Default to 5 workers
		maxBatchSize:        100, // Default max batch size
	}
}

// SetWorkerCount sets the number of concurrent workers for batch processing
func (b *BatchAttachmentProcessor) SetWorkerCount(count int) {
	if count > 0 {
		b.workerCount = count
	}
}

// SetMaxBatchSize sets the maximum number of attachments in a batch
func (b *BatchAttachmentProcessor) SetMaxBatchSize(size int) {
	if size > 0 {
		b.maxBatchSize = size
	}
}

// ProcessAttachments processes a batch of attachments
func (b *BatchAttachmentProcessor) ProcessAttachments(
	testCaseID string,
	attachmentIDs []string,
	options *BatchProcessingOptions,
	storage storage.AttachmentStorage,
) (*BatchProcessingResult, error) {
	startTime := time.Now()
	b.log.Info(fmt.Sprintf("Starting batch processing of %d attachments for test case %s", 
		len(attachmentIDs), testCaseID))

	// Apply defaults if needed
	if options == nil {
		options = &BatchProcessingOptions{
			ProcessingOptions: ProcessingOptions{
				Format:       "JSON",
				ExportImages: true,
			},
			MaxConcurrentJobs:  b.workerCount,
			AbortOnFailure:     false,
			TimeoutSeconds:     300, // 5 minutes
			RetryCount:         3,
			RetryDelayMs:       1000,
			CollectDetailedStats: true,
		}
	}

	// Cap the batch size
	if len(attachmentIDs) > b.maxBatchSize {
		b.log.Warn(fmt.Sprintf("Batch size %d exceeds maximum of %d, truncating", 
			len(attachmentIDs), b.maxBatchSize))
		attachmentIDs = attachmentIDs[:b.maxBatchSize]
	}

	// Prepare the result
	result := &BatchProcessingResult{
		ProcessedAttachments: make([]string, 0, len(attachmentIDs)),
		FailedAttachments:    make(map[string]string),
		ConversionWarnings:   make(map[string][]string),
		TotalAttachments:     len(attachmentIDs),
		BatchID:              uuid.New().String(),
		StartTime:            startTime,
		ProviderSpecific:     make(map[string]int),
		Stats: BatchProcessingStats{
			MinAttachmentSize: -1, // Initialize to -1 for first comparison
		},
	}

	// Apply content type filter if specified
	if len(options.FilterByContentType) > 0 {
		filteredIDs, err := b.filterAttachmentsByContentType(
			testCaseID, attachmentIDs, options.FilterByContentType, storage)
		if err != nil {
			return nil, fmt.Errorf("failed to filter attachments by content type: %v", err)
		}
		attachmentIDs = filteredIDs
		result.TotalAttachments = len(attachmentIDs)
	}

	// Apply filename filter if specified
	if len(options.FilterByFileName) > 0 {
		filteredIDs, err := b.filterAttachmentsByFileName(
			testCaseID, attachmentIDs, options.FilterByFileName, storage)
		if err != nil {
			return nil, fmt.Errorf("failed to filter attachments by file name: %v", err)
		}
		attachmentIDs = filteredIDs
		result.TotalAttachments = len(attachmentIDs)
	}

	// Process attachments concurrently
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, options.MaxConcurrentJobs)
	resultMutex := &sync.Mutex{}

	for _, attachmentID := range attachmentIDs {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			semaphore <- struct{}{} // Acquire
			defer func() { <-semaphore }() // Release

			// Process the attachment with retries
			processedID, warnings, err := b.processAttachmentWithRetry(
				testCaseID, id, &options.ProcessingOptions, storage, options.RetryCount, options.RetryDelayMs)

			// Update the result under lock
			resultMutex.Lock()
			defer resultMutex.Unlock()

			if err != nil {
				result.FailedAttachments[id] = err.Error()
				result.FailureCount++
				b.log.Error(fmt.Sprintf("Failed to process attachment %s: %v", id, err))
				if options.AbortOnFailure {
					// This will not immediately stop other goroutines, but no new ones will start
					// and we'll return an error from the overall function
					attachmentIDs = nil
				}
			} else {
				result.ProcessedAttachments = append(result.ProcessedAttachments, processedID)
				result.SuccessCount++
				if len(warnings) > 0 {
					result.ConversionWarnings[id] = warnings
				}
			}
		}(attachmentID)

		// If we're aborting, break the loop
		if options.AbortOnFailure && len(result.FailedAttachments) > 0 {
			break
		}
	}

	// Wait for all goroutines to finish or timeout
	if options.TimeoutSeconds > 0 {
		timeoutCh := make(chan struct{})
		go func() {
			wg.Wait()
			close(timeoutCh)
		}()

		select {
		case <-timeoutCh:
			// All workers completed
		case <-time.After(time.Duration(options.TimeoutSeconds) * time.Second):
			// Timed out
			b.log.Warn(fmt.Sprintf("Batch processing timed out after %d seconds", options.TimeoutSeconds))
			// Note: We can't cancel the goroutines, but we can update the result
			resultMutex.Lock()
			result.FailedAttachments["timeout"] = fmt.Sprintf("Processing timed out after %d seconds", options.TimeoutSeconds)
			resultMutex.Unlock()
		}
	} else {
		// Wait for all workers to finish
		wg.Wait()
	}

	// Finalize the result
	result.EndTime = time.Now()
	result.TotalProcessingTime = result.EndTime.Sub(startTime)
	if result.SuccessCount > 0 {
		result.AverageProcessingTime = result.TotalProcessingTime / time.Duration(result.SuccessCount)
	}

	// Collect additional statistics if requested
	if options.CollectDetailedStats {
		b.collectDetailedStats(testCaseID, result, attachmentIDs, storage)
	}

	b.log.Info(fmt.Sprintf("Batch processing completed: %d successful, %d failed, total time: %v", 
		result.SuccessCount, result.FailureCount, result.TotalProcessingTime))

	return result, nil
}

// processAttachmentWithRetry processes an attachment with retry logic
func (b *BatchAttachmentProcessor) processAttachmentWithRetry(
	testCaseID string,
	attachmentID string,
	options *ProcessingOptions,
	storage storage.AttachmentStorage,
	retryCount int,
	retryDelayMs int,
) (string, []string, error) {
	var lastErr error
	var warnings []string

	for i := 0; i <= retryCount; i++ {
		// Get the attachment
		attachment, err := storage.GetAttachment(testCaseID, attachmentID)
		if err != nil {
			lastErr = fmt.Errorf("failed to get attachment: %v", err)
			continue
		}
		if attachment == nil {
			lastErr = fmt.Errorf("attachment not found")
			continue
		}

		// Process the attachment
		processedAttachment, err := b.attachmentProcessor.ProcessAttachment(attachment, options)
		if err != nil {
			lastErr = fmt.Errorf("failed to process attachment: %v", err)
			if i < retryCount {
				time.Sleep(time.Duration(retryDelayMs) * time.Millisecond)
			}
			continue
		}

		// Check for conversion warnings
		if options.TargetProvider != "" && options.SourceProvider != "" {
			// Try to parse as JSON to check for conversion warnings
			var jsonData map[string]interface{}
			jsonErr := json.Unmarshal([]byte(processedAttachment.Data), &jsonData)
			if jsonErr == nil {
				if warningsArr, hasWarnings := jsonData["conversionWarnings"].([]interface{}); hasWarnings {
					for _, warning := range warningsArr {
						if warningStr, ok := warning.(string); ok {
							warnings = append(warnings, warningStr)
						}
					}
				}
			}
		}

		// Save the processed attachment
		err = storage.SaveAttachment(testCaseID, processedAttachment)
		if err != nil {
			lastErr = fmt.Errorf("failed to save processed attachment: %v", err)
			if i < retryCount {
				time.Sleep(time.Duration(retryDelayMs) * time.Millisecond)
			}
			continue
		}

		// Success
		return processedAttachment.ID, warnings, nil
	}

	return "", nil, lastErr
}

// filterAttachmentsByContentType filters attachments by content type
func (b *BatchAttachmentProcessor) filterAttachmentsByContentType(
	testCaseID string,
	attachmentIDs []string,
	contentTypes []string,
	storage storage.AttachmentStorage,
) ([]string, error) {
	filtered := make([]string, 0)

	for _, id := range attachmentIDs {
		attachment, err := storage.GetAttachment(testCaseID, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get attachment %s: %v", id, err)
		}
		if attachment == nil {
			continue
		}

		for _, contentType := range contentTypes {
			if matchContentType(attachment.ContentType, contentType) {
				filtered = append(filtered, id)
				break
			}
		}
	}

	return filtered, nil
}

// filterAttachmentsByFileName filters attachments by file name patterns
func (b *BatchAttachmentProcessor) filterAttachmentsByFileName(
	testCaseID string,
	attachmentIDs []string,
	filePatterns []string,
	storage storage.AttachmentStorage,
) ([]string, error) {
	filtered := make([]string, 0)

	for _, id := range attachmentIDs {
		attachment, err := storage.GetAttachment(testCaseID, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get attachment %s: %v", id, err)
		}
		if attachment == nil {
			continue
		}

		for _, pattern := range filePatterns {
			if matchFilePattern(attachment.FileName, pattern) {
				filtered = append(filtered, id)
				break
			}
		}
	}

	return filtered, nil
}

// collectDetailedStats collects detailed statistics about the batch processing
func (b *BatchAttachmentProcessor) collectDetailedStats(
	testCaseID string,
	result *BatchProcessingResult,
	attachmentIDs []string,
	storage storage.AttachmentStorage,
) {
	for _, id := range attachmentIDs {
		attachment, err := storage.GetAttachment(testCaseID, id)
		if err != nil || attachment == nil {
			continue
		}

		// Track attachment sizes
		result.Stats.TotalBytesProcessed += attachment.Size
		if result.Stats.MinAttachmentSize == -1 || attachment.Size < result.Stats.MinAttachmentSize {
			result.Stats.MinAttachmentSize = attachment.Size
		}
		if attachment.Size > result.Stats.MaxAttachmentSize {
			result.Stats.MaxAttachmentSize = attachment.Size
		}

		// Track content types
		if strings.HasPrefix(attachment.ContentType, "image/") {
			result.Stats.ImageConversions++
		} else if strings.HasPrefix(attachment.ContentType, "text/") {
			result.Stats.TextConversions++
		} else {
			result.Stats.BinaryConversions++
		}

		// Try to determine provider-specific formats
		var jsonData map[string]interface{}
		jsonErr := json.Unmarshal([]byte(attachment.Data), &jsonData)
		if jsonErr == nil {
			// Check for Zephyr format
			if attachmentInfo, hasAttachmentInfo := jsonData["attachmentInfo"].(map[string]interface{}); hasAttachmentInfo {
				if origin, hasOrigin := attachmentInfo["origin"].(string); hasOrigin {
					providerKey := fmt.Sprintf("%s_attachments", origin)
					result.ProviderSpecific[providerKey]++
					
					if origin == "zephyr" {
						result.Stats.ZephyrConversions++
					} else if origin == "qtest" {
						result.Stats.QTestConversions++
					}
				}
			}

			// Check for qTest format
			if _, hasLinks := jsonData["links"]; hasLinks {
				if _, hasTestCycle := jsonData["test-cycle"]; hasTestCycle {
					result.ProviderSpecific["qtest_cycles"]++
					result.Stats.QTestConversions++
				}
				if _, hasTestCase := jsonData["test-case"]; hasTestCase {
					result.ProviderSpecific["qtest_cases"]++
					result.Stats.QTestConversions++
				}
			}

			// Check for Azure DevOps format
			if _, hasWorkItems := jsonData["workItems"]; hasWorkItems {
				result.ProviderSpecific["azure_workitems"]++
				result.Stats.AzureDevOpsConversions++
			}

			// Check for Rally format
			if _, hasResults := jsonData["QueryResult"]; hasResults {
				result.ProviderSpecific["rally_queries"]++
				result.Stats.RallyConversions++
			}

			// Check for conversion details
			if convertedFrom, hasConverted := jsonData["convertedFrom"].(string); hasConverted {
				convertedKey := fmt.Sprintf("converted_from_%s", convertedFrom)
				result.ProviderSpecific[convertedKey]++
			}
		}
	}

	// Calculate average if we have attachments
	if len(attachmentIDs) > 0 {
		result.Stats.AvgAttachmentSize = result.Stats.TotalBytesProcessed / int64(len(attachmentIDs))
	}
}

// matchContentType checks if a content type matches a pattern
func matchContentType(contentType, pattern string) bool {
	// Handle wildcard pattern like "image/*"
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		return strings.HasPrefix(contentType, prefix+"/")
	}
	return contentType == pattern
}

// matchFilePattern checks if a filename matches a pattern
func matchFilePattern(fileName, pattern string) bool {
	// Simple wildcard matching for now
	if strings.HasPrefix(pattern, "*") && strings.HasSuffix(pattern, "*") {
		// *contains* pattern
		substr := strings.TrimPrefix(strings.TrimSuffix(pattern, "*"), "*")
		return strings.Contains(fileName, substr)
	} else if strings.HasPrefix(pattern, "*") {
		// *suffix pattern
		suffix := strings.TrimPrefix(pattern, "*")
		return strings.HasSuffix(fileName, suffix)
	} else if strings.HasSuffix(pattern, "*") {
		// prefix* pattern
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(fileName, prefix)
	}
	// Exact match
	return fileName == pattern
}