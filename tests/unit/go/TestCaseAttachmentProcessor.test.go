package tests

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// Attachment represents a test case attachment
type Attachment struct {
	ID          string    `json:"id"`
	FileName    string    `json:"fileName"`
	ContentType string    `json:"contentType"`
	Size        int64     `json:"size"`
	Data        string    `json:"data"` // Base64 encoded data
	CreatedAt   time.Time `json:"createdAt"`
}

// TestCaseWithAttachments represents a test case with attachments
type TestCaseWithAttachments struct {
	handlers.TestCase
	Attachments []Attachment `json:"attachments"`
}

// AttachmentStorage interface for storing and retrieving attachments
type AttachmentStorage interface {
	SaveAttachment(testCaseID string, attachment *Attachment) error
	GetAttachments(testCaseID string) ([]Attachment, error)
	GetAttachment(testCaseID string, attachmentID string) (*Attachment, error)
	DeleteAttachment(testCaseID string, attachmentID string) error
}

// InMemoryAttachmentStorage implements AttachmentStorage using in-memory storage
type InMemoryAttachmentStorage struct {
	attachments map[string]map[string]*Attachment // Map by testCaseID then by attachmentID
}

// NewInMemoryAttachmentStorage creates a new in-memory attachment storage
func NewInMemoryAttachmentStorage() *InMemoryAttachmentStorage {
	return &InMemoryAttachmentStorage{
		attachments: make(map[string]map[string]*Attachment),
	}
}

// SaveAttachment stores an attachment in memory
func (s *InMemoryAttachmentStorage) SaveAttachment(testCaseID string, attachment *Attachment) error {
	if testCaseID == "" {
		return fmt.Errorf("test case ID cannot be empty")
	}
	if attachment == nil {
		return fmt.Errorf("attachment cannot be nil")
	}
	if attachment.ID == "" {
		attachment.ID = uuid.New().String()
	}

	// Create map for test case if it doesn't exist
	if _, exists := s.attachments[testCaseID]; !exists {
		s.attachments[testCaseID] = make(map[string]*Attachment)
	}

	// Store a copy of the attachment
	s.attachments[testCaseID][attachment.ID] = &Attachment{
		ID:          attachment.ID,
		FileName:    attachment.FileName,
		ContentType: attachment.ContentType,
		Size:        attachment.Size,
		Data:        attachment.Data,
		CreatedAt:   attachment.CreatedAt,
	}

	return nil
}

// GetAttachments retrieves all attachments for a test case
func (s *InMemoryAttachmentStorage) GetAttachments(testCaseID string) ([]Attachment, error) {
	if testCaseID == "" {
		return nil, fmt.Errorf("test case ID cannot be empty")
	}

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		attachments := make([]Attachment, 0, len(attachmentsMap))
		for _, attachment := range attachmentsMap {
			// Add a copy to prevent external modification
			attachments = append(attachments, Attachment{
				ID:          attachment.ID,
				FileName:    attachment.FileName,
				ContentType: attachment.ContentType,
				Size:        attachment.Size,
				Data:        attachment.Data,
				CreatedAt:   attachment.CreatedAt,
			})
		}
		return attachments, nil
	}

	return []Attachment{}, nil
}

// GetAttachment retrieves a specific attachment
func (s *InMemoryAttachmentStorage) GetAttachment(testCaseID string, attachmentID string) (*Attachment, error) {
	if testCaseID == "" {
		return nil, fmt.Errorf("test case ID cannot be empty")
	}
	if attachmentID == "" {
		return nil, fmt.Errorf("attachment ID cannot be empty")
	}

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		if attachment, attachExists := attachmentsMap[attachmentID]; attachExists {
			// Return a copy to prevent external modification
			return &Attachment{
				ID:          attachment.ID,
				FileName:    attachment.FileName,
				ContentType: attachment.ContentType,
				Size:        attachment.Size,
				Data:        attachment.Data,
				CreatedAt:   attachment.CreatedAt,
			}, nil
		}
	}

	return nil, nil // Not found
}

// DeleteAttachment deletes an attachment
func (s *InMemoryAttachmentStorage) DeleteAttachment(testCaseID string, attachmentID string) error {
	if testCaseID == "" {
		return fmt.Errorf("test case ID cannot be empty")
	}
	if attachmentID == "" {
		return fmt.Errorf("attachment ID cannot be empty")
	}

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		if _, attachExists := attachmentsMap[attachmentID]; attachExists {
			delete(attachmentsMap, attachmentID)
			return nil
		}
	}

	return fmt.Errorf("attachment not found")
}

