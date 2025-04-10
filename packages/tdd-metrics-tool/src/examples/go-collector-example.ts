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
import { GoCollector } from '../collectors/go-collector';
import { CollectorConfig, LanguageType } from '../models/types';

/**
 * Example script showing how to use the enhanced Go collector
 * to analyze Go test files and coverage
 */
async function main() {
  const projectRoot = process.cwd();
  
  // Create configuration for the collector
  const config: CollectorConfig = {
    projectRoot,
    testPaths: [
      path.join(projectRoot, 'tests/unit/go'),
      path.join(projectRoot, 'internal/go/*/test')
    ],
    sourcePaths: [
      path.join(projectRoot, 'internal/go'),
      path.join(projectRoot, 'cmd')
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
  
  console.log('Creating Go Collector...');
  const collector = new GoCollector(config);
  
  console.log('Collecting data from Go tests...');
  const coverageData = await collector.collectData();
  
  console.log('Data collection completed.');
  
  // Display some information about what was found
  console.log(`Found ${coverageData.testFiles.length} test files and ${coverageData.sourceFiles.length} source files.`);
  
  // Count total test cases
  const totalTestCases = coverageData.testFiles.reduce(
    (sum, file) => sum + file.testCases.length, 0
  );
  console.log(`Total test cases: ${totalTestCases}`);
  
  // Output coverage information
  console.log('\nCoverage Summary:');
  console.log(`Line Coverage: ${coverageData.coverage.lines.percentage.toFixed(2)}% (${coverageData.coverage.lines.covered}/${coverageData.coverage.lines.total})`);
  console.log(`Function Coverage: ${coverageData.coverage.functions.percentage.toFixed(2)}% (${coverageData.coverage.functions.covered}/${coverageData.coverage.functions.total})`);
  
  // Output coverage by architectural layer
  console.log('\nCoverage by Architectural Layer:');
  Object.entries(coverageData.layerCoverage).forEach(([layer, coverage]) => {
    console.log(`- ${layer}: ${coverage.lines.percentage.toFixed(2)}% lines, ${coverage.functions.percentage.toFixed(2)}% functions`);
  });
  
  // Save the results to a JSON file
  const resultPath = path.join(projectRoot, 'test-results/go/metrics-report.json');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(resultPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(
    resultPath,
    JSON.stringify(coverageData, null, 2)
  );
  
  console.log(`\nSaved detailed report to: ${resultPath}`);
}

// Run the example
main().catch(error => {
  console.error('Error in Go collector example:', error);
  process.exit(1);
});