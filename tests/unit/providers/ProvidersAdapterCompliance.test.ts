/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Provider Adapter Compliance Tests
 * 
 * This test suite verifies that all provider adapters in the system
 * correctly implement the provider interfaces. Each provider is tested
 * to ensure it adheres to the contract based on its capabilities.
 */

import {
  TestManagementProvider,
  SourceProvider,
  TargetProvider,
  ProviderRegistry
} from '../../../packages/common/src/interfaces/provider';
import { ProviderInterfaceTester } from './interfaces/ProviderInterface.test';

// Import provider adapters
// In a real implementation, these would be all the provider adapters in the system
import { ZephyrProviderImpl } from '../../../pkg/interfaces/providers/ZephyrProvider';

// Utility function to initialize providers
async function initializeProviderWithMockConfig(provider: TestManagementProvider): Promise<void> {
  const mockConfig = {
    // Common fields
    baseUrl: 'https://example.com/api',
    apiKey: 'mock-api-key',
    username: 'mock-username',
    password: 'mock-password',
    // Specific fields for different providers
    projectKey: 'TEST',
    domain: 'test-domain',
    project: 'test-project',
    mappingDefinition: { name: 'TestName', id: 'TestId' }
  };
  
  await provider.initialize(mockConfig);
}

describe('Provider Adapter Compliance', () => {
  let registry: ProviderRegistry;
  
  beforeAll(() => {
    // Create and setup a provider registry with all providers
    registry = new ProviderRegistry();
    
    // Setup providers with mock configurations
    registry.registerProvider(new ZephyrAdapter(new ZephyrProviderImpl({
      baseUrl: 'https://api.zephyrscale.example.com',
      apiKey: 'mock-api-key',
      projectKey: 'TEST'
    })));
    
    // Additional providers would be registered here in a real implementation
    // registry.registerProvider(new QTestAdapter(new QTestProviderImpl()));
    // registry.registerProvider(new HPALMAdapter(new HPALMProviderImpl()));
    // registry.registerProvider(new AzureDevOpsAdapter(new AzureDevOpsProviderImpl()));
    // registry.registerProvider(new RallyAdapter(new RallyProviderImpl()));
    // registry.registerProvider(new ExcelAdapter(new ExcelProviderImpl()));
  });
  
  it('should have all required providers registered', () => {
    // Check that we have the expected providers registered
    const providers = registry.getAllProviders();
    expect(providers.length).toBeGreaterThan(0);
    
    // Verify we have at least one provider with each capability
    const sourceProviders = registry.getSourceProviders();
    const targetProviders = registry.getTargetProviders();
    
    expect(sourceProviders.length).toBeGreaterThan(0);
    expect(targetProviders.length).toBeGreaterThan(0);
  });
  
  it('should verify all providers implement the base interface', () => {
    const providers = registry.getAllProviders();
    
    for (const provider of providers) {
      try {
        ProviderInterfaceTester.testBaseProviderInterface(provider);
      } catch (error) {
        fail(`Provider ${provider.name} (${provider.id}) does not correctly implement the base interface: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  it('should verify all source providers implement the source interface', () => {
    const sourceProviders = registry.getSourceProviders();
    
    for (const provider of sourceProviders) {
      try {
        ProviderInterfaceTester.testSourceProviderInterface(provider);
      } catch (error) {
        fail(`Source provider ${provider.name} (${provider.id}) does not correctly implement the source interface: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  it('should verify all target providers implement the target interface', () => {
    const targetProviders = registry.getTargetProviders();
    
    for (const provider of targetProviders) {
      try {
        ProviderInterfaceTester.testTargetProviderInterface(provider);
      } catch (error) {
        fail(`Target provider ${provider.name} (${provider.id}) does not correctly implement the target interface: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  it('should verify each provider can establish a connection', async () => {
    const providers = registry.getAllProviders();
    
    for (const provider of providers) {
      try {
        const connectionStatus = await provider.testConnection();
        expect(connectionStatus.connected).toBe(true);
      } catch (error) {
        fail(`Provider ${provider.name} (${provider.id}) failed connection test: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  it('should verify all providers report correct capabilities', () => {
    const providers = registry.getAllProviders();
    
    for (const provider of providers) {
      const metadata = provider.getMetadata();
      
      // Capabilities in metadata should match provider capabilities
      expect(metadata.capabilities).toEqual(provider.capabilities);
      
      // Provider version in metadata should match provider version
      expect(metadata.providerVersion).toBe(provider.version);
      
      // System name should be non-empty
      expect(metadata.systemName.length).toBeGreaterThan(0);
    }
  });
});

// Zephyr Adapter for the compliance test
// This is the same adapter as in ZephyrProvider.test.ts but included here for completeness
class ZephyrAdapter implements SourceProvider, TargetProvider {
  private provider: ZephyrProviderImpl;
  
  constructor(provider: ZephyrProviderImpl) {
    this.provider = provider;
  }
  
  // Implementation details are the same as in ZephyrProvider.test.ts
  // ... (code omitted for brevity, see ZephyrProvider.test.ts)
  
  // Base provider properties
  id = 'zephyr';
  name = 'Zephyr Scale';
  version = '1.0.0';
  capabilities = {
    canBeSource: true,
    canBeTarget: true,
    entityTypes: ['project', 'folder', 'test_case', 'test_step', 'test_cycle', 'test_execution', 'attachment'],
    supportsAttachments: true,
    supportsExecutionHistory: true,
    supportsTestSteps: true,
    supportsHierarchy: true,
    supportsCustomFields: true
  };
  
  // Base provider methods
  async initialize(config: any): Promise<void> {
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
    return [{ id: 'PROJ-1', name: 'Test Project', key: 'PROJ' }];
  }
  
  async getFolders(projectId: string) {
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
    return {
      id: attachmentId,
      name: 'test-attachment.png',
      contentType: 'image/png',
      size: 1024,
      content: Buffer.from('test-content')
    };
  }
  
  async getFieldDefinitions(projectId: string) {
    return [
      { id: 'field-1', name: 'Priority', type: 'STRING', required: true },
      { id: 'field-2', name: 'Component', type: 'STRING', required: false }
    ];
  }
  
  // Target provider methods
  async createFolder(projectId: string, folder: any) {
    return `folder-${Date.now()}`;
  }
  
  async createTestCase(projectId: string, testCase: any) {
    const result = await this.provider.createTestCase(projectId, testCase);
    return result.id;
  }
  
  async createTestSteps(projectId: string, testCaseId: string, steps: any[]) {
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
    for (const execution of executions) {
      await this.provider.createTestExecution(projectId, execution);
    }
  }
  
  async uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: any) {
    return `attachment-${Date.now()}`;
  }
  
  async createFieldDefinition(projectId: string, fieldDefinition: any) {
    return `field-${Date.now()}`;
  }
}