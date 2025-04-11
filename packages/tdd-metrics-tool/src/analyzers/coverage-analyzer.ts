/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CoverageData, SourceFile, TestFile } from '../models/types';
import { CoverageMetrics } from '../models/metrics';

/**
 * Analyzes code coverage data to produce coverage metrics
 */
export class CoverageAnalyzer {
  /**
   * Analyze overall code coverage
   */
  public static analyzeOverallCoverage(
    coverageData: CoverageData,
    thresholds?: {
      lineCoverage?: number;
      functionCoverage?: number;
      branchCoverage?: number;
      statementCoverage?: number;
    }
  ): CoverageMetrics {
    const { coverage } = coverageData;
    
    return new CoverageMetrics(
      'Overall',
      {
        lineCoverage: coverage.lines.percentage,
        functionCoverage: coverage.functions.percentage,
        branchCoverage: coverage.branches?.percentage,
        statementCoverage: coverage.statements?.percentage
      },
      thresholds
    );
  }
  
  /**
   * Analyze file-level coverage
   */
  public static analyzeFileCoverage(
    sourceFile: SourceFile,
    coverageData: CoverageData,
    thresholds?: {
      lineCoverage?: number;
      functionCoverage?: number;
    }
  ): CoverageMetrics {
    // Find file-specific coverage in the coverage data
    // For now, we'll estimate based on overall coverage
    const { coverage } = coverageData;
    
    // This is a simplification; with actual per-file coverage data from Jest or other tools,
    // we would use that instead
    const lineCoverage = coverage.lines.percentage;
    const functionCoverage = coverage.functions.percentage;
    
    return new CoverageMetrics(
      sourceFile.filename,
      {
        lineCoverage,
        functionCoverage
      },
      thresholds
    );
  }
  
  /**
   * Check if coverage meets thresholds
   */
  public static checkCoverageThresholds(
    coverageData: CoverageData,
    thresholds: {
      lineCoverage?: number;
      functionCoverage?: number;
      branchCoverage?: number;
      statementCoverage?: number;
    }
  ): boolean {
    const { coverage } = coverageData;
    
    let passed = true;
    
    if (thresholds.lineCoverage !== undefined) {
      passed = passed && coverage.lines.percentage >= thresholds.lineCoverage;
    }
    
    if (thresholds.functionCoverage !== undefined) {
      passed = passed && coverage.functions.percentage >= thresholds.functionCoverage;
    }
    
    if (thresholds.branchCoverage !== undefined && coverage.branches) {
      passed = passed && coverage.branches.percentage >= thresholds.branchCoverage;
    }
    
    if (thresholds.statementCoverage !== undefined && coverage.statements) {
      passed = passed && coverage.statements.percentage >= thresholds.statementCoverage;
    }
    
    return passed;
  }
  
  /**
   * Find untested files
   */
  public static findUntestedFiles(
    coverageData: CoverageData
  ): SourceFile[] {
    const { sourceFiles, testFiles } = coverageData;
    
    // Get all source files that are not covered by any test
    const coveredFilePaths = new Set<string>();
    
    // Gather all files covered by tests
    testFiles.forEach(testFile => {
      testFile.testCases.forEach(testCase => {
        if (testCase.coveredFiles) {
          testCase.coveredFiles.forEach(filePath => {
            coveredFilePaths.add(filePath);
          });
        }
      });
    });
    
    // Return files that are not in the covered set
    return sourceFiles.filter(file => !coveredFilePaths.has(file.filePath));
  }
  
  /**
   * Find files with low coverage
   */
  public static findLowCoverageFiles(
    coverageData: CoverageData,
    threshold = 50
  ): SourceFile[] {
    // For now, this is a simplification since we don't have per-file coverage
    // With actual per-file coverage data, we would filter based on that
    return [];
  }
}