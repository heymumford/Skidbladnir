# Skidbladnir Test Suite

This directory contains the test suite for the Skidbladnir project, following the Test-Driven Development (TDD) approach.

## Test Directory Structure

```
tests/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests between components
└── providers/            # Provider-specific tests
```

## Testing Approach

Skidbladnir follows a strict Test-Driven Development (TDD) approach:

1. **Write the test first**: Before implementing any feature, write tests that define the expected behavior.
2. **Run the test to see it fail**: Verify that the test fails as expected (red).
3. **Implement the minimal code to pass**: Write just enough code to make the test pass (green).
4. **Refactor**: Clean up the code while keeping the tests passing (refactor).
5. **Repeat**: Continue the cycle for each new feature or component.

## Testing Layers

### Unit Tests

Unit tests focus on testing individual functions, classes, and components in isolation:

- Located in the `unit/` directory
- One test file per component or class
- Mock all external dependencies
- Focus on behavior, not implementation details
- Fast execution times

### Integration Tests

Integration tests verify the interactions between different components:

- Located in the `integration/` directory
- Test component boundaries and interactions
- Limited use of mocks, focusing on real interactions
- Verify clean architecture boundaries are respected

### Provider Tests

Provider-specific tests verify that each test management system adapter works correctly:

- Located in the `providers/` directory
- Test provider implementations against their interfaces
- Verify proper API interaction with external systems
- Test error handling and recovery

## Test File Naming Convention

- Unit tests: `ComponentName.test.ts`
- Integration tests: `ComponentA-ComponentB.test.ts`
- Provider tests: `ProviderName.test.ts`

## Running Tests

```bash
# Run all tests
./scripts/test.sh

# Run unit tests only
./scripts/test.sh unit

# Run integration tests only
./scripts/test.sh integration

# Run provider tests only
./scripts/test.sh providers
```

## Test Environment

- Jest for TypeScript/JavaScript tests
- Pytest for Python components
- Go testing framework for Go components
- Mock external APIs using fixtures in `tests/fixtures`
- CI integration runs all tests on pull requests

## Test Documentation

Each test file should follow these documentation guidelines:

1. Clear test descriptions that document expected behavior
2. Arrange-Act-Assert pattern within test cases
3. Comments for complex test setups
4. Copyright header with license information

## References

For more information, see:
- [TDD Approach](../docs/tdd-approach.md)
- [Clean Architecture Guide](../docs/clean-architecture-guide.md)
- [LLM Advisor Tests](../docs/llm-advisor-tests.md)