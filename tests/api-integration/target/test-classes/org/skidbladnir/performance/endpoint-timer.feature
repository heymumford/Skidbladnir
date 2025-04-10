Feature: Endpoint Timer Helper

  Scenario: Measure endpoint response time
    * def requestUrl = __arg.url
    * def requestPath = __arg.path
    * def requestMethod = __arg.method
    * def requestPayload = __arg.payload
    
    Given url requestUrl
    And path requestPath
    
    # Include payload for POST/PUT methods
    * if (requestMethod == 'POST' || requestMethod == 'PUT') karate.set('request', requestPayload)
    
    When method requestMethod
    
    # Return status code for verification
    * def error = responseStatus < 200 || responseStatus >= 300