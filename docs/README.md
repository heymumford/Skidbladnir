# Skidbladnir Documentation

This directory contains comprehensive documentation for the Skidbladnir project, organized into a structured hierarchy for easy navigation and reference.

## Documentation Structure

```
docs/
├── adrs/                    # Architecture Decision Records (numbered sequences)
├── architecture/            # System architecture documentation
├── api/                     # API and provider integration details
├── development/             # Development guides and standards
├── project/                 # Project management documents
├── testing/                 # Testing strategies and frameworks
├── ui/                      # User interface design and implementation
└── user/                    # End-user guides and tutorials
    └── migration-guide/     # Specific migration path documentation
```

## Main Documentation Categories

### [Architecture](architecture/README.md)
Comprehensive documentation of the system's architecture, including:
- [Clean Architecture Implementation](architecture/clean-architecture-guide.md)
- [C4 Diagrams](architecture/c4-diagrams.md)
- [Folder Structure](architecture/folder-structure.md)
- [Architecture Validation Tools](architecture/architecture-validation-tools.md)
- [Cross-Language Dependency Analysis](architecture/cross-language-dependency-analyzer-guide.md)

### [API](api/README.md)
Details on API specifications, bridges, and provider implementations:
- [Provider Interface Design](api/provider-interface.md)
- [API Comparison](api/api-comparison.md)
- [API Bridge Architecture](api/api-bridge-architecture.md)
- [Operation Dependency System](api/operation-dependency-system.md)
- [Cross-Component Testing](api/cross-component-testing.md)
- [Cross-Language Contract Testing](api/cross-language-contract-testing.md)

### [Development](development/README.md)
Development procedures, environments, and practices:
- [Development Guide](development/development-guide.md)
- [Build System](development/build-system.md)
- [Containerization Strategy](development/containerization.md)
- [Laptop-Friendly Development](development/laptop-friendly-guide.md)
- [Security Guidelines](development/security-audit-guidelines.md)
- [Copilot Agent Integration](development/copilot-agent-refactoring.md)

### [Testing](testing/README.md)
Test methodologies, frameworks, and standards:
- [Test Pyramid Approach](testing/test-pyramid-approach.md)
- [Test Documentation Standards](testing/test-documentation-standards.md)
- [Acceptance Testing](testing/acceptance-testing.md)
- [Karate Testing Strategy](testing/karate-testing-strategy.md)
- [Karate API Mocking](testing/karate-api-mocking.md)
- [LLM Component Testing](testing/llm-advisor-tests.md)

### [UI](ui/README.md)
User interface design principles and implementation:
- [Design System](ui/design-system.md)
- [LCARS Design System](ui/lcars-design-system.md)
- [User Interface Guide](ui/user-interface-guide.md)

### [User Guides](user/README.md)
End-user documentation for using the system:
- [Migration Guide](user/migration-guide/README.md)
  - [API Token Guide](user/migration-guide/api-token-guide.md)
  - [Field Mapping Reference](user/migration-guide/field-mapping-reference.md)
  - [Transformation Examples](user/migration-guide/transformation-examples.md)
  - [Zephyr to qTest Implementation](user/migration-guide/zephyr-qtest-implementation.md)
  - [Troubleshooting](user/migration-guide/troubleshooting.md)
- [Quick Start Guide](user/quick-start.md)
- [Accessibility Guide](user/accessibility-guide.md)
- [Cross-Browser Testing Guide](user/cross-browser-testing-guide.md)

### [Project](project/README.md)
Project management documents and tracking:
- [About](project/about.md)
- [Kanban Board](project/kanban.md)
- [Progress Tracker](project/progress-tracker.md)
- [Strategy](project/strategy.md)
- [TDD Approach](project/tdd-approach.md)
- [Versioning](project/versioning.md)

### [Architecture Decision Records](adrs/README.md)
Chronological record of architecture decisions:
- [ADR-0001: Architectural Foundations](adrs/0001-architectural-foundations.md)
- [ADR-0002: Provider Interface Design](adrs/0002-provider-interface-design.md)
- [ADR-0003: API Bridge Architecture](adrs/0003-api-bridge-architecture.md)
- [ADR-0014: LCARS UI Implementation](adrs/0014-lcars-ui-implementation.md)
- [ADR-0015: UI Workflow Testing Strategy](adrs/0015-ui-workflow-testing-strategy.md)

## Getting Started

- [Quick Start Guide](./user/quick-start.md) - Get up and running quickly
- [Development Guide](./development/development-guide.md) - Guide for developers
- [Migration Guide](./user/migration-guide/README.md) - End-user migration guide

## Documentation Standards

When adding or updating documentation:
1. Follow the established directory structure
2. Use Markdown formatting consistently
3. Link related documents together
4. Update the appropriate README.md files
5. Ensure content is accurate and up-to-date
6. Include code examples where appropriate
7. Use relative links for internal references