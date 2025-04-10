# qTest API Cross-Environment Compatibility Tests

This directory contains Karate tests that validate qTest API compatibility across different environments (development, QA, and production).

## Purpose

These tests ensure that:

1. All qTest API endpoints maintain consistent schemas across environments
2. Rate limiting and performance characteristics are similar in QA and production
3. Features are consistently available or consistently unavailable
4. Error handling behaves consistently
5. API versioning follows expected patterns across environments

## Test Files

- **qtest-environment-compatibility.feature**: Core API functionality tests across environments
- **qtest-pulse-compatibility.feature**: Tests for qTest Pulse API functionality across environments
- **qtest-performance-consistency.feature**: Tests for performance and rate limiting consistency
- **qtest-environment-config.js**: Configuration settings for cross-environment testing

## Running the Tests

### Prerequisites

1. Set up environment variables for API keys:
   ```bash
   export QTEST_DEV_API_KEY=your-dev-api-key
   export QTEST_QA_API_KEY=your-qa-api-key
   export QTEST_PROD_API_KEY=your-prod-api-key
   
   # Optionally, specify project IDs for each environment
   export QTEST_DEV_PROJECT_ID=12345
   export QTEST_QA_PROJECT_ID=23456
   export QTEST_PROD_PROJECT_ID=34567
   ```

2. Optionally control which environments are tested:
   ```bash
   # To disable testing a specific environment
   export QTEST_TEST_DEV=false
   export QTEST_TEST_PROD=false
   
   # By default all environments are tested, but if none are
   # specified, only QA will be tested
   ```

### Running Individual Tests

Run a specific test file:

```bash
# From the project root
mvn test -f tests/api-integration/pom.xml -Dtest=org.skidbladnir.contracts.ContractTests#testQTestEnvironmentCompatibility
```

Run all cross-environment tests:

```bash
# From the project root
mvn test -f tests/api-integration/pom.xml -Dkarate.options="--tags @CrossEnvironment"
```

## Test Tags

- `@CrossEnvironment`: Applied to all cross-environment tests
- `@qTestPulse`: Specific to qTest Pulse API tests
- `@RateLimiting`: Tests for rate limiting behavior

## Security Considerations

- Avoid committing real API keys to source control
- For CI/CD pipelines, use secure environment variables
- Production tests should be run with read-only credentials when possible

## Test Data Requirements

For these tests to run successfully, you'll need:

1. API access to all environments being tested
2. At least one project in each environment
3. Test case data in each project
4. Sufficient API quota/rate limits

## Troubleshooting

Common issues:

1. Authentication failures: Check your API keys
2. 404 errors: Verify project IDs exist in all environments
3. Test timeouts: Adjust timeout values in qtest-environment-config.js
4. Inconsistent results: May indicate actual differences between environments that should be investigated