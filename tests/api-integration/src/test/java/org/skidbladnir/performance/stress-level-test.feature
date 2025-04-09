Feature: Stress Level Test Helper

  Scenario: Run a single stress level test
    * def testConfig = __arg.config
    
    # Re-use the load test feature but with specific thread count
    * def results = karate.call('classpath:org/skidbladnir/performance/load-test-runner.feature', 
        { config: testConfig })
    
    # Return the results
    * def errorRate = (results.failedRequests / results.totalRequests) * 100
    * def requestsPerSecond = results.requestsPerSecond
    * def averageResponseTime = results.averageResponseTime