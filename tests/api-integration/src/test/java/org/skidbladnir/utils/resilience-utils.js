/**
 * Resilience testing utilities to simulate network degradation and test recovery behavior
 */

/**
 * Simulates various network conditions for resilience testing
 * 
 * @param {string} condition - Type of network condition to simulate (latency, packetLoss, connectionDrops, serverErrors, rateLimit, combined)
 * @param {object} config - Configuration parameters for the simulation
 * @returns {object} Simulation status
 */
function simulateNetworkCondition(condition, config) {
  const conditionTypes = ['latency', 'packetLoss', 'connectionDrops', 'serverErrors', 'rateLimit', 'combined', 'catastrophicFailure', 'normal'];
  
  if (!conditionTypes.includes(condition)) {
    karate.log('Invalid network condition type:', condition);
    return { success: false, error: 'Invalid condition type' };
  }
  
  // In a real implementation, this would configure a network proxy to introduce the requested degradation.
  // For this test implementation, we'll use a mock approach where the condition is stored in a global variable
  // and applied by our executeWithRetries/executeWithTimeout functions.
  
  karate.set('__networkCondition', condition);
  karate.set('__networkConfig', config || {});
  
  karate.log('Network condition simulated:', condition, config ? JSON.stringify(config) : '');
  return { success: true, condition: condition, config: config };
}

/**
 * Resets network conditions to normal
 * 
 * @returns {object} Reset status
 */
function resetNetworkConditions() {
  karate.set('__networkCondition', 'normal');
  karate.set('__networkConfig', {});
  karate.log('Network conditions reset to normal');
  return { success: true };
}

/**
 * Apply simulated network conditions to a response
 * 
 * @param {string} condition - The network condition type
 * @param {object} config - The condition configuration
 * @returns {object} - Modified response to simulate network issues
 */
function applyNetworkCondition(condition, config) {
  if (condition === 'normal') {
    return { apply: false };
  }
  
  const result = { apply: true, error: null, delay: 0, statusCode: 200 };
  
  switch (condition) {
    case 'latency':
      // Apply latency with random variance
      const baseLatency = config.latencyMs || 500;
      const variance = config.variance || 0.1;
      const randomFactor = 1 + (Math.random() * variance * 2 - variance);
      result.delay = Math.round(baseLatency * randomFactor);
      break;
      
    case 'packetLoss':
      // Simulate packet loss
      const lossRate = config.rate || 0.1;
      const correlation = config.correlation || 0;
      
      // Use correlation to make packet loss bursty (more realistic)
      const previousLoss = karate.get('__previousPacketLoss') || false;
      const randomValue = Math.random();
      let loss;
      
      if (previousLoss) {
        // If previous packet was lost, higher chance of losing this one
        loss = randomValue < (lossRate + correlation);
      } else {
        // If previous packet was delivered, normal chance of losing this one
        loss = randomValue < lossRate;
      }
      
      karate.set('__previousPacketLoss', loss);
      
      if (loss) {
        result.error = 'Request failed: simulated packet loss';
      }
      break;
      
    case 'connectionDrops':
      // Simulate connection drops
      const dropFrequency = config.frequency || 0.3;
      
      if (Math.random() < dropFrequency) {
        result.error = 'ECONNRESET: Connection reset by peer';
        result.delay = config.duration || 300;
      }
      break;
      
    case 'serverErrors':
      // Simulate server errors (5xx)
      const errorRate = config.failureRate || config.rate || 0.2;
      
      if (Math.random() < errorRate) {
        const statusCodes = config.statusCodes || [500, 502, 503, 504];
        const randomIndex = Math.floor(Math.random() * statusCodes.length);
        result.statusCode = statusCodes[randomIndex];
        result.error = `Server error: ${result.statusCode}`;
      }
      break;
      
    case 'rateLimit':
      // Simulate rate limiting
      const limit = config.limit || 5;
      const windowMs = config.windowMs || 1000;
      
      // Get current counter and timestamp
      const rateData = karate.get('__rateLimitData') || { 
        counter: 0, 
        startTime: Date.now() 
      };
      
      // Reset counter if window has expired
      if (Date.now() - rateData.startTime > windowMs) {
        rateData.counter = 0;
        rateData.startTime = Date.now();
      }
      
      // Increment counter
      rateData.counter++;
      
      // Store updated rate limit data
      karate.set('__rateLimitData', rateData);
      
      // Apply rate limiting if limit exceeded
      if (rateData.counter > limit) {
        result.statusCode = 429;
        result.error = 'Too Many Requests';
        result.headers = { 'Retry-After': (config.retryAfterMs || 1000) / 1000 };
      }
      break;
      
    case 'catastrophicFailure':
      // Simulate complete outage
      result.statusCode = config.statusCode || 500;
      result.error = 'Service unavailable: catastrophic failure';
      break;
      
    case 'combined':
      // Apply combination of different degradations
      
      // 1. Always apply latency
      const combinedLatency = config.latencyMs || 300;
      result.delay = combinedLatency;
      
      // 2. Possibly apply packet loss
      if (Math.random() < (config.packetLossRate || 0.1)) {
        result.error = 'Request failed: simulated packet loss in combined degradation';
        return result;
      }
      
      // 3. Possibly apply server error
      if (Math.random() < (config.failureRate || 0.1)) {
        result.statusCode = 500;
        result.error = 'Server error in combined degradation';
        return result;
      }
      break;
  }
  
  return result;
}

