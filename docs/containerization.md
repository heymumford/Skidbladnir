# Skidbladnir Containerization Strategy

This document outlines the containerization approach for Skidbladnir, ensuring a consistent development and production environment with minimal external dependencies while being resource-efficient for various hardware configurations.

## Principles

1. **Self-Contained Development Environment**
   - All development happens within containers
   - No local dependencies beyond Podman/Docker
   - Reproducible environment across all developers

2. **Resource-Efficient Containerization**
   - Memory-constrained container definitions
   - Selective service startup for development
   - Support for laptop development (16GB RAM, Windows 10/11)

3. **Minimal Network Dependencies**
   - Cached build layers to minimize network usage
   - Local registry for development images
   - Versioned base images with infrequent updates

4. **Consistent Build Pipeline**
   - Same container definitions for development and production
   - Automated testing in containers
   - Container-based CI/CD pipeline

5. **Efficient Updates**
   - Layered image architecture for minimal rebuilds
   - Incremental updates to iterative builds
   - Version tagging for release management

## Container Architecture

Skidbladnir consists of the following containers:

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Network                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │               │
│  TypeScript  │   Python     │     Go       │   Database    │
│  Developer   │  Developer   │  Developer   │   Services    │
│  Container   │  Container   │  Container   │  Containers   │
│              │              │              │               │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │                │
       │ Shared       │ Shared       │ Shared         │ Persistent
       │ Volume       │ Volume       │ Volume         │ Volumes
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────┐
│                                                             │
│                     Source Code Repository                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Network                       │
├──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │               │
│    API       │ Orchestrator │   Binary     │   Database    │
│  Services    │   Service    │  Processor   │   Services    │
│              │              │              │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
                                               │
                                               │ Persistent
                                               │ Volumes
                                               │
                                     ┌─────────▼───────────┐
                                     │                     │
                                     │  Persistent Storage │
                                     │                     │
                                     └─────────────────────┘
```

### Laptop-Friendly Environment

For development on laptops with constrained resources (16GB RAM, Windows 10/11):

```
┌─────────────────────────────────────────────────────────────────┐
│                    Resource-Optimized Network                   │
├──────────────┬──────────────┬────────────────┬─────────────────┤
│              │              │                │                 │
│  TypeScript  │  Database    │ Binary         │ LLM Advisor     │
│  Developer   │  Services    │ Processor      │ (On-demand)     │
│  Container   │ (Constrained)│ (On-demand)    │ (4-bit quant.)  │
│              │              │                │                 │
└──────────────┴──────────────┴────────────────┴─────────────────┘
       │              │                                │
       │ Shared       │ Persistent                     │ Demand-loaded
       │ Volume       │ Volumes                        │ Models
       │              │                                │
┌──────▼──────────────▼────────────────────────────────▼─────────┐
│                                                                 │
│                Resource Monitoring & Management                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Container Images

### Base Images

1. **TypeScript Base**
   - Node.js LTS Alpine-based
   - TypeScript and essential development tools
   - Testing frameworks pre-installed

2. **Python Base**
   - Python 3.10 Alpine-based
   - Poetry for dependency management
   - Development and testing tools

3. **Go Base**
   - Go 1.18 Alpine-based
   - Go modules support
   - Testing utilities pre-installed

### Service Images

1. **API Service**
   - Built from TypeScript base
   - Contains provider implementations
   - Exposes REST API endpoints

2. **Orchestrator Service**
   - Built from Python base
   - Workflow management system
   - State tracking and coordination

3. **Binary Processor Service**
   - Built from Go base
   - High-performance binary operations
   - Image processing capabilities

### Database Images

1. **PostgreSQL**
   - Official PostgreSQL image
   - Pre-configured for TestBridge schema
   - Persistent volume for data

2. **Redis**
   - Official Redis image
   - Optimized configuration
   - In-memory cache

3. **MinIO**
   - Object storage compatible with S3
   - Configured for temporary storage
   - Persistent volume for objects

## Development Workflow

### Standard Development Environment

1. **Initial Setup**
   ```bash
   # Clone repository
   git clone https://github.com/heymumford/Skidbladnir.git
   cd Skidbladnir

   # Start development environment
   ./scripts/dev-env.sh up
   ```

2. **Development Inside Containers**
   ```bash
   # Start TypeScript development container
   ./scripts/dev-container.sh typescript

   # Start Python development container
   ./scripts/dev-container.sh python

   # Start Go development container
   ./scripts/dev-container.sh go
   ```

