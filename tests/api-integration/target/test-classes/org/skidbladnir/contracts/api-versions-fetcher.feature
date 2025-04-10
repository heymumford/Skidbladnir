Feature: API Versions Fetcher Helper

  Scenario: Fetch supported API versions
    * def serviceUrl = __arg.url
    
    Given url serviceUrl
    And path '/api-versions'
    When method GET
    Then status 200 || status 404
    * def versions = responseStatus == 200 ? response.supported : []