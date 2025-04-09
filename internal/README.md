# Internal Implementation

This directory contains the language-specific implementations of the interfaces defined in the `pkg/` directory. The code here is organized by programming language.

## Directory Structure

- **typescript/**: TypeScript implementations
  - **api/**: API service implementation
  - **providers/**: Provider implementations for test management systems
  - **ui/**: UI implementation
  - **api-bridge/**: API bridge implementation
  - **common/**: Shared TypeScript utilities

- **python/**: Python implementations
  - **orchestrator/**: Orchestration service
  - **translation/**: Translation layer
  - **llm-advisor/**: LLM advisor implementation

- **go/**: Go implementations
  - **binary-processor/**: Binary processor service
  - **common/**: Shared Go utilities

Each language-specific directory implements the interfaces and use cases defined in the `pkg/` directory, following the principles of clean architecture and hexagonal architecture.