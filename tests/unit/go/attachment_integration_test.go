package binary_processor_test

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

// TestZephyrQTestAttachmentIntegration tests the handling of attachments between Zephyr and qTest
func TestZephyrQTestAttachmentIntegration(t *testing.T) {
	// Create components for testing
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	attachmentStorage := storage.NewInMemoryAttachmentStorage()
	
	// Create logger with debug level for detailed output
	log := logger.CreateLogger("TestBinaryProcessor", logger.DEBUG)
	
	// Create format converter for handling provider formats
	formatConverter := processors.NewFormatConverter(log.Child("FormatConverter"))
	
	// Create attachment processor
	attachmentProcessor := processors.NewAttachmentProcessor(
		processors.WithAttachmentChunkSize(1024 * 4), // Smaller chunks for testing
		processors.WithAttachmentMemoryLimit(1024 * 1024 * 10), // 10MB limit for testing
		processors.WithAttachmentLogger(log.Child("AttachmentProcessor")),
	)
	
	// Create attachment handler
	attachmentHandler := handlers.NewAttachmentHandler(
		testCaseStorage, 
		attachmentStorage, 
		attachmentProcessor,
	)
	
	// Create batch handler for bulk operations
	batchHandler := handlers.NewBatchAttachmentHandler(
		testCaseStorage,
		attachmentStorage,
		attachmentProcessor,
		formatConverter,
	)

	// Create router and register handlers
	router := mux.NewRouter()
	attachmentHandler.RegisterRoutes(router)
	batchHandler.RegisterRoutes(router)

	// Create test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Create a test case for attachment testing
	testCase := &handlers.TestCase{
		ID:          uuid.New().String(),
		Title:       "Zephyr to qTest Attachment Test Case",
		Description: "This test case is used to test Zephyr to qTest attachment handling",
		Status:      "ACTIVE",
		Priority:    "HIGH",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save the test case
	require.NoError(t, testCaseStorage.Save(testCase))

	// Define test cases for different attachment scenarios
	t.Run("ZephyrTextAttachmentToQTest", func(t *testing.T) {
		// Create a Zephyr text attachment
		zephyrAttachment := createZephyrAttachment(
			"test_steps.txt",
			"text/plain",
			"Step 1: Log in to the system\nStep 2: Navigate to the dashboard\nStep 3: Verify all widgets are displayed",
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"issueKey": "ZEPH-123",
				"testCaseKey": "ZEPH-TEST-456",
				"testStepId": "789",
				"executionId": "1011",
			},
		)
		
		// Upload the attachment
		attachmentID := uploadZephyrAttachment(t, server, testCase.ID, zephyrAttachment)
		
		// Convert to qTest format
		qTestAttachmentID := convertAttachmentToQTest(t, server, testCase.ID, attachmentID)
		
		// Verify the converted attachment
		qTestAttachment, err := attachmentStorage.GetAttachment(testCase.ID, qTestAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, qTestAttachment)
		
		// Verify conversion
		verifyQTestAttachment(t, qTestAttachment, "ZEPH-TEST-456", "test_steps.txt")
	})

	t.Run("ZephyrJSONAttachmentToQTest", func(t *testing.T) {
		// Create a Zephyr JSON attachment with test data
		testData := map[string]interface{}{
			"testcase": map[string]interface{}{
				"name": "Login Test",
				"priority": "High",
				"status": "Active",
				"steps": []map[string]interface{}{
					{
						"description": "Open login page",
						"expected": "Login page is displayed",
					},
					{
						"description": "Enter valid credentials",
						"expected": "User is logged in successfully",
					},
				},
			},
		}
		
		testDataJSON, err := json.Marshal(testData)
		require.NoError(t, err)
		
		zephyrAttachment := createZephyrAttachment(
			"test_data.json",
			"application/json",
			string(testDataJSON),
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"issueKey": "ZEPH-456",
				"testCaseKey": "ZEPH-TEST-789",
				"testDataType": "json",
				"version": "1.0",
			},
		)
		
		// Upload the attachment
		attachmentID := uploadZephyrAttachment(t, server, testCase.ID, zephyrAttachment)
		
		// Convert to qTest format
		qTestAttachmentID := convertAttachmentToQTest(t, server, testCase.ID, attachmentID)
		
		// Verify the converted attachment
		qTestAttachment, err := attachmentStorage.GetAttachment(testCase.ID, qTestAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, qTestAttachment)
		
		// Verify JSON conversion
		verifyQTestJSONAttachment(t, qTestAttachment, "ZEPH-TEST-789", "test_data.json")
	})

	t.Run("ZephyrImageAttachmentToQTest", func(t *testing.T) {
		// Create a simple image data (PNG header)
		imageData := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52}
		
		zephyrAttachment := createZephyrAttachment(
			"screenshot.png",
			"image/png",
			base64.StdEncoding.EncodeToString(imageData),
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"issueKey": "ZEPH-789",
				"testCaseKey": "ZEPH-TEST-1011",
				"imageType": "screenshot",
				"step": "2",
			},
		)
		
		// Upload the attachment
		attachmentID := uploadZephyrAttachment(t, server, testCase.ID, zephyrAttachment)
		
		// Convert to qTest format with image export option
		options := map[string]interface{}{
			"sourceProvider": "zephyr",
			"targetProvider": "qtest",
			"exportImages": true,
			"format": "JSON",
		}
		
		qTestAttachmentID := convertAttachmentWithOptions(t, server, testCase.ID, attachmentID, options)
		
		// Verify the converted attachment
		qTestAttachment, err := attachmentStorage.GetAttachment(testCase.ID, qTestAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, qTestAttachment)
		
		// Verify image preservation in conversion
		assert.Equal(t, "image/png", qTestAttachment.ContentType)
		
		// Verify qTest structure
		var qTestData map[string]interface{}
		err = json.Unmarshal([]byte(qTestAttachment.Data), &qTestData)
		if err == nil {
			// If it's still JSON with embedded image
			_, hasTestCase := qTestData["test-case"]
			assert.True(t, hasTestCase)
		} else {
			// If it's the binary image data
			decodedData, err := base64.StdEncoding.DecodeString(qTestAttachment.Data)
			require.NoError(t, err)
			
			// Check PNG header is preserved
			assert.Equal(t, imageData[:8], decodedData[:8])
		}
	})

	t.Run("ZephyrMultipleAttachmentsToQTest", func(t *testing.T) {
		// Create multiple Zephyr attachments
		var attachmentIDs []string
		
		// Create 3 different attachment types
		textAttachment := createZephyrAttachment(
			"notes.txt",
			"text/plain",
			"Test notes for multiple attachment conversion",
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"testCaseKey": "ZEPH-TEST-MULTI-1",
			},
		)
		
		jsonAttachment := createZephyrAttachment(
			"config.json",
			"application/json",
			`{"environment": "staging", "browser": "chrome", "version": "latest"}`,
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"testCaseKey": "ZEPH-TEST-MULTI-1",
			},
		)
		
		csvAttachment := createZephyrAttachment(
			"test_data.csv",
			"text/csv",
			"username,password,role\njohn,pass123,admin\nann,pass456,user",
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"testCaseKey": "ZEPH-TEST-MULTI-1",
			},
		)
		
		// Upload attachments
		textID := uploadZephyrAttachment(t, server, testCase.ID, textAttachment)
		jsonID := uploadZephyrAttachment(t, server, testCase.ID, jsonAttachment)
		csvID := uploadZephyrAttachment(t, server, testCase.ID, csvAttachment)
		
		attachmentIDs = []string{textID, jsonID, csvID}
		
		// Convert all in batch to qTest
		batchRequest := map[string]interface{}{
			"attachmentIds": attachmentIDs,
			"processingOptions": map[string]interface{}{
				"sourceProvider": "zephyr",
				"targetProvider": "qtest",
				"exportImages": true,
				"format": "JSON",
				"preserveFormatting": true,
			},
			"batchOptions": map[string]interface{}{
				"maxConcurrentJobs": 3,
				"collectDetailedStats": true,
			},
		}
		
		// Send batch conversion request
		batchJSON, err := json.Marshal(batchRequest)
		require.NoError(t, err)
		
		req, err := http.NewRequest("POST", 
			fmt.Sprintf("%s/testcases/%s/attachments/batch/convert", server.URL, testCase.ID), 
			bytes.NewBuffer(batchJSON))
		require.NoError(t, err)
		
		req.Header.Set("Content-Type", "application/json")
		
		client := &http.Client{}
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		
		// Check response status
		require.Equal(t, http.StatusOK, resp.StatusCode)
		
		// Parse batch response
		var batchResponse map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&batchResponse)
		require.NoError(t, err)
		
		// Verify batch conversion success
		assert.Equal(t, "completed", batchResponse["status"])
		assert.Equal(t, float64(3), batchResponse["processed"])
		assert.Equal(t, float64(0), batchResponse["failed"])
		
		// Get converted attachment IDs
		processedAttachments, ok := batchResponse["processedAttachments"].([]interface{})
		require.True(t, ok)
		assert.Equal(t, 3, len(processedAttachments))
		
		// Verify each converted attachment
		for _, idObj := range processedAttachments {
			id, ok := idObj.(string)
			require.True(t, ok)
			
			attachment, err := attachmentStorage.GetAttachment(testCase.ID, id)
			require.NoError(t, err)
			require.NotNil(t, attachment)
			
			// All should have qTest format properties
			var attachmentData map[string]interface{}
			err = json.Unmarshal([]byte(attachment.Data), &attachmentData)
			require.NoError(t, err)
			
			assert.Contains(t, attachmentData, "convertedFrom")
			assert.Equal(t, "Zephyr", attachmentData["convertedFrom"])
			assert.Contains(t, attachmentData, "test-case")
		}
	})

	t.Run("QTestAttachmentToZephyr", func(t *testing.T) {
		// Create a qTest format attachment
		qTestAttachmentData := map[string]interface{}{
			"links": []map[string]string{
				{
					"rel": "self",
					"href": "https://qtest.example.com/api/v3/projects/1/attachments/123",
				},
			},
			"test-case": map[string]interface{}{
				"id": "TC-123",
				"name": "Login Test Case",
			},
			"content": "This is a qTest attachment that should be converted to Zephyr format",
			"convertedAt": time.Now().Format(time.RFC3339),
			"metadata": map[string]interface{}{
				"projectId": 1,
				"testRunId": 456,
			},
		}
		
		qTestAttachmentJSON, err := json.Marshal(qTestAttachmentData)
		require.NoError(t, err)
		
		// Upload qTest attachment
		qTestAttachmentID := uploadAttachment(t, server, testCase.ID, string(qTestAttachmentJSON), "qtest_attachment.json", "application/json")
		
		// Convert to Zephyr format
		options := map[string]interface{}{
			"sourceProvider": "qtest",
			"targetProvider": "zephyr",
			"format": "JSON",
		}
		
		zephyrAttachmentID := convertAttachmentWithOptions(t, server, testCase.ID, qTestAttachmentID, options)
		
		// Verify the converted attachment
		zephyrAttachment, err := attachmentStorage.GetAttachment(testCase.ID, zephyrAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, zephyrAttachment)
		
		// Verify Zephyr format
		var zephyrData map[string]interface{}
		err = json.Unmarshal([]byte(zephyrAttachment.Data), &zephyrData)
		require.NoError(t, err)
		
		// Check Zephyr structure
		assert.Contains(t, zephyrData, "attachmentInfo")
		attachmentInfo, ok := zephyrData["attachmentInfo"].(map[string]interface{})
		require.True(t, ok)
		
		assert.Equal(t, "qtest", attachmentInfo["origin"])
		
		// Check metadata mapping
		metadata, ok := attachmentInfo["metadata"].(map[string]interface{})
		require.True(t, ok)
		assert.Contains(t, metadata, "testCaseKey")
		assert.Equal(t, "TC-123", metadata["testCaseKey"])
	})
	
	t.Run("PreserveOriginalAttachmentFormatting", func(t *testing.T) {
		// Create a Zephyr attachment with specific formatting
		xmlContent := `
		<testCase>
			<id>TEST-123</id>
			<name>Formatted Test Case</name>
			<steps>
				<step>
					<description>Step 1</description>
					<expected>Result 1</expected>
				</step>
				<step>
					<description>Step 2</description>
					<expected>Result 2</expected>
				</step>
			</steps>
		</testCase>
		`
		
		formattedXML := formatXML(xmlContent)
		
		zephyrAttachment := createZephyrAttachment(
			"test_case.xml",
			"application/xml",
			formattedXML,
			map[string]interface{}{
				"projectKey": "ZEPHYR",
				"testCaseKey": "ZEPH-TEST-XML",
			},
		)
		
		// Upload the attachment
		attachmentID := uploadZephyrAttachment(t, server, testCase.ID, zephyrAttachment)
		
		// Convert to qTest with preserve formatting option
		options := map[string]interface{}{
			"sourceProvider": "zephyr",
			"targetProvider": "qtest",
			"format": "XML",
			"preserveFormatting": true,
		}
		
		qTestAttachmentID := convertAttachmentWithOptions(t, server, testCase.ID, attachmentID, options)
		
		// Verify the converted attachment
		qTestAttachment, err := attachmentStorage.GetAttachment(testCase.ID, qTestAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, qTestAttachment)
		
		// Check content type is still XML
		assert.Equal(t, "application/xml", qTestAttachment.ContentType)
		
		// Decode the content
		decodedXML, err := base64.StdEncoding.DecodeString(qTestAttachment.Data)
		require.NoError(t, err)
		
		// The original XML structure with indentation should be preserved
		// We can't do an exact match because of the qTest wrapper, but we can
		// check that the indentation pattern is preserved
		xmlString := string(decodedXML)
		assert.Contains(t, xmlString, "<testCase>")
		assert.Contains(t, xmlString, "		<step>")
	})
}

