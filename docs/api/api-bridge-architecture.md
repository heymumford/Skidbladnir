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

## Additional Architectural Details



This document details the API Bridge component in Skíðblaðnir, aligned with [ADR-0003: API Bridge Architecture](./adrs/0003-api-bridge-architecture.md), which serves as the definitive source of truth for architectural decisions.

## Overview

The API Bridge provides a sophisticated system for handling complex API interactions with test management systems. It manages multi-stage API calls, authentication, session state, and self-healing error recovery.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                      API Bridge Architecture                              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌─────────────────┴──────────────────┐
                 │                                    │
┌────────────────▼─────────────────┐      ┌───────────▼────────────────┐
│                                  │      │                            │
│    API Specification Parser      │      │    Session Manager         │
│                                  │      │                            │
└───────────────┬──────────────────┘      └───────────┬────────────────┘
                │                                     │
                │                                     │
┌───────────────▼──────────────────┐      ┌───────────▼────────────────┐
│                                  │      │                            │
│    API Operation Sequencer       │◄─────►    Authentication Handler   │
│                                  │      │                            │
└───────────────┬──────────────────┘      └────────────────────────────┘
                │
                │
┌───────────────▼──────────────────┐      ┌────────────────────────────┐
│                                  │      │                            │
│     Request/Response Pipeline    │◄─────►     Error Recovery Engine   │
│                                  │      │                            │
└───────────────┬──────────────────┘      └────────────────────────────┘
                │
                │
