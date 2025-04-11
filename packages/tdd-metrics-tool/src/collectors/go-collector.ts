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
 * 
 * Features:
 * - Detects various Go test patterns: standard tests, table-driven tests, subtests, benchmarks
 * - Identifies test assertions with support for standard testing, testify, GoConvey, and Gomega
 * - Robust coverage data extraction from various coverage file formats
 * - Smart architectural layer detection based on Go conventions
 * - Extracts test relationships, helper methods, and test organization
 * - Support for parameterized tests and benchmarks
 * - Handles package-level test setup (TestMain)
 * - Accurately parses Go test files to gather test metrics
 */
export class GoCollector extends TestCollector {
  constructor(
    config: CollectorConfig,
    architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer)
  ) {
    super(config, architecturalMapping || GoCollector.defaultGoArchitecturalMapping);
  }
  
  /**
   * Default architectural mapping specifically for Go code structures
   * Maps Go code to Clean Architecture layers based on common Go conventions
   */
  private static defaultGoArchitecturalMapping(filePath: string): ArchitecturalLayer {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    // Common Go package naming that indicates architectural layer
    
    // Domain layer: entities, value objects, domain services, repositories interfaces
    if (
      normalizedPath.includes('/domain/') || 
      normalizedPath.includes('/entity/') || 
      normalizedPath.includes('/entities/') ||
      normalizedPath.includes('/model/') || 
      normalizedPath.includes('/models/') ||
      normalizedPath.includes('/valueobject/') || 
      normalizedPath.includes('/vo/') ||
      // Repository interfaces (not implementations) are part of domain
      (normalizedPath.includes('/repository/') && normalizedPath.includes('interface.go'))
    ) {
      return ArchitecturalLayer.DOMAIN;
    }
    
    // Use Case layer: application services, interactors, commands, queries
    else if (
      normalizedPath.includes('/usecase/') || 
      normalizedPath.includes('/usecases/') ||
      normalizedPath.includes('/application/') || 
      normalizedPath.includes('/app/') ||
      normalizedPath.includes('/interactor/') || 
      normalizedPath.includes('/service/') ||
      normalizedPath.includes('/command/') || 
      normalizedPath.includes('/query/') ||
      normalizedPath.includes('/usecase_test.go')
    ) {
      return ArchitecturalLayer.USE_CASE;
    }
    
    // Adapter layer: controllers, presenters, gateways, repository implementations
    else if (
      normalizedPath.includes('/adapter/') || 
      normalizedPath.includes('/adapters/') ||
      normalizedPath.includes('/interface/') || 
      normalizedPath.includes('/interfaces/') ||
      normalizedPath.includes('/api/') || 
      normalizedPath.includes('/handler/') || 
      normalizedPath.includes('/handlers/') ||
      normalizedPath.includes('/controller/') || 
      normalizedPath.includes('/controllers/') ||
      normalizedPath.includes('/presenter/') || 
      normalizedPath.includes('/presenters/') ||
      normalizedPath.includes('/gateway/') || 
      normalizedPath.includes('/gateways/') ||
      // Repository implementations are adapters
      (normalizedPath.includes('/repository/') && !normalizedPath.includes('interface.go'))
    ) {
      return ArchitecturalLayer.ADAPTER;
    }
    
    // Infrastructure layer: DB, frameworks, external services
    else if (
      normalizedPath.includes('/infrastructure/') || 
      normalizedPath.includes('/infra/') ||
      normalizedPath.includes('/datastore/') || 
      normalizedPath.includes('/db/') ||
      normalizedPath.includes('/database/') || 
      normalizedPath.includes('/persistence/') ||
      normalizedPath.includes('/framework/') || 
      normalizedPath.includes('/external/') ||
      normalizedPath.includes('/thirdparty/') || 
      normalizedPath.includes('/config/') ||
      normalizedPath.includes('/storage/') ||
      normalizedPath.includes('/client/') || 
      normalizedPath.includes('/clients/')
    ) {
      return ArchitecturalLayer.INFRASTRUCTURE;
    }
    
    // If we can't determine by path pattern, try to determine by file content
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for package name hints
        if (content.includes('package domain') || 
            content.includes('package entity') || 
            content.includes('package model')) {
          return ArchitecturalLayer.DOMAIN;
        }
        else if (content.includes('package usecase') || 
                content.includes('package application') || 
                content.includes('package service')) {
          return ArchitecturalLayer.USE_CASE;
        }
        else if (content.includes('package adapter') || 
                content.includes('package api') || 
                content.includes('package handler') ||
                content.includes('package controller')) {
          return ArchitecturalLayer.ADAPTER;
        }
        else if (content.includes('package infrastructure') || 
                content.includes('package infra') || 
                content.includes('package persistence') ||
                content.includes('package database')) {
          return ArchitecturalLayer.INFRASTRUCTURE;
        }
      }
    } catch (error) {
      // Ignore errors reading file
    }
    
    return ArchitecturalLayer.UNKNOWN;
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
    
    // Common Go test patterns
    const patterns = {
      testFunc: /func\s+(Test[a-zA-Z0-9_]+)\s*\(\s*t\s+\*testing\.T\s*\)/,
      subtestRun: /t\.Run\(\s*"([^"]+)"/,
      subtestRunF: /t\.Run\(\s*fmt\.Sprintf\(\s*"([^"]+)"/,
      benchmark: /func\s+(Benchmark[a-zA-Z0-9_]+)\s*\(\s*b\s+\*testing\.B\s*\)/,
      skip: /t\.(Skip|SkipNow)\(\)/,
      tableTestVar: /(var|const)?\s+(tests|testCases|cases|scenarios|testData|fixtures|examples|tt|tc)\s*:?=.*(struct|map|\[\]struct)/,
      tableTestType: /type\s+(testCase|TestCase|testData|fixture)\s+struct/,
      tableLoop: /for\s+(?:_\s*,\s*)?(\w+)\s*:?=\s*range\s+(tests|testCases|cases|scenarios|testData|fixtures|examples|tt|tc)/,
      tableIteration: /for\s+(?:i|idx|index).*;\s*(?:i|idx|index)\s*<\s*len\((tests|testCases|cases|scenarios|testData).*\)/,
      testifyAssert: /assert\.\w+\(.*[,)]$/,
      testifyRequire: /require\.\w+\(.*[,)]$/,
      run: /\.(Run|RunParallel)\(/,
      parallel: /\.Parallel\(\)/,
      testMain: /func\s+TestMain\s*\(\s*m\s+\*testing\.M\s*\)/,
      fatalError: /\.(Error|Errorf|Fatal|Fatalf|FailNow)\(/,
      conditionalAssertion: /if\s+(?:!|)(?:assert|require)\.\w+\(/,
      conditionalFailure: /if\s+(?:err|ok|result).*(?:!=|==).*\s*{\s*t\./,
      conditionalWithFunc: /if\s+!?(?:\w+\.)*(?:IsEqual|AreEqual|Matches|Contains|HasPrefix|HasSuffix)/,
      expectFunc: /expect\.\w+\(/
    };
    
    // Check if file contains table-driven tests
    const hasTableTests = content.includes('table-driven') || 
                       patterns.tableTestVar.test(content) ||
                       patterns.tableTestType.test(content) ||
                       patterns.tableLoop.test(content) ||
                       patterns.tableIteration.test(content);
    
    // Check if file uses testify
    const usesTestify = content.includes('github.com/stretchr/testify') ||
                      patterns.testifyAssert.test(content) ||
                      patterns.testifyRequire.test(content);
    
    // Check if file uses GoConvey
    const usesGoConvey = content.includes('github.com/smartystreets/goconvey') ||
                       content.includes('convey.Convey(') ||
                       content.includes('convey.So(');
                       
    // Check if file uses Gomega
    const usesGomega = content.includes('github.com/onsi/gomega') ||
                    content.includes('gomega.Expect(') ||
                    content.includes('Expect(');
                    
    // Build a test framework info object
    const testFrameworks = {
      usesTesting: true, // Always true for Go tests
      usesTestify,
      usesGoConvey,
      usesGomega,
      usesTableDriven: hasTableTests
    };
    
    // Process by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for TestMain function (setup function for the test package)
      if (patterns.testMain.test(line)) {
        const lineNumber = i + 1;
        testCases.push({
          name: 'TestMain',
          filePath,
          lineNumber,
          skipped: false
        });
        continue;
      }
      
      // Look for test functions (in Go, test functions start with Test and take *testing.T)
      if (patterns.testFunc.test(line)) {
        // Extract the test name
        const match = line.match(patterns.testFunc);
        if (match) {
          const testName = match[1];
          const lineNumber = i + 1;
          
          // Try to determine if test is skipped and if it has subtests
          let isSkipped = false;
          let hasSubtests = false;
          let isParallel = false;
          const subtests: { name: string, lineNum: number, hasAssertions: boolean }[] = [];
          let depth = 0;
          let j = i;
          
          // Look for t.Skip, t.Run within the function body
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
            
            // Check for skipped tests
            if (patterns.skip.test(bodyLine)) {
              isSkipped = true;
            }
            
            // Check for parallel tests
            if (patterns.parallel.test(bodyLine)) {
              isParallel = true;
            }
            
            // Check for subtests with simple strings
            const subtestMatch = bodyLine.match(patterns.subtestRun);
            if (subtestMatch) {
              hasSubtests = true;
              
              // Look ahead to find the end of this subtest to count assertions
              let subtestDepth = 0;
              let k = j;
              let foundOpenBrace = false;
              
              while (k < lines.length) {
                const subtestLine = lines[k].trim();
                
                // Skip until we find the opening brace
                if (!foundOpenBrace) {
                  if (subtestLine.includes('{')) {
                    foundOpenBrace = true;
                    subtestDepth++;
                  }
                } else {
                  if (subtestLine.includes('{')) {
                    subtestDepth++;
                  }
                  if (subtestLine.includes('}')) {
                    subtestDepth--;
                    if (subtestDepth === 0) {
                      break;
                    }
                  }
                }
                k++;
              }
              
              // Count assertions in this subtest
              const hasAssertions = this.countAssertions(content.substring(j, k), 0, k - j) > 0;
              
              subtests.push({
                name: subtestMatch[1],
                lineNum: j + 1,
                hasAssertions
              });
            }
            
            // Check for subtests with fmt.Sprintf
            const subtestFMatch = bodyLine.match(patterns.subtestRunF);
            if (subtestFMatch) {
              hasSubtests = true;
              subtests.push({
                name: `${subtestFMatch[1]} (formatted)`,
                lineNum: j + 1,
                hasAssertions: true // Assume it has assertions
              });
            }
            
            j++;
          }
          
          // Calculate assertion count for the main test
          const assertions = this.countAssertions(content, i, j);
          
          // Always add the parent test
          testCases.push({
            name: testName,
            filePath,
            lineNumber,
            skipped: isSkipped,
            assertions
          });
          
          // Add subtests if found
          subtests.forEach((subtest) => {
            testCases.push({
              name: `${testName}/${subtest.name}`,
              filePath,
              lineNumber: subtest.lineNum,
              skipped: isSkipped,
              assertions: subtest.hasAssertions ? 1 : 0 // Minimal estimate
            });
          });
          
          // If this is a table-driven test, extract the test cases
          if (hasTableTests) {
            // Look for table test variable and tests
            const testContent = content.substring(i, j);
            
            // Extract table test variable names
            let tableVarMatches: RegExpExecArray | null;
            const tableVarRegex = new RegExp(patterns.tableTestVar);
            const tableVarNames: string[] = [];
            
            while ((tableVarMatches = tableVarRegex.exec(testContent)) !== null) {
              if (tableVarMatches && tableVarMatches[2]) {
                tableVarNames.push(tableVarMatches[2]);
              }
            }
            
            // Look for specific test cases in the table
            if (tableVarNames.length > 0) {
              // First, check if there are named test cases (with string keys or name fields)
              const namedTestsRegex = new RegExp(`["']([^"']+)["']\\s*:\\s*{|name\\s*:\\s*["']([^"']+)["']|testName\\s*:\\s*["']([^"']+)["']|description\\s*:\\s*["']([^"']+)["']`, 'g');
              let namedTestMatch;
              const namedTests: string[] = [];
              
              const tableContent = testContent;
              while ((namedTestMatch = namedTestsRegex.exec(tableContent)) !== null) {
                const testName = namedTestMatch[1] || namedTestMatch[2] || namedTestMatch[3] || namedTestMatch[4];
                if (testName && !namedTests.includes(testName)) {
                  namedTests.push(testName);
                }
              }
              
              // If we found named test cases, add them
              if (namedTests.length > 0) {
                namedTests.forEach((tableCaseName, idx) => {
                  testCases.push({
                    name: `${testName}/table/${tableCaseName}`,
                    filePath,
                    lineNumber: lineNumber + 1 + idx, // Approximate line number
                    skipped: isSkipped
                  });
                });
              } else {
                // Otherwise, just note it's a table-driven test
                testCases.push({
                  name: `${testName} (table-driven)`,
                  filePath,
                  lineNumber,
                  skipped: isSkipped
                });
              }
            }
          }
        }
      }
      
      // Check for benchmark functions
      else if (patterns.benchmark.test(line)) {
        const match = line.match(patterns.benchmark);
        if (match) {
          const benchmarkName = match[1];
          const lineNumber = i + 1;
          
          // Find the end of the benchmark function
          let depth = 0;
          let j = i;
          
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
            j++;
          }
          
          // Check if this is a parameterized benchmark
          const hasBenchmarkParams = content.substring(i, j).includes('b.Run(');
          
          if (hasBenchmarkParams) {
            // Look for sub-benchmarks
            const subBenchRegex = /b\.Run\(\s*([^,]+),\s*/g;
            const benchContent = content.substring(i, j);
            let subBenchMatch;
            
            while ((subBenchMatch = subBenchRegex.exec(benchContent)) !== null) {
              let paramName = subBenchMatch[1].trim();
              
              // Handle different parameter formats
              if (paramName.startsWith('"') && paramName.endsWith('"')) {
                // String literal
                paramName = paramName.substring(1, paramName.length - 1);
              } else if (paramName.includes('fmt.Sprintf')) {
                // Formatted string, try to extract the format
                const fmtMatch = paramName.match(/fmt\.Sprintf\(\s*"([^"]+)"/);
                if (fmtMatch) {
                  paramName = `${fmtMatch[1]} (formatted)`;
                } else {
                  paramName = 'dynamic-name';
                }
              } else if (paramName.includes('.String()') || paramName.includes('String(')) {
                // String conversion
                paramName = 'string-converted';
              } else if (paramName.includes('strconv.Itoa(') || paramName.includes('strconv.FormatInt(')) {
                // Number conversion
                paramName = 'number-string';
              }
              
              testCases.push({
                name: `${benchmarkName}/${paramName}`,
                filePath,
                lineNumber: i + 1,
                skipped: false
              });
            }
          } else {
            // Simple benchmark
            testCases.push({
              name: benchmarkName,
              filePath,
              lineNumber,
              skipped: false
            });
          }
        }
      }
      
      // Check for helper functions that might be creating tests dynamically
      else if (line.includes('func ') && 
            (line.includes('testing.T') || line.includes('*testing.T')) && 
             !line.startsWith('func Test') && !line.startsWith('func Benchmark')) {
        // Look for functions that take testing.T as a parameter - these might be test helpers
        const match = line.match(/func\s+([a-zA-Z0-9_]+)\s*\(/);
        if (match) {
          const funcName = match[1];
          let foundAsHelper = false;
          
          // Check if this function is called from test functions
          for (let j = 0; j < lines.length; j++) {
            if (j === i) continue; // Skip the function definition itself
            
            const callLine = lines[j].trim();
            
            // Check for function being called in test functions
            if ((callLine.includes(`${funcName}(`) || callLine.includes(`${funcName} (`)) && 
                (content.substring(0, j).includes('func Test') || content.substring(0, j).includes('func Benchmark'))) {
              foundAsHelper = true;
              break;
            }
          }
          
          if (foundAsHelper) {
            // This is likely a test helper function
            testCases.push({
              name: `Helper: ${funcName}`,
              filePath,
              lineNumber: i + 1,
              skipped: false
            });
          }
        }
      }
    }
    
    return testCases;
  }
  
  /**
   * Count assertions in a Go test function
   */
  private countAssertions(content: string, startLine: number, endLine: number): number {
    // Define patterns for assertions
    const assertionPatterns = [
      // Testify patterns
      /assert\.\w+\(.*[,)]$/, // testify assertions
      /require\.\w+\(.*[,)]$/, // testify requirements
      
      // Standard Go testing
      /if\s+(?:err|ok)\s*(?:!=|==).*{\s*t\.(?:Error|Errorf|Fatal|Fatalf)/, // if err != nil { t.Error() }
      /t\.(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\(/, // t.Error(), t.Fatal()
      /t\.\w+\(.*,.*\)/, // Other t.X() calls with multiple args

      // Conditional assertions
      /if\s+(?:!|)(?:assert|require)\.\w+\(/, // if !assert.Equal() or if assert.Equal()
      /if\s+(?:err|ok|result).*(?:!=|==).*\s*{\s*t\./, // if err != nil { t. ...
      /if\s+!?(?:\w+\.)*(?:IsEqual|AreEqual|Matches|Contains|HasPrefix|HasSuffix)/, // Custom assertion helpers
      
      // GoConvey patterns
      /(?:convey\.)?So\(.*,.*\)/, // So(actual, ShouldEqual, expected)
      /convey\.Convey\(.*,.*\)/, // Convey("description", t, func() { ... })
      
      // Gomega patterns
      /Expect\(.*\)\.To/, // Expect(value).To(Equal(expected))
      /Expect\(.*\)\.NotTo/, // Expect(value).NotTo(Equal(expected))
      
      // Custom matchers and assertions
      /ExpectThat\(.*\)/, // Custom wrapper for Expect
      /AssertThat\(.*\)/, // Custom wrapper for assertions
      /Should(?:Equal|NotEqual|BeNil|NotBeNil|BeTrue|BeFalse)\(.*\)/, // Common assertion patterns
    ];
    
    // For content that's passed directly (not by line number)
    let linesToCheck: string[];
    if (typeof content === 'string' && (startLine === 0 || startLine) && endLine) {
      // If we have line numbers, slice the content
      linesToCheck = content.split('\n').slice(startLine, endLine);
    } else {
      // Otherwise, use the whole content
      linesToCheck = content.split('\n');
    }
    
    let count = 0;
    
    for (const line of linesToCheck) {
      const trimmedLine = line.trim();
      
      // Skip comments
      if (trimmedLine.startsWith('//')) continue;
      
      // Check each pattern
      for (const pattern of assertionPatterns) {
        if (pattern.test(trimmedLine)) {
          count++;
          break; // Only count one assertion per line
        }
      }
    }
    
    return count || 0; // Return 0 if no assertions found, not undefined
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
    // Look for coverage files in multiple locations
    const possibleCoverageFiles = [
      // Standard go coverage output
      path.join(this.config.projectRoot, 'coverage.out'),
      
      // Our unified test results directory
      path.join(this.config.projectRoot, 'test-results/go/coverage'),
      
      // Custom coverage directory that might be set in coveragePaths config
      ...(this.config.coveragePaths || []).map(
        coveragePath => path.resolve(this.config.projectRoot, coveragePath)
      )
    ];

    // Try to find a coverage file
    let coverageFiles: string[] = [];
    for (const filePath of possibleCoverageFiles) {
      if (fs.existsSync(filePath)) {
        // If it's a directory, look for .coverage.out files
        if (fs.statSync(filePath).isDirectory()) {
          const filesInDir = fs.readdirSync(filePath)
            .filter(file => file.endsWith('.coverage.out') || file === 'coverage.out')
            .map(file => path.join(filePath, file));
            
          coverageFiles = coverageFiles.concat(filesInDir);
        } else {
          // It's a file, use it directly
          coverageFiles.push(filePath);
        }
      }
    }

    // Try all available coverage files, starting with the most recent
    if (coverageFiles.length > 0) {
      // Sort by modification time, most recent first
      coverageFiles.sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtimeMs - statA.mtimeMs;
      });
      
      for (const coverageFile of coverageFiles) {
        try {
          // First try to parse the file content directly
          const fileContent = fs.readFileSync(coverageFile, 'utf-8');
          const coverageInfo = this.parseCoverageOutput(fileContent);
          if (coverageInfo) {
            // Add the source file to the info
            coverageInfo.source = coverageFile;
            return coverageInfo;
          }
        } catch (error) {
          console.warn(`Error parsing coverage file ${coverageFile}:`, error);
        }
      }
      
      // If direct parsing fails for all files, try using go tool cover
      for (const coverageFile of coverageFiles) {
        try {
          const coverageOutput = execSync(`go tool cover -func=${coverageFile}`, { encoding: 'utf-8' });
          const funcCoverage = this.parseFuncCoverageOutput(coverageOutput);
          if (funcCoverage) {
            // Add the source file to the info
            funcCoverage.source = coverageFile;
            return funcCoverage;
          }
        } catch (error) {
          console.warn(`Failed to run go tool cover with ${coverageFile}:`, error);
        }
      }
      
      // If all else fails, try to generate and parse HTML reports
      for (const coverageFile of coverageFiles) {
        try {
          // Create a temporary file for the HTML report
          const tempHtmlReport = path.join(
            this.config.projectRoot, 
            'test-results/go/coverage/temp-report.html'
          );
          
          // Create directory if it doesn't exist
          const dir = path.dirname(tempHtmlReport);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Generate the HTML report
          execSync(`go tool cover -html=${coverageFile} -o ${tempHtmlReport}`, { 
            encoding: 'utf-8' 
          });
          
          // Extract coverage from the HTML
          if (fs.existsSync(tempHtmlReport)) {
            const htmlContent = fs.readFileSync(tempHtmlReport, 'utf-8');
            const coverageInfo = this.parseHtmlCoverageReport(htmlContent, coverageFile);
            if (coverageInfo) {
              return coverageInfo;
            }
          }
        } catch (error) {
          console.warn(`Failed to generate HTML coverage report from ${coverageFile}:`, error);
        }
      }
      
      // Last resort: try running go test with coverage directly
      try {
        console.log('Attempting to generate fresh Go coverage data...');
        const goCoverageFile = path.join(
          this.config.projectRoot, 
          'test-results/go/coverage/fresh-coverage.out'
        );
        
        // Create directory if it doesn't exist
        const dir = path.dirname(goCoverageFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Try to find Go packages to test
        const goModPath = path.join(this.config.projectRoot, 'go.mod');
        if (fs.existsSync(goModPath)) {
          // Run go test with coverage
          execSync(`cd ${this.config.projectRoot} && go test -covermode=atomic -coverprofile=${goCoverageFile} ./...`, { 
            encoding: 'utf-8',
            timeout: 60000 // 1 minute timeout
          });
          
          if (fs.existsSync(goCoverageFile)) {
            // Parse the fresh coverage file
            const fileContent = fs.readFileSync(goCoverageFile, 'utf-8');
            const coverageInfo = this.parseCoverageOutput(fileContent);
            if (coverageInfo) {
              coverageInfo.source = goCoverageFile;
              return coverageInfo;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to generate fresh coverage data:', error);
      }
    }
    
    // If we reach here, no valid coverage data was found
    console.warn('No valid Go coverage data found. Using estimates.');
    return null;
  }
  
  /**
   * Parse HTML coverage reports from go tool cover -html
   */
  private parseHtmlCoverageReport(htmlContent: string, sourceFile: string): any {
    // Extract total coverage percentage
    const coverageMatch = htmlContent.match(/coverage: ([0-9.]+)% of statements/);
    if (!coverageMatch) {
      return null;
    }
    
    const coveragePercentage = parseFloat(coverageMatch[1]);
    
    // Try to extract more granular data
    const fileCoverage: Record<string, {
      statements: number;
      covered: number;
      percentage: number;
    }> = {};
    
    // Extract per-file coverage if available
    const fileCoverageRegex = /<option value="file[0-9]+">(.*?)<\/option>/g;
    let match;
    while ((match = fileCoverageRegex.exec(htmlContent)) !== null) {
      const filePath = match[1];
      if (filePath) {
        fileCoverage[filePath] = {
          statements: 0,
          covered: 0,
          percentage: 0
        };
      }
    }
    
    // If we have file coverage data, assume each file has equal coverage for now
    if (Object.keys(fileCoverage).length > 0) {
      Object.keys(fileCoverage).forEach(file => {
        // Estimate statements based on file size
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n').length;
          const estimatedStatements = Math.round(lines * 0.4); // Rough estimate: 40% of lines are statements
          
          fileCoverage[file].statements = estimatedStatements;
          fileCoverage[file].covered = Math.round(estimatedStatements * (coveragePercentage / 100));
          fileCoverage[file].percentage = coveragePercentage;
        } catch (error) {
          // If we can't read the file, use default values
          fileCoverage[file].statements = 100;
          fileCoverage[file].covered = Math.round(100 * (coveragePercentage / 100));
          fileCoverage[file].percentage = coveragePercentage;
        }
      });
    }
    
    // Count total statements and covered
    const totalStatements = Object.values(fileCoverage).reduce((sum, file) => sum + file.statements, 0) || 100;
    const coveredStatements = Object.values(fileCoverage).reduce((sum, file) => sum + file.covered, 0) || 
                             Math.round(totalStatements * (coveragePercentage / 100));
    
    // Count functions - use a rough estimate based on file content
    const totalFunctions = Object.keys(fileCoverage).length * 5; // Assuming average 5 functions per file
    const coveredFunctions = Math.round(totalFunctions * (coveragePercentage / 100));
    
    return {
      source: sourceFile,
      lines: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: coveragePercentage
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: coveragePercentage
      },
      fileCoverage
    };
  }
  
  /**
   * Parse the func coverage output from go tool cover
   */
  private parseFuncCoverageOutput(output: string): any {
    const lines = output.split('\n');
    
    // Find the total coverage line
    const totalLine = lines.find(line => line.includes('total:'));
    if (!totalLine) {
      return null;
    }
    
    // Extract coverage percentage
    const match = totalLine.match(/([0-9.]+)%/);
    if (!match) {
      return null;
    }
    
    const coveragePercentage = parseFloat(match[1]);
    
    // Extract per-file and per-function coverage
    const fileCoverage: Record<string, { 
      functions: Record<string, number>,
      totalLines: number,
      coveredLines: number,
      percentage: number
    }> = {};
    
    const currentFile = '';
    let totalLines = 0;
    let coveredLines = 0;
    
    lines.forEach(line => {
      const fileMatch = line.match(/([^:]+):\s+([a-zA-Z0-9_]+)\s+(\d+\.\d+)%/);
      if (fileMatch) {
        const [_, filePath, funcName, percentage] = fileMatch;
        
        if (!fileCoverage[filePath]) {
          fileCoverage[filePath] = {
            functions: {},
            totalLines: 0,
            coveredLines: 0,
            percentage: 0
          };
        }
        
        const coverPercent = parseFloat(percentage);
        fileCoverage[filePath].functions[funcName] = coverPercent;
        
        // Estimate lines from function coverage
        const estimatedLines = 10; // Approximate lines per function
        fileCoverage[filePath].totalLines += estimatedLines;
        fileCoverage[filePath].coveredLines += (estimatedLines * coverPercent / 100);
        
        // Update totals
        totalLines += estimatedLines;
        coveredLines += (estimatedLines * coverPercent / 100);
      }
    });
    
    // Calculate percentages for each file
    Object.keys(fileCoverage).forEach(file => {
      if (fileCoverage[file].totalLines > 0) {
        fileCoverage[file].percentage = 
          (fileCoverage[file].coveredLines / fileCoverage[file].totalLines) * 100;
      }
    });
    
    // Create the result
    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: coveragePercentage
      },
      functions: {
        total: Object.values(fileCoverage).reduce(
          (sum, file) => sum + Object.keys(file.functions).length, 0
        ),
        covered: Object.values(fileCoverage).reduce(
          (sum, file) => sum + Object.entries(file.functions)
            .filter(([_, coverage]) => coverage > 0).length, 
          0
        ),
        percentage: coveragePercentage // Using overall coverage as an approximation
      },
      fileCoverage
    };
  }
  
  /**
   * Parse the raw coverage output from the coverage file
   */
  private parseCoverageOutput(fileContent: string): any {
    try {
      // Coverage files start with mode: set/count/atomic
      if (!fileContent.startsWith('mode:')) {
        return null;
      }
      
      const lines = fileContent.split('\n');
      if (lines.length <= 1) {
        return null;
      }
      
      // Skip the mode line
      const coverageLines = lines.slice(1).filter(line => line.trim());
      
      // Create a map to store file coverage
      const fileCoverage: Record<string, {
        blocks: number;
        coveredBlocks: number;
        statements: number;
        coveredStatements: number;
        percentage: number;
      }> = {};
      
      // Total coverage counters
      let totalBlocks = 0;
      let coveredBlocks = 0;
      let totalStatements = 0;
      let coveredStatements = 0;
      
      // Process each coverage line
      coverageLines.forEach(line => {
        // Format: file:startLine.startCol,endLine.endCol numStatements count
        const parts = line.split(' ');
        if (parts.length !== 3) {
          return;
        }
        
        const [fileRange, stmtStr, countStr] = parts;
        const colonIndex = fileRange.indexOf(':');
        if (colonIndex < 0) {
          return;
        }
        
        const filePath = fileRange.substring(0, colonIndex);
        const statements = parseInt(stmtStr, 10);
        const count = parseInt(countStr, 10);
        
        // Update file coverage
        if (!fileCoverage[filePath]) {
          fileCoverage[filePath] = {
            blocks: 0,
            coveredBlocks: 0,
            statements: 0,
            coveredStatements: 0,
            percentage: 0
          };
        }
        
        fileCoverage[filePath].blocks++;
        fileCoverage[filePath].statements += statements;
        
        if (count > 0) {
          fileCoverage[filePath].coveredBlocks++;
          fileCoverage[filePath].coveredStatements += statements;
        }
        
        // Update totals
        totalBlocks++;
        totalStatements += statements;
        
        if (count > 0) {
          coveredBlocks++;
          coveredStatements += statements;
        }
      });
      
      // Calculate percentages for each file
      Object.keys(fileCoverage).forEach(file => {
        if (fileCoverage[file].statements > 0) {
          fileCoverage[file].percentage = 
            (fileCoverage[file].coveredStatements / fileCoverage[file].statements) * 100;
        }
      });
      
      // Calculate overall percentage
      const overallPercentage = totalStatements > 0 
        ? (coveredStatements / totalStatements) * 100 
        : 0;
      
      // Create result with file detail
      return {
        lines: {
          total: totalStatements,
          covered: coveredStatements,
          percentage: overallPercentage
        },
        functions: {
          total: totalBlocks,
          covered: coveredBlocks,
          percentage: (coveredBlocks / totalBlocks) * 100 || 0
        },
        fileCoverage
      };
    } catch (error) {
      console.warn('Error parsing coverage output:', error);
      return null;
    }
  }
}