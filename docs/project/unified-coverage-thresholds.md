# Unified Test Coverage Thresholds

This document explains the unified test coverage threshold system implemented across all languages in the Skidbladnir project.

## Overview

Skidbladnir is a polyglot application using TypeScript, Python, and Go. To maintain consistent code quality across the codebase, we've implemented a unified coverage threshold system that:

1. Sets consistent coverage targets across all languages
2. Applies higher standards to core domain layers
3. Enables automated validation during CI/CD
4. Provides unified reporting

## Coverage Threshold Configuration

All coverage thresholds are defined in a single source of truth: `config/coverage-thresholds.json`. This file contains thresholds for:

- Global minimum coverage
- Language-specific coverage requirements (TypeScript, Python, Go)
- Directory-specific coverage requirements
- Architectural layer coverage requirements

### Example Structure

```json
{
  "global": {
    "branches": 70,
    "functions": 75,
    "lines": 80,
    "statements": 80
  },
  "typescript": { ... },
  "python": { ... },
  "go": { ... },
  "architectural_layers": {
    "domain": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    },
    ...
  }
}
```

## Architectural Layer Thresholds

Following Clean Architecture principles, we enforce higher coverage for inner layers:

1. **Domain Layer**: 95% line coverage - The core of our business logic must be robustly tested
2. **Use Case Layer**: 90% line coverage - Application business rules require comprehensive testing
3. **Adapter Layer**: 85% line coverage - Interface adapters require good testing, but allow more flexibility 
4. **Infrastructure Layer**: 80% line coverage - Framework code may have some areas that are harder to test

## Language-Specific Implementation

### TypeScript (Jest)

- Uses Jest's `coverageThreshold` feature
- Configured in `config/jest.config.js`
- Directly imports thresholds from the unified configuration file

### Python (pytest)

- Uses pytest-cov with custom configuration
- Directory-specific thresholds in `.coveragerc`
- Overall thresholds in `pytest.coverage.ini`

### Go 

- Custom script (`scripts/go-coverage-check.sh`)
- Parses thresholds from the unified configuration
- Checks against `go test -cover` results

## Running Coverage Checks

### Unified Check

To run coverage checks for all languages:

```bash
npm run coverage:check:unified
```

This command:
1. Runs tests for all languages with coverage enabled
2. Validates results against thresholds
3. Generates unified reports in the `test-results` directory

### Individual Checks

You can also run coverage checks for individual languages:

```bash
# TypeScript only
npm run coverage:check

# Python only
npm run test:py -- --cov

# Go only
scripts/go-coverage-check.sh
```

## TDD Metrics Integration

The coverage thresholds are integrated with the TDD Metrics Tool, which provides:

- Visual reports of coverage by architectural layer
- Coverage trend analysis
- Interactive HTML reports

To generate these reports:

```bash
npx ts-node packages/tdd-metrics-tool/src/bin/tdd-metrics.ts --config=config/tdd-metrics-config.json
```

## CI/CD Integration

The unified coverage check is integrated into the CI/CD pipeline:

1. The test job runs the unified coverage check
2. If coverage falls below thresholds, the pipeline fails
3. Coverage reports are archived as build artifacts

This ensures that:
- No code can be merged that reduces coverage below thresholds
- Coverage reports are always available for review
- The team maintains high test quality standards