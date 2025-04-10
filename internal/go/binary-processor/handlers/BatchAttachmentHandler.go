package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// BatchAttachmentHandler handles batch operations on attachments
type BatchAttachmentHandler struct {
	testCaseStorage       TestCaseStorage
	attachmentStorage     storage.AttachmentStorage
	batchProcessor        *processors.BatchAttachmentProcessor
	formatConverter       *processors.FormatConverter
	attachmentProcessor   *processors.AttachmentProcessor
	log                   *logger.Logger
	maxBatchSize          int
	defaultWorkerCount    int
	defaultTimeoutSeconds int
}

// NewBatchAttachmentHandler creates a new batch attachment handler
func NewBatchAttachmentHandler(
	testCaseStorage TestCaseStorage,
	attachmentStorage storage.AttachmentStorage,
	attachmentProcessor *processors.AttachmentProcessor,
	formatConverter *processors.FormatConverter,
) *BatchAttachmentHandler {
	log := logger.CreateLogger("BatchAttachmentHandler", logger.INFO)
	
	batchProcessor := processors.NewBatchAttachmentProcessor(
		attachmentProcessor,
		formatConverter,
		log.Child("BatchProcessor"),
	)
	
	return &BatchAttachmentHandler{
		testCaseStorage:       testCaseStorage,
		attachmentStorage:     attachmentStorage,
		batchProcessor:        batchProcessor,
		formatConverter:       formatConverter,
		attachmentProcessor:   attachmentProcessor,
		log:                   log,
		maxBatchSize:          100,
		defaultWorkerCount:    5,
		defaultTimeoutSeconds: 300,
	}
}

// RegisterRoutes registers batch attachment operation routes
func (h *BatchAttachmentHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/testcases/{id}/attachments/batch", h.BatchProcessAttachments).Methods("POST")
	router.HandleFunc("/testcases/{id}/attachments/batch/convert", h.BatchConvertAttachments).Methods("POST")
	router.HandleFunc("/testcases/{id}/attachments/batch/status/{batchId}", h.GetBatchStatus).Methods("GET")
}

// BatchRequest represents a request to batch process attachments
type BatchRequest struct {
	AttachmentIDs         []string                           `json:"attachmentIds"`
	ProcessingOptions     processors.ProcessingOptions       `json:"processingOptions"`
	BatchOptions          processors.BatchProcessingOptions  `json:"batchOptions"`
}

// BatchResponse represents a response from batch processing
type BatchResponse struct {
	BatchID               string                            `json:"batchId"`
	Status                string                            `json:"status"`
	Processed             int                               `json:"processed"`
	Failed                int                               `json:"failed"`
	Total                 int                               `json:"total"`
	ProcessedAttachments  []string                          `json:"processedAttachments,omitempty"`
	FailedAttachments     map[string]string                 `json:"failedAttachments,omitempty"`
	ElapsedTime           string                            `json:"elapsedTime"`
	Warnings              int                               `json:"warnings"`
	ConversionStatistics  map[string]int                    `json:"conversionStatistics,omitempty"`
	DetailedStats         *processors.BatchProcessingStats  `json:"detailedStats,omitempty"`
}

// BatchProcessAttachments processes multiple attachments in a batch
func (h *BatchAttachmentHandler) BatchProcessAttachments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testCaseID := vars["id"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(testCaseID)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Parse request
	var request BatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, errors.Wrap(err, "Invalid request body").Error(), http.StatusBadRequest)
		return
	}

	// Validate request
	if len(request.AttachmentIDs) == 0 {
		http.Error(w, "No attachment IDs provided", http.StatusBadRequest)
		return
	}
	
	// Apply defaults
	h.applyBatchDefaults(&request)

	// Process attachments in batch
	result, err := h.batchProcessor.ProcessAttachments(
		testCaseID,
		request.AttachmentIDs,
		&request.BatchOptions,
		h.attachmentStorage,
	)
	
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to process attachments").Error(), http.StatusInternalServerError)
		return
	}

	// Prepare response
	response := &BatchResponse{
		BatchID:              result.BatchID,
		Status:               h.getBatchStatus(result),
		Processed:            result.SuccessCount,
		Failed:               result.FailureCount,
		Total:                result.TotalAttachments,
		ProcessedAttachments: result.ProcessedAttachments,
		FailedAttachments:    result.FailedAttachments,
		ElapsedTime:          result.TotalProcessingTime.String(),
		Warnings:             h.countTotalWarnings(result.ConversionWarnings),
		ConversionStatistics: result.ProviderSpecific,
	}
	
	// Include detailed stats if requested
	if request.BatchOptions.CollectDetailedStats {
		response.DetailedStats = &result.Stats
	}

	h.log.Info(fmt.Sprintf("Batch processing completed for test case %s: %d processed, %d failed", 
		testCaseID, response.Processed, response.Failed))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// BatchConvertAttachments converts multiple attachments between provider formats
