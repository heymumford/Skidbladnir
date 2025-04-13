/**
 * build-test-helper.js - Helper for generating and running build tests
 *
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const { mkdir, writeFile, readFile } = require('fs').promises;

// Configuration
const TEST_DIR = path.join(__dirname, '../../test-results/build-tests');
const COMBINATIONS_FILE = path.join(__dirname, 'test-combinations.json');
const MAX_TESTS_DEFAULT = 1000;
const PARALLEL_DEFAULT = 8;

// Parameter definitions for pairwise testing
const PARAMETERS = {
  env: ['dev', 'qa', 'prod'],
  components: ['typescript', 'python', 'go', 'all'],
  container: ['docker', 'podman'],
  test: ['unit', 'integration', 'all', 'none'],
  coverage: ['80', '90', '95', '100'],
  ui: ['true', 'false'],
  'with-mocks': ['true', 'false'],
  debug: ['true', 'false'],
  push: ['true', 'false'],
  parallel: ['true', 'false'],
  ci: ['true', 'false'],
  'skip-validation': ['true', 'false'],
  'skip-linting': ['true', 'false']
};

// Known invalid combinations
const INVALID_COMBINATIONS = [
  // Production builds require tests
  { env: 'prod', test: 'none' },
  // Production builds should not have both debug and ci mode
  { env: 'prod', debug: 'true', ci: 'true' },
];

/**
 * Generate all possible parameter combinations
 * @returns {Array<Object>} Array of parameter combinations
 */
function generateAllCombinations() {
  let combinations = [{}];

  Object.entries(PARAMETERS).forEach(([param, values]) => {
    const newCombinations = [];
    combinations.forEach(combination => {
      values.forEach(value => {
        newCombinations.push({
          ...combination,
          [param]: value
        });
      });
    });
    combinations = newCombinations;
  });

  // Filter out invalid combinations
  combinations = combinations.filter(combination => !isInvalidCombination(combination));

  return combinations;
}

/**
 * Check if a combination matches any invalid pattern
 * @param {Object} combination Parameter combination to check
 * @returns {boolean} True if combination is invalid
 */
function isInvalidCombination(combination) {
  return INVALID_COMBINATIONS.some(invalid => {
    return Object.entries(invalid).every(([key, value]) => 
      combination[key] === value
    );
  });
}

/**
 * Generate a representative subset using pairwise testing
 * @param {number} maxTests Maximum number of tests to generate
 * @returns {Array<Object>} Array of parameter combinations
 */
function generatePairwiseCombinations(maxTests = MAX_TESTS_DEFAULT) {
  // This is a simplistic implementation of pairwise testing
  const pairs = new Set();
  const selectedCombinations = [];
  
  // Generate all possible pairs
  Object.entries(PARAMETERS).forEach(([param1, values1], i) => {
    Object.entries(PARAMETERS).forEach(([param2, values2], j) => {
      if (i >= j) return; // Skip duplicate pairs and self pairs
      
      values1.forEach(val1 => {
        values2.forEach(val2 => {
          pairs.add(JSON.stringify({ 
            param1, param2, val1, val2 
          }));
        });
      });
    });
  });
  
  const allCombinations = generateAllCombinations();
  const totalPairs = pairs.size;
  const coveredPairs = new Set();
  
  // Helper to calculate how many new pairs a combination would cover
  function getUncoveredPairsCount(combination) {
    let count = 0;
    
    Object.keys(combination).forEach((param1, i) => {
      Object.keys(combination).forEach((param2, j) => {
        if (i >= j) return; // Skip duplicate pairs and self pairs
        
        const pair = JSON.stringify({
          param1,
          param2,
          val1: combination[param1],
          val2: combination[param2]
        });
        
        if (!coveredPairs.has(pair)) {
          count++;
        }
      });
    });
    
    return count;
  }
  
  // Helper to update covered pairs
  function updateCoveredPairs(combination) {
    Object.keys(combination).forEach((param1, i) => {
      Object.keys(combination).forEach((param2, j) => {
        if (i >= j) return; // Skip duplicate pairs and self pairs
        
        const pair = JSON.stringify({
          param1,
          param2,
          val1: combination[param1],
          val2: combination[param2]
        });
        
        coveredPairs.add(pair);
      });
    });
  }
  
  // Keep selecting combinations until we've covered all pairs or reached maxTests
  while (coveredPairs.size < totalPairs && selectedCombinations.length < maxTests) {
    // Find the combination that covers the most new pairs
    let bestCombination = null;
    let bestCount = -1;
    
    for (const combination of allCombinations) {
      const count = getUncoveredPairsCount(combination);
      if (count > bestCount) {
        bestCount = count;
        bestCombination = combination;
      }
    }
    
    // If we can't cover any more pairs, break
    if (bestCount === 0) break;
    
    // Add the best combination and update covered pairs
    selectedCombinations.push(bestCombination);
    updateCoveredPairs(bestCombination);
    
    // Remove the selected combination from consideration
    const index = allCombinations.findIndex(c => c === bestCombination);
    if (index !== -1) {
      allCombinations.splice(index, 1);
    }
  }
  
  console.log(`Generated ${selectedCombinations.length} test cases`);
  console.log(`Covered ${coveredPairs.size} out of ${totalPairs} parameter pairs`);
  console.log(`Coverage: ${(coveredPairs.size / totalPairs * 100).toFixed(2)}%`);
  
  return selectedCombinations;
}

