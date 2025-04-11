# Development Guide

This directory contains guides and documentation for developers working with the Skidbladnir project. It covers development workflows, tools, practices, and environment setup.

## Core Development Documents

- [Development Guide](development-guide.md) - Comprehensive guide for developers
- [Build System](build-system.md) - Documentation on the build system and processes
- [Containerization Strategy](containerization.md) - Details on container setup and usage
- [Laptop-Friendly Guide](laptop-friendly-guide.md) - Optimization for 16GB laptops

## Security and Performance

- [Security Audit Guidelines](security-audit-guidelines.md) - Security practices and guidelines
- [XML Cleanup Guide](../xml-cleanup-guide.md) - Guide for working with XML data
- [XML Schema Validation](../xml-schema-validation.md) - XML schema validation processes

## Tools and Integrations

- [Copilot Agent Refactoring](copilot-agent-refactoring.md) - Using GitHub Copilot for refactoring

## Development Workflow

Skidbladnir follows a structured development workflow:

1. **Environment Setup**
   - Clone the repository
   - Install dependencies with `npm install`
   - Set up containers with `npm run containers:up`

2. **Development Process**
   - Write tests first (TDD approach)
   - Implement the minimum code to pass tests
   - Refactor while keeping tests passing
   - Run linting and type-checking
   - Verify architecture compliance

3. **Testing Process**
   - Run unit tests: `npm run test:unit`
   - Run integration tests: `npm run test:integration`
   - Run end-to-end tests: `npm run test:e2e`
   - Check test coverage: `npm run coverage:check`

4. **Build Process**
   - Build TypeScript: `npm run build:ts`
   - Build Python: `npm run build:py`
   - Build Go: `npm run build:go`
   - Build all: `npm run build`

5. **Containerization**
   - Build containers: `npm run containers:build`
   - Start containers: `npm run containers:up`
   - Stop containers: `npm run containers:down`

## Polyglot Development

Skidbladnir is a polyglot application with components in multiple languages:

- **TypeScript/Node.js**: API, transformation layer, UI
- **Python**: Orchestration, LLM components
- **Go**: Binary processing, high-performance components

Each component has language-specific patterns and practices, but all follow the same clean architecture principles and testing approach.

## Development Tools

Key development tools include:

- **NPM Scripts**: Task automation
- **Jest**: JavaScript/TypeScript testing
- **Pytest**: Python testing
- **Go Test**: Go testing
- **ESLint**: TypeScript/JavaScript linting
- **Flake8/Black**: Python linting
- **GoFmt/GoVet**: Go formatting and static analysis
- **Docker/Podman**: Containerization

## Best Practices

1. **Follow Clean Architecture**
   - Respect architectural boundaries
   - Keep dependencies pointing inward
   - Use interfaces for external dependencies

2. **Test-Driven Development**
   - Write tests before implementation
   - Maintain high test coverage
   - Use the testing pyramid approach

3. **Code Quality**
   - Follow language-specific style guides
   - Use strong typing (TypeScript, Python type hints, Go types)
   - Keep functions and methods small and focused

4. **Documentation**
   - Document public APIs
   - Keep READMEs updated
   - Use code comments for complex logic

5. **Containerization**
   - Prefer containerized development
   - Keep containers lightweight
   - Use bind mounts for development