3. **Testing**
   ```bash
   # Run tests in containers
   ./scripts/test.sh
   ```

4. **Building**
   ```bash
   # Build all containers
   ./scripts/build.sh
   ```

### Laptop-Friendly Development Environment

For development on laptops with constrained resources (16GB RAM, Windows 10/11):

1. **Initial Setup with Resource Constraints**
   ```bash
   # Clone repository
   git clone https://github.com/heymumford/Skidbladnir.git
   cd Skidbladnir

   # Start minimal development environment
   ./scripts/laptop-dev.sh up minimal
   ```

2. **Selective Service Startup**
   ```bash
   # Start TypeScript development with optimized resources
   ./scripts/laptop-dev.sh up typescript

   # Add LLM services only when needed
   ./scripts/laptop-dev.sh up llm
   ```

3. **Resource Monitoring**
   ```bash
   # Monitor container resource usage
   ./scripts/monitor-resources.sh
   ```

4. **Testing with Resource Awareness**
   ```bash
   # Run tests with resource constraints
   ./scripts/laptop-dev.sh up
   ./scripts/test.sh --memory-limit=high
   ```

## Container Build Pipeline

1. **Layer Caching Strategy**
   - Dependencies layer separate from code layer
   - Package lock files trigger dependency rebuilds
   - Source code changes only rebuild relevant layers

2. **Multi-Stage Builds**
   - Build stage for compilation and assets
   - Production stage for minimal runtime image
   - Development stage with additional tools

3. **Local Development Registry**
   - Podman registry for caching local builds
   - Avoids repeated downloads
   - Shared across development team

## Production Deployment

1. **Docker Compose / Podman Compose**
   ```yaml
   version: '3'
   services:
     api:
       image: testbridge/api:${VERSION}
       depends_on:
         - postgres
         - redis
         - minio
       ports:
         - "8080:8080"

     orchestrator:
       image: testbridge/orchestrator:${VERSION}
       depends_on:
         - postgres
         - redis
         - minio

     binary-processor:
       image: testbridge/binary-processor:${VERSION}
       depends_on:
         - minio

     postgres:
       image: postgres:15
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_USER: testbridge
         POSTGRES_DB: testbridge

     redis:
       image: redis:7
       volumes:
         - redis_data:/data

     minio:
       image: minio/minio
       volumes:
         - minio_data:/data
       environment:
         MINIO_ROOT_USER: ${MINIO_USER}
         MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
       command: server /data

   volumes:
     postgres_data:
     redis_data:
     minio_data:
   ```

2. **Kubernetes Deployment**
   - Helm charts for Kubernetes deployment
   - Resource limits and requests
   - Health checks and probes
   - Horizontal scaling configuration

## Container Versioning

1. **Semantic Versioning**
   - Major.Minor.Patch format
   - Aligns with application versioning

2. **Tag Strategy**
   - `latest` for most recent build
   - `stable` for production-ready version
   - `x.y.z` for specific releases
   - `dev-{branch}-{commit}` for development builds

## Health and Monitoring

1. **Health Checks**
   - Liveness probe endpoints
   - Readiness probe endpoints
   - Startup probe configuration

2. **Resource Monitoring**
   - Container metrics exposed
   - Resource usage tracking
   - Performance monitoring
   - Real-time resource dashboard for laptop environments

## Resource Management

1. **Memory Constraints**
   - Hard memory limits per container
   - Memory reservations to prevent swapping
   - Optimized JVM/Node.js memory settings

2. **CPU Allocation**
   - CPU share limits for balanced allocation
   - CPU pinning for critical services
   - Background task throttling

3. **Laptop-Specific Optimizations**
   - Windows-specific WSL2 configurations
   - Docker Desktop / Podman Desktop tuning
   - Service profiles for selective startup
   - Resource monitoring script

4. **Service Memory Budget**
   
   | Service | Standard Allocation | Maximum Allocation |
   |---------|---------------------|-------------------|
   | API | 256MB | 512MB |
   | Orchestrator | 256MB | 512MB |
   | Binary Processor | 128MB | 256MB |
   | PostgreSQL | 256MB | 512MB |
   | Redis | 128MB | 256MB |
   | MinIO | 256MB | 512MB |
   | LLM Advisor | 1GB | 2GB |
   | Dev Container | 512MB | 1GB |
   
   **Total:** ~2.8GB nominal, ~5.6GB maximum

5. **Dynamic Resource Management**
   - On-demand service startup and shutdown
   - Memory release when services are idle
   - Lazy-loading of LLM models
   - Database resource optimization