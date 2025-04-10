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
}

// ServiceConfig represents the service configuration
type ServiceConfig struct {
	MaxMemoryUsage uint64 `json:"maxMemoryUsage"`
	ChunkSize      int    `json:"chunkSize"`
	LogLevel       string `json:"logLevel"`
}

var (
	// Default configuration
	config = ServiceConfig{
		MaxMemoryUsage: 0, // No limit by default
		ChunkSize:      processors.DefaultChunkSize,
		LogLevel:       "INFO",
	}
	
	// Service logger
	log = logger.CreateLogger("BinaryProcessor", logger.INFO)
)

func main() {
	// Create router
	router := mux.NewRouter()
	
	// Set up routes
	router.HandleFunc("/health", healthCheckHandler)
	router.HandleFunc("/", homeHandler)
	
	// Set up API routes
	apiRouter := router.PathPrefix("/api").Subrouter()
	
	// Create storage, processor, and handler
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	
	// Create processor with configuration
	processor := processors.NewTestCaseProcessor(
		processors.WithChunkSize(config.ChunkSize),
		processors.WithMemoryLimit(config.MaxMemoryUsage),
		processors.WithLogger(log.Child("Processor")),
	)
	
	// Create test case handler
	testCaseHandler := handlers.NewTestCaseHandler(testCaseStorage)
	testCaseHandler.RegisterRoutes(apiRouter)
	
	// Configure advanced routes
	advancedHandler := NewAdvancedTestCaseHandler(testCaseStorage, processor)
	advancedHandler.RegisterRoutes(apiRouter)
	
	// Start memory monitoring
	go monitorMemory()
	
	// Start server
	port := 8090
	log.Info(fmt.Sprintf("Binary Processor service starting on port %d", port))
	log.Info(fmt.Sprintf("Configuration: chunk size=%d bytes, memory limit=%d bytes", 
		config.ChunkSize, 
		config.MaxMemoryUsage,
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
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// homeHandler returns basic service information
func homeHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]interface{}{
		"service": "Skidbladnir Binary Processor",
		"version": "0.2.0",
		"status":  "operational",
		"features": []string{
			"Large test case handling",
			"Chunked processing",
			"Memory monitoring",
		},
		"config": config,
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