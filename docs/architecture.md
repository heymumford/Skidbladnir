# Skíðblaðnir Architecture

This document provides an overview of the Skíðblaðnir architecture, aligned with the Architecture Decision Records (ADRs) that serve as the definitive source of truth for architectural decisions.

## Architectural Principles

Skíðblaðnir follows these core architectural principles:

1. **Plugin-Based Architecture**: A flexible, extensible design that allows new providers to be added with minimal changes
2. **Universal Translation Layer**: System-agnostic data models that serve as an intermediate representation
3. **Self-Healing Design**: Robust error recovery and automatic remediation of issues
4. **Data Integrity First**: Preservation of relationships and content throughout migration
5. **Containerized Deployment**: Zero external dependencies beyond Podman

## System Components

Skíðblaðnir follows a modular architecture with specialized components for each phase of the migration process:

```
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│  Provider         │      │   Translation     │      │   Provider        │
│  Interface (Src)  │ ─────▶       Layer      │ ─────▶   Interface (Tgt) │
│                   │      │                   │      │                   │
└───────────────────┘      └───────────────────┘      └───────────────────┘
         │                          │                          │
         │                          │                          │
         ▼                          ▼                          ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│  API Bridge       │      │    State Store    │      │    Validation     │
│                   │      │   (PostgreSQL)    │      │     Services      │
│                   │      │                   │      │                   │
└───────────────────┘      └───────────────────┘      └───────────────────┘
         │                          │                          │
         │                          │                          │
┌───────────────────┐               │                          │
│                   │               │                          │
│  Binary Content   │               │                          │
│    Processor      │               │                          │
│                   │               │                          │
└────────┬──────────┘               │                          │
         │                          │                          │
         └──────────────────────────▼──────────────────────────┘
                                    │
                                    ▼
                         ┌───────────────────┐
                         │                   │
                         │   Orchestration   │
                         │     Service       │
                         │                   │
                         └───────────────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │                   │
                         │   LLM Assistant   │
                         │                   │
                         └───────────────────┘
```

## Component Details

### Provider Interface Layer

The Provider Interface Layer implements the plugin architecture defined in [ADR-0002: Provider Interface Design](./adrs/0002-provider-interface-design.md):

- **Provider Registry**: Central registry for all provider implementations
- **Source Provider Interface**: Standard interface for extracting data
- **Target Provider Interface**: Standard interface for loading data
- **Provider Implementations**: 
  - Jira/Zephyr Provider
  - qTest Provider
  - HP ALM/QC Provider
  - Azure DevOps Provider
  - Rally Provider
  - Excel Provider

Key responsibilities:
- Connecting to test management system APIs
- Handling authentication and rate limiting
- Extracting and loading test assets
- Mapping between system-specific and canonical models

### Universal Translation Layer

The Universal Translation Layer provides a system-agnostic intermediate representation:

- **Canonical Models**: Standard data models for test artifacts
- **Mapping Engine**: Transforms between system-specific and canonical models
- **Relationship Mapper**: Preserves relationships between entities
- **Validation Service**: Ensures data integrity during transformation

### API Bridge

The API Bridge, as defined in [ADR-0003: API Bridge Architecture](./adrs/0003-api-bridge-architecture.md), manages complex API interactions:

- **API Specification Parser**: Processes OpenAPI/Swagger specifications
- **Session Manager**: Manages authentication tokens and cookies
- **API Operation Sequencer**: Orchestrates multi-stage operations
- **Authentication Handler**: Supports various authentication methods
- **Request/Response Pipeline**: Processes requests with middleware
- **Error Recovery Engine**: Implements recovery strategies for errors

### Binary Content Processor

The Binary Content Processor handles attachments and binary data:

- **Image Processing**: Handles screenshot format conversions
- **Storage Client**: Manages content in object storage
- **Compression Service**: Optimizes binary data
- **Integrity Checker**: Verifies content checksums

### Orchestration Service

The Orchestration Service coordinates the migration process:

- **Workflow Engine**: Manages the migration pipeline
- **State Machine**: Tracks progress of entities
- **Scheduling Service**: Optimizes migration throughput
- **Monitoring Dashboard**: Provides visibility into progress

### LLM Assistant

The Local LLM Assistant, as defined in [ADR-0004: LLM Assistant Integration](./adrs/0004-llm-assistant-integration.md), provides intelligent support:

- **Quantized LLM Engine**: Local, privacy-focused AI model
- **Knowledge Base**: Specialized corpus of system knowledge
- **API Schema Registry**: Parser for API specifications
- **Inference Pipeline**: RAG-based reasoning system

### Storage Services

Storage services provide persistence for migration state and data:

- **PostgreSQL**: Stores migration state and metadata
- **Redis**: Caches frequently accessed data and coordinates operations
- **MinIO**: Temporary storage for binary content

## Data Flow

The migration process follows this high-level flow:

1. **Extraction Phase**:
   - Provider connects to source system
   - Test assets are retrieved via API
   - Binary content is stored in object storage
   - Extraction state is tracked in PostgreSQL

2. **Transformation Phase**:
   - Source-specific models are converted to canonical models
   - Relationships between entities are mapped
   - Data is validated for consistency
   - Conversion rules are applied

3. **Loading Phase**:
   - Target system structure is created
   - Transformed entities are loaded via API
   - Binary content is uploaded
   - References are maintained between entities

4. **Verification Phase**:
   - Loaded entities are verified
   - Checksums are validated for binary content
   - Relationships are verified
   - Results are reported

## Deployment Architecture

The containerization strategy is defined in [ADR-0005: Containerization Strategy](./adrs/0005-containerization-strategy.md):

- **Development Environment**:
  - Language-specific development containers
  - Local database services
  - Hot reloading for iterative development

- **QA Environment**:
  - Service-oriented containers
  - Mock API servers
  - Test data generation

- **Production Environment**:
  - Optimized service containers
  - Replicated services for reliability
  - Scalable storage for large migrations

## Scalability Considerations

Skíðblaðnir is designed to scale for large migrations:

- **Horizontal Scaling**: Stateless components can be replicated
- **Partitioning**: Work can be divided by test folders/modules
- **Prioritization**: Critical path elements can be prioritized
- **Checkpointing**: Migration can be resumed if interrupted
- **Resource Optimization**: Efficient use of CPU and memory