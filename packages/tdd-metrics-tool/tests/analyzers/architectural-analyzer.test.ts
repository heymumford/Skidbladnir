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
import * as ts from 'typescript';
import { 
  ArchitecturalAnalyzer,
  DependencyViolation
} from '../../src/analyzers/architectural-analyzer';
import {
  ArchitecturalLayer,
  CoverageData,
  SourceFile,
  TestFile,
  LanguageType
} from '../../src/models/types';
import { ArchitecturalMetrics } from '../../src/models/metrics';

// Mock fs and ts
jest.mock('fs');
jest.mock('typescript');

describe('ArchitecturalAnalyzer', () => {
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
        lines: 200,
        functions: ['registerUser', 'loginUser']
      },
      {
        filePath: '/project/src/adapters/UserController.ts',
        filename: 'UserController.ts',
        language: LanguageType.TYPESCRIPT,
        layer: ArchitecturalLayer.ADAPTER,
        lines: 150,
        functions: ['handleRegister', 'handleLogin']
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
        total: 570,
        covered: 400,
        percentage: 70.18
      },
      functions: {
        total: 8,
        covered: 6,
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
          total: 200,
          covered: 160,
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
          total: 150,
          covered: 100,
          percentage: 66.67
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
          total: 120,
          covered: 50,
          percentage: 41.67
        },
        functions: {
          total: 2,
          covered: 1,
          percentage: 50
        }
      }
    }
  };

  // Setup mocks
  beforeEach(() => {
    // Reset the mocks
    jest.resetAllMocks();
    
    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue('mock file content');
    
    // Mock ts.createSourceFile
    (ts.createSourceFile as jest.Mock).mockReturnValue({
      getLineAndCharacterOfPosition: jest.fn().mockReturnValue({ line: 5 }),
      forEachChild: jest.fn((node, callback) => {
        // Nothing to call back in this mock
      })
    });
  });

  describe('analyzeArchitecture', () => {
    it('should analyze architecture and return metrics', () => {
      // Mock the internal methods
      const findDependencyViolationsSpy = jest.spyOn(ArchitecturalAnalyzer, 'findDependencyViolations');
      findDependencyViolationsSpy.mockReturnValue([
        {
          sourceFile: '/project/src/usecases/UserUseCase.ts',
          targetFile: '/project/src/infrastructure/UserRepository.ts',
          sourceLine: 10,
          sourceLayer: ArchitecturalLayer.USE_CASE,
          targetLayer: ArchitecturalLayer.INFRASTRUCTURE,
          violationType: 'LAYER_ISOLATION',
          message: 'Violation message'
        }
      ]);
      
      const findMissingPortImplementationsSpy = jest.spyOn(ArchitecturalAnalyzer, 'findMissingPortImplementations');
      findMissingPortImplementationsSpy.mockReturnValue(['UserPort']);
      
      // Run the analysis
      const metrics = ArchitecturalAnalyzer.analyzeArchitecture(mockCoverageData, {
        maxViolations: 0
      });
      
      // Verify the metrics
      expect(metrics).toBeInstanceOf(ArchitecturalMetrics);
      expect(metrics.dependencyDirectionViolations.value).toBe(0);
      expect(metrics.layerIsolationViolations.value).toBe(1);
      expect(metrics.interfaceDependencyViolations.value).toBe(0);
      expect(metrics.missingPortImplementations?.value).toBe(1);
      
      // Verify layer coverage
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]).toBeDefined();
      expect(metrics.architecturalCoverage[ArchitecturalLayer.DOMAIN]?.lineCoverage.value).toBe(90);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.USE_CASE]?.functionCoverage.value).toBe(100);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.ADAPTER]?.lineCoverage.value).toBe(66.67);
      expect(metrics.architecturalCoverage[ArchitecturalLayer.INFRASTRUCTURE]?.functionCoverage.value).toBe(50);
      
      // Verify that the method called our spy methods
      expect(findDependencyViolationsSpy).toHaveBeenCalledWith(mockCoverageData.sourceFiles);
      expect(findMissingPortImplementationsSpy).toHaveBeenCalledWith(mockCoverageData.sourceFiles);
    });
  });

  describe('findDependencyViolations', () => {
    it('should find dependency violations in TypeScript files', () => {
      // Setup source files with a mocked TypeScript file
      const sourceFiles = [
        {
          filePath: '/project/src/domain/User.ts',
          filename: 'User.ts',
          language: LanguageType.TYPESCRIPT,
          layer: ArchitecturalLayer.DOMAIN,
          lines: 100,
          functions: ['createUser']
        }
      ];
      
      // Mock ts.isImportDeclaration to find an import
      (ts as any).isImportDeclaration = jest.fn().mockReturnValue(true);
      
      // Mock the StringLiteral for the import path
      (ts as any).isStringLiteral = jest.fn().mockReturnValue(true);
      
      // Mock to simulate a violation
      const mockSourceFile = {
        getLineAndCharacterOfPosition: jest.fn().mockReturnValue({ line: 5 }),
        forEachChild: jest.fn((callback) => {
          // Call the callback with a mock node
          callback({
            getStart: jest.fn().mockReturnValue(100),
            moduleSpecifier: { text: './infrastructure/UserRepository' },
            expression: { getText: jest.fn().mockReturnValue('import') },
            arguments: [{ text: 'UserRepository' }]
          });
        })
      };
      
      (ts.createSourceFile as jest.Mock).mockReturnValue(mockSourceFile);
      
      // Mock the checkTsImports method to add a violation
      const violations: DependencyViolation[] = [];
      const checkTsImportsSpy = jest.spyOn(ArchitecturalAnalyzer as any, 'checkTsImports');
      checkTsImportsSpy.mockImplementation((sourceFile, file, violationsArray) => {
        violationsArray.push({
          sourceFile: file.filePath,
          targetFile: '/project/src/infrastructure/UserRepository.ts',
          sourceLine: 6,
          sourceLayer: file.layer,
          targetLayer: ArchitecturalLayer.INFRASTRUCTURE,
          violationType: 'DEPENDENCY_DIRECTION',
          message: 'Domain layer depends on Infrastructure layer'
        });
      });
      
      // Run the method
      const result = ArchitecturalAnalyzer.findDependencyViolations(sourceFiles as SourceFile[]);
      
      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].violationType).toBe('DEPENDENCY_DIRECTION');
      expect(result[0].sourceLayer).toBe(ArchitecturalLayer.DOMAIN);
      expect(result[0].targetLayer).toBe(ArchitecturalLayer.INFRASTRUCTURE);
      
      // Verify that our spy was called
      expect(checkTsImportsSpy).toHaveBeenCalled();
    });
  });

  describe('findMissingPortImplementations', () => {
    it('should find interfaces without implementations', () => {
      // Setup source files with interfaces and implementations
      const sourceFiles = [
        {
          filePath: '/project/src/domain/UserPort.ts',
          filename: 'UserPort.ts',
          language: LanguageType.TYPESCRIPT,
          layer: ArchitecturalLayer.DOMAIN,
          lines: 20,
          functions: [],
          interfaces: ['UserPort', 'AdminPort']
        },
        {
          filePath: '/project/src/infrastructure/UserPortImpl.ts',
          filename: 'UserPortImpl.ts',
          language: LanguageType.TYPESCRIPT,
          layer: ArchitecturalLayer.INFRASTRUCTURE,
          lines: 50,
          functions: [],
          classes: ['UserPortImpl']
        }
      ];
      
      // Run the method
      const result = ArchitecturalAnalyzer.findMissingPortImplementations(sourceFiles as SourceFile[]);
      
      // Verify the result
      expect(result).toContain('AdminPort');
      expect(result).not.toContain('UserPort');
    });
  });

  describe('checkLayerTestCoverage', () => {
    it('should check if tests cover all architectural layers', () => {
      // Run the method
      const result = ArchitecturalAnalyzer.checkLayerTestCoverage(mockCoverageData);
      
      // Verify the result
      expect(result[ArchitecturalLayer.DOMAIN]).toBe(true);
      expect(result[ArchitecturalLayer.USE_CASE]).toBe(false);
      expect(result[ArchitecturalLayer.ADAPTER]).toBe(false);
      expect(result[ArchitecturalLayer.INFRASTRUCTURE]).toBe(false);
    });
  });
});