Feature: Get Migration Status

  Scenario: Get status of a migration
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def migrationId = migrationId
    
    Given path '/api/v1/migrations/' + migrationId
    When method GET
    Then status 200
    And match response contains { status: '#string' }
    
    # Return the migration status
    * def status = response