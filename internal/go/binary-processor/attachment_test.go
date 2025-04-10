package binary_processor_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
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

// TestAttachmentHandler tests the attachment handling functionality
func TestAttachmentHandler(t *testing.T) {
	// Create handler and processor components
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	attachmentStorage := storage.NewInMemoryAttachmentStorage()
	
	processor := processors.NewTestCaseProcessor(
		processors.WithChunkSize(1024 * 10), // 10KB chunks for testing
		processors.WithLogger(logger.CreateLogger("TestProcessor", logger.DEBUG)),
	)
	
	attachmentProcessor := processors.NewAttachmentProcessor(
		processors.WithAttachmentChunkSize(1024 * 10),
		processors.WithAttachmentLogger(logger.CreateLogger("AttachmentProcessor", logger.DEBUG)),
	)
	
	attachmentHandler := handlers.NewAttachmentHandler(testCaseStorage, attachmentStorage, attachmentProcessor)

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

	// Test uploading a text attachment
	t.Run("UploadTextAttachment", func(t *testing.T) {
		textContent := "This is a test text file for attachment processing."
		attachmentID := uploadAttachment(t, server, testCase.ID, textContent, "test.txt", "text/plain")
		
		// Verify the attachment was saved correctly
		attachment, err := attachmentStorage.GetAttachment(testCase.ID, attachmentID)
		require.NoError(t, err)
		require.NotNil(t, attachment)
		
		// Verify the content
		data, err := base64.StdEncoding.DecodeString(attachment.Data)
		require.NoError(t, err)
		assert.Equal(t, textContent, string(data))
	})

	// Test processing a text attachment with XML format
	t.Run("ProcessTextAttachmentToXML", func(t *testing.T) {
		textContent := "This text will be converted to XML format"
		attachmentID := uploadAttachment(t, server, testCase.ID, textContent, "convert.txt", "text/plain")
		
		// Process with XML format
		options := processors.ProcessingOptions{
			Format:       "XML",
			ExportImages: true,
		}
		
		processedID := processAndVerifyAttachment(t, server, testCase.ID, attachmentID, options)
		
		// Verify the processed attachment
		processed, err := attachmentStorage.GetAttachment(testCase.ID, processedID)
		require.NoError(t, err)
		require.NotNil(t, processed)
		
		// Verify content was transformed to XML
		data, err := base64.StdEncoding.DecodeString(processed.Data)
		require.NoError(t, err)
		assert.Contains(t, string(data), "<content>")
		assert.Contains(t, string(data), "</content>")
		
		// Verify content type changed
		assert.Equal(t, "application/xml", processed.ContentType)
	})

	// Test cross-provider format conversion (Zephyr to qTest)
	t.Run("ConvertZephyrToQTest", func(t *testing.T) {
		// Create a Zephyr format JSON
		zephyrContent := `{
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
		
		attachmentID := uploadAttachment(t, server, testCase.ID, zephyrContent, "zephyr_data.json", "application/json")
		
		// Process for qTest format
		options := processors.ProcessingOptions{
			Format:       "JSON",
			ExportImages: true,
		}
		
		processedID := processAndVerifyAttachment(t, server, testCase.ID, attachmentID, options)
		
		// Verify the processed attachment
		processed, err := attachmentStorage.GetAttachment(testCase.ID, processedID)
		require.NoError(t, err)
		require.NotNil(t, processed)
		
		// Decode and parse the content
		data, err := base64.StdEncoding.DecodeString(processed.Data)
		require.NoError(t, err)
		
		var qTestData map[string]interface{}
		err = json.Unmarshal(data, &qTestData)
		require.NoError(t, err)
		
		// Verify it has the qTest format properties
		_, hasLinks := qTestData["links"]
		assert.True(t, hasLinks, "Should have 'links' property")
		
		_, hasConvertedFrom := qTestData["convertedFrom"]
		assert.True(t, hasConvertedFrom, "Should have 'convertedFrom' property")
		
		// Verify the metadata from Zephyr is preserved
		originalMetadata, hasOriginalMetadata := qTestData["originalMetadata"]
		assert.True(t, hasOriginalMetadata, "Should have 'originalMetadata' property")
		
		metadata, ok := originalMetadata.(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "ZEPH", metadata["projectKey"])
	})

	// Test getting attachment list
	t.Run("GetAttachmentsList", func(t *testing.T) {
		// Upload a few more attachments
		for i := 0; i < 3; i++ {
			content := fmt.Sprintf("Attachment %d content", i)
			uploadAttachment(t, server, testCase.ID, content, fmt.Sprintf("attach%d.txt", i), "text/plain")
		}
		
		// Retrieve the list
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/testcases/%s/attachments", server.URL, testCase.ID), nil)
		require.NoError(t, err)
		
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		
		// Check response status
		require.Equal(t, http.StatusOK, resp.StatusCode)
		
		// Parse response
		var attachments []map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&attachments)
		require.NoError(t, err)
		
		// We should have at least the attachments we've added
		assert.GreaterOrEqual(t, len(attachments), 5, "Should have at least 5 attachments")
		
		// Verify the list contains attachment info but not the data
		for _, a := range attachments {
			assert.Contains(t, a, "id")
			assert.Contains(t, a, "fileName")
			assert.Contains(t, a, "contentType")
			assert.Contains(t, a, "size")
			assert.NotContains(t, a, "data", "Attachment list shouldn't include the data")
		}
	})

	// Test downloading an attachment
	t.Run("DownloadAttachment", func(t *testing.T) {
		textContent := "Content for download test"
		attachmentID := uploadAttachment(t, server, testCase.ID, textContent, "download_test.txt", "text/plain")
		
		// Download the attachment
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/testcases/%s/attachments/%s?download=true", 
			server.URL, testCase.ID, attachmentID), nil)
		require.NoError(t, err)
		
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		
		// Check response status
		require.Equal(t, http.StatusOK, resp.StatusCode)
		
		// Check headers
		assert.Equal(t, "text/plain", resp.Header.Get("Content-Type"))
		assert.Contains(t, resp.Header.Get("Content-Disposition"), "download_test.txt")
		
		// Read the body and verify content
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, textContent, string(body))
	})

	// Test deleting an attachment
	t.Run("DeleteAttachment", func(t *testing.T) {
		textContent := "Content for delete test"
		attachmentID := uploadAttachment(t, server, testCase.ID, textContent, "delete_test.txt", "text/plain")
		
		// Verify it exists
		attachment, err := attachmentStorage.GetAttachment(testCase.ID, attachmentID)
		require.NoError(t, err)
		require.NotNil(t, attachment)
		
		// Delete the attachment
		req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/testcases/%s/attachments/%s", 
			server.URL, testCase.ID, attachmentID), nil)
		require.NoError(t, err)
		
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		
		// Check response status
		require.Equal(t, http.StatusNoContent, resp.StatusCode)
		
		// Verify it's deleted
		attachment, err = attachmentStorage.GetAttachment(testCase.ID, attachmentID)
		require.NoError(t, err)
		assert.Nil(t, attachment, "Attachment should be deleted")
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

// processAndVerifyAttachment processes an attachment and returns the ID of the processed attachment
func processAndVerifyAttachment(t *testing.T, server *httptest.Server, testCaseID, attachmentID string, options processors.ProcessingOptions) string {
	// Create the options body
	optionsBody, err := json.Marshal(options)
	require.NoError(t, err)
	
	// Create the request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/testcases/%s/attachments/%s/process", 
		server.URL, testCaseID, attachmentID), bytes.NewBuffer(optionsBody))
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
	
	// Parse response to get processed attachment ID
	var processed storage.Attachment
	err = json.NewDecoder(resp.Body).Decode(&processed)
	require.NoError(t, err)
	
	return processed.ID
}