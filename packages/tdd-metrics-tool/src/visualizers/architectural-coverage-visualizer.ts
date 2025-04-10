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
import { CoverageData, ArchitecturalLayer, LanguageType } from '../models/types';
import { TestMetricsReport } from '../models/metrics';

/**
 * Interface for visualization options
 */
export interface VisualizationOptions {
  outputDir: string;
  includeLanguageBreakdown?: boolean;
  includeFileDetails?: boolean;
  includeHeatmap?: boolean;
  includeSunburst?: boolean;
  includeBarCharts?: boolean;
  showThresholds?: boolean;
  darkMode?: boolean;
  interactiveCharts?: boolean;
}

/**
 * Generates visualizations for test coverage by architectural layer
 */
export class ArchitecturalCoverageVisualizer {
  /**
   * Create architectural layer visualizations for coverage data
   */
  public static generateVisualizations(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: VisualizationOptions
  ): void {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Generate main HTML report
    this.generateHtmlReport(report, coverageData, options);
    
    // Generate JSON data file for interactive visualizations
    this.generateJsonData(report, coverageData, options);
    
    // Generate SVG visualizations for embedding in documentation
    this.generateSvgVisualizations(report, coverageData, options);
    
    // Generate CSV data for further analysis
    this.generateCsvData(report, coverageData, options);
  }
  
  /**
   * Generate JSON data file for the visualizations
   */
  private static generateJsonData(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: VisualizationOptions
  ): void {
    const jsonPath = path.join(options.outputDir, 'architectural-coverage-data.json');
    
    // Create data structure for visualization
    const visualizationData = {
      timestamp: new Date().toISOString(),
      projectName: report.projectName,
      architecturalLayers: this.prepareLayerData(report, coverageData),
      languageBreakdown: this.prepareLanguageData(coverageData),
      thresholds: report.getThresholds(),
      coverageTrends: this.prepareHistoricalData(options.outputDir)
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(visualizationData, null, 2));
  }
  
  /**
   * Generate SVG visualizations
   */
  private static generateSvgVisualizations(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: VisualizationOptions
  ): void {
    // SVG directory
    const svgDir = path.join(options.outputDir, 'svg');
    if (!fs.existsSync(svgDir)) {
      fs.mkdirSync(svgDir, { recursive: true });
    }
    
    // Generate standalone SVG charts
    // These are typically used for embedding in documentation
    
    // Radar chart of layer coverage
    const radarSvgPath = path.join(svgDir, 'layer-coverage-radar.svg');
    const radarSvgContent = this.generateRadarChartSvg(report);
    fs.writeFileSync(radarSvgPath, radarSvgContent);
    
    // Bar chart of layer coverage
    const barSvgPath = path.join(svgDir, 'layer-coverage-bars.svg');
    const barSvgContent = this.generateBarChartSvg(report);
    fs.writeFileSync(barSvgPath, barSvgContent);
    
    // Generate sunburst chart if requested
    if (options.includeSunburst) {
      const sunburstSvgPath = path.join(svgDir, 'layer-coverage-sunburst.svg');
      const sunburstSvgContent = this.generateSunburstChartSvg(report, coverageData);
      fs.writeFileSync(sunburstSvgPath, sunburstSvgContent);
    }
    
    // Generate heatmap if requested
    if (options.includeHeatmap) {
      const heatmapSvgPath = path.join(svgDir, 'layer-coverage-heatmap.svg');
      const heatmapSvgContent = this.generateHeatmapSvg(report, coverageData);
      fs.writeFileSync(heatmapSvgPath, heatmapSvgContent);
    }
  }
  
