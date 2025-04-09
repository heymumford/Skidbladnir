# API Rate Limiting

This module provides rate limiting capabilities for the API Bridge. It helps manage API rate limits by throttling requests and adapting to API responses.

## Features

- Provider-specific rate limit configurations
- Adaptive delay based on usage patterns
- Automatic backoff when approaching rate limits
- Support for different rate limit response headers
- Integration with Axios for seamless HTTP request throttling

## Usage

### Basic Usage

```typescript
import { getRateLimiter } from './rate-limiter-factory';
import axios from 'axios';

// Get the singleton rate limiter instance
const rateLimiter = getRateLimiter();

// Create an axios instance
const api = axios.create({
  baseURL: 'https://api.example.com'
});

// Apply rate limiting interceptors for a specific provider
const interceptors = rateLimiter.createAxiosInterceptor('rally');

// Add request interceptor to throttle outgoing requests
api.interceptors.request.use(interceptors.request);

// Add response interceptor to handle rate limit responses
api.interceptors.response.use(interceptors.response, interceptors.error);

// Now all requests through this axios instance will be rate limited
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### Manual Throttling

```typescript
import { getRateLimiter } from './rate-limiter-factory';

async function makeApiCall() {
  const rateLimiter = getRateLimiter();
  
  // Wait for appropriate delay before making request
  await rateLimiter.throttle('jira');
  
  // Make API call...
  
  // If a rate limit response is received
  if (/* rate limit detected */) {
    rateLimiter.handleRateLimitResponse('jira', error);
  }
}
```

### Getting Metrics

```typescript
import { getRateLimiter } from './rate-limiter-factory';

function logRateLimitMetrics() {
  const rateLimiter = getRateLimiter();
  
  const metrics = rateLimiter.getMetrics('azure-devops');
  console.log(`Requests in last minute: ${metrics.requestsLastMinute}`);
  console.log(`Current delay: ${metrics.currentDelayMs}ms`);
  console.log(`Is rate limited: ${metrics.isRateLimited}`);
}
```

## Provider Configurations

The factory includes optimized configurations for various test management providers:

| Provider | Requests/Minute | Initial Delay | Max Delay | Notes |
|----------|----------------|--------------|-----------|-------|
| Azure DevOps | 300 | 50ms | 15s | Handles 503 responses as rate limits |
| Rally | 60 | 200ms | 60s | Uses custom X-RateLimit-Reset header |
| Jira | 100 | 150ms | 30s | Custom reset time extraction |
| Zephyr | 180 | 100ms | 20s | |
| qTest | 200 | 80ms | 15s | |
| HP ALM | 150 | 120ms | 25s | Handles 500 responses as rate limits |

## Custom Providers

To add a custom provider configuration:

```typescript
import { ApiRateLimiter } from './api-rate-limiter';

const rateLimiter = new ApiRateLimiter({
  defaultConfig: {
    maxRequestsPerMinute: 120,
    initialDelayMs: 100,
    maxDelayMs: 30000,
    backoffFactor: 2,
    backoffThreshold: 0.7
  },
  providerConfigs: [
    {
      providerName: 'my-custom-provider',
      maxRequestsPerMinute: 50,
      initialDelayMs: 200,
      maxDelayMs: 20000,
      backoffFactor: 2.5,
      backoffThreshold: 0.6,
      rateLimitStatusCodes: [429, 503],
      retryAfterHeaderName: 'X-Custom-Rate-Reset',
      extractResetTime: (error) => {
        // Custom logic to extract reset time
        return 30000; // 30 seconds
      }
    }
  ]
});
```