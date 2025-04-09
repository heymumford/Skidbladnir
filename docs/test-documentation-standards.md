# Test Documentation Standards

This document defines comprehensive standards for test documentation across all languages and test types in the Skidbladnir project. These standards ensure consistency, maintainability, and clarity in our test suites.

## Table of Contents

1. [Test File Organization](#test-file-organization)
2. [Test Naming Conventions](#test-naming-conventions)
3. [Test Documentation Format](#test-documentation-format)
4. [Test Structure Standards](#test-structure-standards)
5. [Language-Specific Standards](#language-specific-standards)
6. [Test Coverage Requirements](#test-coverage-requirements)
7. [Test Data Documentation](#test-data-documentation)
8. [Special Testing Considerations](#special-testing-considerations)

## Test File Organization

### Directory Structure

Tests must be organized according to the following structure:

```
tests/
├── unit/                   # Unit tests (smallest testable parts)
│   ├── typescript/         # TypeScript unit tests
│   ├── python/             # Python unit tests
│   └── go/                 # Go unit tests
├── integration/            # Integration tests (component interactions)
│   ├── api/                # API integration tests
│   ├── orchestrator/       # Orchestrator integration tests
│   └── binary-processor/   # Binary processor integration tests
├── api-integration/        # Karate API integration tests
│   ├── contracts/          # API contract tests
│   ├── performance/        # Performance tests
│   └── mocks/              # Mock API implementations
├── e2e/                    # End-to-end tests
└── acceptance/             # Cucumber.js acceptance tests
    ├── features/           # Feature files
    └── step_definitions/   # Step implementations
```

### File Placement Rules

1. **Co-location Principle**: Test files should be close to the code they're testing
   - For domain-driven components, organize tests by domain concept
   - For infrastructure components, organize tests by component
   - For cross-cutting concerns, organize tests by functionality

2. **Clean Architecture Alignment**: Test files must respect the Clean Architecture boundaries
   - Tests for domain entities should be in `unit/domain/entities`
   - Tests for use cases should be in `unit/domain/services` or `integration/` as appropriate
   - Tests for infrastructure should be in their respective integration directories

## Test Naming Conventions

### File Naming

1. **TypeScript/JavaScript Tests**:
   - Unit tests: `{ComponentName}.test.ts`
   - Integration tests: `{ComponentRelationship}.test.ts`
   - Use kebab-case for multi-word component names: `entity-validator.test.ts`

2. **Python Tests**:
   - Unit tests: `test_{component_name}.py`
   - Integration tests: `test_{component_relationship}.py`
   - Use snake_case for Python files: `test_workflow_manager.py`

3. **Go Tests**:
   - Unit tests: `{componentname}_test.go`
   - Integration tests: `{componentrelationship}_test.go`
   - Use snake_case for Go files: `test_case_storage_test.go`

4. **Karate Tests**:
   - Feature files: `{feature-name}.feature`
   - Test runners: `{Category}Tests.java`
   - Use kebab-case for feature names: `api-contract-validation.feature`

5. **Cucumber Tests**:
   - Feature files: `{feature-name}.feature`
   - Step definitions: `{feature-name}.steps.ts`
   - Use kebab-case for feature names: `migration-workflow.feature`

### Test Case Naming

1. **Unit/Integration Tests**:
   - Format: `should {expected behavior} when {condition}`
   - Example: `should return validation errors when email format is invalid`
   - Be specific about behavior and conditions
   - Avoid vague descriptors like "correctly" or "properly"

2. **Karate/Cucumber Tests**:
   - Scenario format: `{Action} {Component/Feature} {Expected Result}`
   - Example: `Validate test case representation across API and Orchestrator`
   - Use active voice for feature and scenario descriptions
   - Include the business value whenever possible

## Test Documentation Format

### Required Documentation for All Tests

1. **Test File Header**:
   ```
   /**
    * Copyright (C) 2025 Eric C. Mumford (@heymumford)
    * 
    * This file is part of Skidbladnir.
    * 
    * Skidbladnir is free software: you can redistribute it and/or modify
    * it under the terms of the MIT License as published in the LICENSE file.
    */
   ```

2. **Feature/Test Suite Description**:
   - For Karate/Cucumber: First line after `Feature:` should describe the purpose
   - For unit tests: First sentence in the top-level `describe` should describe purpose
   - Be specific about what aspect of the system is being tested

### Documentation Standards by Test Type

1. **Unit Tests**:
   - Document the purpose of each test group (describe block)
   - Use AAA pattern comments: `// Arrange`, `// Act`, `// Assert`
   - Document any non-obvious test data setup
   - Comment on any complex assertions or edge cases

2. **Integration Tests**:
   - Document system components being tested together
   - Document any mocks or test doubles being used
   - Document external dependencies and how they're managed
   - Document cross-component interactions being verified

3. **Karate API Tests**:
   - Document test prerequisites in Background section
   - Include schema definitions for validation
   - Document purpose of each API call with comments
   - Document any non-obvious assertions

4. **Acceptance Tests**:
   - Add business context documentation before scenarios
   - Document acceptance criteria as Given-When-Then
   - Include stakeholder requirements in feature descriptions
   - Document any business rules being tested

## Test Structure Standards

### Unit Test Structure

All unit tests should follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should expectedBehavior when condition', () => {
      // Arrange
      const testData = setupTestData();
      
      // Act
      const result = methodUnderTest(testData);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Integration Test Structure

Integration tests should clearly separate setup, execution, and verification:

```typescript
describe('ComponentInteraction', () => {
  // Setup components and dependencies
  beforeEach(() => {
    // Initialize components and mocks
  });
  
  it('should complete workflow when components interact', () => {
    // Setup specific test conditions
    
    // Execute integration point
    
    // Verify results across components
  });
  
  afterEach(() => {
    // Cleanup resources
  });
});
```

### Karate API Test Structure

Karate tests should follow this structure:

```gherkin
Feature: Feature name and purpose
  Description of feature functionality and scope

  Background:
    # Setup common test data and configurations
    * def baseUrl = 'http://localhost:8080/api'
    * def testData = read('test-data.json')
    
  Scenario: Test specific API behavior
    # Setup
    Given url baseUrl
    And path '/endpoint'
    And request requestBody
    
    # Execution
    When method POST
    
    # Verification
    Then status 200
    And match response == expectedSchema
```

### Acceptance Test Structure

Cucumber tests should follow this structure:

```gherkin
Feature: Feature name from user perspective
  As a [type of user]
  I want [feature]
  So that [business value]

  Background:
    Given common preconditions
    
  Scenario: User accomplishes business goal
    Given initial context
    When user action
    Then expected outcome
```

## Language-Specific Standards

### TypeScript/JavaScript Tests (Jest)

1. **Import Organization**:
   - Domain imports first
   - Application/use case imports second
   - Infrastructure imports last
   - Test utilities last

2. **Mocking Standards**:
   - Use explicit mock functions: `jest.fn()`
   - Document mock behaviors
   - Reset mocks between tests: `jest.resetAllMocks()`
   - Verify mock calls for critical dependencies

3. **Assertion Standards**:
   - Use specific matchers: `.toEqual()` over `.toBe()` for objects
   - Test both positive and negative conditions
   - Test edge cases and boundaries
   - Prefer multiple specific assertions over fewer generic ones

### Python Tests (pytest)

1. **Fixture Documentation**:
   - Document each fixture with docstrings
   - Specify fixture scope explicitly
   - Document dependencies between fixtures

2. **Test Documentation**:
   - Use docstrings for test functions
   - Document parametrized tests clearly
   - Document test class purpose

3. **Assertion Standards**:
   - Use pytest's built-in assertions
   - Provide clear assertion messages
   - Test both positive and negative conditions

### Go Tests

1. **Test Function Documentation**:
   - Document test purpose in comments
   - Document test cases clearly
   - Document setup and teardown

2. **Table-Driven Tests**:
   - Document each test case in the table
   - Use descriptive names for test cases
   - Structure tables for readability

3. **Assertion Standards**:
   - Use testify assertions for clarity
   - Provide descriptive error messages
   - Test both positive and negative conditions

### Karate Tests

1. **Feature Documentation**:
   - Document feature purpose in first line
   - Document background setup
   - Document each scenario's business purpose

2. **Schema Definitions**:
   - Define and document schemas for validation
   - Include all required fields
   - Document validation markers

3. **Helper Functions**:
   - Document each JavaScript function
   - Include parameter and return type information
   - Explain complex logic

## Test Coverage Requirements

1. **Minimum Coverage Requirements**:
   - Domain layer: 95% line coverage
   - Use case layer: 90% line coverage
   - Interface adapters: 85% line coverage
   - Infrastructure: 75% line coverage

2. **Quality Coverage Requirements**:
   - Test all error paths and edge cases
   - Test boundary conditions
   - Test validation rules completely
   - Test business invariants

3. **Architectural Coverage Requirements**:
   - Test all port interfaces completely
   - Test all adapter implementations
   - Test cross-cutting concerns (logging, error handling)
   - Test configuration-dependent behavior

## Test Data Documentation

1. **Test Data Files**:
   - Document source and purpose of test data
   - Explain any non-obvious values
   - Document relationships between test data entities

2. **In-line Test Data**:
   - Document the purpose of test data
   - Explain edge cases and boundary values
   - Document data transformations

3. **Test Fixtures**:
   - Document fixture purpose and scope
   - Document fixture dependencies
   - Document fixture cleanup requirements

## Special Testing Considerations

### 1. API Rate Limiting Tests

For rate limiting tests, document:
- Rate limit thresholds being tested
- Expected behavior when limits are reached
- Recovery behavior after limit period expires

### 2. Concurrency Tests

For concurrency tests, document:
- Race conditions being tested
- Expected thread-safe behavior
- Synchronization mechanisms
- Test assumptions about execution order

### 3. Performance Tests

For performance tests, document:
- Performance thresholds
- Test environment specifications
- Load generation approach
- Measurement methodology
- Baseline performance expectations

### 4. Security Tests

For security tests, document:
- Security vulnerability being tested
- Attack vectors simulated
- Expected security controls
- Compliance requirements being verified

## Conclusion

These test documentation standards aim to ensure that all tests in the Skidbladnir project are well-documented, maintainable, and effective. Adhering to these standards will improve test quality, reduce maintenance costs, and enhance the overall reliability of the system.

## References

- [Clean Architecture Testing Guide](../docs/adrs/0007-tdd-clean-architecture.md)
- [TDD Approach](../docs/project/tdd-approach.md)
- [Karate Testing Strategy](../docs/karate-testing-strategy.md)
- [Karate Test Syntax Guide](../docs/karate-test-syntax-guide.md)