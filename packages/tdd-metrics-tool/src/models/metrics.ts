/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ArchitecturalLayer, TestType } from './types';

/**
 * Base class for all metrics
 */
export abstract class Metric {
  name: string;
  description: string;
  value: any;
  timestamp: Date;
  
  constructor(name: string, description: string, value: any) {
    this.name = name;
    this.description = description;
    this.value = value;
    this.timestamp = new Date();
  }
  
  abstract toString(): string;
}

/**
 * Represents a numeric metric with a value and optional thresholds
 */
export class NumericMetric extends Metric {
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
  
  constructor(
    name: string, 
    description: string, 
    value: number,
    options?: {
      min?: number;
      max?: number;
      target?: number;
      unit?: string;
    }
  ) {
    super(name, description, value);
    this.min = options?.min;
    this.max = options?.max;
    this.target = options?.target;
    this.unit = options?.unit;
  }
  
  /**
   * Check if this metric meets the target threshold
   */
  meetsTarget(): boolean {
    if (this.target === undefined) return true;
    return this.value >= this.target;
  }
  
  /**
   * Check if this metric is within acceptable range
   */
  isInRange(): boolean {
    let inRange = true;
    
    if (this.min !== undefined) {
      inRange = inRange && this.value >= this.min;
    }
    
    if (this.max !== undefined) {
      inRange = inRange && this.value <= this.max;
    }
    
    return inRange;
  }
  
  /**
   * Format the metric value with unit if available
   */
  formattedValue(): string {
    if (this.unit) {
      return `${this.value}${this.unit}`;
    }
    return this.value.toString();
  }
  
  toString(): string {
    return `${this.name}: ${this.formattedValue()}`;
  }
}

/**
 * Represents a percentage metric (0-100%)
 */
export class PercentageMetric extends NumericMetric {
  constructor(
    name: string,
    description: string,
    value: number,
    options?: {
      target?: number;
    }
  ) {
    super(name, description, value, {
      min: 0,
      max: 100,
      unit: '%',
      target: options?.target
    });
  }
  
  /**
   * Format the percentage value
   */
  formattedValue(): string {
    return `${this.value.toFixed(2)}%`;
  }
}

/**
 * Coverage metrics for a specific scope (file, directory, layer, etc.)
 */
export class CoverageMetrics {
  lineCoverage: PercentageMetric;
  functionCoverage: PercentageMetric;
  branchCoverage?: PercentageMetric;
  statementCoverage?: PercentageMetric;
  
  constructor(
    scope: string,
    metrics: {
      lineCoverage: number;
      functionCoverage: number;
      branchCoverage?: number;
      statementCoverage?: number;
    },
    thresholds?: {
      lineCoverage?: number;
      functionCoverage?: number;
      branchCoverage?: number;
      statementCoverage?: number;
    }
  ) {
    this.lineCoverage = new PercentageMetric(
      `${scope} Line Coverage`,
      `Percentage of lines covered by tests in ${scope}`,
      metrics.lineCoverage,
      { target: thresholds?.lineCoverage }
    );
    
    this.functionCoverage = new PercentageMetric(
      `${scope} Function Coverage`,
      `Percentage of functions covered by tests in ${scope}`,
      metrics.functionCoverage,
      { target: thresholds?.functionCoverage }
    );
    
    if (metrics.branchCoverage !== undefined) {
      this.branchCoverage = new PercentageMetric(
        `${scope} Branch Coverage`,
        `Percentage of branches covered by tests in ${scope}`,
        metrics.branchCoverage,
        { target: thresholds?.branchCoverage }
      );
    }
    
    if (metrics.statementCoverage !== undefined) {
      this.statementCoverage = new PercentageMetric(
        `${scope} Statement Coverage`,
        `Percentage of statements covered by tests in ${scope}`,
        metrics.statementCoverage,
        { target: thresholds?.statementCoverage }
      );
    }
  }
  
  /**
   * Check if all coverage metrics meet their targets
   */
  meetsTargets(): boolean {
    let result = this.lineCoverage.meetsTarget() && this.functionCoverage.meetsTarget();
    
    if (this.branchCoverage && !this.branchCoverage.meetsTarget()) {
      result = false;
    }
    
    if (this.statementCoverage && !this.statementCoverage.meetsTarget()) {
      result = false;
    }
    
    return result;
  }
}

/**
 * Test quality metrics
 */
export class TestQualityMetrics {
  testToCodeRatio: NumericMetric;
  setupToAssertionRatio?: NumericMetric;
  testComplexity?: NumericMetric;
  averageTestExecutionTime?: NumericMetric;
  testIsolation?: PercentageMetric;
  
