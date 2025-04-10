/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MetricsManager } from '../src/metrics-manager';
import { CollectorFactory } from '../src/collectors/collector-factory';
import { CoverageAnalyzer } from '../src/analyzers/coverage-analyzer';
import { QualityAnalyzer } from '../src/analyzers/quality-analyzer';
import { ArchitecturalAnalyzer } from '../src/analyzers/architectural-analyzer';
import { DistributionAnalyzer } from '../src/analyzers/distribution-analyzer';
import { TestMetricsReport } from '../src/models/metrics';
import { 
  MetricsConfig, 
  CoverageData, 
  ArchitecturalLayer,
  TestType 
} from '../src/models/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../src/collectors/collector-factory');
jest.mock('../src/analyzers/coverage-analyzer');
jest.mock('../src/analyzers/quality-analyzer');
jest.mock('../src/analyzers/architectural-analyzer');
jest.mock('../src/analyzers/distribution-analyzer');
jest.mock('fs');
jest.mock('path');

describe('MetricsManager', () => {
  // Default config for testing
  const defaultConfig: MetricsConfig = {
    projectRoot: '/project',
    sourcePaths: ['/project/src'],
    testPaths: ['/project/tests'],
    outputPath: '/project/metrics',
    thresholds: {
      lineCoverage: 80,
      functionCoverage: 90,
      layerCoverage: {
        [ArchitecturalLayer.DOMAIN]: 90,
        [ArchitecturalLayer.USE_CASE]: 80
      },
      testToCodeRatio: 0.5
    }
  };
  
  // Mock coverage data
  const mockCoverageData: CoverageData = {
    timestamp: new Date(),
    sourceFiles: [],
    testFiles: [],
    coverage: {
      lines: { total: 500, covered: 400, percentage: 80 },
      functions: { total: 100, covered: 90, percentage: 90 }
    },
    layerCoverage: {
      [ArchitecturalLayer.DOMAIN]: {
        files: 10,
        lines: { total: 200, covered: 190, percentage: 95 },
        functions: { total: 40, covered: 38, percentage: 95 }
      },
      [ArchitecturalLayer.USE_CASE]: {
        files: 5,
        lines: { total: 150, covered: 120, percentage: 80 },
        functions: { total: 30, covered: 27, percentage: 90 }
      }
    }
  };
  
  // Mock for collectors
  const mockCollector = {
    collectData: jest.fn().mockResolvedValue(mockCoverageData),
    getLanguageType: jest.fn().mockReturnValue('typescript')
  };
  
  // Setup mocks
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system operations
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    
    // Mock path operations
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.basename as jest.Mock).mockImplementation((p) => p.split('/').pop());
    
    // Mock collector factory
    (CollectorFactory.createAllCollectors as jest.Mock).mockReturnValue([mockCollector]);
    
    // Mock analyzers
    (CoverageAnalyzer.analyzeOverallCoverage as jest.Mock).mockReturnValue({
      lineCoverage: { value: 80, meetsTarget: jest.fn().mockReturnValue(true) },
      functionCoverage: { value: 90, meetsTarget: jest.fn().mockReturnValue(true) },
      meetsTargets: jest.fn().mockReturnValue(true)
    });
    
    (QualityAnalyzer.analyzeTestQuality as jest.Mock).mockReturnValue({
      testToCodeRatio: { value: 0.5, meetsTarget: jest.fn().mockReturnValue(true) },
      meetsTargets: jest.fn().mockReturnValue(true)
    });
    
    (ArchitecturalAnalyzer.analyzeArchitecture as jest.Mock).mockReturnValue({
      dependencyDirectionViolations: { value: 0, isInRange: jest.fn().mockReturnValue(true) },
      interfaceDependencyViolations: { value: 0, isInRange: jest.fn().mockReturnValue(true) },
      layerIsolationViolations: { value: 0, isInRange: jest.fn().mockReturnValue(true) },
      architecturalCoverage: {
        [ArchitecturalLayer.DOMAIN]: {
          lineCoverage: { value: 95, meetsTarget: jest.fn().mockReturnValue(true) },
          functionCoverage: { value: 95, meetsTarget: jest.fn().mockReturnValue(true) }
        },
        [ArchitecturalLayer.USE_CASE]: {
          lineCoverage: { value: 80, meetsTarget: jest.fn().mockReturnValue(true) },
          functionCoverage: { value: 90, meetsTarget: jest.fn().mockReturnValue(true) }
        }
      },
      meetsTargets: jest.fn().mockReturnValue(true)
    });
    
    (DistributionAnalyzer.analyzeTestDistribution as jest.Mock).mockReturnValue({
      testCountByType: {
        [TestType.UNIT]: 80,
        [TestType.INTEGRATION]: 15,
        [TestType.E2E]: 5
      },
      testCountByLayer: {
        [ArchitecturalLayer.DOMAIN]: 50,
        [ArchitecturalLayer.USE_CASE]: 30,
        [ArchitecturalLayer.ADAPTER]: 15,
        [ArchitecturalLayer.INFRASTRUCTURE]: 5
      },
      getTotalTests: jest.fn().mockReturnValue(100),
      getTestPercentageByType: jest.fn().mockReturnValue({
        [TestType.UNIT]: 80,
        [TestType.INTEGRATION]: 15,
        [TestType.E2E]: 5
      }),
      getTestPercentageByLayer: jest.fn().mockReturnValue({
        [ArchitecturalLayer.DOMAIN]: 50,
        [ArchitecturalLayer.USE_CASE]: 30,
        [ArchitecturalLayer.ADAPTER]: 15,
        [ArchitecturalLayer.INFRASTRUCTURE]: 5
      })
    });
  });
  
  describe('constructor', () => {
    it('should create a metrics manager with the provided config', () => {
      const manager = new MetricsManager(defaultConfig);
      expect(manager).toBeDefined();
    });
  });
  
  describe('run', () => {
    it('should run the full metrics collection and analysis process', async () => {
      const manager = new MetricsManager(defaultConfig);
      const report = await manager.run();
      
      // Verify that all steps were called
      expect(CollectorFactory.createAllCollectors).toHaveBeenCalled();
      expect(mockCollector.collectData).toHaveBeenCalled();
      expect(CoverageAnalyzer.analyzeOverallCoverage).toHaveBeenCalled();
      expect(QualityAnalyzer.analyzeTestQuality).toHaveBeenCalled();
      expect(ArchitecturalAnalyzer.analyzeArchitecture).toHaveBeenCalled();
      expect(DistributionAnalyzer.analyzeTestDistribution).toHaveBeenCalled();
      
      // Verify visualization was created
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3); // JSON, text, and HTML reports
      
      // Verify the report structure
      expect(report).toBeInstanceOf(TestMetricsReport);
      expect(report.projectName).toBe('project');
      expect(report.meetsAllTargets()).toBe(true);
    });
    
    it('should only collect data when collectOnly option is true', async () => {
      const manager = new MetricsManager(defaultConfig);
      const report = await manager.run({ collectOnly: true });
      
      expect(CollectorFactory.createAllCollectors).toHaveBeenCalled();
      expect(mockCollector.collectData).toHaveBeenCalled();
      
      // Analysis should not be performed
      expect(CoverageAnalyzer.analyzeOverallCoverage).not.toHaveBeenCalled();
      expect(QualityAnalyzer.analyzeTestQuality).not.toHaveBeenCalled();
      expect(ArchitecturalAnalyzer.analyzeArchitecture).not.toHaveBeenCalled();
      expect(DistributionAnalyzer.analyzeTestDistribution).not.toHaveBeenCalled();
      
      // Visualizations should not be created
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
    
    it('should only analyze data when analyzeOnly option is true', async () => {
      const manager = new MetricsManager(defaultConfig);
      
      // First call to collect data
      await manager.run({ collectOnly: true });
      
      // Clear mocks to check second call
      jest.clearAllMocks();
      
      // Second call to analyze only
      const report = await manager.run({ analyzeOnly: true });
      
      // Collection should not be performed again
      expect(CollectorFactory.createAllCollectors).not.toHaveBeenCalled();
      expect(mockCollector.collectData).not.toHaveBeenCalled();
      
      // Analysis should be performed
      expect(CoverageAnalyzer.analyzeOverallCoverage).toHaveBeenCalled();
      expect(QualityAnalyzer.analyzeTestQuality).toHaveBeenCalled();
      expect(ArchitecturalAnalyzer.analyzeArchitecture).toHaveBeenCalled();
      expect(DistributionAnalyzer.analyzeTestDistribution).toHaveBeenCalled();
      
      // Visualizations should be created
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    it('should throw an error when failOnThresholdViolation is true and thresholds are not met', async () => {
      // Mock one of the metrics to fail
      (CoverageAnalyzer.analyzeOverallCoverage as jest.Mock).mockReturnValue({
        lineCoverage: { value: 70, meetsTarget: jest.fn().mockReturnValue(false) },
        functionCoverage: { value: 90, meetsTarget: jest.fn().mockReturnValue(true) },
        meetsTargets: jest.fn().mockReturnValue(false)
      });
      
      const manager = new MetricsManager(defaultConfig);
      
      // Should throw because thresholds are not met
      await expect(manager.run({ failOnThresholdViolation: true }))
        .rejects.toThrow('Test metrics did not meet all thresholds');
    });
    
    it('should save coverage data when includeCoverageMaps option is true', async () => {
      const manager = new MetricsManager(defaultConfig);
      await manager.run({ includeCoverageMaps: true });
      
      // Should save coverage data to a file
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('coverage-data.json'),
        expect.any(String)
      );
    });
  });
  
  describe('collectData', () => {
    it('should collect data from all collectors and merge the results', async () => {
      // Mock multiple collectors with different data
      const collector1 = {
        ...mockCollector,
        collectData: jest.fn().mockResolvedValue({
          ...mockCoverageData,
          sourceFiles: [{ filename: 'file1.ts' }],
          testFiles: [{ filename: 'file1.test.ts' }],
          coverage: {
            lines: { total: 100, covered: 80, percentage: 80 },
            functions: { total: 20, covered: 18, percentage: 90 }
          }
        })
      };
      
      const collector2 = {
        ...mockCollector,
        collectData: jest.fn().mockResolvedValue({
          ...mockCoverageData,
          sourceFiles: [{ filename: 'file2.ts' }],
          testFiles: [{ filename: 'file2.test.ts' }],
          coverage: {
            lines: { total: 200, covered: 160, percentage: 80 },
            functions: { total: 30, covered: 27, percentage: 90 }
          }
        })
      };
      
      (CollectorFactory.createAllCollectors as jest.Mock).mockReturnValue([collector1, collector2]);
      
      const manager = new MetricsManager(defaultConfig);
      await manager.run();
      
      // Both collectors should be called
      expect(collector1.collectData).toHaveBeenCalled();
      expect(collector2.collectData).toHaveBeenCalled();
      
      // Data should be merged
      expect(CoverageAnalyzer.analyzeOverallCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFiles: expect.arrayContaining([
            expect.objectContaining({ filename: 'file1.ts' }),
            expect.objectContaining({ filename: 'file2.ts' })
          ]),
          testFiles: expect.arrayContaining([
            expect.objectContaining({ filename: 'file1.test.ts' }),
            expect.objectContaining({ filename: 'file2.test.ts' })
          ])
        }),
        expect.anything()
      );
    });
    
    it('should handle collector errors gracefully', async () => {
      // Mock a collector that throws an error
      const failingCollector = {
        ...mockCollector,
        collectData: jest.fn().mockRejectedValue(new Error('Collector failed')),
        getLanguageType: jest.fn().mockReturnValue('python')
      };
      
      (CollectorFactory.createAllCollectors as jest.Mock).mockReturnValue([
        mockCollector, failingCollector
      ]);
      
      // Mock console.error to avoid cluttering test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const manager = new MetricsManager(defaultConfig);
      const report = await manager.run();
      
      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error collecting data for python:'),
        expect.any(Error)
      );
      
      // Process should continue with data from the successful collector
      expect(report).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('analyzeData', () => {
    it('should analyze coverage data using all analyzers', async () => {
      const manager = new MetricsManager(defaultConfig);
      const report = await manager.run();
      
      // All analyzers should be called with the coverage data
      expect(CoverageAnalyzer.analyzeOverallCoverage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lineCoverage: 80,
          functionCoverage: 90
        })
      );
      
      expect(QualityAnalyzer.analyzeTestQuality).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          testToCodeRatio: 0.5
        })
      );
      
      expect(ArchitecturalAnalyzer.analyzeArchitecture).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxViolations: 0,
          layerCoverage: expect.objectContaining({
            [ArchitecturalLayer.DOMAIN]: expect.any(Object),
            [ArchitecturalLayer.USE_CASE]: expect.any(Object)
          })
        })
      );
      
      expect(DistributionAnalyzer.analyzeTestDistribution).toHaveBeenCalledWith(
        expect.anything()
      );
      
      // Report should be created using the analyzer results
      expect(report).toBeInstanceOf(TestMetricsReport);
    });
  });
  
  describe('generateVisualizations', () => {
    it('should generate all report formats', async () => {
      const manager = new MetricsManager(defaultConfig);
      await manager.run();
      
      // Output directory should be created if it doesn't exist
      expect(fs.existsSync).toHaveBeenCalledWith('/project/metrics');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/project/metrics', { recursive: true });
      
      // Multiple report formats should be generated
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/metrics/metrics-report.json',
        expect.any(String)
      );
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/metrics/metrics-summary.txt',
        expect.any(String)
      );
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/metrics/metrics-report.html',
        expect.any(String)
      );
    });
  });
});