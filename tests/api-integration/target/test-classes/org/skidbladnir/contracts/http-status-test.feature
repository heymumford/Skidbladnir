Feature: HTTP Status Test Helper

  Scenario: Test HTTP status code
    * def endpoint = __arg.endpoint
    
    Given url endpoint.url
    And path endpoint.path
    When method GET
    * def status = responseStatus