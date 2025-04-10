# API Resilience Patterns Usage Guide

This document provides usage examples and best practices for utilizing the resilience patterns implemented in the Skíðblaðnir platform.

## Overview

Skíðblaðnir implements a comprehensive set of resilience patterns to ensure robust API connections:

- **Circuit Breaker**: Prevents cascading failures by stopping calls to failing services
- **Retry with Exponential Backoff**: Attempts failed operations with increasing delays
- **Bulkhead**: Isolates components to prevent cross-component failures
- **Rate Limiting**: Prevents API rate limit violations
- **Caching**: Stores responses to reduce load and provide data during outages
- **Timeout**: Ensures operations complete within a specified time
- **Health Monitoring**: Tracks the health status of all provider connections

## Using the API Bridge

The simplest way to leverage all resilience patterns is through the API Bridge:

```typescript
import { createApiBridge } from '../internal/typescript/api-bridge';
import { AuthenticationMethod } from '../internal/typescript/api-bridge/auth/authentication-handler';

// Create an API Bridge for a provider
const zephyrBridge = createApiBridge({
  baseURL: 'https://api.zephyrscale.smartbear.com/v2',
  serviceName: 'test-case-migration',
  providerName: 'zephyr',
  authentication: {
    credentials: {
      type: AuthenticationMethod.TOKEN,
      token: 'your-zephyr-api-token'
    }
  },
  healthCheckEndpoint: '/health'
});

// Use the bridge to make API calls with resilience
async function fetchTestCases() {
  try {
    // The bridge handles authentication, rate limiting, retries, etc.
    const response = await zephyrBridge.get('/testcases');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test cases:', error);
    throw error;
  }
}

// Check the health status
const status = zephyrBridge.getHealthStatus(); // 'HEALTHY', 'DEGRADED', or 'UNHEALTHY'

// Get detailed metrics
const metrics = zephyrBridge.getMetrics();
console.log('Rate limiting status:', metrics.rateLimiting);
console.log('Circuit breaker status:', metrics.resilience.circuitBreaker);
console.log('Health monitor status:', metrics.healthMonitor);
```

## Direct Use of Resilience Components

For more granular control, you can use the resilience components directly:

### CircuitBreaker

```typescript
import { CircuitBreaker } from '../../packages/common/src/utils/resilience';

// Create a circuit breaker
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,       // Number of failures before tripping
  resetTimeoutMs: 30000,     // Time before allowing half-open state (30s)
  halfOpenSuccessThreshold: 2 // Successes needed to close circuit again
});

// Use the circuit breaker to wrap operations
async function fetchWithCircuitBreaker() {
  return circuitBreaker.execute(async () => {
    // Your API call here
    return await axios.get('https://api.example.com/resource');
  });
}
```

### Retry Service

```typescript
import { RetryService } from '../../packages/common/src/utils/resilience';

// Create a retry service
const retryService = new RetryService({
  maxAttempts: 3,           // Maximum retry attempts
  initialDelayMs: 1000,     // Initial delay between retries (1s)
  maxDelayMs: 10000,        // Maximum delay between retries (10s)
  backoffFactor: 2,         // Exponential factor for backoff
  retryableErrors: [        // Error patterns to retry
    'ECONNRESET', 'ETIMEDOUT', 'network error', /5\d\d/
  ]
});

// Use the retry service
async function fetchWithRetry() {
  return retryService.execute(async () => {
    // Your API call here
    return await axios.get('https://api.example.com/resource');
  });
}
```

### Bulkhead

```typescript
import { Bulkhead } from '../../packages/common/src/utils/resilience';

// Create a bulkhead
const bulkhead = new Bulkhead({
  maxConcurrentCalls: 10,  // Maximum concurrent calls allowed
  maxQueueSize: 100,       // Maximum queue size for pending calls
  executionTimeoutMs: 5000 // Timeout for operations (5s)
});

// Use the bulkhead
async function fetchWithBulkhead() {
  return bulkhead.execute(async () => {
    // Your API call here
    return await axios.get('https://api.example.com/resource');
  });
}
```

### Cache

```typescript
import { ResponseCache } from '../../packages/common/src/utils/resilience';

// Create a cache
const cache = new ResponseCache<any>({
  ttlMs: 300000,           // Cache TTL (5 minutes)
  maxEntries: 1000,        // Maximum cache entries
  staleWhileRevalidate: true // Use stale data during refresh
});

// Use the cache
async function fetchWithCache(key: string) {
  return cache.execute(key, async () => {
    // Your API call here
    return await axios.get('https://api.example.com/resource');
  });
}
```

### ResilienceFacade

The `ResilienceFacade` combines all resilience patterns into a single interface:

```typescript
import { getResilienceFacade } from '../../packages/common/src/utils/resilience';

// Get a resilience facade for a provider
const facade = getResilienceFacade('zephyr');

// Use the facade for API calls
async function fetchWithResilience(url: string) {
  const cacheKey = `GET:${url}`;
  
  return facade.execute(cacheKey, async () => {
    // Your API call here
    return await axios.get(url);
  }, async (error) => {
    // Optional fallback function
    console.warn('Using fallback for:', url);
    return { data: [] }; // Return fallback data
  });
}
```

## Health Monitoring

The health monitoring system tracks the health of all provider connections:

```typescript
import { 
  createGlobalHealthMonitor, 
  registerHealthCheck 
} from '../../packages/common/src/utils/resilience';

// Register a custom health check
registerHealthCheck('custom-provider', async () => {
  try {
    const response = await axios.get('https://api.custom-provider.com/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
});

// Create and start the global health monitor
const healthMonitor = createGlobalHealthMonitor();

// Get health status for a specific provider
const zephyrHealth = healthMonitor.getProviderHealth('zephyr');
console.log('Zephyr health:', zephyrHealth);

// Get overall system health
const systemHealth = healthMonitor.getSystemHealth();
console.log('System health:', systemHealth); // 'UP', 'DEGRADED', or 'DOWN'
```

## Provider-Specific Configurations

Each provider has tailored resilience settings based on its known behavior. These configurations are defined in `provider-configs.ts` and automatically applied when using the API Bridge or `getResilienceFacade()`.

## Best Practices

1. **Use the API Bridge**: For most cases, use the API Bridge for the simplest integration of all resilience patterns.

2. **Configure Provider-Specific Settings**: Customize resilience settings based on each provider's characteristics.

3. **Monitor Health Status**: Regularly check the health status to detect and respond to degraded services.

4. **Log Resilience Events**: Enable logging to track circuit breaker trips, retry attempts, and rate limit events.

5. **Set Appropriate Timeouts**: Configure timeouts based on the expected response time of each provider.

6. **Use Stale Cache Data**: Enable `staleWhileRevalidate` to serve requests during outages.

7. **Implement Fallbacks**: Provide fallback functions to handle failures gracefully.

## Conclusion

By leveraging these resilience patterns, Skíðblaðnir can maintain stability and reliability even when upstream services experience issues. The layered approach to resilience ensures that the system can degrade gracefully and recover automatically when possible.