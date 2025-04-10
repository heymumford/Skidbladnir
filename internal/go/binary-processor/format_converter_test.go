package binary_processor_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/skidbladnir/binary-processor/processors"
	"github.com/skidbladnir/internal/go/common/logger"
)

// TestZephyrToQTestConversion tests conversion from Zephyr to qTest format
func TestZephyrToQTestConversion(t *testing.T) {
	// Create a logger and format converter
	log := logger.CreateLogger("TestFormatConverter", logger.DEBUG)
	converter := processors.NewFormatConverter(log)

	t.Run("ConvertZephyrAttachmentToQTest", func(t *testing.T) {
		// Create a sample Zephyr attachment format
		zephyrData := map[string]interface{}{
			"attachmentInfo": map[string]interface{}{
				"origin": "zephyr",
				"metadata": map[string]interface{}{
					"projectKey": "ZEPH",
					"issueKey": "ZEPH-123",
					"testCaseKey": "ZEPH-TEST-456",
				},
			},
			"content": "This is attachment content from Zephyr",
		}

		// Convert to JSON
		zephyrJSON, err := json.Marshal(zephyrData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(zephyrJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.True(t, result.IsFullConversion)
		assert.Equal(t, "zephyr-attachment", result.SourceFormat)
		assert.Equal(t, "qtest-attachment", result.TargetFormat)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
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
		assert.Equal(t, "ZEPH-TEST-456", testCase["id"])
	})

	t.Run("ConvertZephyrExecutionToQTest", func(t *testing.T) {
		// Create a sample Zephyr execution format
		zephyrData := map[string]interface{}{
			"executions": []interface{}{
				map[string]interface{}{
					"id": "EXEC-1",
					"testCaseKey": "ZEPH-TEST-123",
					"status": "PASS",
					"startDate": "2023-01-01T10:00:00Z",
					"endDate": "2023-01-01T10:30:00Z",
				},
				map[string]interface{}{
					"id": "EXEC-2",
					"testCaseKey": "ZEPH-TEST-456",
					"status": "FAIL",
					"startDate": "2023-01-02T10:00:00Z",
					"endDate": "2023-01-02T10:45:00Z",
				},
			},
		}

		// Convert to JSON
		zephyrJSON, err := json.Marshal(zephyrData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(zephyrJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.True(t, result.IsFullConversion)
		assert.Equal(t, "zephyr-execution", result.SourceFormat)
		assert.Equal(t, "qtest-runs", result.TargetFormat)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Verify qTest format structure
		assert.Contains(t, qTestData, "test-runs")
		assert.Contains(t, qTestData, "total")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")

		// Verify specific field values
		assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
		assert.Equal(t, float64(2), qTestData["total"])
		
		testRuns, ok := qTestData["test-runs"].([]interface{})
		require.True(t, ok)
		assert.Equal(t, 2, len(testRuns))
		
		// Verify first test run
		testRun1, ok := testRuns[0].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "EXEC-1", testRun1["id"])
		assert.Equal(t, "PASSED", testRun1["status"])
		
		// Verify test case reference in first run
		testCase1, ok := testRun1["test-case"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "ZEPH-TEST-123", testCase1["id"])
	})

	t.Run("ConvertZephyrTestCaseToQTest", func(t *testing.T) {
		// Create a sample Zephyr test case format
		zephyrData := map[string]interface{}{
			"testCases": []interface{}{
				map[string]interface{}{
					"key": "ZEPH-TEST-123",
					"name": "Login Test",
					"description": "Test user login functionality",
					"priority": "High",
					"steps": []interface{}{
						map[string]interface{}{
							"description": "Open login page",
							"expectedResult": "Login page is displayed",
						},
						map[string]interface{}{
							"description": "Enter valid credentials",
							"expectedResult": "User is logged in successfully",
						},
					},
				},
			},
		}

		// Convert to JSON
		zephyrJSON, err := json.Marshal(zephyrData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(zephyrJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.True(t, result.IsFullConversion)
		assert.Equal(t, "zephyr-testcase", result.SourceFormat)
		assert.Equal(t, "qtest-cases", result.TargetFormat)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Verify qTest format structure
		assert.Contains(t, qTestData, "test-cases")
		assert.Contains(t, qTestData, "total")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")

		// Verify specific field values
		assert.Equal(t, "Zephyr", qTestData["convertedFrom"])
		assert.Equal(t, float64(1), qTestData["total"])
		
		testCases, ok := qTestData["test-cases"].([]interface{})
		require.True(t, ok)
		assert.Equal(t, 1, len(testCases))
		
		// Verify test case
		testCase1, ok := testCases[0].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "ZEPH-TEST-123", testCase1["id"])
		assert.Equal(t, "Login Test", testCase1["name"])
		assert.Equal(t, "Test user login functionality", testCase1["description"])
		
		// Verify steps
		steps, ok := testCase1["steps"].([]interface{})
		require.True(t, ok)
		assert.Equal(t, 2, len(steps))
		
		// Verify properties
		properties, ok := testCase1["properties"].([]interface{})
		require.True(t, ok)
		assert.Equal(t, 1, len(properties))
		
		property1, ok := properties[0].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "priority", property1["field_id"])
		assert.Equal(t, "High", property1["field_value"])
	})
}

// TestQTestToZephyrConversion tests conversion from qTest to Zephyr format
func TestQTestToZephyrConversion(t *testing.T) {
	// Create a logger and format converter
	log := logger.CreateLogger("TestFormatConverter", logger.DEBUG)
	converter := processors.NewFormatConverter(log)

	t.Run("ConvertQTestToZephyr", func(t *testing.T) {
		// Create a sample qTest format
		qTestData := map[string]interface{}{
			"links": []interface{}{
				map[string]interface{}{
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
		assert.Equal(t, "zephyr-attachment", result.TargetFormat)

		// Parse the converted data
		var zephyrData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &zephyrData)
		require.NoError(t, err)

		// Verify Zephyr format structure
		assert.Contains(t, zephyrData, "attachmentInfo")
		assert.Contains(t, zephyrData, "content")
		assert.Contains(t, zephyrData, "convertedAt")
		assert.Contains(t, zephyrData, "convertedFrom")

		// Verify specific field values
		assert.Equal(t, "qTest", zephyrData["convertedFrom"])
		assert.Equal(t, "This is content from qTest", zephyrData["content"])
		
		// Verify metadata
		attachmentInfo, ok := zephyrData["attachmentInfo"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "qtest", attachmentInfo["origin"])
		
		metadata, ok := attachmentInfo["metadata"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "QTEST-123", metadata["testCaseKey"])
		assert.Equal(t, "Test Case in qTest", metadata["testCaseName"])
		assert.Equal(t, "REQ-456", metadata["issueKey"])
		assert.Equal(t, "Requirement in qTest", metadata["issueName"])
	})
}

// TestOtherProviderConversions tests conversion from other providers to qTest format
func TestOtherProviderConversions(t *testing.T) {
	// Create a logger and format converter
	log := logger.CreateLogger("TestFormatConverter", logger.DEBUG)
	converter := processors.NewFormatConverter(log)

	t.Run("ConvertAzureDevOpsToQTest", func(t *testing.T) {
		// Create a sample Azure DevOps format
		azureData := map[string]interface{}{
			"workItems": []interface{}{
				map[string]interface{}{
					"id": "1234",
					"type": "Test Case",
					"fields": map[string]interface{}{
						"System.Title": "Azure DevOps Test Case",
						"System.Description": "Test case from Azure DevOps",
					},
				},
			},
		}

		// Convert to JSON
		azureJSON, err := json.Marshal(azureData)
		require.NoError(t, err)

		// Convert to qTest format
		result, err := converter.ConvertFormat(azureJSON, processors.AzureDevOpsProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.AzureDevOpsProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.False(t, result.IsFullConversion)
		assert.Equal(t, "qtest-partial", result.TargetFormat)
		assert.NotEmpty(t, result.WarningMessages)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Verify qTest format structure
		assert.Contains(t, qTestData, "links")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")
		assert.Contains(t, qTestData, "originalData")
		assert.Contains(t, qTestData, "conversionNote")

		// Verify specific field values
		assert.Equal(t, "AzureDevOps", qTestData["convertedFrom"])
	})

	t.Run("ConvertRallyToQTest", func(t *testing.T) {
		// Create a sample Rally format
		rallyData := map[string]interface{}{
			"QueryResult": map[string]interface{}{
				"Results": []interface{}{
					map[string]interface{}{
						"ObjectID": "12345",
						"Name": "Rally Test Case",
						"Description": "Test case from Rally",
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
		assert.False(t, result.IsFullConversion)
		assert.Equal(t, "qtest-partial", result.TargetFormat)
		assert.NotEmpty(t, result.WarningMessages)

		// Parse the converted data
		var qTestData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &qTestData)
		require.NoError(t, err)

		// Verify qTest format structure
		assert.Contains(t, qTestData, "links")
		assert.Contains(t, qTestData, "convertedAt")
		assert.Contains(t, qTestData, "convertedFrom")
		assert.Contains(t, qTestData, "originalData")
		assert.Contains(t, qTestData, "conversionNote")

		// Verify specific field values
		assert.Equal(t, "Rally", qTestData["convertedFrom"])
	})

	t.Run("GenericConversion", func(t *testing.T) {
		// Create a sample unknown format
		unknownData := map[string]interface{}{
			"custom": "data",
			"format": "unknown",
		}

		// Convert to JSON
		unknownJSON, err := json.Marshal(unknownData)
		require.NoError(t, err)

		// Convert between providers
		result, err := converter.ConvertFormat(unknownJSON, processors.ZephyrProvider, processors.QTestProvider)
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify conversion result
		assert.Equal(t, processors.ZephyrProvider, result.SourceProvider)
		assert.Equal(t, processors.QTestProvider, result.TargetProvider)
		assert.False(t, result.IsFullConversion)
		assert.NotEmpty(t, result.WarningMessages)

		// Parse the converted data
		var wrappedData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &wrappedData)
		require.NoError(t, err)

		// Verify wrapped format structure
		assert.Contains(t, wrappedData, "convertedAt")
		assert.Contains(t, wrappedData, "convertedFrom")
		assert.Contains(t, wrappedData, "targetProvider")
		assert.Contains(t, wrappedData, "conversionNote")
		assert.Contains(t, wrappedData, "originalData")

		// Verify specific field values
		assert.Equal(t, "zephyr", wrappedData["convertedFrom"])
		assert.Equal(t, "qtest", wrappedData["targetProvider"])
		
		originalData, ok := wrappedData["originalData"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "data", originalData["custom"])
		assert.Equal(t, "unknown", originalData["format"])
	})

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
		assert.Equal(t, "binary-wrapped", result.TargetFormat)

		// Parse the converted data (should be a wrapper JSON)
		var wrappedData map[string]interface{}
		err = json.Unmarshal(result.ConvertedData, &wrappedData)
		require.NoError(t, err)

		// Verify wrapped format structure
		assert.Contains(t, wrappedData, "convertedAt")
		assert.Contains(t, wrappedData, "convertedFrom")
		assert.Contains(t, wrappedData, "targetProvider")
		assert.Contains(t, wrappedData, "conversionNote")
		assert.Contains(t, wrappedData, "dataFormat")

		// Verify specific field values
		assert.Equal(t, "zephyr", wrappedData["convertedFrom"])
		assert.Equal(t, "qtest", wrappedData["targetProvider"])
		assert.Equal(t, "binary", wrappedData["dataFormat"])
	})
}