package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/gorilla/mux"
	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Service   string    `json:"service"`
	Memory    uint64    `json:"memory"`
	Version   string    `json:"version"`
}

// ServiceConfig represents the service configuration
type ServiceConfig struct {
	MaxMemoryUsage      uint64 `json:"maxMemoryUsage"`
	ChunkSize           int    `json:"chunkSize"`
	MaxAttachmentSize   int64  `json:"maxAttachmentSize"`
	LogLevel            string `json:"logLevel"`
	EnableAttachments   bool   `json:"enableAttachments"`
	EnableImageExport   bool   `json:"enableImageExport"`
	EnableCrossProvider bool   `json:"enableCrossProvider"`
}

// Service version
const (
	ServiceVersion = "0.3.1"
)

var (
	// Default configuration
	config = ServiceConfig{
		MaxMemoryUsage:      0, // No limit by default
		ChunkSize:           processors.DefaultChunkSize,
		MaxAttachmentSize:   50 * 1024 * 1024, // 50MB default
		LogLevel:            "INFO",
		EnableAttachments:   true,
		EnableImageExport:   true,
		EnableCrossProvider: true,
	}
	
	// Service logger
	log = logger.CreateLogger("BinaryProcessor", logger.INFO)
	
	// Service features (updated dynamically)
	homeFeatures = []string{
		"Large test case handling",
		"Chunked processing",
		"Memory monitoring",
	}
)

func main() {
	// Create router
	router := mux.NewRouter()
	
	// Set up routes
	router.HandleFunc("/health", healthCheckHandler)
	router.HandleFunc("/", homeHandler)
	
	// Set up API routes
	apiRouter := router.PathPrefix("/api").Subrouter()
	
	// Create storage instances
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	var attachmentStorage storage.AttachmentStorage
	
	if config.EnableAttachments {
		attachmentStorage = storage.NewInMemoryAttachmentStorage()
	}
	
	// Create processors with configuration
	processor := processors.NewTestCaseProcessor(
		processors.WithChunkSize(config.ChunkSize),
		processors.WithMemoryLimit(config.MaxMemoryUsage),
		processors.WithLogger(log.Child("TestCaseProcessor")),
	)
	
	// Create test case handler
	testCaseHandler := handlers.NewTestCaseHandler(testCaseStorage)
	testCaseHandler.RegisterRoutes(apiRouter)
	
	// Configure advanced routes
	advancedHandler := NewAdvancedTestCaseHandler(testCaseStorage, processor)
	advancedHandler.RegisterRoutes(apiRouter)
	
	// Configure attachment handler if enabled
	if config.EnableAttachments && attachmentStorage != nil {
		log.Info("Initializing attachment handling functionality")
		
		// Create format converter
		formatConverter := processors.NewFormatConverter(log.Child("FormatConverter"))
		
		// Create attachment processor
		attachmentProcessor := processors.NewAttachmentProcessor(
			processors.WithAttachmentChunkSize(config.ChunkSize),
			processors.WithAttachmentMemoryLimit(config.MaxMemoryUsage),
			processors.WithAttachmentLogger(log.Child("AttachmentProcessor")),
		)
		
		// Create test case attachment processor with enhanced capabilities
		testCaseAttachmentProcessor := processors.NewTestCaseAttachmentProcessor(
			processors.WithAttachmentChunkSize(config.ChunkSize),
			processors.WithAttachmentMaxSize(config.MaxAttachmentSize),
			processors.WithAttachmentLogger(log.Child("TestCaseAttachmentProcessor")),
			processors.WithFormatConverter(formatConverter),
		)
		
		// Create and register attachment handler
		attachmentHandler := handlers.NewAttachmentHandler(
			testCaseStorage, 
			attachmentStorage, 
			attachmentProcessor,
		)
		attachmentHandler.RegisterRoutes(apiRouter)
		
		// Create and register batch attachment handler
		batchAttachmentHandler := handlers.NewBatchAttachmentHandler(
			testCaseStorage,
			attachmentStorage,
			attachmentProcessor,
			formatConverter,
		)
		batchAttachmentHandler.RegisterRoutes(apiRouter)
		
		// Register enhanced routes for Zephyr/qTest attachments
		advancedAttachmentHandler := NewAdvancedAttachmentHandler(
			testCaseStorage,
			attachmentStorage,
			testCaseAttachmentProcessor,
			formatConverter,
		)
		advancedAttachmentHandler.RegisterRoutes(apiRouter)
		
		// Update features list
		homeFeatures = append(homeFeatures, 
			"Attachment processing",
			"Cross-provider format conversion",
			"Batch attachment processing",
			"Zephyr/qTest attachment conversion",
		)
	}
	
	// Start memory monitoring
	go monitorMemory()
	
	// Start server
	port := 8090
	log.Info(fmt.Sprintf("Binary Processor service v%s starting on port %d", ServiceVersion, port))
	log.Info(fmt.Sprintf("Configuration: chunk size=%d bytes, memory limit=%d bytes, max attachment size=%d bytes", 
		config.ChunkSize, 
		config.MaxMemoryUsage,
		config.MaxAttachmentSize,
	))
	
	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), router); err != nil {
		log.Error(fmt.Sprintf("Failed to start server: %v", err))
	}
}

