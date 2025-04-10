# Skíðblaðnir

[![Version](https://img.shields.io/badge/version-0.2.3-blue.svg)](https://github.com/heymumford/Skidbladnir/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://www.python.org/)
[![Go](https://img.shields.io/badge/Go-1.19-blue.svg)](https://golang.org/)
[![TDD](https://img.shields.io/badge/TDD-Clean%20Architecture-orange.svg)](docs/project/tdd-approach.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/heymumford/Skidbladnir/pulls)

Skíðblaðnir is a containerized, polyglot platform that automates the migration of test assets between different test management systems, solving the problems of manual migration burden, data loss, API complexity, and schema incompatibility. It provides a reliable bridge between systems like Jira/Zephyr, qTest, ALM, Azure DevOps, and Rally by implementing clean architecture with strictly enforced boundaries across TypeScript, Python, and Go components. The platform features a self-healing migration process powered by a local LLM advisor that can troubleshoot API issues and optimize performance with minimal resource requirements.

## Purpose

**GOAL**: To eliminate the engineering toil and data loss associated with migrating test assets between different test management systems by providing a reliable, automated, and self-healing migration platform.

**PROBLEMS SOLVED**:
1. **Manual Migration Burden**: Organizations waste thousands of engineering hours manually copying test cases between systems
2. **Data Loss and Corruption**: Manual transfers lose critical metadata, relationships, and attachments
3. **API Complexity**: Different test management systems use inconsistent APIs with poor documentation
4. **Schema Incompatibility**: Test artifacts have different structures across systems with no standard mapping
5. **Migration Reliability**: Existing migration tools fail silently or have high error rates
6. **Resource Constraints**: Current solutions require expensive infrastructure or cloud services

**WHAT IT IS**: Skíðblaðnir is a containerized, polyglot platform that provides an intelligent bridge between disparate test management systems. It automates the extraction, transformation, and loading of test cases, test cycles, executions, and artifacts while preserving data integrity. The platform uses local LLM assistance for self-healing capabilities, operates locally with minimal resources, and provides a clean interface for monitoring and controlling the migration process.

[![Skíðblaðnir CI](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml/badge.svg)](https://github.com/heymumford/Skidbladnir/actions/workflows/ci.yml)

> **About the name**: In Norse mythology, Skíðblaðnir (pronounced "skith-blath-nir") was a magical ship crafted by the dwarven brothers Brokkr and Sindri for the god Freyr. This extraordinary vessel could carry all the Æsir gods and their war gear across seas and skies, yet magically fold small enough to fit in a pocket when not in use. The ship always had a favorable wind and could sail on land, sea, or through the air.
>
> Skíðblaðnir symbolizes perfect engineering, adaptability, and the balance between capacity and efficiency. Like its mythological namesake, our platform transports your test assets across different systems with speed and reliability, adapting to various environments while maintaining the integrity of what it carries.

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

# Install dependencies
npm install

# Start all services in development mode
npm run dev:all

# Run TypeScript API only
npm run dev:api

# Run Python orchestrator only
npm run dev:orchestrator

# Run Go binary processor only
npm run dev:binary

# Run tests
npm run test:all         # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:zephyr      # Test Zephyr Scale API connectivity

# Build the project
npm run build

# Run the master build pipeline (tests, build, containers)
npm run master-build

# Start containerized environment
npm run containers:up

# Stop containerized environment
npm run containers:down
```

For laptop-friendly development (optimized for 16GB RAM machines):

```bash
# Start minimal development environment with laptop-optimized containers
./scripts/laptop-dev.sh
```

### Project Structure

```
skidbladnir/
├── cmd/                    # Entry points for each component
│   ├── api/                # TypeScript API
│   ├── binary-processor/   # Go binary processor
│   └── orchestrator/       # Python orchestrator
├── pkg/                    # Core domain code (language-agnostic)
│   ├── domain/             # Domain entities
│   ├── usecases/           # Application use cases
│   └── interfaces/         # Interface adapters
├── internal/               # Language-specific implementations
│   ├── go/
│   ├── python/
│   └── typescript/
├── infra/                  # Infrastructure configurations
│   ├── dev/
│   ├── qa/
│   └── prod/
├── tests/                  # Test suites
├── scripts/                # Build and automation scripts
└── web/                    # Web UI
```

### Local Services

When running in development mode, services are available at:

- **API**: http://localhost:8080
- **Orchestrator**: http://localhost:8000
- **Binary Processor**: http://localhost:8090

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture](docs/architecture.md) - Architecture documentation and diagrams
- [Development Guide](docs/development-guide.md) - Guide for developers
- [Build System](docs/build-system.md) - Build system documentation
- [Container Strategy](docs/containerization.md) - Container setup details
- [Laptop-Friendly Guide](docs/laptop-friendly-guide.md) - Optimized for 16GB laptops

## Testing Approach

Skidbladnir follows Test-Driven Development (TDD) principles:

1. Write tests first
2. Implement the minimum code needed to pass the tests
3. Refactor the code while keeping tests passing

Our testing strategy includes:

- **Unit Testing**: All components and functions have unit tests
- **Integration Testing**: Test interactions between components
- **API Testing**: Validate provider API interactions with scripts like `test-zephyr-connectivity.js`
- **End-to-End Testing**: Full system tests
- **Performance Testing**: Verify system behavior under load
- **Architecture Validation**: Enforce clean architecture boundaries

For more details, see [TDD Approach](docs/project/tdd-approach.md) and [API Testing Strategy](docs/adrs/0012-api-testing-validation-strategy.md).

## License

MIT