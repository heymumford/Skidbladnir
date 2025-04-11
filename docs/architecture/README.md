# Architecture Documentation

This directory contains comprehensive documentation about Skidbladnir's architecture, including clean architecture implementation, diagrams, validation, and structural guidelines.

## Core Architecture Documents

- [Clean Architecture Guide](clean-architecture-guide.md) - Detailed explanation of how Clean Architecture principles are implemented in the project
- [C4 Diagrams](c4-diagrams.md) - System visualization using the C4 model (Context, Container, Component, Code)
- [Folder Structure](folder-structure.md) - Organization of the codebase and rationale behind the structure
- [Architecture Validation Tools](architecture-validation-tools.md) - Tools and approaches for validating architectural compliance

## Cross-Cutting Concerns

- [API Bridge Architecture](api-bridge-architecture.md) - How the API bridge connects different test management systems
- [Cross-Language Dependency Analyzer](cross-language-dependency-analyzer-guide.md) - Tools for analyzing dependencies across TypeScript, Python, and Go
- [Local LLM Assistant](local-llm-assistant.md) - Integration of the local LLM for self-healing capabilities

## Related Architecture Documentation

- [Architecture Decision Records](../adrs/README.md) - Chronological record of architecture decisions
- [API Documentation](../api/README.md) - API specifications and provider implementations
- [Development Guide](../development/README.md) - Development practices that support the architecture

## Architecture Principles

Skidbladnir follows these architectural principles:

1. **Clean Architecture** - Strict separation of concerns with dependencies pointing inward
2. **Polyglot Implementation** - Using the best language for each component while maintaining boundaries
3. **Provider Pattern** - Consistent abstraction for different test management systems
4. **API Operation Dependencies** - Ensuring operations execute in the correct order
5. **Containerization** - Isolation and portability of all system components
6. **Self-Healing Design** - LLM-assisted recovery from errors and API changes

## Architecture Diagram

```
┌────────────────────────────────────────┐
│            Web UI (React)              │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│        API (TypeScript/Node.js)        │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│   Orchestrator (Python/FastAPI)        │
└─┬─────────────────┬─────────────────┬──┘
  │                 │                 │
┌─▼───────────┐ ┌───▼──────────┐ ┌───▼───────────┐
│ API Bridge  │ │ Translation  │ │ Binary        │
│ (TypeScript)│ │ (TypeScript) │ │ Processor (Go)│
└─┬───────────┘ └───┬──────────┘ └───┬───────────┘
  │                 │                │
┌─▼───────────┐ ┌───▼──────────┐ ┌───▼───────────┐
│ Source APIs │ │ LLM Advisor  │ │ Storage       │
│ (External)  │ │ (Python)     │ │ (MinIO)       │
└─────────────┘ └──────────────┘ └───────────────┘
```

## Enforcing Architecture

Architecture boundaries are strictly enforced through:

1. **Pre-commit Hooks** - Validate architectural compliance before allowing commits
2. **Unit Tests** - Test that modules respect architectural boundaries
3. **Dependency Analysis** - Detect violations across language boundaries
4. **CI Pipeline** - Reject changes that violate architecture rules