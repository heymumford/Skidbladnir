#!/usr/bin/env ts-node
/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArchitecturalCoverageVisualizer, VisualizationOptions } from '../visualizers/architectural-coverage-visualizer';
import { TestMetricsReport } from '../models/metrics';
import { CoverageData } from '../models/types';

// Parse command line arguments
const args = process.argv.slice(2);
const options: {
  help: boolean;
  reportPath?: string;
  coverageDataPath?: string;
  outputDir?: string;
  languageBreakdown: boolean;
  fileDetails: boolean;
  heatmap: boolean;
  sunburst: boolean;
  barCharts: boolean;
  darkMode: boolean;
  interactive: boolean;
  debug: boolean;
} = {
  help: args.includes('--help') || args.includes('-h'),
  languageBreakdown: args.includes('--language-breakdown') || args.includes('-l'),
  fileDetails: args.includes('--file-details') || args.includes('-f'),
  heatmap: args.includes('--heatmap') || args.includes('-m'),
  sunburst: args.includes('--sunburst') || args.includes('-s'),
  barCharts: args.includes('--bar-charts') || args.includes('-b'),
  darkMode: args.includes('--dark-mode') || args.includes('-d'),
  interactive: args.includes('--interactive') || args.includes('-i'),
  debug: args.includes('--debug')
};

// Parse path arguments
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--report' || args[i] === '-r') && i + 1 < args.length) {
    options.reportPath = args[i + 1];
    i++; // Skip the next arg
  } else if ((args[i] === '--coverage' || args[i] === '-c') && i + 1 < args.length) {
    options.coverageDataPath = args[i + 1];
    i++; // Skip the next arg
  } else if ((args[i] === '--output' || args[i] === '-o') && i + 1 < args.length) {
    options.outputDir = args[i + 1];
    i++; // Skip the next arg
  }
}

// Display help if requested or if no paths are provided
if (options.help || (!options.reportPath && !options.coverageDataPath)) {
  console.log(`
Architectural Coverage Visualizer

Usage: visualize-coverage [options]

Options:
  -h, --help                 Show this help message
  -r, --report <path>        Path to the TDD metrics report JSON
  -c, --coverage <path>      Path to the coverage data JSON
  -o, --output <dir>         Output directory for visualizations (default: ./coverage-visualizations)
  -l, --language-breakdown   Include language breakdown charts
  -f, --file-details         Include file details in the report
  -m, --heatmap              Include coverage heatmap
  -s, --sunburst             Include coverage sunburst chart
  -b, --bar-charts           Include bar charts
  -d, --dark-mode            Use dark mode for visualizations
  -i, --interactive          Generate interactive charts
  --debug                    Show debug information

Examples:
  visualize-coverage --report test-results/metrics-report.json --output coverage-report
  visualize-coverage -r test-results/metrics-report.json -c test-results/coverage-data.json -o coverage-report -l -s -i
`);
  process.exit(0);
}

// Set default output directory if not provided
if (!options.outputDir) {
  options.outputDir = path.resolve(process.cwd(), 'coverage-visualizations');
}

// Create absolute paths
const reportPath = options.reportPath ? path.resolve(process.cwd(), options.reportPath) : undefined;
const coverageDataPath = options.coverageDataPath ? path.resolve(process.cwd(), options.coverageDataPath) : undefined;
const outputDir = path.resolve(process.cwd(), options.outputDir);

// Validate inputs
if (!reportPath && !coverageDataPath) {
  console.error('Error: You must provide either a report path or coverage data path');
  process.exit(1);
}

if (reportPath && !fs.existsSync(reportPath)) {
  console.error(`Error: Report file not found at ${reportPath}`);
  process.exit(1);
}

if (coverageDataPath && !fs.existsSync(coverageDataPath)) {
  console.error(`Error: Coverage data file not found at ${coverageDataPath}`);
  process.exit(1);
}

// Debug info
if (options.debug) {
  console.log('Debug: Options', options);
  console.log('Debug: Report path', reportPath);
  console.log('Debug: Coverage data path', coverageDataPath);
  console.log('Debug: Output directory', outputDir);
}

// Load report data
let report: TestMetricsReport | undefined;
if (reportPath) {
  try {
    const reportJson = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report = TestMetricsReport.fromJson(reportJson);
    console.log(`Loaded report for project: ${report.projectName}`);
  } catch (error) {
    console.error(`Error loading report: ${error}`);
    process.exit(1);
  }
}

// Load coverage data
let coverageData: CoverageData | undefined;
if (coverageDataPath) {
  try {
    coverageData = JSON.parse(fs.readFileSync(coverageDataPath, 'utf8'));
    console.log(`Loaded coverage data with ${coverageData.sourceFiles.length} source files and ${coverageData.testFiles.length} test files`);
  } catch (error) {
    console.error(`Error loading coverage data: ${error}`);
    process.exit(1);
  }
}

// If we have report but no coverage data, extract it from the report if possible
if (report && !coverageData && report.getRawData) {
  coverageData = report.getRawData();
  console.log(`Extracted coverage data from report`);
}

// If we have coverage data but no report, generate a minimal report
if (coverageData && !report) {
  // Try to load the coverage-thresholds.json if it exists
  let thresholds;
  const thresholdsPath = path.resolve(process.cwd(), 'config/coverage-thresholds.json');
  if (fs.existsSync(thresholdsPath)) {
    try {
      const thresholdsData = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
      thresholds = thresholdsData.architectural_layers;
      console.log(`Loaded thresholds from ${thresholdsPath}`);
    } catch (error) {
      console.warn(`Warning: Could not load thresholds from ${thresholdsPath}: ${error}`);
    }
  }
  
  // Import the necessary modules
  const { ArchitecturalAnalyzer } = require('../analyzers/architectural-analyzer');
  const { CoverageAnalyzer } = require('../analyzers/coverage-analyzer');
  const { DistributionAnalyzer } = require('../analyzers/distribution-analyzer');
  
  // Generate the analyses
  const architecturalMetrics = ArchitecturalAnalyzer.analyzeArchitecture(coverageData, { layerCoverage: thresholds });
  const overallCoverage = CoverageAnalyzer.analyzeOverallCoverage(coverageData);
  const distributionMetrics = DistributionAnalyzer.analyzeTestDistribution(coverageData);
  
  report = new TestMetricsReport(
    path.basename(process.cwd()),
    overallCoverage,
    { testToCodeRatio: { value: 0, target: 0, meetsTarget: () => true } },
    architecturalMetrics,
    distributionMetrics
  );
  
  console.log(`Generated report from coverage data`);
}

// Create visualization options
const visualizationOptions: VisualizationOptions = {
  outputDir,
  includeLanguageBreakdown: options.languageBreakdown,
  includeFileDetails: options.fileDetails,
  includeHeatmap: options.heatmap,
  includeSunburst: options.sunburst,
  includeBarCharts: options.barCharts,
  darkMode: options.darkMode,
  interactiveCharts: options.interactive,
  showThresholds: true
};

// Generate visualizations
try {
  if (!report || !coverageData) {
    throw new Error('Missing report or coverage data');
  }
  
  console.log(`Generating visualizations in ${outputDir}...`);
  ArchitecturalCoverageVisualizer.generateVisualizations(report, coverageData, visualizationOptions);
  console.log(`✅ Visualizations generated successfully!`);
  console.log(`📊 Main report: ${path.join(outputDir, 'architectural-coverage.html')}`);
} catch (error) {
  console.error(`Error generating visualizations: ${error}`);
  process.exit(1);
}