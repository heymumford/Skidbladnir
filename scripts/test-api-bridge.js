#!/usr/bin/env node

/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

console.log(`${colors.blue}Skidbladnir API Bridge Test Runner${colors.reset}`);
console.log('========================================');

// Get the root path of the project
const rootPath = path.resolve(__dirname, '..');

// Create example usage of API Bridge
const exampleUsage = `
${colors.cyan}// Example usage of API Bridge${colors.reset}
const { createApiBridge } = require('../internal/typescript/api-bridge');
const { AuthenticationMethod } = require('../internal/typescript/api-bridge/auth/authentication-handler');

// Create an API Bridge for Zephyr
const zephyrBridge = createApiBridge({
  baseURL: 'https://api.zephyrscale.smartbear.com/v2',
  serviceName: 'test-case-migration',
  providerName: 'zephyr',
  authentication: {
    credentials: {
      type: AuthenticationMethod.TOKEN,
      token: 'your-zephyr-api-token'
    }
  },
  healthCheckEndpoint: '/health'
});

// Use the bridge to make API calls with resilience
async function fetchTestCases() {
  try {
    // The bridge handles authentication, rate limiting, retries, etc.
    const response = await zephyrBridge.get('/testcases');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test cases:', error);
    throw error;
  }
}

// Check the health status
const status = zephyrBridge.getHealthStatus(); // 'HEALTHY', 'DEGRADED', or 'UNHEALTHY'

// Get detailed metrics
const metrics = zephyrBridge.getMetrics();
console.log('Health status:', status);
console.log('Rate limiting status:', metrics.rateLimiting);
console.log('Circuit breaker status:', metrics.resilience.circuitBreaker);
`;

console.log(exampleUsage);
console.log('');

// Run tests
console.log(`${colors.yellow}Running API Bridge tests...${colors.reset}`);

const result = spawnSync('npm', ['test', '--', '-t', 'API Bridge Integration'], {
  cwd: rootPath,
  stdio: 'inherit'
});

// Exit with the same code as the test process
process.exit(result.status);