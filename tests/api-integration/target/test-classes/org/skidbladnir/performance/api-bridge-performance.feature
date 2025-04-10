Feature: API Bridge Performance Testing
  This feature tests the performance characteristics of the API Bridge component

  Background:
    * url apiBaseUrl
    * def util = Java.type('org.skidbladnir.utils.TestUtils')
    * def threadCount = karate.properties['threadCount'] || 10
    * def iterationCount = karate.properties['iterationCount'] || 5
    * def requestsPerIteration = karate.properties['requestsPerIteration'] || 20
    * def waitTime = 100
    
    # Helper to create a timestamp
    * def timestamp = function(){ return java.lang.System.currentTimeMillis() }
    
    # Helper to measure time
    * def measureTime = 
    """
    function(action) {
      var start = timestamp();
      action();
      var end = timestamp();
      return end - start;
    }
    """
    
    # Helper to make a request with timing
    * def makeTimedRequest =
    """
    function(path, method, body, options) {
      var start = timestamp();
      var response = { 
        status: 0, 
        duration: 0, 
        data: null, 
        rateLimited: false, 
        error: null,
        retries: 0,
        retryDelays: [],
        circuitBroken: false 
      };
      
      options = options || {};
      
      try {
        var result = karate.call('classpath:org/skidbladnir/performance/make-bridge-request.feature', 
          { 
            path: path, 
            method: method, 
            body: body,
            simulateRetries: options.simulateRetries || false,
            maxRetries: options.maxRetries || 3,
            retryBackoff: options.retryBackoff || 100
          });
          
        response.status = result.responseStatus;
        response.data = result.response;
        response.rateLimited = result.responseStatus == 429;
        
        // Capture retry information if present
        if (result.retries) {
          response.retries = result.retries;
        }
        
        if (result.retryDelays) {
          response.retryDelays = result.retryDelays;
        }
        
        if (result.circuitBroken) {
          response.circuitBroken = result.circuitBroken;
        }
      } catch (e) {
        response.error = e.message;
        karate.log('Request failed with error:', e);
        response.status = -1;
      }
      
      response.duration = timestamp() - start;
      return response;
    }
    """
    
    # Helper for metrics collection
    * def createMetricsCollector = 
    """
    function() {
      return {
        requestCount: 0,
        successCount: 0,
        rateLimitedCount: 0,
        failureCount: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Number.MAX_VALUE,
        responseTimeHistogram: {
          "0-50ms": 0,
          "51-100ms": 0,
          "101-200ms": 0,
          "201-500ms": 0,
          "501-1000ms": 0,
          "1001+ms": 0
        },
        statusCodes: {},
        durations: [],
        startTime: java.lang.System.currentTimeMillis(),
        
        addResult: function(result) {
          this.requestCount++;
          this.totalDuration += result.duration;
          this.maxDuration = Math.max(this.maxDuration, result.duration);
          this.minDuration = Math.min(this.minDuration, result.duration);
          this.durations.push(result.duration);
          
          // Record status code
          var status = result.status.toString();
          this.statusCodes[status] = (this.statusCodes[status] || 0) + 1;
          
          // Add to histogram
          if (result.duration <= 50) {
            this.responseTimeHistogram["0-50ms"]++;
          } else if (result.duration <= 100) {
            this.responseTimeHistogram["51-100ms"]++;
          } else if (result.duration <= 200) {
            this.responseTimeHistogram["101-200ms"]++;
          } else if (result.duration <= 500) {
            this.responseTimeHistogram["201-500ms"]++;
          } else if (result.duration <= 1000) {
            this.responseTimeHistogram["501-1000ms"]++;
          } else {
            this.responseTimeHistogram["1001+ms"]++;
          }
          
          if (result.rateLimited) {
            this.rateLimitedCount++;
          } else if (result.status >= 200 && result.status < 300) {
            this.successCount++;
          } else {
            this.failureCount++;
          }
        },
        
        getP95: function() {
          if (this.durations.length === 0) return 0;
          
          // Sort durations
          var sorted = this.durations.slice().sort(function(a, b) { return a - b; });
          
          // Calculate percentile index
          var idx = Math.ceil(sorted.length * 0.95) - 1;
          return sorted[idx];
        },
        
        getP99: function() {
          if (this.durations.length === 0) return 0;
          
          // Sort durations
          var sorted = this.durations.slice().sort(function(a, b) { return a - b; });
          
          // Calculate percentile index
          var idx = Math.ceil(sorted.length * 0.99) - 1;
          return sorted[idx];
        },
        
        getReport: function() {
          var totalTime = java.lang.System.currentTimeMillis() - this.startTime;
          
          return {
            requestCount: this.requestCount,
            successCount: this.successCount,
            rateLimitedCount: this.rateLimitedCount,
            failureCount: this.failureCount,
            avgDuration: this.requestCount > 0 ? this.totalDuration / this.requestCount : 0,
            maxDuration: this.maxDuration,
            minDuration: this.minDuration == Number.MAX_VALUE ? 0 : this.minDuration,
            p95: this.getP95(),
            p99: this.getP99(),
            successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0,
            throughput: totalTime > 0 ? (this.requestCount * 1000 / totalTime).toFixed(2) : 0,
            totalTimeSeconds: (totalTime / 1000).toFixed(2),
            responseTimeHistogram: this.responseTimeHistogram,
            statusCodes: this.statusCodes
          };
        }
      };
    }
    """

  @performance
  Scenario: Test API Bridge throughput under load
    # Create a metrics collector for this test
    * def metrics = createMetricsCollector()
    
    # Run multiple iterations of load test
    * eval for (var i = 0; i < iterationCount; i++) {
        karate.log('Running iteration', i + 1, 'of', iterationCount);
        var startTime = timestamp();
        
        // Run a batch of concurrent requests using threads
        var results = karate.repeat(threadCount, function(thread){
          var threadResults = [];
          for (var r = 0; r < requestsPerIteration / threadCount; r++) {
            var result = makeTimedRequest('/test-cases', 'GET', null);
            threadResults.push(result);
          }
          return threadResults;
        });
        
        // Flatten results and collect metrics
        for (var t = 0; t < results.length; t++) {
          for (var r = 0; r < results[t].length; r++) {
            metrics.addResult(results[t][r]);
          }
        }
        
        var iterationTime = timestamp() - startTime;
        karate.log('Iteration', i + 1, 'completed in', iterationTime, 'ms');
        
        // Brief pause between iterations
        java.lang.Thread.sleep(waitTime);
    }
    
    # Log performance report
    * def report = metrics.getReport()
    * karate.log('======= API Bridge Performance Report =======')
    * karate.log('Total requests:', report.requestCount)
    * karate.log('Successful requests:', report.successCount)
    * karate.log('Rate limited requests:', report.rateLimitedCount)
    * karate.log('Failed requests:', report.failureCount)
    * karate.log('Success rate:', report.successRate.toFixed(2) + '%')
    * karate.log('Total test time:', report.totalTimeSeconds, 'seconds')
    * karate.log('Throughput:', report.throughput, 'requests/second')
    * karate.log('')
    * karate.log('Response Time Statistics:')
    * karate.log('  Average:', report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Min:', report.minDuration, 'ms')
    * karate.log('  Max:', report.maxDuration, 'ms')
    * karate.log('  P95:', report.p95, 'ms')
    * karate.log('  P99:', report.p99, 'ms')
    * karate.log('')
    * karate.log('Response Time Distribution:')
    * karate.log('  0-50ms:', report.responseTimeHistogram["0-50ms"], 'requests')
    * karate.log('  51-100ms:', report.responseTimeHistogram["51-100ms"], 'requests')
    * karate.log('  101-200ms:', report.responseTimeHistogram["101-200ms"], 'requests')
    * karate.log('  201-500ms:', report.responseTimeHistogram["201-500ms"], 'requests')
    * karate.log('  501-1000ms:', report.responseTimeHistogram["501-1000ms"], 'requests')
    * karate.log('  1001+ms:', report.responseTimeHistogram["1001+ms"], 'requests')
    * karate.log('')
    * karate.log('Status Code Distribution:')
    * eval for (var code in report.statusCodes) karate.log('  ' + code + ':', report.statusCodes[code], 'requests')
    * karate.log('===========================================')
    
    # Verify performance criteria are met
    * assert report.successRate > 80
    * assert report.avgDuration < 500
    * assert report.p95 < 1000
    * assert report.throughput > 5
    
  @performance
  Scenario: Test API Bridge resilience with retries and circuit breaking
    # Create a metrics collector for this test
    * def metrics = createMetricsCollector()
    
    # Setup endpoint that will fail intermittently
    * def failRate = 0.3  // 30% failure rate
    
    # Track retry metrics
    * def retryMetrics = { totalRetries: 0, maxRetries: 0, circuitBrokenCount: 0, retryDelays: [] }
    
    # Run multiple iterations of the resilience test
    * eval for (var i = 0; i < iterationCount; i++) {
        karate.log('Running resilience test iteration', i + 1, 'of', iterationCount);
        
        // Set increasing failure rates to trigger circuit breaker eventually
        var currentFailRate = failRate * (i + 1);
        if (currentFailRate > 0.9) currentFailRate = 0.9;
        
        // Run a batch of requests that will experience failures
        var results = karate.repeat(10, function(thread){
          var result = makeTimedRequest(
            '/test-with-failures?failRate=' + currentFailRate, 
            'GET', 
            null, 
            { simulateRetries: true, maxRetries: 3, retryBackoff: 50 }
          );
          return result;
        });
        
        // Collect metrics
        for (var r = 0; r < results.length; r++) {
          metrics.addResult(results[r]);
          
          // Collect retry metrics
          retryMetrics.totalRetries += results[r].retries;
          retryMetrics.maxRetries = Math.max(retryMetrics.maxRetries, results[r].retries);
          
          if (results[r].circuitBroken) {
            retryMetrics.circuitBrokenCount++;
          }
          
          // Add retry delays to the list
          if (results[r].retryDelays && results[r].retryDelays.length > 0) {
            retryMetrics.retryDelays = retryMetrics.retryDelays.concat(results[r].retryDelays);
          }
        }
        
        // Brief pause between iterations
        java.lang.Thread.sleep(waitTime);
    }
    
    # Calculate average retry delay
    * def calculateAverageDelay = function() { 
        var total = 0;
        for (var i = 0; i < retryMetrics.retryDelays.length; i++) {
            total += retryMetrics.retryDelays[i];
        }
        return retryMetrics.retryDelays.length > 0 ? total / retryMetrics.retryDelays.length : 0;
    }
    * def avgRetryDelay = calculateAverageDelay()
    
    # Log resilience report
    * def report = metrics.getReport()
    * karate.log('======= API Bridge Resilience Report =======')
    * karate.log('Total requests:', report.requestCount)
    * karate.log('Successful requests:', report.successCount)
    * karate.log('Failed requests:', report.failureCount)
    * karate.log('Rate limited requests:', report.rateLimitedCount)
    * karate.log('Success rate with retry/circuit breaking:', report.successRate.toFixed(2) + '%')
    * karate.log('')
    * karate.log('Retry Statistics:')
    * karate.log('  Total retries performed:', retryMetrics.totalRetries)
    * karate.log('  Average retries per request:', (retryMetrics.totalRetries / report.requestCount).toFixed(2))
    * karate.log('  Maximum retries for a request:', retryMetrics.maxRetries)
    * karate.log('  Circuit breaker activations:', retryMetrics.circuitBrokenCount)
    * karate.log('  Average retry delay:', avgRetryDelay.toFixed(2), 'ms')
    * karate.log('')
    * karate.log('Response Time Statistics:')
    * karate.log('  Average (including retries):', report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Min:', report.minDuration, 'ms')
    * karate.log('  Max:', report.maxDuration, 'ms')
    * karate.log('  P95:', report.p95, 'ms')
    * karate.log('  P99:', report.p99, 'ms')
    * karate.log('===========================================')
    
    # Verify resilience improved overall success despite failures
    * assert report.successRate > 40  // We expect some success despite high failure rate
    * assert retryMetrics.totalRetries > 0  // Verify retries are happening
    
  @performance
  Scenario: Test API Bridge rate limiting effectiveness
    # Create a metrics collector for this test
    * def metrics = createMetricsCollector()
    
    # Create phase-specific metrics collectors
    * def phase1Metrics = createMetricsCollector()
    * def phase2Metrics = createMetricsCollector()
    * def phase3Metrics = createMetricsCollector()
    
    # First set of requests - should be mostly successful
    * karate.log('Phase 1: Initial requests within rate limits')
    * def phase1Results = karate.repeat(15, function(i){
        return makeTimedRequest('/test-cases', 'GET', null);
    })
    
    # Collect phase 1 metrics
    * eval for (var i = 0; i < phase1Results.length; i++) { metrics.addResult(phase1Results[i]); phase1Metrics.addResult(phase1Results[i]); }
    
    # Phase 2: Burst of requests to trigger rate limiting
    * karate.log('Phase 2: Burst of requests to trigger rate limiting')
    * def phase2Results = karate.repeat(50, function(i){
        return makeTimedRequest('/test-cases', 'GET', null);
    })
    
    # Collect phase 2 metrics
    * eval for (var i = 0; i < phase2Results.length; i++) { metrics.addResult(phase2Results[i]); phase2Metrics.addResult(phase2Results[i]); }
    
    # Wait for rate limiting to reset
    * karate.log('Waiting for rate limit to reset...')
    * java.lang.Thread.sleep(3000)
    
    # Phase 3: Requests after waiting - should be successful again
    * karate.log('Phase 3: Requests after rate limit reset')
    * def phase3Results = karate.repeat(15, function(i){
        return makeTimedRequest('/test-cases', 'GET', null);
    })
    
    # Collect phase 3 metrics
    * eval for (var i = 0; i < phase3Results.length; i++) { metrics.addResult(phase3Results[i]); phase3Metrics.addResult(phase3Results[i]); }
    
    # Get reports for each phase
    * def report = metrics.getReport()
    * def phase1Report = phase1Metrics.getReport()
    * def phase2Report = phase2Metrics.getReport()
    * def phase3Report = phase3Metrics.getReport()
    
    # Calculate rate limited percentages by phase
    * def phase1RateLimitedPct = phase1Report.rateLimitedCount / phase1Report.requestCount * 100
    * def phase2RateLimitedPct = phase2Report.rateLimitedCount / phase2Report.requestCount * 100
    * def phase3RateLimitedPct = phase3Report.rateLimitedCount / phase3Report.requestCount * 100
    
    # Log rate limiting report
    * karate.log('======= API Bridge Rate Limiting Report =======')
    * karate.log('Total requests processed:', report.requestCount)
    * karate.log('Total rate limited requests:', report.rateLimitedCount, 
        '(' + (report.rateLimitedCount / report.requestCount * 100).toFixed(2) + '%)')
    * karate.log('')
    * karate.log('Phase Analysis:')
    * karate.log('Phase 1 - Initial Baseline:')
    * karate.log('  Requests:', phase1Report.requestCount)
    * karate.log('  Rate limited:', phase1Report.rateLimitedCount, '(' + phase1RateLimitedPct.toFixed(2) + '%)')
    * karate.log('  Avg response time:', phase1Report.avgDuration.toFixed(2), 'ms')
    * karate.log('')
    * karate.log('Phase 2 - Burst Traffic:')
    * karate.log('  Requests:', phase2Report.requestCount)
    * karate.log('  Rate limited:', phase2Report.rateLimitedCount, '(' + phase2RateLimitedPct.toFixed(2) + '%)')
    * karate.log('  Avg response time:', phase2Report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Status code distribution:')
    * eval for (var code in phase2Report.statusCodes) karate.log('    ' + code + ':', phase2Report.statusCodes[code], 'requests')
    * karate.log('')
    * karate.log('Phase 3 - Recovery:')
    * karate.log('  Requests:', phase3Report.requestCount)
    * karate.log('  Rate limited:', phase3Report.rateLimitedCount, '(' + phase3RateLimitedPct.toFixed(2) + '%)')
    * karate.log('  Avg response time:', phase3Report.avgDuration.toFixed(2), 'ms')
    * karate.log('')
    * karate.log('Response Time Impact:')
    * karate.log('  Phase 1 avg response time:', phase1Report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Phase 2 avg response time:', phase2Report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Phase 3 avg response time:', phase3Report.avgDuration.toFixed(2), 'ms')
    * karate.log('  Phase 1 to Phase 2 change:', ((phase2Report.avgDuration / phase1Report.avgDuration - 1) * 100).toFixed(2) + '%')
    * karate.log('===========================================')
    
    # Verify rate limiting behavior
    * assert phase1RateLimitedPct < 20  // Phase 1 should have few rate limits
    * assert phase2RateLimitedPct > 30  // Phase 2 should trigger rate limiting
    * assert phase3RateLimitedPct < 20  // Phase 3 should recover
    
    # Verify performance restored after rate limiting period
    * assert Math.abs(phase3Report.avgDuration - phase1Report.avgDuration) < phase1Report.avgDuration * 0.5
    
  @performance @regression
  Scenario: API Bridge regression testing with performance benchmarks
    # This scenario is for regression testing, comparing against previous benchmarks
    
    # Define benchmark values (update these with actual values after baseline runs)
    * def benchmarks = {
        throughput: 10,           // Expected requests per second
        avgResponseTime: 100,     // Expected average response time in ms
        p95ResponseTime: 200,     // Expected 95th percentile response time in ms
        successRate: 95           // Expected success rate percentage
    }
    
    # Set test parameters
    * def testDuration = 5000     // 5 seconds
    * def concurrentUsers = 5
    * def requestsPerUser = 10
    
    # Create a metrics collector
    * def metrics = createMetricsCollector()
    
    # Log test start
    * karate.log('Starting API Bridge regression test with', concurrentUsers, 'concurrent users')
    * def startTime = timestamp()
    
    # Run the test with concurrent users
    * def results = karate.repeat(concurrentUsers, function(user){
        var userResults = [];
        for (var i = 0; i < requestsPerUser; i++) {
          var result = makeTimedRequest('/test-cases', 'GET', null);
          userResults.push(result);
        }
        return userResults;
    })
    
    # Collect metrics
    * eval for (var u = 0; u < results.length; u++) {
        for (var r = 0; r < results[u].length; r++) {
          metrics.addResult(results[u][r]);
        }
    }
    
    # Calculate test duration
    * def actualDuration = timestamp() - startTime
    
    # Get the report
    * def report = metrics.getReport()
    
    # Log regression test results
    * karate.log('======= API Bridge Regression Test Report =======')
    * karate.log('Test duration:', (actualDuration / 1000).toFixed(2), 'seconds')
    * karate.log('Total requests:', report.requestCount)
    * karate.log('Throughput:', report.throughput, 'requests/second')
    * karate.log('')
    * karate.log('Performance Metrics:')
    * karate.log('  Avg response time:', report.avgDuration.toFixed(2), 'ms', 
        '[Benchmark: ' + benchmarks.avgResponseTime + ' ms]')
    * karate.log('  P95 response time:', report.p95, 'ms', 
        '[Benchmark: ' + benchmarks.p95ResponseTime + ' ms]')
    * karate.log('  Success rate:', report.successRate.toFixed(2) + '%', 
        '[Benchmark: ' + benchmarks.successRate + '%]')
    * karate.log('  Throughput:', report.throughput, 'req/sec', 
        '[Benchmark: ' + benchmarks.throughput + ' req/sec]')
    * karate.log('')
    * karate.log('Response Time Distribution:')
    * karate.log('  0-50ms:', report.responseTimeHistogram["0-50ms"], 'requests')
    * karate.log('  51-100ms:', report.responseTimeHistogram["51-100ms"], 'requests')
    * karate.log('  101-200ms:', report.responseTimeHistogram["101-200ms"], 'requests')
    * karate.log('  201-500ms:', report.responseTimeHistogram["201-500ms"], 'requests')
    * karate.log('  501-1000ms:', report.responseTimeHistogram["501-1000ms"], 'requests')
    * karate.log('  1001+ms:', report.responseTimeHistogram["1001+ms"], 'requests')
    * karate.log('===========================================')
    
    # Calculate regression analysis
    * def regressionAnalysis = {
        throughputChange: ((report.throughput - benchmarks.throughput) / benchmarks.throughput * 100).toFixed(2),
        responseTimeChange: ((report.avgDuration - benchmarks.avgResponseTime) / benchmarks.avgResponseTime * 100).toFixed(2),
        p95Change: ((report.p95 - benchmarks.p95ResponseTime) / benchmarks.p95ResponseTime * 100).toFixed(2),
        successRateChange: (report.successRate - benchmarks.successRate).toFixed(2)
    }
    
    # Log regression analysis
    * karate.log('======= Regression Analysis =======')
    * karate.log('Throughput change:', regressionAnalysis.throughputChange + '%', 
        regressionAnalysis.throughputChange > 0 ? '(Improved)' : '(Degraded)')
    * karate.log('Response time change:', regressionAnalysis.responseTimeChange + '%', 
        regressionAnalysis.responseTimeChange < 0 ? '(Improved)' : '(Degraded)')
    * karate.log('P95 response time change:', regressionAnalysis.p95Change + '%', 
        regressionAnalysis.p95Change < 0 ? '(Improved)' : '(Degraded)')
    * karate.log('Success rate change:', regressionAnalysis.successRateChange + '%', 
        regressionAnalysis.successRateChange > 0 ? '(Improved)' : '(Degraded)')
    * karate.log('===========================================')
    
    # Verify against benchmarks (with some tolerance)
    * assert Math.abs(report.throughput - benchmarks.throughput) / benchmarks.throughput < 0.5  // Within 50% of benchmark
    * assert Math.abs(report.avgDuration - benchmarks.avgResponseTime) / benchmarks.avgResponseTime < 0.5  // Within 50% of benchmark
    * assert report.successRate > benchmarks.successRate * 0.9  // At least 90% of benchmark success rate