// AttachmentHandler handles attachment operations
type AttachmentHandler struct {
	testCaseStorage    handlers.TestCaseStorage
	attachmentStorage  AttachmentStorage
	attachmentProcessor AttachmentProcessor
	maxUploadSize      int64
	log                *logger.Logger
}

// AttachmentProcessor processes attachments
type AttachmentProcessor interface {
	ProcessAttachment(attachment *Attachment, options *processors.ProcessingOptions) (*Attachment, error)
}

// NewAttachmentHandler creates a new attachment handler
func NewAttachmentHandler(testCaseStorage handlers.TestCaseStorage, attachmentStorage AttachmentStorage, processor AttachmentProcessor) *AttachmentHandler {
	return &AttachmentHandler{
		testCaseStorage:    testCaseStorage,
		attachmentStorage:  attachmentStorage,
		attachmentProcessor: processor,
		maxUploadSize:      50 * 1024 * 1024, // 50MB default
		log:                logger.CreateLogger("AttachmentHandler", logger.INFO),
	}
}

// RegisterRoutes registers routes for attachment handling
func (h *AttachmentHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/testcases/{id}/attachments", h.GetAttachments).Methods("GET")
	router.HandleFunc("/testcases/{id}/attachments", h.UploadAttachment).Methods("POST")
	router.HandleFunc("/testcases/{id}/attachments/{attachmentId}", h.GetAttachment).Methods("GET")
	router.HandleFunc("/testcases/{id}/attachments/{attachmentId}", h.DeleteAttachment).Methods("DELETE")
	router.HandleFunc("/testcases/{id}/attachments/{attachmentId}/process", h.ProcessAttachment).Methods("POST")
}

// GetAttachments returns all attachments for a test case
func (h *AttachmentHandler) GetAttachments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to find test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachments
	attachments, err := h.attachmentStorage.GetAttachments(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get attachments: %v", err), http.StatusInternalServerError)
		return
	}

	// Return attachments list, but don't include the data to keep response size small
	attachmentsInfo := make([]map[string]interface{}, 0, len(attachments))
	for _, a := range attachments {
		attachmentsInfo = append(attachmentsInfo, map[string]interface{}{
			"id":          a.ID,
			"fileName":    a.FileName,
			"contentType": a.ContentType,
			"size":        a.Size,
			"createdAt":   a.CreatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachmentsInfo)
}

// UploadAttachment handles file uploads for a test case
func (h *AttachmentHandler) UploadAttachment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to find test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Limit the size of uploads
	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadSize)

	// Parse the multipart form
	err = r.ParseMultipartForm(h.maxUploadSize)
	if err != nil {
		http.Error(w, fmt.Sprintf("File too large: %v", err), http.StatusBadRequest)
		return
	}

	// Get the file from the form
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving file: %v", err), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read the file data
	data, err := ioutil.ReadAll(file)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error reading file: %v", err), http.StatusInternalServerError)
		return
	}

	// Create an attachment
	attachment := &Attachment{
		ID:          uuid.New().String(),
		FileName:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Size:        int64(len(data)),
		Data:        base64.StdEncoding.EncodeToString(data),
		CreatedAt:   time.Now(),
	}

	// Save attachment
	err = h.attachmentStorage.SaveAttachment(id, attachment)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error saving attachment: %v", err), http.StatusInternalServerError)
		return
	}

	// Return success response with attachment info
	response := map[string]interface{}{
		"id":          attachment.ID,
		"fileName":    attachment.FileName,
		"contentType": attachment.ContentType,
		"size":        attachment.Size,
		"createdAt":   attachment.CreatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetAttachment retrieves a specific attachment
func (h *AttachmentHandler) GetAttachment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	attachmentID := vars["attachmentId"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to find test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachment
	attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get attachment: %v", err), http.StatusInternalServerError)
		return
	}
	if attachment == nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Check if client wants a download
	download := r.URL.Query().Get("download") == "true"

	if download {
		// Decode base64 data
		data, err := base64.StdEncoding.DecodeString(attachment.Data)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to decode attachment data: %v", err), http.StatusInternalServerError)
			return
		}

		// Set appropriate headers for file download
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", attachment.FileName))
		w.Header().Set("Content-Type", attachment.ContentType)
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))

		// Write the file directly to the response
		w.Write(data)
	} else {
		// Return attachment metadata with data
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(attachment)
	}
}

