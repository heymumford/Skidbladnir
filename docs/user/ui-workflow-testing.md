# UI Workflow Testing Guide

This document describes the comprehensive testing approach for UI workflows across all provider combinations in Skidbladnir.

## Overview

The UI workflow tests ensure that end-to-end migration processes work correctly for all supported provider combinations. These tests simulate user interactions through the entire workflow, from configuration to execution and verification.

## Test Approach

We use a multi-tiered approach for testing the UI workflows:

1. **Unit Tests**: Test individual UI components in isolation
2. **Integration Tests**: Test interactions between related components
3. **End-to-End Tests**: Test complete workflows with Cucumber and Jest
4. **Provider Combination Tests**: Test all supported provider combinations

## Provider Combinations Tested

The following provider combinations are tested:

| Source | Target |
|--------|--------|
| Zephyr Scale | qTest |
| qTest | Zephyr Scale |
| Zephyr Scale | TestRail |
| TestRail | qTest |
| Micro Focus ALM | qTest |
| qTest | Micro Focus ALM |
| Jama | qTest |
| Zephyr Scale | Azure DevOps |
| Visure | Zephyr Scale |
| Rally | qTest |

## Test Scenarios

### End-to-End Migration Workflow

1. Configure source provider connection
2. Verify successful connection to source
3. Browse and select test assets
4. Configure target provider connection
5. Verify successful connection to target
6. Configure field mappings
7. Apply transformations to fields
8. Start migration process
9. Monitor migration progress
10. Verify migration results

### Error Handling

1. Test with invalid credentials
2. Verify appropriate error messages
3. Test with network disruptions
4. Verify retry mechanisms
5. Test with invalid data transformations

### Internationalization

1. Test with different language settings
2. Verify translations for UI elements
3. Verify translated error messages
4. Verify date format conventions

### Operational Controls

1. Test pause functionality during migration
2. Test resume functionality after pause
3. Test cancellation with confirmation
4. Verify operation status indicators

## Running the Tests

### Running All Provider Combination Tests

```bash
npm run test:workflow
```

### Running Tests in Parallel

```bash
npm run test:workflow:parallel
```

### Running Tests for Specific Provider Combination

```bash
npm run test:workflow -- --source zephyr --target qtest
```

### Running Tests with HTML Report

```bash
npm run test:workflow -- --html-report
```

## Test Results

Test results are stored in the `test-results/ui-workflow-tests` directory. The results include:

- JSON reports for each provider combination
- Summary report with overall success/failure metrics
- HTML reports (when enabled) for visual inspection

## Interactive Testing

A dedicated UI test page is available at `/workflow-test` to assist with manual testing of provider workflows. This page allows:

- Interactive testing of each provider combination
- Step-by-step verification of the workflow
- Testing of internationalization support
- Validation of UI components and interactions

## Cucumber Feature Files

The UI workflow tests are defined in Cucumber feature files located in the `tests/acceptance/features/ui` directory:

```gherkin
Feature: Provider-specific end-to-end UI workflows
  As a test engineer
  I want to perform complete migration workflows for each provider combination
  So that I can verify the system works correctly for all supported provider integrations

  Scenario Outline: Complete end-to-end migration workflow between providers
    # Source configuration
    When I select "<source>" as the source provider
    And I enter valid connection details for "<source>"
    And I test the "<source>" connection
    Then I should see a successful connection message for "<source>"
    And I should see source provider details displayed
    
    # Browse and select test assets
    When I browse test assets from "<source>"
    And I select test assets to migrate
    Then I should see the selected assets preview
    
    # Destination configuration
    When I select "<target>" as the target provider
    And I enter valid connection details for "<target>"
    And I test the "<target>" connection
    Then I should see a successful connection message for "<target>"
    And I should see target provider details displayed
    
    # Field mapping configuration
    When I configure field mappings between "<source>" and "<target>"
    Then I should see a preview of transformed test data
    And I should be able to modify field transformations
    
    # Migration execution and monitoring
    When I start the migration process
    Then I should see the migration dashboard with real-time status
    And I should see LCARS-style indicators showing active operations
    And I should see a progress bar indicating overall completion
    
    # Verification and validation
    When the migration completes successfully
    Then I should see a migration summary with success metrics
    And I should have options to view migrated assets in "<target>"
    And I should be able to download a migration report

    Examples:
      | source   | target        |
      | zephyr   | qtest         |
      | qtest    | zephyr        |
      | testrail | qtest         |
```

## Step Definitions

The test steps are implemented in TypeScript in the `tests/acceptance/step_definitions/ui` directory. These implementation files contain the logic needed to simulate user interactions and verify outcomes.

## Test Harness

The test harness is implemented in JavaScript and TypeScript. It provides:

- Automated execution of workflow tests
- Parallel testing capabilities
- Integration with CI/CD pipelines
- Comprehensive reporting

## Integration with Continuous Integration

The UI workflow tests are integrated into the CI/CD pipeline and run:

1. On all pull requests to the main branch
2. On scheduled nightly builds
3. As part of the release process

## Adding New Provider Combinations

To add a new provider combination to the test suite:

1. Add the combination to the `Examples` section in the Cucumber feature file
2. Implement any provider-specific step definitions if needed
3. Update the provider configuration component to support the new provider
4. Add a mock implementation for the provider in the test harness

## Troubleshooting Tests

Common issues when running the UI workflow tests:

1. **Test timeouts**: Increase the timeout values in the test configuration
2. **Connection failures**: Check the mock implementations for provider connections
3. **Element not found**: Review the selectors used in step definitions
4. **Test data inconsistencies**: Review the test data mock implementations