# TDD Metrics Tool: Usage Guide

This document provides a guide for using the TDD Metrics Tool to measure and visualize test coverage and quality across the Skidbladnir project.

## Overview

The TDD Metrics Tool collects and analyzes test coverage data for all three languages used in Skidbladnir:

- TypeScript
- Python
- Go

It provides insights into test coverage across architectural layers, test quality metrics, and allows for visualization of results.

## Quick Start

### Run All Metrics Collection

To collect metrics for all languages and generate a unified report:

```bash
npm run tdd-metrics:all
```

This will:
1. Run TypeScript tests with coverage
2. Run Go tests with coverage
3. Run Python tests with coverage
4. Generate a unified metrics report at `test-results/tdd-metrics/unified-metrics.json`

### Visualize Results

To collect metrics and generate an interactive visualization:

```bash
npm run tdd-metrics:visualize
```

This generates visualizations in `test-results/tdd-metrics/visualization`.

### Language-Specific Metrics

#### Go

```bash
npm run tdd-metrics:go     # Collect Go metrics only
npm run coverage:go        # Same as above
npm run coverage:go:visualize  # Collect Go metrics and visualize
npm run coverage:go:check  # Check Go coverage against thresholds
```

#### TypeScript

```bash
npm run coverage:check     # Run TypeScript tests with coverage
```

#### Python

```bash
npm run test:py -- --coverage  # Run Python tests with coverage
```

## Configuration

Coverage thresholds for each language and architectural layer are defined in `config/coverage-thresholds.json`.

## TDD Metrics Tool Features

The tool provides the following features:

1. **Test Coverage Analysis**
   - Coverage by language (TypeScript, Python, Go)
   - Coverage by architectural layer (Domain, Use Case, Adapter, Infrastructure)
   - Line and function coverage metrics

2. **Test Quality Metrics**
   - Test-to-code ratio
   - Test complexity analysis
   - Assertion coverage

3. **Architectural Boundary Validation**
   - Dependency direction analysis
   - Layer isolation checking

4. **Visualizations**
   - Interactive coverage heatmaps
   - Language breakdown charts
   - Layer coverage charts
   - File coverage details

## Report Formats

### JSON Report

The metrics are stored in JSON format with the following structure:

```json
{
  "timestamp": "2025-04-10T14:30:00Z",
  "coverage": {
    "lines": { "total": 10000, "covered": 8500, "percentage": 85 },
    "functions": { "total": 1200, "covered": 960, "percentage": 80 }
  },
  "languageCoverage": {
    "typescript": { /* TypeScript-specific metrics */ },
    "python": { /* Python-specific metrics */ },
    "go": { /* Go-specific metrics */ }
  },
  "layerCoverage": {
    "domain": { /* Domain layer metrics */ },
    "use-case": { /* Use case layer metrics */ },
    "adapter": { /* Adapter layer metrics */ },
    "infrastructure": { /* Infrastructure layer metrics */ }
  }
}
```

### Visualization

The visualization provides interactive charts and tables for exploring test coverage data:

- **Overview**: Summary of coverage by language and layer
- **Language Breakdown**: Detailed coverage for each language
- **Architectural Layers**: Coverage across Clean Architecture layers
- **File Details**: Line-by-line coverage for individual files

## Extending the Tool

### Adding Support for New Languages

The tool is designed to be extensible. To add support for additional languages:

1. Create a new collector class in `packages/tdd-metrics-tool/src/collectors/`
2. Register the collector in `CollectorFactory`
3. Update scripts to run tests for the new language with coverage

### Customizing Visualization

The visualization can be customized by modifying the templates in `packages/tdd-metrics-tool/src/visualization/`.

## Integration with CI/CD

The TDD metrics tool can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run TDD Metrics
  run: npm run tdd-metrics:all

- name: Check Coverage Thresholds
  run: npm run coverage:check:unified
```

## Troubleshooting

### Missing Coverage Data

If coverage data is missing for a language:

1. Check that tests are running with coverage flags
2. Verify coverage output paths match those in the TDD metrics scripts
3. Ensure coverage files are in the correct format

### Visualization Issues

If visualization fails:

1. Check that the JSON report was generated correctly
2. Verify that all required npm packages are installed
3. Check browser console for JavaScript errors

## Related Documentation

- [TDD Metrics Tool Design](tdd-metrics-tool.md)
- [Clean Architecture Guide](../architecture/clean-architecture-guide.md)
- [Test Documentation Standards](../test-documentation-standards.md)