# Skidbladnir Infrastructure

This directory contains infrastructure configurations for deploying Skidbladnir in various environments.

## Environment Configurations

- **dev/** - Development environment configuration
  - Focused on developer experience
  - Includes hot reloading and debug capabilities
  - Local service containers with volume mounts

- **qa/** - QA/Testing environment configuration
  - Production-like but isolated for testing
  - Complete service stack for integration testing
  - Mock services for external dependencies

- **prod/** - Production environment configuration
  - Optimized, secure configurations
  - Rate limiting and resource management
  - High availability considerations

- **compose/** - Docker/Podman compose files
  - Configuration for multi-container environments
  - Production and QA deployment compose files

## Dockerfile Descriptions

### Development Dockerfiles
- **go.Dockerfile** - Go development environment
- **python.Dockerfile** - Python development environment
- **typescript.Dockerfile** - TypeScript/Node.js development environment

### Production Dockerfiles
- **api.Dockerfile** - API service container
- **binary-processor.Dockerfile** - Binary processing service container
- **orchestrator.Dockerfile** - Orchestration service container

## Usage Examples

```bash
# Start development environment
podman-compose -f infra/dev/podman-compose.yml up -d

# Start QA environment
podman-compose -f infra/compose/docker-compose.qa.yml up -d

# Start production environment
podman-compose -f infra/compose/docker-compose.prod.yml up -d
```