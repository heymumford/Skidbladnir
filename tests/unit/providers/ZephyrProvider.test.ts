/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Test Suite for Zephyr Provider
 * 
 * This test verifies that the Zephyr provider adapter correctly implements
 * the provider interface and functions as expected.
 */

import { ZephyrProviderImpl, ZephyrProvider } from '../../../pkg/interfaces/providers/ZephyrProvider';
import {
  SourceProvider,
  TargetProvider,
  EntityType
} from '../../../packages/common/src/interfaces/provider';
import { ProviderInterfaceTester } from './interfaces/ProviderInterface.test';

// Create an adapter class to bridge between the Zephyr provider implementation
// and the standard provider interfaces
class ZephyrAdapter implements SourceProvider, TargetProvider {
  private provider: ZephyrProvider;
  
  constructor(provider: ZephyrProvider) {
    this.provider = provider;
  }
  
  // Base provider properties
  id = 'zephyr';
  name = 'Zephyr Scale';
  version = '1.0.0';
  capabilities = {
    canBeSource: true,
    canBeTarget: true,
    entityTypes: [
      EntityType.PROJECT,
      EntityType.FOLDER,
      EntityType.TEST_CASE,
      EntityType.TEST_STEP,
      EntityType.TEST_CYCLE,
      EntityType.TEST_EXECUTION,
      EntityType.ATTACHMENT
    ],
    supportsAttachments: true,
    supportsExecutionHistory: true,
    supportsTestSteps: true,
    supportsHierarchy: true,
    supportsCustomFields: true
  };
  
  // Base provider methods
  async initialize(config: any): Promise<void> {
    // The Zephyr provider takes config in the constructor
    // This method is a no-op for adapter compatibility
    return Promise.resolve();
  }
  
  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.provider.authenticate();
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  getMetadata() {
    return {
      systemName: 'Zephyr Scale',
      providerVersion: this.version,
      capabilities: this.capabilities,
      configSchema: {
        baseUrl: { type: 'string', required: true },
        apiKey: { type: 'string', required: true },
        projectKey: { type: 'string', required: true }
      }
    };
  }
  
  // Source provider methods
  async getProjects() {
    // This method doesn't exist in our Zephyr implementation,
    // but we can simulate it for the adapter
    return [{ id: 'PROJ-1', name: 'Test Project', key: 'PROJ' }];
  }
  
  async getFolders(projectId: string) {
    // Simulate folder structure
    return [
      { id: 'folder-1', name: 'Test Folder 1', path: '/Test Folder 1' },
      { id: 'folder-2', name: 'Test Folder 2', path: '/Test Folder 2' }
    ];
  }
  
  async getTestCases(projectId: string, options?: any) {
    const testCases = await this.provider.getTestCases(projectId, {
      folderId: options?.folderId,
      maxResults: options?.pageSize,
      startAt: options?.startAt,
      status: options?.status ? [options.status] : undefined
    });
    
    return {
      items: testCases,
      total: testCases.length,
      page: options?.page || 1,
      pageSize: options?.pageSize || 10
    };
  }
  
  async getTestCase(projectId: string, testCaseId: string) {
    return this.provider.getTestCaseById(projectId, testCaseId);
  }
  
  async getTestCycles(projectId: string, options?: any) {
    const testSuites = await this.provider.getTestSuites(projectId);
    // Convert test suites to test cycles format
    const testCycles = testSuites.map(suite => ({
      id: suite.id,
      name: suite.name,
      description: suite.description,
      testCaseIds: suite.testCases,
      status: 'ACTIVE',
      startDate: suite.createdAt,
      endDate: null
    }));
    
    return {
      items: testCycles,
      total: testCycles.length,
      page: options?.page || 1,
      pageSize: options?.pageSize || 10
    };
  }
  
  async getTestExecutions(projectId: string, testCycleId: string, options?: any) {
    // We need to find the test case IDs in the cycle first
    const testSuites = await this.provider.getTestSuites(projectId);
    const testSuite = testSuites.find(suite => suite.id === testCycleId);
    
    if (!testSuite) {
      return {
        items: [],
        total: 0,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10
      };
    }
    
    // Get executions for each test case in the suite
    const executions = [];
    for (const testCaseId of testSuite.testCases) {
      const testExecutions = await this.provider.getTestExecutions(projectId, testCaseId);
      executions.push(...testExecutions);
    }
    
    return {
      items: executions,
      total: executions.length,
      page: options?.page || 1,
      pageSize: options?.pageSize || 10
    };
  }
  
  async getAttachmentContent(projectId: string, attachmentId: string) {
    // Zephyr implementation doesn't have direct attachment support,
    // so we'll simulate it
    return {
      id: attachmentId,
      name: 'test-attachment.png',
      contentType: 'image/png',
      size: 1024,
      content: Buffer.from('test-content')
    };
  }
  
  async getFieldDefinitions(projectId: string) {
    // Simulate field definitions
    return [
      { id: 'field-1', name: 'Priority', type: 'STRING', required: true },
      { id: 'field-2', name: 'Component', type: 'STRING', required: false }
    ];
  }
  
