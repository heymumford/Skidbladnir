/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  TestCollector 
} from './collector-base';
import {
  SourceFile,
  TestFile,
  TestCase,
  CoverageData,
  LanguageType,
  ArchitecturalLayer,
  ArchitecturalMapping,
  CollectorConfig
} from '../models/types';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import * as ts from 'typescript';
import { execSync } from 'child_process';

/**
 * TypeScript test collector implementation
 * Handles TypeScript/JavaScript test files and leverages Jest for coverage data
 */
export class TypeScriptCollector extends TestCollector {
  constructor(
    config: CollectorConfig,
    architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer)
  ) {
    super(config, architecturalMapping);
  }
  
  /**
   * Get language type for this collector
   */
  public getLanguageType(): LanguageType {
    return LanguageType.TYPESCRIPT;
  }
  
  /**
   * Collect test data for all test files
   */
  public async collectData(): Promise<CoverageData> {
    // Discover all test and source files
    const testFiles = await this.discoverTestFiles();
    const sourceFiles = await this.discoverSourceFiles();
    
    // Collect data for each test file
    const testFileData = await Promise.all(
      testFiles.map(file => this.collectTestFileData(file))
    );
    
    // Collect data for each source file
    const sourceFileData = await Promise.all(
      sourceFiles.map(file => this.collectSourceFileData(file))
    );
    
    // Calculate coverage statistics
    const coverageData = this.calculateCoverage(testFileData, sourceFileData);
    
    return coverageData;
  }
  
  /**
   * Calculate coverage data from test and source files
   */
  private calculateCoverage(
    testFiles: TestFile[],
    sourceFiles: SourceFile[]
  ): CoverageData {
    // Initialize coverage counters
    const coverage = {
      lines: {
        total: 0,
        covered: 0,
        percentage: 0
      },
      functions: {
        total: 0,
        covered: 0,
        percentage: 0
      },
      branches: {
        total: 0,
        covered: 0,
        percentage: 0
      },
      statements: {
        total: 0,
        covered: 0,
        percentage: 0
      }
    };
    
    // Gather totals from source files
    sourceFiles.forEach(file => {
      coverage.lines.total += file.lines;
      coverage.functions.total += file.functions.length;
    });
    
    // Try to parse Jest coverage report if available
    try {
      const jestCoverage = this.parseJestCoverage();
      if (jestCoverage) {
        coverage.lines.covered = jestCoverage.lines.covered;
        coverage.functions.covered = jestCoverage.functions.covered;
        coverage.branches.covered = jestCoverage.branches.covered;
        coverage.statements.covered = jestCoverage.statements.covered;
      }
    } catch (error) {
      console.warn('Could not parse Jest coverage data. Estimating coverage instead.');
      
      // Estimate coverage based on test files if we can't get Jest coverage
      const coveredFiles = new Set<string>();
      const coveredFunctions = new Set<string>();
      
      testFiles.forEach(file => {
        file.testCases.forEach(testCase => {
          if (testCase.coveredFiles) {
            testCase.coveredFiles.forEach(f => coveredFiles.add(f));
          }
          if (testCase.coveredFunctions) {
            testCase.coveredFunctions.forEach(f => coveredFunctions.add(f));
          }
        });
      });
      
      coverage.lines.covered = Math.round(coverage.lines.total * (coveredFiles.size / sourceFiles.length));
      coverage.functions.covered = coveredFunctions.size;
    }
    
    // Calculate percentages
    coverage.lines.percentage = (coverage.lines.covered / coverage.lines.total) * 100 || 0;
    coverage.functions.percentage = (coverage.functions.covered / coverage.functions.total) * 100 || 0;
    
    if (coverage.branches.total > 0) {
      coverage.branches.percentage = (coverage.branches.covered / coverage.branches.total) * 100;
    }
    
    if (coverage.statements.total > 0) {
      coverage.statements.percentage = (coverage.statements.covered / coverage.statements.total) * 100;
    }
    
    // Calculate layer coverage
    const layerCoverage: Record<string, any> = {};
    
    // Group source files by layer
    const filesByLayer: Record<string, SourceFile[]> = {};
    sourceFiles.forEach(file => {
      const layer = file.layer;
      if (!filesByLayer[layer]) {
        filesByLayer[layer] = [];
      }
      filesByLayer[layer].push(file);
    });
    
    // Calculate coverage for each layer
    Object.entries(filesByLayer).forEach(([layer, files]) => {
      // Count total lines and functions for this layer
      const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
      const totalFunctions = files.reduce((sum, file) => sum + file.functions.length, 0);
      
      // Estimate covered lines and functions for this layer
      const coveredLines = Math.round(totalLines * (coverage.lines.percentage / 100));
      const coveredFunctions = Math.round(totalFunctions * (coverage.functions.percentage / 100));
      
      layerCoverage[layer] = {
        files: files.length,
        lines: {
          total: totalLines,
          covered: coveredLines,
          percentage: (coveredLines / totalLines) * 100 || 0
        },
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          percentage: (coveredFunctions / totalFunctions) * 100 || 0
        }
      };
    });
    
    return {
      timestamp: new Date(),
      sourceFiles,
      testFiles,
      coverage,
      layerCoverage: layerCoverage as any
    };
  }
  
  /**
   * Check if a file is a test file
   */
  protected isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    return (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('-test.') ||
      fileName.includes('-spec.') ||
      fileName.endsWith('.test.ts') ||
      fileName.endsWith('.test.tsx') ||
      fileName.endsWith('.test.js') ||
      fileName.endsWith('.test.jsx') ||
      fileName.endsWith('.spec.ts') ||
      fileName.endsWith('.spec.tsx') ||
      fileName.endsWith('.spec.js') ||
      fileName.endsWith('.spec.jsx')
    );
  }
  
  /**
   * Discover test files based on configuration
   */
  protected async discoverTestFiles(): Promise<string[]> {
    const testPatterns = this.config.testPaths.map(p => {
      const pattern = path.join(p, '**/*.{ts,tsx,js,jsx}');
      return pattern;
    });
    
    let allTestFiles: string[] = [];
    
    for (const pattern of testPatterns) {
      try {
        const files = glob.sync(pattern);
        allTestFiles = allTestFiles.concat(files);
      } catch (error) {
        console.error(`Error discovering test files with pattern ${pattern}:`, error);
      }
    }
    
    // Filter out non-test files and excluded files
    return allTestFiles.filter(file => 
      this.isTestFile(file) && !this.shouldExclude(file)
    );
  }
  
  /**
   * Discover source files based on configuration
   */
  protected async discoverSourceFiles(): Promise<string[]> {
    const sourcePatterns = this.config.sourcePaths.map(p => {
      const pattern = path.join(p, '**/*.{ts,tsx,js,jsx}');
      return pattern;
    });
    
    let allSourceFiles: string[] = [];
    
    for (const pattern of sourcePatterns) {
      try {
        const files = glob.sync(pattern);
        allSourceFiles = allSourceFiles.concat(files);
      } catch (error) {
        console.error(`Error discovering source files with pattern ${pattern}:`, error);
      }
    }
    
    // Filter out test files and excluded files
    return allSourceFiles.filter(file => 
      !this.isTestFile(file) && !this.shouldExclude(file)
    );
  }
  
  /**
   * Collect data for a specific test file
   */
  protected async collectTestFileData(filePath: string): Promise<TestFile> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Parse TypeScript file
    const sourceFile = ts.createSourceFile(
      fileName,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Extract test cases from file
    const testCases: TestCase[] = this.extractTestCases(sourceFile, filePath);
    
    return {
      filePath,
      filename: fileName,
      language: LanguageType.TYPESCRIPT,
      layer: this.getArchitecturalLayer(filePath),
      type: this.getTestType(filePath),
      testCases
    };
  }
  
  /**
   * Extract test cases from a TypeScript source file
   */
  private extractTestCases(sourceFile: ts.SourceFile, filePath: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Visit the AST to find test cases
    function visit(node: ts.Node) {
      // Look for describe/it/test function calls
      if (ts.isCallExpression(node)) {
        const functionName = node.expression.getText(sourceFile);
        
        if (
          functionName === 'it' ||
          functionName === 'test' ||
          functionName === 'it.only' ||
          functionName === 'test.only' ||
          functionName === 'it.skip' ||
          functionName === 'test.skip'
        ) {
          // Get the test name (first argument which should be a string)
          if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
            const testName = node.arguments[0].text;
            const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            
            const skipped = 
              functionName === 'it.skip' || 
              functionName === 'test.skip';
            
            testCases.push({
              name: testName,
              filePath,
              lineNumber,
              skipped
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return testCases;
  }
  
  /**
   * Collect data for a specific source file
   */
  protected async collectSourceFileData(filePath: string): Promise<SourceFile> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Calculate number of lines
    const lines = fileContent.split('\n').length;
    
    // Parse TypeScript file
    const sourceFile = ts.createSourceFile(
      fileName,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Extract functions and classes
    const functions: string[] = [];
    const classes: string[] = [];
    const interfaces: string[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(node.name.getText(sourceFile));
      } else if (ts.isMethodDeclaration(node) && node.name) {
        functions.push(node.name.getText(sourceFile));
      } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
        // Try to find variable name for anonymous functions
        if (
          node.parent && 
          ts.isVariableDeclaration(node.parent) && 
          node.parent.name && 
          ts.isIdentifier(node.parent.name)
        ) {
          functions.push(node.parent.name.getText(sourceFile));
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        classes.push(node.name.getText(sourceFile));
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        interfaces.push(node.name.getText(sourceFile));
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    
    return {
      filePath,
      filename: fileName,
      language: LanguageType.TYPESCRIPT,
      layer: this.getArchitecturalLayer(filePath),
      lines,
      functions,
      classes,
      interfaces
    };
  }
  
  /**
   * Parse Jest coverage data if available
   */
  private parseJestCoverage(): any {
    const coveragePath = path.join(this.config.projectRoot, 'coverage/coverage-summary.json');
    
    if (fs.existsSync(coveragePath)) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const totalCoverage = coverageData.total;
        
        return {
          statements: {
            total: totalCoverage.statements.total,
            covered: totalCoverage.statements.covered,
            percentage: totalCoverage.statements.pct
          },
          branches: {
            total: totalCoverage.branches.total,
            covered: totalCoverage.branches.covered,
            percentage: totalCoverage.branches.pct
          },
          functions: {
            total: totalCoverage.functions.total,
            covered: totalCoverage.functions.covered,
            percentage: totalCoverage.functions.pct
          },
          lines: {
            total: totalCoverage.lines.total,
            covered: totalCoverage.lines.covered,
            percentage: totalCoverage.lines.pct
          }
        };
      } catch (error) {
        console.error('Error parsing Jest coverage data:', error);
        return null;
      }
    }
    
    return null;
  }
}