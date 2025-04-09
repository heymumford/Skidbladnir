Feature: Error Format Test Helper

  Scenario: Test error response format
    * def test = __arg.test
    
    Given url test.url
    And path test.path
    And request test.body
    When method POST
    Then status 400
    * def response = response