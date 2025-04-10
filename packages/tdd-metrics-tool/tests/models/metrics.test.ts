/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import {
  NumericMetric,
  PercentageMetric,
  CoverageMetrics,
  TestQualityMetrics,
  ArchitecturalMetrics,
  TestDistributionMetrics,
  TestMetricsReport
} from '../../src/models/metrics';
import { ArchitecturalLayer, TestType } from '../../src/models/types';

describe('Metrics Models', () => {
  describe('NumericMetric', () => {
    it('should create a numeric metric with optional properties', () => {
      const metric = new NumericMetric(
        'Test Execution Time',
        'Average time to run tests',
        120,
        {
          min: 0,
          max: 500,
          target: 100,
          unit: 'ms'
        }
      );
      
      expect(metric.name).toBe('Test Execution Time');
      expect(metric.description).toBe('Average time to run tests');
      expect(metric.value).toBe(120);
      expect(metric.min).toBe(0);
      expect(metric.max).toBe(500);
      expect(metric.target).toBe(100);
      expect(metric.unit).toBe('ms');
      expect(metric.timestamp).toBeInstanceOf(Date);
    });
    
    it('should check if a value meets the target', () => {
      const metricAboveTarget = new NumericMetric('Above', 'Above target', 120, { target: 100 });
      const metricBelowTarget = new NumericMetric('Below', 'Below target', 80, { target: 100 });
      const metricEqualTarget = new NumericMetric('Equal', 'Equal to target', 100, { target: 100 });
      const metricNoTarget = new NumericMetric('No Target', 'No target', 100);
      
      expect(metricAboveTarget.meetsTarget()).toBe(true);
      expect(metricBelowTarget.meetsTarget()).toBe(false);
      expect(metricEqualTarget.meetsTarget()).toBe(true);
      expect(metricNoTarget.meetsTarget()).toBe(true); // No target always meets "target"
    });
    
    it('should check if a value is in range', () => {
      const metric = new NumericMetric('Range Test', 'Test for range checks', 50, { min: 0, max: 100 });
      const metricOnlyMin = new NumericMetric('Min Only', 'Only min specified', 50, { min: 0 });
      const metricOnlyMax = new NumericMetric('Max Only', 'Only max specified', 50, { max: 100 });
      const metricNoRange = new NumericMetric('No Range', 'No range specified', 50);
      
      expect(metric.isInRange()).toBe(true);
      expect(metricOnlyMin.isInRange()).toBe(true);
      expect(metricOnlyMax.isInRange()).toBe(true);
      expect(metricNoRange.isInRange()).toBe(true); // No range constraints always in range
      
      const metricOutOfRange = new NumericMetric('Out of Range', 'Out of range', 150, { min: 0, max: 100 });
      const metricBelowMin = new NumericMetric('Below Min', 'Below min', -10, { min: 0 });
      const metricAboveMax = new NumericMetric('Above Max', 'Above max', 150, { max: 100 });
      
      expect(metricOutOfRange.isInRange()).toBe(false);
      expect(metricBelowMin.isInRange()).toBe(false);
      expect(metricAboveMax.isInRange()).toBe(false);
    });
    
    it('should format values with units', () => {
      const metricWithUnit = new NumericMetric('With Unit', 'Has a unit', 100, { unit: 'ms' });
      const metricNoUnit = new NumericMetric('No Unit', 'No unit', 100);
      
      expect(metricWithUnit.formattedValue()).toBe('100ms');
      expect(metricNoUnit.formattedValue()).toBe('100');
    });
    
    it('should convert to string representation', () => {
      const metric = new NumericMetric('Test Metric', 'A test metric', 100, { unit: 'ms' });
      expect(metric.toString()).toBe('Test Metric: 100ms');
    });
  });
  
  describe('PercentageMetric', () => {
    it('should create a percentage metric with correct defaults', () => {
      const metric = new PercentageMetric(
        'Code Coverage',
        'Percentage of code covered by tests',
        78.5,
        { target: 80 }
      );
      
      expect(metric.name).toBe('Code Coverage');
      expect(metric.description).toBe('Percentage of code covered by tests');
      expect(metric.value).toBe(78.5);
      expect(metric.min).toBe(0);
      expect(metric.max).toBe(100);
      expect(metric.unit).toBe('%');
      expect(metric.target).toBe(80);
    });
    
    it('should format percentages with two decimal places', () => {
      const metric = new PercentageMetric('Test', 'Test', 78.5);
      expect(metric.formattedValue()).toBe('78.50%');
      
      const metricInteger = new PercentageMetric('Test', 'Test', 80);
      expect(metricInteger.formattedValue()).toBe('80.00%');
      
      const metricLongDecimal = new PercentageMetric('Test', 'Test', 78.5678);
      expect(metricLongDecimal.formattedValue()).toBe('78.57%');
    });
  });
  
  describe('CoverageMetrics', () => {
    it('should create coverage metrics with all values', () => {
      const metrics = new CoverageMetrics(
        'Overall',
        {
          lineCoverage: 85.2,
          functionCoverage: 90.5,
          branchCoverage: 75.3,
          statementCoverage: 80.1
        },
        {
          lineCoverage: 80,
          functionCoverage: 90,
          branchCoverage: 75,
          statementCoverage: 80
        }
      );
      
      expect(metrics.lineCoverage.value).toBe(85.2);
      expect(metrics.functionCoverage.value).toBe(90.5);
      expect(metrics.branchCoverage?.value).toBe(75.3);
      expect(metrics.statementCoverage?.value).toBe(80.1);
      
      // Check if metrics meet targets
      expect(metrics.lineCoverage.meetsTarget()).toBe(true); // 85.2 > 80
      expect(metrics.functionCoverage.meetsTarget()).toBe(true); // 90.5 > 90
      expect(metrics.branchCoverage?.meetsTarget()).toBe(true); // 75.3 > 75
      expect(metrics.statementCoverage?.meetsTarget()).toBe(true); // 80.1 > 80
      expect(metrics.meetsTargets()).toBe(true);
    });
    
    it('should handle optional metrics', () => {
      const metrics = new CoverageMetrics(
        'Basic',
        {
          lineCoverage: 75,
          functionCoverage: 80
        },
        {
          lineCoverage: 80
        }
      );
      
      expect(metrics.lineCoverage.value).toBe(75);
      expect(metrics.functionCoverage.value).toBe(80);
      expect(metrics.branchCoverage).toBeUndefined();
      expect(metrics.statementCoverage).toBeUndefined();
      
      // Check if metrics meet targets
      expect(metrics.lineCoverage.meetsTarget()).toBe(false); // 75 < 80
      expect(metrics.functionCoverage.meetsTarget()).toBe(true); // No target for function coverage
      expect(metrics.meetsTargets()).toBe(false); // Line coverage fails
    });
  });
  
  describe('TestQualityMetrics', () => {
    it('should create quality metrics with all values', () => {
      const metrics = new TestQualityMetrics(
        {
          testToCodeRatio: 0.8,
          setupToAssertionRatio: 0.5,
          testComplexity: 2.5,
          averageTestExecutionTime: 120,
          testIsolation: 95
        },
        {
          testToCodeRatio: 0.7,
          setupToAssertionRatio: 0.6,
          testComplexity: 3.0,
          averageTestExecutionTime: 150,
          testIsolation: 90
        }
      );
      
      expect(metrics.testToCodeRatio.value).toBe(0.8);
      expect(metrics.setupToAssertionRatio?.value).toBe(0.5);
      expect(metrics.testComplexity?.value).toBe(2.5);
      expect(metrics.averageTestExecutionTime?.value).toBe(120);
      expect(metrics.testIsolation?.value).toBe(95);
      
      // Check if metrics meet targets
      expect(metrics.testToCodeRatio.meetsTarget()).toBe(true); // 0.8 > 0.7
      expect(metrics.setupToAssertionRatio?.meetsTarget()).toBe(false); // 0.5 < 0.6
      expect(metrics.testComplexity?.meetsTarget()).toBe(true); // 2.5 < 3.0 (lower is better)
      expect(metrics.averageTestExecutionTime?.meetsTarget()).toBe(true); // 120 < 150 (lower is better)
      expect(metrics.testIsolation?.meetsTarget()).toBe(true); // 95 > 90
      expect(metrics.meetsTargets()).toBe(false); // setupToAssertionRatio fails
    });
    
    it('should handle optional metrics', () => {
      const metrics = new TestQualityMetrics(
        {
          testToCodeRatio: 0.8
        },
        {
          testToCodeRatio: 0.7
        }
      );
      
      expect(metrics.testToCodeRatio.value).toBe(0.8);
      expect(metrics.setupToAssertionRatio).toBeUndefined();
      expect(metrics.testComplexity).toBeUndefined();
      expect(metrics.averageTestExecutionTime).toBeUndefined();
      expect(metrics.testIsolation).toBeUndefined();
      
      // Check if metrics meet targets
      expect(metrics.testToCodeRatio.meetsTarget()).toBe(true); // 0.8 > 0.7
      expect(metrics.meetsTargets()).toBe(true); // Only required metric passes
    });
  });
  
  describe('ArchitecturalMetrics', () => {
    it('should create architectural metrics with all values', () => {
      const metrics = new ArchitecturalMetrics(
        {
          dependencyDirection: 0,
          interfaceDependency: 1,
          layerIsolation: 2,
          missingPortImplementations: 1
        },
        {
          [ArchitecturalLayer.DOMAIN]: {
            lineCoverage: 95,
            functionCoverage: 100
          },
          [ArchitecturalLayer.USE_CASE]: {
            lineCoverage: 85,
            functionCoverage: 90
          }
        },
        {
          maxViolations: 2,
          layerCoverage: {
            [ArchitecturalLayer.DOMAIN]: {
              lineCoverage: 90,
              functionCoverage: 95
            },
            [ArchitecturalLayer.USE_CASE]: {
              lineCoverage: 80,
              functionCoverage: 85
            }
          }
        }
      );
      
      expect(metrics.dependencyDirectionViolations.value).toBe(0);
      expect(metrics.interfaceDependencyViolations.value).toBe(1);
      expect(metrics.layerIsolationViolations.value).toBe(2);
      expect(metrics.missingPortImplementations?.value).toBe(1);
      
      // Check architectural coverage
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.lineCoverage.value).toBe(95);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.functionCoverage.value).toBe(100);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.USE_CASE]?.lineCoverage.value).toBe(85);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.USE_CASE]?.functionCoverage.value).toBe(90);
      
      // Check if metrics meet targets
      expect(metrics.dependencyDirectionViolations.isInRange()).toBe(true); // 0 <= 2
      expect(metrics.interfaceDependencyViolations.isInRange()).toBe(true); // 1 <= 2
      expect(metrics.layerIsolationViolations.isInRange()).toBe(true); // 2 <= 2
      expect(metrics.missingPortImplementations?.isInRange()).toBe(true); // 1 <= 2
      
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.lineCoverage.meetsTarget()).toBe(true); // 95 > 90
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.functionCoverage.meetsTarget()).toBe(true); // 100 > 95
      expect(metrics.architecturalCoverage[ArchitecturalLayer.USE_CASE]?.lineCoverage.meetsTarget()).toBe(true); // 85 > 80
      expect(metrics.architecturalCoverage[ArchitecturalLayer.USE_CASE]?.functionCoverage.meetsTarget()).toBe(true); // 90 > 85
      
      expect(metrics.meetsTargets()).toBe(true);
    });
    
    it('should detect violations exceeding thresholds', () => {
      const metrics = new ArchitecturalMetrics(
        {
          dependencyDirection: 2,
          interfaceDependency: 3,
          layerIsolation: 1
        },
        {
          [ArchitecturalLayer.DOMAIN]: {
            lineCoverage: 85,
            functionCoverage: 90
          }
        },
        {
          maxViolations: 1, // Only allow 1 violation
          layerCoverage: {
            [ArchitecturalLayer.DOMAIN]: {
              lineCoverage: 90, // Requires 90% but only has 85%
              functionCoverage: 85
            }
          }
        }
      );
      
      // Check if metrics meet targets
      expect(metrics.dependencyDirectionViolations.isInRange()).toBe(false); // 2 > 1
      expect(metrics.interfaceDependencyViolations.isInRange()).toBe(false); // 3 > 1
      expect(metrics.layerIsolationViolations.isInRange()).toBe(true); // 1 <= 1
      
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.lineCoverage.meetsTarget()).toBe(false); // 85 < 90
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.functionCoverage.meetsTarget()).toBe(true); // 90 > 85
      
      expect(metrics.meetsTargets()).toBe(false); // Multiple failures
    });
  });
  
  describe('TestDistributionMetrics', () => {
    it('should calculate test distribution statistics', () => {
      const metrics = new TestDistributionMetrics(
        {
          [TestType.UNIT]: 50,
          [TestType.INTEGRATION]: 30,
          [TestType.E2E]: 20
        },
        {
          [ArchitecturalLayer.DOMAIN]: 40,
          [ArchitecturalLayer.USE_CASE]: 30,
          [ArchitecturalLayer.ADAPTER]: 20,
          [ArchitecturalLayer.INFRASTRUCTURE]: 10
        }
      );
      
      expect(metrics.testCountByType[TestType.UNIT]).toBe(50);
      expect(metrics.testCountByType[TestType.INTEGRATION]).toBe(30);
      expect(metrics.testCountByType[TestType.E2E]).toBe(20);
      
      expect(metrics.testCountByLayer[ArchitecturalLayer.DOMAIN]).toBe(40);
      expect(metrics.testCountByLayer[ArchitecturalLayer.USE_CASE]).toBe(30);
      expect(metrics.testCountByLayer[ArchitecturalLayer.ADAPTER]).toBe(20);
      expect(metrics.testCountByLayer[ArchitecturalLayer.INFRASTRUCTURE]).toBe(10);
      
      // Check totals
      expect(metrics.getTotalTests()).toBe(100);
      
      // Check percentages
      const typePercentages = metrics.getTestPercentageByType();
      expect(typePercentages[TestType.UNIT]).toBe(50);
      expect(typePercentages[TestType.INTEGRATION]).toBe(30);
      expect(typePercentages[TestType.E2E]).toBe(20);
      
      const layerPercentages = metrics.getTestPercentageByLayer();
      expect(layerPercentages[ArchitecturalLayer.DOMAIN]).toBe(40);
      expect(layerPercentages[ArchitecturalLayer.USE_CASE]).toBe(30);
      expect(layerPercentages[ArchitecturalLayer.ADAPTER]).toBe(20);
      expect(layerPercentages[ArchitecturalLayer.INFRASTRUCTURE]).toBe(10);
    });
    
    it('should handle empty distributions', () => {
      const metrics = new TestDistributionMetrics({}, {});
      
      expect(metrics.getTotalTests()).toBe(0);
      expect(metrics.getTestPercentageByType()).toEqual({});
      expect(metrics.getTestPercentageByLayer()).toEqual({});
    });
  });
  
  describe('TestMetricsReport', () => {
    it('should create a complete metrics report', () => {
      // Create sub-metrics
      const coverageMetrics = new CoverageMetrics(
        'Overall',
        {
          lineCoverage: 85,
          functionCoverage: 90
        },
        {
          lineCoverage: 80,
          functionCoverage: 85
        }
      );
      
      const qualityMetrics = new TestQualityMetrics(
        {
          testToCodeRatio: 0.8
        },
        {
          testToCodeRatio: 0.7
        }
      );
      
      const architecturalMetrics = new ArchitecturalMetrics(
        {
          dependencyDirection: 0,
          interfaceDependency: 0,
          layerIsolation: 0
        },
        {
          [ArchitecturalLayer.DOMAIN]: {
            lineCoverage: 90,
            functionCoverage: 95
          }
        },
        {
          maxViolations: 0
        }
      );
      
      const distributionMetrics = new TestDistributionMetrics(
        {
          [TestType.UNIT]: 70,
          [TestType.INTEGRATION]: 30
        },
        {
          [ArchitecturalLayer.DOMAIN]: 50,
          [ArchitecturalLayer.USE_CASE]: 50
        }
      );
      
      // Create the report
      const report = new TestMetricsReport(
        'Test Project',
        coverageMetrics,
        qualityMetrics,
        architecturalMetrics,
        distributionMetrics
      );
      
      expect(report.projectName).toBe('Test Project');
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.overallCoverage).toBe(coverageMetrics);
      expect(report.qualityMetrics).toBe(qualityMetrics);
      expect(report.architecturalMetrics).toBe(architecturalMetrics);
      expect(report.distributionMetrics).toBe(distributionMetrics);
      
      // All sub-metrics meet their targets
      expect(report.meetsAllTargets()).toBe(true);
      
      // Check summary generation
      const summary = report.getSummary();
      expect(summary).toContain('Test Metrics Report for Test Project');
      expect(summary).toContain('Overall Status: PASSED');
      expect(summary).toContain('Line Coverage: 85.00%');
      expect(summary).toContain('Function Coverage: 90.00%');
      expect(summary).toContain('Test-to-Code Ratio: 0.8');
      expect(summary).toContain('Dependency Direction Violations: 0');
      expect(summary).toContain('Total Tests: 100');
      expect(summary).toContain('unit: 70.0%');
      expect(summary).toContain('domain: 50.0%');
    });
    
    it('should detect failing thresholds', () => {
      // Create failing coverage metrics
      const coverageMetrics = new CoverageMetrics(
        'Overall',
        {
          lineCoverage: 75,
          functionCoverage: 80
        },
        {
          lineCoverage: 80, // Failing
          functionCoverage: 85 // Failing
        }
      );
      
      // All other metrics pass
      const qualityMetrics = new TestQualityMetrics({ testToCodeRatio: 0.8 });
      const architecturalMetrics = new ArchitecturalMetrics(
        { dependencyDirection: 0, interfaceDependency: 0, layerIsolation: 0 },
        {}
      );
      const distributionMetrics = new TestDistributionMetrics({}, {});
      
      const report = new TestMetricsReport(
        'Failing Project',
        coverageMetrics,
        qualityMetrics,
        architecturalMetrics,
        distributionMetrics
      );
      
      // Report should fail due to failing coverage metrics
      expect(report.meetsAllTargets()).toBe(false);
      
      const summary = report.getSummary();
      expect(summary).toContain('Overall Status: FAILED');
    });
  });
});