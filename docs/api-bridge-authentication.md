# API Bridge Authentication Guide

## Overview
The API Bridge provides a robust interface for interacting with external provider APIs while handling authentication, rate limiting, and resilience patterns automatically. This document focuses on the authentication capabilities of the API Bridge.

## Authentication Methods

The API Bridge supports three main authentication methods:

### 1. Token Authentication
Use token authentication when you have a pre-existing API token.

```typescript
import { ApiBridge } from '../internal/typescript/api-bridge';
import { AuthenticationMethod } from '../internal/typescript/api-bridge/auth/authentication-handler';

const bridge = new ApiBridge({
  baseURL: 'https://api.example.com',
  serviceName: 'my-service',
  providerName: 'example-provider',
  authentication: {
    credentials: {
      type: AuthenticationMethod.TOKEN,
      token: 'your-api-token',
      // Optional: customize header name (default: 'Authorization')
      tokenHeaderName: 'X-API-KEY',
      // Optional: customize token prefix (default: 'Bearer ')
      tokenPrefix: ''
    }
  }
});

// The bridge automatically authenticates on first request
const response = await bridge.get('/resources');
```

### 2. Password Authentication
Password authentication uses a username and password to acquire a token.

```typescript
const bridge = new ApiBridge({
  baseURL: 'https://api.example.com',
  serviceName: 'my-service',
  providerName: 'example-provider',
  authentication: {
    credentials: {
      type: AuthenticationMethod.PASSWORD,
      username: 'your-username',
      password: 'your-password',
      loginUrl: 'https://api.example.com/login',
      // Optional: custom token extraction function
      extractToken: (response) => response.data.auth.accessToken
    }
  }
});
```

### 3. OAuth Authentication
OAuth authentication supports various grant types, including `client_credentials` and `password`.

```typescript
const bridge = new ApiBridge({
  baseURL: 'https://api.example.com',
  serviceName: 'my-service',
  providerName: 'example-provider',
  authentication: {
    credentials: {
      type: AuthenticationMethod.OAUTH,
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      tokenUrl: 'https://auth.example.com/oauth/token',
      grantType: 'client_credentials',
      scope: 'read write',
      // For password grant type
      // username: 'your-username',
      // password: 'your-password',
      refreshTokenGrantType: 'refresh_token' // For refresh token support
    }
  }
});
```

## Automatic Token Refresh

The API Bridge handles token expiration and refresh automatically:

1. **Expiration-based refreshing**: For OAuth tokens with `expires_in` property, the token is automatically refreshed when expired.
2. **401 error refreshing**: If a request returns a 401 Unauthorized error, the API Bridge will attempt to refresh the token and retry the request.
3. **Refresh token support**: If a refresh token is available, it will be used to acquire a new access token without requiring full re-authentication.

Example of a flow with automatic token refresh:

```typescript
// Initial authentication happens automatically on first request
const response1 = await bridge.get('/resources');

// Later, if the token expires or a 401 is received
try {
  const response2 = await bridge.get('/protected-resource');
  // The request succeeds with an automatically refreshed token
} catch (error) {
  // Handle other errors
}
```

## Provider-Specific Configuration

You can register custom authentication configurations for different providers:

```typescript
import { AuthenticationHandler, AuthenticationConfig, AuthenticationMethod } from '../internal/typescript/api-bridge/auth/authentication-handler';

const bridge = new ApiBridge({
  // ... other configuration
  authentication: {
    configureHandler: (handler: AuthenticationHandler) => {
      // Register provider-specific configuration
      handler.registerProviderConfig('custom-provider', {
        baseUrl: 'https://api.custom-provider.com',
        headers: {
          'X-Custom-Header': 'CustomValue'
        },
        authMethods: [
          {
            type: AuthenticationMethod.OAUTH,
            clientId: 'custom-client',
            clientSecret: 'custom-secret',
            tokenUrl: 'https://api.custom-provider.com/oauth/token',
            grantType: 'client_credentials'
          }
        ]
      });
    }
  }
});
```

## Error Handling

Authentication errors are wrapped in the `AuthenticationError` class, providing detailed information:

```typescript
try {
  await bridge.authenticate();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Provider:', error.providerName);
    console.log('HTTP Status:', error.httpStatus);
    console.log('Details:', error.details);
    console.log('Is network error:', error.isNetworkError);
    console.log('Is retryable:', error.isRetryable);
  }
}
```

## Session Management

The API Bridge maintains authentication sessions to avoid unnecessary re-authentication:

```typescript
// Manually authenticate (normally happens automatically on first request)
await bridge.authenticate();

// Logout and clear session
await bridge.logout();
```

## Health Monitoring

The API Bridge provides health status and metrics for monitoring:

```typescript
// Get overall health status
const status = bridge.getHealthStatus(); // 'HEALTHY', 'DEGRADED', or 'UNHEALTHY'

// Get detailed metrics
const metrics = bridge.getMetrics();
console.log('Rate limiting:', metrics.rateLimiting);
console.log('Resilience:', metrics.resilience);
```

## Complete Configuration Example

```typescript
import { ApiBridge } from '../internal/typescript/api-bridge';
import { AuthenticationMethod } from '../internal/typescript/api-bridge/auth/authentication-handler';

const bridge = new ApiBridge({
  baseURL: 'https://api.example.com',
  serviceName: 'test-case-service',
  providerName: 'test-provider',
  authentication: {
    credentials: {
      type: AuthenticationMethod.OAUTH,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tokenUrl: 'https://auth.example.com/oauth/token',
      grantType: 'client_credentials',
      scope: 'read write'
    }
  },
  rateLimiting: {
    maxRequestsPerMinute: 120,
    retryAfterHeaderName: 'Retry-After', 
    rateLimitStatusCodes: [429, 403]
  },
  resilience: {
    retryOptions: {
      maxAttempts: 3,
      initialDelayMs: 50,
      backoffFactor: 2
    },
    circuitBreakerOptions: {
      failureThreshold: 5,
      resetTimeoutMs: 30000
    },
    timeoutMs: 5000
  },
  defaultHeaders: {
    'User-Agent': 'Skidbladnir/1.0',
    'Accept': 'application/json'
  }
});

// Ready to use!
const testCases = await bridge.get('/test-cases');
```