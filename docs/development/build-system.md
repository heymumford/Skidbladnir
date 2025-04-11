# Skidbladnir Build System

This document describes the build system for the Skidbladnir project, which uses a polyglot architecture with TypeScript, Python, and Go components.

## Overview

Skidbladnir uses a unified build system that can handle all components of our polyglot architecture. The build system is designed to be:

- **Language-agnostic**: Works with TypeScript, Python, and Go components
- **Container-friendly**: Optimized for containerized builds and deployments
- **Environment-aware**: Handles different environments (dev, qa, prod)
- **CI/CD-ready**: Integrates with GitHub Actions
- **Developer-friendly**: Simple to use for daily development tasks

## Build Tools

The project uses the following build tools:

1. **Task**: A task runner for cross-language orchestration (similar to Make but more modern)
2. **Build Orchestrator Script**: A bash script that orchestrates the entire build process
3. **Language-specific Build Tools**:
   - **TypeScript**: npm/tsc for TypeScript components
   - **Python**: Poetry for Python components
   - **Go**: Go build system for Go components
4. **Container Orchestration**: Docker/Podman Compose for container builds and deployments

## Directory Structure

The build system expects the following directory structure:

```
skidbladnir/
├── cmd/                      # Entry points for applications
├── internal/                 # Language-specific implementations
├── pkg/                      # Domain and application logic
├── scripts/                  # Build and deployment scripts
│   ├── build-orchestrator.sh # Main build orchestration script
│   └── env/                  # Environment-specific configuration
├── Taskfile.yml              # Task definitions
├── package.json              # Node.js/TypeScript configuration
├── pyproject.toml            # Python/Poetry configuration
└── go.mod                    # Go module definition
```

## Common Tasks

### Setting Up the Development Environment

```bash
# Install Task runner (https://taskfile.dev)
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin

# Install dependencies for all components
task setup
```

### Building Components

```bash
# Build all components
task build

# Build specific components
task build:ts   # TypeScript only
task build:py   # Python only
task build:go   # Go only

# Build for specific environment
task build ENV=prod
```

### Running Tests

```bash
# Run all tests
task test

# Run specific tests
task test:ts   # TypeScript only
task test:py   # Python only
task test:go   # Go only
```

### Linting

```bash
# Run all linters
task lint

# Run specific linters
task lint:ts   # TypeScript only
task lint:py   # Python only
task lint:go   # Go only
```

### Development Servers

```bash
# Start all development servers
task serve

# Start specific servers
task serve:api          # API server
task serve:orchestrator # Orchestrator
task serve:binary       # Binary processor
```

### Container Operations

```bash
# Build containers
task containers:build

# Start containers
task containers:up

# Stop containers
task containers:down

# Use specific environment
task containers:build ENV=qa
```

### Deployment

```bash
# Deploy to QA
task deploy:qa

# Deploy to Production
task deploy:prod
```

## Build Orchestrator

For more complex operations, use the build orchestrator script directly:

```bash
# Build all components for production
./scripts/build-orchestrator.sh --env prod

# Build only specific components
./scripts/build-orchestrator.sh --components typescript,go

# Skip tests and linting
./scripts/build-orchestrator.sh --skip-tests --skip-lint

# Get help
./scripts/build-orchestrator.sh --help
```

## Environment Configuration

Environment-specific configuration is stored in the `scripts/env/` directory:

- `dev.env`: Development environment configuration
- `qa.env`: QA environment configuration
- `prod.env`: Production environment configuration

These files are automatically loaded by the build system based on the selected environment.

## CI/CD Integration

The build system is designed to work with GitHub Actions for CI/CD. The workflow is defined in `.github/workflows/ci.yml` and includes:

1. Running tests for all components
2. Building all components
3. Building containers
4. Running integration tests
5. Deploying to the appropriate environment

## Developing in Containers

For containerized development:

```bash
# Start development environment with containers
task containers:up

# Access development container for TypeScript work
docker exec -it skidbladnir_typescript_dev bash

# Access development container for Python work
docker exec -it skidbladnir_python_dev bash

# Access development container for Go work
docker exec -it skidbladnir_go_dev bash
```

## Troubleshooting

- **Build errors**: Check the logs in the `logs/` directory
- **Container issues**: Use `docker-compose logs` or `podman-compose logs` to view container logs
- **Task failures**: Run tasks with verbose output: `task -v [taskname]`