// healthCheckHandler returns the current service health
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Service:   "binary-processor",
		Memory:    m.Alloc,
		Version:   ServiceVersion,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// homeHandler returns basic service information
func homeHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]interface{}{
		"service":  "Skidbladnir Binary Processor",
		"version":  ServiceVersion,
		"status":   "operational",
		"features": homeFeatures,
		"config":   config,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// monitorMemory periodically monitors memory usage
func monitorMemory() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		
		log.Debug(fmt.Sprintf("Memory stats: Alloc=%v MiB, Sys=%v MiB, NumGC=%v", 
			m.Alloc/1024/1024, 
			m.Sys/1024/1024, 
			m.NumGC,
		))
		
		// If memory usage is high, force GC
		if config.MaxMemoryUsage > 0 && m.Alloc > config.MaxMemoryUsage*80/100 {
			log.Warn(fmt.Sprintf("Memory usage is high: %v bytes (%v%% of limit)", 
				m.Alloc, 
				m.Alloc*100/config.MaxMemoryUsage,
			))
			runtime.GC()
		}
	}
}

// AdvancedTestCaseHandler includes the processor for advanced test case handling
type AdvancedTestCaseHandler struct {
	storage   handlers.TestCaseStorage
	processor *processors.TestCaseProcessor
}

// NewAdvancedTestCaseHandler creates a new advanced handler
func NewAdvancedTestCaseHandler(
	storage handlers.TestCaseStorage,
	processor *processors.TestCaseProcessor,
) *AdvancedTestCaseHandler {
	return &AdvancedTestCaseHandler{
		storage:   storage,
		processor: processor,
	}
}

// RegisterRoutes registers advanced routes
func (h *AdvancedTestCaseHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/testcases/{id}/process-chunked", h.ProcessTestCaseChunked).Methods("POST")
	router.HandleFunc("/testcases/{id}/process-async", h.ProcessTestCaseAsync).Methods("POST")
	router.HandleFunc("/system/memory", h.GetMemoryStats).Methods("GET")
}

// ProcessTestCaseChunked processes a test case with explicit chunking
func (h *AdvancedTestCaseHandler) ProcessTestCaseChunked(w http.ResponseWriter, r *http.Request) {
	// This would use the processor directly to handle large test cases
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "processing",
		"message": "This is a placeholder for the chunked processing endpoint",
	})
}

// ProcessTestCaseAsync processes a test case asynchronously
func (h *AdvancedTestCaseHandler) ProcessTestCaseAsync(w http.ResponseWriter, r *http.Request) {
	// This would start an async job and return immediately
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "submitted",
		"message": "Processing started asynchronously",
	})
}

