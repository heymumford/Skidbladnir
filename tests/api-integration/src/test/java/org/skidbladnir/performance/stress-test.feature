Feature: API Stress Testing
  This feature tests the behavior of API endpoints under stress conditions

  Background:
    * url apiBaseUrl
    * def baseThreadCount = karate.properties['baseThreadCount'] || 10
    * def maxThreads = karate.properties['maxThreads'] || 100
    * def incrementThreads = karate.properties['incrementThreads'] || 10
    * def durationPerIncrement = karate.properties['durationPerIncrement'] || 30
    
    # Helper function to run incremental stress test
    * def runStressTest =
    """
    function(config) {
      var results = {
        endpoint: config.endpoint,
        stressLevels: [],
        breakingPoint: { 
          threads: 0, 
          requestsPerSecond: 0, 
          errorRate: 0, 
          avgResponseTime: 0 
        },
        saturationPoint: { 
          threads: 0, 
          requestsPerSecond: 0, 
          errorRate: 0, 
          avgResponseTime: 0 
        }
      };
      
      // Function to run a single stress level test
      var runStressLevel = function(threads) {
        karate.log('Running stress test with ' + threads + ' threads...');
        
        var testConfig = {
          endpoint: config.endpoint,
          threads: threads,
          rampUp: 5, // Short ramp-up
          duration: config.durationPerIncrement
        };
        
        var levelResults = karate.call('classpath:org/skidbladnir/performance/stress-level-test.feature', 
          { config: testConfig });
        
        levelResults.threads = threads;
        return levelResults;
      };
      
      // Start with base thread count
      var currentThreads = config.baseThreads;
      var breakingPointFound = false;
      var saturationPointFound = false;
      var previousRps = 0;
      
      // Test incrementally until breaking point is found or max threads reached
      while (currentThreads <= config.maxThreads && (!breakingPointFound || !saturationPointFound)) {
        var levelResults = runStressLevel(currentThreads);
        results.stressLevels.push(levelResults);
        
        // Check for breaking point - when error rate exceeds 10%
        if (!breakingPointFound && levelResults.errorRate > 10) {
          results.breakingPoint = {
            threads: currentThreads,
            requestsPerSecond: levelResults.requestsPerSecond,
            errorRate: levelResults.errorRate,
            avgResponseTime: levelResults.averageResponseTime
          };
          breakingPointFound = true;
          karate.log('Breaking point found at ' + currentThreads + ' threads');
        }
        
        // Check for saturation point - when RPS increases by less than 5% compared to previous level
        if (!saturationPointFound && previousRps > 0) {
          var rpsIncrease = ((levelResults.requestsPerSecond - previousRps) / previousRps) * 100;
          if (rpsIncrease < 5) {
            results.saturationPoint = {
              threads: currentThreads,
              requestsPerSecond: levelResults.requestsPerSecond,
              errorRate: levelResults.errorRate,
              avgResponseTime: levelResults.averageResponseTime
            };
            saturationPointFound = true;
            karate.log('Saturation point found at ' + currentThreads + ' threads (RPS increase: ' + rpsIncrease.toFixed(2) + '%)');
          }
        }
        
        previousRps = levelResults.requestsPerSecond;
        currentThreads += config.incrementThreads;
      }
      
      // If we haven't found breaking point, use the last test
      if (!breakingPointFound && results.stressLevels.length > 0) {
        var lastTest = results.stressLevels[results.stressLevels.length - 1];
        results.breakingPoint = {
          threads: lastTest.threads,
          requestsPerSecond: lastTest.requestsPerSecond,
          errorRate: lastTest.errorRate,
          avgResponseTime: lastTest.averageResponseTime,
          note: 'Max threads reached without breaking'
        };
      }
      
      // If we haven't found saturation point, use the last test
      if (!saturationPointFound && results.stressLevels.length > 0) {
        var lastTest = results.stressLevels[results.stressLevels.length - 1];
        results.saturationPoint = {
          threads: lastTest.threads,
          requestsPerSecond: lastTest.requestsPerSecond,
          errorRate: lastTest.errorRate,
          avgResponseTime: lastTest.averageResponseTime,
          note: 'Max threads reached without saturation'
        };
      }
      
      return results;
    }
    """

  @stress
  Scenario: Find API breaking point through incremental stress testing
    # Define the endpoint to test
    * def endpoint = { 
        name: 'Get Test Case', 
        url: apiBaseUrl, 
        path: '/test-cases/TC-1234', 
        method: 'GET', 
        payload: null 
      }
    
    # Configure and run the stress test
    * def config = {
        endpoint: endpoint,
        baseThreads: baseThreadCount,
        maxThreads: maxThreads,
        incrementThreads: incrementThreads,
        durationPerIncrement: durationPerIncrement
      }
    
    * def results = runStressTest(config)
    
    # Log results
    * karate.log('Stress Test Results:')
    * karate.log('  Endpoint:', results.endpoint.name)
    * karate.log('  Breaking Point:')
    * karate.log('    Threads:', results.breakingPoint.threads)
    * karate.log('    Requests Per Second:', results.breakingPoint.requestsPerSecond.toFixed(2))
    * karate.log('    Error Rate:', results.breakingPoint.errorRate.toFixed(2), '%')
    * karate.log('    Avg Response Time:', results.breakingPoint.avgResponseTime.toFixed(2), 'ms')
    
    * karate.log('  Saturation Point:')
    * karate.log('    Threads:', results.saturationPoint.threads)
    * karate.log('    Requests Per Second:', results.saturationPoint.requestsPerSecond.toFixed(2))
    * karate.log('    Error Rate:', results.saturationPoint.errorRate.toFixed(2), '%')
    * karate.log('    Avg Response Time:', results.saturationPoint.avgResponseTime.toFixed(2), 'ms')
    
    # Log detailed results for each stress level
    * karate.log('  Detailed Results by Stress Level:')
    * for (var i = 0; i < results.stressLevels.length; i++) {
        var level = results.stressLevels[i];
        karate.log('    Level ' + (i+1) + ' (' + level.threads + ' threads):');
        karate.log('      Requests Per Second:', level.requestsPerSecond.toFixed(2));
        karate.log('      Error Rate:', level.errorRate.toFixed(2), '%');
        karate.log('      Avg Response Time:', level.averageResponseTime.toFixed(2), 'ms');
      }
    
    # Export results to a file for visualization (if file operations were available)
    # In a real implementation, we would save these results to a file for later analysis
    
    # Verify minimum performance requirements
    * assert results.saturationPoint.requestsPerSecond >= 50 // At least 50 RPS before saturation