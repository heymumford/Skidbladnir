/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Integration tests for the polyglot architecture of Skidbladnir
 * These tests verify the interaction between the TypeScript API, 
 * Python orchestrator, and Go binary processor components
 */

import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const sleep = promisify(setTimeout);

// Services configuration
const API_PORT = 8080;
const ORCHESTRATOR_PORT = 8000;
const BINARY_PROCESSOR_PORT = 8090;

describe('Polyglot Architecture Integration', () => {
  // Service processes
  let apiProcess: ChildProcess;
  let orchestratorProcess: ChildProcess;
  let binaryProcessorProcess: ChildProcess;

  // Set timeout for the tests (30 seconds)
  jest.setTimeout(30000);

  // Helper function to start a service
  const startService = (command: string, args: string[], name: string): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      
      // Log output for debugging
      process.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        console.error(`[${name}] Error: ${data.toString().trim()}`);
      });
      
      process.on('error', (err) => {
        console.error(`[${name}] Failed to start: ${err.message}`);
        reject(err);
      });
      
      // Wait for the service to start
      setTimeout(() => resolve(process), 3000);
    });
  };

  // Helper function to check if a service is healthy
  const checkServiceHealth = async (port: number, serviceName: string): Promise<boolean> => {
    try {
      const response = await axios.get(`http://localhost:${port}/health`);
      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      console.error(`Failed to check ${serviceName} health:`, error);
      return false;
    }
  };

  beforeAll(async () => {
    // Using mock implementations for tests
    process.env.USE_MOCKS = 'true';
    
    // Start the API service
    apiProcess = await startService('npm', ['run', 'dev:api'], 'API');
    
    // Start the Orchestrator service
    orchestratorProcess = await startService('npm', ['run', 'dev:orchestrator'], 'Orchestrator');
    
    // Start the Binary Processor service
    binaryProcessorProcess = await startService('npm', ['run', 'dev:binary'], 'Binary Processor');
    
    // Wait for services to be ready
    await sleep(5000);
  });

  afterAll(() => {
    // Cleanup: kill all processes
    if (apiProcess) apiProcess.kill();
    if (orchestratorProcess) orchestratorProcess.kill();
    if (binaryProcessorProcess) binaryProcessorProcess.kill();
  });

  it('should verify all services are healthy', async () => {
    // Check if all services are healthy
    const apiHealthy = await checkServiceHealth(API_PORT, 'API');
    const orchestratorHealthy = await checkServiceHealth(ORCHESTRATOR_PORT, 'Orchestrator');
    const binaryProcessorHealthy = await checkServiceHealth(BINARY_PROCESSOR_PORT, 'Binary Processor');
    
    expect(apiHealthy).toBe(true);
    expect(orchestratorHealthy).toBe(true);
    expect(binaryProcessorHealthy).toBe(true);
  });

  it('should get API status', async () => {
    const response = await axios.get(`http://localhost:${API_PORT}/api/status`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('operational');
    expect(response.data.version).toBeDefined();
    expect(response.data.timestamp).toBeDefined();
    expect(response.data.requestId).toBeDefined();
  });

  it('should integrate with mock implementations', async () => {
    // This is a placeholder test that will be expanded with actual
    // cross-service integration tests as the implementation progresses
    
    // For now, we're just verifying that mock implementations can be
    // loaded and used in the test environment
    const testCaseController = new (require('../../tests/mocks/typescript/api/controllers/TestCaseControllerMock')).TestCaseControllerMock();
    
    const testCase = await testCaseController.getTestCase('TC-001');
    expect(testCase).toBeDefined();
    expect(testCase.id).toBe('TC-001');
  });

  // More integration tests will be added as services are implemented
});