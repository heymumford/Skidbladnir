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
 * Script to test connectivity with qTest Data Export API
 * 
 * This script verifies connectivity to the qTest Data Export API
 * by making requests to various endpoints and checking the responses.
 * 
 * Usage:
 *   node test-qtest-data-export-connectivity.js --baseUrl=https://instance.qtestnet.com/api/v3 --token=YOUR_API_TOKEN
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
  console.log('Usage: node test-qtest-data-export-connectivity.js --baseUrl=https://instance.qtestnet.com/api/v3 --token=YOUR_API_TOKEN');
  process.exit(1);
}

// Create axios instance with the API token
const api = axios.create({
  baseURL: `${values.baseUrl}/data-export`,
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
async function testEndpoint(name, method, url, data = null, config = {}) {
  console.log(chalk.cyan(`Testing ${name}...`));
  
  try {
    const response = data 
      ? await api({ method, url, data, ...config }) 
      : await api({ method, url, ...config });
    
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
  console.log(chalk.blue('🧪 Testing qTest Data Export API connectivity...'));
  console.log(chalk.gray(`Base URL: ${values.baseUrl}/data-export`));
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
  
  // Test export directory
  const exportPath = `/projects/${values.projectId}/exports`;
  
  // Test list files
  const files = await testEndpoint(
    'List files', 
    'get', 
    `/files?path=${encodeURIComponent(exportPath)}`
  );
  
  let filePath = null;
  
  if (files && Array.isArray(files) && files.length > 0) {
    filePath = files[0].path;
    
    // Test get file metadata
    await testEndpoint(
      'Get file metadata', 
      'head', 
      `/file/${encodeURIComponent(filePath)}`
    );
    
    // Test download file (small files only)
    if (files[0].size < 1000000) { // less than 1MB
      await testEndpoint(
        'Download file', 
        'get', 
        `/file/${encodeURIComponent(filePath)}`
      );
      
      // Test download file as binary
      await testEndpoint(
        'Download file as binary', 
        'get', 
        `/file/${encodeURIComponent(filePath)}`,
        null,
        { responseType: 'arraybuffer' }
      );
    } else {
      console.log(chalk.yellow('⚠️ Skipping file download test due to large file size'));
    }
  } else {
    console.log(chalk.yellow('⚠️ No files found in the exports directory'));
  }
  
  // Test search files
  await testEndpoint(
    'Search files', 
    'get', 
    `/files?projectId=${values.projectId}&pattern=*.*`
  );
  
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
    console.log(chalk.green('✅ All tests passed! qTest Data Export API is accessible and working.'));
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});