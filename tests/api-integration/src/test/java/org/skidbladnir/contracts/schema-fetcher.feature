Feature: Schema Fetcher Helper

  Scenario: Fetch schema from service
    * def serviceUrl = __arg.url
    * def schemaPath = __arg.path
    
    Given url serviceUrl
    And path schemaPath
    When method GET
    Then status 200 || status 404
    * def schema = responseStatus == 200 ? response : null
    * def status = responseStatus