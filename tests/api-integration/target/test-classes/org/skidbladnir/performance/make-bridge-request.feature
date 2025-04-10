Feature: Helper feature for making API requests through the API Bridge

  Scenario: Make a request through the API Bridge
    # Parameters:
    # - path: The API path to request
    # - method: GET, POST, PUT, DELETE, etc.
    # - body: Request body (optional)
    # - simulateRetries: If true, simulate retry logic (default: false)
    # - maxRetries: Maximum number of retries for transient errors (default: 3)
    # - retryBackoff: Base delay between retries in ms (default: 100)
    
    # Default values if not passed
    * def path = path || '/test-cases'
    * def method = method || 'GET'
    * def body = body || null
    * def simulateRetries = simulateRetries || false
    * def maxRetries = maxRetries || 3
    * def retryBackoff = retryBackoff || 100
    
    # Initialize retry tracking
    * def retries = 0
    * def retryDelays = []
    * def circuitBroken = false
    * def circuitOpenUntil = 0
    
    # Special handling for failure simulation endpoint
    * def isFailureSimulation = path.indexOf('test-with-failures') != -1
    * def failRate = isFailureSimulation ? parseFloat(path.split('failRate=')[1]) : 0
    
    # For simulated failures, determine if this request should fail
    * def shouldFail = isFailureSimulation && Math.random() < failRate
    
    # Set default response for initialization
    * def responseStatus = 0
    * def response = null
    
    # Helper function to determine if an error is transient
    * def isTransientError = 
    """
    function(status) {
      return status >= 500 && status < 600 || status === 429;
    }
    """
    
    # Calculate backoff with exponential delay
    * def calculateBackoff =
    """
    function(retry) {
      var delay = retryBackoff * Math.pow(2, retry - 1);
      var jitter = Math.random() * 0.1 * delay;
      return Math.floor(delay + jitter);
    }
    """
    
    # Check if circuit is open
    * def checkCircuit =
    """
    function() {
      var now = java.lang.System.currentTimeMillis();
      if (circuitOpenUntil > now) {
        // Circuit is open - fast fail
        karate.set('circuitBroken', true);
        karate.set('responseStatus', 503);
        karate.set('response', { error: 'Circuit breaker open', message: 'Too many failures detected' });
        return true;
      }
      return false;
    }
    """
    
    # Execute request with retry logic
    * def executeRequest =
    """
    function() {
      var currentRetry = 0;
      var shouldRetry = true;
      
      while (shouldRetry && currentRetry <= maxRetries) {
        if (currentRetry > 0) {
          retries = currentRetry;
          // Calculate backoff delay
          var delay = calculateBackoff(currentRetry);
          retryDelays.push(delay);
          
          // Wait for backoff period
          java.lang.Thread.sleep(delay);
          
          // Log retry attempt
          karate.log('Retry #' + currentRetry + ' after ' + delay + 'ms for path: ' + path);
        }
        
        // Check if circuit breaker is open
        if (checkCircuit()) {
          break;
        }
        
        // Make the request
        try {
          var requestHeaders = { 'X-API-Bridge': 'true', 'X-Provider': 'karate-test' };
          if (currentRetry > 0) {
            requestHeaders['X-Retry-Count'] = currentRetry.toString();
          }
          
          // Request using core Karate HTTP client
          var request = {
            url: apiBaseUrl + path,
            method: method,
            headers: requestHeaders,
            body: body
          };
          
          var result = karate.http(request);
          karate.set('responseStatus', result.status);
          karate.set('response', result.body);
          
          // For failure simulation, override the response if needed
          if (isFailureSimulation && shouldFail) {
            karate.set('responseStatus', 500);
            karate.set('response', { error: 'Simulated server failure' });
          }
          
          // Determine if we should retry based on response
          if (simulateRetries && isTransientError(result.status)) {
            // Keep retrying for transient errors
            currentRetry++;
            
            // Open circuit if too many failures
            if (currentRetry >= maxRetries) {
              // Set circuit breaker for 30 seconds
              circuitOpenUntil = java.lang.System.currentTimeMillis() + (30 * 1000);
            }
          } else {
            // Success or non-retryable error
            shouldRetry = false;
          }
        } catch (e) {
          // Set error response
          karate.set('responseStatus', 500);
          karate.set('response', { error: 'Request failed: ' + e.message });
          currentRetry++;
        }
      }
    }
    """
    
    # Execute the request (with retries if configured)
    * eval executeRequest()
    
    # Return retry information in the response context
    * def result = { retries: retries, retryDelays: retryDelays, circuitBroken: circuitBroken }
    
    # Accept various status codes
    Then status 200 || status 201 || status 204 || status 400 || status 429 || status 500 || status 503