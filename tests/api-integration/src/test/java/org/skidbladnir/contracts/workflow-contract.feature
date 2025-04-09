Feature: Workflow API Contract
  This feature validates the contract of the Workflow API endpoints

  Background:
    * url apiBaseUrl
    * def workflowSchema = 
    """
    {
      id: '#string',
      type: '#string',
      status: '#string',
      progress: '#number',
      createdAt: '#string',
      updatedAt: '##string',
      completedAt: '##string',
      sourceId: '#string',
      targetId: '##string',
      sourceProvider: '#string',
      targetProvider: '#string',
      logs: '##array'
    }
    """

  Scenario: Create migration workflow schema validation
    Given path '/migration/test-cases'
    And request { sourceId: 'TC-1234', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response == { workflowId: '#string', status: '#string' }

  Scenario: Get workflow status schema validation
    Given path '/workflows/workflow-1234'
    When method GET
    Then status 200
    And match response == workflowSchema

  Scenario: List workflows schema validation
    Given path '/workflows'
    When method GET
    Then status 200
    And match response == { workflows: '#array', pagination: { total: '#number', page: '#number', pageSize: '#number' } }
    And match response.workflows[0] == workflowSchema

  Scenario: Get workflow logs schema validation
    Given path '/workflows/workflow-1234/logs'
    When method GET
    Then status 200
    And match response == { logs: '#array', workflowId: '#string' }
    And match response.logs[0] == { timestamp: '#string', level: '#string', message: '#string' }