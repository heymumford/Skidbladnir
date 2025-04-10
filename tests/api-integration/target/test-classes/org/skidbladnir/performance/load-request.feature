Feature: Load Request Helper

  Scenario: Execute load test request
    * def requestUrl = __arg.url
    * def requestPath = __arg.path
    * def requestMethod = __arg.method
    * def requestPayload = __arg.payload
    
    Given url requestUrl
    And path requestPath
    
    # Include payload for POST/PUT methods
    * if (requestMethod == 'POST' || requestMethod == 'PUT') karate.set('request', requestPayload)
    
    When method requestMethod
    
    * def status = responseStatus
    * def responseBody = response
    * def error = responseStatus < 200 || responseStatus >= 300 ? responseBody : null