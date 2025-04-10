# Cross-Language API Contract Testing

This document describes the cross-language API contract testing strategy implemented in Skidbladnir to ensure consistent API behavior across multiple language services.

## Overview

Skidbladnir's architecture consists of three primary services written in different languages:

1. **API Service**: TypeScript/Node.js (Port 8080)
2. **Orchestrator Service**: Python/FastAPI (Port 8000)
3. **Binary Processor Service**: Go (Port 8090)

Cross-language API contract testing ensures these services maintain compatible interfaces despite being implemented in different programming languages.

## Test Approach

We use Karate for API contract testing because it provides:

- A powerful DSL for testing HTTP APIs
- Cross-platform compatibility
- Comprehensive JSON manipulation and comparison
- Parallel test execution
- Excellent reporting capabilities
- Support for complex testing scenarios

## Contract Test Cases

Our cross-language contract tests validate several aspects:

1. **Common Endpoint Behavior**: Health, metrics, and error handling endpoints
2. **Schema Consistency**: Ensuring data models are consistent across services
3. **Rate Limiting Behavior**: Testing rate limiting is consistent across services
4. **Error Response Format**: Ensuring error responses follow the same format
5. **E2E Workflow Verification**: Testing the complete flow of data across all three services

## Running the Tests

The polyglot contract tests can be run using npm:

```bash
# Run only the polyglot contract tests
npm run test:api:polyglot

# Run all contract tests including polyglot tests
npm run test:api:contracts

# Run all API tests
npm run test:api
```

## Test Structure

### Main Feature File

The primary contract test definition is in `tests/api-integration/src/test/java/org/skidbladnir/contracts/polyglot-api-contract.feature`.

This file contains:
- Schema definitions for common API structures
- Tests for core API behavior across all three services
- Scenarios for validating schema consistency
- End-to-end workflow validation across all services

### Helper Features

- `make-request.feature`: Helper for making HTTP requests
- `verify-rate-limit.feature`: Validates rate limiting behavior

## Test Cases

1. **Health Endpoint Validation**
   - Verifies all three services expose a consistent health endpoint
   - Validates the response schema is identical

2. **Metrics Endpoint Validation**
   - Verifies metrics endpoints return consistent data structures
   - Ensures performance metrics are reported in a standard format

3. **Error Response Validation**
   - Tests that all services handle errors consistently
   - Validates error response format and HTTP status codes
   - Checks for proper error details

4. **Rate Limiting Validation**
   - Tests rate limiting behavior across services
   - Verifies consistent headers and response codes

5. **Schema Consistency Validation**
   - Fetches schemas from all three services
   - Compares field names, types, and required properties
   - Reports any inconsistencies between implementations

6. **Cross-Service Workflow Validation**
   - Creates test data through the TypeScript API
   - Triggers a workflow in the Python orchestrator
   - Verifies binary processing in the Go service
   - Confirms data consistency throughout the workflow

## Integration with CI/CD

The cross-language contract tests are integrated with our CI/CD pipeline and run:
- On every pull request affecting API interfaces
- During nightly builds
- Before releases
- After deployment to any environment

## Extending the Tests

When adding new cross-service functionality:

1. Add schema definitions to the background section
2. Create new scenarios to test the functionality
3. Ensure tests cover all three language implementations
4. Verify both happy path and error scenarios

## Maintenance

Contract tests should be updated when:
- New fields are added to shared data models
- API endpoints are modified or added
- Error handling behavior changes
- New cross-service workflows are implemented