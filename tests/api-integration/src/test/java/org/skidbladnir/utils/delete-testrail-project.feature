Feature: Delete TestRail Project

  Scenario: Delete a TestRail project
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-testrail.js')
    * def projectId = projectId
    
    # Delete the project
    Given path '/index.php'
    And path '/api/v2/delete_project/' + projectId
    When method POST
    Then status 200