/**
 * Format a parameter combination as a command line argument string
 * @param {Object} combination Parameter combination
 * @returns {string} Command line arguments
 */
function formatAsBashCommand(combination) {
  return Object.entries(combination)
    .map(([key, value]) => `--${key}=${value}`)
    .join(' ');
}

/**
 * Write test combinations to a file
 * @param {Array<Object>} combinations Parameter combinations
 * @param {string} outputFile Path to output file
 */
async function writeTestCombinations(combinations, outputFile = COMBINATIONS_FILE) {
  try {
    await mkdir(path.dirname(outputFile), { recursive: true });
    
    const formattedCombinations = combinations.map(formatAsBashCommand);
    await writeFile(
      outputFile, 
      formattedCombinations.join('\n'), 
      'utf8'
    );
    
    console.log(`Wrote ${combinations.length} test combinations to ${outputFile}`);
  } catch (error) {
    console.error(`Error writing test combinations: ${error.message}`);
    throw error;
  }
}

/**
 * Generate test combinations and save to file
 * @param {Object} options Generation options
 * @param {number} options.maxTests Maximum number of tests to generate
 * @param {string} options.outputFile Path to output file
 * @param {boolean} options.usePairwise Whether to use pairwise testing
 */
async function generateTestCombinations({ 
  maxTests = MAX_TESTS_DEFAULT, 
  outputFile = COMBINATIONS_FILE,
  usePairwise = true
}) {
  console.log(`Generating ${usePairwise ? 'pairwise' : 'all'} test combinations (max: ${maxTests})...`);
  
  const combinations = usePairwise 
    ? generatePairwiseCombinations(maxTests)
    : generateAllCombinations().slice(0, maxTests);
    
  await writeTestCombinations(combinations, outputFile);
  
  return combinations;
}

/**
 * Run tests in parallel using a subset of test combinations
 * @param {Object} options Test run options
 * @param {string} options.inputFile File containing test combinations
 * @param {number} options.maxTests Maximum number of tests to run
 * @param {number} options.parallel Number of parallel processes
 * @param {boolean} options.dryRun Don't actually run tests, just print commands
 */
async function runTests({ 
  inputFile = COMBINATIONS_FILE, 
  maxTests = 50,
  parallel = PARALLEL_DEFAULT,
  dryRun = false
}) {
  try {
    // Read test combinations from file
    let combinations;
    
    if (inputFile.endsWith('.json')) {
      const content = await readFile(inputFile, 'utf8');
      combinations = JSON.parse(content);
    } else {
      const content = await readFile(inputFile, 'utf8');
      combinations = content.split('\n').filter(Boolean);
    }
    
    if (maxTests > 0 && maxTests < combinations.length) {
      console.log(`Limiting to ${maxTests} test combinations`);
      combinations = combinations.slice(0, maxTests);
    }
    
    console.log(`Running ${combinations.length} test combinations...`);
    
    // Create results directory
    const resultsDir = path.join(TEST_DIR, `run-${Date.now()}`);
    await mkdir(resultsDir, { recursive: true });
    
    // Run tests
    const command = `./scripts/build/integration-test-build.sh --combinations=${inputFile} --max-tests=${maxTests} --parallel=${parallel} --skip-build=true${dryRun ? ' --dry-run=true' : ''}`;
    
    if (dryRun) {
      console.log(`Would run: ${command}`);
    } else {
      console.log(`Running: ${command}`);
      execSync(command, { stdio: 'inherit' });
    }
    
    console.log('All tests completed');
  } catch (error) {
    console.error(`Error running tests: ${error.message}`);
    process.exit(1);
  }
}