  constructor(
    metrics: {
      testToCodeRatio: number;
      setupToAssertionRatio?: number;
      testComplexity?: number;
      averageTestExecutionTime?: number;
      testIsolation?: number;
    },
    thresholds?: {
      testToCodeRatio?: number;
      setupToAssertionRatio?: number;
      testComplexity?: number;
      averageTestExecutionTime?: number;
      testIsolation?: number;
    }
  ) {
    this.testToCodeRatio = new NumericMetric(
      'Test-to-Code Ratio',
      'Ratio of test code to production code',
      metrics.testToCodeRatio,
      { 
        min: 0,
        target: thresholds?.testToCodeRatio
      }
    );
    
    if (metrics.setupToAssertionRatio !== undefined) {
      this.setupToAssertionRatio = new NumericMetric(
        'Setup-to-Assertion Ratio',
        'Ratio of test setup code to assertion code',
        metrics.setupToAssertionRatio,
        {
          min: 0,
          target: thresholds?.setupToAssertionRatio
        }
      );
    }
    
    if (metrics.testComplexity !== undefined) {
      this.testComplexity = new NumericMetric(
        'Test Complexity',
        'Average cyclomatic complexity of test code',
        metrics.testComplexity,
        {
          min: 1,
          target: thresholds?.testComplexity
        }
      );
    }
    
    if (metrics.averageTestExecutionTime !== undefined) {
      this.averageTestExecutionTime = new NumericMetric(
        'Average Test Execution Time',
        'Average execution time of tests in milliseconds',
        metrics.averageTestExecutionTime,
        {
          min: 0,
          unit: 'ms',
          target: thresholds?.averageTestExecutionTime
        }
      );
    }
    
    if (metrics.testIsolation !== undefined) {
      this.testIsolation = new PercentageMetric(
        'Test Isolation',
        'Percentage of tests that are properly isolated',
        metrics.testIsolation,
        {
          target: thresholds?.testIsolation
        }
      );
    }
  }
  
  /**
   * Check if all quality metrics meet their targets
   */
  meetsTargets(): boolean {
    let result = this.testToCodeRatio.meetsTarget();
    
    if (this.setupToAssertionRatio && !this.setupToAssertionRatio.meetsTarget()) {
      result = false;
    }
    
    if (this.testComplexity && !this.testComplexity.meetsTarget()) {
      result = false;
    }
    
    if (this.averageTestExecutionTime && !this.averageTestExecutionTime.meetsTarget()) {
      result = false;
    }
    
    if (this.testIsolation && !this.testIsolation.meetsTarget()) {
      result = false;
    }
    
    return result;
  }
}

/**
 * Architectural boundary metrics
 */
export class ArchitecturalMetrics {
  dependencyDirectionViolations: NumericMetric;
  interfaceDependencyViolations: NumericMetric;
  layerIsolationViolations: NumericMetric;
  missingPortImplementations?: NumericMetric;
  architecturalCoverage: {
    [key in ArchitecturalLayer]?: CoverageMetrics;
  };
  
  constructor(
    violations: {
      dependencyDirection: number;
      interfaceDependency: number;
      layerIsolation: number;
      missingPortImplementations?: number;
    },
    coverage: {
      [key in ArchitecturalLayer]?: {
        lineCoverage: number;
        functionCoverage: number;
        branchCoverage?: number;
        statementCoverage?: number;
      };
    },
    thresholds?: {
      maxViolations?: number;
      layerCoverage?: {
        [key in ArchitecturalLayer]?: {
          lineCoverage?: number;
          functionCoverage?: number;
          branchCoverage?: number;
          statementCoverage?: number;
        };
      };
    }
  ) {
    this.dependencyDirectionViolations = new NumericMetric(
      'Dependency Direction Violations',
      'Number of violations of the dependency rule',
      violations.dependencyDirection,
      {
        min: 0,
        max: thresholds?.maxViolations || 0
      }
    );
    
    this.interfaceDependencyViolations = new NumericMetric(
      'Interface Dependency Violations',
      'Number of violations of the interface dependency principle',
      violations.interfaceDependency,
      {
        min: 0,
        max: thresholds?.maxViolations || 0
      }
    );
    
    this.layerIsolationViolations = new NumericMetric(
      'Layer Isolation Violations',
      'Number of violations of layer isolation',
      violations.layerIsolation,
      {
        min: 0,
        max: thresholds?.maxViolations || 0
      }
    );
    
    if (violations.missingPortImplementations !== undefined) {
      this.missingPortImplementations = new NumericMetric(
        'Missing Port Implementations',
        'Number of ports missing adapter implementations',
        violations.missingPortImplementations,
        {
          min: 0,
          max: thresholds?.maxViolations || 0
        }
      );
    }
    
    // Create coverage metrics for each layer
    this.architecturalCoverage = {};
    
    Object.entries(coverage).forEach(([layer, metrics]) => {
      const layerEnum = layer as ArchitecturalLayer;
      const layerThresholds = thresholds?.layerCoverage?.[layerEnum];
      
      this.architecturalCoverage[layerEnum] = new CoverageMetrics(
        `${layer} Layer`,
        metrics,
        layerThresholds
      );
    });
  }
  