// Helper functions

// createZephyrAttachment creates a Zephyr format attachment
func createZephyrAttachment(fileName string, contentType string, content string, metadata map[string]interface{}) string {
	// Create Zephyr attachment format
	zephyrData := map[string]interface{}{
		"attachmentInfo": map[string]interface{}{
			"origin": "zephyr",
			"metadata": metadata,
		},
		"content": content,
	}
	
	// Convert to JSON
	zephyrJSON, _ := json.MarshalIndent(zephyrData, "", "  ")
	return string(zephyrJSON)
}

// uploadZephyrAttachment uploads a Zephyr format attachment
func uploadZephyrAttachment(t *testing.T, server *httptest.Server, testCaseID string, zephyrAttachment string) string {
	return uploadAttachment(t, server, testCaseID, zephyrAttachment, "zephyr_attachment.json", "application/json")
}

// uploadAttachment uploads an attachment to the server
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

// convertAttachmentToQTest converts an attachment to qTest format
func convertAttachmentToQTest(t *testing.T, server *httptest.Server, testCaseID, attachmentID string) string {
	// Default options
	options := map[string]interface{}{
		"sourceProvider": "zephyr",
		"targetProvider": "qtest",
		"format": "JSON",
		"exportImages": true,
	}
	
	return convertAttachmentWithOptions(t, server, testCaseID, attachmentID, options)
}

