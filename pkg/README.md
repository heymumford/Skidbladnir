# Package Directory

This directory contains the core domain models, use cases, and interfaces that make up the Skidbladnir application. The code here is language-agnostic and represents the shared concepts across all implementations.

## Directory Structure

- **domain/**: Core domain models and business logic
  - **entities/**: Domain entities representing core concepts
  - **repositories/**: Repository interfaces for data access
  - **services/**: Domain service interfaces
  - **errors/**: Domain-specific error types

- **usecases/**: Application-specific use cases
  - **migration/**: Migration workflows
  - **extraction/**: Test asset extraction use cases
  - **translation/**: Test asset translation use cases
  - **loading/**: Test asset loading use cases
  - **advisory/**: LLM advisory use cases

- **interfaces/**: Adapter interfaces
  - **api/**: API interfaces
  - **ui/**: UI interfaces
  - **persistence/**: Persistence interfaces
  - **providers/**: Test management system provider interfaces

These packages define the core abstractions of the system and are implemented by the language-specific code in the `internal/` directory.