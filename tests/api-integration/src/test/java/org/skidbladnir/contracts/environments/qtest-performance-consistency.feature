Feature: qTest API Performance and Rate Limiting Consistency
  This feature validates that the qTest API has consistent rate limiting and performance
  characteristics across different environments.

  Background:
    # Common setup for all scenarios
    * def environments = 
    """
    {
      "dev": {
        "baseUrl": "https://dev-api.qtest.com/api/v3",
        "apiKey": "#(qtestDevApiKey)",
        "projectId": "12345"
      },
      "qa": {
        "baseUrl": "https://qa-api.qtest.com/api/v3",
        "apiKey": "#(qtestQaApiKey)", 
        "projectId": "23456"
      },
      "prod": {
        "baseUrl": "https://api.qtest.com/api/v3",
        "apiKey": "#(qtestProdApiKey)",
        "projectId": "34567"
      }
    }
    """
    
    # Helper functions
    * def authenticate = 
    """
    function(env) {
      var request = {
        url: env.baseUrl + '/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { apiKey: env.apiKey }
      };
      
      var response = karate.http(request);
      
      if (response.status == 200 && response.body.access_token) {
        return response.body.access_token;
      } else {
        karate.log('Authentication failed for environment: ' + JSON.stringify(env));
        return null;
      }
    }
    """
    
    * def makeRequest = 
    """
    function(env, path, method, headers, body) {
      var token = authenticate(env);
      
      if (!token) {
        return { status: 401, error: 'Failed to authenticate' };
      }
      
      var allHeaders = { 'Authorization': 'Bearer ' + token };
      if (headers) {
        for (var key in headers) {
          allHeaders[key] = headers[key];
        }
      }
      
      var request = {
        url: env.baseUrl + path,
        method: method || 'GET',
        headers: allHeaders
      };
      
      if (body) {
        request.body = body;
      }
      
      return karate.http(request);
    }
    """

  @CrossEnvironment @RateLimiting
  Scenario Outline: Verify rate limit header consistency across environments
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects', 'GET')
    
    * match response.status == 200
    
    # Validate rate limit headers are present and consistent in format
    * match response.headers['X-RateLimit-Limit'] == '#present'
    * match response.headers['X-RateLimit-Remaining'] == '#present'
    * match response.headers['X-RateLimit-Reset'] == '#present'
    
    # Store values for comparison
    * def limit = response.headers['X-RateLimit-Limit']
    * def remaining = response.headers['X-RateLimit-Remaining']
    * def reset = response.headers['X-RateLimit-Reset']
    
    * karate.set('rateLimit_' + '<environment>', { limit: limit, remaining: remaining, reset: reset })
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    # Compare rate limit values between environments
    * def devLimit = rateLimit_dev.limit
    * def qaLimit = rateLimit_qa.limit
    * def prodLimit = rateLimit_prod.limit
    
    # Log the comparisons
    * print 'Rate limits by environment - Dev:', devLimit, 'QA:', qaLimit, 'Prod:', prodLimit
    
    # QA and production environments should have similar rate limits
    * assert qaLimit == prodLimit
    
  @CrossEnvironment @RateLimiting
  Scenario Outline: Validate rate limit enforcement across environments
    * def env = environments['<environment>']
    * def count = 3  # Make a small number of concurrent requests
    
    # Define a function to make a request and capture response time
    * def makeTimedRequest = 
    """
    function() {
      var start = new Date().getTime();
      var response = makeRequest(env, '/projects', 'GET');
      var end = new Date().getTime();
      return {
        status: response.status,
        time: end - start,
        rateLimitRemaining: response.headers['X-RateLimit-Remaining'],
        rateLimitLimit: response.headers['X-RateLimit-Limit']
      };
    }
    """
    
    # Make several requests and measure response time pattern
    * def results = karate.repeat(count, makeTimedRequest)
    
    # Check that no requests were rate limited
    * def rateLimited = karate.filter(results, function(x){ return x.status == 429 })
    * assert rateLimited.length == 0
    
    # Calculate average response time
    * def totalTime = karate.reduce(results, function(acc, result){ return acc + result.time }, 0)
    * def avgTime = totalTime / results.length
    
    # Save for comparison
    * karate.set('perfMetrics_' + '<environment>', { averageTime: avgTime, results: results })
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    # Compare performance metrics between environments
    * def devAvgTime = perfMetrics_dev.averageTime
    * def qaAvgTime = perfMetrics_qa.averageTime
    * def prodAvgTime = perfMetrics_prod.averageTime
    
    # Log performance metrics for comparison
    * print 'Avg response times (ms) - Dev:', devAvgTime, 'QA:', qaAvgTime, 'Prod:', prodAvgTime
    
    # Ensure QA and Prod have relatively similar performance (within 50% of each other)
    * def performanceDiff = Math.abs(qaAvgTime - prodAvgTime) / Math.max(qaAvgTime, prodAvgTime)
    * assert performanceDiff < 0.5
    
  @CrossEnvironment @RateLimiting
  Scenario Outline: Test rate limit behavior with burst requests
    * def env = environments['<environment>']
    * def burstSize = 5  # Number of concurrent requests in the burst
    
    # Configure for parallel execution
    * configure concurrent = burstSize
    
    # Create a background task for each request in the burst
    * def parallelRequests = karate.range(0, burstSize).map(i => { return { id: i } })
    
    # Execute the burst and collect results
    * def result = karate.forEach(parallelRequests, function(req) {
        var response = makeRequest(env, '/projects', 'GET');
        return {
          status: response.status,
          rateLimitRemaining: response.headers['X-RateLimit-Remaining'],
          rateLimitReset: response.headers['X-RateLimit-Reset'],
          requestId: req.id
        };
      })
    
    # Count how many requests were rate limited, if any
    * def rateLimited = karate.filter(result, function(x){ return x.status == 429 })
    * def rateLimitedCount = rateLimited.length
    
    # Store results for this environment
    * karate.set('burstTest_' + '<environment>', { totalRequests: burstSize, rateLimited: rateLimitedCount, results: result })
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    # Compare rate limiting behavior across environments
    * def devRateLimited = burstTest_dev.rateLimited
    * def qaRateLimited = burstTest_qa.rateLimited
    * def prodRateLimited = burstTest_prod.rateLimited
    
    * print 'Rate limited counts - Dev:', devRateLimited, 'QA:', qaRateLimited, 'Prod:', prodRateLimited
    
    # QA and Prod should have consistent rate limiting behavior
    * match qaRateLimited == prodRateLimited
    
  @CrossEnvironment @RateLimiting
  Scenario Outline: Test retry-after header consistency
    * def env = environments['<environment>']
    
    # Try to hit the rate limit by making multiple requests
    * def reqCount = 10
    * def results = []
    
    # Keep making requests until we hit a rate limit or reach our count
    * def makeRequestsUntilLimited = 
    """
    function() {
      for (var i = 0; i < reqCount; i++) {
        var response = makeRequest(env, '/projects', 'GET');
        results.push({
          status: response.status,
          rateLimitRemaining: response.headers['X-RateLimit-Remaining'],
          retryAfter: response.headers['Retry-After']
        });
        
        if (response.status == 429) {
          break;  // We hit the rate limit
        }
        
        // Short delay between requests
        java.lang.Thread.sleep(100);
      }
    }
    """
    
    * eval makeRequestsUntilLimited()
    
    # Check if we hit a rate limit
    * def limitHit = karate.filter(results, function(x){ return x.status == 429 })
    * def hitRateLimit = limitHit.length > 0
    
    # Store information about retry headers for this environment
    * def retryHeaderPresent = hitRateLimit && limitHit[0].retryAfter != null
    * karate.set('retryTest_' + '<environment>', { 
        hitRateLimit: hitRateLimit, 
        retryHeaderPresent: retryHeaderPresent,
        retryValue: hitRateLimit ? limitHit[0].retryAfter : null
      })
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # If any environment hit rate limits, check header consistency
    * def atLeastOneHitLimit = retryTest_dev.hitRateLimit || retryTest_qa.hitRateLimit || retryTest_prod.hitRateLimit
    
    * if (atLeastOneHitLimit) {
        if (retryTest_qa.hitRateLimit && retryTest_prod.hitRateLimit) {
          assert retryTest_qa.retryHeaderPresent == retryTest_prod.retryHeaderPresent
        }
      }
    
    * print 'Rate limit hit results:', retryTest_dev, retryTest_qa, retryTest_prod