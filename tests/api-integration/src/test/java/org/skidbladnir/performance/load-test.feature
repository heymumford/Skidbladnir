Feature: API Load Testing
  This feature tests the behavior of API endpoints under load

  Background:
    * url apiBaseUrl
    * def threadCount = karate.properties['threadCount'] || 20
    * def rampUpPeriod = karate.properties['rampUpPeriod'] || 10
    * def testDuration = karate.properties['testDuration'] || 60
    
    # Set up monitoring interval
    * def monitoringInterval = 5 // seconds
    
    # Helper function to run load test
    * def runLoadTest =
    """
    function(config) {
      var results = {
        endpoint: config.endpoint,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimeBuckets: {
          under200ms: 0,
          under500ms: 0,
          under1000ms: 0,
          under2000ms: 0,
          over2000ms: 0
        },
        errors: [],
        startTime: new Date().getTime(),
        endTime: null,
        testDuration: 0,
        requestsPerSecond: 0
      };
      
      var startTime = new Date().getTime();
      var endTime = startTime + (config.duration * 1000);
      var rampUpEnd = startTime + (config.rampUp * 1000);
      
      // Initialize thread state
      var threadData = [];
      for (var i = 0; i < config.threads; i++) {
        threadData.push({
          threadId: i,
          active: false,
          startTime: 0,
          results: {
            requests: 0,
            successful: 0,
            failed: 0,
            totalDuration: 0
          }
        });
      }
      
      // Start monitoring
      var monitoringData = [];
      var monitoringIntervalId = setInterval(function() {
        var now = new Date().getTime();
        var elapsedSecs = (now - startTime) / 1000;
        var activeThreads = threadData.filter(function(t) { return t.active; }).length;
        var totalRequests = threadData.reduce(function(sum, t) { return sum + t.results.requests; }, 0);
        var successfulRequests = threadData.reduce(function(sum, t) { return sum + t.results.successful; }, 0);
        
        monitoringData.push({
          elapsedTime: elapsedSecs,
          activeThreads: activeThreads,
          totalRequests: totalRequests,
          successfulRequests: successfulRequests
        });
        
        karate.log('Load Test Progress - Elapsed: ' + elapsedSecs.toFixed(1) + 's, Active Threads: ' + activeThreads + 
                  ', Requests: ' + totalRequests + ', Success Rate: ' + 
                  (totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(1) + '%' : 'N/A'));
        
      }, monitoringInterval * 1000);
      
      // Function to perform one request
      var performRequest = function(threadId) {
        var thread = threadData[threadId];
        
        if (!thread.active) return;
        
        var requestStart = new Date().getTime();
        
        try {
          var response = karate.call('classpath:org/skidbladnir/performance/load-request.feature', 
            { url: config.endpoint.url, path: config.endpoint.path, method: config.endpoint.method, payload: config.endpoint.payload });
          
          var requestEnd = new Date().getTime();
          var duration = requestEnd - requestStart;
          
          // Update thread statistics
          thread.results.requests++;
          thread.results.totalDuration += duration;
          
          // Update result timing buckets
          if (duration < 200) results.responseTimeBuckets.under200ms++;
          else if (duration < 500) results.responseTimeBuckets.under500ms++;
          else if (duration < 1000) results.responseTimeBuckets.under1000ms++;
          else if (duration < 2000) results.responseTimeBuckets.under2000ms++;
          else results.responseTimeBuckets.over2000ms++;
          
          if (response.status >= 200 && response.status < 300) {
            thread.results.successful++;
          } else {
            thread.results.failed++;
            results.errors.push({
              threadId: threadId,
              time: new Date().toISOString(),
              status: response.status,
              message: response.error || 'HTTP Error'
            });
          }
          
          // Check if test is still running
          var now = new Date().getTime();
          if (now < endTime && thread.active) {
            // Add some randomness to avoid synchronized requests
            var delay = Math.random() * 100;
            setTimeout(function() { performRequest(threadId); }, delay);
          } else {
            thread.active = false;
          }
        } catch (e) {
          thread.results.failed++;
          results.errors.push({
            threadId: threadId,
            time: new Date().toISOString(),
            message: e.message
          });
          
          // Continue despite error
          var now = new Date().getTime();
          if (now < endTime && thread.active) {
            setTimeout(function() { performRequest(threadId); }, 500);
          } else {
            thread.active = false;
          }
        }
      };
      
      // Function to start a thread
      var startThread = function(threadId) {
        var thread = threadData[threadId];
        thread.active = true;
        thread.startTime = new Date().getTime();
        performRequest(threadId);
      };
      
      // Start threads gradually during ramp-up
      for (var i = 0; i < config.threads; i++) {
        // Calculate delay based on ramp-up period
        var delay = i * (config.rampUp * 1000 / config.threads);
        
        // Immediately-invoked function to capture the correct threadId
        (function(threadId) {
          setTimeout(function() { startThread(threadId); }, delay);
        })(i);
      }
      
      // Wait for the test to complete
      while (new Date().getTime() < endTime + 1000) {
        // Sleep briefly to allow threads to finish
        java.lang.Thread.sleep(100);
      }
      
      // Stop monitoring
      clearInterval(monitoringIntervalId);
      
      // Aggregate results
      results.endTime = new Date().getTime();
      results.testDuration = (results.endTime - results.startTime) / 1000;
      results.totalRequests = threadData.reduce(function(sum, t) { return sum + t.results.requests; }, 0);
      results.successfulRequests = threadData.reduce(function(sum, t) { return sum + t.results.successful; }, 0);
      results.failedRequests = threadData.reduce(function(sum, t) { return sum + t.results.failed; }, 0);
      results.requestsPerSecond = results.totalRequests / results.testDuration;
      results.averageResponseTime = threadData.reduce(function(sum, t) { 
        return sum + t.results.totalDuration; 
      }, 0) / results.totalRequests;
      results.successRate = (results.successfulRequests / results.totalRequests) * 100;
      results.monitoringData = monitoringData;
      
      return results;
    }
    """

  @load
  Scenario: Test API endpoint under sustained load
    # Define the endpoint to test
    * def endpoint = { 
        name: 'Get Test Case', 
        url: apiBaseUrl, 
        path: '/test-cases/TC-1234', 
        method: 'GET', 
        payload: null 
      }
    
    # Configure and run the load test
    * def config = {
        endpoint: endpoint,
        threads: threadCount,
        rampUp: rampUpPeriod,
        duration: testDuration
      }
    
    * def results = runLoadTest(config)
    
    # Log results
    * karate.log('Load Test Results:')
    * karate.log('  Endpoint:', results.endpoint.name)
    * karate.log('  Test Duration:', results.testDuration, 'seconds')
    * karate.log('  Total Requests:', results.totalRequests)
    * karate.log('  Successful Requests:', results.successfulRequests)
    * karate.log('  Failed Requests:', results.failedRequests)
    * karate.log('  Success Rate:', results.successRate.toFixed(2), '%')
    * karate.log('  Requests Per Second:', results.requestsPerSecond.toFixed(2))
    * karate.log('  Average Response Time:', results.averageResponseTime.toFixed(2), 'ms')
    * karate.log('  Response Time Distribution:')
    * karate.log('    < 200ms:', results.responseTimeBuckets.under200ms)
    * karate.log('    200-500ms:', results.responseTimeBuckets.under500ms)
    * karate.log('    500-1000ms:', results.responseTimeBuckets.under1000ms)
    * karate.log('    1000-2000ms:', results.responseTimeBuckets.under2000ms)
    * karate.log('    > 2000ms:', results.responseTimeBuckets.over2000ms)
    
    # Validate results
    * assert results.successRate >= 95 // At least 95% success rate
    * assert results.averageResponseTime < 1000 // Average response time under 1 second

  @load
  Scenario: Test API rate limiting under high load
    # Define the endpoint to test
    * def endpoint = { 
        name: 'Rate Limited API', 
        url: apiBaseUrl, 
        path: '/providers/zephyr/test-cases', 
        method: 'GET', 
        payload: null 
      }
    
    # Configure and run the load test with high thread count
    * def config = {
        endpoint: endpoint,
        threads: 50, // High thread count to trigger rate limiting
        rampUp: 5,   // Short ramp up to hit limits quickly
        duration: 30 // Short duration for quick feedback
      }
    
    * def results = runLoadTest(config)
    
    # Log results
    * karate.log('Rate Limiting Test Results:')
    * karate.log('  Endpoint:', results.endpoint.name)
    * karate.log('  Test Duration:', results.testDuration, 'seconds')
    * karate.log('  Total Requests:', results.totalRequests)
    * karate.log('  Rate Limited Requests:', results.failedRequests)
    * karate.log('  Success Rate:', results.successRate.toFixed(2), '%')
    
    # Check rate limiting behavior
    * def hasRateLimitErrors = results.errors.some(function(e) { return e.status == 429; })
    * assert hasRateLimitErrors == true