// GetMemoryStats returns current memory statistics
func (h *AdvancedTestCaseHandler) GetMemoryStats(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	stats := map[string]interface{}{
		"alloc":      m.Alloc,
		"totalAlloc": m.TotalAlloc,
		"sys":        m.Sys,
		"numGC":      m.NumGC,
		"heapAlloc":  m.HeapAlloc,
		"heapSys":    m.HeapSys,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// AdvancedAttachmentHandler includes handlers for advanced attachment operations
type AdvancedAttachmentHandler struct {
	testCaseStorage    handlers.TestCaseStorage
	attachmentStorage  storage.AttachmentStorage
	attachmentProcessor *processors.TestCaseAttachmentProcessor
	formatConverter    *processors.FormatConverter
}

// NewAdvancedAttachmentHandler creates a new advanced attachment handler
func NewAdvancedAttachmentHandler(
	testCaseStorage handlers.TestCaseStorage,
	attachmentStorage storage.AttachmentStorage,
	attachmentProcessor *processors.TestCaseAttachmentProcessor,
	formatConverter *processors.FormatConverter,
) *AdvancedAttachmentHandler {
	return &AdvancedAttachmentHandler{
		testCaseStorage:    testCaseStorage,
		attachmentStorage:  attachmentStorage,
		attachmentProcessor: attachmentProcessor,
		formatConverter:    formatConverter,
	}
}

// RegisterRoutes registers advanced attachment routes
func (h *AdvancedAttachmentHandler) RegisterRoutes(router *mux.Router) {
	// Provider-specific routes
	router.HandleFunc("/testcases/{id}/attachments/provider", h.GetProviderInfo).Methods("GET")
	router.HandleFunc("/testcases/{id}/attachments/convert/zephyr-to-qtest", h.ConvertZephyrToQTest).Methods("POST")
	router.HandleFunc("/testcases/{id}/attachments/convert/qtest-to-zephyr", h.ConvertQTestToZephyr).Methods("POST")
	
	// Format conversion routes
	router.HandleFunc("/testcases/{id}/attachments/formats", h.GetSupportedFormats).Methods("GET")
	router.HandleFunc("/testcases/{id}/attachments/{attachmentId}/preview", h.PreviewAttachment).Methods("GET")
	
	// Attachment utilities
	router.HandleFunc("/testcases/{id}/attachments/stats", h.GetAttachmentStats).Methods("GET")
	router.HandleFunc("/testcases/{id}/attachments/metadata", h.ExtractAttachmentMetadata).Methods("POST")
}

// GetProviderInfo returns information about supported providers
func (h *AdvancedAttachmentHandler) GetProviderInfo(w http.ResponseWriter, r *http.Request) {
	providers := map[string]interface{}{
		"supported": []string{"zephyr", "qtest", "azure_devops", "rally"},
		"conversions": map[string][]string{
			"zephyr": {"qtest"},
			"qtest": {"zephyr"},
			"azure_devops": {"qtest"},
			"rally": {"qtest"},
		},
		"formats": map[string][]string{
			"zephyr": {"attachment", "execution", "testcase"},
			"qtest": {"case", "cycle", "run"},
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(providers)
}

// ConvertZephyrToQTest converts Zephyr attachments to qTest format
func (h *AdvancedAttachmentHandler) ConvertZephyrToQTest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}
	
	// Parse attachment IDs and options
	var requestData struct {
		AttachmentIDs []string `json:"attachmentIds"`
		Options       struct {
			IncludeMetadata    bool `json:"includeMetadata"`
			PreserveFormatting bool `json:"preserveFormatting"`
		} `json:"options"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	
	if len(requestData.AttachmentIDs) == 0 {
		http.Error(w, "No attachment IDs provided", http.StatusBadRequest)
		return
	}
	
	// Convert each attachment
	results := make(map[string]interface{})
	for _, attachmentID := range requestData.AttachmentIDs {
		// Get the attachment
		attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
		if err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to retrieve attachment: %v", err),
			}
			continue
		}
		if attachment == nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": "Attachment not found",
			}
			continue
		}
		
		// Process with Zephyr to qTest conversion
		options := &processors.ProcessingOptions{
			Format:          "JSON",
			SourceProvider:  "zephyr",
			TargetProvider:  "qtest",
			ExportImages:    true,
			IncludeMetadata: requestData.Options.IncludeMetadata,
			PreserveFormatting: requestData.Options.PreserveFormatting,
		}
		
		processedAttachment, err := h.attachmentProcessor.ProcessAttachment(attachment, options)
		if err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to process attachment: %v", err),
			}
			continue
		}
		
		// Save the processed attachment
		if err := h.attachmentStorage.SaveAttachment(id, processedAttachment); err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to save processed attachment: %v", err),
			}
			continue
		}
		
		// Success
		results[attachmentID] = map[string]interface{}{
			"status": "success",
			"processedId": processedAttachment.ID,
			"fileName": processedAttachment.FileName,
			"contentType": processedAttachment.ContentType,
			"size": processedAttachment.Size,
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"conversions": results,
		"totalCount": len(requestData.AttachmentIDs),
		"successCount": countSuccesses(results),
		"errorCount": len(requestData.AttachmentIDs) - countSuccesses(results),
	})
}

// ConvertQTestToZephyr converts qTest attachments to Zephyr format
func (h *AdvancedAttachmentHandler) ConvertQTestToZephyr(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}
	
	// Parse attachment IDs and options
	var requestData struct {
		AttachmentIDs []string `json:"attachmentIds"`
		Options       struct {
			IncludeMetadata    bool `json:"includeMetadata"`
			PreserveFormatting bool `json:"preserveFormatting"`
		} `json:"options"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	
	if len(requestData.AttachmentIDs) == 0 {
		http.Error(w, "No attachment IDs provided", http.StatusBadRequest)
		return
	}
	
	// Convert each attachment
	results := make(map[string]interface{})
	for _, attachmentID := range requestData.AttachmentIDs {
		// Get the attachment
		attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
		if err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to retrieve attachment: %v", err),
			}
			continue
		}
		if attachment == nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": "Attachment not found",
			}
			continue
		}
		
		// Process with qTest to Zephyr conversion
		options := &processors.ProcessingOptions{
			Format:          "JSON",
			SourceProvider:  "qtest",
			TargetProvider:  "zephyr",
			ExportImages:    true,
			IncludeMetadata: requestData.Options.IncludeMetadata,
			PreserveFormatting: requestData.Options.PreserveFormatting,
		}
		
		processedAttachment, err := h.attachmentProcessor.ProcessAttachment(attachment, options)
		if err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to process attachment: %v", err),
			}
			continue
		}
		
		// Save the processed attachment
		if err := h.attachmentStorage.SaveAttachment(id, processedAttachment); err != nil {
			results[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to save processed attachment: %v", err),
			}
			continue
		}
		
		// Success
		results[attachmentID] = map[string]interface{}{
			"status": "success",
			"processedId": processedAttachment.ID,
			"fileName": processedAttachment.FileName,
			"contentType": processedAttachment.ContentType,
			"size": processedAttachment.Size,
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"conversions": results,
		"totalCount": len(requestData.AttachmentIDs),
		"successCount": countSuccesses(results),
		"errorCount": len(requestData.AttachmentIDs) - countSuccesses(results),
	})
}

