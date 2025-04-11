# API Mocking Strategy with Karate

## Overview

This document outlines our approach to API mocking in the Skidbladnir project using Karate's powerful mock server capabilities. The mocking strategy enables isolated testing of Skidbladnir's core functionality without requiring actual external API integrations.

## Why Mock APIs?

1. **Isolation**: Test Skidbladnir components in isolation from external dependencies
2. **Speed**: Tests run faster without real API interactions
3. **Control**: Simulate various API responses including edge cases and errors
4. **Reliability**: Tests aren't affected by external API availability or network issues
5. **Complete Coverage**: Test scenarios that would be difficult with real APIs

## Mock API Implementation

We've implemented mock servers for our key integration points:

### Zephyr Mock API

The Zephyr mock API (`zephyr-api-mock.feature`) simulates a Zephyr Scale server with:

- Test case CRUD operations
- Test cycles and test executions
- Attachments management
- Project information
- Proper error handling

### qTest Mock API

The qTest mock API (`qtest-mock.feature`) simulates a qTest server with:

- Test case management (create, read, update, delete)
- Test runs and execution status
- Test cycles for organizing test executions
- Module hierarchy for organizing test cases
- Attachment handling
- Project management

## Using Mock APIs in Tests

The mock APIs can be used in several ways:

### 1. Direct Provider Testing

For testing provider adapters, use the mock APIs directly:

```gherkin
Scenario: Test Zephyr Provider
  * def zephyrMock = karate.start({ mock: 'zephyr-api-mock.feature', port: 8090 })
  
  # Test provider operations against the mock
  # ...
  
  * zephyrMock.stop()
```

### 2. Migration Workflow Testing

For testing the complete migration workflow:

```gherkin
Scenario: Test Migration from Zephyr to qTest
  * def zephyrMock = karate.start({ mock: 'zephyr-api-mock.feature', port: 8090 })
  * def qtestMock = karate.start({ mock: 'qtest-mock.feature', port: 8091 })
  
  # Test migration workflow
  # ...
  
  * zephyrMock.stop()
  * qtestMock.stop()
```

### 3. Integration Testing

For testing system-level integration:

```gherkin
Scenario: Test Integration with Provider APIs
  * def providerMock = karate.start({ mock: 'provider-mocks.feature', port: 8090 })
  
  # Run integration tests
  # ...
  
  * providerMock.stop()
```

## Mock Data Management

The mock APIs maintain in-memory storage for:

- Test cases, test cycles, and test runs
- Attachments and their content
- Projects and modules
- User information

Each mock server starts with default test data for easy verification.

## Dynamic Response Generation

The mock APIs support dynamic response generation based on request parameters:

- Path parameter extraction for specific resources
- Query parameter handling for filtering
- Request body processing for data operations
- Proper status code and header generation

## Best Practices

1. **Clean Up**: Always stop mock servers after tests complete
2. **Isolated Ports**: Use different ports for different mock servers
3. **Data Initialization**: Initialize with consistent test data
4. **Realistic Simulation**: Ensure mocks behave similarly to real APIs
5. **Error Handling**: Test both happy paths and error scenarios

## Extending the Mocks

To add new functionality to a mock:

1. Add new storage variables in the Background section
2. Add default data if needed
3. Add new Scenario matchers for the API endpoints
4. Implement request handling and response generation
5. Update tests to use the new functionality

## Running Tests with Mocks

Tests with mocks can be run using the standard Karate JUnit5 runners. The mock servers are automatically started and stopped as part of the test execution.

```bash
mvn test -Dtest=MigrationTests
```

For CI/CD environments, configure the mock ports to avoid conflicts with other services.