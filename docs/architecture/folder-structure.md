# Skidbladnir Folder Structure

This document outlines the folder structure for Skidbladnir, organized according to clean architecture principles and optimized for polyglot implementation.

## Clean Architecture Layers

1. **Core Domain** - Business logic and entities
2. **Use Cases** - Application-specific business rules
3. **Interface Adapters** - Converts data between layers
4. **Frameworks & Drivers** - External interfaces and tools

## Polyglot Implementation

- **TypeScript/Node.js**: API clients, transformers, provider interfaces, UI
- **Python**: Orchestration services, workflow management
- **Go**: High-performance binary processing

## Implemented Structure

```
skidbladnir/
├── cmd/                          # Entry points for applications
│   ├── api/                      # API server entry point (TypeScript)
│   ├── orchestrator/             # Orchestration service entry point (Python)
│   ├── binary-processor/         # Binary processor entry point (Go)
│   ├── ui/                       # UI application entry point (TypeScript)
│   └── cli/                      # CLI tools entry point
│
├── pkg/                          # Domain and application logic (shared by all languages)
│   ├── domain/                   # Core domain layer (Language-agnostic interfaces)
│   │   ├── entities/             # Core business entities
│   │   ├── repositories/         # Repository interfaces
│   │   ├── services/             # Domain service interfaces
│   │   └── errors/               # Domain-specific errors
│   │
│   ├── usecases/                 # Application use cases
│   │   ├── migration/            # Migration workflows
│   │   ├── extraction/           # Asset extraction use cases
│   │   ├── translation/          # Asset translation use cases
│   │   ├── loading/              # Asset loading use cases
│   │   └── advisory/             # LLM advisory use cases
│   │
│   └── interfaces/               # Interface adapters
│       ├── api/                  # API interfaces
│       ├── ui/                   # UI interfaces
│       ├── persistence/          # Persistence interfaces
│       └── providers/            # Test management system interfaces
│
├── internal/                     # Implementation-specific code
│   ├── typescript/               # TypeScript implementations
│   │   ├── api/                  # API service implementation
│   │   │   ├── controllers/      # API controllers
│   │   │   ├── middleware/       # API middleware
│   │   │   ├── routes/           # API routes
│   │   │   └── server/           # Server configuration
│   │   │
│   │   ├── providers/            # Provider implementations
│   │   │   ├── zephyr/           # Zephyr provider
│   │   │   ├── qtest/            # qTest provider
│   │   │   ├── azure-devops/     # Azure DevOps provider
│   │   │   ├── rally/            # Rally provider
│   │   │   ├── hp-alm/           # HP ALM provider
│   │   │   └── excel/            # Excel provider
│   │   │
│   │   ├── ui/                   # UI implementation
│   │   │   ├── components/       # UI components
│   │   │   ├── pages/            # UI pages
│   │   │   ├── hooks/            # React hooks
│   │   │   └── contexts/         # React contexts
│   │   │
│   │   ├── api-bridge/           # API Bridge implementation
│   │   │   ├── handlers/         # API handlers
│   │   │   ├── auth/             # Authentication
│   │   │   └── rate-limiting/    # Rate limiting
│   │   │
│   │   └── common/               # Shared TypeScript utilities
│   │
│   ├── python/                   # Python implementations
│   │   ├── orchestrator/         # Orchestration service
│   │   │   ├── workflows/        # Workflow definitions
│   │   │   ├── tasks/            # Task definitions
│   │   │   ├── state/            # State management
│   │   │   └── api/              # Orchestrator API
│   │   │
│   │   ├── translation/          # Translation layer
│   │   │   ├── mappers/          # Data mappers
│   │   │   ├── validators/       # Data validators
│   │   │   └── transformers/     # Data transformers
│   │   │
│   │   └── llm-advisor/          # LLM advisor implementation
│   │       ├── models/           # LLM models
│   │       ├── inference/        # Inference engine
│   │       └── optimization/     # Performance optimization
│   │
│   └── go/                       # Go implementations
│       ├── binary-processor/     # Binary processor service
│       │   ├── handlers/         # Request handlers
│       │   ├── storage/          # Storage adapters
│       │   └── processors/       # Binary processors
│       │
│       └── common/               # Shared Go utilities
│
├── web/                          # Web assets and client-side code
│   ├── assets/                   # Static assets
│   ├── public/                   # Public files
│   └── styles/                   # Stylesheets
│
├── scripts/                      # Scripts for development and deployment
│   ├── dev/                      # Development scripts
│   ├── build/                    # Build scripts
│   ├── deploy/                   # Deployment scripts
│   └── util/                     # Utility scripts
│
├── infra/                        # Infrastructure configuration
│   ├── dev/                      # Development environment
│   ├── qa/                       # QA environment
│   ├── prod/                     # Production environment
│   └── compose/                  # Docker/Podman compose files
│
├── docs/                         # Documentation
│   ├── adrs/                     # Architecture Decision Records
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture documentation
│   ├── project/                  # Project documentation
│   └── user/                     # User documentation
│
└── tests/                        # Tests
    ├── unit/                     # Unit tests for all languages
    │   ├── typescript/           # TypeScript unit tests
    │   ├── python/               # Python unit tests
    │   └── go/                   # Go unit tests
    │
    ├── integration/              # Integration tests
    │   ├── api/                  # API integration tests
    │   ├── orchestrator/         # Orchestrator integration tests
    │   └── binary-processor/     # Binary processor integration tests
    │
    ├── e2e/                      # End-to-end tests
    └── providers/                # Provider-specific tests
```

## Key Benefits

1. **Clear Architecture Boundaries**:
   - Explicit domain layer independent of implementations
   - Clear separation between use cases and interfaces
   - Interface adapters that connect domain to external systems

2. **Language-Specific Organization**:
   - Dedicated directories for each language (TypeScript, Python, Go)
   - Shared domain models and interfaces
   - Language-specific implementations

3. **Hexagonal Architecture Support**:
   - Ports and adapters clearly separated
   - Domain at the center
   - Infrastructure at the edges

4. **Plugin Architecture**:
   - Provider implementations follow a consistent pattern
   - Easy to add new providers
   - Core functionality independent of specific providers

5. **Testability**:
   - Clean separation makes testing easier
   - Test directories mirror the main code structure
   - Dedicated test directories for each language

## Implementation 

This structure is implemented following TDD principles:

1. Tests validate that:
   - Only README.md exists at the root level (not other .md files)
   - All documentation is properly organized in the docs/ directory
   - Each component has appropriate test coverage

2. The organization ensures:
   - Clean separation of concerns
   - No duplication across directories
   - Consistent naming and structure

This structure balances clean architecture principles with a pragmatic approach to polyglot development, ensuring that the codebase remains maintainable as it grows.