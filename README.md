# Skíðblaðnir

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

For laptop-friendly development (optimized for 16GB RAM machines):

```bash
# Start minimal development environment
./scripts/laptop-dev.sh up minimal
```

### Local Services

All services are hosted locally either within containers or on the development machine:

- **API**: http://localhost:3000
- **Orchestrator**: http://localhost:8000
- **Binary Processor**: http://localhost:9000
- **Web UI**: http://localhost:3001

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture](docs/architecture.md) - Architecture documentation and diagrams
- [Development Guide](docs/development-guide.md) - Guide for developers
- [Build System](docs/build-system.md) - Build system documentation
- [Container Strategy](docs/containerization.md) - Container setup details
- [Laptop-Friendly Guide](docs/laptop-friendly-guide.md) - Optimized for 16GB laptops

## License

MIT