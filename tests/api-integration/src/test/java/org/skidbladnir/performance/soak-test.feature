Feature: API Soak Testing
  This feature tests the behavior of API endpoints over an extended period

  Background:
    * url apiBaseUrl
    * def threadCount = karate.properties['threadCount'] || 5
    * def soakDuration = karate.properties['soakDuration'] || 300 // 5 minutes
    * def statusCheckInterval = karate.properties['statusCheckInterval'] || 60 // 1 minute
    
    # Helper function to run soak test
    * def runSoakTest =
    """
    function(config) {
      var results = {
        endpoint: config.endpoint,
        startTime: new Date().getTime(),
        endTime: null,
        duration: 0,
        samples: [],
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        memoryLeak: false,
        responseTimeDegradation: false,
        successRateDegradation: false
      };
      
      var endTime = results.startTime + (config.duration * 1000);
      
      // Function to take a sample
      var takeSample = function(elapsedSeconds) {
        karate.log('Taking sample at ' + elapsedSeconds + ' seconds');
        
        // Run a short load test
        var sampleConfig = {
          endpoint: config.endpoint,
          threads: config.threads,
          rampUp: 2,
          duration: 10 // Short sample
        };
        
        var sampleResults = karate.call('classpath:org/skidbladnir/performance/load-test-runner.feature', 
          { config: sampleConfig });
        
        // Get system stats
        var systemStats = karate.call('classpath:org/skidbladnir/performance/system-stats.feature');
        
        return {
          elapsedTime: elapsedSeconds,
          requestsPerSecond: sampleResults.requestsPerSecond,
          errorRate: 100 - sampleResults.successRate,
          averageResponseTime: sampleResults.averageResponseTime,
          memory: systemStats.memory,
          cpu: systemStats.cpu,
          timestamp: new Date().toISOString()
        };
      };
      
      // Take initial sample
      var initialSample = takeSample(0);
      results.samples.push(initialSample);
      
      // Run for the specified duration, taking samples at intervals
      var intervalId = setInterval(function() {
        var now = new Date().getTime();
        var elapsedSeconds = Math.floor((now - results.startTime) / 1000);
        
        if (elapsedSeconds >= config.duration) {
          clearInterval(intervalId);
          return;
        }
        
        // Take a sample if we're at a check interval
        if (elapsedSeconds % config.checkInterval === 0 && elapsedSeconds > 0) {
          var sample = takeSample(elapsedSeconds);
          results.samples.push(sample);
        }
      }, 1000);
      
      // Wait for the test to complete
      while (new Date().getTime() < endTime) {
        // Sleep briefly to reduce CPU usage
        java.lang.Thread.sleep(1000);
      }
      
      // Take final sample
      var finalSample = takeSample(Math.floor((endTime - results.startTime) / 1000));
      results.samples.push(finalSample);
      
      // Analyze results
      results.endTime = new Date().getTime();
      results.duration = (results.endTime - results.startTime) / 1000;
      
      // Calculate aggregates
      results.totalRequests = results.samples.reduce(function(sum, s) { 
        return sum + (s.requestsPerSecond * 10); // Each sample was 10 seconds
      }, 0);
      
      var totalErrors = results.samples.reduce(function(sum, s) {
        return sum + (s.requestsPerSecond * 10 * s.errorRate / 100);
      }, 0);
      
      results.successfulRequests = results.totalRequests - totalErrors;
      results.failedRequests = totalErrors;
      
      // Check for degradation
      var responseTimes = results.samples.map(function(s) { return s.averageResponseTime; });
      var firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      var secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
      
      var firstHalfAvg = firstHalf.reduce(function(sum, rt) { return sum + rt; }, 0) / firstHalf.length;
      var secondHalfAvg = secondHalf.reduce(function(sum, rt) { return sum + rt; }, 0) / secondHalf.length;
      
      // If response time increases by more than 20%, consider it degradation
      if (secondHalfAvg > firstHalfAvg * 1.2) {
        results.responseTimeDegradation = true;
        results.degradationDetails = {
          firstHalfAvgResponseTime: firstHalfAvg,
          secondHalfAvgResponseTime: secondHalfAvg,
          percentIncrease: ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        };
      }
      
      // Check for memory growth
      var initialMemory = results.samples[0].memory;
      var finalMemory = results.samples[results.samples.length - 1].memory;
      
      // If memory increases steadily, it may indicate a leak
      if (finalMemory > initialMemory * 1.5) {
        results.memoryLeak = true;
        results.memoryDetails = {
          initialMemory: initialMemory,
          finalMemory: finalMemory,
          percentIncrease: ((finalMemory - initialMemory) / initialMemory) * 100
        };
      }
      
      return results;
    }
    """

  @soak
  Scenario: Run extended soak test to detect performance degradation
    # Define the endpoint to test
    * def endpoint = { 
        name: 'Get Test Case List', 
        url: apiBaseUrl, 
        path: '/test-cases', 
        method: 'GET', 
        payload: null 
      }
    
    # Configure and run the soak test
    * def config = {
        endpoint: endpoint,
        threads: threadCount,
        duration: soakDuration,
        checkInterval: statusCheckInterval
      }
    
    * def results = runSoakTest(config)
    
    # Log results
    * karate.log('Soak Test Results:')
    * karate.log('  Endpoint:', results.endpoint.name)
    * karate.log('  Duration:', results.duration, 'seconds')
    * karate.log('  Total Requests:', results.totalRequests)
    * karate.log('  Successful Requests:', results.successfulRequests)
    * karate.log('  Failed Requests:', results.failedRequests)
    * karate.log('  Success Rate:', (results.successfulRequests / results.totalRequests * 100).toFixed(2), '%')
    
    # Log performance changes over time
    * karate.log('  Performance Over Time:')
    * for (var i = 0; i < results.samples.length; i++) {
        var sample = results.samples[i];
        karate.log('    ' + sample.elapsedTime + 's: ' + 
                 sample.requestsPerSecond.toFixed(2) + ' req/s, ' +
                 sample.averageResponseTime.toFixed(2) + ' ms, ' + 
                 sample.errorRate.toFixed(2) + '% errors, ' +
                 'Memory: ' + sample.memory + ' MB');
      }
    
    # Log issues
    * if (results.responseTimeDegradation) {
        karate.log('  ISSUE: Response time degradation detected');
        karate.log('    First half avg:', results.degradationDetails.firstHalfAvgResponseTime.toFixed(2), 'ms');
        karate.log('    Second half avg:', results.degradationDetails.secondHalfAvgResponseTime.toFixed(2), 'ms');
        karate.log('    Increase:', results.degradationDetails.percentIncrease.toFixed(2), '%');
      }
    
    * if (results.memoryLeak) {
        karate.log('  ISSUE: Potential memory leak detected');
        karate.log('    Initial memory:', results.memoryDetails.initialMemory, 'MB');
        karate.log('    Final memory:', results.memoryDetails.finalMemory, 'MB');
        karate.log('    Increase:', results.memoryDetails.percentIncrease.toFixed(2), '%');
      }
    
    # Verify soak test requirements
    * assert results.failedRequests / results.totalRequests < 0.05 // Less than 5% error rate
    * assert results.responseTimeDegradation == false // No response time degradation