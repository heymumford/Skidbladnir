Feature: Helper feature to start a migration

  Scenario: Start a migration for a test case
    * def testCaseId = __arg.testCaseId

    Given url apiBaseUrl
    And path '/migration/test-cases'
    And request { sourceId: testCaseId, sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    And match response == { workflowId: '#string', status: '#string' }
    
    * def workflowId = response.workflowId