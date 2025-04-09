# Skíðblaðnir - Test Management Bridge

A universal test asset migration platform for transferring test data between various test management systems.

[![Skíðblaðnir CI](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml/badge.svg)](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml)

> **About the name**: In Norse mythology, Skíðblaðnir (pronounced "skith-blath-nir") was a magical ship crafted by the dwarven brothers Brokkr and Sindri for the god Freyr. This extraordinary vessel could carry all the Æsir gods and their war gear across seas and skies, yet magically fold small enough to fit in a pocket when not in use. The ship always had a favorable wind and could sail on land, sea, or through the air.
>
> Skíðblaðnir symbolizes perfect engineering, adaptability, and the balance between capacity and efficiency. Like its mythological namesake, our platform transports your test assets across different systems with speed and reliability, adapting to various environments while maintaining the integrity of what it carries.

## Overview

Skíðblaðnir enables seamless migration of test cases, test cycles, executions, and attachments between test management platforms while preserving data integrity and relationships. The platform features:

- Universal API translation layer
- Star Trek LCARS-inspired interface with TX/RX indicators
- Local LLM advisor for self-healing API translations
- Container-based deployment with minimal rebuild cycles
- Test-Driven Development (TDD) approach
- Plugin-based, polyglot architecture

## Supported Systems

- Atlassian Jira with Zephyr Scale
- Tricentis qTest
- HP ALM/Quality Center
- Microsoft Azure DevOps
- Rally
- Excel imports/exports

## Key Features

- **Universal Provider Interface**: Standardized adapter system for multiple test management platforms
- **Multi-Stage API Handling**: Sophisticated management of complex API flows and authentication
- **Local LLM Advisor**: Llama-3 powered assistant for API troubleshooting and optimization
- **Self-Healing Capabilities**: Automatic recovery from API errors and schema changes
- **LCARS-inspired Interface**: Star Trek styled real-time status displays with TX/RX indicators
- **Fully Containerized**: Optimized for minimal rebuild and recompile cycles using Podman
- **Laptop-Friendly**: Memory-optimized containers that work well on 16GB laptops running Windows 10/11

## Architecture

Skíðblaðnir follows Clean Architecture principles with strict boundary enforcement:

1. **Core Domain** - Business logic and entities
2. **Use Cases** - Application-specific business rules
3. **Interface Adapters** - Converts data between layers
4. **Frameworks & Drivers** - External interfaces and tools

The architecture is polyglot:
- **TypeScript/Node.js**: API clients, transformation layers, UI
- **Python**: Orchestration services
- **Go**: High-performance binary processing
- **PostgreSQL**: Migration state tracking
- **Redis**: Caching and coordination
- **MinIO**: Binary storage for attachments

All components are containerized using Podman for consistent development and deployment with minimal external dependencies.

The LLM advisor component uses Llama-3 (8B) with 4-bit quantization to translate between API specifications and provide self-healing capabilities.

## Folder Structure

The project follows a structured organization based on clean architecture principles:

```
skidbladnir/
├── cmd/                      # Entry points for applications
│   ├── api/                  # API server entry point (TypeScript)
│   ├── orchestrator/         # Orchestration service entry point (Python)
│   ├── binary-processor/     # Binary processor entry point (Go)
│   ├── ui/                   # UI application entry point (TypeScript)
│   └── cli/                  # CLI tools entry point
│
├── pkg/                      # Domain and application logic (shared by all languages)
│   ├── domain/               # Core domain layer (Language-agnostic interfaces)
│   ├── usecases/             # Application use cases
│   └── interfaces/           # Interface adapters
│
├── internal/                 # Implementation-specific code
│   ├── typescript/           # TypeScript implementations
│   ├── python/               # Python implementations
│   └── go/                   # Go implementations
│
├── web/                      # Web assets and client-side code
├── scripts/                  # Scripts for development and deployment
├── infra/                    # Infrastructure configuration
├── docs/                     # Documentation
└── tests/                    # Tests
```

## Getting Started

### Prerequisites

- Podman 3.x+ (or Docker and Docker Compose)
- Node.js 18+ (only for local development outside containers)
- Git

### Development Setup

#### Standard Setup
```bash
# Clone the repository
git clone https://github.com/heymumford/Skidbladnir.git
cd Skidbladnir

# Start development environment with Podman
./scripts/dev-env.sh up

# Access development container for TypeScript work
./scripts/dev-container.sh typescript

# Access development container for Python work
./scripts/dev-container.sh python

# Access development container for Go work
./scripts/dev-container.sh go

# Run tests in containers
./scripts/test.sh
```

#### Laptop-Friendly Setup (16GB RAM)
```bash
# Start minimal development environment
./scripts/laptop-dev.sh up minimal

# Start TypeScript development with optimized resources
./scripts/laptop-dev.sh up typescript

# Monitor resource usage
./scripts/monitor-resources.sh

# See laptop-friendly guide for more options
cat docs/laptop-friendly-guide.md
```

### API Services

The following services are available in development mode:

- **API**: http://localhost:3000
- **Orchestrator**: http://localhost:8000
- **Binary Processor**: http://localhost:9000

## Development

### Test-Driven Development

We follow a strict TDD approach:

1. Write failing tests for new features
2. Implement the minimum code to pass tests
3. Refactor while keeping tests passing

Run the tests:

```bash
./scripts/test.sh
```

### Building for Production

```bash
# Build and deploy for production
./scripts/master-build.sh prod
```

## Documentation

### Architecture & Design
- [ADRs](./docs/adrs/) - Architecture Decision Records
- [Architecture Overview](./docs/architecture.md) - High-level architecture documentation
- [Architecture Diagrams (C4)](./docs/c4-diagrams.md) - System visualizations with C4 model
- [Clean Architecture Guide](./docs/clean-architecture-guide.md) - Implementation details of clean architecture
- [Project Strategy](./docs/project/strategy.md) - High-level project strategy and vision

### Component Documentation
- [API Bridge Architecture](./docs/api-bridge-architecture.md) - Integration details
- [API Comparison](./docs/api-comparison.md) - Compare test management system APIs
- [Provider Interface](./docs/provider-interface.md) - Provider implementation details
- [Local LLM Assistant](./docs/local-llm-assistant.md) - LLM integration and usage
- [Containerization Strategy](./docs/containerization.md) - Container setup details
- [Laptop-Friendly Guide](./docs/laptop-friendly-guide.md) - Optimized for 16GB laptops

### Development & Testing
- [Development Guide](./docs/development-guide.md) - Guide for developers
- [TDD Approach](./docs/project/tdd-approach.md) - Test-Driven Development methodology
- [Security Audit Guidelines](./docs/security-audit-guidelines.md) - Security practices

## License

MIT