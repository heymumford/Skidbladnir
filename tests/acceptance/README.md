# Acceptance Tests

This directory contains the Cucumber.js-based acceptance tests for the Skidbladnir project. These tests verify that the system behaves according to the acceptance criteria defined for each feature.

## Structure

- `features/`: Contains feature files written in Gherkin syntax, organized by domain area
  - `api/`: API-related features
  - `test-case/`: Test case-related features
  - `...`: Other domain areas

- `step_definitions/`: Contains TypeScript step definitions that implement the Gherkin steps
  - `api/`: API-related step definitions
  - `test-case/`: Test case-related step definitions
  - `...`: Other domain areas

- `support/`: Contains support files for the acceptance tests
  - `world.ts`: Defines the Cucumber World object with Skidbladnir-specific context
  - `hooks.ts`: Defines setup and teardown hooks for the tests

## Running Tests

To run the acceptance tests, use one of the following npm scripts:

```
npm run test:acceptance          # Run all acceptance tests
npm run test:acceptance:dev      # Run with more detailed output
npm run test:acceptance:wip      # Run only WIP tests
npm run test:acceptance:smoke    # Run only smoke tests
npm run test:acceptance:ci       # Run optimized for CI
```

## Documentation

For more detailed information about the acceptance testing framework, refer to the [acceptance-testing.md](../../docs/acceptance-testing.md) document in the docs directory.