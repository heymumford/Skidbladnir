# Skidbladnir API Integration Tests

This directory contains API integration tests for the Skidbladnir project using the Karate testing framework.

## Overview

Karate is a powerful API testing framework that combines API test-automation, assertions, mocks, and performance testing into a single tool. These tests focus on:

1. **API Contract Testing**: Validating that API endpoints conform to expected schemas
2. **Integration Testing**: Testing communication between different services
3. **Performance Testing**: Evaluating API performance and rate limiting
4. **API Mocking**: Creating mock APIs for isolated testing

## Structure

```
tests/api-integration/
├── pom.xml                   # Maven configuration for Karate
├── src/test/java/
│   ├── karate-config.js      # Main configuration file
│   ├── org/skidbladnir/
│   │   ├── contracts/        # API contract tests
│   │   ├── integration/      # Service integration tests
│   │   ├── performance/      # Performance tests
│   │   ├── mocks/            # API mocks
│   │   └── KarateTests.java  # Main test runner
```

## Test Categories

1. **Contract Tests**: Verify API schemas and responses match expected formats
   - Test Case API contracts
   - Provider API contracts
   - Workflow API contracts

2. **Integration Tests**: Verify communication between services
   - API to Orchestrator integration
   - Orchestrator to Binary Processor integration
   - End-to-end migration flows
   - Cross-component communication across all services

3. **Performance Tests**: Measure API performance
   - API rate limiting tests
   - Migration performance tests

4. **API Mocks**: Create mock APIs for isolated testing
   - Provider API mocks (Zephyr and qTest)
   - Service API mocks
   - Migration workflow testing with mock APIs

## Running the Tests

### Prerequisites

- Java 11+
- Maven 3.6+

### Running Tests

From the project root directory:

```bash
# Run all API tests
npm run test:api

# Run specific test categories
npm run test:api:contracts
npm run test:api:integration
npm run test:api:performance
npm run test:api:cross-component
```

Or directly with Maven:

```bash
cd tests/api-integration
mvn test                                 # Run all tests
mvn test -Dtest=ContractTests            # Run only contract tests
mvn test -Dtest=IntegrationTests         # Run only integration tests
mvn test -Dtest=PerformanceTests         # Run only performance tests
mvn test -Dtest=MockTests                # Run only mock API tests
mvn test -Dtest=MigrationTests           # Run only migration workflow tests
mvn test -Dtest=ContractTests#testCrossComponentOnly  # Run only cross-component tests
mvn test -Dkarate.env=perf               # Run with performance environment config
```

### Test Reports

HTML reports will be generated in:
```
tests/api-integration/target/cucumber-reports/
```

## Configuration

Different environments can be configured in `karate-config.js`. Available environments:

- `dev`: Development environment (default)
- `qa`: QA environment
- `prod`: Production environment
- `perf`: Performance testing environment

To specify an environment, use:

```bash
mvn test -Dkarate.env=qa
```

## Performance Testing

For performance tests, you can configure:

```bash
mvn test -Dkarate.env=perf -DthreadCount=20 -DiterationCount=100
```

## API Mocking

The mock APIs provide simulated endpoints for various provider systems:

### Zephyr Mock API

The Zephyr mock (`src/test/java/org/skidbladnir/mocks/zephyr-api-mock.feature`) provides:
- Test case management (CRUD operations)
- Test cycles and executions
- Attachments with binary content
- Project structure
- Default data for testing

### qTest Mock API

The qTest mock (`src/test/java/org/skidbladnir/mocks/qtest-mock.feature`) provides:
- Test case management 
- Test runs and execution status
- Test cycles for organizing test runs
- Module hierarchy for organizing test cases
- Attachments and binary content
- Projects and relationships

### Using Mocks in Tests

Mocks can be used in tests by starting a mock server:

```java
// Start a mock server on a specific port
def mockServer = karate.start({ mock: 'mocks/zephyr-api-mock.feature', port: 8090 })

// Make requests to the mock
http('http://localhost:8090/api/test-cases')

// Stop the mock when done
mockServer.stop()
```

See the `migration-workflow.feature` for an example of using multiple mocks together to test a complete migration workflow.

## Contributing

When adding new tests:

1. Place them in the appropriate directory based on their category
2. Update the relevant test runner class
3. Follow the Karate naming conventions and format
4. Add documentation for test scenarios
5. Include examples of how to use new features

## Learning Resources

New to Karate? Check out these resources:

- [Karate Test Syntax Guide](/docs/karate-test-syntax-guide.md) - Quick reference for Karate syntax
- [Karate API Mocking Strategy](/docs/karate-api-mocking.md) - Guide to using Karate for API mocking
- [Official Karate Documentation](https://github.com/karatelabs/karate) - Complete Karate documentation