  /**
   * Generate CSV data for further analysis
   */
  private static generateCsvData(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: VisualizationOptions
  ): void {
    const csvPath = path.join(options.outputDir, 'architectural-coverage.csv');
    
    // CSV headers
    let csvContent = 'Layer,LineCoverage,FunctionCoverage,FileCount,TestCount,LanguageBreakdown\n';
    
    // Count tests by layer
    const testsByLayer = this.countTestsByLayer(coverageData);
    
    // Count files by layer and language
    const filesByLayerAndLanguage = this.countFilesByLayerAndLanguage(coverageData);
    
    // Add rows for each architectural layer
    Object.entries(report.architecturalMetrics.architecturalCoverage).forEach(([layer, coverage]) => {
      const fileCount = coverageData.sourceFiles.filter(file => file.layer === layer).length;
      const testCount = testsByLayer[layer] || 0;
      
      // Language breakdown as JSON in CSV field
      const languageBreakdown = JSON.stringify(filesByLayerAndLanguage[layer] || {});
      
      csvContent += `${layer},${coverage.lineCoverage.value},${coverage.functionCoverage.value},${fileCount},${testCount},${languageBreakdown}\n`;
    });
    
    fs.writeFileSync(csvPath, csvContent);
  }
  
  /**
   * Count test cases by architectural layer they're targeting
   */
  private static countTestsByLayer(coverageData: CoverageData): Record<string, number> {
    const result: Record<string, number> = {};
    
    // Initialize counters for each layer
    Object.values(ArchitecturalLayer).forEach(layer => {
      result[layer] = 0;
    });
    
    // Count tests targeting each layer
    coverageData.testFiles.forEach(testFile => {
      testFile.testCases.forEach(testCase => {
        if (!testCase.coveredFiles) {
          return;
        }
        
        // Group covered files by layer
        const coveredLayers = new Set<string>();
        
        testCase.coveredFiles.forEach(coveredFile => {
          const matchingSourceFile = coverageData.sourceFiles.find(
            sf => sf.filePath === coveredFile
          );
          
          if (matchingSourceFile) {
            coveredLayers.add(matchingSourceFile.layer);
          }
        });
        
        // Increment count for each layer
        coveredLayers.forEach(layer => {
          result[layer] = (result[layer] || 0) + 1;
        });
      });
    });
    
    return result;
  }
  
  /**
   * Count files by layer and language
   */
  private static countFilesByLayerAndLanguage(coverageData: CoverageData): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    
    // Initialize counters for each layer
    Object.values(ArchitecturalLayer).forEach(layer => {
      result[layer] = {
        [LanguageType.TYPESCRIPT]: 0,
        [LanguageType.PYTHON]: 0,
        [LanguageType.GO]: 0
      };
    });
    
    // Count files by layer and language
    coverageData.sourceFiles.forEach(sourceFile => {
      if (!result[sourceFile.layer]) {
        result[sourceFile.layer] = {
          [LanguageType.TYPESCRIPT]: 0,
          [LanguageType.PYTHON]: 0,
          [LanguageType.GO]: 0
        };
      }
      
      result[sourceFile.layer][sourceFile.language] = 
        (result[sourceFile.layer][sourceFile.language] || 0) + 1;
    });
    