  /**
   * Check if all architectural metrics meet their targets
   */
  meetsTargets(): boolean {
    let result = true;
    
    // Check violations
    if (!this.dependencyDirectionViolations.isInRange()) result = false;
    if (!this.interfaceDependencyViolations.isInRange()) result = false;
    if (!this.layerIsolationViolations.isInRange()) result = false;
    if (this.missingPortImplementations && !this.missingPortImplementations.isInRange()) result = false;
    
    // Check coverage for each layer
    Object.values(this.architecturalCoverage).forEach(coverage => {
      if (!coverage.meetsTargets()) result = false;
    });
    
    return result;
  }
}

/**
 * Test distribution metrics by type and layer
 */
export class TestDistributionMetrics {
  testCountByType: {
    [key in TestType]?: number;
  };
  
  testCountByLayer: {
    [key in ArchitecturalLayer]?: number;
  };
  
  constructor(
    testCountByType: { [key in TestType]?: number },
    testCountByLayer: { [key in ArchitecturalLayer]?: number }
  ) {
    this.testCountByType = testCountByType;
    this.testCountByLayer = testCountByLayer;
  }
  
  /**
   * Get the total number of tests
   */
  getTotalTests(): number {
    return Object.values(this.testCountByType).reduce((sum, count) => sum + count, 0);
  }
  
  /**
   * Get the percentage of tests by type
   */
  getTestPercentageByType(): { [key in TestType]?: number } {
    const total = this.getTotalTests();
    const result: { [key in TestType]?: number } = {};
    
    Object.entries(this.testCountByType).forEach(([type, count]) => {
      result[type as TestType] = (count / total) * 100;
    });
    
    return result;
  }
  
  /**
   * Get the percentage of tests by architectural layer
   */
  getTestPercentageByLayer(): { [key in ArchitecturalLayer]?: number } {
    const total = this.getTotalTests();
    const result: { [key in ArchitecturalLayer]?: number } = {};
    
    Object.entries(this.testCountByLayer).forEach(([layer, count]) => {
      result[layer as ArchitecturalLayer] = (count / total) * 100;
    });
    
    return result;
  }
}

/**
 * Complete test metrics report
 */
export class TestMetricsReport {
  timestamp: Date;
  projectName: string;
  overallCoverage: CoverageMetrics;
  qualityMetrics: TestQualityMetrics;
  architecturalMetrics: ArchitecturalMetrics;
  distributionMetrics: TestDistributionMetrics;
  
  constructor(
    projectName: string,
    overallCoverage: CoverageMetrics,
    qualityMetrics: TestQualityMetrics,
    architecturalMetrics: ArchitecturalMetrics,
    distributionMetrics: TestDistributionMetrics
  ) {
    this.timestamp = new Date();
    this.projectName = projectName;
    this.overallCoverage = overallCoverage;
    this.qualityMetrics = qualityMetrics;
    this.architecturalMetrics = architecturalMetrics;
    this.distributionMetrics = distributionMetrics;
  }
  
  /**
   * Check if all metrics meet their targets
   */
  meetsAllTargets(): boolean {
    return (
      this.overallCoverage.meetsTargets() &&
      this.qualityMetrics.meetsTargets() &&
      this.architecturalMetrics.meetsTargets()
    );
  }
  