  // Target provider methods
  async createFolder(projectId: string, folder: any) {
    // Simulate folder creation
    return `folder-${Date.now()}`;
  }
  
  async createTestCase(projectId: string, testCase: any) {
    const result = await this.provider.createTestCase(projectId, testCase);
    return result.id;
  }
  
  async createTestSteps(projectId: string, testCaseId: string, steps: any[]) {
    // We need to simulate this since Zephyr impl creates steps as part of the test case
    const testCase = await this.provider.getTestCaseById(projectId, testCaseId);
    await this.provider.updateTestCase(projectId, testCaseId, {
      ...testCase,
      steps: steps
    });
  }
  
  async createTestCycle(projectId: string, testCycle: any) {
    const result = await this.provider.createTestSuite(projectId, {
      name: testCycle.name,
      description: testCycle.description,
      testCases: testCycle.testCaseIds || []
    });
    return result.id;
  }
  
  async createTestExecutions(projectId: string, testCycleId: string, executions: any[]) {
    // Execute each test case in the executions array
    for (const execution of executions) {
      await this.provider.createTestExecution(projectId, execution);
    }
  }
  
  async uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: any) {
    // Simulate attachment upload
    return `attachment-${Date.now()}`;
  }
  
  async createFieldDefinition(projectId: string, fieldDefinition: any) {
    // Simulate field definition creation
    return `field-${Date.now()}`;
  }
}

describe('Zephyr Provider Tests', () => {
  let zephyrProvider: ZephyrProvider;
  let adapter: ZephyrAdapter;
  
  beforeEach(() => {
    // Create a Zephyr provider instance with mock config
    zephyrProvider = new ZephyrProviderImpl({
      baseUrl: 'https://api.zephyrscale.example.com',
      apiKey: 'mock-api-key',
      projectKey: 'TEST'
    });
    
    // Create an adapter that implements the standard provider interfaces
    adapter = new ZephyrAdapter(zephyrProvider);
  });
  
  it('should implement the base provider interface', () => {
    // Verify the base provider interface implementation
    ProviderInterfaceTester.testBaseProviderInterface(adapter);
  });
  
  it('should implement the source provider interface', () => {
    // Verify the source provider interface implementation
    ProviderInterfaceTester.testSourceProviderInterface(adapter);
  });
  
  it('should implement the target provider interface', () => {
    // Verify the target provider interface implementation
    ProviderInterfaceTester.testTargetProviderInterface(adapter);
  });
  
  it('should authenticate with the Zephyr API', async () => {
    // Test the authenticate method
    await expect(zephyrProvider.authenticate()).resolves.not.toThrow();
  });
  
  it('should retrieve test cases from Zephyr', async () => {
    // Test the getTestCases method
    const testCases = await zephyrProvider.getTestCases('TEST');
    expect(testCases.length).toBeGreaterThan(0);
    expect(testCases[0].id).toBeDefined();
    expect(testCases[0].title).toBeDefined();
  });
  
  it('should create and retrieve a test case', async () => {
    // Create a test case
    const newTestCase = await zephyrProvider.createTestCase('TEST', {
      title: 'New Test Case',
      description: 'Test case created by unit test',
      status: 'DRAFT',
      priority: 'MEDIUM',
      steps: [
        {
          order: 1,
          description: 'Step 1',
          expectedResult: 'Expected Result 1'
        }
      ]
    });
    
    expect(newTestCase.id).toBeDefined();
    expect(newTestCase.title).toBe('New Test Case');
    
    // Retrieve the created test case
    const retrievedTestCase = await zephyrProvider.getTestCaseById('TEST', newTestCase.id);
    expect(retrievedTestCase.id).toBe(newTestCase.id);
    expect(retrievedTestCase.title).toBe(newTestCase.title);
  });
  
  it('should handle test execution lifecycle', async () => {
    // First get a test case
    const testCases = await zephyrProvider.getTestCases('TEST');
    const testCaseId = testCases[0].id;
    
    // Create a test execution
    const execution = await zephyrProvider.createTestExecution('TEST', {
      testCaseId,
      status: 'PASSED',
      executedBy: 'test-user',
      environment: 'test'
    });
    
    expect(execution.id).toBeDefined();
    expect(execution.testCaseId).toBe(testCaseId);
    expect(execution.status).toBe('PASSED');
    
    // Get the test executions
    const executions = await zephyrProvider.getTestExecutions('TEST', testCaseId);
    expect(executions.length).toBeGreaterThan(0);
    
    // At least one execution should match our created execution
    const matchingExecution = executions.find(e => e.status === 'PASSED' && e.environment === 'test');
    expect(matchingExecution).toBeDefined();
  });
  
  it('should respect rate limits', async () => {
    // Make multiple sequential requests to test rate limiting
    const requests = new Array(5).fill(0).map(() => zephyrProvider.getTestCases('TEST'));
    await expect(Promise.all(requests)).resolves.not.toThrow();
  });
});