Feature: Load Test Runner Helper

  Scenario: Run load test with specific configuration
    * def config = __arg.config
    
    # Use the load test function from the load-test.feature
    * def runLoadTest = 
    """
    function(config) {
      var results = karate.call('classpath:org/skidbladnir/performance/simplified-load-test.feature', 
        { config: config });
      return results;
    }
    """
    
    * def results = runLoadTest(config)