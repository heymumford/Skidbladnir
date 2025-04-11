# Acceptance Tests for Skidbladnir

This directory contains Cucumber.js-based acceptance tests for the Skidbladnir project. These tests verify that the system behaves according to the acceptance criteria defined for each feature.

## Overview

The acceptance tests validate that the application meets the requirements from an end-user perspective. They focus on complete user workflows and business value rather than implementation details.

## Structure

- `features/`: Contains feature files written in Gherkin syntax, organized by domain area
  - `api/`: API-related features
  - `test-case/`: Test case-related features
  - `ui/`: User interface workflows
    - `provider-workflows.feature`: Complete provider-specific migration workflows through the UI

- `step_definitions/`: Contains TypeScript step definitions that implement the Gherkin steps
  - `api/`: API-related step definitions
  - `test-case/`: Test case-related step definitions
  - `ui/`: UI-related step definitions
    - `provider-workflow-steps.ts`: Steps for provider-specific UI workflows

- `support/`: Contains support files for the acceptance tests
  - `world.ts`: Defines the Cucumber World object with Skidbladnir-specific context
  - `hooks.ts`: Defines setup and teardown hooks for the tests

## Provider Combinations

The UI workflow tests cover the following provider combinations:

1. Zephyr → qTest (Primary workflow)
2. qTest → Zephyr
3. Zephyr → TestRail
4. TestRail → qTest
5. Micro Focus ALM (HP ALM) → qTest
6. qTest → Micro Focus ALM
7. Jama → qTest
8. Zephyr → Azure DevOps
9. Visure → Zephyr
10. Rally → qTest

## Key Scenarios

The UI workflow tests cover the following key scenarios:

1. **Complete end-to-end migration workflow** - Tests the full migration process from source to target system
2. **Error handling during connections** - Tests error handling when connection credentials are invalid
3. **Operational controls** - Tests pause, resume, and cancel functionality during a migration
4. **Custom field transformations** - Tests configuring and previewing custom field transformations
5. **Attachment handling** - Tests attachment migration between providers
6. **Internationalization** - Tests the UI with different languages

## Running Tests

To run the acceptance tests, use one of the following npm scripts:

```
npm run test:acceptance          # Run all acceptance tests
npm run test:acceptance:dev      # Run with more detailed output
npm run test:acceptance:wip      # Run only WIP tests
npm run test:acceptance:smoke    # Run only smoke tests
npm run test:acceptance:ci       # Run optimized for CI
```

To run specific UI workflow tests:

```bash
# Run only UI workflow tests
npm run test:acceptance -- --tags @workflow

# Run only provider combination tests
npm run test:acceptance -- --tags @providers

# Run only error handling tests
npm run test:acceptance -- --tags @error-handling
```

## Best Practices

When writing acceptance tests:

1. Focus on the user's perspective and business value
2. Use declarative rather than imperative style
3. Keep scenarios independent and atomic
4. Use appropriate tags to categorize tests
5. Maintain a clean separation between what and how
6. Use descriptive step names that clearly communicate intent
7. Avoid technical implementation details in feature files

## Documentation

For more detailed information about the acceptance testing framework, refer to the [acceptance-testing.md](../../docs/acceptance-testing.md) document in the docs directory.