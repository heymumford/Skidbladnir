package binary_processor_test

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// TestBatchAttachmentProcessor tests the batch processing of attachments
func TestBatchAttachmentProcessor(t *testing.T) {
	// Create test components
	log := logger.CreateLogger("TestBatchProcessor", logger.DEBUG)
	
	// Create attachment storage and processor
	attachmentStorage := storage.NewInMemoryAttachmentStorage()
	formatConverter := processors.NewFormatConverter(log.Child("FormatConverter"))
	attachmentProcessor := processors.NewAttachmentProcessor(
		processors.WithAttachmentChunkSize(1024 * 10), // 10KB chunks for testing
		processors.WithAttachmentMemoryLimit(1024 * 1024 * 10), // 10MB limit for testing
		processors.WithAttachmentLogger(log.Child("AttachmentProcessor")),
	)
	
	// Create batch processor
	batchProcessor := processors.NewBatchAttachmentProcessor(
		attachmentProcessor,
		formatConverter,
		log.Child("BatchProcessor"),
	)
	
	// Set up working config
	batchProcessor.SetWorkerCount(3)
	batchProcessor.SetMaxBatchSize(50)
	
	// Create test case
	testCaseID := uuid.New().String()
	
	// Populate test attachments
	attachmentIDs := populateTestAttachments(t, attachmentStorage, testCaseID, 10)
	
	// Test basic batch processing
	t.Run("BasicBatchProcessing", func(t *testing.T) {
		// Create processing options
		options := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "XML",
				ExportImages: true,
			},
			MaxConcurrentJobs: 3,
			AbortOnFailure: false,
			TimeoutSeconds: 30,
			RetryCount: 2,
			RetryDelayMs: 100,
			CollectDetailedStats: true,
		}
		
		// Process attachments
		result, err := batchProcessor.ProcessAttachments(testCaseID, attachmentIDs, options, attachmentStorage)
		require.NoError(t, err)
		require.NotNil(t, result)
		
		// Verify batch results
		assert.Equal(t, len(attachmentIDs), result.TotalAttachments)
		assert.Equal(t, len(attachmentIDs), result.SuccessCount)
		assert.Equal(t, 0, result.FailureCount)
		assert.NotEmpty(t, result.BatchID)
		assert.Len(t, result.ProcessedAttachments, len(attachmentIDs))
		assert.NotZero(t, result.TotalProcessingTime)
		
		// Check detailed stats
		assert.NotZero(t, result.Stats.TotalBytesProcessed)
		assert.Equal(t, len(attachmentIDs), result.Stats.TextConversions) // All are text in our test data
	})
	
	// Test concurrent processing performance
	t.Run("ConcurrentProcessingPerformance", func(t *testing.T) {
		// Create a larger batch of attachments
		largeAttachmentIDs := populateTestAttachments(t, attachmentStorage, testCaseID, 20)
		
		// Process with single worker
		singleWorkerOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			MaxConcurrentJobs: 1,
			TimeoutSeconds: 60,
			CollectDetailedStats: true,
		}
		
		startTime1 := time.Now()
		singleResult, err := batchProcessor.ProcessAttachments(testCaseID, largeAttachmentIDs, singleWorkerOptions, attachmentStorage)
		require.NoError(t, err)
		singleWorkerTime := time.Since(startTime1)
		
		// Process with multiple workers
		multiWorkerOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			MaxConcurrentJobs: 5,
			TimeoutSeconds: 60,
			CollectDetailedStats: true,
		}
		
		startTime2 := time.Now()
		multiResult, err := batchProcessor.ProcessAttachments(testCaseID, largeAttachmentIDs, multiWorkerOptions, attachmentStorage)
		require.NoError(t, err)
		multiWorkerTime := time.Since(startTime2)
		
		// Verify both completed successfully
		assert.Equal(t, len(largeAttachmentIDs), singleResult.SuccessCount)
		assert.Equal(t, len(largeAttachmentIDs), multiResult.SuccessCount)
		
		// Multiple workers should be faster than a single worker
		// Note: This is a heuristic test and might occasionally fail if system is heavily loaded
		// as the test workload is very light
		if multiWorkerTime > singleWorkerTime {
			t.Logf("WARNING: Multi-worker processing was slower (%v) than single worker (%v)", 
				multiWorkerTime, singleWorkerTime)
		}
		
		// Log the timing results
		t.Logf("Single worker time: %v", singleWorkerTime)
		t.Logf("Multi worker time: %v", multiWorkerTime)
	})
	
	// Test content type filtering
	t.Run("ContentTypeFiltering", func(t *testing.T) {
		// Create attachments with different content types
		testCaseID2 := uuid.New().String()
		
		// Add 3 text attachments
		textIDs := make([]string, 3)
		for i := 0; i < 3; i++ {
			attachment := createTestAttachment(
				fmt.Sprintf("text_%d.txt", i),
				"text/plain",
				fmt.Sprintf("Text content %d", i),
			)
			textIDs[i] = attachment.ID
			attachmentStorage.SaveAttachment(testCaseID2, attachment)
		}
		
		// Add 2 JSON attachments
		jsonIDs := make([]string, 2)
		for i := 0; i < 2; i++ {
			attachment := createTestAttachment(
				fmt.Sprintf("json_%d.json", i),
				"application/json",
				fmt.Sprintf(`{"index": %d, "name": "JSON %d"}`, i, i),
			)
			jsonIDs[i] = attachment.ID
			attachmentStorage.SaveAttachment(testCaseID2, attachment)
		}
		
		// Add 1 XML attachment
		xmlAttachment := createTestAttachment(
			"data.xml",
			"application/xml",
			"<root><item>XML Content</item></root>",
		)
		xmlID := xmlAttachment.ID
		attachmentStorage.SaveAttachment(testCaseID2, xmlAttachment)
		
		// All attachment IDs
		allIDs := append(append(textIDs, jsonIDs...), xmlID)
		
		// Filter by text content type
		textFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByContentType: []string{"text/plain"},
			CollectDetailedStats: true,
		}
		
		textResult, err := batchProcessor.ProcessAttachments(testCaseID2, allIDs, textFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 3, textResult.TotalAttachments) // Only text attachments
		assert.Equal(t, 3, textResult.SuccessCount)
		
		// Filter by JSON content type
		jsonFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByContentType: []string{"application/json"},
			CollectDetailedStats: true,
		}
		
		jsonResult, err := batchProcessor.ProcessAttachments(testCaseID2, allIDs, jsonFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 2, jsonResult.TotalAttachments) // Only JSON attachments
		assert.Equal(t, 2, jsonResult.SuccessCount)
		
		// Filter by multiple content types
		multiFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByContentType: []string{"application/json", "application/xml"},
			CollectDetailedStats: true,
		}
		
		multiResult, err := batchProcessor.ProcessAttachments(testCaseID2, allIDs, multiFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 3, multiResult.TotalAttachments) // JSON + XML attachments
		assert.Equal(t, 3, multiResult.SuccessCount)
	})
	
	// Test file name pattern filtering
	t.Run("FileNamePatternFiltering", func(t *testing.T) {
		// Create attachments with different file names
		testCaseID3 := uuid.New().String()
		
		// Various file names
		fileNames := []string{
			"report.pdf",
			"data.json",
			"test_case_1.txt",
			"test_case_2.txt",
			"image.png",
			"config.xml",
		}
		
		// Create and save attachments
		fileIDs := make([]string, len(fileNames))
		for i, name := range fileNames {
			attachment := createTestAttachment(
				name,
				getContentType(name),
				fmt.Sprintf("Content for %s", name),
			)
			fileIDs[i] = attachment.ID
			attachmentStorage.SaveAttachment(testCaseID3, attachment)
		}
		
		// Filter by exact match
		exactFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByFileName: []string{"data.json"},
			CollectDetailedStats: true,
		}
		
		exactResult, err := batchProcessor.ProcessAttachments(testCaseID3, fileIDs, exactFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 1, exactResult.TotalAttachments)
		assert.Equal(t, 1, exactResult.SuccessCount)
		
		// Filter by prefix pattern
		prefixFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByFileName: []string{"test_*"},
			CollectDetailedStats: true,
		}
		
		prefixResult, err := batchProcessor.ProcessAttachments(testCaseID3, fileIDs, prefixFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 2, prefixResult.TotalAttachments) // Should match both test_case files
		
		// Filter by suffix pattern
		suffixFilterOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByFileName: []string{"*.txt"},
			CollectDetailedStats: true,
		}
		
		suffixResult, err := batchProcessor.ProcessAttachments(testCaseID3, fileIDs, suffixFilterOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 2, suffixResult.TotalAttachments) // Should match both .txt files
		
		// Filter by multiple patterns
		multiPatternOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			FilterByFileName: []string{"*.json", "*.xml", "report.*"},
			CollectDetailedStats: true,
		}
		
		multiPatternResult, err := batchProcessor.ProcessAttachments(testCaseID3, fileIDs, multiPatternOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 3, multiPatternResult.TotalAttachments) // json, xml, pdf
	})
	
	// Test timeout handling
	t.Run("TimeoutHandling", func(t *testing.T) {
		// Create a large number of attachments to process
		testCaseID4 := uuid.New().String()
		largeAttachmentIDs := populateTestAttachments(t, attachmentStorage, testCaseID4, 15)
		
		// Create a batch processor with very short timeout
		timeoutOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
			},
			MaxConcurrentJobs: 1, // Force single worker to make timeout more likely
			TimeoutSeconds: 1, // Very short timeout
			RetryCount: 0,
			CollectDetailedStats: true,
		}
		
		result, err := batchProcessor.ProcessAttachments(testCaseID4, largeAttachmentIDs, timeoutOptions, attachmentStorage)
		
		// The operation should complete but potentially with some failures
		require.NoError(t, err) // The batch process itself should not error
		
		if result.FailureCount > 0 {
			assert.Contains(t, result.FailedAttachments, "timeout")
		}
		
		t.Logf("Timeout test results: %d processed, %d failed", result.SuccessCount, result.FailureCount)
	})
	
	// Test format conversion in batch
	t.Run("BatchFormatConversion", func(t *testing.T) {
		// Create test case for Zephyr attachments
		testCaseID5 := uuid.New().String()
		
		// Create attachments with Zephyr format
		zephyrIDs := make([]string, 5)
		for i := 0; i < 5; i++ {
			// Create a Zephyr format attachment
			zephyrData := map[string]interface{}{
				"attachmentInfo": map[string]interface{}{
					"origin": "zephyr",
					"metadata": map[string]interface{}{
						"projectKey": "ZEPH",
						"issueKey": fmt.Sprintf("ZEPH-%d", i),
						"testCaseKey": fmt.Sprintf("ZEPH-TEST-%d", i),
					},
				},
				"content": fmt.Sprintf("Zephyr content %d", i),
			}
			
			// Convert to JSON
			zephyrJSON, _ := json.Marshal(zephyrData)
			
			attachment := createTestAttachment(
				fmt.Sprintf("zephyr_%d.json", i),
				"application/json",
				string(zephyrJSON),
			)
			zephyrIDs[i] = attachment.ID
			attachmentStorage.SaveAttachment(testCaseID5, attachment)
		}
		
		// Batch convert to qTest format
		conversionOptions := &processors.BatchProcessingOptions{
			ProcessingOptions: processors.ProcessingOptions{
				Format: "JSON",
				SourceProvider: "zephyr",
				TargetProvider: "qtest",
				ExportImages: true,
			},
			MaxConcurrentJobs: 3,
			CollectDetailedStats: true,
		}
		
		result, err := batchProcessor.ProcessAttachments(testCaseID5, zephyrIDs, conversionOptions, attachmentStorage)
		require.NoError(t, err)
		assert.Equal(t, 5, result.SuccessCount)
		
		// Check stats about Zephyr conversions
		assert.Greater(t, result.Stats.ZephyrConversions, 0)
		assert.Contains(t, result.ProviderSpecific, "zephyr_attachments")
		
		// Verify the converted attachments
		for _, id := range result.ProcessedAttachments {
			attachment, err := attachmentStorage.GetAttachment(testCaseID5, id)
			require.NoError(t, err)
			require.NotNil(t, attachment)
			
			// Parse and check for qTest format indicators
			var qTestData map[string]interface{}
			err = json.Unmarshal([]byte(attachment.Data), &qTestData)
			require.NoError(t, err)
			
			assert.Contains(t, qTestData, "convertedFrom")
			assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
			assert.Contains(t, qTestData, "test-case")
		}
	})
}

