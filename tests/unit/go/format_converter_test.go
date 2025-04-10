package binary_processor_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/internal/go/common/logger"
)

// TestFormatConverter tests the provider format converter
func TestFormatConverter(t *testing.T) {
	// Create logger and format converter
	log := logger.CreateLogger("TestFormatConverter", logger.DEBUG)
	converter := processors.NewFormatConverter(log)

	// Test Zephyr to qTest conversion
	t.Run("ZephyrToQTestConversion", func(t *testing.T) {
		// Create Zephyr test cases
		zephyrTestCases := []map[string]interface{}{
			{
				// Zephyr attachment format
				"attachmentInfo": map[string]interface{}{
					"origin": "zephyr",
					"metadata": map[string]interface{}{
						"projectKey": "ZEPH",
						"issueKey": "ZEPH-123",
						"testCaseKey": "ZEPH-TEST-456",
					},
				},
				"content": "This is attachment content from Zephyr",
			},
			{
				// Zephyr execution format
				"executions": []map[string]interface{}{
					{
						"id": "EXEC-1",
						"testCaseKey": "ZEPH-TEST-123",
						"status": "PASS",
						"startDate": "2023-01-01T10:00:00Z",
						"endDate": "2023-01-01T10:30:00Z",
					},
					{
						"id": "EXEC-2",
						"testCaseKey": "ZEPH-TEST-456",
						"status": "FAIL",
						"startDate": "2023-01-02T10:00:00Z",
						"endDate": "2023-01-02T10:45:00Z",
					},
				},
			},
			{
				// Zephyr test case format
				"testCases": []map[string]interface{}{
					{
						"key": "ZEPH-TEST-123",
						"name": "Login Test",
						"description": "Test user login functionality",
						"priority": "High",
						"steps": []map[string]interface{}{
							{
								"description": "Open login page",
								"expectedResult": "Login page is displayed",
							},
							{
								"description": "Enter valid credentials",
								"expectedResult": "User is logged in successfully",
							},
						},
					},
				},
			},
		}

		// Test conversion for each format
		for i, zephyrData := range zephyrTestCases {
			// Convert to JSON
			zephyrJSON, err := json.Marshal(zephyrData)
			require.NoError(t, err)

			// Convert to qTest format
			result, err := converter.ConvertFormat(zephyrJSON, processors.ZephyrProvider, processors.QTestProvider)
			require.NoError(t, err, "Error converting Zephyr format %d", i)
			require.NotNil(t, result)

			// Verify conversion result
			assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
			assert.Equal(t, processors.QTestProvider, result.TargetProvider)

			// Parse the converted data
			var qTestData map[string]interface{}
			err = json.Unmarshal(result.ConvertedData, &qTestData)
			require.NoError(t, err)

			// Check for qTest format indicators based on source format
			if i == 0 {
				// Attachment format should include test-case
				assert.Contains(t, qTestData, "test-case")
				assert.Contains(t, qTestData, "convertedFrom")
				assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
			} else if i == 1 {
				// Execution format should include test-runs
				assert.Contains(t, qTestData, "test-runs")
				assert.Contains(t, qTestData, "total")
				testRuns, ok := qTestData["test-runs"].([]interface{})
				require.True(t, ok)
				assert.Equal(t, 2, len(testRuns))
			} else if i == 2 {
				// Test case format should include test-cases
				assert.Contains(t, qTestData, "test-cases")
				testCases, ok := qTestData["test-cases"].([]interface{})
				require.True(t, ok)
				assert.Equal(t, 1, len(testCases))
			}
		}
	})

	// Test qTest to Zephyr conversion
	t.Run("QTestToZephyrConversion", func(t *testing.T) {
		// Create qTest format
		qTestData := map[string]interface{}{
			"links": []map[string]string{
				{
					"rel": "self",
					"href": "https://qtest.example.com/api/v3/projects/QTEST/attachments",
				},
			},
			"test-case": map[string]interface{}{
				"id": "QTEST-123",
				"name": "Test Case in qTest",
			},
			"requirement": map[string]interface{}{
				"id": "REQ-456",
				"name": "Requirement in qTest",
			},
			"content": "This is content from qTest",
		}

		// Convert to JSON
		qTestJSON, err := json.Marshal(qTestData)
		require.NoError(t, err)

		// Convert to Zephyr format
		result, err := converter.ConvertFormat(qTestJSON, processors.QTestProvider, processors.ZephyrProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.QTestProvider, result.SourceProvider)
		assert.Equal(t, processors.ZephyrProvider, result.TargetProvider)
		assert.True(t, result.IsFullConversion)

		// Parse the converted data
		var zephyrData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &zephyrData)
		require.NoError(t, err)

		// Check Zephyr format structure
		assert.Contains(t, zephyrData, "attachmentInfo")
		assert.Contains(t, zephyrData, "convertedAt")
		assert.Contains(t, zephyrData, "convertedFrom")
		assert.Equal(t, "qTest", zephyrData["convertedFrom"])

		// Check metadata mapping
		attachmentInfo, ok := zephyrData["attachmentInfo"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "qtest", attachmentInfo["origin"])

		metadata, ok := attachmentInfo["metadata"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "QTEST-123", metadata["testCaseKey"])
		assert.Equal(t, "REQ-456", metadata["issueKey"])
	})

	// Test Azure DevOps to qTest conversion
	t.Run("AzureDevOpsToQTestConversion", func(t *testing.T) {
		// Create Azure DevOps format
		azureDevOpsData := map[string]interface{}{
			"workItems": []map[string]interface{}{
				{
					"id": 1234,
					"type": "Test Case",
					"fields": map[string]interface{}{
						"System.Title": "Login Test",
						"System.Description": "Test the login functionality",
						"Microsoft.VSTS.TCM.Steps": "<steps><step><parameterizedString>Open browser</parameterizedString></step></steps>",
					},
				},
			},
		}

		// Convert to JSON
		azureJSON, err := json.Marshal(azureDevOpsData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(azureJSON, processors.AzureDevOpsProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.AzureDevOpsProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		// This is expected to be a partial conversion
		assert.False(t, result.IsFullConversion)
		assert.NotEmpty(t, result.WarningMessages)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Check basic structure
		assert.Contains(t, qTestData, "links")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")
		assert.Equal(t, "AzureDevOps", qTestData["convertedFrom"])
	})

	// Test Rally to qTest conversion
	t.Run("RallyToQTestConversion", func(t *testing.T) {
		// Create Rally format
		rallyData := map[string]interface{}{
			"QueryResult": map[string]interface{}{
				"Results": []map[string]interface{}{
					{
						"ObjectID": 12345,
						"Name": "Login Test",
						"Description": "Test the login functionality",
					},
				},
				"TotalResultCount": 1,
			},
		}

		// Convert to JSON
		rallyJSON, err := json.Marshal(rallyData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(rallyJSON, processors.RallyProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.RallyProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		// This is expected to be a partial conversion
		assert.False(t, result.IsFullConversion)
		assert.NotEmpty(t, result.WarningMessages)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Check basic structure
		assert.Contains(t, qTestData, "links")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")
		assert.Equal(t, "Rally", qTestData["convertedFrom"])
	})

	// Test binary data conversion
	t.Run("BinaryDataConversion", func(t *testing.T) {
		// Create binary data (not valid JSON)
		binaryData := []byte{0x01, 0x02, 0x03, 0x04, 0xFF}

		// Try to convert
		result, err := converter.ConvertFormat(binaryData, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.False(t, result.IsFullConversion)
		assert.NotEmpty(t, result.WarningMessages)
		assert.Equal(t, "binary", result.SourceFormat)
		assert.Equal(t, "binary-wrapped", result.TargetFormat)

		// Parse the converted data (should be a wrapper JSON)
		var wrappedData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &wrappedData)
		require.NoError(t, err)

		// Check wrapped format structure
		assert.Contains(t, wrappedData, "convertedAt")
		assert.Contains(t, wrappedData, "convertedFrom")
		assert.Contains(t, wrappedData, "targetProvider")
		assert.Contains(t, wrappedData, "dataFormat")
		assert.Equal(t, "binary", wrappedData["dataFormat"])
	})

	// Test format detection
	t.Run("FormatDetection", func(t *testing.T) {
		// Test various formats to ensure they're correctly identified

		// 1. Zephyr attachment format
		zephyrAttachment := map[string]interface{}{
			"attachmentInfo": map[string]interface{}{
				"origin": "zephyr",
				"metadata": map[string]interface{}{},
			},
			"content": "test",
		}
		zephyrAttachmentJSON, _ := json.Marshal(zephyrAttachment)
		result1, err := converter.ConvertFormat(zephyrAttachmentJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		assert.Equal(t, "zephyr-attachment", result1.SourceFormat)

		// 2. Zephyr execution format
		zephyrExecution := map[string]interface{}{
			"executions": []interface{}{
				map[string]interface{}{
					"id": "1",
					"testCaseKey": "TEST-1",
				},
			},
		}
		zephyrExecutionJSON, _ := json.Marshal(zephyrExecution)
		result2, err := converter.ConvertFormat(zephyrExecutionJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		assert.Equal(t, "zephyr-execution", result2.SourceFormat)

		// 3. Zephyr test case format
		zephyrTestCase := map[string]interface{}{
			"testCases": []interface{}{
				map[string]interface{}{
					"key": "TEST-1",
					"name": "Test",
				},
			},
		}
		zephyrTestCaseJSON, _ := json.Marshal(zephyrTestCase)
		result3, err := converter.ConvertFormat(zephyrTestCaseJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		assert.Equal(t, "zephyr-testcase", result3.SourceFormat)

		// 4. qTest cycle format
		qTestCycle := map[string]interface{}{
			"links": []interface{}{
				map[string]interface{}{
					"rel": "self",
					"href": "https://example.com",
				},
			},
			"test-cycle": map[string]interface{}{
				"id": 1,
				"name": "Cycle",
			},
		}
		qTestCycleJSON, _ := json.Marshal(qTestCycle)
		result4, err := converter.ConvertFormat(qTestCycleJSON, processors.QTestProvider, processors.ZephyrProvider)
		require.NoError(t, err)
		assert.Equal(t, "qtest-cycle", result4.SourceFormat)

		// 5. Azure DevOps work items format
		azureWorkItems := map[string]interface{}{
			"workItems": []interface{}{
				map[string]interface{}{
					"id": 1,
					"type": "Task",
				},
			},
		}
		azureWorkItemsJSON, _ := json.Marshal(azureWorkItems)
		result5, err := converter.ConvertFormat(azureWorkItemsJSON, processors.AzureDevOpsProvider, processors.QTestProvider)
		require.NoError(t, err)
		assert.Equal(t, "azure-workitem", result5.SourceFormat)

		// 6. Rally query format
		rallyQuery := map[string]interface{}{
			"QueryResult": map[string]interface{}{
				"Results": []interface{}{},
				"TotalResultCount": 0,
			},
		}
		rallyQueryJSON, _ := json.Marshal(rallyQuery)
		result6, err := converter.ConvertFormat(rallyQueryJSON, processors.RallyProvider, processors.QTestProvider)
		require.NoError(t, err)
		assert.Equal(t, "rally-query", result6.SourceFormat)
	})

	// Test error handling
	t.Run("ErrorHandling", func(t *testing.T) {
		// Test with unsupported provider
		invalidProvider := processors.ProviderType("invalid-provider")
		_, err := converter.ConvertFormat([]byte(`{}`), invalidProvider, processors.QTestProvider)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "source provider invalid-provider is not supported")

		// Test with invalid JSON
		_, err = converter.ConvertFormat([]byte(`{invalid json`), processors.ZephyrProvider, processors.QTestProvider)
		assert.NoError(t, err) // It should handle invalid JSON gracefully by wrapping as binary
	})

	// Test status mapping
	t.Run("StatusMapping", func(t *testing.T) {
		// Create Zephyr execution data with different statuses
		zephyrStatuses := []string{"PASS", "FAIL", "WIP", "BLOCKED", "UNKNOWN"}
		qTestExpectedStatuses := []string{"PASSED", "FAILED", "IN_PROGRESS", "BLOCKED", "NOT_RUN"}

		// Check each status mapping
		for i, zephyrStatus := range zephyrStatuses {
			zephyrExecution := map[string]interface{}{
				"executions": []interface{}{
					map[string]interface{}{
						"id": "EXEC-1",
						"testCaseKey": "ZEPH-TEST-123",
						"status": zephyrStatus,
						"startDate": time.Now().Format(time.RFC3339),
						"endDate": time.Now().Format(time.RFC3339),
					},
				},
			}

			// Convert to JSON
			zephyrJSON, _ := json.Marshal(zephyrExecution)

			// Convert to qTest format
			result, err := converter.ConvertFormat(zephyrJSON, processors.ZephyrProvider, processors.QTestProvider)
			require.NoError(t, err)

			// Parse the converted data
			var qTestData map[string]interface{}
			json.Unmarshal(result.ConvertedData, &qTestData)

			// Check status mapping
			testRuns, ok := qTestData["test-runs"].([]interface{})
			require.True(t, ok)
			require.Equal(t, 1, len(testRuns))

			testRun, ok := testRuns[0].(map[string]interface{})
			require.True(t, ok)

			// Verify the status mapping
			assert.Equal(t, qTestExpectedStatuses[i], testRun["status"])
		}
	})
}