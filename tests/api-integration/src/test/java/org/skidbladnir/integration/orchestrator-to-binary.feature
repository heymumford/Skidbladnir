Feature: Orchestrator to Binary Processor Integration
  This feature tests the integration between the Orchestrator and Binary Processor services

  Background:
    * url orchestratorBaseUrl
    * def binaryUrl = binaryProcessorBaseUrl
    
    # Create a test case with attachments
    * def testCaseWithAttachments = 
    """
    {
      id: "TC-ATTACH-1",
      name: "Test Case with Attachments",
      description: "This test case has attachments for testing binary processing",
      priority: "Medium",
      status: "Ready",
      attachments: [
        {
          id: "attachment-1",
          name: "screenshot.png",
          contentType: "image/png",
          size: 1024,
          content: "base64:iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        },
        {
          id: "attachment-2",
          name: "test-data.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 2048,
          content: "base64:UEsDBBQABgAIAAAAIQA..."
        }
      ]
    }
    """

  Scenario: Orchestrator sends attachments to Binary Processor during migration
    # Create test case in source system (mocked)
    Given path '/providers/zephyr/test-cases'
    And request testCaseWithAttachments
    When method POST
    Then status 201
    
    # Start migration workflow
    Given path '/workflows'
    And request { 
      type: "MIGRATION", 
      sourceId: "TC-ATTACH-1", 
      sourceProvider: "zephyr", 
      targetProvider: "qtest" 
    }
    When method POST
    Then status 200
    * def workflowId = response.id
    
    # Verify binary processor received attachment processing request
    Given url binaryUrl
    And path '/attachments/process'
    When method GET
    Then status 200
    And match response.requests[*].workflowId contains workflowId
    And match response.requests[*].attachmentCount contains 2
    
    # Process attachments (simulated)
    Given path '/attachments/process/' + workflowId
    And request { status: "COMPLETED", processed: 2, failed: 0 }
    When method POST
    Then status 200
    
    # Verify orchestrator received attachment processing completion
    Given url orchestratorBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.status == "COMPLETED" || response.status == "PROCESSING"
    And match response.logs[*].message contains "Attachment processing completed"

  Scenario: Binary Processor handles attachment format conversion
    # Create test case in source system with DOCX attachment (mocked)
    * def testCaseWithDocx = 
    """
    {
      id: "TC-ATTACH-2",
      name: "Test Case with DOCX",
      description: "This test case has a DOCX attachment that needs conversion",
      priority: "Medium",
      status: "Ready",
      attachments: [
        {
          id: "attachment-3",
          name: "requirements.docx",
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 3072,
          content: "base64:UEsDBBQAAAgIAA..."
        }
      ]
    }
    """
    
    # Create test case
    Given path '/providers/zephyr/test-cases'
    And request testCaseWithDocx
    When method POST
    Then status 201
    
    # Start migration workflow
    Given path '/workflows'
    And request { 
      type: "MIGRATION", 
      sourceId: "TC-ATTACH-2", 
      sourceProvider: "zephyr", 
      targetProvider: "qtest",
      options: {
        convertDocx: true
      }
    }
    When method POST
    Then status 200
    * def workflowId = response.id
    
    # Verify binary processor received conversion request
    Given url binaryUrl
    And path '/attachments/convert'
    When method GET
    Then status 200
    And match response.requests[*].workflowId contains workflowId
    And match response.requests[*].conversionType contains "DOCX_TO_PDF"
    
    # Complete conversion (simulated)
    Given path '/attachments/convert/' + workflowId
    And request { 
      status: "COMPLETED", 
      original: { id: "attachment-3", name: "requirements.docx" },
      converted: { id: "attachment-3-converted", name: "requirements.pdf", contentType: "application/pdf", size: 2048 }
    }
    When method POST
    Then status 200
    
    # Verify orchestrator received conversion result
    Given url orchestratorBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.logs[*].message contains "Attachment conversion completed"