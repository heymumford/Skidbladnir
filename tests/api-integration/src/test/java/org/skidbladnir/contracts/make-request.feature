Feature: Make HTTP Request
  A helper feature to make HTTP requests for other tests

  Scenario:
    # Input: url to call
    Given url url
    When method GET
    Then status 200
    * def response = { status: responseStatus, body: response, headers: responseHeaders }
    * def result = { response: response }
