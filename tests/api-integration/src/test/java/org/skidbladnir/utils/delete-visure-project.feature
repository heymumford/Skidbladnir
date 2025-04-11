Feature: Delete Visure Project

  Scenario: Delete a Visure project
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-visure.js')
    * def projectId = projectId
    
    # Delete the project
    Given path '/api/v1/projects/' + projectId
    When method DELETE
    Then status 204