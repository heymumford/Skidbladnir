Feature: Helper feature to check migration status

  Scenario: Check migration status
    * def workflowId = __arg.workflowId

    Given url apiBaseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    And match response contains { id: '#string', status: '#string', progress: '#number' }