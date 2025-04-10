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
import { CoverageData, ArchitecturalLayer, LanguageType, TestType } from '../models/types';
import { TestMetricsReport, TestQualityMetrics } from '../models/metrics';

/**
 * Interface for visualization options
 */
export interface QualityVisualizationOptions {
  outputDir: string;
  includeTestComplexity?: boolean;
  includeTestToCodeRatio?: boolean;
  includeSetupToAssertionRatio?: boolean;
  includeTestIsolation?: boolean;
  includeTestDistribution?: boolean;
  includeTestExecutionTime?: boolean;
  includeTrendAnalysis?: boolean;
  darkMode?: boolean;
  interactive?: boolean;
}

/**
 * Generates visualizations for test quality metrics
 */
export class QualityMetricsVisualizer {
  /**
   * Generate test quality metrics visualizations
   */
  public static generateVisualizations(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: QualityVisualizationOptions
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
   * Generate JSON data file for visualizations
   */
  private static generateJsonData(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: QualityVisualizationOptions
  ): void {
    const jsonPath = path.join(options.outputDir, 'quality-metrics-data.json');
    
    // Create data structure for visualization
    const visualizationData = {
      timestamp: new Date().toISOString(),
      projectName: report.projectName,
      qualityMetrics: {
        testToCodeRatio: report.qualityMetrics.testToCodeRatio.value,
        setupToAssertionRatio: report.qualityMetrics.setupToAssertionRatio?.value,
        testComplexity: report.qualityMetrics.testComplexity?.value,
        averageTestExecutionTime: report.qualityMetrics.averageTestExecutionTime?.value,
        testIsolation: report.qualityMetrics.testIsolation?.value
      },
      distributionMetrics: {
        testCountByType: report.distributionMetrics.testCountByType,
        testCountByLayer: report.distributionMetrics.testCountByLayer,
        percentageByType: report.distributionMetrics.getTestPercentageByType(),
        percentageByLayer: report.distributionMetrics.getTestPercentageByLayer()
      },
      testFiles: coverageData.testFiles.map(file => ({
        filePath: file.filePath,
        filename: file.filename,
        language: file.language,
        layer: file.layer,
        type: file.type,
        testCount: file.testCases.length,
        skippedCount: file.testCases.filter(tc => tc.skipped).length,
        assertionCount: file.testCases.reduce((sum, tc) => sum + (tc.assertions || 0), 0)
      })),
      thresholds: this.extractThresholds(report)
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(visualizationData, null, 2));
  }
  
  /**
   * Extract quality thresholds from a report
   */
  private static extractThresholds(report: TestMetricsReport): any {
    const thresholds = {
      testToCodeRatio: report.qualityMetrics.testToCodeRatio.target,
      setupToAssertionRatio: report.qualityMetrics.setupToAssertionRatio?.target,
      testComplexity: report.qualityMetrics.testComplexity?.target,
      averageTestExecutionTime: report.qualityMetrics.averageTestExecutionTime?.target,
      testIsolation: report.qualityMetrics.testIsolation?.target
    };
    
    return thresholds;
  }
  
  /**
   * Generate SVG visualizations
   */
  private static generateSvgVisualizations(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: QualityVisualizationOptions
  ): void {
    // SVG directory
    const svgDir = path.join(options.outputDir, 'svg');
    if (!fs.existsSync(svgDir)) {
      fs.mkdirSync(svgDir, { recursive: true });
    }
    
    // Test Type Distribution Pie Chart
    const testTypePieChartPath = path.join(svgDir, 'test-type-distribution.svg');
    const testTypePieChartContent = this.generateTestTypeDistributionSvg(report);
    fs.writeFileSync(testTypePieChartPath, testTypePieChartContent);
    
    // Test Layer Distribution Pie Chart
    const testLayerPieChartPath = path.join(svgDir, 'test-layer-distribution.svg');
    const testLayerPieChartContent = this.generateTestLayerDistributionSvg(report);
    fs.writeFileSync(testLayerPieChartPath, testLayerPieChartContent);
    
    // Test-to-Code Ratio Gauge Chart
    const testToCodeGaugePath = path.join(svgDir, 'test-to-code-ratio-gauge.svg');
    const testToCodeGaugeContent = this.generateTestToCodeRatioGaugeSvg(report);
    fs.writeFileSync(testToCodeGaugePath, testToCodeGaugeContent);
    
    // Language-specific Test Quality Radar Chart
    const testQualityRadarPath = path.join(svgDir, 'test-quality-radar.svg');
    const testQualityRadarContent = this.generateTestQualityRadarSvg(report, coverageData);
    fs.writeFileSync(testQualityRadarPath, testQualityRadarContent);
  }
  
  /**
   * Generate Test Type Distribution SVG
   */
  private static generateTestTypeDistributionSvg(report: TestMetricsReport): string {
    const percentageByType = report.distributionMetrics.getTestPercentageByType();
    const testTypes = Object.keys(percentageByType);
    
    // Define colors for each test type
    const typeColors = {
      [TestType.UNIT]: '#4CAF50',
      [TestType.INTEGRATION]: '#2196F3',
      [TestType.E2E]: '#9C27B0',
      [TestType.ACCEPTANCE]: '#FF9800',
      [TestType.PERFORMANCE]: '#F44336',
      [TestType.CONTRACT]: '#607D8B'
    };
    
    // Pie chart dimensions
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate pie slices
    let startAngle = 0;
    const slices = [];
    
    for (const type of testTypes) {
      const percentage = percentageByType[type as TestType] || 0;
      const angle = (percentage / 100) * 2 * Math.PI;
      
      // Calculate points for pie slice
      const endAngle = startAngle + angle;
      
      // Start point
      const x1 = centerX + radius * Math.cos(startAngle - Math.PI / 2);
      const y1 = centerY + radius * Math.sin(startAngle - Math.PI / 2);
      
      // End point
      const x2 = centerX + radius * Math.cos(endAngle - Math.PI / 2);
      const y2 = centerY + radius * Math.sin(endAngle - Math.PI / 2);
      
      // Determine if the arc is large (more than 180 degrees)
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      
      // Create SVG path for slice
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      // Calculate label position (midway through the slice)
      const labelAngle = startAngle + angle / 2 - Math.PI / 2;
      const labelRadius = radius * 0.7; // Place label at 70% of the radius
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      
      slices.push({
        type,
        percentage,
        path,
        labelX,
        labelY,
        color: typeColors[type as TestType] || '#999'
      });
      
      startAngle += angle;
    }
    
    // Generate SVG content
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .slice { stroke: white; stroke-width: 1; }
    .slice-label { font-family: Arial, sans-serif; font-size: 12px; fill: white; text-anchor: middle; pointer-events: none; }
    .title { font-family: Arial, sans-serif; font-size: 18px; fill: #333; text-anchor: middle; }
    .legend-item { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
  </style>
  
  <title>Test Distribution by Type</title>
  
  <text x="${centerX}" y="30" class="title">Test Distribution by Type</text>`;
    
    // Add pie slices
    for (const slice of slices) {
      svg += `
  <path d="${slice.path}" class="slice" fill="${slice.color}" />
  <text x="${slice.labelX}" y="${slice.labelY}" class="slice-label">${slice.percentage.toFixed(1)}%</text>`;
    }
    
    // Add legend
    let legendY = height - 60;
    for (const [index, slice] of slices.entries()) {
      const legendX = 40 + (index % 3) * 120;
      if (index % 3 === 0 && index > 0) {
        legendY += 25;
      }
      
      svg += `
  <rect x="${legendX - 25}" y="${legendY}" width="15" height="15" fill="${slice.color}" />
  <text x="${legendX}" y="${legendY + 12}" class="legend-item">${slice.type} (${slice.percentage.toFixed(1)}%)</text>`;
    }
    
    svg += `
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate Test Layer Distribution SVG
   */
  private static generateTestLayerDistributionSvg(report: TestMetricsReport): string {
    const percentageByLayer = report.distributionMetrics.getTestPercentageByLayer();
    const layers = Object.keys(percentageByLayer);
    
    // Define colors for each layer
    const layerColors = {
      [ArchitecturalLayer.DOMAIN]: '#4CAF50',
      [ArchitecturalLayer.USE_CASE]: '#8BC34A',
      [ArchitecturalLayer.ADAPTER]: '#2196F3',
      [ArchitecturalLayer.INFRASTRUCTURE]: '#9C27B0',
      [ArchitecturalLayer.UNKNOWN]: '#757575'
    };
    
    // Pie chart dimensions
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate pie slices
    let startAngle = 0;
    const slices = [];
    
    for (const layer of layers) {
      const percentage = percentageByLayer[layer as ArchitecturalLayer] || 0;
      const angle = (percentage / 100) * 2 * Math.PI;
      
      // Calculate points for pie slice
      const endAngle = startAngle + angle;
      
      // Start point
      const x1 = centerX + radius * Math.cos(startAngle - Math.PI / 2);
      const y1 = centerY + radius * Math.sin(startAngle - Math.PI / 2);
      
      // End point
      const x2 = centerX + radius * Math.cos(endAngle - Math.PI / 2);
      const y2 = centerY + radius * Math.sin(endAngle - Math.PI / 2);
      
      // Determine if the arc is large (more than 180 degrees)
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      
      // Create SVG path for slice
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      // Calculate label position (midway through the slice)
      const labelAngle = startAngle + angle / 2 - Math.PI / 2;
      const labelRadius = radius * 0.7; // Place label at 70% of the radius
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      
      slices.push({
        layer,
        percentage,
        path,
        labelX,
        labelY,
        color: layerColors[layer as ArchitecturalLayer] || '#999'
      });
      
      startAngle += angle;
    }
    
    // Generate SVG content
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .slice { stroke: white; stroke-width: 1; }
    .slice-label { font-family: Arial, sans-serif; font-size: 12px; fill: white; text-anchor: middle; pointer-events: none; }
    .title { font-family: Arial, sans-serif; font-size: 18px; fill: #333; text-anchor: middle; }
    .legend-item { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
  </style>
  
  <title>Test Distribution by Architectural Layer</title>
  
  <text x="${centerX}" y="30" class="title">Test Distribution by Architectural Layer</text>`;
    
    // Add pie slices
    for (const slice of slices) {
      svg += `
  <path d="${slice.path}" class="slice" fill="${slice.color}" />
  <text x="${slice.labelX}" y="${slice.labelY}" class="slice-label">${slice.percentage.toFixed(1)}%</text>`;
    }
    
    // Add legend
    let legendY = height - 60;
    for (const [index, slice] of slices.entries()) {
      const legendX = 40 + (index % 3) * 120;
      if (index % 3 === 0 && index > 0) {
        legendY += 25;
      }
      
      svg += `
  <rect x="${legendX - 25}" y="${legendY}" width="15" height="15" fill="${slice.color}" />
  <text x="${legendX}" y="${legendY + 12}" class="legend-item">${slice.layer} (${slice.percentage.toFixed(1)}%)</text>`;
    }
    
    svg += `
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate Test-to-Code Ratio Gauge SVG
   */
  private static generateTestToCodeRatioGaugeSvg(report: TestMetricsReport): string {
    const testToCodeRatio = report.qualityMetrics.testToCodeRatio.value;
    const target = report.qualityMetrics.testToCodeRatio.target || 0.7; // Default target is 0.7
    
    // Gauge dimensions
    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height - 50;
    const radius = Math.min(width, height) / 2 - 40;
    
    // Gauge spans from -135 to 135 degrees (270 degrees total)
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = 135 * (Math.PI / 180);
    const angleRange = endAngle - startAngle;
    
    // Calculate position of the needle
    // Clamp the ratio to 0-2 for the gauge (where 2.0 is maximum)
    const clampedRatio = Math.min(Math.max(testToCodeRatio, 0), 2);
    const ratio = clampedRatio / 2; // Normalize to 0-1 for angle calculation
    const needleAngle = startAngle + (ratio * angleRange);
    
    // Calculate the needle points
    const needleLength = radius * 0.85;
    const needleX = centerX + needleLength * Math.cos(needleAngle);
    const needleY = centerY + needleLength * Math.sin(needleAngle);
    
    // Calculate the target marker position
    const targetRatio = Math.min(Math.max(target, 0), 2) / 2;
    const targetAngle = startAngle + (targetRatio * angleRange);
    const targetMarkerOuterX = centerX + (radius + 10) * Math.cos(targetAngle);
    const targetMarkerOuterY = centerY + (radius + 10) * Math.sin(targetAngle);
    const targetMarkerInnerX = centerX + (radius - 15) * Math.cos(targetAngle);
    const targetMarkerInnerY = centerY + (radius - 15) * Math.sin(targetAngle);
    
    // Generate the arc path for the gauge background
    const arcPath = `M ${centerX + radius * Math.cos(startAngle)} ${centerY + radius * Math.sin(startAngle)} 
    A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(endAngle)} ${centerY + radius * Math.sin(endAngle)}`;
    
    // Define colors and segments
    const lowColor = '#F44336'; // Red
    const mediumColor = '#FFC107'; // Amber
    const goodColor = '#4CAF50'; // Green
    const highColor = '#2196F3'; // Blue
    
    // Define segment colors and their range
    const segments = [
      { color: lowColor, endRatio: 0.25 }, // 0.0 - 0.5 test-to-code is low
      { color: mediumColor, endRatio: 0.5 }, // 0.5 - 1.0 test-to-code is medium
      { color: goodColor, endRatio: 0.75 }, // 1.0 - 1.5a test-to-code is good
      { color: highColor, endRatio: 1.0 } // 1.5 - 2.0 test-to-code is high
    ];
    
    // Generate segment arcs
    const segmentArcs = [];
    let segmentStartAngle = startAngle;
    
    for (const segment of segments) {
      const segmentEndAngle = startAngle + (segment.endRatio * angleRange);
      const segmentPath = `M ${centerX + radius * Math.cos(segmentStartAngle)} ${centerY + radius * Math.sin(segmentStartAngle)} 
      A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(segmentEndAngle)} ${centerY + radius * Math.sin(segmentEndAngle)}`;
      
      segmentArcs.push({
        path: segmentPath,
        color: segment.color
      });
      
      segmentStartAngle = segmentEndAngle;
    }
    
    // Generate tick marks
    const ticks = [];
    const tickCount = 9; // 0.0, 0.25, 0.5, ..., 2.0
    
    for (let i = 0; i < tickCount; i++) {
      const tickRatio = i / (tickCount - 1);
      const tickAngle = startAngle + (tickRatio * angleRange);
      const tickOuterX = centerX + (radius + 5) * Math.cos(tickAngle);
      const tickOuterY = centerY + (radius + 5) * Math.sin(tickAngle);
      const tickInnerX = centerX + (radius - 5) * Math.cos(tickAngle);
      const tickInnerY = centerY + (radius - 5) * Math.sin(tickAngle);
      
      const tickLabelX = centerX + (radius + 20) * Math.cos(tickAngle);
      const tickLabelY = centerY + (radius + 20) * Math.sin(tickAngle);
      
      const tickValue = (tickRatio * 2).toFixed(1);
      
      ticks.push({
        outerX: tickOuterX,
        outerY: tickOuterY,
        innerX: tickInnerX,
        innerY: tickInnerY,
        labelX: tickLabelX,
        labelY: tickLabelY,
        value: tickValue
      });
    }
    
    // Generate SVG content
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .arc { fill: none; stroke-width: 20; }
    .needle { fill: #E91E63; stroke: #C2185B; stroke-width: 2; }
    .needle-center { fill: #C2185B; stroke: none; }
    .tick { stroke: #666; stroke-width: 2; }
    .tick-label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; text-anchor: middle; }
    .value-display { font-family: Arial, sans-serif; font-size: 24px; fill: #333; text-anchor: middle; }
    .title { font-family: Arial, sans-serif; font-size: 18px; fill: #333; text-anchor: middle; }
    .target-marker { stroke: #FF5722; stroke-width: 3; stroke-dasharray: 3,3; }
    .target-label { font-family: Arial, sans-serif; font-size: 12px; fill: #FF5722; font-weight: bold; }
  </style>
  
  <title>Test-to-Code Ratio</title>
  
  <text x="${centerX}" y="30" class="title">Test-to-Code Ratio</text>`;
    
    // Add segment arcs
    for (const segment of segmentArcs) {
      svg += `
  <path d="${segment.path}" class="arc" stroke="${segment.color}" />`;
    }
    
    // Add tick marks
    for (const tick of ticks) {
      svg += `
  <line x1="${tick.outerX}" y1="${tick.outerY}" x2="${tick.innerX}" y2="${tick.innerY}" class="tick" />
  <text x="${tick.labelX}" y="${tick.labelY}" dy="0.3em" class="tick-label">${tick.value}</text>`;
    }
    
    // Add target marker
    svg += `
  <line x1="${targetMarkerOuterX}" y1="${targetMarkerOuterY}" x2="${targetMarkerInnerX}" y2="${targetMarkerInnerY}" class="target-marker" />
  <text x="${targetMarkerOuterX + 5 * Math.cos(targetAngle + Math.PI/2)}" y="${targetMarkerOuterY + 5 * Math.sin(targetAngle + Math.PI/2)}" class="target-label">Target: ${target.toFixed(1)}</text>`;
    
    // Add needle
    svg += `
  <path d="M ${centerX - 5 * Math.cos(needleAngle + Math.PI/2)} ${centerY - 5 * Math.sin(needleAngle + Math.PI/2)} 
    L ${needleX} ${needleY} 
    L ${centerX + 5 * Math.cos(needleAngle + Math.PI/2)} ${centerY + 5 * Math.sin(needleAngle + Math.PI/2)} Z" class="needle" />
  <circle cx="${centerX}" cy="${centerY}" r="10" class="needle-center" />`;
    
    // Add value display
    svg += `
  <text x="${centerX}" y="${centerY + 40}" class="value-display">${testToCodeRatio.toFixed(2)}</text>`;
    
    svg += `
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate Test Quality Radar SVG
   */
  private static generateTestQualityRadarSvg(
    report: TestMetricsReport,
    coverageData: CoverageData
  ): string {
    // Extract quality metrics
    const metrics = [
      {
        name: 'Test-to-Code Ratio',
        value: report.qualityMetrics.testToCodeRatio.value,
        target: report.qualityMetrics.testToCodeRatio.target || 0.7,
        maxValue: 2.0
      }
    ];
    
    if (report.qualityMetrics.setupToAssertionRatio) {
      metrics.push({
        name: 'Setup-to-Assertion Ratio',
        value: report.qualityMetrics.setupToAssertionRatio.value,
        target: report.qualityMetrics.setupToAssertionRatio.target || 2.0,
        maxValue: 5.0
      });
    }
    
    if (report.qualityMetrics.testComplexity) {
      metrics.push({
        name: 'Test Complexity',
        value: report.qualityMetrics.testComplexity.value,
        target: report.qualityMetrics.testComplexity.target || 3.0,
        maxValue: 10.0
      });
    }
    
    if (report.qualityMetrics.testIsolation) {
      metrics.push({
        name: 'Test Isolation',
        value: report.qualityMetrics.testIsolation.value / 100, // Convert percentage to 0-1
        target: (report.qualityMetrics.testIsolation.target || 90) / 100,
        maxValue: 1.0
      });
    }
    
    if (report.qualityMetrics.averageTestExecutionTime) {
      metrics.push({
        name: 'Execution Time',
        value: Math.min(report.qualityMetrics.averageTestExecutionTime.value / 1000, 1.0), // Convert ms to seconds, cap at 1s
        target: (report.qualityMetrics.averageTestExecutionTime.target || 500) / 1000,
        maxValue: 1.0
      });
    }
    
    // Radar chart dimensions
    const width = 500;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;
    
    // Calculate points for each metric
    const metricCount = metrics.length;
    const points = [];
    const targetPoints = [];
    const axisPoints = [];
    
    for (let i = 0; i < metricCount; i++) {
      const angle = (i / metricCount) * 2 * Math.PI - Math.PI / 2;
      const metric = metrics[i];
      
      // Normalize value between 0 and 1 based on maxValue
      const normalizedValue = Math.min(Math.max(metric.value / metric.maxValue, 0), 1);
      const normalizedTarget = Math.min(Math.max(metric.target / metric.maxValue, 0), 1);
      
      // Calculate point for current value
      const x = centerX + radius * normalizedValue * Math.cos(angle);
      const y = centerY + radius * normalizedValue * Math.sin(angle);
      points.push({ x, y });
      
      // Calculate point for target value
      const targetX = centerX + radius * normalizedTarget * Math.cos(angle);
      const targetY = centerY + radius * normalizedTarget * Math.sin(angle);
      targetPoints.push({ x: targetX, y: targetY });
      
      // Calculate point for axis
      const axisX = centerX + radius * Math.cos(angle);
      const axisY = centerY + radius * Math.sin(angle);
      axisPoints.push({ x: axisX, y: axisY, angle, name: metric.name });
    }
    
    // Generate SVG content
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .axis { stroke: #ccc; stroke-width: 1; }
    .ring { fill: none; stroke: #eee; stroke-width: 1; stroke-dasharray: 3,3; }
    .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
    .value-polygon { fill: rgba(33, 150, 243, 0.3); stroke: rgba(33, 150, 243, 0.8); stroke-width: 2; }
    .target-polygon { fill: none; stroke: rgba(255, 87, 34, 0.8); stroke-width: 2; stroke-dasharray: 5,5; }
    .title { font-family: Arial, sans-serif; font-size: 18px; fill: #333; text-anchor: middle; }
  </style>
  
  <title>Test Quality Metrics</title>
  
  <text x="${centerX}" y="30" class="title">Test Quality Metrics</text>`;
    
    // Add concentric rings at 25%, 50%, 75%, 100%
    for (let i = 1; i <= 4; i++) {
      const ringRadius = radius * (i / 4);
      svg += `
  <circle cx="${centerX}" cy="${centerY}" r="${ringRadius}" class="ring" />`;
    }
    
    // Add axes
    for (let i = 0; i < metricCount; i++) {
      const { x, y } = axisPoints[i];
      svg += `
  <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" class="axis" />`;
    }
    
    // Add value polygon
    let pathData = '';
    for (let i = 0; i < metricCount; i++) {
      const { x, y } = points[i];
      if (i === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    }
    pathData += ' Z'; // Close the path
    
    svg += `
  <path d="${pathData}" class="value-polygon" />`;
    
    // Add target polygon
    let targetPathData = '';
    for (let i = 0; i < metricCount; i++) {
      const { x, y } = targetPoints[i];
      if (i === 0) {
        targetPathData += `M ${x} ${y}`;
      } else {
        targetPathData += ` L ${x} ${y}`;
      }
    }
    targetPathData += ' Z'; // Close the path
    
    svg += `
  <path d="${targetPathData}" class="target-polygon" />`;
    
    // Add metric labels
    for (let i = 0; i < metricCount; i++) {
      const { x, y, angle, name } = axisPoints[i];
      
      // Position label beyond the axis point
      const labelDistance = 20; // Distance beyond the axis end
      const labelX = centerX + (radius + labelDistance) * Math.cos(angle);
      const labelY = centerY + (radius + labelDistance) * Math.sin(angle);
      
      // Adjust text-anchor based on position around the circle
      let textAnchor = 'middle';
      if (angle < -Math.PI * 0.25 || angle > Math.PI * 0.25) {
        textAnchor = 'start';
      } else if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) {
        textAnchor = 'end';
      }
      
      svg += `
  <text x="${labelX}" y="${labelY}" class="label" text-anchor="${textAnchor}">${name}</text>`;
    }
    
    svg += `
</svg>`;
    
    return svg;
  }
  
  /**
   * Generate CSV data for further analysis
   */
  private static generateCsvData(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: QualityVisualizationOptions
  ): void {
    const csvPath = path.join(options.outputDir, 'quality-metrics.csv');
    
    // Create CSV content with quality metrics
    let csvContent = 'Metric,Value,Target\n';
    
    // Add test-to-code ratio
    csvContent += `Test-to-Code Ratio,${report.qualityMetrics.testToCodeRatio.value},${report.qualityMetrics.testToCodeRatio.target || ''}\n`;
    
    // Add setup-to-assertion ratio if available
    if (report.qualityMetrics.setupToAssertionRatio) {
      csvContent += `Setup-to-Assertion Ratio,${report.qualityMetrics.setupToAssertionRatio.value},${report.qualityMetrics.setupToAssertionRatio.target || ''}\n`;
    }
    
    // Add test complexity if available
    if (report.qualityMetrics.testComplexity) {
      csvContent += `Test Complexity,${report.qualityMetrics.testComplexity.value},${report.qualityMetrics.testComplexity.target || ''}\n`;
    }
    
    // Add average test execution time if available
    if (report.qualityMetrics.averageTestExecutionTime) {
      csvContent += `Average Test Execution Time (ms),${report.qualityMetrics.averageTestExecutionTime.value},${report.qualityMetrics.averageTestExecutionTime.target || ''}\n`;
    }
    
    // Add test isolation if available
    if (report.qualityMetrics.testIsolation) {
      csvContent += `Test Isolation (%),${report.qualityMetrics.testIsolation.value},${report.qualityMetrics.testIsolation.target || ''}\n`;
    }
    
    // Add distribution metrics
    csvContent += '\nTest Distribution by Type\n';
    csvContent += 'Type,Count,Percentage\n';
    
    const percentageByType = report.distributionMetrics.getTestPercentageByType();
    Object.entries(report.distributionMetrics.testCountByType).forEach(([type, count]) => {
      const percentage = percentageByType[type as TestType] || 0;
      csvContent += `${type},${count},${percentage.toFixed(2)}\n`;
    });
    
    csvContent += '\nTest Distribution by Layer\n';
    csvContent += 'Layer,Count,Percentage\n';
    
    const percentageByLayer = report.distributionMetrics.getTestPercentageByLayer();
    Object.entries(report.distributionMetrics.testCountByLayer).forEach(([layer, count]) => {
      const percentage = percentageByLayer[layer as ArchitecturalLayer] || 0;
      csvContent += `${layer},${count},${percentage.toFixed(2)}\n`;
    });
    
    // Write CSV file
    fs.writeFileSync(csvPath, csvContent);
  }
  
  /**
   * Generate HTML report with interactive visualizations
   */
  private static generateHtmlReport(
    report: TestMetricsReport,
    coverageData: CoverageData,
    options: QualityVisualizationOptions
  ): void {
    const htmlPath = path.join(options.outputDir, 'quality-metrics-dashboard.html');
    
    // Extract test quality metrics
    const qualityMetrics = report.qualityMetrics;
    
    // Test distribution data
    const testCountByType = Object.entries(report.distributionMetrics.testCountByType)
      .map(([type, count]) => ({ type, count }));
    
    const testCountByLayer = Object.entries(report.distributionMetrics.testCountByLayer)
      .map(([layer, count]) => ({ layer, count }));
    
    // Process test files for metrics by language
    const testFilesByLanguage = {
      [LanguageType.TYPESCRIPT]: coverageData.testFiles.filter(f => f.language === LanguageType.TYPESCRIPT),
      [LanguageType.PYTHON]: coverageData.testFiles.filter(f => f.language === LanguageType.PYTHON),
      [LanguageType.GO]: coverageData.testFiles.filter(f => f.language === LanguageType.GO)
    };
    
    // Calculate language-specific metrics
    const languageMetrics = Object.entries(testFilesByLanguage).map(([language, files]) => {
      const testCount = files.reduce((sum, file) => sum + file.testCases.length, 0);
      const assertionCount = files.reduce((sum, file) => 
        sum + file.testCases.reduce((total, tc) => total + (tc.assertions || 0), 0), 0);
      const skippedCount = files.reduce((sum, file) => 
        sum + file.testCases.filter(tc => tc.skipped).length, 0);
      
      return {
        language,
        files: files.length,
        testCount,
        assertionCount,
        skippedCount,
        testToFileRatio: files.length > 0 ? (testCount / files.length).toFixed(2) : 'N/A',
        assertionToTestRatio: testCount > 0 ? (assertionCount / testCount).toFixed(2) : 'N/A',
        skippedPercentage: testCount > 0 ? ((skippedCount / testCount) * 100).toFixed(1) + '%' : 'N/A'
      };
    });
    
    // Calculate layer-specific metrics
    const sourceFilesByLayer = Object.values(ArchitecturalLayer).reduce((acc, layer) => {
      acc[layer] = coverageData.sourceFiles.filter(f => f.layer === layer);
      return acc;
    }, {} as Record<string, any[]>);
    
    const testFilesByLayer = Object.values(ArchitecturalLayer).reduce((acc, layer) => {
      acc[layer] = coverageData.testFiles.filter(f => f.layer === layer);
      return acc;
    }, {} as Record<string, any[]>);
    
    const layerMetrics = Object.values(ArchitecturalLayer).map(layer => {
      const sourceFiles = sourceFilesByLayer[layer] || [];
      const testFiles = testFilesByLayer[layer] || [];
      const sourceCount = sourceFiles.length;
      const testCount = testFiles.length;
      const testCaseCount = testFiles.reduce((sum, file) => sum + file.testCases.length, 0);
      
      return {
        layer,
        sourceCount,
        testCount,
        testCaseCount,
        testToSourceRatio: sourceCount > 0 ? (testCount / sourceCount).toFixed(2) : 'N/A',
        testCaseToSourceRatio: sourceCount > 0 ? (testCaseCount / sourceCount).toFixed(2) : 'N/A'
      };
    }).filter(m => m.sourceCount > 0 || m.testCount > 0); // Filter out empty layers
    
    // HTML content with interactive charts
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Quality Metrics Dashboard - ${report.projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-gauge@0.3.0/dist/chartjs-gauge.min.js"></script>
  
  <style>
    :root {
      --primary-color: #1976D2;
      --primary-dark: #0D47A1;
      --primary-light: #BBDEFB;
      --secondary-color: #FF5722;
      --success-color: #4CAF50;
      --warning-color: #FFC107;
      --danger-color: #F44336;
      --info-color: #2196F3;
      --text-color: #212121;
      --text-secondary: #757575;
      --border-color: #E0E0E0;
      --background-light: #F5F5F5;
      --chart-background: ${options.darkMode ? '#212121' : '#FFFFFF'};
      --chart-text: ${options.darkMode ? '#FFFFFF' : '#212121'};
      --chart-grid: ${options.darkMode ? '#424242' : '#E0E0E0'};
      --body-background: ${options.darkMode ? '#121212' : '#FAFAFA'};
      --card-background: ${options.darkMode ? '#1E1E1E' : '#FFFFFF'};
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--body-background);
      color: var(--text-color);
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
    
    .dashboard-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .metric-card {
      background-color: var(--card-background);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 300;
      margin: 1rem 0;
    }
    
    .metric-name {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }
    
    .metric-status {
      font-size: 0.9rem;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      background-color: var(--success-color);
      color: white;
    }
    
    .metric-status.warning {
      background-color: var(--warning-color);
    }
    
    .metric-status.danger {
      background-color: var(--danger-color);
    }
    
    .chart-container {
      background-color: var(--card-background);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 1.5rem;
      margin-bottom: 2rem;
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
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      background-color: var(--card-background);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .data-table th,
    .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    
    .data-table th {
      font-weight: 500;
      background-color: var(--primary-color);
      color: white;
    }
    
    .data-table tr:nth-child(even) {
      background-color: var(--background-light);
    }
    
    .data-table tr:hover {
      background-color: var(--primary-light);
    }
    
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 2rem;
      border-top: 1px solid var(--border-color);
    }
    
    .gauge-container {
      position: relative;
      height: 200px;
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
    
    .hide {
      display: none;
    }
    
    @media (max-width: 768px) {
      .col {
        flex: 100%;
      }
      
      .dashboard-summary {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Test Quality Metrics Dashboard</h1>
    <p>${report.projectName} - Generated on ${new Date().toLocaleString()}</p>
  </header>
  
  <div class="container">
    <h2>Quality Summary</h2>
    
    <div class="dashboard-summary">
      <div class="metric-card">
        <div class="metric-name">Test-to-Code Ratio</div>
        <div class="metric-value">${qualityMetrics.testToCodeRatio.value.toFixed(2)}</div>
        <div class="metric-status ${qualityMetrics.testToCodeRatio.meetsTarget() ? '' : 'warning'}">
          ${qualityMetrics.testToCodeRatio.meetsTarget() ? 'Meets Target' : `Target: ${qualityMetrics.testToCodeRatio.target}`}
        </div>
      </div>
      
      ${qualityMetrics.setupToAssertionRatio ? `
      <div class="metric-card">
        <div class="metric-name">Setup-to-Assertion Ratio</div>
        <div class="metric-value">${qualityMetrics.setupToAssertionRatio.value.toFixed(2)}</div>
        <div class="metric-status ${qualityMetrics.setupToAssertionRatio.meetsTarget() ? '' : 'warning'}">
          ${qualityMetrics.setupToAssertionRatio.meetsTarget() ? 'Meets Target' : `Target: ${qualityMetrics.setupToAssertionRatio.target}`}
        </div>
      </div>
      ` : ''}
      
      ${qualityMetrics.testComplexity ? `
      <div class="metric-card">
        <div class="metric-name">Test Complexity</div>
        <div class="metric-value">${qualityMetrics.testComplexity.value.toFixed(2)}</div>
        <div class="metric-status ${qualityMetrics.testComplexity.meetsTarget() ? '' : 'warning'}">
          ${qualityMetrics.testComplexity.meetsTarget() ? 'Meets Target' : `Target: ${qualityMetrics.testComplexity.target}`}
        </div>
      </div>
      ` : ''}
      
      ${qualityMetrics.testIsolation ? `
      <div class="metric-card">
        <div class="metric-name">Test Isolation</div>
        <div class="metric-value">${qualityMetrics.testIsolation.value.toFixed(1)}%</div>
        <div class="metric-status ${qualityMetrics.testIsolation.meetsTarget() ? '' : 'warning'}">
          ${qualityMetrics.testIsolation.meetsTarget() ? 'Meets Target' : `Target: ${qualityMetrics.testIsolation.target}%`}
        </div>
      </div>
      ` : ''}
      
      ${qualityMetrics.averageTestExecutionTime ? `
      <div class="metric-card">
        <div class="metric-name">Avg. Execution Time</div>
        <div class="metric-value">${qualityMetrics.averageTestExecutionTime.value.toFixed(0)} ms</div>
        <div class="metric-status ${qualityMetrics.averageTestExecutionTime.meetsTarget() ? '' : 'warning'}">
          ${qualityMetrics.averageTestExecutionTime.meetsTarget() ? 'Meets Target' : `Target: ${qualityMetrics.averageTestExecutionTime.target} ms`}
        </div>
      </div>
      ` : ''}
      
      <div class="metric-card">
        <div class="metric-name">Total Tests</div>
        <div class="metric-value">${report.distributionMetrics.getTotalTests()}</div>
        <div class="metric-status">
          ${coverageData.testFiles.length} Test Files
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col">
        <h2>Test-to-Code Ratio</h2>
        <div class="chart-container">
          <div class="gauge-container">
            <canvas id="testToCodeGauge"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col">
        <h2>Quality Radar</h2>
        <div class="chart-container">
          <canvas id="qualityRadarChart"></canvas>
        </div>
      </div>
    </div>
    
    <h2>Test Distribution</h2>
    
    <div class="row">
      <div class="col">
        <div class="chart-container">
          <canvas id="testTypeChart"></canvas>
        </div>
      </div>
      
      <div class="col">
        <div class="chart-container">
          <canvas id="testLayerChart"></canvas>
        </div>
      </div>
    </div>
    
    <h2>Language-Specific Metrics</h2>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Language</th>
          <th>Test Files</th>
          <th>Test Cases</th>
          <th>Assertions</th>
          <th>Skipped</th>
          <th>Tests/File</th>
          <th>Assertions/Test</th>
          <th>Skipped %</th>
        </tr>
      </thead>
      <tbody>
        ${languageMetrics.map(m => `
        <tr>
          <td>${m.language}</td>
          <td>${m.files}</td>
          <td>${m.testCount}</td>
          <td>${m.assertionCount}</td>
          <td>${m.skippedCount}</td>
          <td>${m.testToFileRatio}</td>
          <td>${m.assertionToTestRatio}</td>
          <td>${m.skippedPercentage}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <h2>Architectural Layer Metrics</h2>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Layer</th>
          <th>Source Files</th>
          <th>Test Files</th>
          <th>Test Cases</th>
          <th>Test/Source Ratio</th>
          <th>Test Cases/Source Ratio</th>
        </tr>
      </thead>
      <tbody>
        ${layerMetrics.map(m => `
        <tr>
          <td>${m.layer}</td>
          <td>${m.sourceCount}</td>
          <td>${m.testCount}</td>
          <td>${m.testCaseCount}</td>
          <td>${m.testToSourceRatio}</td>
          <td>${m.testCaseToSourceRatio}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="chart-container">
      <canvas id="layerComparisonChart"></canvas>
    </div>
    
    ${options.includeTrendAnalysis ? `
    <h2>Trend Analysis</h2>
    
    <div class="chart-container">
      <canvas id="trendChart"></canvas>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    TDD Metrics Tool - Generated on ${new Date().toISOString()}
  </div>
  
  <script>
    // Chart configuration
    Chart.defaults.color = '${options.darkMode ? '#FFFFFF' : '#212121'}';
    Chart.defaults.borderColor = '${options.darkMode ? '#424242' : '#E0E0E0'}';
    
    // Define colors
    const typeColors = {
      'unit': '#4CAF50',
      'integration': '#2196F3',
      'e2e': '#9C27B0',
      'acceptance': '#FF9800',
      'performance': '#F44336',
      'contract': '#607D8B'
    };
    
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
    
    // Test type distribution chart
    const testTypeData = ${JSON.stringify(testCountByType)};
    const testTypeCtx = document.getElementById('testTypeChart').getContext('2d');
    const testTypeChart = new Chart(testTypeCtx, {
      type: 'pie',
      data: {
        labels: testTypeData.map(d => d.type),
        datasets: [{
          data: testTypeData.map(d => d.count),
          backgroundColor: testTypeData.map(d => typeColors[d.type] || '#999'),
          borderColor: '${options.darkMode ? '#121212' : 'white'}',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Tests by Type',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    // Test layer distribution chart
    const testLayerData = ${JSON.stringify(testCountByLayer)};
    const testLayerCtx = document.getElementById('testLayerChart').getContext('2d');
    const testLayerChart = new Chart(testLayerCtx, {
      type: 'pie',
      data: {
        labels: testLayerData.map(d => d.layer),
        datasets: [{
          data: testLayerData.map(d => d.count),
          backgroundColor: testLayerData.map(d => layerColors[d.layer] || '#999'),
          borderColor: '${options.darkMode ? '#121212' : 'white'}',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Tests by Architectural Layer',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    // Test-to-Code Ratio gauge
    const testToCodeRatio = ${qualityMetrics.testToCodeRatio.value};
    const testToCodeTarget = ${qualityMetrics.testToCodeRatio.target || 0.7};
    const gaugeCtx = document.getElementById('testToCodeGauge').getContext('2d');
    
    const gaugeConfig = {
      type: 'gauge',
      data: {
        datasets: [{
          value: testToCodeRatio,
          data: [0.3, 0.7, 1.2, 2.0],
          backgroundColor: ['#F44336', '#FFC107', '#4CAF50', '#2196F3'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        title: {
          display: true,
          text: 'Test-to-Code Ratio'
        },
        layout: {
          padding: {
            bottom: 30
          }
        },
        needle: {
          radiusPercentage: 2,
          widthPercentage: 3.2,
          lengthPercentage: 80,
          color: '#E91E63'
        },
        valueLabel: {
          formatter: function(value) {
            return value.toFixed(2);
          },
          color: '${options.darkMode ? '#FFFFFF' : '#212121'}',
          fontSize: 20,
          backgroundColor: 'rgba(0,0,0,0)'
        },
        plugins: {
          datalabels: {
            formatter: function(value, context) {
              switch(context.dataIndex) {
                case 0:
                  return 'Low';
                case 1:
                  return 'Medium';
                case 2:
                  return 'Good';
                case 3:
                  return 'High';
              }
            },
            color: '#fff',
            font: {
              weight: 'bold'
            }
          }
        }
      }
    };
    
    const gaugeChart = new Chart(gaugeCtx, gaugeConfig);
    
    // Quality radar chart
    const qualityMetrics = [
      ${qualityMetrics.testToCodeRatio ? 
        `{
          name: 'Test-to-Code Ratio',
          value: ${qualityMetrics.testToCodeRatio.value},
          target: ${qualityMetrics.testToCodeRatio.target || 0.7},
          maxValue: 2.0
        },` : ''}
      ${qualityMetrics.setupToAssertionRatio ? 
        `{
          name: 'Setup-to-Assertion',
          value: ${qualityMetrics.setupToAssertionRatio.value},
          target: ${qualityMetrics.setupToAssertionRatio.target || 2.0},
          maxValue: 5.0
        },` : ''}
      ${qualityMetrics.testComplexity ? 
        `{
          name: 'Test Complexity',
          value: ${qualityMetrics.testComplexity.value},
          target: ${qualityMetrics.testComplexity.target || 3.0},
          maxValue: 10.0
        },` : ''}
      ${qualityMetrics.testIsolation ? 
        `{
          name: 'Test Isolation',
          value: ${qualityMetrics.testIsolation.value / 100},
          target: ${(qualityMetrics.testIsolation.target || 90) / 100},
          maxValue: 1.0
        },` : ''}
      ${qualityMetrics.averageTestExecutionTime ? 
        `{
          name: 'Execution Speed',
          value: ${1 - Math.min(qualityMetrics.averageTestExecutionTime.value / 1000, 1.0)},
          target: ${1 - (qualityMetrics.averageTestExecutionTime.target || 500) / 1000},
          maxValue: 1.0
        }` : ''}
    ];
    
    const radarCtx = document.getElementById('qualityRadarChart').getContext('2d');
    const radarChart = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: qualityMetrics.map(m => m.name),
        datasets: [
          {
            label: 'Current',
            data: qualityMetrics.map(m => (m.value / m.maxValue) * 100),
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderColor: 'rgb(33, 150, 243)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(33, 150, 243)'
          },
          {
            label: 'Target',
            data: qualityMetrics.map(m => (m.target / m.maxValue) * 100),
            backgroundColor: 'rgba(255, 87, 34, 0.1)',
            borderColor: 'rgb(255, 87, 34)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: 'rgb(255, 87, 34)'
          }
        ]
      },
      options: {
        scales: {
          r: {
            angleLines: {
              color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
            },
            grid: {
              color: '${options.darkMode ? '#424242' : '#E0E0E0'}'
            },
            pointLabels: {
              color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
            },
            ticks: {
              stepSize: 20,
              backdropColor: 'transparent'
            },
            min: 0,
            max: 100,
            
          }
        },
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Quality Metrics Radar',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    // Layer comparison chart
    const layerData = ${JSON.stringify(layerMetrics)};
    const layerComparisonCtx = document.getElementById('layerComparisonChart').getContext('2d');
    const layerComparisonChart = new Chart(layerComparisonCtx, {
      type: 'bar',
      data: {
        labels: layerData.map(d => d.layer),
        datasets: [
          {
            label: 'Source Files',
            data: layerData.map(d => d.sourceCount),
            backgroundColor: '#2196F3',
            borderColor: '#1976D2',
            borderWidth: 1
          },
          {
            label: 'Test Files',
            data: layerData.map(d => d.testCount),
            backgroundColor: '#4CAF50',
            borderColor: '#388E3C',
            borderWidth: 1
          },
          {
            label: 'Test Cases',
            data: layerData.map(d => d.testCaseCount),
            backgroundColor: '#9C27B0',
            borderColor: '#7B1FA2',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count',
              color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Source Files vs. Test Files by Layer',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    ${options.includeTrendAnalysis ? `
    // Trend chart (placeholder - would use historical data)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Test-to-Code Ratio',
            data: [0.5, 0.55, 0.6, 0.65, 0.7, 0.75],
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Test Isolation',
            data: [70, 75, 78, 80, 85, 88],
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Value',
              color: '${options.darkMode ? '#FFFFFF' : '#212121'}'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Quality Metrics Over Time',
            font: {
              size: 16
            }
          }
        }
      }
    });
    ` : ''}
  </script>
</body>
</html>`;
    
    // Write the HTML file
    fs.writeFileSync(htmlPath, htmlContent);
  }
}