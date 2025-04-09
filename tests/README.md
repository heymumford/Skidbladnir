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

## Test Documentation Standards

All tests in this repository must follow the established [Test Documentation Standards](../docs/test-documentation-standards.md). These standards ensure consistency, clarity, and maintainability across all test types and languages.

## Testing Frameworks

Skidbladnir uses multiple testing frameworks based on the test level and language:

- **Unit Tests**: Jest (TypeScript), Pytest (Python), Go testing (Go)
- **API Tests**: Karate (language-agnostic API testing)
- **Acceptance Tests**: Cucumber.js (BDD-style tests)

### Karate Testing

For API testing, we use Karate framework. If you're new to Karate, check out these resources:

- [Karate Test Syntax Guide](../docs/karate-test-syntax-guide.md) - Quick reference for Karate syntax
- [Karate Testing Strategy](../docs/karate-testing-strategy.md) - Overview of our Karate testing approach
- [Karate API Mocking Strategy](../docs/karate-api-mocking.md) - Guide to using Karate for API mocking