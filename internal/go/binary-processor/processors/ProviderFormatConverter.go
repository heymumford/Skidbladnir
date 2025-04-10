package processors

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/skidbladnir/internal/go/common/logger"
)

// ProviderType represents the type of provider
type ProviderType string

const (
	// ZephyrProvider represents the Zephyr provider
	ZephyrProvider ProviderType = "zephyr"
	// QTestProvider represents the qTest provider
	QTestProvider ProviderType = "qtest"
	// AzureDevOpsProvider represents the Azure DevOps provider
	AzureDevOpsProvider ProviderType = "azure_devops"
	// RallyProvider represents the Rally provider
	RallyProvider ProviderType = "rally"
)

// FormatConverter handles conversion between provider-specific formats
type FormatConverter struct {
	log       *logger.Logger
	providers map[ProviderType]bool
}

// ConversionResult contains the result of a format conversion
type ConversionResult struct {
	ConvertedData    []byte
	SourceProvider   ProviderType
	TargetProvider   ProviderType
	SourceFormat     string
	TargetFormat     string
	ConversionTime   time.Duration
	WarningMessages  []string
	ModifiedFields   []string
	IsFullConversion bool
}

// NewFormatConverter creates a new format converter
func NewFormatConverter(log *logger.Logger) *FormatConverter {
	if log == nil {
		log = logger.CreateLogger("FormatConverter", logger.INFO)
	}

	return &FormatConverter{
		log: log,
		providers: map[ProviderType]bool{
			ZephyrProvider:      true,
			QTestProvider:       true,
			AzureDevOpsProvider: true,
			RallyProvider:       true,
		},
	}
}

// ConvertFormat converts data from one provider format to another
func (c *FormatConverter) ConvertFormat(data []byte, sourceProvider, targetProvider ProviderType) (*ConversionResult, error) {
	startTime := time.Now()
	c.log.Info(fmt.Sprintf("Converting format from %s to %s", sourceProvider, targetProvider))

	// Check if both providers are supported
	if !c.providers[sourceProvider] {
		return nil, fmt.Errorf("source provider %s is not supported", sourceProvider)
	}
	if !c.providers[targetProvider] {
		return nil, fmt.Errorf("target provider %s is not supported", targetProvider)
	}

	// Detect source format
	sourceFormat, err := c.detectFormat(data, sourceProvider)
	if err != nil {
		return nil, fmt.Errorf("failed to detect source format: %v", err)
	}

	// Create conversion result
	result := &ConversionResult{
		SourceProvider: sourceProvider,
		TargetProvider: targetProvider,
		SourceFormat:   sourceFormat,
		TargetFormat:   "json", // Default target format
		WarningMessages: []string{},
		ModifiedFields:  []string{},
	}

	// Perform conversion based on provider combination
	var convertedData []byte
	var conversionErr error

	switch {
	case sourceProvider == ZephyrProvider && targetProvider == QTestProvider:
		convertedData, conversionErr = c.convertZephyrToQTest(data, result)
	case sourceProvider == QTestProvider && targetProvider == ZephyrProvider:
		convertedData, conversionErr = c.convertQTestToZephyr(data, result)
	case sourceProvider == AzureDevOpsProvider && targetProvider == QTestProvider:
		convertedData, conversionErr = c.convertAzureDevOpsToQTest(data, result)
	case sourceProvider == RallyProvider && targetProvider == QTestProvider:
		convertedData, conversionErr = c.convertRallyToQTest(data, result)
	default:
		// Default conversion (simple passthrough with metadata)
		convertedData, conversionErr = c.performGenericConversion(data, sourceProvider, targetProvider, result)
	}

	if conversionErr != nil {
		return nil, fmt.Errorf("conversion failed: %v", conversionErr)
	}

	// Update result
	result.ConvertedData = convertedData
	result.ConversionTime = time.Since(startTime)

	c.log.Info(fmt.Sprintf("Conversion completed in %v with %d warnings", 
		result.ConversionTime, len(result.WarningMessages)))

	return result, nil
}

