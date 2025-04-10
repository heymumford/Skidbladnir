/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { QualityAnalyzer } from '../../src/analyzers/quality-analyzer';
import { TestQualityMetrics } from '../../src/models/metrics';
import {
  ArchitecturalLayer,
  CoverageData,
  SourceFile,
  TestFile,
  TestType,
  LanguageType
} from '../../src/models/types';

describe('QualityAnalyzer', () => {
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
        filePath: '/project/src/usecases/UserUseCase.ts',
        filename: 'UserUseCase.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.USE_CASE,
        lines: 150,
        functions: ['registerUser', 'loginUser']
      }
    ],
    testFiles: [
      {
        filePath: '/project/tests/domain/User.test.ts',
        filename: 'User.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        type: TestType.UNIT,
        testCases: [
          { 
            name: 'should create user', 
            filePath: '/project/tests/domain/User.test.ts', 
            lineNumber: 10,
            executionTime: 50,
            assertions: 3,
            coveredFiles: ['/project/src/domain/User.ts']
          },
          { 
            name: 'should validate user', 
            filePath: '/project/tests/domain/User.test.ts', 
            lineNumber: 20,
            executionTime: 30,
            assertions: 2,
            coveredFiles: ['/project/src/domain/User.ts']
          }
        ]
      },
      {
        filePath: '/project/tests/usecases/UserUseCase.test.ts',
        filename: 'UserUseCase.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.USE_CASE,
        type: TestType.UNIT,
        testCases: [
          { 
            name: 'should register user', 
            filePath: '/project/tests/usecases/UserUseCase.test.ts', 
            lineNumber: 10,
            executionTime: 100,
            assertions: 4,
            coveredFiles: ['/project/src/usecases/UserUseCase.ts', '/project/src/domain/User.ts']
          }
        ]
      }
    ],
    coverage: {
      lines: {
        total: 250,
        covered: 200,
        percentage: 80
      },
      functions: {
        total: 4,
        covered: 3,
        percentage: 75
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
      [ArchitecturalLayer.USE_CASE]: {
        files: 1,
        lines: {
          total: 150,
          covered: 110,
          percentage: 73.33
        },
        functions: {
          total: 2,
          covered: 1,
          percentage: 50
        }
      }
    }
  };

  describe('analyzeTestQuality', () => {
    it('should analyze test quality metrics', () => {
      // Run the analysis
      const metrics = QualityAnalyzer.analyzeTestQuality(mockCoverageData, {
        testToCodeRatio: 0.3
      });
      
      // Verify the metrics
      expect(metrics).toBeInstanceOf(TestQualityMetrics);
      
      // Test-to-code ratio: 3 test cases (or 180 test lines) vs 250 source lines
      // Using 180 test lines (60 lines per test) would give 0.72 ratio
      // Using 3 test cases vs 250 lines would give 0.012 ratio (tests)
      // Using 3 test cases vs 4 functions would give 0.75 ratio (tests per function)
      expect(metrics.testToCodeRatio.value).toBeGreaterThan(0); // We can't verify the exact value as it's estimated
      
      // Average execution time: (50 + 30 + 100) / 3 = 60ms
      expect(metrics.averageTestExecutionTime?.value).toBe(60);
      
      // Check target status
      expect(metrics.testToCodeRatio.meetsTarget()).toBe(true); // 0.75 > 0.3
    });
    
    it('should handle missing execution time data', () => {
      // Create a copy without execution time data
      const noExecutionTimeData = {
        ...mockCoverageData,
        testFiles: mockCoverageData.testFiles.map(file => ({
          ...file,
          testCases: file.testCases.map(testCase => ({
            ...testCase,
            executionTime: undefined
          }))
        }))
      };
      
      // Run the analysis
      const metrics = QualityAnalyzer.analyzeTestQuality(noExecutionTimeData as CoverageData);
      
      // Verify that execution time metrics are not available
      expect(metrics.averageTestExecutionTime).toBeUndefined();
    });
  });

  describe('calculateTestToCodeRatio', () => {
    it('should calculate test-to-code ratio', () => {
      // Run the method with function count ratio
      const ratio = QualityAnalyzer.calculateTestToCodeRatio(mockCoverageData);
      
      // 3 test cases / 4 functions = 0.75
      expect(ratio).toBe(0.75);
    });
    
    it('should handle empty data', () => {
      // Create empty data
      const emptyCoverageData: CoverageData = {
        ...mockCoverageData,
        sourceFiles: [],
        coverage: {
          ...mockCoverageData.coverage,
          functions: { total: 0, covered: 0, percentage: 0 }
        }
      };
      
      // Run the method
      const ratio = QualityAnalyzer.calculateTestToCodeRatio(emptyCoverageData);
      
      // Should return 0 for empty data
      expect(ratio).toBe(0);
    });
  });

  describe('calculateAverageExecutionTime', () => {
    it('should calculate average test execution time', () => {
      // Run the method
      const averageTime = QualityAnalyzer.calculateAverageExecutionTime(mockCoverageData.testFiles);
      
      // (50 + 30 + 100) / 3 = 60ms
      expect(averageTime).toBe(60);
    });
    
    it('should handle missing execution time data', () => {
      // Create test files without execution time data
      const testFiles = [
        {
          filePath: '/project/tests/file1.test.ts',
          filename: 'file1.test.ts',
          language: LanguageType.TYPESCRIPT,
          layer: ArchitecturalLayer.DOMAIN,
          type: TestType.UNIT,
          testCases: [
            { name: 'test1', filePath: '/project/tests/file1.test.ts', lineNumber: 10 },
            { name: 'test2', filePath: '/project/tests/file1.test.ts', lineNumber: 20 }
          ]
        }
      ];
      
      // Run the method
      const averageTime = QualityAnalyzer.calculateAverageExecutionTime(testFiles as TestFile[]);
      
      // Should return undefined for missing data
      expect(averageTime).toBeUndefined();
    });
  });

  describe('calculateSetupToAssertionRatio', () => {
    it('should handle missing assertion data', () => {
      // Create test files without assertion data
      const testFiles = mockCoverageData.testFiles.map(file => ({
        ...file,
        testCases: file.testCases.map(testCase => ({
          ...testCase,
          assertions: undefined
        }))
      }));
      
      // Run the method
      const ratio = QualityAnalyzer.calculateSetupToAssertionRatio(testFiles as TestFile[]);
      
      // Should return undefined for missing data
      expect(ratio).toBeUndefined();
    });
  });

  describe('analyzeTestIsolation', () => {
    it('should analyze test isolation', () => {
      // Run the method
      const isolationPercentage = QualityAnalyzer.analyzeTestIsolation(mockCoverageData.testFiles);
      
      // 2 out of 3 tests are isolated (only cover a single file)
      // User.test.ts has 2 test cases that cover only User.ts
      // UserUseCase.test.ts has 1 test case that covers UserUseCase.ts AND User.ts (not isolated)
      expect(isolationPercentage).toBe(66.67); // 2/3 * 100 = 66.67%
    });
    
    it('should handle missing coverage data', () => {
      // Create test files without coverage data
      const testFiles = mockCoverageData.testFiles.map(file => ({
        ...file,
        testCases: file.testCases.map(testCase => ({
          ...testCase,
          coveredFiles: undefined
        }))
      }));
      
      // Run the method
      const isolationPercentage = QualityAnalyzer.analyzeTestIsolation(testFiles as TestFile[]);
      
      // Should return undefined for missing data
      expect(isolationPercentage).toBeUndefined();
    });
  });
});