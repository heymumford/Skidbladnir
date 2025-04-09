Feature: Helper feature for making API requests

  Scenario: Make a random API request
    * def paths = ['/test-cases', '/providers', '/workflows', '/status']
    * def randomPath = paths[Math.floor(Math.random() * paths.length)]
    
    Given url apiBaseUrl
    And path randomPath
    When method GET
    Then status 200 || status 429
    
    * def responseStatus = responseStatus