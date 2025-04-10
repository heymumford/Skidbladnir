package binary_processor_test

import (
	"bytes"
	"encoding/json"
	"fmt"
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

// TestBatchAttachmentProcessing tests batch processing of attachments
func TestBatchAttachmentProcessing(t *testing.T) {
	// Create handler and processor components
	testCaseStorage := storage.NewInMemoryTestCaseStorage()
	attachmentStorage := storage.NewInMemoryAttachmentStorage()
	
	// Configure processor
	processor := processors.NewTestCaseProcessor(
		processors.WithChunkSize(1024 * 10), // 10KB chunks for testing
		processors.WithLogger(logger.CreateLogger("TestProcessor", logger.DEBUG)),
	)
	
	// Create attachment processor
	attachmentProcessor := processors.NewAttachmentProcessor(
		processors.WithAttachmentChunkSize(1024 * 10),
		processors.WithAttachmentLogger(logger.CreateLogger("AttachmentProcessor", logger.DEBUG)),
	)
	
	// Create format converter
	formatConverter := processors.NewFormatConverter(
		logger.CreateLogger("FormatConverter", logger.DEBUG),
	)
	
	// Create attachment handlers
	attachmentHandler := handlers.NewAttachmentHandler(
		testCaseStorage, 
		attachmentStorage, 
		attachmentProcessor,
	)
	
	batchAttachmentHandler := handlers.NewBatchAttachmentHandler(
		testCaseStorage,
		attachmentStorage,
		attachmentProcessor,
		formatConverter,
	)

	// Create router and register handlers
	router := mux.NewRouter()
	attachmentHandler.RegisterRoutes(router)
	batchAttachmentHandler.RegisterRoutes(router)

	// Create a test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Create a test case to attach files to
	testCase := &handlers.TestCase{
		ID:          uuid.New().String(),
		Title:       "Test Case for Batch Attachment Testing",
		Description: "This test case is used to test batch attachment processing",
		Status:      "ACTIVE",
		Priority:    "HIGH",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save the test case
	require.NoError(t, testCaseStorage.Save(testCase))

	// Upload multiple attachments
	t.Run("UploadMultipleAttachments", func(t *testing.T) {
		// Create and upload 5 attachments
		attachmentIDs := make([]string, 0, 5)
		for i := 0; i < 5; i++ {
			content := fmt.Sprintf("Test content %d for batch processing", i)
			attachmentID := uploadAttachment(t, server, testCase.ID, content, fmt.Sprintf("batch_test_%d.txt", i), "text/plain")
			attachmentIDs = append(attachmentIDs, attachmentID)
		}
		
		// Verify we have 5 attachments
		assert.Equal(t, 5, len(attachmentIDs))
		
		// Now test batch processing
		t.Run("BatchProcessAttachments", func(t *testing.T) {
			// Create batch request
			batchRequest := map[string]interface{}{
				"attachmentIds": attachmentIDs,
				"processingOptions": map[string]interface{}{
					"format": "XML",
					"exportImages": true,
				},
				"batchOptions": map[string]interface{}{
					"maxConcurrentJobs": 3,
					"abortOnFailure": false,
					"timeoutSeconds": 30,
					"retryCount": 2,
					"collectDetailedStats": true,
				},
			}
			
			batchJSON, err := json.Marshal(batchRequest)
			require.NoError(t, err)
			
			// Send batch processing request
			req, err := http.NewRequest("POST", 
				fmt.Sprintf("%s/testcases/%s/attachments/batch", server.URL, testCase.ID), 
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
			
			// Verify batch response
			assert.Equal(t, "completed", batchResponse["status"])
			assert.Equal(t, float64(5), batchResponse["processed"])
			assert.Equal(t, float64(0), batchResponse["failed"])
			assert.Equal(t, float64(5), batchResponse["total"])
			
			// Check that processed attachments list is correct
			processedAttachments, ok := batchResponse["processedAttachments"].([]interface{})
			require.True(t, ok)
			assert.Equal(t, 5, len(processedAttachments))
			
			// Verify there are detailed stats
			detailedStats, hasStats := batchResponse["detailedStats"].(map[string]interface{})
			require.True(t, hasStats)
			
			// Verify basic stats values
			assert.Contains(t, detailedStats, "totalBytesProcessed")
			assert.Contains(t, detailedStats, "textConversions")
			assert.Greater(t, int(detailedStats["textConversions"].(float64)), 0)
		})
	})

	// Test batch format conversion
	t.Run("BatchFormatConversion", func(t *testing.T) {
		// Create Zephyr format attachments
		attachmentIDs := make([]string, 0, 3)
		
		for i := 0; i < 3; i++ {
			// Create a sample Zephyr attachment format
			zephyrData := map[string]interface{}{
				"attachmentInfo": map[string]interface{}{
					"origin": "zephyr",
					"metadata": map[string]interface{}{
						"projectKey": "ZEPH",
						"issueKey": fmt.Sprintf("ZEPH-%d", i),
						"testCaseKey": fmt.Sprintf("ZEPH-TEST-%d", i),
					},
				},
				"content": fmt.Sprintf("Zephyr content %d for batch conversion", i),
			}
			
			// Convert to JSON
			zephyrJSON, err := json.Marshal(zephyrData)
			require.NoError(t, err)
			
			// Upload as attachment
			attachmentID := uploadAttachment(t, server, testCase.ID, string(zephyrJSON), 
				fmt.Sprintf("zephyr_data_%d.json", i), "application/json")
			attachmentIDs = append(attachmentIDs, attachmentID)
		}
		
		// Create batch conversion request
		batchRequest := map[string]interface{}{
			"attachmentIds": attachmentIDs,
			"processingOptions": map[string]interface{}{
				"format": "JSON",
				"sourceProvider": "zephyr",
				"targetProvider": "qtest",
				"exportImages": true,
			},
			"batchOptions": map[string]interface{}{
				"maxConcurrentJobs": 3,
				"collectDetailedStats": true,
			},
		}
		
		batchJSON, err := json.Marshal(batchRequest)
		require.NoError(t, err)
		
		// Send batch conversion request
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
		
		// Verify batch response
		assert.Equal(t, "completed", batchResponse["status"])
		assert.Equal(t, float64(3), batchResponse["processed"])
		assert.Equal(t, float64(0), batchResponse["failed"])
		
		// Check conversion stats
		stats, hasStats := batchResponse["detailedStats"].(map[string]interface{})
		require.True(t, hasStats)
		
		// Verify Zephyr conversions
		assert.Contains(t, stats, "zephyrConversions")
		assert.Equal(t, float64(3), stats["zephyrConversions"])
		
		// Get the IDs of the processed attachments
		processedIDs, ok := batchResponse["processedAttachments"].([]interface{})
		require.True(t, ok)
		require.Equal(t, 3, len(processedIDs))
		
		// Verify that each processed attachment has been converted to qTest format
		for _, idObj := range processedIDs {
			id, ok := idObj.(string)
			require.True(t, ok)
			
			// Get the processed attachment
			attachment, err := attachmentStorage.GetAttachment(testCase.ID, id)
			require.NoError(t, err)
			require.NotNil(t, attachment)
			
			// Parse the JSON
			var qTestData map[string]interface{}
			err = json.Unmarshal([]byte(attachment.Data), &qTestData)
			require.NoError(t, err)
			
			// Verify it has qTest format
			assert.Contains(t, qTestData, "links")
			assert.Contains(t, qTestData, "test-case")
			assert.Contains(t, qTestData, "convertedFrom")
			assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
		}
	})
}

// Helper functions from the attachment_test.go file
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