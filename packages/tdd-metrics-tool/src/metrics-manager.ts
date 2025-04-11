/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  MetricsConfig, 
  CoverageData,
  CollectorConfig,
  LanguageType,
  ArchitecturalLayer,
  ArchitecturalMapping,
  AnalysisOptions
} from './models/types';
import { 
  CoverageMetrics, 
  TestQualityMetrics, 
  ArchitecturalMetrics,
  TestDistributionMetrics,
  TestMetricsReport
} from './models/metrics';
import { CollectorFactory } from './collectors/collector-factory';
import { CoverageAnalyzer } from './analyzers/coverage-analyzer';
import { QualityAnalyzer } from './analyzers/quality-analyzer';
import { ArchitecturalAnalyzer } from './analyzers/architectural-analyzer';
import { DistributionAnalyzer } from './analyzers/distribution-analyzer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main class for collecting and analyzing TDD metrics
 */
export class MetricsManager {
  private config: MetricsConfig;
  private collectorConfig: CollectorConfig;
  private coverageData: CoverageData | null = null;
  
  constructor(config: MetricsConfig) {
    this.config = config;
    
    // Convert metrics config to collector config
    this.collectorConfig = {
      projectRoot: config.projectRoot,
      testPaths: config.testPaths,
      sourcePaths: config.sourcePaths,
      excludePatterns: config.excludePatterns,
      collectCodeCoverage: true
    };
  }
  
  /**
   * Run the full metrics collection and analysis
   */
  public async run(
    options: AnalysisOptions = {}
  ): Promise<TestMetricsReport> {
    // Collect test and coverage data
    if (!this.coverageData || !options.analyzeOnly) {
      this.coverageData = await this.collectData();
      
      // Save raw coverage data if requested
      if (options.includeCoverageMaps) {
        this.saveCoverageData(this.coverageData);
      }
    }
    
    if (options.collectOnly) {
      // If we're only collecting data, return a minimal report
      return new TestMetricsReport(
        path.basename(this.config.projectRoot),
        new CoverageMetrics('Overall', { lineCoverage: 0, functionCoverage: 0 }),
        new TestQualityMetrics({ testToCodeRatio: 0 }),
        new ArchitecturalMetrics(
          { dependencyDirection: 0, interfaceDependency: 0, layerIsolation: 0 },
          {}
        ),
        new TestDistributionMetrics({}, {})
      );
    }
    
    // Analyze the data
    const report = this.analyzeData(this.coverageData);
    
    // Generate visualizations if requested
    if (!options.analyzeOnly && !options.visualizeOnly) {
      await this.generateVisualizations(report);
    }
    
    // Check thresholds and fail if requested
    if (
      options.failOnThresholdViolation && 
      !report.meetsAllTargets()
    ) {
      throw new Error('Test metrics did not meet all thresholds');
    }
    
    return report;
  }
  
  /**
   * Collect test and coverage data
   */
  private async collectData(): Promise<CoverageData> {
    // Create collectors for all languages
    const collectors = CollectorFactory.createAllCollectors(
      this.collectorConfig,
      this.config.architecturalMapping
    );
    
    // Start with empty coverage data
    const combinedCoverageData: CoverageData = {
      timestamp: new Date(),
      sourceFiles: [],
      testFiles: [],
      coverage: {
        lines: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 }
      },
      layerCoverage: {}
    };
    
