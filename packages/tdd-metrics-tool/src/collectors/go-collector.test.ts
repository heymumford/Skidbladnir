/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as path from 'path';
import * as fs from 'fs';
import { GoCollector } from './go-collector';
import { CollectorConfig } from '../models/types';

describe('GoCollector', () => {
  // Helper function to create a collector with test config
  function createTestCollector(projectRoot: string = process.cwd()): GoCollector {
    const config: CollectorConfig = {
      projectRoot,
      testPaths: [
        path.join(projectRoot, 'tests/unit/go'),
        path.join(projectRoot, 'internal/go/*/test')
      ],
      coveragePaths: [
        path.join(projectRoot, 'test-results/go/coverage')
      ],
      testResultPaths: [
        path.join(projectRoot, 'test-results/go')
      ],
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**'
      ],
      collectCodeCoverage: true,
    };
    
    return new GoCollector(config);
  }
  
  describe('Test discovery', () => {
    it('should identify Go test files correctly', async () => {
      const collector = createTestCollector();
      // Using a protected method via any cast
      const isTestFile = (collector as any).isTestFile.bind(collector);
      
      expect(isTestFile('test_file.go')).toBe(false);
      expect(isTestFile('file_test.go')).toBe(true);
      expect(isTestFile('TEST_FILE.GO')).toBe(false);
      expect(isTestFile('FILE_TEST.GO')).toBe(true);
    });
  });
  
  describe('Test case extraction', () => {
    it('should extract test cases from Go test content', () => {
      const collector = createTestCollector();
      const extractGoTestCases = (collector as any).extractGoTestCases.bind(collector);
      
      const testContent = `
package test

import (
  "testing"
)

func TestSimple(t *testing.T) {
  if 1 != 1 {
    t.Error("Math is broken")
  }
}

func TestWithSubtests(t *testing.T) {
  t.Run("SubtestOne", func(t *testing.T) {
    if true != true {
      t.Error("Logic is broken")
    }
  })
  
  t.Run("SubtestTwo", func(t *testing.T) {
    if false != false {
      t.Error("Logic is really broken")
    }
  })
}

func BenchmarkSomething(b *testing.B) {
  for i := 0; i < b.N; i++ {
    // Do something
  }
}

func TestTableDriven(t *testing.T) {
  tests := []struct {
    name  string
    input int
    want  int
  }{
    {"positive", 1, 1},
    {"negative", -1, -1},
    {"zero", 0, 0},
  }
  
  for _, tc := range tests {
    t.Run(tc.name, func(t *testing.T) {
      if tc.input != tc.want {
        t.Errorf("got %d, want %d", tc.input, tc.want)
      }
    })
  }
}
`;
      
      const testCases = extractGoTestCases(testContent, '/path/to/test.go');
      
      // Check that we found the main tests
      expect(testCases.length).toBeGreaterThan(0);
      
      // We should have the parent tests
      const testNames = testCases.map(tc => tc.name);
      expect(testNames).toContain('TestSimple');
      expect(testNames).toContain('TestWithSubtests');
      expect(testNames).toContain('BenchmarkSomething');
      expect(testNames).toContain('TestTableDriven');
      
      // And the subtests
      expect(testNames).toContain('TestWithSubtests/SubtestOne');
      expect(testNames).toContain('TestWithSubtests/SubtestTwo');
      
      // And the table-driven test cases
      expect(testNames).toContain('TestTableDriven/positive');
      expect(testNames).toContain('TestTableDriven/negative');
      expect(testNames).toContain('TestTableDriven/zero');
    });
  });
  
  describe('Test assertion counting', () => {
    it('should count assertions in Go test functions', () => {
      const collector = createTestCollector();
      const countAssertions = (collector as any).countAssertions.bind(collector);
      
      const testContent = `
      if err != nil {
        t.Error("Got an error")
      }
      
      if result != expected {
        t.Errorf("Expected %v, got %v", expected, result)
      }
      
      assert.Equal(t, expected, result)
      require.NoError(t, err)
      
      if !assert.Equal(t, expected, result) {
        return
      }
      `;
      
      const assertionCount = countAssertions(testContent, 0, testContent.split('\n').length);
      
      // Should find 5 assertions
      expect(assertionCount).toBe(5);
    });
  });
  
  describe('Coverage parsing', () => {
    // This is more of an integration test, will run conditionally if coverage data exists
    it('should try to parse Go coverage data if available', async () => {
      // Only run this test if we have coverage data
      const testResultsDir = path.join(process.cwd(), 'test-results/go/coverage');
      const hasTestResults = fs.existsSync(testResultsDir);
      
      if (!hasTestResults) {
        console.log('Skipping coverage parsing test - no Go coverage data found');
        return;
      }
      
      const collector = createTestCollector();
      const parseGoCoverage = (collector as any).parseGoCoverage.bind(collector);
      
      const coverageData = parseGoCoverage();
      
      // If coverage data is found, validate the structure
      if (coverageData) {
        expect(coverageData.lines).toBeDefined();
        expect(coverageData.functions).toBeDefined();
        expect(typeof coverageData.lines.percentage).toBe('number');
        expect(typeof coverageData.functions.percentage).toBe('number');
      }
    });
  });
  
  describe('Architectural mapping', () => {
    it('should map Go files to architectural layers correctly', () => {
      const collector = createTestCollector();
      // Access the static method
      const defaultMapping = (GoCollector as any).defaultGoArchitecturalMapping;
      
      // Test domain layer
      expect(defaultMapping('/path/to/domain/entity.go')).toBe('domain');
      expect(defaultMapping('/path/to/models/user.go')).toBe('domain');
      expect(defaultMapping('/path/to/valueobject/email.go')).toBe('domain');
      
      // Test use case layer
      expect(defaultMapping('/path/to/usecase/create_user.go')).toBe('use-case');
      expect(defaultMapping('/path/to/application/services/auth_service.go')).toBe('use-case');
      
      // Test adapter layer
      expect(defaultMapping('/path/to/api/handlers/user_handler.go')).toBe('adapter');
      expect(defaultMapping('/path/to/controllers/auth_controller.go')).toBe('adapter');
      
      // Test infrastructure layer
      expect(defaultMapping('/path/to/infrastructure/persistence/user_repository.go')).toBe('infrastructure');
      expect(defaultMapping('/path/to/db/postgres.go')).toBe('infrastructure');
    });
  });
  
  describe('Integration test', () => {
    // This is a larger integration test to verify the entire collector works
    // It's conditional because not all environments will have Go code
    it('should successfully collect data for Go code if available', async () => {
      // Only run this test if we have Go test files
      const hasGoTests = fs.existsSync(path.join(process.cwd(), 'tests/unit/go')) ||
                        fs.existsSync(path.join(process.cwd(), 'internal/go'));
      
      if (!hasGoTests) {
        console.log('Skipping integration test - no Go code found');
        return;
      }
      
      const collector = createTestCollector();
      const coverageData = await collector.collectData();
      
      // Basic checks on the returned data structure
      expect(coverageData).toBeDefined();
      expect(coverageData.sourceFiles).toBeDefined();
      expect(coverageData.testFiles).toBeDefined();
      expect(coverageData.coverage).toBeDefined();
      expect(coverageData.layerCoverage).toBeDefined();
      
      // If we found any test files, assert things about them
      if (coverageData.testFiles.length > 0) {
        const testFile = coverageData.testFiles[0];
        expect(testFile.filename).toBeDefined();
        expect(testFile.language).toBe('go');
        expect(testFile.testCases).toBeDefined();
        expect(Array.isArray(testFile.testCases)).toBe(true);
      }
    });
  });
});