// detectFormat tries to detect the format of the data
func (c *FormatConverter) detectFormat(data []byte, provider ProviderType) (string, error) {
	// Check if data is JSON
	var jsonData map[string]interface{}
	if err := json.Unmarshal(data, &jsonData); err == nil {
		// It's valid JSON, now check for provider-specific markers
		switch provider {
		case ZephyrProvider:
			if _, hasAttachmentInfo := jsonData["attachmentInfo"]; hasAttachmentInfo {
				return "zephyr-attachment", nil
			}
			if _, hasExecutions := jsonData["executions"]; hasExecutions {
				return "zephyr-execution", nil
			}
			if _, hasTestCases := jsonData["testCases"]; hasTestCases {
				return "zephyr-testcase", nil
			}
			return "json", nil

		case QTestProvider:
			if _, hasLinks := jsonData["links"]; hasLinks {
				if _, hasTestCycle := jsonData["test-cycle"]; hasTestCycle {
					return "qtest-cycle", nil
				}
				if _, hasTestCase := jsonData["test-case"]; hasTestCase {
					return "qtest-case", nil
				}
				if _, hasTestRun := jsonData["test-run"]; hasTestRun {
					return "qtest-run", nil
				}
			}
			return "json", nil

		case AzureDevOpsProvider:
			if _, hasWorkItems := jsonData["workItems"]; hasWorkItems {
				return "azure-workitem", nil
			}
			return "json", nil

		case RallyProvider:
			if _, hasResults := jsonData["QueryResult"]; hasResults {
				return "rally-query", nil
			}
			if _, hasCreateResult := jsonData["CreateResult"]; hasCreateResult {
				return "rally-create", nil
			}
			return "json", nil

		default:
			return "json", nil
		}
	}

	// If not JSON, return generic format
	return "binary", nil
}