// Main function for CLI usage
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'generate') {
      // Parse options
      const maxTests = args.includes('--max-tests') 
        ? parseInt(args[args.indexOf('--max-tests') + 1], 10) 
        : MAX_TESTS_DEFAULT;
        
      const outputFile = args.includes('--output') 
        ? args[args.indexOf('--output') + 1] 
        : COMBINATIONS_FILE;
        
      const usePairwise = !args.includes('--all-combinations');
      
      await generateTestCombinations({ maxTests, outputFile, usePairwise });
    } 
    else if (command === 'run') {
      // Parse options
      const inputFile = args.includes('--input') 
        ? args[args.indexOf('--input') + 1] 
        : COMBINATIONS_FILE;
        
      const maxTests = args.includes('--max-tests') 
        ? parseInt(args[args.indexOf('--max-tests') + 1], 10) 
        : 50;
        
      const parallel = args.includes('--parallel') 
        ? parseInt(args[args.indexOf('--parallel') + 1], 10) 
        : PARALLEL_DEFAULT;
        
      const dryRun = args.includes('--dry-run');
      
      await runTests({ inputFile, maxTests, parallel, dryRun });
    }
    else if (command === 'generate-and-run') {
      // Parse options
      const maxGenerate = args.includes('--max-generate') 
        ? parseInt(args[args.indexOf('--max-generate') + 1], 10) 
        : MAX_TESTS_DEFAULT;
        
      const maxRun = args.includes('--max-run') 
        ? parseInt(args[args.indexOf('--max-run') + 1], 10) 
        : 50;
        
      const parallel = args.includes('--parallel') 
        ? parseInt(args[args.indexOf('--parallel') + 1], 10) 
        : PARALLEL_DEFAULT;
        
      const dryRun = args.includes('--dry-run');
      const usePairwise = !args.includes('--all-combinations');
      
      // Generate combinations
      const outputFile = path.join(TEST_DIR, `combinations-${Date.now()}.txt`);
      await generateTestCombinations({ maxTests: maxGenerate, outputFile, usePairwise });
      
      // Run tests
      await runTests({ inputFile: outputFile, maxTests: maxRun, parallel, dryRun });
    }
    else {
      console.log(`
Build Test Helper - Generate and run build tests

Usage:
  node build-test-helper.js generate [options]      Generate test combinations
  node build-test-helper.js run [options]           Run tests with existing combinations
  node build-test-helper.js generate-and-run [options]  Generate and run tests

Options for generate:
  --max-tests NUMBER     Maximum number of tests to generate [default: ${MAX_TESTS_DEFAULT}]
  --output FILE          Output file for test combinations [default: ${COMBINATIONS_FILE}]
  --all-combinations     Generate all combinations instead of pairwise

Options for run:
  --input FILE           Input file containing test combinations [default: ${COMBINATIONS_FILE}]
  --max-tests NUMBER     Maximum number of tests to run [default: 50]
  --parallel NUMBER      Number of parallel processes [default: ${PARALLEL_DEFAULT}]
  --dry-run              Don't actually run tests, just print commands

Options for generate-and-run:
  --max-generate NUMBER  Maximum number of tests to generate [default: ${MAX_TESTS_DEFAULT}]
  --max-run NUMBER       Maximum number of tests to run [default: 50]
  --parallel NUMBER      Number of parallel processes [default: ${PARALLEL_DEFAULT}]
  --all-combinations     Generate all combinations instead of pairwise
  --dry-run              Don't actually run tests, just print commands

Examples:
  node build-test-helper.js generate --max-tests 1000
  node build-test-helper.js run --max-tests 50 --parallel 4
  node build-test-helper.js generate-and-run --max-generate 1000 --max-run 100 --parallel 8
      `);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  generateAllCombinations,
  generatePairwiseCombinations,
  writeTestCombinations,
  generateTestCombinations,
  runTests
};

// Run main function if executed directly
if (require.main === module) {
  main();
}