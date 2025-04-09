# ADR 0005: Containerization Strategy

## Status

Accepted

## Date

2025-04-09

## Context

Skíðblaðnir needs a consistent, reproducible environment across development, testing, and production. Additionally, the polyglot architecture (TypeScript, Python, Go) creates challenges for maintaining development environments. We need a strategy that simplifies development while ensuring production readiness.

## Decision

We will implement a comprehensive containerization strategy with the following elements:

### 1. Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Container Environment                    │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │ API Service   │  │ Orchestrator  │  │ Binary        │    │
│  │ (TypeScript)  │  │ (Python)      │  │ Processor (Go)│    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │ PostgreSQL    │  │ Redis         │  │ MinIO         │    │
│  │ Database      │  │ Cache         │  │ Object Storage│    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Core Principles

1. **Podman-Based**: Use Podman for all container orchestration
2. **Zero External Dependencies**: No requirements beyond Podman
3. **Environment Parity**: Same containers from development to production
4. **Resource Efficiency**: Optimized images with minimal footprint
5. **Build Once, Deploy Anywhere**: CI/CD pipeline for consistent artifacts

### 3. Development Environment

- Specialized development containers for each language:
  - TypeScript development container
  - Python development container
  - Go development container
- Shared volumes for source code
- Hot reloading for iterative development
- Integrated testing environment

### 4. Environment-Specific Configurations

- **Development**:
  - Debug-enabled builds
  - Development tools included
  - Local registry for caching
  - Simulated test data

- **QA/Testing**:
  - Mock API servers
  - Test data generators
  - Performance monitoring
  - Simulated error conditions

- **Production**:
  - Optimized builds
  - Security hardening
  - Resource constraints
  - Horizontal scaling support

### 5. Image Hierarchy

```
┌─────────────────────┐
│ Base Images         │
│ - TypeScript Base   │
│ - Python Base       │
│ - Go Base           │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Development Images  │
│ - TypeScript Dev    │
│ - Python Dev        │
│ - Go Dev            │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Service Images      │
│ - API Service       │
│ - Orchestrator      │
│ - Binary Processor  │
└─────────────────────┘
```

### 6. Build Pipeline

- Multi-stage builds for efficient images
- Layer caching for faster builds
- Dependency separation from application code
- Consistent tagging strategy

### 7. Deployment Strategy

- Podman Compose for local and QA environments
- Kubernetes for production (optional)
- Environment variable injection for configuration
- Volume mounting for persistent data

## Consequences

### Positive

- Consistent environment across all stages
- Simplified onboarding for new developers
- Isolation of language-specific dependencies
- Efficient CI/CD pipeline
- Reduced "works on my machine" issues

### Negative

- Learning curve for container-based development
- Additional complexity in build system
- Performance overhead in development

### Neutral

- Need for container expertise in the team
- Balance between container isolation and development efficiency
- Standardization vs. developer flexibility

## Implementation Notes

1. **Development Workflow**:
   - Simple commands to start development environment
   - Integration with local IDE
   - File watching for automatic rebuilds
   - Integrated debugging

2. **Image Optimization**:
   - Use Alpine-based images where possible
   - Multi-stage builds to minimize size
   - Careful dependency management
   - Security scanning integration

3. **Resource Management**:
   - Appropriate resource limits for each container
   - Monitoring integration
   - Performance profiling
   - Scalability testing

4. **Security Considerations**:
   - Non-root container users
   - Minimal base images
   - Regular security updates
   - Minimal exposed ports