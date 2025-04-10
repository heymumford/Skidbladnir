Feature: Helper feature to create a test case

  Scenario: Create a test case
    * def path = __arg.path
    * def testCase = __arg.testCase

    Given url apiBaseUrl
    And path path
    And request testCase
    When method POST
    Then status 201
    And match response.id == testCase.id