# Provider Tests

This directory contains tests for validating that provider adapters correctly implement the required interfaces and behave as expected.

## Overview

Provider tests ensure that each test management system adapter (Zephyr, qTest, HP ALM, Azure DevOps, Rally, Excel) properly implements the provider interface and correctly interacts with external systems.

## Test Structure

The provider tests are organized into three primary categories:

### 1. Interface Compliance Tests

Located in `interfaces/ProviderInterface.test.ts`, these tests verify that providers correctly implement the required interfaces:

- **TestManagementProvider**: Base interface with common methods
- **SourceProvider**: Interface for extracting data from a system
- **TargetProvider**: Interface for loading data into a system

These tests do not validate behavior, only that the structure of the provider adheres to the contracts.

### 2. Provider-Specific Tests

Files like `ZephyrProvider.test.ts` test specific provider implementations:

- Method behavior for specific operations
- Error handling and edge cases
- Rate limiting compliance
- Data transformation accuracy

### 3. Provider Adapter Compliance Tests

`ProvidersAdapterCompliance.test.ts` runs compliance tests against all registered providers to ensure:

- All required providers are registered
- Each provider implements the appropriate interfaces
- Providers accurately report their capabilities
- Providers can establish connections

## Running the Tests

Run all provider tests:

```bash
npm test -- --testPathPattern=tests/unit/providers
```

Run interface compliance tests only:

```bash
npm test -- --testPathPattern=tests/unit/providers/interfaces
```

Run tests for a specific provider:

```bash
npm test -- --testPathPattern=tests/unit/providers/ZephyrProvider
```

## Adding a New Provider Test

To add tests for a new provider:

1. Create a new test file in this directory (e.g., `QTestProvider.test.ts`)
2. Create an adapter if needed to bridge between your provider and the standard interfaces
3. Test both interface compliance and actual behavior
4. Register the provider in `ProvidersAdapterCompliance.test.ts`

## Mock Data vs. Real Systems

Provider tests use mock data by default but can be configured to test against real systems:

- Set `PROVIDER_TEST_REAL=true` environment variable to test against real systems
- Set provider-specific environment variables (e.g., `ZEPHYR_API_KEY`) for credentials

Example configuration:

```bash
export PROVIDER_TEST_REAL=true
export ZEPHYR_BASE_URL=https://api.zephyrscale.example.com
export ZEPHYR_API_KEY=your-api-key
export ZEPHYR_PROJECT_KEY=PROJ
npm test -- --testPathPattern=tests/unit/providers/ZephyrProvider
```

## Test Coverage Requirements

Provider tests should cover:

- Interface compliance (structure)
- Authentication and connection handling
- Data extraction operations
- Data loading operations
- Error conditions and recovery
- Rate limiting behavior
- Complex operations (batch processing, hierarchical relationships)

Each provider must maintain at least 85% test coverage.