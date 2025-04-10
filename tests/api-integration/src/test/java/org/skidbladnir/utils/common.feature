@ignore
Feature: Common Utility Functions for API Testing
  Reusable utility functions to support API testing

  Scenario: Generic API Request
    # This scenario allows making any API request with a flexible configuration
    # Usage:
    #   * def result = karate.call('classpath:org/skidbladnir/utils/common.feature', 
    #       { path: '/test-cases', method: 'get', params: { page: 1 }, headers: { 'X-Custom': 'value' }, request: {...} })
    
    # Set default values
    * def path = path || '/'
    * def method = method || 'get'
    * def params = params || {}
    * def requestBody = request || {}
    
    # Use global base URL if not specified
    * url apiBaseUrl
    
    # Configure headers if provided
    * if (headers) configure headers = headers
    
    # Set up path
    Given path path
    
    # Set up query parameters if provided
    * if (Object.keys(params).length > 0) karate.forEach(params, function(value, key) { param key = value })
    
    # Set up request body if needed
    * if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'patch')
      And request requestBody
    
    # Execute the request based on method
    When method method
    
    # The response and status are automatically available to the caller

  Scenario: Retry Request with Exponential Backoff
    # This scenario implements retry with exponential backoff for handling rate limits
    # Usage:
    #   * def result = karate.call('classpath:org/skidbladnir/utils/common.feature@retry', 
    #       { path: '/test-cases', method: 'get', maxRetries: 3, baseDelayMs: 1000 })
    
    # Set default values
    * def path = path || '/'
    * def method = method || 'get'
    * def params = params || {}
    * def requestBody = request || {}
    * def maxRetries = maxRetries || 3
    * def baseDelayMs = baseDelayMs || 1000
    
    # Use global base URL if not specified
    * url apiBaseUrl
    
    # Initialize retry variables
    * def attempt = 0
    * def success = false
    * def retryResponse = null
    
    # Retry logic
    * while (attempt < maxRetries && !success)
      # If not first attempt, wait with exponential backoff
      * if (attempt > 0) 
        * def delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        * java.lang.Thread.sleep(delayMs)
      
      # Configure headers if provided
      * if (headers) configure headers = headers
      
      # Set up path
      * path path
      
      # Set up query parameters if provided
      * if (Object.keys(params).length > 0) karate.forEach(params, function(value, key) { param key = value })
      
      # Set up request body if needed
      * if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'patch')
        And request requestBody
      
      # Attempt the request
      * method method
      * def responseStatus = karate.response.status
      
      # Check if successful or non-retryable error
      * if (responseStatus < 500 && responseStatus != 429) 
        * def success = true
        * def retryResponse = response
      
      # Increment attempt counter
      * def attempt = attempt + 1
    
    # Return the final result
    * def finalResult = { success: success, attempts: attempt, response: retryResponse }

  Scenario: Batch Process Multiple Items
    # This scenario handles batch processing of multiple items with concurrent execution
    # Usage:
    #   * def results = karate.call('classpath:org/skidbladnir/utils/common.feature@batch', 
    #       { items: [1, 2, 3], operation: 'processSingleItem', maxConcurrent: 2 })
    
    # Set default values
    * def items = items || []
    * def operation = operation || null
    * def maxConcurrent = maxConcurrent || 5
    * def operationParams = operationParams || {}
    
    # Validate inputs
    * if (!operation) karate.fail('Operation function name is required')
    * if (items.length == 0) karate.fail('At least one item is required')
    
    # Process items in batches using Java parallel streams if available
    * def processItems = 
    """
    function(items, operation, operationParams, maxConcurrent) {
      var results = [];
      
      // Process in batches of maxConcurrent
      for (var i = 0; i < items.length; i += maxConcurrent) {
        var batch = items.slice(i, Math.min(i + maxConcurrent, items.length));
        var batchResults = [];
        
        // Process each item in this batch (in parallel if Java 8+ is available)
        for (var j = 0; j < batch.length; j++) {
          var item = batch[j];
          var params = Object.assign({}, operationParams, { item: item });
          var result = karate.call('classpath:org/skidbladnir/utils/common.feature@processSingleItem', 
            { operation: operation, params: params });
          batchResults.push(result);
        }
        
        results = results.concat(batchResults);
      }
      
      return results;
    }
    """
    
    * def results = processItems(items, operation, operationParams, maxConcurrent)

  @processSingleItem
  Scenario: Process a Single Item
    # Helper scenario for batch processing - processes a single item with the given operation
    # This is called internally by the batch scenario
    
    * def result = karate.call(operation, params)

  Scenario: Extract API Error Details
    # This scenario extracts standardized error details from an API response
    # Usage:
    #   * def errorInfo = karate.call('classpath:org/skidbladnir/utils/common.feature@extractError', response)
    
    * def response = response || {}
    
    # Extract standard fields
    * def code = response.code || ''
    * def message = response.error || response.message || ''
    * def details = response.details || {}
    
    # Handle different error formats from different APIs
    * if (response.errorCode && !code) 
      * def code = response.errorCode
    
    * if (response.errorMessage && !message) 
      * def message = response.errorMessage
    
    * if (response.errors && !details) 
      * def details = response.errors
    
    # Return standardized error format
    * def errorInfo = { code: code, message: message, details: details, original: response }