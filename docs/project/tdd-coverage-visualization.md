# TDD Test Coverage Visualization by Architectural Layer

This document explains the test coverage visualization tools provided for Skidbladnir to analyze coverage by architectural layer.

## Overview

Skidbladnir implements robust test coverage visualization that breaks down coverage metrics by architectural layer, providing insights into how well each part of the Clean Architecture is tested. The visualizations support all three languages used in the codebase:

- TypeScript
- Python
- Go

## Architectural Layers

Following Clean Architecture principles, Skidbladnir's code is organized into the following layers:

1. **Domain Layer** (`domain`): The core business logic and entities
2. **Use Case Layer** (`use-case`): Application-specific business rules
3. **Adapter Layer** (`adapter`): Interface adapters that convert data between use cases and external systems
4. **Infrastructure Layer** (`infrastructure`): Frameworks, tools, and external concerns

## Visualization Features

The architectural coverage visualization provides the following features:

1. **Multi-dimensional Coverage Analysis**: Shows line coverage and function coverage for each architectural layer
2. **Language Breakdown**: Breaks down coverage by programming language for polyglot insight
3. **Interactive Charts**: Bar charts, radar charts, sunburst visualizations, and heatmaps
4. **Threshold Visualization**: Visual indicators for coverage thresholds by layer
5. **Test Distribution Analysis**: Shows how tests are distributed across layers
6. **SVG Export**: Generates standalone SVG charts for embedding in documentation
7. **Dark Mode Support**: Customizable visualization themes

## Usage

### Generating Visualizations

You can generate visualizations using the TDD Metrics Tool:

```bash
# Basic usage
npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts --report test-results/metrics-report.json

# Full options
npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts \
  --report test-results/metrics-report.json \
  --coverage test-results/coverage-data.json \
  --output coverage-report \
  --language-breakdown \
  --file-details \
  --sunburst \
  --heatmap \
  --bar-charts \
  --interactive
```

### Integrating with CI/CD

The visualization tool can be added to your CI/CD pipeline to generate coverage reports on each build:

```yaml
# Example GitHub Action step
- name: Generate Coverage Visualizations
  run: |
    npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts \
      --report test-results/metrics-report.json \
      --output ${{ github.workspace }}/coverage-report
    
- name: Upload Coverage Report
  uses: actions/upload-artifact@v2
  with:
    name: coverage-report
    path: coverage-report/
```

## Chart Types

### Bar Chart

The bar chart shows line and function coverage for each architectural layer with color-coded bars, making it easy to see how coverage varies across the architecture.

### Radar Chart

The radar chart displays coverage as a polygon, with each vertex representing an architectural layer. This visualization is especially effective for seeing coverage balance across layers.

### Sunburst Chart

The sunburst chart shows the hierarchical nature of the architecture, with inner circles representing inner architectural layers. Coverage is shown through color intensity.

### Heatmap

The heatmap displays coverage intensity across files and layers, helping identify areas of the codebase that need more testing.

## Programmatic Usage

You can also use the visualization tools programmatically in your own Node.js scripts:

```typescript
import { ArchitecturalCoverageVisualizer } from '@skidbladnir/tdd-metrics-tool/visualizers';
import { TestMetricsReport } from '@skidbladnir/tdd-metrics-tool/models';

// Load report and coverage data
const report = TestMetricsReport.fromJson(reportData);
const coverageData = // ...load coverage data

// Generate visualizations
ArchitecturalCoverageVisualizer.generateVisualizations(
  report,
  coverageData,
  {
    outputDir: './coverage-report',
    includeLanguageBreakdown: true,
    includeSunburst: true,
    interactiveCharts: true
  }
);
```

## Understanding the Reports

The generated HTML report contains several sections:

1. **Executive Summary**: Overall metrics with pass/fail indicators
2. **Layer Coverage**: Detailed coverage by architectural layer
3. **Language Breakdown**: Coverage metrics broken down by language
4. **File Analysis**: Detailed file counts by layer and language
5. **Test Distribution**: How tests are distributed across the architecture

Key metrics to look for:

- **Coverage Symmetry**: Is coverage balanced across layers?
- **Domain Layer Coverage**: This should be the highest, ideally >95%
- **Coverage Trends**: Is coverage improving or declining over time?
- **Test-to-Code Ratio**: How many tests exist for each source file?

## Customizing Thresholds

Coverage thresholds are defined in `config/coverage-thresholds.json` and are organized by architectural layer. You can adjust these thresholds to enforce higher or lower coverage requirements for different parts of the architecture.