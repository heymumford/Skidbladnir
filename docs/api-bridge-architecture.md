# API Bridge Architecture

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