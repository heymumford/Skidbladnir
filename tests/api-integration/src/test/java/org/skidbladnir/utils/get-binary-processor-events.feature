Feature: Get Binary Processor Events

  Scenario: Get events from binary processor for a migration
    * url binaryProcessorBaseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def migrationId = migrationId
    
    Given path '/events/' + migrationId
    When method GET
    Then status 200
    
    # Return the events
    * def result = { events: response }