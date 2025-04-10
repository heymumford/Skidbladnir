# TDD Metrics Tool

A comprehensive tool for measuring and analyzing Test-Driven Development completeness and quality metrics.

## Features

- **Test Coverage Analysis**: Analyze code coverage by architectural layer, overall coverage, and file-level coverage.
- **Multi-language Support**: Works with TypeScript, Python, and Go codebases with language-specific enhancements.
- **Quality Metrics**: Measure test quality beyond just coverage, including test-to-code ratio, setup-to-assertion ratio, test complexity, and more.
- **Architectural Boundary Validation**: Verify clean architecture compliance, detect dependency violations, and ensure proper layer isolation.
- **Test Distribution Analysis**: Analyze test distribution by type and layer, identify gaps in testing coverage.
- **HTML Reports**: Generate detailed HTML reports with visualizations of metrics, including charts and tables.
- **CLI Tool**: Easy-to-use command-line interface with configurable thresholds and options.

## Installation

```bash
npm install @skidbladnir/tdd-metrics-tool
```

## Usage

### Command Line

```bash
# Run with default settings
npx tdd-metrics

# Run with custom configuration
npx tdd-metrics -c ./tdd-config.json

# Fail if thresholds not met (useful for CI)
npx tdd-metrics --fail-on-threshold

# Run language-specific collectors
npm run tdd-metrics:go  # Run the Go collector and generate metrics
npm run tdd-metrics:ts  # Run the TypeScript collector
npm run tdd-metrics:py  # Run the Python collector
```

### Go Collector Features

The enhanced Go collector provides robust analysis of Go test files and coverage data:

- Detects various Go test patterns: standard tests, table-driven tests, subtests, benchmarks
- Identifies test assertions with support for standard testing, testify, GoConvey, and Gomega
- Robust coverage data extraction from various coverage file formats
- Smart architectural layer detection based on Go conventions
- Extracts test relationships, helper methods, and test organization
- Support for parameterized tests and benchmarks
- Handles package-level test setup (TestMain)
- Accurately parses Go test files to gather test metrics

### Options

- `-c, --config <path>`: Path to configuration file
- `--collect-only`: Only collect data, don't analyze or visualize
- `--analyze-only`: Only analyze data, don't collect or visualize
- `--visualize-only`: Only generate visualizations, don't collect or analyze
- `--compare`: Compare with previous run
- `--fail-on-threshold`: Exit with error if thresholds not met
- `--include-file-contents`: Include file contents in report
- `--include-coverage-maps`: Include coverage maps in report
- `-h, --help`: Show help message

### Configuration

Create a configuration file to customize thresholds, paths, and other settings:

```json
{
  "projectRoot": "/path/to/project",
  "sourcePaths": [
    "/path/to/project/src"
  ],
  "testPaths": [
    "/path/to/project/tests"
  ],
  "outputPath": "/path/to/project/tdd-metrics-reports",
  "excludePatterns": [
    "**/node_modules/**",
    "**/.git/**"
  ],
  "thresholds": {
    "lineCoverage": 80,
    "functionCoverage": 80,
    "testToCodeRatio": 0.7,
    "layerCoverage": {
      "domain": {
        "lineCoverage": 90,
        "functionCoverage": 90
      },
      "use-case": {
        "lineCoverage": 85,
        "functionCoverage": 85
      },
      "adapter": {
        "lineCoverage": 75,
        "functionCoverage": 75
      },
      "infrastructure": {
        "lineCoverage": 60,
        "functionCoverage": 60
      }
    }
  }
}
```

## Programmatic API

You can also use the tool programmatically:

```typescript
import { MetricsManager } from '@skidbladnir/tdd-metrics-tool';

const config = {
  projectRoot: '/path/to/project',
  sourcePaths: ['/path/to/project/src'],
  testPaths: ['/path/to/project/tests'],
  outputPath: '/path/to/project/tdd-metrics-reports'
};

const manager = new MetricsManager(config);
const report = await manager.run();

console.log(report.getSummary());
```

## License

MIT