    // Collect data from each collector
    for (const collector of collectors) {
      try {
        const coverageData = await collector.collectData();
        
        // Merge coverage data
        combinedCoverageData.sourceFiles.push(...coverageData.sourceFiles);
        combinedCoverageData.testFiles.push(...coverageData.testFiles);
        
        // Merge coverage statistics
        combinedCoverageData.coverage.lines.total += coverageData.coverage.lines.total;
        combinedCoverageData.coverage.lines.covered += coverageData.coverage.lines.covered;
        combinedCoverageData.coverage.functions.total += coverageData.coverage.functions.total;
        combinedCoverageData.coverage.functions.covered += coverageData.coverage.functions.covered;
        
        // Merge layer coverage
        Object.entries(coverageData.layerCoverage).forEach(([layer, layerCoverage]) => {
          if (!combinedCoverageData.layerCoverage[layer]) {
            combinedCoverageData.layerCoverage[layer] = {
              files: 0,
              lines: { total: 0, covered: 0, percentage: 0 },
              functions: { total: 0, covered: 0, percentage: 0 }
            };
          }
          
          combinedCoverageData.layerCoverage[layer].files += layerCoverage.files;
          combinedCoverageData.layerCoverage[layer].lines.total += layerCoverage.lines.total;
          combinedCoverageData.layerCoverage[layer].lines.covered += layerCoverage.lines.covered;
          combinedCoverageData.layerCoverage[layer].functions.total += layerCoverage.functions.total;
          combinedCoverageData.layerCoverage[layer].functions.covered += layerCoverage.functions.covered;
        });
      } catch (error) {
        console.error(`Error collecting data for ${collector.getLanguageType()}:`, error);
      }
    }
    
    // Calculate percentages
    if (combinedCoverageData.coverage.lines.total > 0) {
      combinedCoverageData.coverage.lines.percentage = 
        (combinedCoverageData.coverage.lines.covered / combinedCoverageData.coverage.lines.total) * 100;
    }
    
    if (combinedCoverageData.coverage.functions.total > 0) {
      combinedCoverageData.coverage.functions.percentage = 
        (combinedCoverageData.coverage.functions.covered / combinedCoverageData.coverage.functions.total) * 100;
    }
    
    // Calculate layer coverage percentages
    Object.entries(combinedCoverageData.layerCoverage).forEach(([layer, layerCoverage]) => {
      if (layerCoverage.lines.total > 0) {
        layerCoverage.lines.percentage = 
          (layerCoverage.lines.covered / layerCoverage.lines.total) * 100;
      }
      
      if (layerCoverage.functions.total > 0) {
        layerCoverage.functions.percentage = 
          (layerCoverage.functions.covered / layerCoverage.functions.total) * 100;
      }
    });
    
