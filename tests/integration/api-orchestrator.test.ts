/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Integration test between API and Orchestrator
 * Tests the communication between the TypeScript API and Python Orchestrator
 */

import axios from 'axios';
import { TestCaseControllerMock } from '../../tests/mocks/typescript/api/controllers/TestCaseControllerMock';

// Services configuration
const API_PORT = 8080;
const ORCHESTRATOR_PORT = 8000;

// For integration tests, we'll use the mock implementation that's registered during build
const testCaseController = new TestCaseControllerMock();

describe('API to Orchestrator Integration', () => {
  // Set timeout for the tests
  jest.setTimeout(10000);

  it('should verify both services are healthy', async () => {
    // Check API health
    const apiResponse = await axios.get(`http://localhost:${API_PORT}/health`);
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.status).toBe('ok');

    // Check Orchestrator health
    const orchestratorResponse = await axios.get(`http://localhost:${ORCHESTRATOR_PORT}/health`);
    expect(orchestratorResponse.status).toBe(200);
    expect(orchestratorResponse.data.status).toBe('ok');
    expect(orchestratorResponse.data.service).toBe('orchestrator');
  });

  it('should start a migration workflow', async () => {
    // This is a placeholder for the actual test
    // In the real implementation, we would:
    // 1. Create a migration workflow request via the API
    // 2. Submit it to the orchestrator
    // 3. Check its status and progress
    
    // For now, we're just testing that our structure works
    const testCase = await testCaseController.getTestCase('TC-001');
    expect(testCase).toBeDefined();
    expect(testCase.id).toBe('TC-001');
    
    // Verify we can reach the orchestrator service
    const rootResponse = await axios.get(`http://localhost:${ORCHESTRATOR_PORT}/`);
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.data.service).toBe('Skidbladnir Orchestrator');
    expect(rootResponse.data.status).toBe('operational');
  });

  // This test simulates creating a test case and then starting a migration
  it('should prepare test cases for migration workflow', async () => {
    // Create some test cases using our mock controller
    const newTestCase = {
      title: 'Migration Test Case',
      description: 'Test case for migration workflow',
      status: 'READY',
      priority: 'MEDIUM',
      steps: [
        { description: 'Prepare for migration', expectedResult: 'Ready to migrate' }
      ],
      tags: ['migration', 'test']
    };
    
    const createdTestCase = await testCaseController.createTestCase(newTestCase);
    expect(createdTestCase).toBeDefined();
    
    // In a real test, we would now call the orchestrator to start a migration
    // using the created test case. For now this is just placeholder.
    
    // Verify we can get test cases with filters to prepare for migration
    const testCases = await testCaseController.getAllTestCases({ 
      status: ['READY'], 
      page: 1, 
      pageSize: 10 
    });
    
    expect(testCases).toBeDefined();
    expect(testCases.items.length).toBeGreaterThan(0);
    expect(testCases.items.some(tc => tc.id === createdTestCase.id)).toBe(true);
  });
});