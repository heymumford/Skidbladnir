/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Architectural layer definitions based on Clean Architecture principles
 */
export enum ArchitecturalLayer {
  DOMAIN = 'domain',
  USE_CASE = 'use-case',
  ADAPTER = 'adapter',
  INFRASTRUCTURE = 'infrastructure',
  UNKNOWN = 'unknown'
}

/**
 * Language types supported in the codebase
 */
export enum LanguageType {
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  GO = 'go'
}

/**
 * Test category/type classification
 */
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  ACCEPTANCE = 'acceptance',
  PERFORMANCE = 'performance',
  CONTRACT = 'contract'
}

/**
 * Represents a test file in the codebase
 */
export interface TestFile {
  filePath: string;
  filename: string;
  language: LanguageType;
  layer: ArchitecturalLayer;
  type: TestType;
  testCases: TestCase[];
}

/**
 * Represents a specific test case/method
 */
export interface TestCase {
  name: string;
  filePath: string;
  lineNumber: number;
  executionTime?: number; // in milliseconds
  passed?: boolean;
  skipped?: boolean;
  assertions?: number;
  coveredFiles?: string[];
  coveredLines?: number[];
  coveredFunctions?: string[];
}

/**
 * Source file that might be covered by tests
 */
export interface SourceFile {
  filePath: string;
  filename: string;
  language: LanguageType;
  layer: ArchitecturalLayer;
  lines: number;
  functions: string[];
  classes?: string[];
  interfaces?: string[];
}

/**
 * Mapping from file paths to architectural layers
 */
export interface ArchitecturalMapping {
  [filePath: string]: ArchitecturalLayer;
}

/**
 * The coverage data for a specific project
 */
export interface CoverageData {
  timestamp: Date;
  sourceFiles: SourceFile[];
  testFiles: TestFile[];
  coverage: {
    lines: {
      total: number;
      covered: number;
      percentage: number;
    };
    functions: {
      total: number;
      covered: number;
      percentage: number;
    };
    branches?: {
      total: number;
      covered: number;
      percentage: number;
    };
    statements?: {
      total: number;
      covered: number;
      percentage: number;
    };
  };
  layerCoverage: {
    [key in ArchitecturalLayer]?: {
      files: number;
      lines: {
        total: number;
        covered: number;
        percentage: number;
      };
      functions: {
        total: number;
        covered: number;
        percentage: number;
      };
    };
  };
}

/**
 * Configuration for collecting and analyzing test metrics
 */
export interface MetricsConfig {
  projectRoot: string;
  sourcePaths: string[];
  testPaths: string[];
  outputPath: string;
  excludePatterns?: string[];
  architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer);
  thresholds?: {
    lineCoverage?: number;
    functionCoverage?: number;
    layerCoverage?: {
      [key in ArchitecturalLayer]?: number;
    };
    testToCodeRatio?: number;
  };
}

/**
 * Configuration for test collector components
 */
export interface CollectorConfig {
  projectRoot: string;
  testPaths: string[];
  coveragePaths?: string[];
  testResultPaths?: string[];
  excludePatterns?: string[];
  collectCodeCoverage?: boolean;
}

/**
 * Configuration for visualization components
 */
export interface VisualizationConfig {
  outputPath: string;
  includeTimeSeries?: boolean;
  includeArchitecturalDiagrams?: boolean;
  includeTestSuiteBreakdown?: boolean;
  includeLayerCoverage?: boolean;
}

/**
 * Options for running analysis
 */
export interface AnalysisOptions {
  collectOnly?: boolean;
  analyzeOnly?: boolean;
  visualizeOnly?: boolean;
  compareWithPrevious?: boolean;
  failOnThresholdViolation?: boolean;
  includeFileContents?: boolean;
  includeCoverageMaps?: boolean;
}