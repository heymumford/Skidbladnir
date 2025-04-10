# Cross-Component Testing in Skidbladnir

This guide explains how to create and maintain cross-component tests that validate the end-to-end data flow across Skidbladnir's polyglot services.

## API Operation Dependency System Testing

The API Operation Dependency System requires specific cross-component testing to ensure operations are executed in the correct order across different services.

### Key Testing Areas

For the API Operation Dependency System, cross-component tests focus on:

1. **Dependency Resolution**: Verifying that operations are correctly ordered based on their dependencies
2. **Error Handling**: Testing how the system handles circular dependencies and missing operations
3. **Cross-Provider Workflows**: Ensuring operations work across different provider implementations
4. **Visualization**: Validating the generation of dependency graphs and diagrams

### Example Test Scenarios

```gherkin
@crossComponent @dependencySystem
Scenario: Validate operation dependency resolution across providers
  # Test that dependencies are correctly identified and ordered
  
@crossComponent @dependencySystem
Scenario: Operation dependency validation detects circular dependencies
  # Test that circular dependencies are properly detected and reported
  
@crossComponent @dependencySystem
Scenario: Successfully run a multi-step operation with dependencies
  # Test that complex workflows execute in the correct order
```

The main test file for API Operation Dependencies is:
`operation-dependency-system.feature`

## Overview

Cross-component tests ensure that our services interact correctly as a cohesive system. These tests:

1. Validate data consistency across service boundaries
2. Test complex workflows that span multiple services
3. Verify error handling and resilience mechanisms
4. Ensure that API contracts are properly implemented

## Architecture of Cross-Component Tests

Skidbladnir implements cross-component tests using the Karate framework, which provides:

- A language-agnostic way to test services written in TypeScript, Python, and Go
- Built-in support for API testing
- Powerful assertions and JSON matching capabilities
- The ability to mock external services
- Support for complex flows with conditional logic

### Service Communication Flow

```
┌─────────┐        ┌──────────────┐        ┌─────────────────┐
│         │        │              │        │                 │
│   UI    │───────▶│  API Service │───────▶│   Orchestrator  │
│         │        │ (TypeScript) │        │    (Python)     │
└─────────┘        └──────────────┘        └────────┬────────┘
                                                    │
                                                    │
                                                    ▼
                           ┌────────────────────────────────────────┐
                           │                                        │
                           │          Binary Processor (Go)         │
                           │                                        │
                           └────────────────────────────────────────┘
```

## Key Testing Scenarios

The cross-component tests focus on these critical scenarios:

1. **End-to-End Migration Workflow**
   - Test case extraction from source provider
   - Transformation via orchestrator
   - Binary attachment processing
   - Loading into target provider

2. **Error Handling & Recovery**
   - Service unavailability
   - Transient errors
   - Rate limiting
   - Data inconsistency

3. **System Health & Monitoring**
   - Health check propagation
   - Cross-component status
   - Connectivity verification

## Implementation

### Test Organization

Cross-component tests are stored in:
`/tests/api-integration/src/test/java/org/skidbladnir/contracts/`

The main test file is:
`cross-component-workflow.feature`

Additional helper features:
- `check-migration.feature` - Polls workflow status
- `zephyr-mock.feature` - Mocks the Zephyr API
- `zephyr-error-mock.feature` - Mocks Zephyr API with errors

### Test Data

Tests use:
- Dynamically generated IDs with UUID
- Consistent test case data models
- Mock APIs for external providers

### Running the Tests

Run all cross-component tests:
```
cd tests/api-integration
mvn test -Dtest=ContractTests#testCrossComponentOnly
```

Or via npm:
```
npm run test:api:cross-component
```

## Best Practices

1. **Tag Cross-Component Tests**
   - Use `@crossComponent` tag for all cross-component tests
   - This allows running just these tests when needed

2. **Manage Test Dependencies**
   - Each test should set up its own dependencies
   - Clean up resources after tests complete
   - Use unique IDs to prevent test collision

3. **Ensure Idempotency**
   - Tests should be repeatable without side effects
   - Avoid dependencies on previous test runs

4. **Limit Test Scope**
   - Focus each test on a specific flow
   - Avoid overlapping test responsibilities

5. **Write Resilient Tests**
   - Include timeouts and retries for async operations
   - Handle intermittent failures gracefully

## Creating New Cross-Component Tests

Follow these steps to create a new cross-component test:

1. Define the flow you want to test across services
2. Identify the necessary API calls and validation points
3. Create a new feature file in the contracts directory
4. Use the `@crossComponent` tag for the scenario
5. Set up mock services if needed
6. Implement the test flow with appropriate assertions
7. Add the test to ContractTests.java

## Example: Test Structure

```gherkin
@crossComponent
Scenario: Test Migration Workflow Across Services
  # Step 1: Configure services
  Given path '/providers/zephyr/configure'
  # ...config steps...
  
  # Step 2: Start the workflow
  When method POST
  # ...verification...
  
  # Step 3: Verify workflow across services
  Given url orchestratorUrl
  # ...orchestrator verification...
  
  # Step 4: Verify binary processing
  Given url binaryProcessorUrl
  # ...binary verification...
```

## Handling Async Operations

For operations that take time to complete:

1. Use polling with reasonable timeouts
2. Create helper features for status checks
3. Use JavaScript functions for conditional logic

Example polling function:
```javascript
function(workflowId, maxRetries, waitTime) {
  for (var i = 0; i < maxRetries; i++) {
    // Check status
    // If complete, return result
    // Otherwise wait and retry
    java.lang.Thread.sleep(waitTime);
  }
  return result;
}
```

## Testing Resilience

To test error handling and recovery:

1. Use mocks that return errors in a controlled pattern
2. Configure services with retry policies
3. Verify that transient errors are handled correctly
4. Check that persistent errors are reported properly

## Conclusion

Cross-component tests provide crucial validation of the system as a whole. By ensuring services interact correctly, we maintain the integrity of our polyglot architecture and provide a reliable experience for users.