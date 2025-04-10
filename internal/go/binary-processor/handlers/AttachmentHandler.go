package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// AttachmentHandler handles attachment operations
type AttachmentHandler struct {
	testCaseStorage     TestCaseStorage
	attachmentStorage   storage.AttachmentStorage
	attachmentProcessor *processors.AttachmentProcessor
	maxUploadSize       int64
	log                 *logger.Logger
}

// NewAttachmentHandler creates a new attachment handler
func NewAttachmentHandler(
	testCaseStorage TestCaseStorage,
	attachmentStorage storage.AttachmentStorage,
	processor *processors.AttachmentProcessor,
) *AttachmentHandler {
	return &AttachmentHandler{
		testCaseStorage:     testCaseStorage,
		attachmentStorage:   attachmentStorage,
		attachmentProcessor: processor,
		maxUploadSize:       50 * 1024 * 1024, // 50MB default
		log:                 logger.CreateLogger("AttachmentHandler", logger.INFO),
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
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachments
	attachments, err := h.attachmentStorage.GetAttachments(id)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to get attachments").Error(), http.StatusInternalServerError)
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
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
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
		http.Error(w, errors.Wrap(err, "File too large").Error(), http.StatusBadRequest)
		return
	}

	// Get the file from the form
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, errors.Wrap(err, "Error retrieving file").Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read the file data
	data, err := ioutil.ReadAll(file)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Error reading file").Error(), http.StatusInternalServerError)
		return
	}

	// Create an attachment
	attachment := &storage.Attachment{
		ID:          uuid.New().String(),
		FileName:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Size:        int64(len(data)),
		Data:        base64.StdEncoding.EncodeToString(data),
		CreatedAt:   testCase.CreatedAt, // Use the test case creation time for consistency
	}

	// Save attachment
	err = h.attachmentStorage.SaveAttachment(id, attachment)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Error saving attachment").Error(), http.StatusInternalServerError)
		return
	}

	// Log the upload
	h.log.Info(fmt.Sprintf("Attachment uploaded for test case %s: %s (%s, %d bytes)",
		id, attachment.FileName, attachment.ContentType, attachment.Size))

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
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachment
	attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to get attachment").Error(), http.StatusInternalServerError)
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
			http.Error(w, errors.Wrap(err, "Failed to decode attachment data").Error(), http.StatusInternalServerError)
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
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Delete attachment
	err = h.attachmentStorage.DeleteAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to delete attachment").Error(), http.StatusInternalServerError)
		return
	}

	h.log.Info(fmt.Sprintf("Attachment %s deleted from test case %s", attachmentID, id))
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
		http.Error(w, errors.Wrap(err, "Failed to find test case").Error(), http.StatusInternalServerError)
		return
	}
	if testCase == nil {
		http.Error(w, "Test case not found", http.StatusNotFound)
		return
	}

	// Get attachment
	attachment, err := h.attachmentStorage.GetAttachment(id, attachmentID)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to get attachment").Error(), http.StatusInternalServerError)
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
		http.Error(w, errors.Wrap(err, "Failed to process attachment").Error(), http.StatusInternalServerError)
		return
	}

	// Save the processed attachment
	err = h.attachmentStorage.SaveAttachment(id, processedAttachment)
	if err != nil {
		http.Error(w, errors.Wrap(err, "Failed to save processed attachment").Error(), http.StatusInternalServerError)
		return
	}

	h.log.Info(fmt.Sprintf("Attachment %s processed to %s (format: %s, new size: %d bytes)",
		attachmentID, processedAttachment.ID, options.Format, processedAttachment.Size))

	// Return the processed attachment
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedAttachment)
}