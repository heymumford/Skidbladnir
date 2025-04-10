# Cross-Service API Contract Testing

This directory contains Karate feature files for testing API contracts across different services in the Skidbladnir architecture.

## Overview

Cross-service contract testing ensures that the different components of our distributed system maintain compatible interfaces, enabling reliable communication between services. These tests validate:

1. **Schema Consistency**: Ensuring data structures are consistent across services
2. **Error Handling**: Verifying error responses follow the same format across services
3. **API Version Compatibility**: Confirming services can work together with compatible API versions
4. **Security Headers**: Validating that proper security headers are set consistently

## Features

### `api-contract-validation.feature`

This feature validates that API contracts are consistent across different services by:
- Comparing test case representations between API and Orchestrator services
- Verifying workflow details match between API and Orchestrator services
- Checking attachment metadata consistency between Orchestrator and Binary Processor
- Validating HTTP status code semantics are consistent across all services
- Ensuring error response formats follow the same pattern in all services

### `cross-service-schema.feature`

This feature validates that schema definitions themselves are consistent by:
- Fetching schema definitions from each service
- Comparing schema structures between services
- Checking for field compatibility across services
- Ensuring error schemas are consistent throughout the system

### `api-version-compatibility.feature`

This feature ensures API version compatibility by:
- Checking API and Orchestrator version compatibility
- Verifying Orchestrator and Binary Processor version compatibility
- Determining which API versions are supported across all services
- Ensuring at least one common API version exists for all services

### `security-headers.feature`

This feature validates security headers across services by:
- Checking for required security headers in API responses
- Verifying Content-Security-Policy directives are consistent
- Ensuring all services implement the same security protections

## Helper Features

The directory also contains several helper features:
- `header-checker.feature`: Helper for checking HTTP headers
- `http-status-test.feature`: Helper for testing HTTP status codes
- `error-format-test.feature`: Helper for testing error response formats
- `schema-fetcher.feature`: Helper for fetching schema definitions
- `version-fetcher.feature`: Helper for fetching service versions
- `api-versions-fetcher.feature`: Helper for fetching supported API versions

## Running the Tests

To run only the contract tests:

```bash
mvn test -Dtest=ContractTests
```

Individual test features can be run by using the specific test method:

```bash
mvn test -Dtest=ContractTests#testApiContractValidation
mvn test -Dtest=ContractTests#testCrossServiceSchema
mvn test -Dtest=ContractTests#testApiVersionCompatibility
mvn test -Dtest=ContractTests#testSecurityHeaders
```

## Automated Testing

These tests are part of the CI/CD pipeline and are run:
- When changes are made to API contracts
- Before deploying to production
- Nightly to detect drift between services

## Best Practices

When modifying services:
1. Run the cross-service contract tests to ensure your changes maintain compatibility
2. Update all affected services when changing shared schemas
3. Maintain backward compatibility with existing API versions
4. Ensure security headers remain consistent across all services