    return result;
  }
  
  /**
   * Prepare layer data for visualization
   */
  private static prepareLayerData(
    report: TestMetricsReport,
    coverageData: CoverageData
  ): any[] {
    const layers = Object.entries(report.architecturalMetrics.architecturalCoverage);
    
    // Get thresholds if available
    const thresholds = report.getThresholds();
    
    return layers.map(([layer, coverage]) => {
      const threshold = thresholds?.layerCoverage?.[layer]?.lineCoverage;
      const fileCount = coverageData.sourceFiles.filter(file => file.layer === layer).length;
      const testsByLayer = this.countTestsByLayer(coverageData);
      const testCount = testsByLayer[layer] || 0;
      
      return {
        layer,
        lineCoverage: coverage.lineCoverage.value,
        functionCoverage: coverage.functionCoverage.value,
        threshold: threshold,
        belowThreshold: threshold ? coverage.lineCoverage.value < threshold : false,
        files: fileCount,
        tests: testCount,
        testToCodeRatio: fileCount > 0 ? testCount / fileCount : 0
      };
    });
  }
  
  /**
   * Prepare language breakdown data
   */
  private static prepareLanguageData(coverageData: CoverageData): any {
    const languages = Object.values(LanguageType);
    const result: Record<string, any> = {};
    
    languages.forEach(language => {
      // Count files for this language
      const sourceFiles = coverageData.sourceFiles.filter(file => file.language === language);
      const testFiles = coverageData.testFiles.filter(file => file.language === language);
      
      // Count files by layer
      const filesByLayer: Record<string, number> = {};
      Object.values(ArchitecturalLayer).forEach(layer => {
        filesByLayer[layer] = sourceFiles.filter(file => file.layer === layer).length;
      });
      
      // Estimate coverage for this language
      let totalLines = 0;
      let coveredLines = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      
      sourceFiles.forEach(file => {
        totalLines += file.lines;
        totalFunctions += file.functions.length;
        
        // Estimate coverage based on test files for this language
        const testCoverage = testFiles.reduce((count, testFile) => {
          const casesCoveringThisFile = testFile.testCases.filter(tc => 
            tc.coveredFiles?.includes(file.filePath)
          ).length;
          
          return count + (casesCoveringThisFile > 0 ? 1 : 0);
        }, 0);
        
        // If at least one test covers this file, estimate line coverage
        if (testCoverage > 0) {
          coveredLines += Math.round(file.lines * 0.7); // Assume 70% coverage when a file is tested
          coveredFunctions += Math.round(file.functions.length * 0.7);
        }
      });
      
      result[language] = {
        files: sourceFiles.length,
        tests: testFiles.length,
        filesByLayer,
        coverage: {
          lines: {
            total: totalLines,
            covered: coveredLines,
            percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
          },
          functions: {
            total: totalFunctions,
            covered: coveredFunctions,
            percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
          }
        }
      };
    });
    
    return result;
  }
  
  /**
   * Try to load historical data for trends
   */
  private static prepareHistoricalData(outputDir: string): any[] {
    const historyFile = path.join(outputDir, 'coverage-history.json');
    
    if (fs.existsSync(historyFile)) {
      try {
        const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
        return historyData;
      } catch (error) {
        console.error('Error loading historical data:', error);
      }
    }
    
    return [];
  }
  
  /**
   * Generate SVG for a radar chart of layer coverage
   */
  private static generateRadarChartSvg(report: TestMetricsReport): string {
    // This is a simplified SVG radar chart
    const coverageByLayer = Object.entries(report.architecturalMetrics.architecturalCoverage);
    const layerCount = coverageByLayer.length;
    
    // Calculate radar chart points
    const centerX = 200;
    const centerY = 200;
    const radius = 180;
    const layerColors = {
      [ArchitecturalLayer.DOMAIN]: '#4CAF50',
      [ArchitecturalLayer.USE_CASE]: '#8BC34A',
      [ArchitecturalLayer.ADAPTER]: '#2196F3',
      [ArchitecturalLayer.INFRASTRUCTURE]: '#9C27B0',
      [ArchitecturalLayer.UNKNOWN]: '#757575'
    };
    
    // Calculate points for the axes
    const axisPoints = [];
    for (let i = 0; i < layerCount; i++) {
      const angle = (i / layerCount) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      axisPoints.push({ x, y, angle });
    }
    
    // Calculate points for the coverage polygon
    const lineCoveragePoints = [];
    const functionCoveragePoints = [];
    
    for (let i = 0; i < layerCount; i++) {
      const [layer, coverage] = coverageByLayer[i];
      const lineCoverageValue = coverage.lineCoverage.value / 100;
      const functionCoverageValue = coverage.functionCoverage.value / 100;
      
      const angle = (i / layerCount) * 2 * Math.PI - Math.PI / 2;
      const lineX = centerX + radius * lineCoverageValue * Math.cos(angle);
      const lineY = centerY + radius * lineCoverageValue * Math.sin(angle);
      
      const funcX = centerX + radius * functionCoverageValue * Math.cos(angle);
      const funcY = centerY + radius * functionCoverageValue * Math.sin(angle);
      
      lineCoveragePoints.push({ x: lineX, y: lineY });
      functionCoveragePoints.push({ x: funcX, y: funcY });
    }
    
    // Start building the SVG
    let svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <style>
    .axis { stroke: #ccc; stroke-width: 1; }
    .ring { fill: none; stroke: #eee; stroke-width: 1; }
    .label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
    .value-label { font-family: Arial, sans-serif; font-size: 10px; text-anchor: middle; fill: #666; }
    .line-coverage { fill: rgba(33, 150, 243, 0.3); stroke: rgba(33, 150, 243, 0.8); stroke-width: 2; }
    .function-coverage { fill: rgba(76, 175, 80, 0.3); stroke: rgba(76, 175, 80, 0.8); stroke-width: 2; }
    .title { font-family: Arial, sans-serif; font-size: 16px; text-anchor: middle; font-weight: bold; }
    .legend-item { font-family: Arial, sans-serif; font-size: 12px; }
  </style>
  
  <title>Architectural Layer Coverage</title>
  
  <!-- Background rings at 25%, 50%, 75%, 100% -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.25}" class="ring" />
  <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.5}" class="ring" />
  <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.75}" class="ring" />
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" class="ring" />
  
  <!-- Value labels -->
  <text x="${centerX}" y="${centerY - radius * 0.25}" class="value-label">25%</text>
  <text x="${centerX}" y="${centerY - radius * 0.5}" class="value-label">50%</text>
  <text x="${centerX}" y="${centerY - radius * 0.75}" class="value-label">75%</text>
  <text x="${centerX}" y="${centerY - radius - 5}" class="value-label">100%</text>
  
  <!-- Axis lines -->`;
    
    // Add axis lines
    for (let i = 0; i < layerCount; i++) {
      const { x, y } = axisPoints[i];
      svg += `\n  <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" class="axis" />`;
    }
    
    // Add layer labels
    for (let i = 0; i < layerCount; i++) {
      const { x, y, angle } = axisPoints[i];
      const [layer] = coverageByLayer[i];
      
      // Position labels slightly beyond the chart
      const labelX = centerX + (radius + 20) * Math.cos(angle);
      const labelY = centerY + (radius + 20) * Math.sin(angle);
      
      svg += `\n  <text x="${labelX}" y="${labelY}" class="label">${layer}</text>`;
    }
    
    // Add function coverage polygon
    let funcPoints = '';
    for (const point of functionCoveragePoints) {
      funcPoints += `${point.x},${point.y} `;
    }
    
    svg += `\n  <polygon points="${funcPoints}" class="function-coverage" />`;
    
    // Add line coverage polygon
    let linePoints = '';
    for (const point of lineCoveragePoints) {
      linePoints += `${point.x},${point.y} `;
    }
    
    svg += `\n  <polygon points="${linePoints}" class="line-coverage" />`;
    
    // Add title and legend
    svg += `
  <text x="${centerX}" y="30" class="title">Coverage by Architectural Layer</text>
  
  <!-- Legend -->
  <rect x="50" y="350" width="12" height="12" fill="rgba(33, 150, 243, 0.3)" stroke="rgba(33, 150, 243, 0.8)" stroke-width="2" />
  <text x="70" y="360" class="legend-item">Line Coverage</text>
  
  <rect x="200" y="350" width="12" height="12" fill="rgba(76, 175, 80, 0.3)" stroke="rgba(76, 175, 80, 0.8)" stroke-width="2" />
  <text x="220" y="360" class="legend-item">Function Coverage</text>
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate SVG for a bar chart of layer coverage
   */
  private static generateBarChartSvg(report: TestMetricsReport): string {
    const coverageByLayer = Object.entries(report.architecturalMetrics.architecturalCoverage);
    const layerCount = coverageByLayer.length;
    
    // Chart dimensions
    const width = 600;
    const height = 400;
    const marginTop = 60;
    const marginRight = 50;
    const marginBottom = 60;
    const marginLeft = 60;
    
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;
    
    // Bar width calculations
    const groupWidth = chartWidth / layerCount;
    const barWidth = groupWidth * 0.35;
    const barGap = groupWidth * 0.1;
    
    // Color scale
    const lineColor = '#2196F3';
    const functionColor = '#4CAF50';
    
    // Start building the SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .bar { opacity: 0.8; }
    .axis-line { stroke: #ccc; stroke-width: 1; }
    .grid-line { stroke: #eee; stroke-width: 1; stroke-dasharray: 2,2; }
    .label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
    .y-label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: end; }
    .title { font-family: Arial, sans-serif; font-size: 16px; text-anchor: middle; font-weight: bold; }
    .legend-item { font-family: Arial, sans-serif; font-size: 12px; }
  </style>
  
  <title>Architectural Layer Coverage</title>
  
  <!-- Axes -->
  <line 
    x1="${marginLeft}" 
    y1="${height - marginBottom}" 
    x2="${width - marginRight}" 
    y2="${height - marginBottom}" 
    class="axis-line" 
  />
  
  <line 
    x1="${marginLeft}" 
    y1="${height - marginBottom}" 
    x2="${marginLeft}" 
    y2="${marginTop}" 
    class="axis-line" 
  />
  
  <!-- Grid lines and Y axis labels -->`;
    
    // Add horizontal grid lines and labels
    for (let i = 0; i <= 10; i++) {
      const yPos = marginTop + chartHeight - (i / 10) * chartHeight;
      const value = i * 10;
      
      svg += `
  <line 
    x1="${marginLeft}" 
    y1="${yPos}" 
    x2="${width - marginRight}" 
    y2="${yPos}" 
    class="grid-line" 
  />
  
  <text x="${marginLeft - 10}" y="${yPos + 5}" class="y-label">${value}%</text>`;
    }
    
    // Add bars for each layer
    coverageByLayer.forEach(([layer, coverage], index) => {
      const groupX = marginLeft + (index * chartWidth / layerCount) + groupWidth / 2;
      
      // Line coverage bar
      const lineHeight = (coverage.lineCoverage.value / 100) * chartHeight;
      const lineX = groupX - barWidth - barGap / 2;
      const lineY = height - marginBottom - lineHeight;
      
      // Function coverage bar
      const funcHeight = (coverage.functionCoverage.value / 100) * chartHeight;
      const funcX = groupX + barGap / 2;
      const funcY = height - marginBottom - funcHeight;
      
      // Add the bars
      svg += `
  <!-- ${layer} bars -->
  <rect 
    x="${lineX}" 
    y="${lineY}" 
    width="${barWidth}" 
    height="${lineHeight}" 
    class="bar" 
    fill="${lineColor}" 
  />
  
  <rect 
    x="${funcX}" 
    y="${funcY}" 
    width="${barWidth}" 
    height="${funcHeight}" 
    class="bar" 
    fill="${functionColor}" 
  />
  
  <!-- Value labels -->
  <text 
    x="${lineX + barWidth / 2}" 
    y="${lineY - 5}" 
    class="label"
  >${coverage.lineCoverage.value.toFixed(1)}%</text>
  
  <text 
    x="${funcX + barWidth / 2}" 
    y="${funcY - 5}" 
    class="label"
  >${coverage.functionCoverage.value.toFixed(1)}%</text>
  
  <!-- Layer label -->
  <text 
    x="${groupX}" 
    y="${height - marginBottom + 20}" 
    class="label"
  >${layer}</text>`;
    });
    
    // Add title and legend
    svg += `
  <text 
    x="${width / 2}" 
    y="30" 
    class="title"
  >Coverage by Architectural Layer</text>
  
  <!-- Legend -->
  <rect x="${marginLeft}" y="${marginTop - 30}" width="12" height="12" fill="${lineColor}" />
  <text x="${marginLeft + 20}" y="${marginTop - 20}" class="legend-item">Line Coverage</text>
  
  <rect x="${marginLeft + 150}" y="${marginTop - 30}" width="12" height="12" fill="${functionColor}" />
  <text x="${marginLeft + 170}" y="${marginTop - 20}" class="legend-item">Function Coverage</text>
  
  <!-- Y-axis title -->
  <text 
    x="${marginLeft - 40}" 
    y="${marginTop + chartHeight / 2}" 
    class="title" 
    transform="rotate(-90, ${marginLeft - 40}, ${marginTop + chartHeight / 2})"
  >Coverage</text>
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate SVG for a sunburst chart of coverage
   */
  private static generateSunburstChartSvg(
    report: TestMetricsReport,
    coverageData: CoverageData
  ): string {
    // This is a placeholder for a more complex SVG generation
    // In a real implementation, we'd generate a proper sunburst chart
    return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <text x="200" y="200" text-anchor="middle">Sunburst Chart Placeholder</text>
</svg>`;
  }
  
  /**
   * Generate SVG for a heatmap of coverage
   */
  private static generateHeatmapSvg(
    report: TestMetricsReport,
    coverageData: CoverageData
  ): string {
    // This is a placeholder for a more complex SVG generation
    // In a real implementation, we'd generate a proper heatmap
    return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <text x="200" y="200" text-anchor="middle">Heatmap Placeholder</text>
</svg>`;
  }
  
  /**
   * Generate HTML report with interactive visualizations
   */
  private static generateHtmlReport(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: VisualizationOptions
  ): void {
    const htmlPath = path.join(options.outputDir, 'architectural-coverage.html');
    
    // Prepare layer data
    const layerData = this.prepareLayerData(report, coverageData);
    const languageData = this.prepareLanguageData(coverageData);
    
    // Generate HTML content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architectural Coverage Visualization - ${report.projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  ${options.includeSunburst ? '<script src="https://cdn.jsdelivr.net/npm/d3-sunburst"></script>' : ''}
  
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
      ${options.darkMode ? `
      --chart-background: #212121;
      --chart-text: #FFFFFF;
      --chart-grid: #424242;
      ` : `
      --chart-background: #FFFFFF;
      --chart-text: #212121;
      --chart-grid: #E0E0E0;
      `}
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: ${options.darkMode ? '#121212' : '#FAFAFA'};
      color: ${options.darkMode ? '#FFFFFF' : '#212121'};
    }
    
    header {
      background-color: var(--primary-color);
      color: white;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1, h2, h3, h4 {
      margin-top: 0;
    }
    
    h1 {
      font-weight: 400;
      margin-bottom: 0.5rem;
    }
    
    h2 {
      color: var(--primary-dark);
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 0.5rem;
      margin-top: 2rem;
      margin-bottom: 1.5rem;
    }
    
    .chart-container {
      background-color: var(--chart-background);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 1.5rem;
      margin-bottom: 2rem;
      position: relative;
    }
    
    .row {
      display: flex;
      flex-wrap: wrap;
      margin: 0 -1rem;
    }
    
    .col {
      flex: 1;
      min-width: 300px;
      padding: 0 1rem;
      margin-bottom: 2rem;
    }
    
    .metrics-card {
      background-color: ${options.darkMode ? '#212121' : 'white'};
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 1.5rem;
      height: 100%;
    }
    
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    .metrics-table th,
    .metrics-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    
    .metrics-table th {
      font-weight: 500;
      background-color: ${options.darkMode ? '#333' : '#f5f5f5'};
    }
    
    .metric-value {
      font-weight: 700;
      text-align: right;
    }
    
    .metric-bar {
      height: 8px;
      background-color: #eee;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }
    
    .metric-fill {
      height: 100%;
      border-radius: 4px;
    }
    
    .threshold-marker {
      position: absolute;
      width: 2px;
      height: 100%;
      background-color: var(--warning-color);
    }
    
    .toggle-button {
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .toggle-button:hover {
      background-color: var(--primary-dark);
    }
    
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .col {
        flex: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Architectural Coverage Visualization</h1>
    <p>${report.projectName} - Generated on ${new Date().toLocaleString()}</p>
  </header>
  
  <div class="container">
    <h2>Coverage by Architectural Layer</h2>
    
    <div class="chart-container">
      <canvas id="layerBarChart"></canvas>
    </div>
    
    <div class="row">
      <div class="col">
        <div class="chart-container">
          <canvas id="layerRadarChart"></canvas>
        </div>
      </div>
      <div class="col">
        <div class="chart-container">
          <canvas id="languagePieChart"></canvas>
        </div>
      </div>
    </div>
    
    ${options.includeLanguageBreakdown ? `
    <h2>Language Breakdown</h2>
    
    <div class="row">
      <div class="col">
        <div class="chart-container">
          <canvas id="tsLayerChart"></canvas>
        </div>
      </div>
      <div class="col">
        <div class="chart-container">
          <canvas id="pyLayerChart"></canvas>
        </div>
      </div>
      <div class="col">
        <div class="chart-container">
          <canvas id="goLayerChart"></canvas>
        </div>
      </div>
    </div>
    ` : ''}
    
    ${options.includeSunburst ? `
    <h2>Coverage Sunburst</h2>
    
    <div class="chart-container">
      <div id="sunburstChart" style="width: 100%; height: 500px;"></div>
    </div>
    ` : ''}
    
    <h2>Detailed Metrics</h2>
    
    <div class="metrics-card">
      <h3>Layer Coverage</h3>
      
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Architectural Layer</th>
            <th>Line Coverage</th>
            <th>Function Coverage</th>
            <th>Files</th>
            <th>Tests</th>
            <th>Test/Code Ratio</th>
          </tr>
        </thead>
        <tbody>
          ${layerData.map(layer => `
          <tr>
            <td>${layer.layer}</td>
            <td class="metric-value">${layer.lineCoverage.toFixed(1)}%</td>
            <td class="metric-value">${layer.functionCoverage.toFixed(1)}%</td>
            <td class="metric-value">${layer.files}</td>
            <td class="metric-value">${layer.tests}</td>
            <td class="metric-value">${layer.testToCodeRatio.toFixed(2)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    ${options.includeFileDetails ? `
    <div class="metrics-card" style="margin-top: 2rem;">
      <h3>Files by Language and Layer</h3>
      
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>TypeScript</th>
            <th>Python</th>
            <th>Go</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(this.countFilesByLayerAndLanguage(coverageData)).map(([layer, counts]) => `
          <tr>
            <td>${layer}</td>
            <td class="metric-value">${counts.typescript || 0}</td>
            <td class="metric-value">${counts.python || 0}</td>
            <td class="metric-value">${counts.go || 0}</td>
            <td class="metric-value">${
              (counts.typescript || 0) + 
              (counts.python || 0) + 
              (counts.go || 0)
            }</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    Generated by TDD Metrics Tool - ${new Date().toISOString()}
  </div>
  
  <script>
    // Data for charts
    const layerData = ${JSON.stringify(layerData)};
    const languageData = ${JSON.stringify(languageData)};
    
    // Chart colors
    const layerColors = {
      'domain': '#4CAF50',
      'use-case': '#8BC34A',
      'adapter': '#2196F3',
      'infrastructure': '#9C27B0',
      'unknown': '#757575'
    };
    
    const languageColors = {
      'typescript': '#007ACC',
      'python': '#3776AB',
      'go': '#00ADD8'
    };
    
    // Common chart options
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      },
      scales: {
        r: {
          grid: {
            color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
          },
          angleLines: {
            color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
          },
          pointLabels: {
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        },
        x: {
          grid: {
            color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
          },
          ticks: {
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        },
        y: {
          grid: {
            color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
          },
          ticks: {
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      }
    };
    
    // Layer bar chart
    const layerBarCtx = document.getElementById('layerBarChart').getContext('2d');
    const layerBarChart = new Chart(layerBarCtx, {
      type: 'bar',
      data: {
        labels: layerData.map(l => l.layer),
        datasets: [
          {
            label: 'Line Coverage',
            data: layerData.map(l => l.lineCoverage),
            backgroundColor: layerData.map(l => layerColors[l.layer] + '80'),
            borderColor: layerData.map(l => layerColors[l.layer]),
            borderWidth: 1
          },
          {
            label: 'Function Coverage',
            data: layerData.map(l => l.functionCoverage),
            backgroundColor: layerData.map(l => layerColors[l.layer] + '40'),
            borderColor: layerData.map(l => layerColors[l.layer]),
            borderWidth: 1
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Coverage (%)',
              color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
            }
          }
        }
      }
    });
    
    // Layer radar chart
    const layerRadarCtx = document.getElementById('layerRadarChart').getContext('2d');
    const layerRadarChart = new Chart(layerRadarCtx, {
      type: 'radar',
      data: {
        labels: layerData.map(l => l.layer),
        datasets: [
          {
            label: 'Line Coverage',
            data: layerData.map(l => l.lineCoverage),
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderColor: 'rgb(33, 150, 243)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(33, 150, 243)'
          },
          {
            label: 'Function Coverage',
            data: layerData.map(l => l.functionCoverage),
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            borderColor: 'rgb(76, 175, 80)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(76, 175, 80)'
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          r: {
            ...commonOptions.scales.r,
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
    
    // Language pie chart
    const languagePieCtx = document.getElementById('languagePieChart').getContext('2d');
    const languagePieChart = new Chart(languagePieCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(languageData),
        datasets: [{
          data: Object.values(languageData).map(l => l.files),
          backgroundColor: Object.keys(languageData).map(l => languageColors[l]),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: {
            display: true,
            text: 'Files by Language',
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      }
    });
    
    ${options.includeLanguageBreakdown ? `
    // TypeScript layer chart
    const tsLayerCtx = document.getElementById('tsLayerChart').getContext('2d');
    const tsLayerChart = new Chart(tsLayerCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(languageData.typescript.filesByLayer),
        datasets: [{
          data: Object.values(languageData.typescript.filesByLayer),
          backgroundColor: Object.keys(languageData.typescript.filesByLayer).map(l => layerColors[l]),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: {
            display: true,
            text: 'TypeScript Files by Layer',
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      }
    });
    
    // Python layer chart
    const pyLayerCtx = document.getElementById('pyLayerChart').getContext('2d');
    const pyLayerChart = new Chart(pyLayerCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(languageData.python.filesByLayer),
        datasets: [{
          data: Object.values(languageData.python.filesByLayer),
          backgroundColor: Object.keys(languageData.python.filesByLayer).map(l => layerColors[l]),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: {
            display: true,
            text: 'Python Files by Layer',
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      }
    });
    
    // Go layer chart
    const goLayerCtx = document.getElementById('goLayerChart').getContext('2d');
    const goLayerChart = new Chart(goLayerCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(languageData.go.filesByLayer),
        datasets: [{
          data: Object.values(languageData.go.filesByLayer),
          backgroundColor: Object.keys(languageData.go.filesByLayer).map(l => layerColors[l]),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          title: {
            display: true,
            text: 'Go Files by Layer',
            color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
          }
        }
      }
    });
    ` : ''}
    
    ${options.includeSunburst && options.interactiveCharts ? `
    // Sunburst chart with D3.js
    document.addEventListener('DOMContentLoaded', function() {
      // This is a placeholder for a D3.js sunburst chart
      // In a real implementation, we would use D3.js to create a sunburst chart
      const sunburstElement = document.getElementById('sunburstChart');
      sunburstElement.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-size: 16px;">Sunburst chart requires D3.js implementation</div>';
    });
    ` : ''}
  </script>
</body>
</html>`;
    
    // Write the HTML file
    fs.writeFileSync(htmlPath, htmlContent);
  }
}