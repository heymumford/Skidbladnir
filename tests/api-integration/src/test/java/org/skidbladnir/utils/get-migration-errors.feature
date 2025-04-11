Feature: Get Migration Errors

  Scenario: Get errors for a migration
    * url apiBaseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def migrationId = migrationId
    
    Given path '/migration/' + migrationId + '/errors'
    When method GET
    Then status 200
    And match response contains { migrationId: '#string', errors: '#array' }
    
    # Return the errors
    * def result = response