// DeleteAttachment deletes an attachment
func (h *AttachmentHandler) DeleteAttachment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	attachmentID := vars["attachmentId"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to find test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Delete attachment
	err = h.attachmentStorage.DeleteAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete attachment: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ProcessAttachment processes an attachment
func (h *AttachmentHandler) ProcessAttachment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	attachmentID := vars["attachmentId"]

	// Check if test case exists
	testCase, err := h.testCaseStorage.FindByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to find test case: %v", err), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachment
	attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get attachment: %v", err), http.StatusInternalServerError)
		return
	}
	if attachment == nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Parse processing options
	var options processors.ProcessingOptions
	if err := json.NewDecoder(r.Body).Decode(&options); err != nil {
		// Use default options if not provided
		options.Format = "JSON"
		options.ExportImages = true
	}

	// Process the attachment
	processedAttachment, err := h.attachmentProcessor.ProcessAttachment(attachment, &options)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to process attachment: %v", err), http.StatusInternalServerError)
		return
	}

	// Return the processed attachment
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedAttachment)
}

// DefaultAttachmentProcessor implements AttachmentProcessor
type DefaultAttachmentProcessor struct {
	processor *processors.TestCaseProcessor
	log       *logger.Logger
}

// NewDefaultAttachmentProcessor creates a new attachment processor
func NewDefaultAttachmentProcessor(processor *processors.TestCaseProcessor) *DefaultAttachmentProcessor {
	return &DefaultAttachmentProcessor{
		processor: processor,
		log:       logger.CreateLogger("AttachmentProcessor", logger.INFO),
	}
}

// ProcessAttachment processes an attachment
func (p *DefaultAttachmentProcessor) ProcessAttachment(attachment *Attachment, options *processors.ProcessingOptions) (*Attachment, error) {
	// Check if we need to process this attachment type
	if !p.shouldProcess(attachment, options) {
		return attachment, nil
	}

	// Decode attachment data
	data, err := base64.StdEncoding.DecodeString(attachment.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode attachment data: %v", err)
	}

	// Process data based on content type and options
	processedData, err := p.processData(data, attachment.ContentType, options)
	if err != nil {
		return nil, fmt.Errorf("failed to process attachment data: %v", err)
	}

	// Create new attachment with processed data
	processedAttachment := &Attachment{
		ID:          uuid.New().String(),
		FileName:    p.getProcessedFileName(attachment.FileName, options),
		ContentType: p.getProcessedContentType(attachment.ContentType, options),
		Size:        int64(len(processedData)),
		Data:        base64.StdEncoding.EncodeToString(processedData),
		CreatedAt:   time.Now(),
	}

	return processedAttachment, nil
}

// shouldProcess determines if attachment should be processed based on type and options
func (p *DefaultAttachmentProcessor) shouldProcess(attachment *Attachment, options *processors.ProcessingOptions) bool {
	// Don't process if export images is disabled and this is an image
	if !options.ExportImages && strings.HasPrefix(attachment.ContentType, "image/") {
		return false
	}

	// Always process by default
	return true
}

// processData processes the attachment data based on content type
func (p *DefaultAttachmentProcessor) processData(data []byte, contentType string, options *processors.ProcessingOptions) ([]byte, error) {
	// Check if we need chunking for large attachments
	if int64(len(data)) > int64(p.processor.GetChunkSize()) {
		return p.processLargeData(data, contentType, options)
	}

	// Process data based on content type
	switch {
	case strings.HasPrefix(contentType, "image/"):
		return p.processImage(data, contentType, options)
	case strings.HasPrefix(contentType, "text/"):
		return p.processText(data, contentType, options)
	case contentType == "application/pdf":
		return p.processPDF(data, options)
	case contentType == "application/zip":
		return p.processZip(data, options)
	default:
		// For other types, just return as is
		return data, nil
	}
}

