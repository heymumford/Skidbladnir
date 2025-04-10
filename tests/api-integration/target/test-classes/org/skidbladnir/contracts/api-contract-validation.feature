Feature: API Contract Validation Across Services
  This feature validates that API contracts are consistent across different services

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Schema definitions for cross-service validation
    * def testCaseSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '#string',
      priority: '#string',
      status: '#string',
      createdAt: '#string',
      updatedAt: '##string'
    }
    """
    
    * def workflowSchema = 
    """
    {
      id: '#string',
      type: '#string',
      status: '#string',
      progress: '#number',
      createdAt: '#string',
      updatedAt: '##string',
      sourceId: '#string',
      sourceProvider: '#string',
      targetProvider: '#string'
    }
    """
    
    * def attachmentSchema = 
    """
    {
      id: '#string',
      name: '#string',
      contentType: '#string',
      size: '#number',
      createdAt: '#string'
    }
    """

  Scenario: Validate test case representation across API and Orchestrator
    # First, get a test case from the API service
    Given url apiBaseUrl
    And path '/test-cases/TC-1234'
    When method GET
    Then status 200
    And match response == testCaseSchema
    * def apiTestCase = response
    
    # Then, get the same test case from the Orchestrator service
    Given url orchestratorBaseUrl
    And path '/test-cases/TC-1234'
    When method GET
    Then status 200
    And match response == testCaseSchema
    * def orchestratorTestCase = response
    
    # Verify that critical fields match between services
    * match apiTestCase.id == orchestratorTestCase.id
    * match apiTestCase.name == orchestratorTestCase.name
    * match apiTestCase.description == orchestratorTestCase.description
    * match apiTestCase.priority == orchestratorTestCase.priority
    * match apiTestCase.status == orchestratorTestCase.status

  Scenario: Validate workflow representation across API and Orchestrator
    # Create a workflow through the API
    Given url apiBaseUrl
    And path '/migration/test-cases'
    And request { sourceId: 'TC-1234', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response contains { workflowId: '#string' }
    * def workflowId = response.workflowId
    
    # Get workflow details from API
    Given url apiBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response == workflowSchema
    * def apiWorkflow = response
    
    # Get workflow details from Orchestrator
    Given url orchestratorBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response == workflowSchema
    * def orchestratorWorkflow = response
    
    # Verify that critical fields match between services
    * match apiWorkflow.id == orchestratorWorkflow.id
    * match apiWorkflow.status == orchestratorWorkflow.status
    * match apiWorkflow.type == orchestratorWorkflow.type
    * match apiWorkflow.sourceId == orchestratorWorkflow.sourceId
    * match apiWorkflow.sourceProvider == orchestratorWorkflow.sourceProvider
    * match apiWorkflow.targetProvider == orchestratorWorkflow.targetProvider

  Scenario: Validate attachment representation across Orchestrator and Binary Processor
    # Get attachment metadata from the Orchestrator
    Given url orchestratorBaseUrl
    And path '/test-cases/TC-1234/attachments'
    When method GET
    Then status 200
    And match response[0] == attachmentSchema
    * def orchestratorAttachment = response[0]
    * def attachmentId = orchestratorAttachment.id
    
    # Get attachment metadata from Binary Processor
    Given url binaryProcessorBaseUrl
    And path '/attachments/' + attachmentId + '/metadata'
    When method GET
    Then status 200
    And match response == attachmentSchema
    * def binaryAttachment = response
    
    # Verify that critical fields match between services
    * match orchestratorAttachment.id == binaryAttachment.id
    * match orchestratorAttachment.name == binaryAttachment.name
    * match orchestratorAttachment.contentType == binaryAttachment.contentType
    * match orchestratorAttachment.size == binaryAttachment.size

  Scenario: Validate HTTP status code semantics across services
    # Define test endpoints with expected status codes for common scenarios
    * def endpoints = [
      { service: 'API', url: apiBaseUrl, path: '/not-found', expectedStatus: 404 },
      { service: 'Orchestrator', url: orchestratorBaseUrl, path: '/not-found', expectedStatus: 404 },
      { service: 'Binary', url: binaryProcessorBaseUrl, path: '/not-found', expectedStatus: 404 },
      { service: 'API', url: apiBaseUrl, path: '/unauthorized', expectedStatus: 401 },
      { service: 'Orchestrator', url: orchestratorBaseUrl, path: '/unauthorized', expectedStatus: 401 },
      { service: 'Binary', url: binaryProcessorBaseUrl, path: '/unauthorized', expectedStatus: 401 },
      { service: 'API', url: apiBaseUrl, path: '/bad-request', expectedStatus: 400 },
      { service: 'Orchestrator', url: orchestratorBaseUrl, path: '/bad-request', expectedStatus: 400 },
      { service: 'Binary', url: binaryProcessorBaseUrl, path: '/bad-request', expectedStatus: 400 }
    ]
    
    * def callEndpoint = 
    """
    function(endpoint) {
      var result = { service: endpoint.service, status: 0, passed: false };
      karate.configure('logPrettyRequest', false);
      karate.configure('logPrettyResponse', false);
      try {
        var response = karate.call('classpath:org/skidbladnir/contracts/http-status-test.feature', { endpoint: endpoint });
        result.status = response.status;
        result.passed = result.status == endpoint.expectedStatus;
      } catch (e) {
        // Some errors might be expected but will throw exceptions
        result.status = -1;
        result.error = e.message;
      }
      karate.configure('logPrettyRequest', true);
      karate.configure('logPrettyResponse', true);
      return result;
    }
    """
    
    # Call all endpoints and collect results
    * def results = karate.map(endpoints, callEndpoint)
    
    # Verify that all services have consistent status codes
    * def failedTests = karate.filter(results, function(x) { return !x.passed; })
    * assert failedTests.length == 0
  
  Scenario: Validate error response format across services
    # Define test cases for error responses
    * def errorTests = [
      { service: 'API', url: apiBaseUrl, path: '/bad-request', method: 'POST', body: { invalid: true }, expectedFormat: true },
      { service: 'Orchestrator', url: orchestratorBaseUrl, path: '/bad-request', method: 'POST', body: { invalid: true }, expectedFormat: true },
      { service: 'Binary', url: binaryProcessorBaseUrl, path: '/bad-request', method: 'POST', body: { invalid: true }, expectedFormat: true }
    ]
    
    * def errorResponseSchema = 
    """
    {
      error: '#string',
      message: '#string',
      details: '##array',
      status: '#number',
      timestamp: '#string'
    }
    """
    
    * def testErrorFormat = 
    """
    function(test) {
      var result = { service: test.service, valid: false };
      karate.configure('logPrettyRequest', false);
      karate.configure('logPrettyResponse', false);
      try {
        var response = karate.call('classpath:org/skidbladnir/contracts/error-format-test.feature', { test: test });
        result.response = response.response;
        result.valid = karate.match(response.response, errorResponseSchema).pass;
      } catch (e) {
        result.error = e.message;
      }
      karate.configure('logPrettyRequest', true);
      karate.configure('logPrettyResponse', true);
      return result;
    }
    """
    
    # Test all error responses
    * def results = karate.map(errorTests, testErrorFormat)
    
    # Verify that all services have consistent error formats
    * def failures = karate.filter(results, function(x) { return !x.valid })
    * assert failures.length == 0