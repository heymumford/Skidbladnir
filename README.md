# Skíðblaðnir

[![Version](https://img.shields.io/badge/version-0.2.7-blue.svg)](https://github.com/heymumford/skidbladnir)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/heymumford/skidbladnir)

Skíðblaðnir is a comprehensive test asset migration platform supporting migrations between major test management systems including Zephyr, qTest, HP ALM/QC, Azure DevOps, TestRail, and more.

## Features

- **Universal Translation**: Migrate test assets between different test management systems
- **Field Mapping**: Configurable mapping of fields between systems
- **Attachment Handling**: Process and migrate test attachments
- **Data Validation**: Validate test data integrity during migration
- **LLM-Assisted Migration**: AI-powered assistance for migration configurations
- **Web UI**: LCARS-inspired user interface for migration management
- **API-First Design**: Full API support for integration and automation

## Quick Start

### Prerequisites

- Docker or Podman
- 8GB RAM minimum (16GB recommended)
- 20GB disk space

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/skidbladnir.git
cd skidbladnir

# Option 1: Docker/Podman Container (Recommended)
npm run release

# Option 2: Local Installation
npm install
npm run build
npm run start
```

Once the application is running, access it at: http://localhost:9090

For detailed installation instructions, see the [Quick Start Guide](docs/setup/QUICKSTART.md).

## Documentation

### User Documentation

- [User Guide](docs/consolidated/user-guide.md) - Complete user documentation
- [Migration Guide](docs/consolidated/user-guide.md#migration-guide) - Detailed migration instructions
- [Troubleshooting](docs/consolidated/user-guide.md#troubleshooting) - Solutions for common issues

### Developer Documentation

- [Architecture](docs/consolidated/architecture.md) - System architecture and components
- [Development Guide](docs/consolidated/development-guide.md) - Setup and development workflow
- [Testing Strategy](docs/consolidated/testing-strategy.md) - Comprehensive testing approach
- [API Guide](docs/consolidated/api-guide.md) - API documentation and usage

### Architecture Decision Records

- [ADR Index](docs/adrs/README.md) - List of all architectural decisions
- [ADR-0017: Pairwise Testing Strategy](docs/adrs/0017-pairwise-testing-strategy.md) - Field mapping testing approach
- [ADR-0016: Cross-Browser UI Testing](docs/adrs/0016-cross-browser-ui-testing.md) - UI testing strategy
- [ADR-0018: Documentation Consolidation](docs/adrs/0018-documentation-consolidation.md) - Documentation organization
- [ADR-0019: Polyglot Test Coverage Strategy](docs/adrs/0019-polyglot-test-coverage-strategy.md) - Unified test coverage approach

### Diagrams

- [C4 Diagrams](docs/architecture/c4-diagrams-updated.md) - Context, container, and component diagrams

## Technology Stack

- **Frontend**: React with LCARS design system
- **API Bridge**: Node.js/TypeScript
- **Binary Processor**: Go
- **Orchestration**: Python
- **LLM Assistant**: Python with quantized local models
- **Storage**: PostgreSQL, Redis, MinIO
- **Containerization**: Docker/Podman

## Development

### Build & Release Commands

```bash
# Full build
npm run build

# Component builds
npm run build:ts    # TypeScript components
npm run build:go    # Go components
npm run build:py    # Python components

# Release management
npm run release     # Build and start containerized application
npm run release:stop # Stop the running container
```

### Test Commands

```bash
# Run all tests
npm test

# Component tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:ui            # UI tests

# Language-specific tests
npm run test:ts            # TypeScript tests
npm run test:go            # Go tests
npm run test:py            # Python tests

# Coverage
npm run coverage:unified           # Check unified coverage (95% target)
npm run coverage:unified:debug     # Check coverage with detailed output
```

For complete development instructions, see the [Development Guide](docs/consolidated/development-guide.md).

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.