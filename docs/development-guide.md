# Skíðblaðnir Development Guide

This document provides guidelines for developers working on the Skíðblaðnir project, aligned with the Architecture Decision Records (ADRs) that serve as the definitive source of truth for architectural decisions.

## Development Environment Setup

### Prerequisites

- Podman 3.x+
- That's it! All other dependencies are containerized

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/skidbladnir.git
   cd skidbladnir
   ```

2. Start the development environment:
   ```bash
   ./scripts/dev-env.sh up
   ```

3. Access a development container:
   ```bash
   # For TypeScript development
   ./scripts/dev-container.sh typescript
   
   # For Python development
   ./scripts/dev-container.sh python
   
   # For Go development
   ./scripts/dev-container.sh go
   ```

## Development Workflow

### Test-Driven Development Workflow

Skíðblaðnir follows strict TDD practices. For each feature:

1. **Write a Test**: Create a failing test that defines the expected behavior
2. **Implement the Feature**: Write the minimal code to make the test pass
3. **Refactor**: Clean up the code while keeping tests passing
4. **Commit**: Include both tests and implementation in your commit

### Git Workflow

- **Main Branch**: Production-ready code
- **Develop Branch**: Integration branch for features
- **Feature Branches**: Named `feature/feature-name`
- **Fix Branches**: Named `fix/issue-description`

### Commit Guidelines

- Use descriptive commit messages
- Reference issue numbers: `#123`
- Follow the format: `component: brief description of change`
- Keep commits focused on a single logical change

## Package Structure

The project follows the structure defined in [ADR-0001: Architectural Foundations](./adrs/0001-architectural-foundations.md):

```
skidbladnir/
├── packages/                # Core packages
│   ├── core/                # Shared models and utilities
│   ├── providers/           # Test management system providers
│   │   ├── zephyr/          # Jira/Zephyr provider
│   │   ├── qtest/           # qTest provider
│   │   ├── hp-alm/          # HP ALM/QC provider
│   │   ├── azure-devops/    # Azure DevOps provider
│   │   ├── rally/           # Rally provider
│   │   └── excel/           # Excel provider
│   ├── api-bridge/          # API integration framework
│   ├── llm-assistant/       # Local LLM for troubleshooting
│   ├── orchestrator/        # Workflow orchestration service
│   └── binary-processor/    # Binary content processor
├── infra/                   # Infrastructure configuration
│   ├── dev/                 # Development environment
│   ├── qa/                  # QA/Testing environment
│   └── prod/                # Production environment
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── tests/                   # End-to-end tests
```

## Testing Guidelines

### Testing Frameworks

- **TypeScript/Node.js**: Jest with ts-jest
- **Python**: pytest with pytest-asyncio
- **Go**: standard testing package with testify

### Test Organization

- **Unit Tests**: Located alongside the code they test
- **Integration Tests**: In dedicated `integration` directories
- **End-to-End Tests**: In the root `tests` directory

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Component Tests**: Test bounded contexts
3. **Integration Tests**: Test cross-component interactions
4. **Contract Tests**: Test API boundaries
5. **End-to-End Tests**: Test complete workflows

### Running Tests

```bash
# Run all tests
./scripts/test.sh

# Run specific types of tests
./scripts/test.sh unit
./scripts/test.sh integration
./scripts/test.sh e2e

# Run tests with verbose output
./scripts/test.sh --verbose
```

## Provider Development

When implementing a new provider, follow the guidelines in [ADR-0002: Provider Interface Design](./adrs/0002-provider-interface-design.md):

1. Create a new package in `packages/providers`
2. Implement the provider interfaces:
   - `TestManagementProvider` (base)
   - `SourceProvider` (if supporting extraction)
   - `TargetProvider` (if supporting loading)
3. Register capabilities accurately
4. Add comprehensive tests
5. Register with the `ProviderRegistry`

## API Bridge Usage

When working with the API Bridge, follow the guidelines in [ADR-0003: API Bridge Architecture](./adrs/0003-api-bridge-architecture.md):

1. Parse API specifications when available
2. Use the Session Manager for authentication
3. Create operation sequences for multi-stage APIs
4. Implement appropriate error recovery strategies
5. Integrate with the LLM Assistant for complex errors

## Containerization

The containerization strategy is defined in [ADR-0005: Containerization Strategy](./adrs/0005-containerization-strategy.md):

1. Use language-specific development containers
2. Keep Dockerfiles clean and minimal
3. Use multi-stage builds for production images
4. Implement proper layer caching
5. Follow security best practices for containers

## API Documentation

- Use TypeDoc for TypeScript interfaces
- Use Sphinx for Python APIs
- Use Go Doc for Go packages
- Keep documentation up-to-date with code changes

## Code Style

### TypeScript/JavaScript

- Follow the TypeScript ESLint configuration
- Use strict typing
- Document interfaces and public methods
- Follow functional programming principles where appropriate

### Python

- Follow PEP 8 style guide
- Use type hints
- Use virtual environments via Poetry
- Follow snake_case naming convention

### Go

- Follow standard Go conventions
- Use gofmt for formatting
- Follow golangci-lint rules
- Implement comprehensive error handling

## Review Process

1. Create a feature branch from `develop`
2. Implement the feature with tests
3. Open a pull request
4. Address code review feedback
5. Merge to `develop` when approved
6. Periodically merge `develop` to `main` for releases

## Troubleshooting

- **Container Issues**: Use `./scripts/dev-env.sh restart` to restart containers
- **Dependency Problems**: Container caches may need clearing with `--no-cache`
- **Test Failures**: Check for race conditions in async tests
- **IDE Integration**: Use VS Code Remote Containers for seamless integration