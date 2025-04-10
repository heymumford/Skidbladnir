Feature: Cross-Component End-to-End Workflow
  This feature tests the complete data flow across all services
  in a typical test case migration workflow to ensure seamless 
  component interaction and data consistency.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Test data setup
    * def testCaseId = 'TC-' + java.util.UUID.randomUUID().toString().substring(0, 8)
    * def zephyrTestCase = 
    """
    {
      "id": "#(testCaseId)",
      "name": "Verify login functionality across devices",
      "description": "This test case verifies that a user can log in successfully across different devices and browsers",
      "priority": "High",
      "status": "Ready",
      "steps": [
        {
          "position": 1,
          "description": "Navigate to login page",
          "expectedResult": "Login page is displayed"
        },
        {
          "position": 2,
          "description": "Enter valid credentials and click Login",
          "expectedResult": "User is logged in and redirected to dashboard"
        }
      ],
      "attachments": [
        {
          "id": "att-123",
          "name": "screenshot.png",
          "contentType": "image/png",
          "size": 24680
        }
      ]
    }
    """
    
    # Mock setup for source provider
    * def mockPath = 'classpath:org/skidbladnir/mocks/zephyr-mock.feature'

  @crossComponent
  Scenario: Complete Test Case Migration Workflow Across All Components
    # Step 1: Set up the zephyr mock service first
    * def zephyrMock = karate.start(mockPath)
    * def mockUrl = zephyrMock.url
    
    # Configure the Zephyr provider
    Given path '/providers/zephyr/configure'
    And request { baseUrl: '#(mockUrl)', apiKey: 'test-api-key', projectId: 'DEMO' }
    When method POST
    Then status 200
    And match response == { status: 'configured' }
    
    # Step 2: Initiate a migration request through the API service
    Given path '/migration/test-cases'
    And request { sourceId: '#(testCaseId)', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response contains { workflowId: '#string', status: 'CREATED' }
    
    # Store the workflow ID for further tracking
    * def workflowId = response.workflowId
    * print 'Created workflow:', workflowId
    
    # Step 3: Verify the API service created a workflow entry
    Given path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response == 
    """
    {
      id: '#(workflowId)',
      status: '#string',
      type: 'MIGRATION',
      progress: '#number',
      createdAt: '#string',
      sourceId: '#(testCaseId)',
      sourceProvider: 'zephyr',
      targetProvider: 'qtest'
    }
    """
    
    # Step A: Verify the workflow is visible in Orchestrator as well
    Given url orchestratorUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response contains { id: '#(workflowId)', status: '#string' }
    
    # Step 4: Poll the workflow status until it completes or fails (with timeout)
    * def maxRetries = 10
    * def waitTime = 1000 // 1 second
    * def pollStatus = 
    """
    function(workflowId, maxRetries, waitTime) {
      var result = { status: 'UNKNOWN', completed: false, retries: 0 };
      for (var i = 0; i < maxRetries; i++) {
        result.retries = i + 1;
        
        var response = karate.call('classpath:org/skidbladnir/contracts/check-migration.feature', 
          { workflowId: workflowId, apiUrl: apiBaseUrl });
          
        result.status = response.status;
        if (response.status == 'COMPLETED' || response.status == 'FAILED') {
          result.completed = true;
          result.details = response.details;
          break;
        }
        
        // Wait before next attempt
        java.lang.Thread.sleep(waitTime);
      }
      return result;
    }
    """
    
    # Execute the polling function
    * def pollResult = pollStatus(workflowId, maxRetries, waitTime)
    * print 'Workflow final status:', pollResult.status
    
    # Step 5: Verify workflow completed successfully
    * assert pollResult.completed == true
    * assert pollResult.status == 'COMPLETED'
    
    # Step 6: Check the detailed workflow results
    Given url apiBaseUrl
    And path '/workflows/' + workflowId + '/details'
    When method GET
    Then status 200
    And match response contains 
    """
    {
      id: '#(workflowId)',
      steps: '#array',
      completedSteps: '#number',
      totalSteps: '#number',
      startTime: '#string',
      endTime: '#string',
      status: 'COMPLETED',
      sourceProvider: 'zephyr',
      targetProvider: 'qtest'
    }
    """
    * def workflowDetails = response
    
    # Step 7: Verify the test case was successfully migrated
    Given url apiBaseUrl
    And path '/providers/qtest/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response contains { id: '#(testCaseId)', name: '#string', status: '#string' }
    And match response.name == zephyrTestCase.name
    And match response.description == zephyrTestCase.description
    
    # Step 8: Verify attachment was processed by Binary Processor
    * def attachmentId = 'att-123'  // from the test case data
    
    # First check the attachment metadata via Orchestrator
    Given url orchestratorUrl
    And path '/test-cases/' + testCaseId + '/attachments'
    When method GET
    Then status 200
    And match response[0] contains { id: '#(attachmentId)', name: 'screenshot.png' }
    
    # Then verify the Binary Processor has the attachment
    Given url binaryProcessorUrl
    And path '/attachments/' + attachmentId + '/metadata'
    When method GET
    Then status 200
    And match response contains 
    """
    {
      id: '#(attachmentId)',
      name: 'screenshot.png',
      contentType: 'image/png',
      size: '#number'
    }
    """
    
    # Step 9: Verify binary processor created a thumbnail
    Given url binaryProcessorUrl
    And path '/attachments/' + attachmentId + '/thumbnail'
    When method GET
    Then status 200
    
    # Clean up the mock server
    * zephyrMock.stop()
    
  @crossComponent
  Scenario: Error Handling and Recovery Across Components
    # Set up the zephyr mock service that will simulate failures
    * def errorMockPath = 'classpath:org/skidbladnir/mocks/zephyr-error-mock.feature'
    * def errorMock = karate.start(errorMockPath)
    * def mockUrl = errorMock.url
    
    # Configure the Zephyr provider with the error-generating mock
    Given path '/providers/zephyr/configure'
    And request { baseUrl: '#(mockUrl)', apiKey: 'test-api-key', projectId: 'DEMO', retryEnabled: true, maxRetries: 3 }
    When method POST
    Then status 200
    
    # Start a migration workflow with the error-prone provider
    Given path '/migration/test-cases'
    And request { sourceId: '#(testCaseId)', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response contains { workflowId: '#string' }
    
    # Store the workflow ID
    * def workflowId = response.workflowId
    
    # Poll the workflow status until it completes or fails
    * def pollResult = pollStatus(workflowId, 15, 1000)  // more retries and longer wait
    
    # Verify workflow handling of transient errors (should eventually succeed)
    * assert pollResult.completed == true
    
    # Verify retry mechanism details are captured in the workflow
    Given url apiBaseUrl
    And path '/workflows/' + workflowId + '/details'
    When method GET
    Then status 200
    And match response.steps[*].retries contains '#number'
    And match response.steps[*].errors contains '#array'
    
    # Verify resilience metrics are captured
    Given url orchestratorUrl
    And path '/metrics/resilience'
    When method GET
    Then status 200
    And match response contains { totalErrors: '#number', recoveredErrors: '#number' }
    And match response.recoveredErrors > 0
    
    # Clean up the mock server
    * errorMock.stop()
    
  @crossComponent
  Scenario: Service Health Check and Cross-Component Monitoring
    # Test API Health Check
    Given url apiBaseUrl
    And path '/health'
    When method GET
    Then status 200
    And match response contains { status: 'UP' }
    
    # Test Orchestrator Health Check
    Given url orchestratorUrl
    And path '/health'
    When method GET
    Then status 200
    And match response contains { status: 'UP' }
    
    # Test Binary Processor Health Check
    Given url binaryProcessorUrl
    And path '/health'
    When method GET
    Then status 200
    And match response contains { status: 'UP' }
    
    # Get cross-component health status from API gateway
    Given url apiBaseUrl
    And path '/system/health'
    When method GET
    Then status 200
    And match response contains 
    """
    {
      status: 'UP',
      components: {
        api: { status: 'UP' },
        orchestrator: { status: 'UP' },
        binaryProcessor: { status: 'UP' }
      }
    }
    """
    
    # Verify connectivity checks
    Given url apiBaseUrl
    And path '/system/connectivity'
    When method GET
    Then status 200
    And match response.orchestrator == 'CONNECTED'
    And match response.binaryProcessor == 'CONNECTED'