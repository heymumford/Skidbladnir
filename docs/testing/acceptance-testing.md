# Cucumber Acceptance Testing Framework

## Overview

Skidbladnir uses Cucumber.js with TypeScript for behavior-driven development (BDD) acceptance testing. This framework allows us to write tests in a business-readable format that serves as both documentation and automated tests.

## Key Components

The acceptance testing framework consists of the following components:

### 1. Feature Files

Feature files are written in Gherkin syntax and describe the behavior of the system from a user's perspective. They are located in the `tests/acceptance/features` directory, organized by domain area.

Example:
```gherkin
Feature: Test Case Migration
  As a test manager
  I want to migrate test cases between different systems
  So that I can consolidate my test assets

  Scenario: Successfully migrate a single test case
    Given I am authenticated with a valid API token
    And the system has a valid connection to the "zephyr" source provider
    And the system has a valid connection to the "qtest" target provider
    When I request to migrate the test case to the target system
    Then the response status code should be 202
    And the response should contain a field "workflowId" with a non-empty value
```

### 2. Step Definitions

Step definitions connect the Gherkin steps to actual test code. They are located in the `tests/acceptance/step_definitions` directory, organized to match the feature files.

Example:
```typescript
Given('I am authenticated with a valid API token', function(this: SkidbladnirWorld) {
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  this.setAuthToken(sampleToken);
});
```

### 3. Support Files

Support files provide shared functionality for the step definitions, including:

- **World**: The central context object that is available in all step definitions. Defined in `tests/acceptance/support/world.ts`.
- **Hooks**: Setup and teardown code that runs before or after scenarios. Defined in `tests/acceptance/support/hooks.ts`.

## Running Acceptance Tests

The following npm scripts are available for running acceptance tests:

- `npm run test:acceptance`: Run all acceptance tests
- `npm run test:acceptance:dev`: Run tests with more detailed output
- `npm run test:acceptance:wip`: Run only tests tagged with @wip
- `npm run test:acceptance:smoke`: Run only tests tagged with @smoke
- `npm run test:acceptance:ci`: Run tests optimized for CI environments

## Tags

Tags can be used to categorize and filter scenarios:

- `@smoke`: Critical path tests that should always pass
- `@migration`: Tests related to the migration functionality
- `@error`: Tests that verify error handling
- `@wip`: Work in progress tests (skipped in normal test runs)
- `@skip`: Tests that should be skipped

## Adding New Tests

To add new acceptance tests:

1. Create a new feature file in the appropriate subdirectory of `tests/acceptance/features`
2. Write scenarios using the Gherkin syntax
3. Implement step definitions in `tests/acceptance/step_definitions`
4. Run the tests using one of the npm scripts

## Best Practices

- Write features from the user's perspective, focusing on business value
- Keep scenarios independent and isolated
- Use background for common setup steps
- Use scenario outlines for data-driven tests
- Tag scenarios appropriately to allow selective execution
- Keep step definitions modular and reusable
- Use the World object for sharing context between steps

## CI Integration

Acceptance tests are run as part of the CI pipeline using the `test:acceptance:ci` script. Test results are generated as JSON and HTML reports in the `test-results/cucumber` directory.