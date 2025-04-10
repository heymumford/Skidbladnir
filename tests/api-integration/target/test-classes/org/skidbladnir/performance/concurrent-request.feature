Feature: Concurrent Request Helper

  Scenario: Execute concurrent request
    * def requestUrl = __arg.url
    * def requestPath = __arg.path
    * def requestMethod = __arg.method
    * def requestPayload = __arg.payload
    
    * def startTime = new Date().getTime()
    
    Given url requestUrl
    And path requestPath
    
    # Include payload for POST/PUT methods
    * if (requestMethod == 'POST' || requestMethod == 'PUT') karate.set('request', requestPayload)
    
    When method requestMethod
    
    * def endTime = new Date().getTime()
    * def duration = endTime - startTime
    * def status = responseStatus