/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'test-results/ui-workflow-tests');

/**
 * Interface for provider combination test results
 */
interface ProviderCombinationResult {
  source: string;
  target: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  errorMessage?: string;
  scenariosPassed?: number;
  scenariosTotal?: number;
  reportPath?: string;
}

/**
 * Run UI workflow tests for all provider combinations
 */
export async function runAllProviderCombinationTests(options: {
  parallel?: boolean; 
  maxWorkers?: number;
  tags?: string[];
} = {}): Promise<ProviderCombinationResult[]> {
  // Define provider combinations to test
  const combinations = [
    { source: 'zephyr', target: 'qtest' },
    { source: 'qtest', target: 'zephyr' },
    { source: 'zephyr', target: 'testrail' },
    { source: 'testrail', target: 'qtest' },
    { source: 'hp-alm', target: 'qtest' },
    { source: 'qtest', target: 'hp-alm' },
    { source: 'jama', target: 'qtest' },
    { source: 'zephyr', target: 'azure-devops' },
    { source: 'visure', target: 'zephyr' },
    { source: 'rally', target: 'qtest' }
  ];

  // Create the results directory if it doesn't exist
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Set up options
  const { parallel = false, maxWorkers = 4, tags = ['@ui', '@workflow'] } = options;
  const results: ProviderCombinationResult[] = [];

  if (parallel) {
    // Run tests in parallel with worker limit
    const batches = [];
    for (let i = 0; i < combinations.length; i += maxWorkers) {
      batches.push(combinations.slice(i, i + maxWorkers));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(combo => runTestForCombination(combo, tags));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
  } else {
    // Run tests sequentially
    for (const combo of combinations) {
      const result = await runTestForCombination(combo, tags);
      results.push(result);
    }
  }

  // Generate summary report
  generateSummaryReport(results);

  return results;
}

/**
 * Run tests for a specific provider combination
 */
async function runTestForCombination(
  combination: { source: string; target: string }, 
  tags: string[]
): Promise<ProviderCombinationResult> {
  const { source, target } = combination;
  console.log(`Running tests for combination: ${source} → ${target}`);
  
  const startTime = Date.now();
  const reportName = `${source}-to-${target}-report`;
  const reportPath = path.join(RESULTS_DIR, `${reportName}.json`);
  
  try {
    const tagArgs = tags.map(tag => `--tags ${tag}`).join(' ');
    const cucumberArgs = [
      './node_modules/.bin/cucumber-js',
      `${tagArgs}`,
      `--world-parameters '{"sourceProvider":"${source}","targetProvider":"${target}"}'`,
      '--format json:' + reportPath,
      'tests/acceptance/features/ui/provider-workflows.feature'
    ];
    
    const command = cucumberArgs.join(' ');
    
    const result = await new Promise<{ code: number, stdout: string, stderr: string }>((resolve, reject) => {
      const proc = spawn('npx', cucumberArgs, { 
        shell: true, 
        cwd: PROJECT_ROOT,
        env: { ...process.env, SOURCE_PROVIDER: source, TARGET_PROVIDER: target }
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
      
      proc.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      
      proc.on('error', (err) => {
        reject(err);
      });
    });
    
    const duration = Date.now() - startTime;
    
    if (result.code === 0) {
      return {
        source,
        target,
        status: 'success',
        duration,
        reportPath
      };
    } else {
      return {
        source,
        target,
        status: 'failed',
        duration,
        errorMessage: result.stderr || `Process exited with code ${result.code}`,
        reportPath
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      source,
      target,
      status: 'failed',
      duration,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate a summary report of all test runs
 */
function generateSummaryReport(results: ProviderCombinationResult[]): void {
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  
  const summaryReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      successRate: `${Math.round((successCount / results.length) * 100)}%`
    },
    results: results.map(result => ({
      combination: `${result.source} → ${result.target}`,
      status: result.status,
      duration: `${Math.round(result.duration / 1000)}s`,
      errorMessage: result.errorMessage
    }))
  };
  
  const summaryPath = path.join(RESULTS_DIR, 'summary-report.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));
  
  console.log('\nTest Run Summary:');
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Success Rate: ${summaryReport.summary.successRate}`);
  console.log(`Full report: ${summaryPath}`);
}

/**
 * CLI entry point for running the tests directly
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const parallel = args.includes('--parallel');
  const maxWorkers = args.includes('--max-workers') 
    ? Number(args[args.indexOf('--max-workers') + 1]) 
    : 4;
  
  runAllProviderCombinationTests({ parallel, maxWorkers })
    .then(results => {
      const failCount = results.filter(r => r.status === 'failed').length;
      process.exit(failCount === 0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Error running tests:', err);
      process.exit(1);
    });
}