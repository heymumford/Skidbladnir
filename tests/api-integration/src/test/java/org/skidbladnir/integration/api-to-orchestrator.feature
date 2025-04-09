Feature: API to Orchestrator Integration
  This feature tests the integration between the API service and the Orchestrator service

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl

  Scenario: API creates workflow in orchestrator when migration is requested
    # Create migration request in API
    Given path '/migration/test-cases'
    And request { sourceId: 'TC-1234', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response == { workflowId: '#string', status: '#string' }
    
    # Store workflow ID for verification
    * def workflowId = response.workflowId
    
    # Verify workflow was created in Orchestrator
    Given url orchestratorUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.id == workflowId
    And match response.sourceId == 'TC-1234'
    And match response.sourceProvider == 'zephyr'
    And match response.targetProvider == 'qtest'
    And match response.status == '#string'

  Scenario: API forwards workflow cancellation to orchestrator
    # Create migration request in API
    Given path '/migration/test-cases'
    And request { sourceId: 'TC-5678', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    
    # Store workflow ID for cancellation
    * def workflowId = response.workflowId
    
    # Cancel workflow through API
    Given path '/workflows/' + workflowId + '/cancel'
    When method POST
    Then status 200
    And match response.status == 'CANCELLED'
    
    # Verify workflow was cancelled in Orchestrator
    Given url orchestratorUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.id == workflowId
    And match response.status == 'CANCELLED'

  Scenario: API retrieves workflow status from orchestrator
    # Create migration request in API
    Given path '/migration/test-cases'
    And request { sourceId: 'TC-9876', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    
    # Store workflow ID for status check
    * def workflowId = response.workflowId
    
    # Check workflow status through API
    Given path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.id == workflowId
    
    # Update workflow status in Orchestrator (simulated)
    Given url orchestratorUrl
    And path '/workflows/' + workflowId
    And request { status: 'COMPLETED', progress: 100, completedAt: '2025-04-09T12:00:00Z', targetId: 'target-TC-9876' }
    When method PATCH
    Then status 200
    
    # Verify API reflects the updated status
    Given url apiBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response.status == 'COMPLETED'
    And match response.progress == 100
    And match response.completedAt == '2025-04-09T12:00:00Z'
    And match response.targetId == 'target-TC-9876'