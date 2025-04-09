# Skíðblaðnir

A universal test asset migration platform for transferring test data between various test management systems.

[![Skíðblaðnir CI](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml/badge.svg)](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml)

> **About the name**: In Norse mythology, Skíðblaðnir (pronounced "skith-blath-nir") was a magical ship that could carry all the gods and their equipment, yet fold small enough to fit in a pocket when not in use. Like its namesake, this tool efficiently transports your valuable test assets across different platforms with adaptability and speed.

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

## Getting Started

### Prerequisites

- Podman 3.x+ (or Docker and Docker Compose)
- Node.js 18+ (only for local development outside containers)
- Git

### Development Setup

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

### Quick Start with Docker/Podman

```bash
# Build and start the application
./scripts/master-build.sh qa

# Access the application
open http://localhost:3000
```

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

## Project Structure

```
skidbladnir/
├── docs/                   # Documentation
│   ├── adrs/              # Architecture Decision Records
├── infra/                 # Infrastructure configurations
│   ├── dev/               # Development environment
│   ├── qa/                # QA/Testing environment
│   └── prod/              # Production deployment
├── packages/              # Core packages
│   ├── common/            # Shared utilities and models
│   ├── providers/         # Test management system providers
│   │   ├── zephyr/        # Jira/Zephyr provider
│   │   ├── qtest/         # qTest provider
│   │   ├── hp-alm/        # HP ALM/Quality Center provider
│   │   ├── azure-devops/  # Azure DevOps provider
│   │   ├── rally/         # Rally provider
│   │   └── excel/         # Excel import/export provider
│   ├── api-bridge/        # API integration framework
│   ├── llm-advisor/       # LLM for API translation
│   ├── llm-assistant/     # LLM self-contained assistant
│   ├── orchestrator/      # Migration workflow orchestration
│   ├── binary-processor/  # Go-based binary/image processor
│   └── ui/                # LCARS-inspired user interface
├── scripts/               # Build and deployment scripts
└── tests/                 # End-to-end and integration tests
```

## Documentation

- [ADRs](./docs/adrs/) - Architecture Decision Records
- [TDD Approach](./docs/tdd-approach.md) - Test-Driven Development guide
- [Clean Architecture Guide](./docs/clean-architecture-guide.md) - Implementation details
- [Architecture Diagrams (C4)](./docs/c4-diagrams.md) - System visualizations
- [API Bridge Architecture](./docs/api-bridge-architecture.md) - Integration details
- [API Comparison](./docs/api-comparison.md) - Compare test management APIs
- [Provider Interface](./docs/provider-interface.md) - Provider implementation details
- [Local LLM Assistant](./docs/local-llm-assistant.md) - LLM integration
- [Containerization Strategy](./docs/containerization.md) - Container setup
- [Development Guide](./docs/development-guide.md) - Guide for developers
- [LLM Advisor Tests](./docs/llm-advisor-tests.md) - LLM component testing
- [Security Audit Guidelines](./docs/security-audit-guidelines.md) - Security practices
- [UI Requirements](./docs/ui-requirements.md) - UI specs and requirements

## License

MIT