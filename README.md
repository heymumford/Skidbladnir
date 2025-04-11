# Skíðblaðnir

[![Version](https://img.shields.io/badge/version-0.3.3-blue.svg)](https://github.com/heymumford/Skidbladnir/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://www.python.org/)
[![Go](https://img.shields.io/badge/Go-1.19-blue.svg)](https://golang.org/)
[![TDD](https://img.shields.io/badge/TDD-Clean%20Architecture-orange.svg)](docs/project/tdd-approach.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/heymumford/Skidbladnir/pulls)

## Beta Readiness: 85% Complete
![Progress](https://progress-bar.dev/85/?width=500&title=Zephyr→qTest%20Migration)
[📊 Detailed Progress Tracker](docs/project/progress-tracker.md)

Skíðblaðnir is a containerized, polyglot platform that automates the migration of test assets between different test management systems, solving the problems of manual migration burden, data loss, API complexity, and schema incompatibility. Our primary focus is providing a reliable bridge from Atlassian Jira with Zephyr Scale (source) to Tricentis qTest (destination), demonstrating how future providers should be implemented within our extensible architecture. The platform implements clean architecture with strictly enforced boundaries across TypeScript, Python, and Go components and features a self-healing migration process powered by a local LLM advisor that can troubleshoot API issues and optimize performance with minimal resource requirements.

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

### Primary Focus (Fully Implemented)
- **Source**: Atlassian Jira with Zephyr Scale
- **Destination**: Tricentis qTest

For details on why we prioritize this migration path, see our [Migration Focus](docs/project/migration-focus.md) document.

### Future Support (Architecture Ready)
- Micro Focus ALM/Quality Center (formerly HP ALM)
- Microsoft Azure DevOps
- Rally
- Jama Connect
- TestRail
- Visure Solutions
- Excel/CSV imports/exports

## Key Features

- **Zephyr to qTest Migration**: Specialized support for migrating from Zephyr Scale to qTest
- **Field Mapping**: Intelligent mapping between Zephyr and qTest field structures
- **Cross-Provider Attachment Handling**: Automatic conversion of attachments between Zephyr and qTest formats
- **Batch Attachment Processing**: Efficient parallel processing of multiple attachments with detailed statistics
- **Format Conversion**: Support for converting between XML, JSON, HTML, and Markdown formats
- **API Operation Dependencies**: Ensures operations execute in the correct order based on dependencies
- **Multi-Stage API Handling**: Sophisticated management of complex API flows and authentication
- **Universal Provider Interface**: Standardized adapter system extensible to future platforms
- **Network Resilience**: Comprehensive testing ensures stability under latency, packet loss, connection drops, and intermittent failures
- **Connection Resilience**: Proven testing for all provider combinations under adverse network conditions
- **Circuit Breaker Pattern**: Prevents cascading failures during service degradation
- **Local LLM Advisor**: Llama-3 powered assistant for API troubleshooting and optimization
- **Self-Healing Capabilities**: Automatic recovery from API errors and schema changes
- **LCARS-inspired Interface**: Star Trek styled interface featuring asymmetric panels, blinking status indicators, distinctive color coding, wizard-based workflows, real-time operation monitoring, and intuitive migration controls
- **Complete UI Workflow Testing**: Behavioral testing across all provider combinations
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

### Quick Start (Recommended)

For the simplest possible setup to start migrating from Zephyr Scale to qTest, just run:

```bash
# Clone the repository
git clone https://github.com/heymumford/Skidbladnir.git
cd Skidbladnir

# Run the universal installer (detects your platform and sets up everything)
./install.sh

# Or run the quick-start script directly
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

That's it! A browser window will automatically open to the Skidbladnir web interface where you can configure your Zephyr Scale and qTest connections.

The universal installer (`install.sh`) automatically:
- Detects your platform (Windows, WSL, macOS, or Linux)
- Installs required dependencies (Docker/Podman)
- Configures optimized settings for your environment
- Makes the quick-start script executable

For more details, see the [Quick Start Guide](docs/user/quick-start.md).

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

Comprehensive documentation is organized by category in the `docs/` directory:

### For Users
- [🚀 Quick Start Guide](docs/user/quick-start.md) - Get up and running quickly
- [📘 Migration Guide](docs/user/migration-guide/README.md) - Complete migration user guide
- [🎮 User Interface Guide](docs/ui/user-interface-guide.md) - How to use the LCARS interface
- [♿ Accessibility Guide](docs/user/accessibility-guide.md) - Accessibility features and guidelines
- [🌐 Cross-Browser Support](docs/user/cross-browser-testing-guide.md) - Browser compatibility guide

### For Developers
- [🏗️ Architecture Overview](docs/architecture/README.md) - System architecture and design
- [💻 Development Guide](docs/development/development-guide.md) - For developers
- [🧪 Testing Guide](docs/testing/README.md) - Testing standards and practices
- [🏠 Laptop-Friendly Guide](docs/development/laptop-friendly-guide.md) - Optimized for 16GB laptops
- [🔍 API Documentation](docs/api/README.md) - API specifications and implementations
- [📝 ADRs](docs/adrs/README.md) - Architecture Decision Records
- [🧙 AI Reference](docs/ai-reference/README.md) - AI prompts and reference templates

### Provider Documentation
- [🔌 Provider Interface](docs/api/provider-interface.md) - Platform adapter interface
- [📊 qTest Provider](docs/providers/qtest-architecture.md) - qTest provider implementation
- [📋 Zephyr Provider](docs/user/migration-guide/zephyr-qtest-implementation.md) - Zephyr provider details

### Component Guides
- [🎨 LCARS UI Design System](docs/ui/lcars-design-system.md) - Star Trek inspired interface
- [🔄 API Bridge Architecture](docs/api/api-bridge-architecture.md) - API integration details
- [📦 Containerization](docs/development/containerization.md) - Container setup
- [🧠 LLM Integration](docs/architecture/local-llm-assistant.md) - AI assistant integration

Complete documentation is available in the [Documentation Index](docs/README.md)

## Testing Approach

Skidbladnir follows Test-Driven Development (TDD) principles:

1. Write tests first
2. Implement the minimum code needed to pass the tests
3. Refactor the code while keeping tests passing

Our testing strategy for the Zephyr→qTest migration includes:

- **Unit Testing**: Components and functions have comprehensive unit tests
- **Integration Testing**: Test interactions between components, especially between Zephyr extraction and qTest loading
- **API Testing**: Validate provider API interactions with scripts like `test-zephyr-connectivity.js` and `test-qtest-connectivity.js`
- **UI Workflow Testing**: BDD-style tests for complete user journeys across all provider combinations
- **End-to-End Testing**: Full system tests for complete Zephyr→qTest migrations
- **Performance Testing**: Verify system behavior under load with realistic Zephyr and qTest data volumes
- **Architecture Validation**: Enforce clean architecture boundaries while allowing for provider-specific implementation details

The UI workflow testing ensures that the LCARS-inspired interface correctly supports all provider combinations with robust error handling, field transformations, attachment handling, and internationalization.

For more details, see:
- [TDD Approach](docs/project/tdd-approach.md)
- [API Testing Strategy](docs/adrs/0012-api-testing-validation-strategy.md)
- [UI Workflow Testing Strategy](docs/adrs/0015-ui-workflow-testing-strategy.md)
- [LCARS UI Implementation](docs/adrs/0014-lcars-ui-implementation.md)

## License

MIT