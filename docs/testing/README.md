# Testing Documentation

This directory contains comprehensive documentation about Skidbladnir's testing strategies, frameworks, and best practices.

## Core Testing Documents

- [Test Pyramid Approach](test-pyramid-approach.md) - Structured approach to testing with unit, integration, and end-to-end tests
- [Test Documentation Standards](test-documentation-standards.md) - Standards for documenting tests
- [Acceptance Testing](acceptance-testing.md) - Behavior-driven development and acceptance testing
- [Karate Testing Strategy](karate-testing-strategy.md) - API testing with Karate
- [Karate Test Syntax Guide](karate-test-syntax-guide.md) - Reference for Karate syntax
- [Karate API Mocking](karate-api-mocking.md) - API mocking with Karate

## Component-Specific Testing

- [LLM Advisor Tests](llm-advisor-tests.md) - Testing the LLM advisor component
- [Binary Processor Large Test Cases](../binary-processor-large-testcases.md) - Testing large test cases in the binary processor

## Testing Approach

Skidbladnir follows a comprehensive testing strategy based on the testing pyramid:

### Unit Tests (Base of the Pyramid)
- Test individual functions, classes, and components in isolation
- Mock external dependencies
- Fast execution
- High coverage (>80%)
- Examples: `npm run test:unit`, `npm run test:py:unit`, `npm run test:go`

### Integration Tests (Middle of the Pyramid)
- Test interactions between components
- Test API contracts
- Test cross-language integration
- Examples: `npm run test:integration`, `npm run test:api:contracts`

### End-to-End Tests (Top of the Pyramid)
- Test complete user workflows
- Test system behavior as a whole
- Examples: `npm run test:e2e`, `npm run test:workflow`

### Specialized Testing
- API Testing (Karate)
- UI Component Testing (React Testing Library)
- Cross-Browser Testing (Cypress)
- Performance Testing
- Security Testing

## Testing Tools

Skidbladnir uses various testing tools across its polyglot architecture:

### JavaScript/TypeScript
- **Jest**: Unit and integration testing
- **React Testing Library**: UI component testing
- **Cypress**: End-to-end and cross-browser testing
- **jest-axe**: Accessibility testing

### Python
- **Pytest**: Unit and integration testing
- **FastAPI TestClient**: API testing
- **unittest.mock**: Mocking and stubbing

### Go
- **Go Test**: Native Go testing
- **testify**: Assertions and mocking
- **httptest**: HTTP testing

### Cross-Language
- **Karate**: API testing and mocking
- **Cucumber**: Behavior-driven development

## Best Practices

1. **Follow TDD Approach**
   - Write tests before implementation
   - Red-Green-Refactor cycle
   - Use testable designs

2. **Maintain High Coverage**
   - Aim for >80% code coverage
   - Cover edge cases and error conditions
   - Use `npm run coverage:check` to verify

3. **Use Meaningful Test Names**
   - Describe what is being tested
   - Follow the "Given-When-Then" pattern
   - Example: `should_return_error_when_api_token_is_invalid`

4. **Isolate Tests**
   - Tests should not depend on each other
   - Clean up test data after each test
   - Use fresh fixtures for each test

5. **Test Real-World Scenarios**
   - Test with realistic data
   - Test error conditions
   - Test performance characteristics

## Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:api

# Run tests for specific components
npm run test:zephyr  # Test Zephyr API connectivity
npm run test:qtest   # Test qTest API connectivity

# Check test coverage
npm run coverage:check
```

## TDD Metrics

Skidbladnir includes a TDD metrics tool that tracks test coverage and quality:

```bash
# Run TDD metrics
npm run tdd-metrics:all

# Visualize TDD metrics
npm run tdd-metrics:visualize
```