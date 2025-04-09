Feature: Simplified Load Test Helper

  Scenario: Run simplified load test
    * def config = __arg.config
    
    # This is a simpler version of the load test for reuse in stress testing
    * def executeTest = 
    """
    function() {
      var testConfig = {
        url: config.endpoint.url,
        path: config.endpoint.path,
        method: config.endpoint.method,
        payload: config.endpoint.payload
      };
      
      var result = karate.call('classpath:org/skidbladnir/performance/load-request.feature', testConfig);
      return {
        duration: result.responseTime || 0,
        status: result.status,
        success: result.status >= 200 && result.status < 300
      };
    }
    """
    
    # Run parallel load test
    * def startTime = new Date().getTime()
    * def results = karate.parallel(executeTest, config.threads)
    * def endTime = new Date().getTime()
    * def testDuration = (endTime - startTime) / 1000
    
    # Analyze results
    * def totalRequests = results.length
    * def successfulRequests = results.filter(function(r) { return r.success; }).length
    * def failedRequests = totalRequests - successfulRequests
    * def totalDuration = results.reduce(function(sum, r) { return sum + r.duration; }, 0)
    * def averageResponseTime = totalDuration / totalRequests
    * def successRate = (successfulRequests / totalRequests) * 100
    * def requestsPerSecond = totalRequests / testDuration
    
    # Return summarized results
    * def testResults = {
        totalRequests: totalRequests,
        successfulRequests: successfulRequests,
        failedRequests: failedRequests,
        testDuration: testDuration,
        averageResponseTime: averageResponseTime,
        successRate: successRate,
        requestsPerSecond: requestsPerSecond,
        errorRate: 100 - successRate
      }