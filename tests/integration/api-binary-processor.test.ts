/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Integration test between API and Binary Processor
 * Tests the communication between the TypeScript API and Go Binary Processor
 */

import axios from 'axios';
import { TestCaseControllerMock } from '../../tests/mocks/typescript/api/controllers/TestCaseControllerMock';

// Services configuration
const API_PORT = 8080;
const BINARY_PROCESSOR_PORT = 8090;

// For integration tests, we'll use the mock implementation that's registered during build
const testCaseController = new TestCaseControllerMock();

describe('API to Binary Processor Integration', () => {
  // Set timeout for the tests
  jest.setTimeout(10000);

  it('should verify both services are healthy', async () => {
    // Check API health
    const apiResponse = await axios.get(`http://localhost:${API_PORT}/health`);
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.status).toBe('ok');

    // Check Binary Processor health
    const binaryProcessorResponse = await axios.get(`http://localhost:${BINARY_PROCESSOR_PORT}/health`);
    expect(binaryProcessorResponse.status).toBe(200);
    expect(binaryProcessorResponse.data.status).toBe('ok');
    expect(binaryProcessorResponse.data.service).toBe('binary-processor');
  });

  it('should create a test case in the API and find it in the binary processor', async () => {
    // First, create a test case using our mock controller
    const newTestCase = {
      title: 'API-Binary-Processor Integration Test',
      description: 'Test case for integration between API and Binary Processor',
      status: 'READY',
      priority: 'HIGH',
      steps: [
        { description: 'Step 1', expectedResult: 'Expected result 1' }
      ],
      tags: ['integration', 'test']
    };
    
    const createdTestCase = await testCaseController.createTestCase(newTestCase);
    
    // The actual integration test would call the Binary Processor API to verify
    // the test case was synchronized, but for now we'll just simulate it with mocks
    // since the actual implementation isn't complete yet
    
    // This verifies our test structure works - it will be expanded with real
    // API calls once the actual services are implemented
    expect(createdTestCase).toBeDefined();
    expect(createdTestCase.title).toBe(newTestCase.title);
  });

  // This test will be re-implemented with real service calls when they are available
  it('should process binary assets attached to test cases', async () => {
    // This is a placeholder for the binary processing test
    // In the actual implementation, we would:
    // 1. Create a test case with binary attachments via the API
    // 2. Verify the binary processor correctly processes these attachments
    // 3. Check that the processed results are available
    
    // For now, we're just testing that our mocks work correctly
    const testCaseId = 'TC-001';
    const testCase = await testCaseController.getTestCase(testCaseId);
    expect(testCase).toBeDefined();
    expect(testCase.id).toBe(testCaseId);
  });
});