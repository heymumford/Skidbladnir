Feature: Delete TestRail Test Case

  Scenario: Delete a TestRail test case
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-testrail.js')
    * def caseId = caseId
    
    # Delete the test case
    Given path '/index.php'
    And path '/api/v2/delete_case/' + caseId
    When method POST
    Then status 200