// GetSupportedFormats returns supported attachment formats
func (h *AdvancedAttachmentHandler) GetSupportedFormats(w http.ResponseWriter, r *http.Request) {
	formats := map[string]interface{}{
		"inputFormats": []string{
			"text/plain", "text/html", "text/markdown", "text/csv",
			"application/json", "application/xml", "application/pdf",
			"image/jpeg", "image/png", "image/gif",
			"application/zip", "application/gzip",
		},
		"outputFormats": []string{
			"JSON", "XML", "HTML", "MARKDOWN",
		},
		"imageProcessing": config.EnableImageExport,
		"crossProvider": config.EnableCrossProvider,
		"maxAttachmentSize": config.MaxAttachmentSize,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(formats)
}

// PreviewAttachment returns a preview of an attachment
func (h *AdvancedAttachmentHandler) PreviewAttachment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	attachmentID := vars["attachmentId"]
	
	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}
	
	// Get the attachment
	attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve attachment: %v", err), http.StatusInternalServerError)
		return
	}
	if attachment == nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}
	
	// Determine preview type from query parameters
	previewType := r.URL.Query().Get("type")
	if previewType == "" {
		previewType = "auto"
	}
	
	// Generate preview based on type
	var preview map[string]interface{}
	switch previewType {
	case "html":
		// Generate HTML preview
		preview = generateHTMLPreview(attachment)
	case "text":
		// Generate text preview
		preview = generateTextPreview(attachment)
	case "metadata":
		// Generate metadata preview
		preview = generateMetadataPreview(attachment)
	case "auto":
		// Auto-detect best preview format
		preview = generateAutoPreview(attachment)
	default:
		http.Error(w, fmt.Sprintf("Unsupported preview type: %s", previewType), http.StatusBadRequest)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preview)
}

// GetAttachmentStats returns statistics about attachments
func (h *AdvancedAttachmentHandler) GetAttachmentStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}
	
	// Get all attachments
	attachments, err := h.attachmentStorage.GetAttachments(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve attachments: %v", err), http.StatusInternalServerError)
		return
	}
	
	// Analyze attachments
	stats := analyzeAttachments(attachments)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ExtractAttachmentMetadata extracts metadata from attachments
