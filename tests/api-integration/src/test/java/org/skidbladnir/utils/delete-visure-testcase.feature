Feature: Delete Visure Test Case

  Scenario: Delete a Visure test case
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-visure.js')
    * def projectId = projectId
    * def testCaseId = testCaseId
    
    # Delete the test case
    Given path '/api/v1/projects/' + projectId + '/testcases/' + testCaseId
    When method DELETE
    Then status 204