// convertAttachmentWithOptions converts an attachment with specific options
func convertAttachmentWithOptions(t *testing.T, server *httptest.Server, testCaseID, attachmentID string, options map[string]interface{}) string {
	// Create the options body
	optionsJSON, err := json.Marshal(options)
	require.NoError(t, err)
	
	// Create the request
	req, err := http.NewRequest("POST", 
		fmt.Sprintf("%s/testcases/%s/attachments/%s/process", server.URL, testCaseID, attachmentID), 
		bytes.NewBuffer(optionsJSON))
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
	var processedAttachment storage.Attachment
	err = json.NewDecoder(resp.Body).Decode(&processedAttachment)
	require.NoError(t, err)
	
	return processedAttachment.ID
}

// verifyQTestAttachment verifies a qTest attachment
func verifyQTestAttachment(t *testing.T, attachment *storage.Attachment, expectedTestCaseID, expectedFileName string) {
	// Verify the content type
	assert.Contains(t, attachment.FileName, expectedFileName)
	
	// Decode data and parse JSON
	var qTestData map[string]interface{}
	err := json.Unmarshal([]byte(attachment.Data), &qTestData)
	require.NoError(t, err)
	
	// Verify qTest format structure
	assert.Contains(t, qTestData, "links")
	assert.Contains(t, qTestData, "test-case")
	assert.Contains(t, qTestData, "content")
	assert.Contains(t, qTestData, "convertedAt")
	assert.Contains(t, qTestData, "convertedFrom")
	assert.Contains(t, qTestData, "originalMetadata")
	
	// Verify specific field values
	assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
	
	testCase, ok := qTestData["test-case"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, expectedTestCaseID, testCase["id"])
	assert.Contains(t, testCase["name"], expectedTestCaseID)
}

// verifyQTestJSONAttachment verifies a qTest JSON attachment
func verifyQTestJSONAttachment(t *testing.T, attachment *storage.Attachment, expectedTestCaseID, expectedFileName string) {
	// Basic verification
	verifyQTestAttachment(t, attachment, expectedTestCaseID, expectedFileName)
	
	// Additional verification for JSON content
	var qTestData map[string]interface{}
	err := json.Unmarshal([]byte(attachment.Data), &qTestData)
	require.NoError(t, err)
	
	// Verify content field contains valid JSON
	content, hasContent := qTestData["content"].(string)
	if hasContent {
		var contentData interface{}
		err = json.Unmarshal([]byte(content), &contentData)
		assert.NoError(t, err, "Content should be a valid JSON string")
	}
}

// formatXML formats an XML string with proper indentation
func formatXML(xmlStr string) string {
	// This is a simplified formatting for testing purposes
	// In a real implementation, you would use proper XML formatting libraries
	return xmlStr
}