func (h *BatchAttachmentHandler) BatchConvertAttachments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testCaseID := vars["id"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(testCaseID)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Parse request
	var request BatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, errors.Wrap(err, "Invalid request body").Error(), http.StatusBadRequest)
		return
	}

	// Validate request
	if len(request.AttachmentIDs) == 0 {
		http.Error(w, "No attachment IDs provided", http.StatusBadRequest)
		return
	}
	
	// Make sure source and target providers are specified
	if request.ProcessingOptions.SourceProvider == "" || request.ProcessingOptions.TargetProvider == "" {
		http.Error(w, "Source and target providers must be specified for batch conversion", http.StatusBadRequest)
		return
	}
	
	// Apply defaults
	h.applyBatchDefaults(&request)

	// Process attachments in batch
	result, err := h.batchProcessor.ProcessAttachments(
		testCaseID,
		request.AttachmentIDs,
		&request.BatchOptions,
		h.attachmentStorage,
	)
	
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to convert attachments").Error(), http.StatusInternalServerError)
		return
	}

	// Prepare response
	response := &BatchResponse{
		BatchID:              result.BatchID,
		Status:               h.getBatchStatus(result),
		Processed:            result.SuccessCount,
		Failed:               result.FailureCount,
		Total:                result.TotalAttachments,
		ProcessedAttachments: result.ProcessedAttachments,
		FailedAttachments:    result.FailedAttachments,
		ElapsedTime:          result.TotalProcessingTime.String(),
		Warnings:             h.countTotalWarnings(result.ConversionWarnings),
		ConversionStatistics: result.ProviderSpecific,
		DetailedStats:        &result.Stats,
	}

	h.log.Info(fmt.Sprintf("Batch conversion completed for test case %s: %d processed, %d failed, source=%s, target=%s", 
		testCaseID, response.Processed, response.Failed, 
		request.ProcessingOptions.SourceProvider, request.ProcessingOptions.TargetProvider))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetBatchStatus retrieves the status of a batch processing operation
func (h *BatchAttachmentHandler) GetBatchStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testCaseID := vars["id"]
	batchID := vars["batchId"]

	// This is a placeholder for a real implementation that would retrieve batch status from storage
	// For now, we'll just return a mock response
	response := &BatchResponse{
		BatchID:  batchID,
		Status:   "completed",
		Processed: 0,
		Failed:   0,
		Total:    0,
		ElapsedTime: "0s",
		Warnings: 0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// applyBatchDefaults applies default values to batch request
func (h *BatchAttachmentHandler) applyBatchDefaults(request *BatchRequest) {
	// Apply defaults to batch options
	if request.BatchOptions.MaxConcurrentJobs <= 0 {
		request.BatchOptions.MaxConcurrentJobs = h.defaultWorkerCount
	}
	
	if request.BatchOptions.TimeoutSeconds <= 0 {
		request.BatchOptions.TimeoutSeconds = h.defaultTimeoutSeconds
	}
	
	if request.BatchOptions.RetryCount <= 0 {
		request.BatchOptions.RetryCount = 3
	}
	
	if request.BatchOptions.RetryDelayMs <= 0 {
		request.BatchOptions.RetryDelayMs = 1000
	}
	
	// Make sure processing options are assigned if not already
	if request.BatchOptions.ProcessingOptions.Format == "" && request.ProcessingOptions.Format != "" {
		request.BatchOptions.ProcessingOptions = request.ProcessingOptions
	}
}

// getBatchStatus returns the overall status of a batch operation
func (h *BatchAttachmentHandler) getBatchStatus(result *processors.BatchProcessingResult) string {
	if result.FailureCount == 0 && result.SuccessCount == result.TotalAttachments {
		return "completed"
	} else if result.FailureCount > 0 && result.SuccessCount == 0 {
		return "failed"
	} else if result.FailureCount > 0 {
		return "partial"
	}
	return "unknown"
}

// countTotalWarnings counts the total number of warnings across all attachments
func (h *BatchAttachmentHandler) countTotalWarnings(warningsMap map[string][]string) int {
	count := 0
	for _, warnings := range warningsMap {
		count += len(warnings)
	}
	return count
}