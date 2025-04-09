# Tests

This directory contains all the tests for Skidbladnir, organized by test type and language.

## Directory Structure

- **unit/**: Unit tests for all languages
  - **typescript/**: TypeScript unit tests
  - **python/**: Python unit tests
  - **go/**: Go unit tests

- **integration/**: Integration tests
  - **api/**: API integration tests
  - **orchestrator/**: Orchestrator integration tests
  - **binary-processor/**: Binary processor integration tests

- **e2e/**: End-to-end tests

- **providers/**: Provider-specific tests

## Test Philosophy

Skidbladnir follows a Test-Driven Development (TDD) approach:

1. Write a failing test
2. Implement the minimum code to make the test pass
3. Refactor while keeping tests passing

For more information, see the [TDD Approach](../docs/project/tdd-approach.md) documentation.