┌───────────────▼──────────────────┐      ┌────────────────────────────┐
│                                  │      │                            │
│    Response Transformation       │◄─────►     Local LLM Assistant     │
│                                  │      │                            │
└──────────────────────────────────┘      └────────────────────────────┘
```

## Core Components

### API Specification Parser

The API Specification Parser processes OpenAPI/Swagger specifications for test management system APIs:

- **Functions**:
  - Parse OpenAPI JSON/YAML specifications
  - Create mapped operation references
  - Identify dependencies between operations
  - Extract authentication requirements
  - Analyze request/response schemas

- **Key Interfaces**:
  ```typescript
  interface ApiSpecParser {
    parseSpecification(spec: string | object): ApiSpecification;
    getOperation(operationId: string): ApiOperation;
    getOperationsByTag(tag: string): ApiOperation[];
    getDependencies(operationId: string): OperationDependency[];
    getAuthRequirements(): AuthRequirement[];
  }
  ```

### Session Manager

The Session Manager maintains authenticated sessions with external systems:

- **Functions**:
  - Create and manage sessions
  - Store authentication tokens and cookies
  - Handle token refresh and expiration
  - Encrypt sensitive credentials
  - Support multiple parallel sessions

- **Key Interfaces**:
  ```typescript
  interface SessionManager {
    createSession(providerId: string, credentials: Credentials): Promise<Session>;
    getSession(sessionId: string): Promise<Session | null>;
    refreshSession(sessionId: string): Promise<Session>;
    invalidateSession(sessionId: string): Promise<void>;
    isSessionValid(sessionId: string): Promise<boolean>;
  }
  ```

### Authentication Handler

The Authentication Handler manages various authentication mechanisms:

- **Functions**:
  - Support multiple authentication methods
  - Integrate with headless browsers
  - Manage secure credential storage
  - Handle multi-step authentication flows
  - Proactively refresh authentication

- **Supported Authentication Types**:
  - Basic Authentication
  - API Key Authentication
  - OAuth 2.0 / OpenID Connect
  - Session-based Authentication
  - Browser-based Authentication
  - Custom Authentication Flows

- **Key Interfaces**:
  ```typescript
  interface AuthenticationHandler {
    authenticate(providerId: string, authConfig: AuthConfig): Promise<AuthResult>;
    refreshAuth(providerId: string, token: RefreshToken): Promise<AuthResult>;
    performBrowserAuth(providerId: string, authConfig: BrowserAuthConfig): Promise<AuthResult>;
  }
  ```

### API Operation Sequencer

The API Operation Sequencer orchestrates complex, multi-stage API workflows:

- **Functions**:
  - Determine correct sequence of API calls
  - Resolve dependencies between operations
  - Map data between sequential calls
  - Handle conditional execution paths
  - Implement retry strategies

- **Key Interfaces**:
  ```typescript
  interface OperationSequencer {
    createSequence(name: string, operations: SequenceStep[]): OperationSequence;
    executeSequence(sequence: OperationSequence, context: RequestContext): Promise<any>;
    optimizeSequence(sequence: OperationSequence): OperationSequence;
  }
  ```

### Request/Response Pipeline

The Request/Response Pipeline processes API requests and responses:

- **Functions**:
  - Transform requests according to API specs
  - Add authentication headers/cookies
  - Implement rate limiting and throttling
  - Validate responses against schemas
  - Handle error responses

- **Middleware Architecture**:
  - Authentication Middleware
  - Rate Limiting Middleware
  - Logging Middleware
  - Error Handling Middleware
  - Transformation Middleware

- **Key Interfaces**:
  ```typescript
  interface RequestPipeline {
    process(request: ApiRequest, context: RequestContext): Promise<ApiResponse>;
    addMiddleware(middleware: RequestMiddleware): void;
  }
  ```

### Error Recovery Engine

The Error Recovery Engine provides self-healing capabilities:

- **Functions**:
  - Classify errors by type and severity
  - Implement recovery strategies
  - Handle session timeouts and auth failures
  - Adapt to schema changes
  - Integrate with LLM for advanced recovery

- **Recovery Strategy Types**:
  - Retry with Exponential Backoff
  - Authentication Refresh
  - Alternative Path Execution
  - Schema Adaptation
  - LLM-Assisted Recovery

- **Key Interfaces**:
  ```typescript
  interface ErrorRecoveryEngine {
    recoverFromError(error: ApiError, context: ApiContext): Promise<RecoveryResult>;
    registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void;
  }
  ```

## Browser-Based Authentication

For systems requiring browser-based authentication:

### Headless Browser Integration

- Uses Playwright/Puppeteer for browser automation
- Supports Chrome, Firefox, and WebKit
- Runs in a dedicated container
- Implements browser fingerprinting mitigation

### Authentication Flow

1. Navigate to login page
2. Enter credentials
3. Handle 2FA/MFA if needed
4. Extract cookies and tokens
5. Transform for API use

### MFA Handling

- Time-based OTP (TOTP) support
- SMS code entry via callback
- Push notification detection
- Recovery code support

## Self-Healing Mechanisms

The API Bridge implements several self-healing mechanisms:

### 1. Automatic Session Refresh

- Detects expired sessions/tokens
- Transparently reauthenticates
- Retries failed operations with new credentials

### 2. Schema Adaptation

- Handles unexpected changes in API responses
- Maps fields intelligently
- Falls back to best-effort mapping

### 3. Smart Retries

- Implements exponential backoff
- Varies retry strategies by error type
- Avoids overwhelming target systems

### 4. Alternative Path Execution

- Maintains multiple paths to achieve outcomes
- Falls back to alternative API sequences
- Uses LLM for novel approaches

### 5. Feedback Loop

- Records successful recovery strategies
- Learns from failures
- Adapts to changing API behaviors

## Integration with LLM Assistant

The API Bridge integrates with the Local LLM Assistant for enhanced troubleshooting:

- **Error Analysis**: LLM analyzes complex API errors
- **Recovery Suggestions**: Generates alternative approaches
- **Schema Mapping**: Assists with field mapping challenges
- **Documentation Generation**: Creates API usage guidance

## Security Considerations

The API Bridge implements several security measures:

### 1. Credential Protection

- Encrypts credentials at rest
- Uses memory-only storage for active sessions
- Never logs sensitive information

### 2. Isolation

- Containerized components with minimal permissions
- No external network access for sensitive components
- Strict separation between tenant data

### 3. Audit Trail

- Logs all authentication events
- Records API operation sequences
- Maintains history of recovery attempts

## API Bridge Usage

Provider implementations use the API Bridge through a simple interface:

```typescript
class ApiProviderAdapter implements SourceProvider, TargetProvider {
  private apiSpecParser: ApiSpecificationParser;
  private sessionManager: SessionManager;
  private operationSequencer: OperationSequencer;
  private requestPipeline: RequestPipeline;
  private errorRecovery: ErrorRecoveryEngine;
  
  constructor(providerConfig: ApiProviderConfig, apiSpec: ApiSpecification) {
    // Initialize components
  }
  
  // Provider interface implementations use the API Bridge components
  // to execute operations against the target system
}
```

## Performance Optimization

The API Bridge includes several performance optimizations:

- **Specification Caching**: Parsed specifications are cached
- **Connection Pooling**: HTTP connections are reused
- **Parallel Execution**: Independent operations run in parallel
- **Request Batching**: Multiple requests are batched where supported
- **Selective Polling**: Efficient polling for long-running operations
