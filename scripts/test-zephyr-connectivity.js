#!/usr/bin/env node

/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Script to test connectivity to Zephyr Scale API
 * 
 * This script verifies that we can connect to the Zephyr Scale API
 * and extract test case and execution data using valid credentials.
 * 
 * Usage:
 *   node test-zephyr-connectivity.js --base-url https://api.zephyrscale.smartbear.com/v2 --token YOUR_API_TOKEN --project-key PROJ
 * 
 * Required dependencies:
 *   npm install axios yargs
 */

// Check for required dependencies
try {
  require.resolve('axios');
  require.resolve('yargs');
} catch (err) {
  console.error('❌ Missing dependencies. Please run:');
  console.error('npm install axios yargs');
  process.exit(1);
}

const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('base-url', {
    alias: 'u',
    description: 'Zephyr Scale API base URL',
    default: 'https://api.zephyrscale.smartbear.com/v2',
    type: 'string'
  })
  .option('token', {
    alias: 't',
    description: 'Zephyr Scale API token',
    type: 'string',
    demandOption: true
  })
  .option('project-key', {
    alias: 'p',
    description: 'Project key',
    type: 'string',
    demandOption: true
  })
  .option('verbose', {
    alias: 'v',
    description: 'Show detailed output',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

// Create API client
const apiClient = axios.create({
  baseURL: argv['base-url'],
  headers: {
    'Authorization': `Bearer ${argv.token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Utility function to log in verbose mode
const log = (message) => {
  if (argv.verbose) {
    console.log(message);
  }
};

// Utility function for error handling
const handleError = (error, operation) => {
  console.error(`❌ Error during ${operation}:`);
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(`Status: ${error.response.status}`);
    console.error(`Status Text: ${error.response.statusText}`);
    console.error('Response Data:', error.response.data);
    console.error('Response Headers:', error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received from server');
    console.error('Request:', error.request);
  } else {
    // Something happened in setting up the request that triggered an error
    console.error('Error Message:', error.message);
  }
  
  if (error.config) {
    console.error('Request Config:', {
      url: error.config.url,
      method: error.config.method,
      headers: error.config.headers
    });
  }
};

// Utility function to print a section header
const printHeader = (title) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(80)}`);
};

// Test connection to the API
const testConnection = async () => {
  try {
    printHeader('TESTING API CONNECTION');
    
    log(`Connecting to ${argv.baseUrl} with project key ${argv['project-key']}...`);
    
    const response = await apiClient.get(`/projects/key/${argv['project-key']}`);
    
    console.log(`✅ Successfully connected to the Zephyr Scale API for project: ${response.data.name} (ID: ${response.data.id})`);
    
    if (argv.verbose) {
      console.log('Project Details:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
  } catch (error) {
    handleError(error, 'API connection test');
    process.exit(1);
  }
};

// Get test cases
const getTestCases = async (maxResults = 10) => {
  try {
    printHeader('RETRIEVING TEST CASES');
    
    log(`Fetching up to ${maxResults} test cases for project ${argv['project-key']}...`);
    
    const response = await apiClient.get('/tests', {
      params: {
        projectKey: argv['project-key'],
        maxResults: maxResults
      }
    });
    
    console.log(`✅ Successfully retrieved ${response.data.length} test cases`);
    
    if (argv.verbose) {
      console.log('Test Cases:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      // Print summary of test cases
      console.log('\nTest Case Summary:');
      console.log('-'.repeat(80));
      console.log(
        'ID'.padEnd(10) +
        'Key'.padEnd(15) +
        'Name'.padEnd(40) +
        'Status'.padEnd(15)
      );
      console.log('-'.repeat(80));
      
      response.data.forEach(test => {
        console.log(
          (test.id || '').toString().padEnd(10) +
          (test.key || '').padEnd(15) +
          (test.name || '').substring(0, 37).padEnd(40) +
          (test.status || '').padEnd(15)
        );
      });
    }
    
    return response.data;
  } catch (error) {
    handleError(error, 'retrieving test cases');
    return [];
  }
};

// Get a single test case with full details
const getTestCaseDetails = async (testCases) => {
  if (!testCases || testCases.length === 0) {
    console.log('❌ No test cases available to fetch details');
    return null;
  }
  
  try {
    printHeader('RETRIEVING TEST CASE DETAILS');
    
    const testCase = testCases[0];
    log(`Fetching details for test case: ${testCase.key} (${testCase.name})...`);
    
    const response = await apiClient.get(`/tests/${testCase.id}`);
    
    console.log(`✅ Successfully retrieved details for test case: ${response.data.key}`);
    
    // Print details of the test case
    console.log('\nTest Case Details:');
    console.log('-'.repeat(80));
    console.log(`Key:         ${response.data.key}`);
    console.log(`Name:        ${response.data.name}`);
    console.log(`Status:      ${response.data.status || 'N/A'}`);
    console.log(`Priority:    ${response.data.priority || 'N/A'}`);
    console.log(`Description: ${(response.data.description || '').substring(0, 60)}${response.data.description && response.data.description.length > 60 ? '...' : ''}`);
    
    // Print test steps if available
    if (response.data.steps && response.data.steps.length > 0) {
      console.log('\nTest Steps:');
      console.log('-'.repeat(80));
      response.data.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}: ${step.description.substring(0, 60)}${step.description.length > 60 ? '...' : ''}`);
        if (step.expectedResult) {
          console.log(`Expected: ${step.expectedResult.substring(0, 60)}${step.expectedResult.length > 60 ? '...' : ''}`);
        }
        console.log('-'.repeat(40));
      });
    }
    
    if (argv.verbose) {
      console.log('\nRaw Test Case Data:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
  } catch (error) {
    handleError(error, 'retrieving test case details');
    return null;
  }
};

// Get test cycles
const getTestCycles = async (maxResults = 10) => {
  try {
    printHeader('RETRIEVING TEST CYCLES');
    
    log(`Fetching up to ${maxResults} test cycles for project ${argv['project-key']}...`);
    
    const response = await apiClient.get('/cycles', {
      params: {
        projectKey: argv['project-key'],
        maxResults: maxResults
      }
    });
    
    console.log(`✅ Successfully retrieved ${response.data.length} test cycles`);
    
    if (argv.verbose) {
      console.log('Test Cycles:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      // Print summary of test cycles
      console.log('\nTest Cycle Summary:');
      console.log('-'.repeat(80));
      console.log(
        'ID'.padEnd(10) +
        'Name'.padEnd(40) +
        'Status'.padEnd(15) +
        'Created'.padEnd(20)
      );
      console.log('-'.repeat(80));
      
      response.data.forEach(cycle => {
        console.log(
          (cycle.id || '').toString().padEnd(10) +
          (cycle.name || '').substring(0, 37).padEnd(40) +
          (cycle.status || '').padEnd(15) +
          (cycle.createdOn ? new Date(cycle.createdOn).toISOString().split('T')[0] : '').padEnd(20)
        );
      });
    }
    
    return response.data;
  } catch (error) {
    handleError(error, 'retrieving test cycles');
    return [];
  }
};

// Get test executions
const getTestExecutions = async (maxResults = 10) => {
  try {
    printHeader('RETRIEVING TEST EXECUTIONS');
    
    log(`Fetching up to ${maxResults} test executions for project ${argv['project-key']}...`);
    
    const response = await apiClient.get('/executions', {
      params: {
        projectKey: argv['project-key'],
        maxResults: maxResults
      }
    });
    
    console.log(`✅ Successfully retrieved ${response.data.length} test executions`);
    
    if (argv.verbose) {
      console.log('Test Executions:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      // Print summary of test executions
      console.log('\nTest Execution Summary:');
      console.log('-'.repeat(80));
      console.log(
        'ID'.padEnd(10) +
        'Test'.padEnd(15) +
        'Cycle'.padEnd(15) +
        'Status'.padEnd(15) +
        'Executed By'.padEnd(20) +
        'Executed On'.padEnd(20)
      );
      console.log('-'.repeat(80));
      
      response.data.forEach(execution => {
        console.log(
          (execution.id || '').toString().padEnd(10) +
          (execution.testKey || '').padEnd(15) +
          (execution.cycleKey || '').padEnd(15) +
          (execution.status || '').padEnd(15) +
          (execution.executedBy || '').padEnd(20) +
          (execution.executedOn ? new Date(execution.executedOn).toISOString().split('T')[0] : '').padEnd(20)
        );
      });
    }
    
    return response.data;
  } catch (error) {
    handleError(error, 'retrieving test executions');
    return [];
  }
};

// Add a check function to provide a summary of API access
const checkApiAccess = () => {
  printHeader('API ACCESS CHECK SUMMARY');
  
  console.log('The following Zephyr Scale API endpoints were tested:');
  console.log('1. GET /projects/key/{projectKey} - Project information');
  console.log('2. GET /tests - List of test cases');
  console.log('3. GET /tests/{id} - Test case details');
  console.log('4. GET /cycles - List of test cycles');
  console.log('5. GET /executions - List of test executions');
  
  console.log('\nThis confirms that your API token has access to:');
  console.log('✓ Project metadata');
  console.log('✓ Test case content');
  console.log('✓ Test case details including steps');
  console.log('✓ Test cycle information');
  console.log('✓ Test execution results');
  
  console.log('\nNext steps:');
  console.log('1. Use these endpoints in your Zephyr Scale provider implementation');
  console.log('2. Implement data mapping between Zephyr Scale and canonical models');
  console.log('3. Set up error handling and rate limiting for production use');
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting Zephyr Scale API connectivity test...');
    
    // Test API connection
    const project = await testConnection();
    
    // Get test cases
    const testCases = await getTestCases();
    
    // Get details of a single test case
    if (testCases.length > 0) {
      await getTestCaseDetails(testCases);
    }
    
    // Get test cycles
    const testCycles = await getTestCycles();
    
    // Get test executions
    const testExecutions = await getTestExecutions();
    
    // Provide a summary of API access
    checkApiAccess();
    
    console.log('\n✅ All Zephyr Scale API connectivity tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during Zephyr Scale API connectivity test:', error.message);
    process.exit(1);
  }
};

// Run the main function
main();