func (h *AdvancedAttachmentHandler) ExtractAttachmentMetadata(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}
	
	// Parse attachment IDs
	var requestData struct {
		AttachmentIDs []string `json:"attachmentIds"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	
	if len(requestData.AttachmentIDs) == 0 {
		http.Error(w, "No attachment IDs provided", http.StatusBadRequest)
		return
	}
	
	// Extract metadata from each attachment
	metadata := make(map[string]interface{})
	for _, attachmentID := range requestData.AttachmentIDs {
		// Get the attachment
		attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
		if err != nil {
			metadata[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": fmt.Sprintf("Failed to retrieve attachment: %v", err),
			}
			continue
		}
		if attachment == nil {
			metadata[attachmentID] = map[string]interface{}{
				"status": "error",
				"error": "Attachment not found",
			}
			continue
		}
		
		// Extract metadata
		extracted := extractMetadata(attachment)
		metadata[attachmentID] = extracted
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"metadata": metadata,
	})
}

// Helper functions

// countSuccesses counts successful conversions
func countSuccesses(results map[string]interface{}) int {
	count := 0
	for _, result := range results {
		if resultMap, ok := result.(map[string]interface{}); ok {
			if status, ok := resultMap["status"].(string); ok && status == "success" {
				count++
			}
		}
	}
	return count
}

// generateHTMLPreview generates an HTML preview for an attachment
func generateHTMLPreview(attachment *storage.Attachment) map[string]interface{} {
	// In a real implementation, this would generate a proper HTML preview
	// based on the attachment content type
	
	return map[string]interface{}{
		"id": attachment.ID,
		"fileName": attachment.FileName,
		"contentType": attachment.ContentType,
		"size": attachment.Size,
		"previewType": "html",
		"preview": "<div>Attachment preview placeholder</div>",
	}
}

// generateTextPreview generates a text preview for an attachment
func generateTextPreview(attachment *storage.Attachment) map[string]interface{} {
	// In a real implementation, this would extract text content
	
	return map[string]interface{}{
		"id": attachment.ID,
		"fileName": attachment.FileName,
		"contentType": attachment.ContentType,
		"size": attachment.Size,
		"previewType": "text",
		"preview": "Attachment text preview placeholder",
	}
}

// generateMetadataPreview generates a metadata preview for an attachment
func generateMetadataPreview(attachment *storage.Attachment) map[string]interface{} {
	return map[string]interface{}{
		"id": attachment.ID,
		"fileName": attachment.FileName,
		"contentType": attachment.ContentType,
		"size": attachment.Size,
		"createdAt": attachment.CreatedAt,
		"previewType": "metadata",
	}
}

// generateAutoPreview auto-detects the best preview format
func generateAutoPreview(attachment *storage.Attachment) map[string]interface{} {
	// Choose preview type based on content type
	if strings.HasPrefix(attachment.ContentType, "text/") || 
	   attachment.ContentType == "application/json" || 
	   attachment.ContentType == "application/xml" {
		return generateTextPreview(attachment)
	} else if strings.HasPrefix(attachment.ContentType, "image/") {
		return generateHTMLPreview(attachment)
	} else {
		return generateMetadataPreview(attachment)
	}
}

// analyzeAttachments analyzes attachments and returns statistics
func analyzeAttachments(attachments []storage.Attachment) map[string]interface{} {
	if len(attachments) == 0 {
		return map[string]interface{}{
			"totalCount": 0,
			"totalSize": 0,
			"contentTypes": map[string]int{},
		}
	}
	
	contentTypes := make(map[string]int)
	var totalSize int64
	var maxSize int64
	var minSize int64 = attachments[0].Size
	
	for _, attachment := range attachments {
		contentTypes[attachment.ContentType]++
		totalSize += attachment.Size
		
		if attachment.Size > maxSize {
			maxSize = attachment.Size
		}
		if attachment.Size < minSize {
			minSize = attachment.Size
		}
	}
	
	return map[string]interface{}{
		"totalCount": len(attachments),
		"totalSize": totalSize,
		"averageSize": totalSize / int64(len(attachments)),
		"maxSize": maxSize,
		"minSize": minSize,
		"contentTypes": contentTypes,
	}
}

// extractMetadata extracts metadata from an attachment
func extractMetadata(attachment *storage.Attachment) map[string]interface{} {
	result := map[string]interface{}{
		"fileName": attachment.FileName,
		"contentType": attachment.ContentType,
		"size": attachment.Size,
		"createdAt": attachment.CreatedAt,
	}
	
	// For JSON data, extract metadata from the content
	if attachment.ContentType == "application/json" {
		data, err := base64.StdEncoding.DecodeString(attachment.Data)
		if err == nil {
			var jsonData map[string]interface{}
			if json.Unmarshal(data, &jsonData) == nil {
				// Try to extract provider-specific metadata
				if info, hasInfo := jsonData["attachmentInfo"].(map[string]interface{}); hasInfo {
					result["provider"] = "zephyr"
					if metadata, hasMeta := info["metadata"].(map[string]interface{}); hasMeta {
						result["metadata"] = metadata
					}
				} else if _, hasLinks := jsonData["links"]; hasLinks {
					result["provider"] = "qtest"
					if testCase, hasTestCase := jsonData["test-case"].(map[string]interface{}); hasTestCase {
						result["testCase"] = testCase
					}
				}
			}
		}
	}
	
	return result
}