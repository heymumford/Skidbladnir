Feature: API Performance Testing
  This feature tests the performance characteristics of key API endpoints

  Background:
    * url apiBaseUrl
    * def threadCount = karate.properties['threadCount'] || 10
    * def iterationCount = karate.properties['iterationCount'] || 50
    * def warmUpCount = 5
    
    # Helper function to measure response time
    * def measureResponseTime =
    """
    function(endpoint) {
      var result = { endpoint: endpoint, times: [], errors: 0, minTime: 0, maxTime: 0, avgTime: 0 };
      
      try {
        for (var i = 0; i < endpoint.iterations; i++) {
          var startTime = new Date().getTime();
          var response = karate.call('classpath:org/skidbladnir/performance/endpoint-timer.feature', 
            { url: endpoint.url, path: endpoint.path, method: endpoint.method, payload: endpoint.payload });
          var endTime = new Date().getTime();
          var duration = endTime - startTime;
          
          // Only record times after warm-up period
          if (i >= warmUpCount) {
            result.times.push(duration);
            if (response.error) {
              result.errors++;
            }
          }
        }
        
        // Calculate statistics
        if (result.times.length > 0) {
          result.minTime = Math.min.apply(null, result.times);
          result.maxTime = Math.max.apply(null, result.times);
          var sum = result.times.reduce(function(a, b) { return a + b; }, 0);
          result.avgTime = sum / result.times.length;
          
          // Calculate percentiles
          result.times.sort(function(a, b) { return a - b; });
          var p95Index = Math.floor(result.times.length * 0.95);
          var p99Index = Math.floor(result.times.length * 0.99);
          result.p95 = result.times[p95Index];
          result.p99 = result.times[p99Index];
        }
      } catch (e) {
        result.testError = e.message;
      }
      
      return result;
    }
    """

  @performance
  Scenario: Measure API endpoint performance
    # Define endpoints to test
    * def endpoints = [
      { name: 'Health Check', url: apiBaseUrl, path: '/health', method: 'GET', payload: null, iterations: 20, threshold: 200 },
      { name: 'List Test Cases', url: apiBaseUrl, path: '/test-cases', method: 'GET', payload: null, iterations: 20, threshold: 500 },
      { name: 'Get Test Case', url: apiBaseUrl, path: '/test-cases/TC-1234', method: 'GET', payload: null, iterations: 20, threshold: 300 },
      { name: 'List Providers', url: apiBaseUrl, path: '/providers', method: 'GET', payload: null, iterations: 20, threshold: 300 },
      { name: 'Create Workflow', url: apiBaseUrl, path: '/workflows', method: 'POST', payload: { type: 'TEST', sourceId: 'TC-1234', sourceProvider: 'zephyr', targetProvider: 'qtest' }, iterations: 20, threshold: 600 }
    ]
    
    # Execute performance tests on each endpoint
    * def results = karate.map(endpoints, measureResponseTime)
    
    # Log and validate results
    * def validateResults =
    """
    function(results) {
      var failures = [];
      
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var endpoint = endpoints[i];
        
        // Log performance metrics
        karate.log('Endpoint:', endpoint.name);
        karate.log('  Method:', endpoint.method, 'Path:', endpoint.path);
        karate.log('  Avg Time:', result.avgTime.toFixed(2), 'ms');
        karate.log('  Min Time:', result.minTime, 'ms');
        karate.log('  Max Time:', result.maxTime, 'ms');
        karate.log('  P95:', result.p95, 'ms');
        karate.log('  P99:', result.p99, 'ms');
        karate.log('  Errors:', result.errors);
        
        // Check if performance meets threshold
        if (result.avgTime > endpoint.threshold) {
          failures.push({
            endpoint: endpoint.name,
            avgTime: result.avgTime,
            threshold: endpoint.threshold
          });
        }
        
        // Check if error rate is acceptable (less than 5%)
        var errorRate = (result.errors / (endpoint.iterations - warmUpCount)) * 100;
        if (errorRate > 5) {
          failures.push({
            endpoint: endpoint.name,
            errorRate: errorRate,
            threshold: '5%'
          });
        }
      }
      
      return failures;
    }
    """
    
    * def failures = validateResults(results)
    
    # If there are failures, log them for analysis
    * if (failures.length > 0) karate.log('Performance test failures:', failures)
    
    # Assert that all performance tests passed
    * assert failures.length == 0

  @performance
  Scenario: Test concurrent access performance
    # Define endpoint for concurrent testing
    * def endpoint = { 
        name: 'Get Test Case', 
        url: apiBaseUrl, 
        path: '/test-cases/TC-1234', 
        method: 'GET', 
        payload: null 
      }
    
    # Create a test function for parallel execution
    * def test = 
    """
    function() {
      var response = karate.call('classpath:org/skidbladnir/performance/concurrent-request.feature', 
        { url: endpoint.url, path: endpoint.path, method: endpoint.method, payload: endpoint.payload });
      return { 
        duration: response.duration,
        status: response.status,
        success: response.status >= 200 && response.status < 300
      };
    }
    """
    
    # Execute concurrent tests
    * def startTime = new Date().getTime()
    * def results = karate.parallel(test, threadCount)
    * def endTime = new Date().getTime()
    * def totalDuration = endTime - startTime
    
    # Analyze results
    * def successCount = 0
    * def failCount = 0
    * def durations = []
    * for (var i = 0; i < results.length; i++) {
        if (results[i].success) successCount++;
        else failCount++;
        durations.push(results[i].duration);
      }
    
    # Calculate statistics
    * def avgDuration = durations.reduce(function(a, b) { return a + b; }, 0) / durations.length
    * durations.sort(function(a, b) { return a - b; })
    * def p95Index = Math.floor(durations.length * 0.95)
    * def p95 = durations[p95Index]
    
    # Log results
    * karate.log('Concurrent Performance Test Results:')
    * karate.log('  Thread Count:', threadCount)
    * karate.log('  Total Duration:', totalDuration, 'ms')
    * karate.log('  Avg Request Duration:', avgDuration.toFixed(2), 'ms')
    * karate.log('  P95 Request Duration:', p95, 'ms')
    * karate.log('  Success Rate:', (successCount / results.length * 100).toFixed(2), '%')
    
    # Validation
    * assert successCount / results.length >= 0.95 // At least 95% success rate
    * assert avgDuration < 500 // Average duration under 500ms