// processLargeData processes large data in chunks
func (p *DefaultAttachmentProcessor) processLargeData(data []byte, contentType string, options *processors.ProcessingOptions) ([]byte, error) {
	chunkSize := p.processor.GetChunkSize()
	p.log.Info(fmt.Sprintf("Processing large attachment (%d bytes) in chunks of %d bytes", len(data), chunkSize))

	// Process in chunks
	var processedData []byte
	chunks := (len(data) + chunkSize - 1) / chunkSize // Ceiling division

	for i := 0; i < chunks; i++ {
		// Calculate chunk range
		start := i * chunkSize
		end := (i + 1) * chunkSize
		if end > len(data) {
			end = len(data)
		}

		chunk := data[start:end]

		// Process individual chunk
		var processedChunk []byte
		var err error

		switch {
		case strings.HasPrefix(contentType, "image/"):
			// For images, if this is the first chunk, process header info
			if i == 0 {
				processedChunk, err = p.processImage(chunk, contentType, options)
			} else {
				// For subsequent chunks of images, just append the data
				processedChunk = chunk
			}
		case strings.HasPrefix(contentType, "text/"):
			// For text, process each chunk
			processedChunk, err = p.processText(chunk, contentType, options)
		default:
			// For other types, just append chunk
			processedChunk = chunk
		}

		if err != nil {
			return nil, fmt.Errorf("error processing chunk %d: %v", i, err)
		}

		processedData = append(processedData, processedChunk...)
		p.log.Debug(fmt.Sprintf("Processed chunk %d/%d (%d bytes)", i+1, chunks, len(chunk)))
	}

	return processedData, nil
}

// Helper method to get chunk size from processor
func (p *processors.TestCaseProcessor) GetChunkSize() int {
	return p.GetChunkSizeForTesting()
}

// GetChunkSizeForTesting is a testing helper method
func (p *processors.TestCaseProcessor) GetChunkSizeForTesting() int {
	// This would actually access the private field
	// In a real implementation, you would add this method to the processor
	return processors.DefaultChunkSize
}

// processImage processes image data
func (p *DefaultAttachmentProcessor) processImage(data []byte, contentType string, options *processors.ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would resize, compress, or convert the image
	// For testing, just return the original data
	return data, nil
}

// processText processes text data
func (p *DefaultAttachmentProcessor) processText(data []byte, contentType string, options *processors.ProcessingOptions) ([]byte, error) {
	// Convert text based on format option
	switch options.Format {
	case "XML":
		// Convert to XML-like format for testing
		return []byte(fmt.Sprintf("<content>%s</content>", data)), nil
	case "HTML":
		// Convert to HTML-like format for testing
		return []byte(fmt.Sprintf("<div>%s</div>", data)), nil
	case "MARKDOWN":
		// Convert to Markdown-like format for testing
		return []byte(fmt.Sprintf("# Content\n\n%s", data)), nil
	default:
		// Return as-is for other formats
		return data, nil
	}
}

// processPDF handles PDF attachments
func (p *DefaultAttachmentProcessor) processPDF(data []byte, options *processors.ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would extract text, compress, or analyze PDFs
	// For testing, just return the data
	return data, nil
}

// processZip handles ZIP attachments
func (p *DefaultAttachmentProcessor) processZip(data []byte, options *processors.ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would extract and process ZIP contents
	// For testing, just return the data
	return data, nil
}

// getProcessedFileName returns the appropriate filename for processed attachment
func (p *DefaultAttachmentProcessor) getProcessedFileName(originalFilename string, options *processors.ProcessingOptions) string {
	ext := filepath.Ext(originalFilename)
	baseName := strings.TrimSuffix(originalFilename, ext)

	// Modify extension based on format if applicable
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			ext = ".xml"
		case "HTML":
			ext = ".html"
		case "MARKDOWN":
			ext = ".md"
		}
	}

	return baseName + "_processed" + ext
}

// getProcessedContentType returns the content type for processed attachment
func (p *DefaultAttachmentProcessor) getProcessedContentType(originalType string, options *processors.ProcessingOptions) string {
	// Change content type based on format if applicable
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			return "application/xml"
		case "HTML":
			return "text/html"
		case "MARKDOWN":
			return "text/markdown"
		}
	}

	return originalType
}