/**
 * Executes an API operation with simulated network conditions and timeout
 * 
 * @param {string} provider - Provider name
 * @param {object} config - Provider configuration
 * @param {string} operation - Operation to execute
 * @param {object} params - Operation parameters
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {object} Operation result
 */
function executeWithTimeout(provider, config, operation, params, timeoutMs) {
  const condition = karate.get('__networkCondition') || 'normal';
  const conditionConfig = karate.get('__networkConfig') || {};
  
  // Apply simulated network conditions
  const conditionResult = applyNetworkCondition(condition, conditionConfig);
  
  // If there's an error from the network condition, return it
  if (conditionResult.apply && conditionResult.error) {
    // Simulate network delay before returning error
    if (conditionResult.delay > 0) {
      java.lang.Thread.sleep(conditionResult.delay);
    }
    
    return {
      error: conditionResult.error,
      statusCode: conditionResult.statusCode
    };
  }
  
  // Simulate network delay
  if (conditionResult.apply && conditionResult.delay > 0) {
    java.lang.Thread.sleep(conditionResult.delay);
  }
  
  try {
    // Validate timeout
    const timeout = timeoutMs || 5000;
    
    // Check if we should simulate timeout
    if (conditionResult.apply && conditionResult.delay > timeout) {
      return {
        error: 'Request timeout: operation took too long to complete',
        timeout: true
      };
    }
    
    // Execute the operation
    const result = karate.call('classpath:org/skidbladnir/utils/provider-operation.feature', {
      provider: provider,
      config: config,
      operation: operation,
      params: params
    });
    
    // Handle rate limiting status code
    if (conditionResult.apply && conditionResult.statusCode === 429) {
      return {
        error: 'Too Many Requests',
        statusCode: 429,
        headers: conditionResult.headers
      };
    }
    
    // Handle other error status codes
    if (conditionResult.apply && conditionResult.statusCode >= 400) {
      return {
        error: `Server returned ${conditionResult.statusCode}`,
        statusCode: conditionResult.statusCode
      };
    }
    
    // Return successful result
    return {
      data: result.body,
      status: result.status,
      error: null
    };
    
  } catch (e) {
    // Handle exceptions
    return {
      error: e.message,
      exception: true
    };
  }
}

/**
 * Executes an API operation with retries when encountering errors
 * 
 * @param {string} provider - Provider name
 * @param {object} config - Provider configuration
 * @param {string} operation - Operation to execute
 * @param {object} params - Operation parameters
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {object} Operation result with retry stats
 */