    return combinedCoverageData;
  }
  
  /**
   * Analyze coverage data
   */
  private analyzeData(coverageData: CoverageData): TestMetricsReport {
    // Analyze overall coverage
    const overallCoverage = CoverageAnalyzer.analyzeOverallCoverage(
      coverageData,
      this.config.thresholds
    );
    
    // Analyze test quality
    const qualityMetrics = QualityAnalyzer.analyzeTestQuality(
      coverageData,
      {
        testToCodeRatio: this.config.thresholds?.testToCodeRatio
      }
    );
    
    // Analyze architectural boundaries
    const architecturalMetrics = ArchitecturalAnalyzer.analyzeArchitecture(
      coverageData,
      {
        maxViolations: 0, // Zero tolerance for architectural violations
        layerCoverage: this.config.thresholds?.layerCoverage
      }
    );
    
    // Analyze test distribution
    const distributionMetrics = DistributionAnalyzer.analyzeTestDistribution(
      coverageData
    );
    
    // Create the complete report
    return new TestMetricsReport(
      path.basename(this.config.projectRoot),
      overallCoverage,
      qualityMetrics,
      architecturalMetrics,
      distributionMetrics
    );
  }
  
  /**
   * Generate visualizations of the metrics
   */
  private async generateVisualizations(
    report: TestMetricsReport
  ): Promise<void> {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
    
    // Save summary report as JSON
    const reportPath = path.join(this.config.outputPath, 'metrics-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Save summary report as text
    const summaryPath = path.join(this.config.outputPath, 'metrics-summary.txt');
    fs.writeFileSync(summaryPath, report.getSummary());
    
    // Generate HTML report (in a real implementation, we'd generate charts and visualizations)
    this.generateHtmlReport(report);
  }
  
  /**
   * Generate HTML report with visualizations
   */
  private generateHtmlReport(report: TestMetricsReport): void {
    // Create an enhanced HTML report with charts
    const htmlPath = path.join(this.config.outputPath, 'metrics-report.html');
    
    // Function to create color scale for coverage
    const getCoverageColor = (percentage: number): string => {
      if (percentage >= 90) return '#4CAF50'; // Green
      if (percentage >= 75) return '#8BC34A'; // Light green
      if (percentage >= 60) return '#FFEB3B'; // Yellow
      if (percentage >= 40) return '#FFC107'; // Amber
      return '#F44336'; // Red
    };

    // Prepare data for charts
    const coverageData = {
      labels: ['Line Coverage', 'Function Coverage'],
      datasets: [
        {
          values: [
            report.overallCoverage.lineCoverage.value,
            report.overallCoverage.functionCoverage.value
          ],
          colors: [
            getCoverageColor(report.overallCoverage.lineCoverage.value),
            getCoverageColor(report.overallCoverage.functionCoverage.value)
          ]
        }
      ]
    };

    // Layer coverage data for radar chart
    const layerCoverageData = {
      labels: Object.keys(report.architecturalMetrics.architecturalCoverage),
      datasets: [
        {
          name: 'Line Coverage',
          values: Object.values(report.architecturalMetrics.architecturalCoverage).map(
            c => c.lineCoverage.value
          )
        },
        {
          name: 'Function Coverage',
          values: Object.values(report.architecturalMetrics.architecturalCoverage).map(
            c => c.functionCoverage.value
          )
        }
      ]
    };

    // Architectural violations data for pie chart
    const violationsData = {
      labels: [
        'Dependency Direction', 
        'Interface Dependency', 
        'Layer Isolation'
      ],
      datasets: [
        {
          values: [
            report.architecturalMetrics.dependencyDirectionViolations.value,
            report.architecturalMetrics.interfaceDependencyViolations.value,
            report.architecturalMetrics.layerIsolationViolations.value
          ],
          colors: ['#FF5252', '#FF7043', '#FFAB40']
        }
      ]
    };

    // Test distribution by type for pie chart
    const testTypeData = {
      labels: Object.keys(report.distributionMetrics.testCountByType),
      datasets: [
        {
          values: Object.values(report.distributionMetrics.testCountByType),
          colors: [
            '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
          ]
        }
      ]
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Metrics Report: ${report.projectName}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <style>
    :root {
      --primary-color: #1976D2;
      --primary-dark: #0D47A1;
      --primary-light: #BBDEFB;
      --secondary-color: #FF5722;
      --success-color: #4CAF50;
      --warning-color: #FFC107;
      --danger-color: #F44336;
      --text-color: #212121;
      --text-secondary: #757575;
      --border-color: #E0E0E0;
      --background-light: #F5F5F5;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      color: var(--text-color);
      line-height: 1.6;
      background: #FAFAFA;
      padding: 0;
      margin: 0;
    }
    
    header {
      background: var(--primary-color);
      color: white;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .container {
      width: 90%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem 3rem;
    }
    
    h1 {
      font-weight: 300;
      margin-bottom: 0.5rem;
    }
    
    h2 {
      font-weight: 500;
      margin: 1.5rem 0 1rem;
      color: var(--primary-dark);
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 0.5rem;
    }
    
    h3 {
      font-weight: 500;
      margin: 1.5rem 0 1rem;
      color: var(--primary-color);
    }
    
    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    
    .summary-timestamp {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    .summary-status {
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: inline-block;
    }
    
    .summary-status.pass {
      background: var(--success-color);
      color: white;
    }
    
    .summary-status.fail {
      background: var(--danger-color);
      color: white;
    }
    
    .metrics-row {
      display: flex;
      flex-wrap: wrap;
      margin: 0 -1rem;
    }
    
    .metrics-column {
      flex: 1;
      padding: 0 1rem;
      min-width: 300px;
      margin-bottom: 2rem;
    }
    
    .metrics-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      height: 100%;
    }
    
    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
    }
    
    .metric-item:last-child {
      border-bottom: none;
    }
    
    .metric-name {
      font-weight: 500;
    }
    
    .metric-value {
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
    }
    
    .metric-value.pass {
      background-color: rgba(76, 175, 80, 0.2);
      color: var(--success-color);
    }
    
    .metric-value.fail {
      background-color: rgba(244, 67, 54, 0.2);
      color: var(--danger-color);
    }
    
    .chart-container {
      position: relative;
      height: 300px;
      margin: 1.5rem 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    
    th {
      background-color: var(--background-light);
      font-weight: 500;
    }
    
    tr:nth-child(even) {
      background-color: rgba(0,0,0,0.02);
    }
    
    td.pass {
      color: var(--success-color);
    }
    
    td.fail {
      color: var(--danger-color);
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .badge-violation {
      background-color: rgba(244, 67, 54, 0.2);
      color: var(--danger-color);
    }
    
    .badge-success {
      background-color: rgba(76, 175, 80, 0.2);
      color: var(--success-color);
    }
    
    .footer {
      text-align: center;
      margin-top: 3rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .metrics-column {
        flex: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>TDD Metrics Report</h1>
      <p>${report.projectName}</p>
    </div>
  </header>
  
  <div class="container">
    <div class="summary-header">
      <div>
        <h2>Executive Summary</h2>
        <div class="summary-timestamp">Generated: ${report.timestamp.toLocaleString()}</div>
      </div>
      <div class="summary-status ${report.meetsAllTargets() ? 'pass' : 'fail'}">
        ${report.meetsAllTargets() ? 'PASSED' : 'FAILED'}
      </div>
    </div>
    
    <div class="metrics-row">
      <!-- Overall Coverage Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>Coverage Metrics</h3>
          <div class="chart-container">
            <canvas id="coverageChart"></canvas>
          </div>
          <div class="metric-item">
            <span class="metric-name">Line Coverage:</span>
            <span class="metric-value ${report.overallCoverage.lineCoverage.meetsTarget() ? 'pass' : 'fail'}">${report.overallCoverage.lineCoverage.formattedValue()}</span>
          </div>
          <div class="metric-item">
            <span class="metric-name">Function Coverage:</span>
            <span class="metric-value ${report.overallCoverage.functionCoverage.meetsTarget() ? 'pass' : 'fail'}">${report.overallCoverage.functionCoverage.formattedValue()}</span>
          </div>
          ${report.overallCoverage.branchCoverage ? `
          <div class="metric-item">
            <span class="metric-name">Branch Coverage:</span>
            <span class="metric-value ${report.overallCoverage.branchCoverage.meetsTarget() ? 'pass' : 'fail'}">${report.overallCoverage.branchCoverage.formattedValue()}</span>
          </div>
          ` : ''}
          ${report.overallCoverage.statementCoverage ? `
          <div class="metric-item">
            <span class="metric-name">Statement Coverage:</span>
            <span class="metric-value ${report.overallCoverage.statementCoverage.meetsTarget() ? 'pass' : 'fail'}">${report.overallCoverage.statementCoverage.formattedValue()}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Quality Metrics Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>Quality Metrics</h3>
          <div class="metric-item">
            <span class="metric-name">Test-to-Code Ratio:</span>
            <span class="metric-value ${report.qualityMetrics.testToCodeRatio.meetsTarget() ? 'pass' : 'fail'}">${report.qualityMetrics.testToCodeRatio.formattedValue()}</span>
          </div>
          ${report.qualityMetrics.setupToAssertionRatio ? `
          <div class="metric-item">
            <span class="metric-name">Setup-to-Assertion Ratio:</span>
            <span class="metric-value ${report.qualityMetrics.setupToAssertionRatio.meetsTarget() ? 'pass' : 'fail'}">${report.qualityMetrics.setupToAssertionRatio.formattedValue()}</span>
          </div>
          ` : ''}
          ${report.qualityMetrics.testComplexity ? `
          <div class="metric-item">
            <span class="metric-name">Test Complexity:</span>
            <span class="metric-value ${report.qualityMetrics.testComplexity.meetsTarget() ? 'pass' : 'fail'}">${report.qualityMetrics.testComplexity.formattedValue()}</span>
          </div>
          ` : ''}
          ${report.qualityMetrics.averageTestExecutionTime ? `
          <div class="metric-item">
            <span class="metric-name">Average Test Execution Time:</span>
            <span class="metric-value ${report.qualityMetrics.averageTestExecutionTime.meetsTarget() ? 'pass' : 'fail'}">${report.qualityMetrics.averageTestExecutionTime.formattedValue()}</span>
          </div>
          ` : ''}
          ${report.qualityMetrics.testIsolation ? `
          <div class="metric-item">
            <span class="metric-name">Test Isolation:</span>
            <span class="metric-value ${report.qualityMetrics.testIsolation.meetsTarget() ? 'pass' : 'fail'}">${report.qualityMetrics.testIsolation.formattedValue()}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    
    <h2>Architectural Analysis</h2>
    
    <div class="metrics-row">
      <!-- Architectural Violations Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>Clean Architecture Violations</h3>
          <div class="chart-container">
            <canvas id="violationsChart"></canvas>
          </div>
          
          <div class="metric-item">
            <span class="metric-name">Dependency Direction Violations:</span>
            <span class="metric-value ${report.architecturalMetrics.dependencyDirectionViolations.isInRange() ? 'pass' : 'fail'}">${report.architecturalMetrics.dependencyDirectionViolations.value}</span>
          </div>
          <div class="metric-item">
            <span class="metric-name">Interface Dependency Violations:</span>
            <span class="metric-value ${report.architecturalMetrics.interfaceDependencyViolations.isInRange() ? 'pass' : 'fail'}">${report.architecturalMetrics.interfaceDependencyViolations.value}</span>
          </div>
          <div class="metric-item">
            <span class="metric-name">Layer Isolation Violations:</span>
            <span class="metric-value ${report.architecturalMetrics.layerIsolationViolations.isInRange() ? 'pass' : 'fail'}">${report.architecturalMetrics.layerIsolationViolations.value}</span>
          </div>
          ${report.architecturalMetrics.missingPortImplementations ? `
          <div class="metric-item">
            <span class="metric-name">Missing Port Implementations:</span>
            <span class="metric-value ${report.architecturalMetrics.missingPortImplementations.isInRange() ? 'pass' : 'fail'}">${report.architecturalMetrics.missingPortImplementations.value}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Layer Coverage Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>Coverage by Architectural Layer</h3>
          <div class="chart-container">
            <canvas id="layerCoverageChart"></canvas>
          </div>
          
          <table>
            <tr>
              <th>Layer</th>
              <th>Line Coverage</th>
              <th>Function Coverage</th>
            </tr>
            ${Object.entries(report.architecturalMetrics.architecturalCoverage)
              .map(([layer, coverage]) => `
              <tr>
                <td>${layer}</td>
                <td class="${coverage.lineCoverage.meetsTarget() ? 'pass' : 'fail'}">${coverage.lineCoverage.formattedValue()}</td>
                <td class="${coverage.functionCoverage.meetsTarget() ? 'pass' : 'fail'}">${coverage.functionCoverage.formattedValue()}</td>
              </tr>
              `).join('')}
          </table>
        </div>
      </div>
    </div>
    
    <h2>Test Distribution</h2>
    
    <div class="metrics-row">
      <!-- Test Type Distribution Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>By Test Type</h3>
          <div class="chart-container">
            <canvas id="testTypeChart"></canvas>
          </div>
          
          <table>
            <tr>
              <th>Test Type</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
            ${Object.entries(report.distributionMetrics.testCountByType)
              .map(([type, count]) => {
                const percentage = report.distributionMetrics.getTestPercentageByType()[type] || 0;
                return `
                <tr>
                  <td>${type}</td>
                  <td>${count}</td>
                  <td>${percentage.toFixed(1)}%</td>
                </tr>
                `;
              }).join('')}
          </table>
        </div>
      </div>
      
      <!-- Layer Distribution Card -->
      <div class="metrics-column">
        <div class="metrics-card">
          <h3>By Architectural Layer</h3>
          <div class="chart-container">
            <canvas id="layerDistributionChart"></canvas>
          </div>
          
          <table>
            <tr>
              <th>Layer</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
            ${Object.entries(report.distributionMetrics.testCountByLayer)
              .map(([layer, count]) => {
                const percentage = report.distributionMetrics.getTestPercentageByLayer()[layer] || 0;
                return `
                <tr>
                  <td>${layer}</td>
                  <td>${count}</td>
                  <td>${percentage.toFixed(1)}%</td>
                </tr>
                `;
              }).join('')}
          </table>
        </div>
      </div>
    </div>
    
    <div class="footer">
      Generated by TDD Metrics Tool • ${report.timestamp.toISOString()}
    </div>
  </div>
  
  <script>
    // Initialize charts when the page is loaded
    document.addEventListener('DOMContentLoaded', function() {
      // Convert chart data from our format to Chart.js format
      
      // Coverage bar chart
      const coverageCtx = document.getElementById('coverageChart').getContext('2d');
      new Chart(coverageCtx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(coverageData.labels)},
          datasets: [{
            label: 'Coverage %',
            data: ${JSON.stringify(coverageData.datasets[0].values)},
            backgroundColor: ${JSON.stringify(coverageData.datasets[0].colors)},
            borderColor: 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      
      // Layer coverage radar chart
      const layerCtx = document.getElementById('layerCoverageChart').getContext('2d');
      new Chart(layerCtx, {
        type: 'radar',
        data: {
          labels: ${JSON.stringify(layerCoverageData.labels)},
          datasets: [
            {
              label: 'Line Coverage',
              data: ${JSON.stringify(layerCoverageData.datasets[0].values)},
              backgroundColor: 'rgba(25, 118, 210, 0.2)',
              borderColor: 'rgba(25, 118, 210, 1)',
              pointBackgroundColor: 'rgba(25, 118, 210, 1)',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(25, 118, 210, 1)'
            },
            {
              label: 'Function Coverage',
              data: ${JSON.stringify(layerCoverageData.datasets[1].values)},
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              borderColor: 'rgba(76, 175, 80, 1)',
              pointBackgroundColor: 'rgba(76, 175, 80, 1)',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(76, 175, 80, 1)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: {
                display: true
              },
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
      
      // Violations pie chart
      const violationsCtx = document.getElementById('violationsChart').getContext('2d');
      new Chart(violationsCtx, {
        type: 'pie',
        data: {
          labels: ${JSON.stringify(violationsData.labels)},
          datasets: [{
            data: ${JSON.stringify(violationsData.datasets[0].values)},
            backgroundColor: ${JSON.stringify(violationsData.datasets[0].colors)},
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      
      // Test types pie chart
      const testTypeCtx = document.getElementById('testTypeChart').getContext('2d');
      new Chart(testTypeCtx, {
        type: 'pie',
        data: {
          labels: ${JSON.stringify(testTypeData.labels)},
          datasets: [{
            data: ${JSON.stringify(testTypeData.datasets[0].values)},
            backgroundColor: ${JSON.stringify(testTypeData.datasets[0].colors)},
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      
      // Layer distribution pie chart
      const layerDistData = {
        labels: Object.keys(${JSON.stringify(report.distributionMetrics.testCountByLayer)}),
        values: Object.values(${JSON.stringify(report.distributionMetrics.testCountByLayer)})
      };
      
      const layerDistCtx = document.getElementById('layerDistributionChart').getContext('2d');
      new Chart(layerDistCtx, {
        type: 'pie',
        data: {
          labels: layerDistData.labels,
          datasets: [{
            data: layerDistData.values,
            backgroundColor: [
              '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4'
            ],
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    });
  </script>
</body>
</html>
    `;
    
    fs.writeFileSync(htmlPath, htmlContent);
  }
  
  /**
   * Save raw coverage data
   */
  private saveCoverageData(coverageData: CoverageData): void {
    const dataPath = path.join(this.config.outputPath, 'coverage-data.json');
    
    // Clone the data to remove circular references
    const cleanedData = JSON.parse(JSON.stringify(coverageData));
    
    fs.writeFileSync(dataPath, JSON.stringify(cleanedData, null, 2));
  }
}