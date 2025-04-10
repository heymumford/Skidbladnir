/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CoverageAnalyzer } from '../../src/analyzers/coverage-analyzer';
import { CoverageMetrics } from '../../src/models/metrics';
import {
  CoverageData,
  SourceFile,
  TestFile,
  LanguageType,
  ArchitecturalLayer
} from '../../src/models/types';

describe('CoverageAnalyzer', () => {
  // Mock coverage data for testing
  const mockCoverageData: CoverageData = {
    timestamp: new Date(),
    sourceFiles: [
      {
        filePath: '/project/src/domain/User.ts',
        filename: 'User.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        lines: 100,
        functions: ['createUser', 'validateUser']
      },
      {
        filePath: '/project/src/infrastructure/UserRepository.ts',
        filename: 'UserRepository.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.INFRASTRUCTURE,
        lines: 120,
        functions: ['saveUser', 'findUser']
      }
    ],
    testFiles: [
      {
        filePath: '/project/tests/domain/User.test.ts',
        filename: 'User.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        type: 'unit',
        testCases: [
          {
            name: 'should create user',
            filePath: '/project/tests/domain/User.test.ts',
            lineNumber: 10,
            coveredFiles: ['/project/src/domain/User.ts']
          }
        ]
      }
    ],
    coverage: {
      lines: {
        total: 220,
        covered: 150,
        percentage: 68.18
      },
      functions: {
        total: 4,
        covered: 3,
        percentage: 75
      },
      branches: {
        total: 20,
        covered: 15,
        percentage: 75
      },
      statements: {
        total: 200,
        covered: 140,
        percentage: 70
      }
    },
    layerCoverage: {
      [ArchitecturalLayer.DOMAIN]: {
        files: 1,
        lines: {
          total: 100,
          covered: 90,
          percentage: 90
        },
        functions: {
          total: 2,
          covered: 2,
          percentage: 100
        }
      },
      [ArchitecturalLayer.INFRASTRUCTURE]: {
        files: 1,
        lines: {
          total: 120,
          covered: 60,
          percentage: 50
        },
        functions: {
          total: 2,
          covered: 1,
          percentage: 50
        }
      }
    }
  };

  describe('analyzeOverallCoverage', () => {
    it('should calculate overall coverage metrics', () => {
      // Run the analysis
      const metrics = CoverageAnalyzer.analyzeOverallCoverage(mockCoverageData, {
        lineCoverage: 70,
        functionCoverage: 80,
        branchCoverage: 70,
        statementCoverage: 70
      });
      
      // Verify the metrics
      expect(metrics).toBeInstanceOf(CoverageMetrics);
      expect(metrics.lineCoverage.value).toBe(68.18);
      expect(metrics.functionCoverage.value).toBe(75);
      expect(metrics.branchCoverage?.value).toBe(75);
      expect(metrics.statementCoverage?.value).toBe(70);
      
      // Verify target status based on thresholds
      expect(metrics.lineCoverage.meetsTarget()).toBe(false); // 68.18 < 70
      expect(metrics.functionCoverage.meetsTarget()).toBe(false); // 75 < 80
      expect(metrics.branchCoverage?.meetsTarget()).toBe(true); // 75 > 70
      expect(metrics.statementCoverage?.meetsTarget()).toBe(true); // 70 >= 70
      
      // Verify overall status
      expect(metrics.meetsTargets()).toBe(false);
    });
    
    it('should handle missing coverage metrics', () => {
      // Create a copy without branch and statement coverage
      const partialCoverageData = { 
        ...mockCoverageData,
        coverage: {
          lines: mockCoverageData.coverage.lines,
          functions: mockCoverageData.coverage.functions
        }
      };
      
      // Run the analysis
      const metrics = CoverageAnalyzer.analyzeOverallCoverage(partialCoverageData as CoverageData);
      
      // Verify the metrics
      expect(metrics.lineCoverage.value).toBe(68.18);
      expect(metrics.functionCoverage.value).toBe(75);
      expect(metrics.branchCoverage).toBeUndefined();
      expect(metrics.statementCoverage).toBeUndefined();
    });
  });

  describe('analyzeFileCoverage', () => {
    it('should analyze file-level coverage', () => {
      // Get a source file
      const sourceFile = mockCoverageData.sourceFiles[0];
      
      // Run the analysis
      const metrics = CoverageAnalyzer.analyzeFileCoverage(sourceFile, mockCoverageData, {
        lineCoverage: 80,
        functionCoverage: 100
      });
      
      // Verify the metrics
      expect(metrics.lineCoverage.value).toBe(68.18); // Using overall coverage as estimation
      expect(metrics.functionCoverage.value).toBe(75); // Using overall coverage as estimation
      
      // Verify target status
      expect(metrics.lineCoverage.meetsTarget()).toBe(false);
      expect(metrics.functionCoverage.meetsTarget()).toBe(false);
    });
  });

  describe('checkCoverageThresholds', () => {
    it('should check if coverage meets thresholds', () => {
      // Test passing thresholds
      const passingResult = CoverageAnalyzer.checkCoverageThresholds(mockCoverageData, {
        lineCoverage: 60, // 68.18 > 60
        functionCoverage: 70, // 75 > 70
        branchCoverage: 70, // 75 > 70
        statementCoverage: 65 // 70 > 65
      });
      
      expect(passingResult).toBe(true);
      
      // Test failing thresholds
      const failingResult = CoverageAnalyzer.checkCoverageThresholds(mockCoverageData, {
        lineCoverage: 70, // 68.18 < 70
        functionCoverage: 80, // 75 < 80
        branchCoverage: 80, // 75 < 80
        statementCoverage: 75 // 70 < 75
      });
      
      expect(failingResult).toBe(false);
    });
    
    it('should handle partial thresholds', () => {
      // Only check line coverage
      const lineCoverageResult = CoverageAnalyzer.checkCoverageThresholds(mockCoverageData, {
        lineCoverage: 60 // 68.18 > 60
      });
      
      expect(lineCoverageResult).toBe(true);
      
      // Only check function coverage (failing)
      const functionCoverageResult = CoverageAnalyzer.checkCoverageThresholds(mockCoverageData, {
        functionCoverage: 80 // 75 < 80
      });
      
      expect(functionCoverageResult).toBe(false);
    });
  });

  describe('findUntestedFiles', () => {
    it('should identify files not covered by any test', () => {
      // The mock data has User.ts covered by a test and UserRepository.ts uncovered
      const result = CoverageAnalyzer.findUntestedFiles(mockCoverageData);
      
      // Should find one untested file
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('UserRepository.ts');
    });
    
    it('should handle files without coverage information', () => {
      // Create a copy without coveredFiles data
      const modifiedTestFiles = mockCoverageData.testFiles.map(file => ({
        ...file,
        testCases: file.testCases.map(testCase => ({
          ...testCase,
          coveredFiles: undefined
        }))
      }));
      
      const noCoverageData = {
        ...mockCoverageData,
        testFiles: modifiedTestFiles
      };
      
      // All files should be reported as untested
      const result = CoverageAnalyzer.findUntestedFiles(noCoverageData as CoverageData);
      expect(result).toHaveLength(2);
    });
  });

  describe('findLowCoverageFiles', () => {
    it('should return an empty array when per-file coverage is not available', () => {
      // With the current implementation, this function returns an empty array
      // since we don't have per-file coverage
      const result = CoverageAnalyzer.findLowCoverageFiles(mockCoverageData, 70);
      expect(result).toEqual([]);
    });
  });
});