function executeWithRetries(provider, config, operation, params, maxAttempts) {
  const startTime = Date.now();
  const attempts = maxAttempts || 3;
  let lastError = null;
  let successfulResult = null;
  let attemptCount = 0;
  let retryDelayMs = 200;
  
  // Attempt the operation with retries
  for (let i = 0; i < attempts; i++) {
    attemptCount++;
    
    const result = executeWithTimeout(
      provider,
      config,
      operation,
      params,
      5000
    );
    
    // Check if operation succeeded
    if (!result.error) {
      successfulResult = result;
      break;
    }
    
    lastError = result.error;
    
    // Specific retry behavior for different errors
    if (result.statusCode === 429) {
      // For rate limiting, use the Retry-After header
      const retryAfter = result.headers && result.headers['Retry-After'];
      retryDelayMs = retryAfter ? retryAfter * 1000 : 1000;
    } else {
      // Exponential backoff for other errors
      retryDelayMs = Math.min(retryDelayMs * 2, 5000);
    }
    
    // Abort if it's a circuit breaker error
    if (lastError && lastError.includes('circuit')) {
      break;
    }
    
    // Wait before retrying
    if (i < attempts - 1) {
      java.lang.Thread.sleep(retryDelayMs);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  return {
    success: !!successfulResult,
    data: successfulResult ? successfulResult.data : null,
    error: lastError,
    attempts: attemptCount,
    duration: duration,
    retried: attemptCount > 1
  };
}

/**
 * Executes a batch of requests in parallel
 * 
 * @param {Array} requests - Array of request configurations
 * @returns {Array} Results for each request
 */
function executeRequestBatch(requests) {
  const results = [];
  
  // Define a function to execute a single request
  const executeRequest = function(req) {
    const startTime = Date.now();
    let retried = false;
    let attempt = 1;
    let maxAttempts = 3;
    
    while (attempt <= maxAttempts) {
      const result = executeWithTimeout(
        req.provider,
        req.config,
        req.operation,
        req.params,
        5000
      );
      
      if (!result.error) {
        return {
          success: true,
          data: result.data,
          duration: Date.now() - startTime,
          retried: retried
        };
      }
      
      // For rate limiting, we should retry
      if (result.statusCode === 429) {
        retried = true;
        attempt++;
        
        // Get retry delay from headers or use default
        const retryAfter = result.headers && result.headers['Retry-After'];
        const retryDelayMs = retryAfter ? retryAfter * 1000 : 1000;
        
        // Wait before retrying
        java.lang.Thread.sleep(retryDelayMs);
        continue;
      }
      
      // For other errors, return the error
      return {
        success: false,
        error: result.error,
        statusCode: result.statusCode,
        duration: Date.now() - startTime
      };
    }
    
    return {
      success: false,
      error: 'Exceeded maximum retry attempts',
      duration: Date.now() - startTime,
      retried: retried
    };
  };
  
  // Execute each request
  for (let i = 0; i < requests.length; i++) {
    results.push(executeRequest(requests[i]));
  }
  
  return results;
}

/**
 * Poll migration status until completion or timeout
 * 
 * @param {string} migrationId - ID of the migration to monitor
 * @param {number} timeoutSeconds - Maximum time to wait
 * @returns {object} Final migration status
 */
function pollMigrationStatusUntilComplete(migrationId, timeoutSeconds) {
  const startTime = Date.now();
  const timeoutMs = (timeoutSeconds || 60) * 1000;
  
  while (true) {
    // Check if timeout reached
    if (Date.now() - startTime > timeoutMs) {
      karate.log('Timeout reached while polling migration status');
      return { status: 'TIMEOUT' };
    }
    
    // Get current status
    let response;
    try {
      karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', 
        { migrationId: migrationId });
      
      response = karate.get('response');
    } catch (e) {
      karate.log('Error checking migration status:', e.message);
      java.lang.Thread.sleep(5000);
      continue;
    }
    
    // Check if migration is complete
    const status = response.status;
    if (status === 'COMPLETED' || status === 'COMPLETED_WITH_WARNINGS' || status === 'FAILED') {
      return response;
    }
    
    // Log progress and wait before polling again
    if (response.progress) {
      karate.log('Migration progress:', response.progress + '%');
    }
    
    java.lang.Thread.sleep(5000);
  }
}

/**
 * Create a batch of test cases for resiliency testing
 * 
 * @param {string} provider - Provider name
 * @param {object} providerConfig - Provider configuration
 * @param {number} count - Number of test cases to create
 * @returns {Array} Created test cases
 */
function createTestCaseBatch(provider, providerConfig, count) {
  const testCases = [];
  
  for (let i = 0; i < count; i++) {
    const id = 'TC-RESILIENCE-' + new Date().getTime() + '-' + i;
    const testCase = {
      id: id,
      name: 'Resilience Test Case ' + i,
      description: 'Test case created for resilience testing',
      priority: 'Medium',
      status: 'Active'
    };
    
    try {
      const result = executeWithRetries(
        provider,
        providerConfig,
        'createTestCase',
        { body: testCase },
        3
      );
      
      if (result.success && result.data) {
        testCases.push({
          id: result.data.id || id,
          name: testCase.name
        });
      }
    } catch (e) {
      karate.log('Error creating test case batch:', e);
    }
  }
  
  return testCases;
}

/**
 * Clean up a test case created during resilience testing
 * 
 * @param {string} provider - Provider name
 * @param {object} providerConfig - Provider configuration
 * @param {string} testCaseId - ID of the test case to clean up
 * @returns {boolean} Success status
 */
function cleanupTestCase(provider, providerConfig, testCaseId) {
  try {
    executeWithRetries(
      provider,
      providerConfig,
      'deleteTestCase',
      { id: testCaseId },
      3
    );
    return true;
  } catch (e) {
    karate.log('Error cleaning up test case:', e);
    return false;
  }
}

// Export utility functions
module.exports = {
  simulateNetworkCondition: simulateNetworkCondition,
  resetNetworkConditions: resetNetworkConditions,
  executeWithTimeout: executeWithTimeout,
  executeWithRetries: executeWithRetries,
  executeRequestBatch: executeRequestBatch,
  pollMigrationStatusUntilComplete: pollMigrationStatusUntilComplete,
  createTestCaseBatch: createTestCaseBatch,
  cleanupTestCase: cleanupTestCase
};