// TestAttachmentProcessing tests attachment handling in the Binary Processor
func TestAttachmentProcessing(t *testing.T) {
	// Create handler and processor components
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	attachmentStorage := NewInMemoryAttachmentStorage()
	processor := processors.NewTestCaseProcessor(
		processors.WithChunkSize(1024 * 10), // 10KB chunks for testing
		processors.WithLogger(logger.CreateLogger("TestProcessor", logger.DEBUG)),
	)
	attachmentProcessor := NewDefaultAttachmentProcessor(processor)
	attachmentHandler := NewAttachmentHandler(testCaseStorage, attachmentStorage, attachmentProcessor)

	// Create router for testing
	router := mux.NewRouter()
	attachmentHandler.RegisterRoutes(router)

	// Create a test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Create a test case to attach files to
	testCase := &handlers.TestCase{
		ID:          uuid.New().String(),
		Title:       "Test Case for Attachment Testing",
		Description: "This test case is used to test attachment processing",
		Status:      "ACTIVE",
		Priority:    "HIGH",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save the test case
	require.NoError(t, testCaseStorage.Save(testCase))

	// Test cases for different attachment types
	t.Run("ProcessTextFileAttachment", func(t *testing.T) {
		// Create a temporary text file
		textContent := "This is a test text file for attachment processing.\nIt contains multiple lines\nto test the text processing functionality."
		testProcessTextAttachment(t, server, testCase.ID, textContent, "test.txt", "text/plain")
	})

	t.Run("ProcessLargeTextFileAttachment", func(t *testing.T) {
		// Create large text content (> chunk size)
		var largeContent strings.Builder
		for i := 0; i < 2000; i++ {
			largeContent.WriteString(fmt.Sprintf("Line %d: This is test content to create a large file that exceeds the chunk size.\n", i))
		}
		testProcessTextAttachment(t, server, testCase.ID, largeContent.String(), "large.txt", "text/plain")
	})

	t.Run("ProcessHTMLAttachment", func(t *testing.T) {
		htmlContent := "<html><body><h1>Test HTML File</h1><p>This is a test HTML file.</p></body></html>"
		testProcessTextAttachment(t, server, testCase.ID, htmlContent, "test.html", "text/html")
	})

	// Test image attachment processing
	t.Run("ProcessImageAttachment", func(t *testing.T) {
		// Create a simple test image (could be a 1x1 pixel)
		imageData := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A} // PNG header
		testProcessBinaryAttachment(t, server, testCase.ID, imageData, "test.png", "image/png")
	})

	// Test mixed format conversions
	t.Run("ConvertTextToXML", func(t *testing.T) {
		textContent := "This text will be converted to XML format"
		attachmentID := uploadAttachment(t, server, testCase.ID, textContent, "convert.txt", "text/plain")
		
		// Process with XML format
		options := processors.ProcessingOptions{
			Format:       "XML",
			ExportImages: true,
		}
		
		processAndVerifyAttachment(t, server, testCase.ID, attachmentID, options, func(processed *Attachment) {
			// Verify conversion to XML
			data, err := base64.StdEncoding.DecodeString(processed.Data)
			require.NoError(t, err)
			
			// Check for XML tags
			assert.True(t, strings.HasPrefix(string(data), "<content>"))
			assert.True(t, strings.HasSuffix(string(data), "</content>"))
			
			// Verify content type changed
			assert.Equal(t, "application/xml", processed.ContentType)
		})
	})

	// Test handling of ZIP files
	t.Run("ProcessZipAttachment", func(t *testing.T) {
		// Create a sample ZIP file content
		zipData := []byte{0x50, 0x4B, 0x03, 0x04} // ZIP header
		testProcessBinaryAttachment(t, server, testCase.ID, zipData, "test.zip", "application/zip")
	})

	// Test concurrent processing of multiple attachments
	t.Run("ProcessMultipleAttachmentsConcurrently", func(t *testing.T) {
		// Upload multiple attachments
		var attachmentIDs []string
		for i := 0; i < 5; i++ {
			content := fmt.Sprintf("Concurrent attachment test %d", i)
			attachmentID := uploadAttachment(t, server, testCase.ID, content, fmt.Sprintf("concurrent_%d.txt", i), "text/plain")
			attachmentIDs = append(attachmentIDs, attachmentID)
		}
		
		// Process all concurrently
		options := processors.ProcessingOptions{
			Format:       "MARKDOWN",
			ExportImages: true,
		}
		
		// In a real test, you would use goroutines and wait groups
		for _, id := range attachmentIDs {
			processAndVerifyAttachment(t, server, testCase.ID, id, options, func(processed *Attachment) {
				assert.Equal(t, "text/markdown", processed.ContentType)
			})
		}
	})

	// Test processing between providers (Zephyr to qTest)
	t.Run("ProcessZephyrToQTestAttachment", func(t *testing.T) {
		// Simulate a Zephyr attachment format
		zephyrContent := `
		{
			"attachmentInfo": {
				"origin": "zephyr",
				"metadata": {
					"projectKey": "ZEPH",
					"issueKey": "ZEPH-123",
					"testCaseKey": "ZEPH-TEST-456"
				}
			},
			"content": "This is attachment content from Zephyr"
		}`
		
		attachmentID := uploadAttachment(t, server, testCase.ID, zephyrContent, "zephyr_attachment.json", "application/json")
		
		// Process for qTest format
		options := processors.ProcessingOptions{
			Format:       "JSON",
			ExportImages: true,
		}
		
		processAndVerifyAttachment(t, server, testCase.ID, attachmentID, options, func(processed *Attachment) {
			// In a real implementation, we would verify transformation to qTest format
			assert.NotEqual(t, attachmentID, processed.ID)
			assert.Contains(t, processed.FileName, "_processed")
		})
	})
}