  /**
   * Get a summary of the report
   */
  getSummary(): string {
    const meetsTargets = this.meetsAllTargets();
    const overallStatus = meetsTargets ? 'PASSED' : 'FAILED';
    
    return `
Test Metrics Report for ${this.projectName}
Generated: ${this.timestamp.toISOString()}
Overall Status: ${overallStatus}

Overall Coverage:
  Line Coverage: ${this.overallCoverage.lineCoverage.formattedValue()}
  Function Coverage: ${this.overallCoverage.functionCoverage.formattedValue()}
  ${this.overallCoverage.branchCoverage ? `Branch Coverage: ${this.overallCoverage.branchCoverage.formattedValue()}` : ''}
  ${this.overallCoverage.statementCoverage ? `Statement Coverage: ${this.overallCoverage.statementCoverage.formattedValue()}` : ''}

Quality Metrics:
  Test-to-Code Ratio: ${this.qualityMetrics.testToCodeRatio.formattedValue()}
  ${this.qualityMetrics.setupToAssertionRatio ? `Setup-to-Assertion Ratio: ${this.qualityMetrics.setupToAssertionRatio.formattedValue()}` : ''}
  ${this.qualityMetrics.testComplexity ? `Test Complexity: ${this.qualityMetrics.testComplexity.formattedValue()}` : ''}
  ${this.qualityMetrics.averageTestExecutionTime ? `Average Test Execution Time: ${this.qualityMetrics.averageTestExecutionTime.formattedValue()}` : ''}
  ${this.qualityMetrics.testIsolation ? `Test Isolation: ${this.qualityMetrics.testIsolation.formattedValue()}` : ''}

Architectural Metrics:
  Dependency Direction Violations: ${this.architecturalMetrics.dependencyDirectionViolations.value}
  Interface Dependency Violations: ${this.architecturalMetrics.interfaceDependencyViolations.value}
  Layer Isolation Violations: ${this.architecturalMetrics.layerIsolationViolations.value}
  ${this.architecturalMetrics.missingPortImplementations ? `Missing Port Implementations: ${this.architecturalMetrics.missingPortImplementations.value}` : ''}

Test Distribution:
  Total Tests: ${this.distributionMetrics.getTotalTests()}
  By Type: ${Object.entries(this.distributionMetrics.getTestPercentageByType())
    .map(([type, percentage]) => `${type}: ${percentage.toFixed(1)}%`)
    .join(', ')}
  By Layer: ${Object.entries(this.distributionMetrics.getTestPercentageByLayer())
    .map(([layer, percentage]) => `${layer}: ${percentage.toFixed(1)}%`)
    .join(', ')}
`.trim();
  }
  
  /**
   * Get a quality-focused summary of the report
   */
  getQualitySummary(): string {
    const meetsQualityTargets = this.qualityMetrics.meetsTargets();
    const qualityStatus = meetsQualityTargets ? 'PASSED' : 'FAILED';
    
    return `
Test Quality Dashboard for ${this.projectName}
Generated: ${this.timestamp.toISOString()}
Quality Status: ${qualityStatus}

Quality Metrics:
  Test-to-Code Ratio: ${this.qualityMetrics.testToCodeRatio.formattedValue()}${
    this.qualityMetrics.testToCodeRatio.target 
      ? ` (Target: ${this.qualityMetrics.testToCodeRatio.target})` : ''
  }${
    this.qualityMetrics.testToCodeRatio.meetsTarget() 
      ? ' ✓' : ' ✗'
  }
  ${this.qualityMetrics.setupToAssertionRatio ? 
    `Setup-to-Assertion Ratio: ${this.qualityMetrics.setupToAssertionRatio.formattedValue()}${
      this.qualityMetrics.setupToAssertionRatio.target 
        ? ` (Target: ${this.qualityMetrics.setupToAssertionRatio.target})` : ''
    }${
      this.qualityMetrics.setupToAssertionRatio.meetsTarget() 
        ? ' ✓' : ' ✗'
    }` : ''
  }
  ${this.qualityMetrics.testComplexity ? 
    `Test Complexity: ${this.qualityMetrics.testComplexity.formattedValue()}${
      this.qualityMetrics.testComplexity.target 
        ? ` (Target: ${this.qualityMetrics.testComplexity.target})` : ''
    }${
      this.qualityMetrics.testComplexity.meetsTarget() 
        ? ' ✓' : ' ✗'
    }` : ''
  }
  ${this.qualityMetrics.averageTestExecutionTime ? 
    `Average Test Execution Time: ${this.qualityMetrics.averageTestExecutionTime.formattedValue()}${
      this.qualityMetrics.averageTestExecutionTime.target 
        ? ` (Target: ${this.qualityMetrics.averageTestExecutionTime.target}ms)` : ''
    }${
      this.qualityMetrics.averageTestExecutionTime.meetsTarget() 
        ? ' ✓' : ' ✗'
    }` : ''
  }
  ${this.qualityMetrics.testIsolation ? 
    `Test Isolation: ${this.qualityMetrics.testIsolation.formattedValue()}${
      this.qualityMetrics.testIsolation.target 
        ? ` (Target: ${this.qualityMetrics.testIsolation.target}%)` : ''
    }${
      this.qualityMetrics.testIsolation.meetsTarget() 
        ? ' ✓' : ' ✗'
    }` : ''
  }

Test Distribution:
  Total Tests: ${this.distributionMetrics.getTotalTests()}
  By Type: ${Object.entries(this.distributionMetrics.getTestPercentageByType())
    .map(([type, percentage]) => `${type}: ${percentage.toFixed(1)}%`)
    .join(', ')}

Quality Dashboard generated successfully. Open the HTML dashboard for interactive visualizations.
`.trim();
  }
}