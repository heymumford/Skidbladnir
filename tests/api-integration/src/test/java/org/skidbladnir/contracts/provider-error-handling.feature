Feature: Provider Error Handling Patterns
  This feature validates the consistent error handling patterns across different providers.
  It tests that error messages, formatting, and recovery follow the same patterns regardless of the provider.

  Background:
    * url apiBaseUrl
    * def zephyrBasePath = '/api/zephyr'
    * def qtestBasePath = '/api/qtest'
    
    # Schema for the standard error format we expect from our error handler
    * def standardErrorSchema = 
    """
    {
      error: '#string',
      code: '##string',
      service: '#string',
      operation: '##string',
      timestamp: '##string',
      details: '##object',
      requestId: '##string'
    }
    """
    
    # Helper functions to simulate different error conditions
    * def simulateNetworkError =
    """
    function() {
      return { 
        url: 'https://non-existent-domain-for-testing.example',
        method: 'GET'
      };
    }
    """
    
    * def simulateTimeoutError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return { 
          url: apiBaseUrl + zephyrBasePath + '/simulate-timeout',
          method: 'GET'
        };
      } else {
        return { 
          url: apiBaseUrl + qtestBasePath + '/simulate-timeout',
          method: 'GET'
        };
      }
    }
    """
    
    * def simulateAuthError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/auth',
          method: 'POST',
          body: { apiToken: 'invalid-token' }
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/auth',
          method: 'POST',
          body: { username: 'invalid', password: 'invalid' }
        };
      }
    }
    """
    
    * def simulateAuthorizationError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/secured-resource',
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-but-insufficient-permissions' }
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/secured-resource',
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-but-insufficient-permissions' }
        };
      }
    }
    """
    
    * def simulateValidationError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/test-cases',
          method: 'POST',
          body: { /* missing required name field */ }
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/test-cases',
          method: 'POST',
          body: { /* missing required name field */ }
        };
      }
    }
    """
    
    * def simulateNotFoundError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/test-cases/non-existent-id',
          method: 'GET'
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/test-cases/non-existent-id',
          method: 'GET'
        };
      }
    }
    """
    
    * def simulateServerError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/simulate-server-error',
          method: 'GET'
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/simulate-server-error',
          method: 'GET'
        };
      }
    }
    """
    
    * def simulateRateLimitError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/simulate-rate-limit',
          method: 'GET'
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/simulate-rate-limit',
          method: 'GET'
        };
      }
    }
    """
    
    * def simulateConflictError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/test-cases/conflict',
          method: 'PUT',
          body: { name: 'Conflicting Test Case', version: 'outdated-version' }
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/test-cases/conflict',
          method: 'PUT',
          body: { name: 'Conflicting Test Case', version: 'outdated-version' }
        };
      }
    }
    """
    
    * def simulateUnprocessableEntityError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/test-cases/complex-validation',
          method: 'POST',
          body: { name: 'Invalid Test Case', status: 'INVALID_STATUS' }
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/test-cases/complex-validation',
          method: 'POST',
          body: { name: 'Invalid Test Case', status: 'INVALID_STATUS' }
        };
      }
    }
    """
    
    * def simulateBatchOperationError =
    """
    function(provider) {
      if (provider === 'zephyr') {
        return {
          url: apiBaseUrl + zephyrBasePath + '/test-cases/batch',
          method: 'POST',
          body: [
            { name: 'Valid Test Case 1' },
            { /* missing name */ },
            { name: 'Valid Test Case 2' }
          ]
        };
      } else {
        return {
          url: apiBaseUrl + qtestBasePath + '/test-cases/batch',
          method: 'POST',
          body: [
            { name: 'Valid Test Case 1' },
            { /* missing name */ },
            { name: 'Valid Test Case 2' }
          ]
        };
      }
    }
    """

  # Test cases for error handling behavior with Zephyr
  Scenario Outline: Zephyr provider error handling - <errorType>
    * def errorConfig = call <simulationFunction> 'zephyr'
    
    Given url errorConfig.url
    And request errorConfig.body
    And headers errorConfig.headers || {}
    When method errorConfig.method
    Then status <expectedStatus>
    And match response == standardErrorSchema
    And match response.service == 'Zephyr Scale'
    And match response.error contains '<errorPattern>'
    * eval <additionalAssertions>

    Examples:
      | errorType                | simulationFunction              | expectedStatus | errorPattern         | additionalAssertions                                     |
      | Not Found                | simulateNotFoundError           | 404           | not found            | And match response.code == 'NOT_FOUND'                   |
      | Validation               | simulateValidationError         | 400           | validation           | And match response.details.fields != null                |
      | Authentication           | simulateAuthError               | 401           | Authentication       | And match response.code == 'UNAUTHORIZED'                |
      | Authorization            | simulateAuthorizationError      | 403           | Permission           | And match response.code == 'FORBIDDEN'                   |
      | Server Error             | simulateServerError             | 500           | server error         | And match response.code == 'SERVER_ERROR'                |
      | Rate Limit               | simulateRateLimitError          | 429           | rate limit           | And match response.details.retryAfter != null            |
      | Timeout                  | simulateTimeoutError            | 504           | timeout              | And match response.code == 'GATEWAY_TIMEOUT'             |
      | Conflict                 | simulateConflictError           | 409           | conflict             | And match response.code == 'CONFLICT'                    |
      | Unprocessable Entity     | simulateUnprocessableEntityError| 422           | validation           | And match response.code == 'UNPROCESSABLE_ENTITY'        |
      | Batch Operation Errors   | simulateBatchOperationError     | 400           | batch                | And match response.details.errors != null                |

  # Test cases for error handling behavior with qTest
  Scenario Outline: qTest provider error handling - <errorType>
    * def errorConfig = call <simulationFunction> 'qtest'
    
    Given url errorConfig.url
    And request errorConfig.body
    And headers errorConfig.headers || {}
    When method errorConfig.method
    Then status <expectedStatus>
    And match response == standardErrorSchema
    And match response.service contains 'qTest'
    And match response.error contains '<errorPattern>'
    * eval <additionalAssertions>

    Examples:
      | errorType                | simulationFunction              | expectedStatus | errorPattern         | additionalAssertions                                     |
      | Not Found                | simulateNotFoundError           | 404           | not found            | And match response.code == 'NOT_FOUND'                   |
      | Validation               | simulateValidationError         | 400           | validation           | And match response.details.fields != null                |
      | Authentication           | simulateAuthError               | 401           | Authentication       | And match response.code == 'UNAUTHORIZED'                |
      | Authorization            | simulateAuthorizationError      | 403           | Permission           | And match response.code == 'FORBIDDEN'                   |
      | Server Error             | simulateServerError             | 500           | server error         | And match response.code == 'SERVER_ERROR'                |
      | Rate Limit               | simulateRateLimitError          | 429           | rate limit           | And match response.details.retryAfter != null            |
      | Timeout                  | simulateTimeoutError            | 504           | timeout              | And match response.code == 'GATEWAY_TIMEOUT'             |
      | Conflict                 | simulateConflictError           | 409           | conflict             | And match response.code == 'CONFLICT'                    |
      | Unprocessable Entity     | simulateUnprocessableEntityError| 422           | validation           | And match response.code == 'UNPROCESSABLE_ENTITY'        |
      | Batch Operation Errors   | simulateBatchOperationError     | 400           | batch                | And match response.details.errors != null                |

  # Test for security - sensitive information redaction
  Scenario: Sensitive information is redacted in error responses
    # Test with Zephyr provider - API Token
    Given url apiBaseUrl + zephyrBasePath + '/auth'
    And request { apiToken: 'secret-token-value', username: 'testuser' }
    When method POST
    Then status 401
    And match response == standardErrorSchema
    And match response.error !contains 'secret-token-value'
    And match response.details.params !contains 'secret-token-value'
    And match response.details.params contains '***REDACTED***'
    And match response.details.params.username == 'testuser'
    
    # Test with Zephyr provider - OAuth token in header
    Given url apiBaseUrl + zephyrBasePath + '/secured-resource'
    And header Authorization = 'Bearer oauth-token-123456'
    When method GET
    Then status 401
    And match response == standardErrorSchema
    And match response.error !contains 'oauth-token-123456'
    And match response.details.headers !contains 'oauth-token-123456'
    And match response.details.headers.Authorization contains '***REDACTED***'
    
    # Test with qTest provider - Username/Password
    Given url apiBaseUrl + qtestBasePath + '/auth'
    And request { username: 'testuser', password: 'secret-password' }
    When method POST
    Then status 401
    And match response == standardErrorSchema
    And match response.error !contains 'secret-password'
    And match response.details.params !contains 'secret-password'
    And match response.details.params contains '***REDACTED***'
    And match response.details.params.username == 'testuser'
    
    # Test with qTest provider - API key in query parameter
    Given url apiBaseUrl + qtestBasePath + '/projects'
    And param apiKey = 'sensitive-api-key-12345'
    When method GET
    Then status 401
    And match response == standardErrorSchema
    And match response.error !contains 'sensitive-api-key-12345'
    And match response.details.params !contains 'sensitive-api-key-12345'
    And match response.details.params.apiKey contains '***REDACTED***'
    
    # Test redaction of pattern-matching data like credit cards and passwords
    Given url apiBaseUrl + zephyrBasePath + '/test-cases'
    And request { name: 'Test Case', description: 'Contains sensitive data: 4111-1111-1111-1111 and password123' }
    When method POST
    Then status 400
    And match response == standardErrorSchema
    And match response.error !contains '4111-1111-1111-1111'
    And match response.error !contains 'password123'
    And match response.details.params.description contains '***REDACTED***'

  # Test for error context information
  Scenario: Error responses include operation context information
    Given url apiBaseUrl + zephyrBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response == standardErrorSchema
    And match response.operation == 'getTestCase'
    And match response.details.params.testCaseId == 'non-existent-id'
    
    Given url apiBaseUrl + qtestBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response == standardErrorSchema
    And match response.operation == 'getTestCase'
    And match response.details.params.testCaseId == 'non-existent-id'

  # Test for retry mechanism with transient errors
  Scenario: Retry mechanism handles transient errors
    # The client will retry automatically for certain error types
    Given url apiBaseUrl + zephyrBasePath + '/retry-test'
    When method GET
    Then status 200
    And match response.retriedCount == 2
    And match response.requestId != null
    
    Given url apiBaseUrl + qtestBasePath + '/retry-test'
    When method GET
    Then status 200
    And match response.retriedCount == 2
    And match response.requestId != null

  # Test for consistent error handling with rate limiting
  Scenario: Rate limiting is handled consistently across providers
    Given url apiBaseUrl + zephyrBasePath + '/rate-limit-test'
    When method GET
    Then status 429
    And match response == standardErrorSchema
    And match response.details.retryAfter != null
    
    Given url apiBaseUrl + qtestBasePath + '/rate-limit-test'
    When method GET
    Then status 429
    And match response == standardErrorSchema
    And match response.details.retryAfter != null
    
  # Test for circuit breaker pattern
  Scenario: Circuit breaker prevents cascading failures
    # First call to trigger circuit breaker state change
    Given url apiBaseUrl + zephyrBasePath + '/circuit-breaker-test'
    When method GET
    Then status 500
    And match response.error contains 'server error'
    
    # Second call should short-circuit and return immediately
    Given url apiBaseUrl + zephyrBasePath + '/circuit-breaker-test'
    When method GET
    Then status 503
    And match response.error contains 'circuit breaker'
    And match response.code == 'CIRCUIT_OPEN'
    And match response.details.reopenAfter != null
    
    # Verify qTest circuit breaker behaves the same way
    Given url apiBaseUrl + qtestBasePath + '/circuit-breaker-test'
    When method GET
    Then status 500
    And match response.error contains 'server error'
    
    Given url apiBaseUrl + qtestBasePath + '/circuit-breaker-test'
    When method GET
    Then status 503
    And match response.error contains 'circuit breaker'
    And match response.code == 'CIRCUIT_OPEN'
    And match response.details.reopenAfter != null
    
  # Test for development vs production error details
  Scenario: Error responses include stack traces in development mode only
    # Set environment to development
    * def originalEnv = karate.get('env.NODE_ENV') || 'development'
    * karate.set('env.NODE_ENV', 'development')
    
    Given url apiBaseUrl + zephyrBasePath + '/simulate-server-error'
    When method GET
    Then status 500
    And match response.error contains 'server error'
    And match response.details.stack != null
    
    # Set environment to production
    * karate.set('env.NODE_ENV', 'production')
    
    Given url apiBaseUrl + zephyrBasePath + '/simulate-server-error' 
    When method GET
    Then status 500
    And match response.error contains 'server error'
    And match response.details.stack == null
    
    # Reset environment
    * karate.set('env.NODE_ENV', originalEnv)
    
  # Test for error correlation IDs
  Scenario: Error correlation IDs are maintained across calls
    # First call generates an error with correlation ID
    Given url apiBaseUrl + zephyrBasePath + '/correlated-error'
    When method GET
    Then status 500
    And match response.requestId != null
    
    * def correlationId = response.requestId
    
    # Second call with correlation header should preserve the ID
    Given url apiBaseUrl + zephyrBasePath + '/correlated-error'
    And header X-Correlation-ID = correlationId
    When method GET
    Then status 500
    And match response.requestId == correlationId
    
  # Test for batch operation partial success handling
  Scenario: Batch operations properly handle partial success
    Given url apiBaseUrl + zephyrBasePath + '/test-cases/batch-partial'
    And request 
    """
    [
      { "name": "Valid Test Case 1" },
      { },
      { "name": "Valid Test Case 2" }
    ]
    """
    When method POST
    Then status 207
    And match response.results[0].status == 201
    And match response.results[1].status == 400
    And match response.results[1].error != null
    And match response.results[2].status == 201
    
    # Verify qTest behaves the same way
    Given url apiBaseUrl + qtestBasePath + '/test-cases/batch-partial'
    And request 
    """
    [
      { "name": "Valid Test Case 1" },
      { },
      { "name": "Valid Test Case 2" }
    ]
    """
    When method POST
    Then status 207
    And match response.results[0].status == 201
    And match response.results[1].status == 400
    And match response.results[1].error != null
    And match response.results[2].status == 201
    
  # Test for provider-specific error code normalization
  Scenario: Provider-specific error codes are normalized to standard error codes
    # Zephyr uses specific error codes that should be normalized
    Given url apiBaseUrl + zephyrBasePath + '/provider-specific-error'
    When method GET
    Then status 400
    And match response == standardErrorSchema
    And match response.code == 'VALIDATION_ERROR'  # Normalized code
    
    # qTest uses different error codes for the same concept
    Given url apiBaseUrl + qtestBasePath + '/provider-specific-error'
    When method GET
    Then status 400
    And match response == standardErrorSchema
    And match response.code == 'VALIDATION_ERROR'  # Same normalized code
    
    # Test another error type normalization
    Given url apiBaseUrl + zephyrBasePath + '/provider-specific-auth-error'
    When method GET
    Then status 401
    And match response == standardErrorSchema
    And match response.code == 'UNAUTHORIZED'  # Normalized code
    
    Given url apiBaseUrl + qtestBasePath + '/provider-specific-auth-error'
    When method GET
    Then status 401
    And match response == standardErrorSchema
    And match response.code == 'UNAUTHORIZED'  # Same normalized code
    
  # Test for fallback mechanism when primary operation fails
  Scenario: Fallback mechanism is triggered when primary operation fails
    Given url apiBaseUrl + zephyrBasePath + '/with-fallback'
    When method GET
    Then status 200
    And match response.usedFallback == true
    And match response.message contains 'fallback'
    
    Given url apiBaseUrl + qtestBasePath + '/with-fallback'
    When method GET
    Then status 200
    And match response.usedFallback == true
    And match response.message contains 'fallback'