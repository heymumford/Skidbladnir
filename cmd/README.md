# Command-line Applications

This directory contains the entry points for all Skidbladnir applications. Each subdirectory represents a distinct application or service.

## Directory Structure

- **api/**: API service entry point (TypeScript)
- **orchestrator/**: Orchestration service entry point (Python)
- **binary-processor/**: Binary processor entry point (Go)
- **ui/**: UI application entry point (TypeScript)
- **cli/**: CLI tools entry point

Each entry point is responsible for:
1. Initializing the application
2. Loading configuration
3. Setting up dependency injection
4. Starting the appropriate service
5. Handling shutdown signals

These entry points should be kept minimal, delegating most functionality to the packages in the `pkg/` and `internal/` directories.