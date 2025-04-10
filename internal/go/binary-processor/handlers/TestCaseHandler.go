package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
)

// TestCase represents a test case structure used by the binary processor
type TestCase struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	Priority    string    `json:"priority"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// TestCaseHandler handles test case processing operations
type TestCaseHandler struct {
	storage TestCaseStorage
}

// TestCaseStorage defines the interface for test case storage operations
type TestCaseStorage interface {
	Save(testCase *TestCase) error
	FindByID(id string) (*TestCase, error)
	FindAll() ([]*TestCase, error)
	Update(testCase *TestCase) error
	Delete(id string) error
}

// NewTestCaseHandler creates a new TestCaseHandler with the given storage
func NewTestCaseHandler(storage TestCaseStorage) *TestCaseHandler {
	return &TestCaseHandler{
		storage: storage,
	}
}

// RegisterRoutes registers the API routes for test case operations
func (h *TestCaseHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/testcases", h.ListTestCases).Methods("GET")
	router.HandleFunc("/api/testcases", h.CreateTestCase).Methods("POST")
	router.HandleFunc("/api/testcases/{id}", h.GetTestCase).Methods("GET")
	router.HandleFunc("/api/testcases/{id}", h.UpdateTestCase).Methods("PUT")
	router.HandleFunc("/api/testcases/{id}", h.DeleteTestCase).Methods("DELETE")
	router.HandleFunc("/api/testcases/{id}/process", h.ProcessTestCase).Methods("POST")
}

// ListTestCases returns all test cases
func (h *TestCaseHandler) ListTestCases(w http.ResponseWriter, r *http.Request) {
	testCases, err := h.storage.FindAll()
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to retrieve test cases").Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(testCases)
}

// GetTestCase returns a specific test case by ID
func (h *TestCaseHandler) GetTestCase(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	testCase, err := h.storage.FindByID(id)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to retrieve test case").Error(), http.StatusInternalServerError)
		return
	}

	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(testCase)
}

// CreateTestCase creates a new test case
func (h *TestCaseHandler) CreateTestCase(w http.ResponseWriter, r *http.Request) {
	var testCase TestCase
	if err := json.NewDecoder(r.Body).Decode(&testCase); err != nil {
		http.Error(w, errors.Wrap(err, "Invalid request body").Error(), http.StatusBadRequest)
		return
	}

	// Validate test case
	if testCase.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Generate UUID and set timestamps
	testCase.ID = uuid.New().String()
	now := time.Now()
	testCase.CreatedAt = now
	testCase.UpdatedAt = now

	// Set default values if not provided
	if testCase.Status == "" {
		testCase.Status = "DRAFT"
	}

	if testCase.Priority == "" {
		testCase.Priority = "MEDIUM"
	}

	if err := h.storage.Save(&testCase); err != nil {
		http.Error(w, errors.Wrap(err, "Failed to save test case").Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(testCase)
}

// UpdateTestCase updates an existing test case
func (h *TestCaseHandler) UpdateTestCase(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if test case exists
	existingTestCase, err := h.storage.FindByID(id)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to retrieve test case").Error(), http.StatusInternalServerError)
		return
	}

	if existingTestCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Parse update data
	var updateData TestCase
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, errors.Wrap(err, "Invalid request body").Error(), http.StatusBadRequest)
		return
	}

	// Update fields
	if updateData.Title != "" {
		existingTestCase.Title = updateData.Title
	}

	if updateData.Description != "" {
		existingTestCase.Description = updateData.Description
	}

	if updateData.Status != "" {
		existingTestCase.Status = updateData.Status
	}

	if updateData.Priority != "" {
		existingTestCase.Priority = updateData.Priority
	}

	existingTestCase.UpdatedAt = time.Now()

	// Save updates
	if err := h.storage.Update(existingTestCase); err != nil {
		http.Error(w, errors.Wrap(err, "Failed to update test case").Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingTestCase)
}

// DeleteTestCase deletes a test case
func (h *TestCaseHandler) DeleteTestCase(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if test case exists
	existingTestCase, err := h.storage.FindByID(id)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to retrieve test case").Error(), http.StatusInternalServerError)
		return
	}

	if existingTestCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Delete test case
	if err := h.storage.Delete(id); err != nil {
		http.Error(w, errors.Wrap(err, "Failed to delete test case").Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ProcessTestCase processes a test case with support for large test cases
func (h *TestCaseHandler) ProcessTestCase(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if test case exists
	existingTestCase, err := h.storage.FindByID(id)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to retrieve test case").Error(), http.StatusInternalServerError)
		return
	}

	if existingTestCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Parse processing options
	var options struct {
		Format       string `json:"format"`
		IncludeSteps bool   `json:"includeSteps"`
		ExportImages bool   `json:"exportImages"`
		ChunkSize    int    `json:"chunkSize"`
	}

	if err := json.NewDecoder(r.Body).Decode(&options); err != nil {
		options.Format = "JSON"
		options.IncludeSteps = true
		options.ExportImages = false
		options.ChunkSize = 0 // Use default
	}

	// Import the processor package (this would normally be done at the top of the file)
	// and create a processor instance
	processor := NewTestCaseProcessor()
	
	// Process the test case
	processingOptions := ProcessingOptions{
		Format:       options.Format,
		IncludeSteps: options.IncludeSteps,
		ExportImages: options.ExportImages,
		ChunkSize:    options.ChunkSize,
	}
	
	processedData, stats, err := processor.ProcessTestCase(existingTestCase, processingOptions)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to process test case").Error(), http.StatusInternalServerError)
		return
	}
	
	// Add processing stats to the response
	processedData["stats"] = stats

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedData)
}

// TestCaseProcessor interface for processing test cases
type TestCaseProcessor interface {
	ProcessTestCase(testCase *TestCase, options ProcessingOptions) (map[string]interface{}, ProcessingStats, error)
}

// ProcessingOptions contains options for test case processing
type ProcessingOptions struct {
	Format       string
	IncludeSteps bool
	ExportImages bool
	ChunkSize    int
}

// ProcessingStats contains statistics about the processing
type ProcessingStats struct {
	TotalBytes      int
	ProcessedBytes  int
	ChunksProcessed int
	ProcessingTime  time.Duration
	MemoryUsage     uint64
}

// mockTestCaseProcessor is a simple implementation for the handler
// In a real application, this would be imported from the processors package
type mockTestCaseProcessor struct{}

// NewTestCaseProcessor creates a new processor
func NewTestCaseProcessor() TestCaseProcessor {
	return &mockTestCaseProcessor{}
}

// ProcessTestCase processes a test case
func (p *mockTestCaseProcessor) ProcessTestCase(testCase *TestCase, options ProcessingOptions) (map[string]interface{}, ProcessingStats, error) {
	// This is a simplified version of what would be in the actual processor
	startTime := time.Now()
	
	// In a real implementation, this would process in chunks if needed
	
	// Create the result
	result := map[string]interface{}{
		"id":          testCase.ID,
		"title":       testCase.Title,
		"description": testCase.Description,
		"status":      testCase.Status,
		"priority":    testCase.Priority,
		"processingDetails": map[string]interface{}{
			"format":       options.Format,
			"processedAt":  time.Now(),
			"includeSteps": options.IncludeSteps,
			"exportImages": options.ExportImages,
		},
	}
	
	// Calculate stats
	stats := ProcessingStats{
		TotalBytes:      len(testCase.Description),
		ProcessedBytes:  len(testCase.Description),
		ChunksProcessed: 1,
		ProcessingTime:  time.Since(startTime),
	}
	
	return result, stats, nil
}
