/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DistributionAnalyzer } from '../../src/analyzers/distribution-analyzer';
import { TestDistributionMetrics } from '../../src/models/metrics';
import {
  ArchitecturalLayer,
  CoverageData,
  SourceFile,
  TestFile,
  TestType,
  LanguageType
} from '../../src/models/types';

describe('DistributionAnalyzer', () => {
  // Mock coverage data for testing
  const mockCoverageData: CoverageData = {
    timestamp: new Date(),
    sourceFiles: [
      // Domain layer files
      {
        filePath: '/project/src/domain/User.ts',
        filename: 'User.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        lines: 100,
        functions: ['createUser', 'validateUser']
      },
      {
        filePath: '/project/src/domain/Order.ts',
        filename: 'Order.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        lines: 120,
        functions: ['createOrder', 'calculateTotal']
      },
      
      // Use case layer files
      {
        filePath: '/project/src/usecases/UserUseCase.ts',
        filename: 'UserUseCase.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.USE_CASE,
        lines: 150,
        functions: ['registerUser', 'loginUser']
      },
      
      // Adapter layer files
      {
        filePath: '/project/src/adapters/UserController.ts',
        filename: 'UserController.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.ADAPTER,
        lines: 80,
        functions: ['handleRegister', 'handleLogin']
      },
      
      // Infrastructure layer files
      {
        filePath: '/project/src/infrastructure/UserRepository.ts',
        filename: 'UserRepository.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.INFRASTRUCTURE,
        lines: 70,
        functions: ['saveUser', 'findUser']
      }
    ],
    testFiles: [
      // Unit tests for domain
      {
        filePath: '/project/tests/unit/domain/User.test.ts',
        filename: 'User.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        type: TestType.UNIT,
        testCases: [
          { name: 'should create user', filePath: '/project/tests/unit/domain/User.test.ts', lineNumber: 10 },
          { name: 'should validate user', filePath: '/project/tests/unit/domain/User.test.ts', lineNumber: 20 }
        ]
      },
      {
        filePath: '/project/tests/unit/domain/Order.test.ts',
        filename: 'Order.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.DOMAIN,
        type: TestType.UNIT,
        testCases: [
          { name: 'should create order', filePath: '/project/tests/unit/domain/Order.test.ts', lineNumber: 10 },
          { name: 'should calculate total', filePath: '/project/tests/unit/domain/Order.test.ts', lineNumber: 20 }
        ]
      },
      
      // Unit tests for use cases
      {
        filePath: '/project/tests/unit/usecases/UserUseCase.test.ts',
        filename: 'UserUseCase.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.USE_CASE,
        type: TestType.UNIT,
        testCases: [
          { name: 'should register user', filePath: '/project/tests/unit/usecases/UserUseCase.test.ts', lineNumber: 10 },
          { name: 'should login user', filePath: '/project/tests/unit/usecases/UserUseCase.test.ts', lineNumber: 20 }
        ]
      },
      
      // Integration tests for controllers
      {
        filePath: '/project/tests/integration/adapters/UserController.test.ts',
        filename: 'UserController.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.ADAPTER,
        type: TestType.INTEGRATION,
        testCases: [
          { name: 'should handle register', filePath: '/project/tests/integration/adapters/UserController.test.ts', lineNumber: 10 }
        ]
      },
      
      // E2E tests
      {
        filePath: '/project/tests/e2e/UserFlow.test.ts',
        filename: 'UserFlow.test.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.UNKNOWN,
        type: TestType.E2E,
        testCases: [
          { name: 'should complete user registration flow', filePath: '/project/tests/e2e/UserFlow.test.ts', lineNumber: 10 }
        ]
      }
    ],
    coverage: {
      lines: {
        total: 520,
        covered: 400,
        percentage: 76.92
      },
      functions: {
        total: 10,
        covered: 8,
        percentage: 80
      }
    },
    layerCoverage: {
      [ArchitecturalLayer.DOMAIN]: {
        files: 2,
        lines: {
          total: 220,
          covered: 200,
          percentage: 90.91
        },
        functions: {
          total: 4,
          covered: 4,
          percentage: 100
        }
      },
      [ArchitecturalLayer.USE_CASE]: {
        files: 1,
        lines: {
          total: 150,
          covered: 120,
          percentage: 80
        },
        functions: {
          total: 2,
          covered: 2,
          percentage: 100
        }
      },
      [ArchitecturalLayer.ADAPTER]: {
        files: 1,
        lines: {
          total: 80,
          covered: 60,
          percentage: 75
        },
        functions: {
          total: 2,
          covered: 1,
          percentage: 50
        }
      },
      [ArchitecturalLayer.INFRASTRUCTURE]: {
        files: 1,
        lines: {
          total: 70,
          covered: 20,
          percentage: 28.57
        },
        functions: {
          total: 2,
          covered: 1,
          percentage: 50
        }
      }
    }
  };

  describe('analyzeTestDistribution', () => {
    it('should analyze test distribution across types and layers', () => {
      // Run the analysis
      const metrics = DistributionAnalyzer.analyzeTestDistribution(mockCoverageData);
      
      // Verify the metrics
      expect(metrics).toBeInstanceOf(TestDistributionMetrics);
      
      // Check test counts by type
      expect(metrics.testCountByType[TestType.UNIT]).toBe(6); // 4 from domain, 2 from use case
      expect(metrics.testCountByType[TestType.INTEGRATION]).toBe(1); // 1 from adapter
      expect(metrics.testCountByType[TestType.E2E]).toBe(1); // 1 from e2e
      expect(metrics.testCountByType[TestType.ACCEPTANCE]).toBeUndefined(); // None
      
      // Check test counts by layer
      expect(metrics.testCountByLayer[ArchitecturalLayer.DOMAIN]).toBe(4); // 2 from User, 2 from Order
      expect(metrics.testCountByLayer[ArchitecturalLayer.USE_CASE]).toBe(2); // 2 from UserUseCase
      expect(metrics.testCountByLayer[ArchitecturalLayer.ADAPTER]).toBe(1); // 1 from UserController
      expect(metrics.testCountByLayer[ArchitecturalLayer.INFRASTRUCTURE]).toBeUndefined(); // None
      expect(metrics.testCountByLayer[ArchitecturalLayer.UNKNOWN]).toBe(1); // 1 from E2E test
      
      // Check total tests
      expect(metrics.getTotalTests()).toBe(8); // Total test cases across all files
      
      // Check percentages
      const typePercentages = metrics.getTestPercentageByType();
      expect(typePercentages[TestType.UNIT]).toBe(75); // 6/8 = 75%
      expect(typePercentages[TestType.INTEGRATION]).toBe(12.5); // 1/8 = 12.5%
      expect(typePercentages[TestType.E2E]).toBe(12.5); // 1/8 = 12.5%
      
      const layerPercentages = metrics.getTestPercentageByLayer();
      expect(layerPercentages[ArchitecturalLayer.DOMAIN]).toBe(50); // 4/8 = 50%
      expect(layerPercentages[ArchitecturalLayer.USE_CASE]).toBe(25); // 2/8 = 25%
      expect(layerPercentages[ArchitecturalLayer.ADAPTER]).toBe(12.5); // 1/8 = 12.5%
      expect(layerPercentages[ArchitecturalLayer.UNKNOWN]).toBe(12.5); // 1/8 = 12.5%
    });
    
    it('should handle empty test data', () => {
      // Create empty data
      const emptyCoverageData: CoverageData = {
        ...mockCoverageData,
        testFiles: []
      };
      
      // Run the analysis
      const metrics = DistributionAnalyzer.analyzeTestDistribution(emptyCoverageData);
      
      // Verify the metrics
      expect(metrics.testCountByType).toEqual({});
      expect(metrics.testCountByLayer).toEqual({});
      expect(metrics.getTotalTests()).toBe(0);
      expect(metrics.getTestPercentageByType()).toEqual({});
      expect(metrics.getTestPercentageByLayer()).toEqual({});
    });
  });

  describe('countTestsByType', () => {
    it('should count tests by type', () => {
      // Run the method
      const result = DistributionAnalyzer.countTestsByType(mockCoverageData.testFiles);
      
      // Verify the result
      expect(result[TestType.UNIT]).toBe(6);
      expect(result[TestType.INTEGRATION]).toBe(1);
      expect(result[TestType.E2E]).toBe(1);
      expect(result[TestType.ACCEPTANCE]).toBeUndefined();
    });
  });

  describe('countTestsByLayer', () => {
    it('should count tests by architectural layer', () => {
      // Run the method
      const result = DistributionAnalyzer.countTestsByLayer(mockCoverageData.testFiles);
      
      // Verify the result
      expect(result[ArchitecturalLayer.DOMAIN]).toBe(4);
      expect(result[ArchitecturalLayer.USE_CASE]).toBe(2);
      expect(result[ArchitecturalLayer.ADAPTER]).toBe(1);
      expect(result[ArchitecturalLayer.INFRASTRUCTURE]).toBeUndefined();
      expect(result[ArchitecturalLayer.UNKNOWN]).toBe(1);
    });
  });

  describe('identifyTestGaps', () => {
    it('should identify layers without test coverage', () => {
      // Run the method
      const result = DistributionAnalyzer.identifyTestGaps(mockCoverageData);
      
      // Verify the result
      expect(result.layersWithoutTests).toContain(ArchitecturalLayer.INFRASTRUCTURE);
      expect(result.layersWithoutTests).not.toContain(ArchitecturalLayer.DOMAIN);
      expect(result.layersWithoutTests).not.toContain(ArchitecturalLayer.USE_CASE);
      expect(result.layersWithoutTests).not.toContain(ArchitecturalLayer.ADAPTER);
    });
    
    it('should identify layers with low test counts', () => {
      // Run the method
      const result = DistributionAnalyzer.identifyTestGaps(mockCoverageData);
      
      // Verify the result for layers with low test coverage (only 1 test)
      expect(result.layersWithLowTestCounts).toContain(ArchitecturalLayer.ADAPTER);
      expect(result.layersWithLowTestCounts).not.toContain(ArchitecturalLayer.DOMAIN);
      expect(result.layersWithLowTestCounts).not.toContain(ArchitecturalLayer.USE_CASE);
    });
  });
});