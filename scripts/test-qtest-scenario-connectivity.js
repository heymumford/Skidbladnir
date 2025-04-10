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
 * Script to test connectivity with qTest Scenario API
 * 
 * This script verifies connectivity to the qTest Scenario API
 * by making requests to various endpoints and checking the responses.
 * 
 * Usage:
 *   node test-qtest-scenario-connectivity.js --baseUrl=https://instance.qtestnet.com/api/v3 --token=YOUR_API_TOKEN
 * 
 * Options:
 *   --baseUrl      - Base URL for the qTest instance (required)
 *   --token        - API token for authentication (required)
 *   --projectId    - Project ID to use for testing (optional, default: 1)
 *   --verbose      - Show detailed response data (optional)
 *   --timeout      - Request timeout in milliseconds (optional, default: 30000)
 *   --bypassSSL    - Bypass SSL verification (optional, default: false)
 */

const axios = require('axios');
const chalk = require('chalk');
const { parseArgs } = require('node:util');

// Parse command line arguments
const options = {
  baseUrl: { type: 'string', short: 'b' },
  token: { type: 'string', short: 't' },
  projectId: { type: 'string', short: 'p', default: '1' },
  verbose: { type: 'boolean', short: 'v', default: false },
  timeout: { type: 'string', short: 'T', default: '30000' },
  bypassSSL: { type: 'boolean', short: 's', default: false }
};

const { values } = parseArgs({ options });

// Validate required arguments
if (!values.baseUrl || !values.token) {
  console.error(chalk.red('Error: Both --baseUrl and --token are required'));
  console.log('Usage: node test-qtest-scenario-connectivity.js --baseUrl=https://instance.qtestnet.com/api/v3 --token=YOUR_API_TOKEN');
  process.exit(1);
}

// Create axios instance with the API token
const api = axios.create({
  baseURL: `${values.baseUrl}/scenario`,
  headers: {
    'Authorization': `Bearer ${values.token}`,
    'Content-Type': 'application/json'
  },
  timeout: parseInt(values.timeout, 10),
  httpsAgent: values.bypassSSL ? new (require('https').Agent)({ rejectUnauthorized: false }) : undefined
});

// Keep track of successful and failed requests
let successCount = 0;
let failureCount = 0;

/**
 * Make a request to the API and check the response
 */
async function testEndpoint(name, method, url, data = null) {
  console.log(chalk.cyan(`Testing ${name}...`));
  
  try {
    const response = data 
      ? await api({ method, url, data }) 
      : await api({ method, url });
    
    successCount++;
    console.log(chalk.green(`✓ ${name} (Status: ${response.status})`));
    
    if (values.verbose) {
      console.log(chalk.gray('Response:'));
      console.log(chalk.gray(JSON.stringify(response.data, null, 2)));
    }
    
    return response.data;
  } catch (error) {
    failureCount++;
    console.log(chalk.red(`✗ ${name}`));
    console.log(chalk.red(`Error: ${error.message}`));
    
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
      console.log(chalk.red(`Message: ${JSON.stringify(error.response.data)}`));
    }
    
    return null;
  }
}

/**
 * Format time in a human-readable way
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds}s`;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(chalk.blue('🧪 Testing qTest Scenario API connectivity...'));
  console.log(chalk.gray(`Base URL: ${values.baseUrl}/scenario`));
  console.log(chalk.gray(`Project ID: ${values.projectId}`));
  console.log(chalk.gray(`Timeout: ${values.timeout}ms`));
  console.log(chalk.gray(`Bypass SSL: ${values.bypassSSL ? 'Yes' : 'No'}`));
  console.log();
  
  const startTime = Date.now();
  
  // Test authentication
  await testEndpoint(
    'Authentication', 
    'get', 
    '/user/current'
  );
  
  // Test project exists
  await testEndpoint(
    'Project exists', 
    'get', 
    `/projects/${values.projectId}`
  );
  
  // Test features endpoints
  const features = await testEndpoint(
    'Get features', 
    'get', 
    `/features?projectId=${values.projectId}&page=0&size=10`
  );
  
  let featureId = null;
  
  if (features && features.content && features.content.length > 0) {
    featureId = features.content[0].id;
    
    await testEndpoint(
      'Get feature by ID', 
      'get', 
      `/features/${featureId}`
    );
    
    await testEndpoint(
      'Get feature steps', 
      'get', 
      `/steps?featureId=${featureId}&page=0&size=10`
    );
  } else {
    // Try to create a test feature
    const newFeature = await testEndpoint(
      'Create feature', 
      'post', 
      '/features', 
      {
        name: 'Test Login Feature',
        description: 'Feature for testing login functionality',
        status: 'active',
        projectId: parseInt(values.projectId, 10),
        tags: ['test', 'login']
      }
    );
    
    if (newFeature) {
      featureId = newFeature.id;
      
      // Add steps to the feature
      await testEndpoint(
        'Add feature steps', 
        'post', 
        `/features/${featureId}/steps`, 
        [
          {
            type: 'given',
            description: 'I am on the login page',
            featureId: featureId,
            projectId: parseInt(values.projectId, 10),
            order: 1
          },
          {
            type: 'when',
            description: 'I enter valid credentials',
            featureId: featureId,
            projectId: parseInt(values.projectId, 10),
            order: 2
          },
          {
            type: 'then',
            description: 'I should be logged in successfully',
            featureId: featureId,
            projectId: parseInt(values.projectId, 10),
            order: 3
          }
        ]
      );
    }
  }
  
  // Test steps endpoints
  const steps = await testEndpoint(
    'Get steps', 
    'get', 
    `/steps?projectId=${values.projectId}&page=0&size=10`
  );
  
  if (steps && steps.content && steps.content.length > 0) {
    const stepId = steps.content[0].id;
    
    await testEndpoint(
      'Get step by ID', 
      'get', 
      `/steps/${stepId}`
    );
    
    // Test step update
    await testEndpoint(
      'Update step', 
      'put', 
      `/steps/${stepId}`, 
      {
        ...steps.content[0],
        description: `${steps.content[0].description} (updated)`
      }
    );
  } else if (featureId) {
    // Try to create a test step
    await testEndpoint(
      'Create step', 
      'post', 
      '/steps', 
      {
        type: 'given',
        description: 'I am a test step',
        featureId: parseInt(featureId, 10),
        projectId: parseInt(values.projectId, 10)
      }
    );
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log();
  console.log(chalk.blue('🏁 Test Summary:'));
  console.log(chalk.green(`✓ ${successCount} successful requests`));
  console.log(chalk.red(`✗ ${failureCount} failed requests`));
  console.log(chalk.gray(`⏱️ Total time: ${formatTime(totalTime)}`));
  
  if (failureCount > 0) {
    console.log();
    console.log(chalk.yellow('⚠️ Some tests failed. Please check the error messages above.'));
    process.exit(1);
  } else {
    console.log();
    console.log(chalk.green('✅ All tests passed! qTest Scenario API is accessible and working.'));
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});