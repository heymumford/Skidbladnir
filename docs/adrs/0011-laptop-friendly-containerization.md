# ADR 0011: Laptop-Friendly Containerization Strategy

## Status

Accepted

## Date

2025-04-09

## Context

Skidbladnir needs to be usable on laptops with moderate hardware specifications, specifically:
- 16GB RAM
- 4-core 3GHz processor (e.g., Dell laptops)
- Windows 10/11 operating system
- Using Docker Desktop or Podman Desktop for Windows

The containerization strategy needs to be optimized for this environment to prevent the application from consuming excessive resources, which could impact developer productivity and user experience.

## Decision

We will implement a resource-optimized containerization strategy with the following principles:

### 1. Memory-Constrained Container Design

- **Hard Resource Limits**: Explicitly set memory limits on all containers
- **Service-Level Memory Budget**:
  - API service: 256MB (max 512MB)
  - Orchestrator service: 256MB (max 512MB)
  - Binary processor: 128MB (max 256MB)
  - PostgreSQL: 256MB (max 512MB)
  - Redis: 128MB (max 256MB)
  - MinIO: 256MB (max 512MB)
  - LLM Advisor: 1GB (max 2GB) with dynamic scaling
  - UI service: 128MB (max 256MB)
  - **Total nominal usage**: ~2.4GB
  - **Total maximum usage**: ~4.8GB

### 2. Optimized Container Images

- **Alpine-based Images**: Use Alpine Linux as the base for all containers
- **Multi-stage Builds**: Implement multi-stage builds to minimize final image size
- **Dependency Pruning**: Remove development dependencies in production images
- **Layer Optimization**: Minimize layer count and size through careful ordering

### 3. Lazy Loading and Dynamic Service Startup

- **On-demand Services**: Start services only when needed
- **Service Orchestration**: Implement a dynamic service manager for the development environment
- **Lazy LLM Loading**: Load the LLM model into memory only when needed for translation tasks

### 4. Windows-specific Optimizations

- **WSL2 Memory Configuration**: Provide a recommended WSL2 configuration limiting memory consumption
- **Volume Mount Performance**: Use named volumes instead of bind mounts where possible
- **Filesystem Optimization**: Minimize disk I/O through caching and batched operations

### 5. Development vs. Production Tradeoffs

- **Development Environment**:
  - Modular containers with hot reloading capabilities
  - Separable services that can be selectively started
  - Shared node_modules to reduce duplication

- **Production Environment**:
  - Fully optimized container images
  - Bundled dependencies with tree-shaking
  - Just-in-time service startup

### 6. File Watchers and CPU Usage Optimization

- **Limited File Watching**: Restrict file watching to necessary directories only
- **Polling Intervals**: Increase polling intervals in development to reduce CPU usage
- **Throttled Rebuilds**: Implement debouncing for file change detection

### 7. Memory Monitoring and Management

- **Runtime Monitoring**: Implement a lightweight memory usage monitor
- **Automatic Resource Recovery**: Release unused memory when possible
- **Warning System**: Display warnings when approaching resource limits

## Consequences

### Positive

- Enables development on machines with limited resources (16GB RAM)
- Improves performance on Windows 10/11 environments
- Reduces resource contention between containers
- Provides more predictable performance across different machines
- Creates a better developer experience on laptop hardware

### Negative

- Adds complexity to container configuration
- Requires more sophisticated orchestration
- May slightly increase development setup time
- Creates additional configuration between development and production

### Neutral

- Requires developers to be more aware of resource constraints
- May require periodic tuning of resource limits as the application evolves
- Introduces additional documentation requirements

## Implementation Notes

1. **Docker Desktop Configuration**:
   ```
   memory=6GB
   swap-size=2GB
   cpu-count=3
   ```

2. **WSL2 Configuration** in `.wslconfig`:
   ```
   [wsl2]
   memory=8GB
   processors=3
   swap=2GB
   ```

3. **Service Startup Script**:
   Develop a script that allows selective service startup:
   ```bash
   ./scripts/dev-env.sh up --services api,postgres,redis
   ```

4. **Memory Monitoring**:
   Add a status dashboard for container resource usage:
   ```bash
   ./scripts/monitor-resources.sh
   ```

5. **LLM Model Optimization**:
   Implement 4-bit quantization and attention caching for the LLM model to reduce memory footprint.