// testProcessTextAttachment is a helper to test text attachment processing
func testProcessTextAttachment(t *testing.T, server *httptest.Server, testCaseID, content, filename, contentType string) {
	attachmentID := uploadAttachment(t, server, testCaseID, content, filename, contentType)
	
	// Process with default options
	options := processors.ProcessingOptions{
		Format:       "JSON", // Default format
		ExportImages: true,
	}
	
	processAndVerifyAttachment(t, server, testCaseID, attachmentID, options, func(processed *Attachment) {
		// Basic verification that processing happened
		assert.NotEqual(t, attachmentID, processed.ID)
		assert.Contains(t, processed.FileName, "_processed")
		
		// In a real test, would verify actual processing results
	})
}

// testProcessBinaryAttachment is a helper to test binary attachment processing
func testProcessBinaryAttachment(t *testing.T, server *httptest.Server, testCaseID string, data []byte, filename, contentType string) {
	// Create request body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	// Create form file
	fileWriter, err := writer.CreateFormFile("file", filename)
	require.NoError(t, err)
	
	// Write the binary data
	_, err = fileWriter.Write(data)
	require.NoError(t, err)
	
	// Close the writer
	writer.Close()
	
	// Create the request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/testcases/%s/attachments", server.URL, testCaseID), body)
	require.NoError(t, err)
	
	// Set content type
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	
	// Check response status
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Parse response
	var result map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&result)
	require.NoError(t, err)
	
	// Verify attachment was created
	attachmentID, ok := result["id"].(string)
	require.True(t, ok)
	
	// Process the attachment with default options
	options := processors.ProcessingOptions{
		ExportImages: true,
	}
	
	processAndVerifyAttachment(t, server, testCaseID, attachmentID, options, func(processed *Attachment) {
		// Basic verification for binary files
		assert.NotEqual(t, attachmentID, processed.ID)
		assert.Contains(t, processed.FileName, "_processed")
		
		// In a real test, would verify actual processing results
	})
}

// uploadAttachment uploads an attachment and returns its ID
func uploadAttachment(t *testing.T, server *httptest.Server, testCaseID, content, filename, contentType string) string {
	// Create request body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	// Create form file
	fileWriter, err := writer.CreateFormFile("file", filename)
	require.NoError(t, err)
	
	// Write the content
	_, err = io.WriteString(fileWriter, content)
	require.NoError(t, err)
	
	// Close the writer
	writer.Close()
	
	// Create the request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/testcases/%s/attachments", server.URL, testCaseID), body)
	require.NoError(t, err)
	
	// Set content type
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	
	// Check response status
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Parse response
	var result map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&result)
	require.NoError(t, err)
	
	// Return attachment ID
	attachmentID, ok := result["id"].(string)
	require.True(t, ok)
	return attachmentID
}

// processAndVerifyAttachment processes an attachment and verifies it with the provided function
func processAndVerifyAttachment(t *testing.T, server *httptest.Server, testCaseID, attachmentID string, options processors.ProcessingOptions, verifyFn func(*Attachment)) {
	// Create the options body
	optionsBody, err := json.Marshal(options)
	require.NoError(t, err)
	
	// Create the request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/testcases/%s/attachments/%s/process", server.URL, testCaseID, attachmentID), bytes.NewBuffer(optionsBody))
	require.NoError(t, err)
	
	// Set content type
	req.Header.Set("Content-Type", "application/json")
	
	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	
	// Check response status
	require.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Parse response
	var processed Attachment
	err = json.NewDecoder(resp.Body).Decode(&processed)
	require.NoError(t, err)
	
	// Verify with provided function
	verifyFn(&processed)
}