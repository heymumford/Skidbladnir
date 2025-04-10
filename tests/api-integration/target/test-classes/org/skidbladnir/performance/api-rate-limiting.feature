Feature: API Rate Limiting
  This feature tests the rate limiting functionality of the API Bridge

  Background:
    * url apiBaseUrl
    * def threadCount = karate.properties['threadCount'] || 10
    * def iterationCount = karate.properties['iterationCount'] || 50
    * def waitTime = 50
    
    # Helper function to make a request
    * def makeRequest =
    """
    function() {
      var response = { status: 0, rateLimited: false, data: null };
      try {
        var result = karate.call('classpath:org/skidbladnir/performance/make-request.feature');
        response.status = result.responseStatus;
        response.data = result.response;
        response.rateLimited = result.responseStatus == 429;
      } catch (e) {
        karate.log('Request failed with error:', e);
        response.status = -1;
      }
      return response;
    }
    """

  @performance
  Scenario: Test API rate limiting with concurrent requests
    # Run multiple concurrent requests to trigger rate limiting
    * def result = karate.repeat(threadCount, function(i){ return { index: i } })
    
    # Process concurrent batches of requests
    * def batchResults = []
    * def rateLimitedCount = 0
    * def successCount = 0
    * def failureCount = 0
    
    * eval for (var b = 0; b < iterationCount; b++) {
        var batch = karate.mapWithKey(result, function(i){ return { result: makeRequest() } }, 'threadIndex');
        for (var i = 0; i < batch.length; i++) {
          var res = batch[i].result;
          if (res.rateLimited) rateLimitedCount++;
          else if (res.status >= 200 && res.status < 300) successCount++;
          else failureCount++;
        }
        batchResults.push({ batchId: b, results: batch });
        java.lang.Thread.sleep(waitTime);
    }
    
    # Verify rate limiting is working
    * karate.log('Rate limited requests:', rateLimitedCount)
    * karate.log('Successful requests:', successCount)
    * karate.log('Failed requests:', failureCount)
    
    # There should be some rate-limited requests
    * assert rateLimitedCount > 0

  @performance
  Scenario: Test rate limiting recovery after threshold period
    # First, trigger rate limiting
    * def triggerRateLimit = karate.repeat(20, function(i){ return { result: makeRequest() } })
    * def initialRateLimited = karate.filter(triggerRateLimit, function(x){ return x.result.rateLimited })
    
    # Wait for rate limit to reset (simulated with 5 seconds)
    * karate.log('Waiting for rate limit reset...')
    * java.lang.Thread.sleep(5000)
    
    # Try requests again
    * def afterRecovery = karate.repeat(5, function(i){ return { result: makeRequest() } })
    * def afterRateLimited = karate.filter(afterRecovery, function(x){ return x.result.rateLimited })
    
    # Verify rate limits recovered
    * karate.log('Initially rate limited:', initialRateLimited.length)
    * karate.log('Rate limited after recovery:', afterRateLimited.length)
    
    # There should be fewer rate-limited requests after recovery
    * assert afterRateLimited.length < initialRateLimited.length