Feature: Header Checker Helper

  Scenario: Check response headers
    * def serviceUrl = __arg.url
    * def path = __arg.path
    
    Given url serviceUrl
    And path path
    And header X-Test-Request = 'Security-Header-Check'
    When method GET
    Then status 200 || status 404 || status 401
    * def headers = responseHeaders
    * def status = responseStatus