// Helper functions

// populateTestAttachments creates test attachments and returns their IDs
func populateTestAttachments(t *testing.T, storage storage.AttachmentStorage, testCaseID string, count int) []string {
	ids := make([]string, count)
	
	for i := 0; i < count; i++ {
		attachment := createTestAttachment(
			fmt.Sprintf("test_%d.txt", i),
			"text/plain",
			fmt.Sprintf("This is test attachment %d content", i),
		)
		
		err := storage.SaveAttachment(testCaseID, attachment)
		require.NoError(t, err)
		
		ids[i] = attachment.ID
	}
	
	return ids
}

// createTestAttachment creates a test attachment
func createTestAttachment(fileName, contentType, content string) *storage.Attachment {
	return &storage.Attachment{
		ID:          uuid.New().String(),
		FileName:    fileName,
		ContentType: contentType,
		Size:        int64(len(content)),
		Data:        content,
		CreatedAt:   time.Now(),
	}
}

// getContentType returns a content type based on file extension
func getContentType(fileName string) string {
	// Simple extension-based content type mapping
	ext := ""
	for i := len(fileName) - 1; i >= 0; i-- {
		if fileName[i] == '.' {
			ext = fileName[i+1:]
			break
		}
	}
	
	switch ext {
	case "txt":
		return "text/plain"
	case "json":
		return "application/json"
	case "xml":
		return "application/xml"
	case "html":
		return "text/html"
	case "pdf":
		return "application/pdf"
	case "png":
		return "image/png"
	case "jpg", "jpeg":
		return "image/jpeg"
	case "gif":
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}