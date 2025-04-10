# API Bridge Architecture

The API Bridge is a core component of Skíðblaðnir that provides a unified interface for making resilient API calls to external providers. This document outlines its architecture, components, and usage patterns.

## Overview

The API Bridge addresses several challenges in distributed systems:

1. **Resilience**: Handling transient failures and service outages
2. **Authentication**: Managing different authentication mechanisms
3. **Rate Limiting**: Preventing API rate limit violations
4. **Health Monitoring**: Tracking the health status of provider connections
5. **Unified Interface**: Providing a consistent API across different providers

## Architecture

The API Bridge is built using a modular architecture with the following components:

```
┌─────────────────────────────────────────────────────┐
│                    API Bridge                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐     ┌─────────────────────┐   │
│  │ Authentication   │     │ Rate Limiter        │   │
│  │ Handler          │     │                     │   │
│  └──────────────────┘     └─────────────────────┘   │
│                                                     │
│  ┌──────────────────┐     ┌─────────────────────┐   │
│  │ Resilient API    │     │ Health Monitor      │   │
│  │ Client           │     │                     │   │
│  └──────────────────┘     └─────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              Resilience Patterns              │   │
│  │                                              │   │
│  │  ┌─────────┐ ┌───────┐ ┌─────────┐ ┌──────┐  │   │
│  │  │ Circuit │ │ Retry │ │ Bulkhead│ │ Cache│  │   │
│  │  │ Breaker │ │       │ │         │ │      │  │   │
│  │  └─────────┘ └───────┘ └─────────┘ └──────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Components

1. **Authentication Handler**: Manages different authentication methods (Token, Basic, OAuth) and handles token refresh.

2. **Resilient API Client**: Implements circuit breaker, retry logic, and timeout handling for HTTP requests.

3. **Rate Limiter**: Prevents API rate limit violations by throttling requests and handling rate limit responses.

4. **Health Monitor**: Tracks the health status of provider connections and provides overall system health.

5. **Resilience Patterns**:
   - **Circuit Breaker**: Prevents cascading failures by stopping calls to failing services
   - **Retry**: Attempts operations multiple times with exponential backoff
   - **Bulkhead**: Isolates failures by limiting concurrent operations
   - **Cache**: Stores responses to reduce load and provide data during outages

## Usage

### Creating an API Bridge

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
```

### Making API Calls

```typescript
// GET request
const testCases = await zephyrBridge.get('/testcases');

// POST request with data
const newTestCase = await zephyrBridge.post('/testcases', {
  name: 'New Test Case',
  description: 'Created via API Bridge'
});

// PUT request
await zephyrBridge.put(`/testcases/${id}`, updatedData);

// DELETE request
await zephyrBridge.delete(`/testcases/${id}`);
```

### Request Cancellation

```typescript
// Create a cancel token source
const source = zephyrBridge.createCancelTokenSource();

// Start the request with the cancel token
const promise = zephyrBridge.get('/large-response', {
  cancelToken: source.token
});

// Cancel the request if needed
setTimeout(() => {
  source.cancel('Operation canceled by the user');
}, 5000);

try {
  const result = await promise;
  // Handle result
} catch (error) {
  if (zephyrBridge.isCancel(error)) {
    console.log('Request was canceled:', error.message);
  } else {
    console.error('Request failed:', error);
  }
}
```

### Health Monitoring

```typescript
// Get the current health status
const status = zephyrBridge.getHealthStatus(); // 'HEALTHY', 'DEGRADED', or 'UNHEALTHY'

// Get detailed metrics
const metrics = zephyrBridge.getMetrics();
console.log('Rate limiting status:', metrics.rateLimiting);
console.log('Circuit breaker status:', metrics.resilience.circuitBreaker);
console.log('Health monitor status:', metrics.healthMonitor);

// Manually check health
const isHealthy = await zephyrBridge.checkHealth();
```

### Resetting Resilience State

```typescript
// Reset circuit breaker and rate limiter state
zephyrBridge.reset();
```

## Provider-Specific Configurations

Each provider has tailored resilience settings based on its known behavior:

```typescript
// Provider configurations are automatically applied
const zephyrConfig = {
  retryOptions: {
    maxAttempts: 3,
    initialDelayMs: 800,
    maxDelayMs: 12000,
    backoffFactor: 1.8
  },
  circuitBreakerOptions: {
    failureThreshold: 6,
    resetTimeoutMs: 40000,
    halfOpenSuccessThreshold: 2
  },
  // Additional provider-specific settings...
};
```

## Authentication Methods

The API Bridge supports three authentication methods:

### Token Authentication

```typescript
const credentials = {
  type: AuthenticationMethod.TOKEN,
  token: 'your-api-token',
  // Optional
  tokenHeaderName: 'X-API-Key', // Default: 'Authorization'
  tokenPrefix: '' // Default: 'Bearer '
};
```

### Password Authentication

```typescript
const credentials = {
  type: AuthenticationMethod.PASSWORD,
  username: 'your-username',
  password: 'your-password',
  loginUrl: 'https://api.example.com/login'
};
```

### OAuth Authentication

```typescript
const credentials = {
  type: AuthenticationMethod.OAUTH,
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tokenUrl: 'https://api.example.com/oauth/token',
  grantType: 'client_credentials',
  scope: 'read write' // Optional
};
```

## Testing

To run the API Bridge tests:

```bash
./scripts/test-api-bridge.js
```

## Integration with Other Components

The API Bridge integrates with:

1. **Provider Adapters**: Each provider uses the API Bridge for all API calls
2. **Orchestrator**: Orchestrator uses the API Bridge to communicate with the API service
3. **UI**: UI components use the API Bridge for backend communication

## Future Enhancements

Planned enhancements for the API Bridge:

1. **Service Discovery**: Dynamic discovery of provider endpoints
2. **API Versioning**: Handling different API versions gracefully
3. **Schema Validation**: Validating requests and responses against schemas
4. **Metrics Collection**: Collecting detailed metrics for API calls
5. **Self-Healing**: Automatically adjusting to provider API changes