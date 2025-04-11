Feature: Create Visure Trace Links

  Scenario: Create trace links between requirements and test cases
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-visure.js')
    * def projectId = projectId
    * def traceLinks = traceLinks
    
    # Create each trace link
    Given path '/api/v1/projects/' + projectId + '/tracelinks'
    And request traceLinks
    When method POST
    Then status 200
    And match response == '#array'
    And match each response contains { id: '#string' }
    
    # Return the created trace links
    * def result = response