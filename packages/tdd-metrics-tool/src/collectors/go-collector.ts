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
  TestType,
  CollectorConfig
} from '../models/types';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { execSync } from 'child_process';

/**
 * Go test collector implementation
 * Handles Go test files and leverages go test with coverage
 */
export class GoCollector extends TestCollector {
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
    return LanguageType.GO;
  }
  
  /**
   * Collect test data for all Go test files
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
      }
    };
    
    // Gather totals from source files
    sourceFiles.forEach(file => {
      coverage.lines.total += file.lines;
      coverage.functions.total += file.functions.length;
    });
    
    // Try to parse Go coverage report if available
    try {
      const goCoverage = this.parseGoCoverage();
      if (goCoverage) {
        coverage.lines.covered = goCoverage.lines.covered;
        coverage.functions.covered = goCoverage.functions.covered;
      }
    } catch (error) {
      console.warn('Could not parse Go coverage data. Estimating coverage instead.');
      
      // Estimate coverage based on test files if we can't get Go coverage
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
   * Check if a file is a Go test file
   */
  protected isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    return fileName.endsWith('_test.go');
  }
  
  /**
   * Discover Go test files based on configuration
   */
  protected async discoverTestFiles(): Promise<string[]> {
    const testPatterns = this.config.testPaths.map(p => {
      const pattern = path.join(p, '**/*.go');
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
   * Discover Go source files based on configuration
   */
  protected async discoverSourceFiles(): Promise<string[]> {
    const sourcePatterns = this.config.sourcePaths.map(p => {
      const pattern = path.join(p, '**/*.go');
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
   * Collect data for a specific Go test file
   */
  protected async collectTestFileData(filePath: string): Promise<TestFile> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Extract test cases from Go file
    const testCases: TestCase[] = this.extractGoTestCases(fileContent, filePath);
    
    // Determine test type based on filename and directory structure
    let testType = TestType.UNIT;
    
    if (filePath.includes('/integration/') || filePath.includes('integration_test')) {
      testType = TestType.INTEGRATION;
    } else if (filePath.includes('/e2e/') || filePath.includes('e2e_test')) {
      testType = TestType.E2E;
    } else if (filePath.includes('/acceptance/') || filePath.includes('acceptance_test')) {
      testType = TestType.ACCEPTANCE;
    } else if (filePath.includes('/performance/') || filePath.includes('performance_test')) {
      testType = TestType.PERFORMANCE;
    } else if (filePath.includes('/contract/') || filePath.includes('contract_test')) {
      testType = TestType.CONTRACT;
    }
    
    return {
      filePath,
      filename: fileName,
      language: LanguageType.GO,
      layer: this.getArchitecturalLayer(filePath),
      type: testType,
      testCases
    };
  }
  
  /**
   * Extract test cases from a Go file
   */
  private extractGoTestCases(content: string, filePath: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Split the file into lines for easier processing
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for test functions (in Go, test functions start with Test and take *testing.T)
      if (line.startsWith('func Test') && line.includes('(t *testing.T)')) {
        // Extract the test name
        const match = line.match(/func\s+(Test[a-zA-Z0-9_]+)\(/);
        if (match) {
          const testName = match[1];
          const lineNumber = i + 1;
          
          // Try to determine if test is skipped by looking at the function body
          let isSkipped = false;
          let depth = 0;
          let j = i;
          
          // Look for t.Skip within the function body
          while (j < lines.length) {
            const bodyLine = lines[j].trim();
            
            if (bodyLine.includes('{')) {
              depth++;
            }
            
            if (bodyLine.includes('}')) {
              depth--;
              if (depth === 0) {
                break;
              }
            }
            
            if (bodyLine.includes('t.Skip') || bodyLine.includes('t.SkipNow')) {
              isSkipped = true;
            }
            
            j++;
          }
          
          testCases.push({
            name: testName,
            filePath,
            lineNumber,
            skipped: isSkipped
          });
        }
      }
      
      // Also check for table-driven tests
      else if (line.includes('func TestTable') || 
               (line.startsWith('func Test') && content.includes('table-driven'))) {
        const match = line.match(/func\s+(Test[a-zA-Z0-9_]+)\(/);
        if (match) {
          const testName = match[1] + ' (table-driven)';
          const lineNumber = i + 1;
          
          testCases.push({
            name: testName,
            filePath,
            lineNumber,
            skipped: false
          });
        }
      }
      
      // Check for benchmark functions
      else if (line.startsWith('func Benchmark') && line.includes('(b *testing.B)')) {
        const match = line.match(/func\s+(Benchmark[a-zA-Z0-9_]+)\(/);
        if (match) {
          const testName = match[1];
          const lineNumber = i + 1;
          
          testCases.push({
            name: testName,
            filePath,
            lineNumber,
            skipped: false
          });
        }
      }
    }
    
    return testCases;
  }
  
  /**
   * Collect data for a specific Go source file
   */
  protected async collectSourceFileData(filePath: string): Promise<SourceFile> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Calculate number of lines
    const lines = fileContent.split('\n').length;
    
    // Extract functions and structs
    const { functions, classes } = this.extractGoFunctionsAndStructs(fileContent);
    
    return {
      filePath,
      filename: fileName,
      language: LanguageType.GO,
      layer: this.getArchitecturalLayer(filePath),
      lines,
      functions,
      classes
    };
  }
  
  /**
   * Extract functions and structs from a Go file
   */
  private extractGoFunctionsAndStructs(content: string): { functions: string[], classes: string[] } {
    const functions: string[] = [];
    const classes: string[] = [];
    
    // Split the file into lines for easier processing
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for function definitions
      if (line.startsWith('func ') && line.includes('(') && line.includes(')')) {
        // Check if it's a method
        if (line.includes(') ') && line.split(') ')[1].includes('(')) {
          // It's a method, extract receiver type and method name
          const receiverMatch = line.match(/func\s+\([^)]+\)\s+([a-zA-Z0-9_]+)/);
          if (receiverMatch) {
            const methodName = receiverMatch[1];
            functions.push(methodName);
          }
        } else {
          // It's a regular function
          const funcMatch = line.match(/func\s+([a-zA-Z0-9_]+)\(/);
          if (funcMatch) {
            const funcName = funcMatch[1];
            
            // Skip test functions
            if (!funcName.startsWith('Test') && !funcName.startsWith('Benchmark')) {
              functions.push(funcName);
            }
          }
        }
      }
      
      // Look for struct definitions (classes in Go)
      else if (line.startsWith('type ') && line.includes(' struct ')) {
        const structMatch = line.match(/type\s+([a-zA-Z0-9_]+)\s+struct/);
        if (structMatch) {
          const structName = structMatch[1];
          classes.push(structName);
        }
      }
      
      // Look for interface definitions
      else if (line.startsWith('type ') && line.includes(' interface ')) {
        const interfaceMatch = line.match(/type\s+([a-zA-Z0-9_]+)\s+interface/);
        if (interfaceMatch) {
          const interfaceName = interfaceMatch[1];
          classes.push(interfaceName + ' (interface)');
        }
      }
    }
    
    return { functions, classes };
  }
  
  /**
   * Parse Go coverage data if available
   */
  private parseGoCoverage(): any {
    // Check if there's a coverage file generated by go test -coverprofile
    const coverageFile = path.join(this.config.projectRoot, 'coverage.out');
    
    if (fs.existsSync(coverageFile)) {
      try {
        // Try to run go tool cover to get the coverage percentage
        try {
          const coverageOutput = execSync(`go tool cover -func=${coverageFile}`, { encoding: 'utf-8' });
          
          // Parse the output to find the total coverage line
          const lines = coverageOutput.split('\n');
          const totalLine = lines.find(line => line.includes('total:'));
          
          if (totalLine) {
            // Extract coverage percentage from the line
            const match = totalLine.match(/([0-9.]+)%/);
            if (match) {
              const coveragePercentage = parseFloat(match[1]);
              
              return {
                lines: {
                  total: 100,
                  covered: coveragePercentage,
                  percentage: coveragePercentage
                },
                functions: {
                  total: 100,
                  covered: coveragePercentage, // Approximation
                  percentage: coveragePercentage
                }
              };
            }
          }
        } catch (error) {
          console.warn('Failed to parse Go coverage report:', error);
        }
      } catch (error) {
        console.error('Error parsing Go coverage data:', error);
      }
    }
    
    return null;
  }
}