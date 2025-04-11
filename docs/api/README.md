# API Documentation

This directory contains documentation about Skidbladnir's API architecture, provider interfaces, and integration strategies.

## API Overview Documents

- [API Bridge Architecture](api-bridge-architecture.md) - Architecture of the API bridge that connects different test management systems
- [API Bridge Authentication](api-bridge-authentication.md) - Authentication mechanisms for secure API integration
- [API Resilience Patterns](api-resilience-patterns.md) - Techniques for ensuring API reliability and fault tolerance
- [Provider Interface](provider-interface.md) - Universal provider interface specification for test management systems

## Testing and Integration

- [API Comparison](api-comparison.md) - Comparative analysis of different test management system APIs
- [Cross-Component Testing](cross-component-testing.md) - Testing strategies for cross-component API integration
- [Cross-Language Contract Testing](cross-language-contract-testing.md) - Ensuring API contracts across language boundaries
- [Operation Dependency System](operation-dependency-system.md) - System for managing dependencies between API operations

## Supported Providers

Skidbladnir supports these test management systems through specialized provider implementations:

### Primary Focus (Fully Implemented)
- **Zephyr Scale** (Source) - Complete extraction capabilities with attachment handling
- **qTest** (Destination) - Comprehensive loading with field mapping and transformation

### Additional Providers (Architecture Ready)
- Micro Focus ALM/Quality Center
- Microsoft Azure DevOps
- Rally
- Jama Connect
- TestRail
- Visure Solutions

## API Framework

The API layer is built with:
- **TypeScript/Express** - Main API server
- **Resilient API Client** - Fault-tolerant HTTP client with retry logic
- **Rate Limiting** - Provider-specific API rate limiting
- **Operation Dependency Graph** - Ensures correct operation execution order
- **Authentication Handler** - Manages multiple authentication schemes

## API Bridge Architecture

```
┌────────────────────────────────────────────────────┐
│                  API Controllers                   │
└───────────────────────┬────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────┐
│               Operation Dependency                 │
│                     Resolver                       │
└───────────────────────┬────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────┐
│                Operation Executor                  │
└─┬─────────────────────┬───────────────────────────┬┘
  │                     │                           │
┌─▼─────────────┐ ┌─────▼───────────┐ ┌─────────────▼─┐
│ API Bridge    │ │ Transformation  │ │ Error         │
│ Client Layer  │ │ Layer           │ │ Handler       │
└─┬─────────────┘ └─────────────────┘ └───────────────┘
  │
┌─▼─────────────┐
│ Rate Limiter  │
└─┬─────────────┘
  │
┌─▼─────────────┐
│ Auth Handler  │
└─┬─────────────┘
  │
┌─▼─────────────┐
│ HTTP Client   │
└─┬─────────────┘
  │
┌─▼─────────────┐
│ External APIs │
└───────────────┘
```

## Best Practices

When working with the API layer:

1. Always use the provider interface rather than direct API calls
2. Respect operation dependencies to ensure correct execution order
3. Add resilience with retry logic for transient failures
4. Implement proper rate limiting to avoid API throttling
5. Use the transformation layer for data conversion between systems
6. Always include appropriate error handling and logging
7. Test your API integration with mock providers