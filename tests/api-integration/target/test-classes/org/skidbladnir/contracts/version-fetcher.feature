Feature: Version Fetcher Helper

  Scenario: Fetch service version
    * def serviceUrl = __arg.url
    
    Given url serviceUrl
    And path '/version'
    When method GET
    Then status 200 || status 404
    * def version = responseStatus == 200 ? response.version : null
    * def status = responseStatus