// convertZephyrToQTest converts Zephyr format to qTest format
func (c *FormatConverter) convertZephyrToQTest(data []byte, result *ConversionResult) ([]byte, error) {
	// Parse the Zephyr data
	var zephyrData map[string]interface{}
	if err := json.Unmarshal(data, &zephyrData); err != nil {
		return nil, fmt.Errorf("failed to parse Zephyr data: %v", err)
	}

	// Check for specific Zephyr format
	if result.SourceFormat == "zephyr-attachment" {
		return c.convertZephyrAttachmentToQTest(zephyrData, result)
	} else if result.SourceFormat == "zephyr-execution" {
		return c.convertZephyrExecutionToQTest(zephyrData, result)
	} else if result.SourceFormat == "zephyr-testcase" {
		return c.convertZephyrTestCaseToQTest(zephyrData, result)
	}

	// Generic Zephyr to qTest conversion
	attachmentInfo, hasAttachmentInfo := zephyrData["attachmentInfo"].(map[string]interface{})
	metadata := make(map[string]interface{})
	
	if hasAttachmentInfo {
		if metadataObj, hasMeta := attachmentInfo["metadata"].(map[string]interface{}); hasMeta {
			metadata = metadataObj
		}
	}

	content, _ := zephyrData["content"].(string)
	
	// Create qTest format
	qTestData := map[string]interface{}{
		"links": []map[string]string{
			{
				"rel":  "self",
				"href": fmt.Sprintf("https://qtest.example.com/api/v3/projects/%v", metadata["projectKey"]),
			},
		},
		"content":         content,
		"convertedAt":     time.Now().Format(time.RFC3339),
		"convertedFrom":   "Zephyr",
		"originalMetadata": metadata,
	}

	// Based on what we have in the metadata, create appropriate test entities
	if testCaseKey, hasTestCase := metadata["testCaseKey"]; hasTestCase {
		qTestData["test-case"] = map[string]interface{}{
			"id":   testCaseKey,
			"name": fmt.Sprintf("Test Case from Zephyr: %v", testCaseKey),
		}
		result.ModifiedFields = append(result.ModifiedFields, "test-case")
	}

	if issueKey, hasIssue := metadata["issueKey"]; hasIssue {
		qTestData["requirement"] = map[string]interface{}{
			"id":   issueKey,
			"name": fmt.Sprintf("Requirement from Zephyr: %v", issueKey),
		}
		result.ModifiedFields = append(result.ModifiedFields, "requirement")
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.IsFullConversion = true
	result.TargetFormat = "qtest-case"
	return convertedData, nil
}

// convertZephyrAttachmentToQTest converts a Zephyr attachment to qTest format
func (c *FormatConverter) convertZephyrAttachmentToQTest(zephyrData map[string]interface{}, result *ConversionResult) ([]byte, error) {
	attachmentInfo, _ := zephyrData["attachmentInfo"].(map[string]interface{})
	metadata, _ := attachmentInfo["metadata"].(map[string]interface{})
	content, _ := zephyrData["content"].(string)

	// Create qTest format
	qTestData := map[string]interface{}{
		"links": []map[string]string{
			{
				"rel":  "self",
				"href": fmt.Sprintf("https://qtest.example.com/api/v3/projects/%v/attachments", metadata["projectKey"]),
			},
		},
		"test-case": map[string]interface{}{
			"id":   metadata["testCaseKey"],
			"name": fmt.Sprintf("Test Case from Zephyr: %v", metadata["testCaseKey"]),
		},
		"content":          content,
		"convertedAt":      time.Now().Format(time.RFC3339),
		"convertedFrom":    "Zephyr",
		"originalMetadata": metadata,
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.ModifiedFields = append(result.ModifiedFields, "test-case", "links", "convertedAt")
	result.IsFullConversion = true
	result.TargetFormat = "qtest-attachment"
	return convertedData, nil
}

// convertZephyrExecutionToQTest converts a Zephyr execution to qTest format
func (c *FormatConverter) convertZephyrExecutionToQTest(zephyrData map[string]interface{}, result *ConversionResult) ([]byte, error) {
	executions, _ := zephyrData["executions"].([]interface{})
	
	// Create qTest test runs
	testRuns := make([]map[string]interface{}, 0, len(executions))
	
	for _, exec := range executions {
		execution, ok := exec.(map[string]interface{})
		if !ok {
			result.WarningMessages = append(result.WarningMessages, "Skipped invalid execution entry")
			continue
		}
		
		// Map Zephyr execution status to qTest status
		status, _ := execution["status"].(string)
		qTestStatus := mapZephyrStatusToQTest(status)
		
		testRun := map[string]interface{}{
			"id":        execution["id"],
			"name":      fmt.Sprintf("Test Run from Zephyr Execution: %v", execution["id"]),
			"status":    qTestStatus,
			"startTime": execution["startDate"],
			"endTime":   execution["endDate"],
			"test-case": map[string]interface{}{
				"id": execution["testCaseKey"],
			},
			"originalData": execution,
		}
		
		testRuns = append(testRuns, testRun)
	}
	
	// Create qTest format
	qTestData := map[string]interface{}{
		"test-runs":     testRuns,
		"total":         len(testRuns),
		"convertedAt":   time.Now().Format(time.RFC3339),
		"convertedFrom": "Zephyr",
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.ModifiedFields = append(result.ModifiedFields, "test-runs", "status", "test-case")
	result.IsFullConversion = true
	result.TargetFormat = "qtest-runs"
	return convertedData, nil
}

// convertZephyrTestCaseToQTest converts a Zephyr test case to qTest format
func (c *FormatConverter) convertZephyrTestCaseToQTest(zephyrData map[string]interface{}, result *ConversionResult) ([]byte, error) {
	testCases, _ := zephyrData["testCases"].([]interface{})
	
	// Create qTest test cases
	qTestCases := make([]map[string]interface{}, 0, len(testCases))
	
	for _, tc := range testCases {
		testCase, ok := tc.(map[string]interface{})
		if !ok {
			result.WarningMessages = append(result.WarningMessages, "Skipped invalid test case entry")
			continue
		}
		
		steps := make([]map[string]interface{}, 0)
		zephyrSteps, hasSteps := testCase["steps"].([]interface{})
		
		if hasSteps {
			for i, step := range zephyrSteps {
				stepData, ok := step.(map[string]interface{})
				if !ok {
					continue
				}
				
				qTestStep := map[string]interface{}{
					"order":       i + 1,
					"description": stepData["description"],
					"expected":    stepData["expectedResult"],
				}
				
				steps = append(steps, qTestStep)
			}
		}
		
		qTestCase := map[string]interface{}{
			"id":          testCase["key"],
			"name":        testCase["name"],
			"description": testCase["description"],
			"steps":       steps,
			"properties": []map[string]interface{}{
				{
					"field_id":   "priority",
					"field_name": "Priority",
					"field_value": testCase["priority"],
				},
			},
			"originalData": testCase,
		}
		
		qTestCases = append(qTestCases, qTestCase)
	}
	
	// Create qTest format
	qTestData := map[string]interface{}{
		"test-cases":    qTestCases,
		"total":         len(qTestCases),
		"convertedAt":   time.Now().Format(time.RFC3339),
		"convertedFrom": "Zephyr",
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.ModifiedFields = append(result.ModifiedFields, "test-cases", "steps", "properties")
	result.IsFullConversion = true
	result.TargetFormat = "qtest-cases"
	return convertedData, nil
}

// convertQTestToZephyr converts qTest format to Zephyr format
func (c *FormatConverter) convertQTestToZephyr(data []byte, result *ConversionResult) ([]byte, error) {
	// Parse the qTest data
	var qTestData map[string]interface{}
	if err := json.Unmarshal(data, &qTestData); err != nil {
		return nil, fmt.Errorf("failed to parse qTest data: %v", err)
	}

	// Check for specific qTest format
	testCase, hasTestCase := qTestData["test-case"].(map[string]interface{})
	
	// Create Zephyr format
	zephyrData := map[string]interface{}{
		"attachmentInfo": map[string]interface{}{
			"origin": "qtest",
			"metadata": map[string]interface{}{},
		},
		"convertedAt":   time.Now().Format(time.RFC3339),
		"convertedFrom": "qTest",
	}
	
	// Copy essential fields
	if content, hasContent := qTestData["content"]; hasContent {
		zephyrData["content"] = content
	}
	
	// Extract metadata
	metadata := zephyrData["attachmentInfo"].(map[string]interface{})["metadata"].(map[string]interface{})
	
	if hasTestCase {
		metadata["testCaseKey"] = testCase["id"]
		metadata["testCaseName"] = testCase["name"]
		result.ModifiedFields = append(result.ModifiedFields, "testCaseKey", "testCaseName")
	}
	
	if requirement, hasRequirement := qTestData["requirement"].(map[string]interface{}); hasRequirement {
		metadata["issueKey"] = requirement["id"]
		metadata["issueName"] = requirement["name"]
		result.ModifiedFields = append(result.ModifiedFields, "issueKey", "issueName")
	}
	
	// Keep original data for reference
	zephyrData["originalData"] = qTestData

	// Convert to JSON
	convertedData, err := json.MarshalIndent(zephyrData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to Zephyr format: %v", err)
	}

	result.IsFullConversion = true
	result.TargetFormat = "zephyr-attachment"
	return convertedData, nil
}

// convertAzureDevOpsToQTest converts Azure DevOps format to qTest format
func (c *FormatConverter) convertAzureDevOpsToQTest(data []byte, result *ConversionResult) ([]byte, error) {
	// Parse the Azure DevOps data
	var azureData map[string]interface{}
	if err := json.Unmarshal(data, &azureData); err != nil {
		return nil, fmt.Errorf("failed to parse Azure DevOps data: %v", err)
	}

	// Create a simple wrapper with metadata for now
	qTestData := map[string]interface{}{
		"links": []map[string]string{
			{
				"rel":  "self",
				"href": "https://qtest.example.com/api/v3/projects/azure-import",
			},
		},
		"convertedAt":     time.Now().Format(time.RFC3339),
		"convertedFrom":   "AzureDevOps",
		"originalData":    azureData,
		"conversionNote":  "Basic conversion from Azure DevOps format",
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.IsFullConversion = false
	result.WarningMessages = append(result.WarningMessages, 
		"Full Azure DevOps to qTest conversion not implemented yet, only basic metadata mapping applied")
	result.TargetFormat = "qtest-partial"
	return convertedData, nil
}

// convertRallyToQTest converts Rally format to qTest format
func (c *FormatConverter) convertRallyToQTest(data []byte, result *ConversionResult) ([]byte, error) {
	// Parse the Rally data
	var rallyData map[string]interface{}
	if err := json.Unmarshal(data, &rallyData); err != nil {
		return nil, fmt.Errorf("failed to parse Rally data: %v", err)
	}

	// Create a simple wrapper with metadata for now
	qTestData := map[string]interface{}{
		"links": []map[string]string{
			{
				"rel":  "self",
				"href": "https://qtest.example.com/api/v3/projects/rally-import",
			},
		},
		"convertedAt":     time.Now().Format(time.RFC3339),
		"convertedFrom":   "Rally",
		"originalData":    rallyData,
		"conversionNote":  "Basic conversion from Rally format",
	}

	// Convert to JSON
	convertedData, err := json.MarshalIndent(qTestData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to convert to qTest format: %v", err)
	}

	result.IsFullConversion = false
	result.WarningMessages = append(result.WarningMessages, 
		"Full Rally to qTest conversion not implemented yet, only basic metadata mapping applied")
	result.TargetFormat = "qtest-partial"
	return convertedData, nil
}

// performGenericConversion performs a generic conversion between providers
func (c *FormatConverter) performGenericConversion(data []byte, sourceProvider, targetProvider ProviderType, result *ConversionResult) ([]byte, error) {
	// Parse the JSON data if possible
	var sourceData map[string]interface{}
	if err := json.Unmarshal(data, &sourceData); err != nil {
		// If not JSON, wrap the binary data
		wrappedData := map[string]interface{}{
			"convertedAt":     time.Now().Format(time.RFC3339),
			"convertedFrom":   sourceProvider,
			"targetProvider":  targetProvider,
			"conversionNote":  "Binary data wrapped with metadata",
			"dataFormat":      "binary",
		}
		
		result.IsFullConversion = false
		result.WarningMessages = append(result.WarningMessages, 
			"Binary data cannot be fully converted, only wrapped with metadata")
		result.TargetFormat = "binary-wrapped"
		
		return json.MarshalIndent(wrappedData, "", "  ")
	}

	// For JSON data, create a wrapper with the original data
	wrappedData := map[string]interface{}{
		"convertedAt":     time.Now().Format(time.RFC3339),
		"convertedFrom":   sourceProvider,
		"targetProvider":  targetProvider,
		"conversionNote":  "Generic JSON conversion with metadata",
		"originalData":    sourceData,
	}
	
	result.IsFullConversion = false
	result.WarningMessages = append(result.WarningMessages, 
		"Generic conversion performed, specific format mapping not available")
	result.TargetFormat = "json-wrapped"
	
	return json.MarshalIndent(wrappedData, "", "  ")
}

// mapZephyrStatusToQTest maps Zephyr status values to qTest status values
func mapZephyrStatusToQTest(zephyrStatus string) string {
	switch zephyrStatus {
	case "PASS":
		return "PASSED"
	case "FAIL":
		return "FAILED"
	case "WIP":
		return "IN_PROGRESS"
	case "BLOCKED":
		return "BLOCKED"
	default:
		return "NOT_RUN"
	}
}