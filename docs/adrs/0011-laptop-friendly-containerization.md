# ADR 0011: Laptop-Friendly Containerization with Build System Integration

## Status

Accepted

## Date

2025-04-09

## Context

As a polyglot project with TypeScript, Go, and Python components, Skidbladnir has complex build, test, and run requirements. Developers often work on laptops with limited resources (particularly 16GB RAM Windows machines), which can struggle when running multiple containers. 

We need a development environment solution that:
1. Works efficiently on laptops with limited resources (16GB RAM)
2. Supports all three languages without requiring developers to install local toolchains
3. Integrates with our test-driven development approach
4. Allows rapid iteration during development
5. Closely mirrors our production deployment model
6. Provides consistent artifacts across development, testing, and production

## Decision

We will implement a laptop-friendly containerization strategy with an integrated build system that optimizes for both development experience and resource usage. This approach has these key components:

### 1. Resource-Optimized Container Strategy

- **Use Podman** instead of Docker for better resource usage on Windows via WSL2
- **Configure memory limits** for all development containers:
  - API service: 256MB (max 512MB)
  - Orchestrator service: 256MB (max 512MB)
  - Binary processor: 128MB (max 256MB)
  - PostgreSQL: 256MB (max 512MB)
  - Redis: 128MB (max 256MB)
  - MinIO: 256MB (max 512MB)
  - LLM Advisor: 1GB (max 2GB) with dynamic scaling
  - UI service: 128MB (max 256MB)
- **Use on-demand container starting** - only start containers when needed
- **Implement shared volume strategy** to reduce duplication
- **Use quantized LLM models** with 4-bit precision for advisor components

### 2. Integrated Build System 

- **Create a unified master build script** that coordinates builds across all languages
- **Implement language-specific build scripts** that can be run independently
- **Support incremental builds** to avoid rebuilding unchanged components
- **Configure source maps** and debugging support in all containers
- **Create single-command container builds** for all components

### 3. Test Integration

- **Configure Jest for TypeScript** with comprehensive test configuration
- **Implement Go testing** with proper mocks and helpers
- **Set up Python testing** with pytest and coverage
- **Create cross-language integration tests** with coordinated test runners
- **Support test-driven development** with rapid test feedback loops

### 4. Developer Experience

- **Implement hot-reload** for TypeScript components
- **Provide consistent access** to logs from all containers
- **Create development shortcuts** for common operations
- **Support optional local development** outside containers
- **Configure minimal container sets** for specific development tasks

## Implementation Details

### 1. Optimized Container Images

- **Alpine-based Images**: Use Alpine Linux as the base for all containers
- **Multi-stage Builds**: Implement multi-stage builds to minimize final image size
- **Dependency Pruning**: Remove development dependencies in production images
- **Layer Optimization**: Minimize layer count and size through careful ordering

### 2. Windows-specific Optimizations

- **WSL2 Memory Configuration** (in `.wslconfig`):
  ```
  [wsl2]
  memory=8GB
  processors=3
  swap=2GB
  ```
- **Volume Mount Performance**: Use named volumes instead of bind mounts where possible
- **Filesystem Optimization**: Minimize disk I/O through caching and batched operations

### 3. Build Command Structure

Master build script that coordinates builds across languages:

```bash
#!/bin/bash
ENV=${1:-"dev"}

# Build TypeScript components
echo "Building TypeScript components..."
npm run build:ts

# Build Python components
echo "Building Python components..."
npm run build:py

# Build Go components
echo "Building Go components..."
npm run build:go

# Build containers if requested
if [ "$2" == "containers" ]; then
  echo "Building containers..."
  ./scripts/build-containers.sh "$ENV"
fi

# Run tests if requested
if [ "$2" == "test" ] || [ "$3" == "test" ]; then
  echo "Running tests..."
  ./scripts/run-tests.sh
fi
```

### 4. Testing Infrastructure

The Jest configuration will support our TDD approach with polyglot testing:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/tests',
    '<rootDir>/pkg'
  ],
  testMatch: [
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'pkg/**/*.{ts,tsx}',
    'internal/typescript/**/*.{ts,tsx}',
    'cmd/api/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  }
};
```

### 5. Package Scripts Integration

Package.json will include unified scripts for all operations:

```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev:api\" \"npm run dev:orchestrator\" \"npm run dev:binary\"",
    "dev:api": "nodemon --exec ts-node cmd/api/index.ts",
    "dev:orchestrator": "cd cmd/orchestrator && python -m uvicorn main:app --reload",
    "dev:binary": "cd cmd/binary-processor && go run main.go",
    "containers:up": "./scripts/start-containers.sh",
    "containers:down": "./scripts/stop-containers.sh",
    "containers:up:minimal": "./scripts/start-containers.sh minimal",
    "containers:build": "./scripts/build-containers.sh",
    "test": "jest",
    "test:ts": "jest --testPathPattern='.*\\.(test|spec)\\.tsx?$'",
    "test:py": "cd cmd/orchestrator && python -m pytest",
    "test:go": "cd cmd/binary-processor && go test ./...",
    "test:integration": "jest --testPathPattern='tests/integration'",
    "build": "npm run build:clean && npm run build:ts && npm run build:py && npm run build:go",
    "build:ts": "tsc -p tsconfig.build.json",
    "build:py": "cd cmd/orchestrator && python -m build",
    "build:go": "cd cmd/binary-processor && go build -o ../../dist/binary-processor",
    "master-build": "./scripts/master-build.sh",
    "master-build:qa": "./scripts/master-build.sh qa",
    "master-build:prod": "./scripts/master-build.sh prod"
  }
}
```

### 6. Memory Monitoring

Resource monitoring script for development:

```bash
#!/bin/bash
# monitor-resources.sh

# Monitor container resource usage
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check WSL2 memory usage if on Windows
if grep -q Microsoft /proc/version; then
  echo "WSL2 Memory Usage:"
  free -h
fi
```

## Consequences

### Positive

- **Laptop-friendly development** - developers can work on 16GB Windows machines
- **Consistent environments** - all developers have the same environment
- **Improved build pipeline** - builds are faster and more reliable
- **Better testing support** - tests run consistently in containers
- **Flexible development options** - developers can choose resource usage based on their needs
- **Production-like environment** - development environment closely mirrors production
- **TDD workflow support** - fast test feedback loops enable test-driven development

### Negative

- **More complex setup** - additional configuration needed
- **Learning curve** - developers need to learn containerization concepts
- **Potential performance overhead** - containerization adds some overhead
- **More build scripts to maintain** - multiple build scripts add maintenance burden

### Neutral

- **Requires developers to be more aware of resource constraints**
- **May require periodic tuning of resource limits** as the application evolves
- **Introduces additional documentation requirements**

## Implementation Plan

1. Create optimized container definitions for each service
2. Implement the master-build.sh script for coordinated builds
3. Set up Jest configuration for TypeScript testing
4. Create test mocks for Go and Python components
5. Implement cross-language integration tests
6. Add resource monitoring tooling for development
7. Document laptop-friendly development workflow

## Conclusion

This laptop-friendly containerization approach with integrated build system will enable efficient development on resource-constrained laptops while maintaining a consistent, production-like environment across the team. The integrated test support will facilitate our test-driven development approach, ensuring high-quality code while optimizing the development experience.