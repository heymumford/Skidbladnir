# Build System Testing Framework

This directory contains a comprehensive testing framework for the Skidbladnir build system. The framework provides unit tests, integration tests, and the ability to generate thousands of pairwise test combinations to ensure proper build parameter validation and execution.

## Files Overview

- `unified-build.sh` - The main consolidated build script that centralizes build logic
- `test-unified-build.sh` - Unit tests for the build script
- `integration-test-build.sh` - Integration tests for the build script
- `run-build-tests.sh` - Master script to run both unit and integration tests
- `build-test-helper.js` - Helper for generating and running massive numbers of test combinations
- `README.md` - This documentation

## Testing Approach

The build system testing follows a multi-layered approach:

1. **Unit Tests**: Fast tests that verify parameter validation, function behavior, and error handling
2. **Integration Tests**: End-to-end tests that verify the build process across different environments
3. **Pairwise Testing**: Efficient testing of parameter combinations to maximize coverage with minimal test cases
4. **Massive Testing**: Ability to generate and run thousands of test cases with parallel execution

The testing framework applies the MECE (Mutually Exclusive Collectively Exhaustive) principle to ensure comprehensive test coverage across all build parameters and environments.

## Usage

### Running Unit Tests

```bash
# Run basic unit tests
npm run test:build:unit

# Or with the direct script
./scripts/build/test-unified-build.sh
```

Unit tests verify:
- Parameter validation
- Function behavior
- Error handling
- Environment-specific behavior
- Production mode restrictions

### Running Integration Tests

```bash
# Run a small set of integration tests
npm run test:build:integration

# Or with the direct script
./scripts/build/integration-test-build.sh --max-tests=10 --skip-build=true
```

Integration tests verify:
- End-to-end build process
- Environment-specific behavior
- Parameter combinations

### Running All Tests

```bash
# Run both unit and integration tests
npm run test:build

# Run full tests including actual builds
npm run test:build:full

# Run in dry-run mode (no actual builds)
npm run test:build:dry-run
```

### Running Massive Tests

The testing framework can generate and run thousands of test combinations:

```bash
# Generate 1000 test combinations
npm run test:build:generate

# Run 50 tests in parallel
npm run test:build:parallel

# Generate 1000 combinations and run 100 of them in parallel
npm run test:build:massive
```

## Pairwise Testing

Pairwise testing is a technique that tests all possible pairs of parameter values, rather than all possible combinations. This provides excellent test coverage while significantly reducing the number of test cases.

The `build-test-helper.js` script implements pairwise testing by:

1. Identifying all possible parameter pairs
2. Generating a minimal set of test cases that cover all pairs
3. Excluding invalid parameter combinations

## Test Reporting

Tests generate reports in the `test-results/build-tests` directory:

- Unit test logs
- Integration test logs
- HTML test reports with test statistics and system information

## Adding New Tests

When adding new tests:

1. For unit tests, add test functions to `test-unified-build.sh`
2. For integration tests, add test cases to `test-combinations.txt` or use the generator
3. For testing new parameters, update the parameter list in `build-test-helper.js`

## Performance Optimization

The testing framework includes several optimizations:

- Parallel test execution
- Fast unit tests that mock actual operations
- Ability to skip actual builds during testing
- Efficient pairwise test generation to minimize test cases

## Example: Testing Build Environment Coverage

The following command tests all combinations of build environments and components:

```bash
node scripts/build/build-test-helper.js generate-and-run --max-generate=100 --max-run=9 --parallel=3
```

This will:
1. Generate 100 pairwise test combinations
2. Run 9 tests (3 environments × 3 component types) in parallel
3. Generate a test report

## Development Workflow

1. Make changes to the build script
2. Run unit tests to verify basic functionality
3. Run small integration tests to verify end-to-end behavior
4. For major changes, run the massive tests to ensure comprehensive coverage