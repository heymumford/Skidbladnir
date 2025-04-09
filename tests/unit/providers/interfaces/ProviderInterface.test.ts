/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Test Suite for Provider Interface Compliance
 * 
 * This test suite verifies that provider adapters correctly implement 
 * the required interfaces and adhere to the provider contract.
 */

import { 
  TestManagementProvider,
  SourceProvider,
  TargetProvider,
  ProviderCapabilities,
  EntityType,
  ConnectionStatus,
  ProviderConfig
} from '../../../../packages/common/src/interfaces/provider';

/**
 * Generic test class for verifying that a provider implements the base interface correctly
 */
export class ProviderInterfaceTester {
  
  /**
   * Test if a provider implements the base TestManagementProvider interface
   */
  static testBaseProviderInterface(provider: TestManagementProvider): void {
    // Check required properties
    expect(provider.id).toBeDefined();
    expect(typeof provider.id).toBe('string');
    
    expect(provider.name).toBeDefined();
    expect(typeof provider.name).toBe('string');
    
    expect(provider.version).toBeDefined();
    expect(typeof provider.version).toBe('string');
    
    expect(provider.capabilities).toBeDefined();
    expect(typeof provider.capabilities).toBe('object');
    
    // Check capabilities structure
    const capabilities = provider.capabilities;
    expect(typeof capabilities.canBeSource).toBe('boolean');
    expect(typeof capabilities.canBeTarget).toBe('boolean');
    expect(Array.isArray(capabilities.entityTypes)).toBe(true);
    expect(typeof capabilities.supportsAttachments).toBe('boolean');
    expect(typeof capabilities.supportsExecutionHistory).toBe('boolean');
    expect(typeof capabilities.supportsTestSteps).toBe('boolean');
    expect(typeof capabilities.supportsHierarchy).toBe('boolean');
    expect(typeof capabilities.supportsCustomFields).toBe('boolean');
    
    // Verify supported entity types are valid
    const validEntityTypes = Object.values(EntityType);
    for (const entityType of capabilities.entityTypes) {
      expect(validEntityTypes).toContain(entityType);
    }
    
    // Check required methods
    expect(typeof provider.initialize).toBe('function');
    expect(typeof provider.testConnection).toBe('function');
    expect(typeof provider.getMetadata).toBe('function');
    
    // Check method signatures
    const metadata = provider.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata.systemName).toBeDefined();
    expect(metadata.providerVersion).toBeDefined();
    expect(metadata.capabilities).toBeDefined();
  }
  
  /**
   * Test if a provider implements the SourceProvider interface correctly
   */
  static testSourceProviderInterface(provider: any): void {
    // Verify it's a SourceProvider
    expect(provider.capabilities.canBeSource).toBe(true);
    
    // Check required methods
    expect(typeof provider.getProjects).toBe('function');
    expect(typeof provider.getFolders).toBe('function');
    expect(typeof provider.getTestCases).toBe('function');
    expect(typeof provider.getTestCase).toBe('function');
    expect(typeof provider.getTestCycles).toBe('function');
    expect(typeof provider.getTestExecutions).toBe('function');
    expect(typeof provider.getAttachmentContent).toBe('function');
    expect(typeof provider.getFieldDefinitions).toBe('function');
    
    // Verify source-specific capabilities are enabled if methods are implemented
    if (provider.getAttachmentContent) {
      expect(provider.capabilities.supportsAttachments).toBe(true);
    }
    
    if (provider.getTestExecutions) {
      expect(provider.capabilities.supportsExecutionHistory).toBe(true);
    }
  }
  
  /**
   * Test if a provider implements the TargetProvider interface correctly
   */
  static testTargetProviderInterface(provider: any): void {
    // Verify it's a TargetProvider
    expect(provider.capabilities.canBeTarget).toBe(true);
    
    // Check required methods
    expect(typeof provider.getProjects).toBe('function');
    expect(typeof provider.createFolder).toBe('function');
    expect(typeof provider.createTestCase).toBe('function');
    expect(typeof provider.createTestSteps).toBe('function');
    expect(typeof provider.createTestCycle).toBe('function');
    expect(typeof provider.createTestExecutions).toBe('function');
    expect(typeof provider.uploadAttachment).toBe('function');
    
    // Optional methods based on capabilities
    if (provider.capabilities.supportsCustomFields) {
      expect(typeof provider.createFieldDefinition).toBe('function');
    }
    
    // Verify target-specific capabilities are enabled if methods are implemented
    if (provider.uploadAttachment) {
      expect(provider.capabilities.supportsAttachments).toBe(true);
    }
    
    if (provider.createTestSteps) {
      expect(provider.capabilities.supportsTestSteps).toBe(true);
    }
  }
  
  /**
   * Test both source and target interfaces for a dual-purpose provider
   */
  static testFullProviderInterface(provider: TestManagementProvider): void {
    ProviderInterfaceTester.testBaseProviderInterface(provider);
    
    if (provider.capabilities.canBeSource) {
      ProviderInterfaceTester.testSourceProviderInterface(provider);
    }
    
    if (provider.capabilities.canBeTarget) {
      ProviderInterfaceTester.testTargetProviderInterface(provider);
    }
  }
}

describe('Provider Interface Compliance', () => {
  // We'll use mock implementations for testing the interface compliance
  
  /**
   * Mock implementation for testing the TestManagementProvider interface
   */
  class MockBaseProvider implements TestManagementProvider {
    id = 'mock-provider';
    name = 'Mock Provider';
    version = '1.0.0';
    capabilities: ProviderCapabilities = {
      canBeSource: false,
      canBeTarget: false,
      entityTypes: [EntityType.TEST_CASE],
      supportsAttachments: false,
      supportsExecutionHistory: false,
      supportsTestSteps: false,
      supportsHierarchy: false,
      supportsCustomFields: false
    };
    
    async initialize(config: ProviderConfig): Promise<void> {
      // Do nothing for tests
    }
    
    async testConnection(): Promise<ConnectionStatus> {
      return { connected: true };
    }
    
    getMetadata() {
      return {
        systemName: 'Mock System',
        providerVersion: this.version,
        capabilities: this.capabilities
      };
    }
  }
  
  /**
   * Mock implementation for testing the SourceProvider interface
   */
  class MockSourceProvider extends MockBaseProvider implements SourceProvider {
    constructor() {
      super();
      this.capabilities.canBeSource = true;
      this.capabilities.supportsAttachments = true;
      this.capabilities.supportsExecutionHistory = true;
      this.capabilities.supportsTestSteps = true;
    }
    
    async getProjects() {
      return [];
    }
    
    async getFolders() {
      return [];
    }
    
    async getTestCases() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getTestCase() {
      return {} as any;
    }
    
    async getTestCycles() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getTestExecutions() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getAttachmentContent() {
      return {} as any;
    }
    
    async getFieldDefinitions() {
      return [];
    }
  }
  
  /**
   * Mock implementation for testing the TargetProvider interface
   */
  class MockTargetProvider extends MockBaseProvider implements TargetProvider {
    constructor() {
      super();
      this.capabilities.canBeTarget = true;
      this.capabilities.supportsAttachments = true;
      this.capabilities.supportsTestSteps = true;
      this.capabilities.supportsCustomFields = true;
    }
    
    async getProjects() {
      return [];
    }
    
    async createFolder() {
      return '';
    }
    
    async createTestCase() {
      return '';
    }
    
    async createTestSteps() {
      // Do nothing
    }
    
    async createTestCycle() {
      return '';
    }
    
    async createTestExecutions() {
      // Do nothing
    }
    
    async uploadAttachment() {
      return '';
    }
    
    async createFieldDefinition() {
      return '';
    }
  }
  
  /**
   * Mock implementation for testing a provider that is both source and target
   */
  class MockFullProvider extends MockBaseProvider implements SourceProvider, TargetProvider {
    constructor() {
      super();
      this.capabilities.canBeSource = true;
      this.capabilities.canBeTarget = true;
      this.capabilities.supportsAttachments = true;
      this.capabilities.supportsExecutionHistory = true;
      this.capabilities.supportsTestSteps = true;
      this.capabilities.supportsHierarchy = true;
      this.capabilities.supportsCustomFields = true;
    }
    
    // Source methods
    async getProjects() {
      return [];
    }
    
    async getFolders() {
      return [];
    }
    
    async getTestCases() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getTestCase() {
      return {} as any;
    }
    
    async getTestCycles() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getTestExecutions() {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
    
    async getAttachmentContent() {
      return {} as any;
    }
    
    async getFieldDefinitions() {
      return [];
    }
    
    // Target methods
    async createFolder() {
      return '';
    }
    
    async createTestCase() {
      return '';
    }
    
    async createTestSteps() {
      // Do nothing
    }
    
    async createTestCycle() {
      return '';
    }
    
    async createTestExecutions() {
      // Do nothing
    }
    
    async uploadAttachment() {
      return '';
    }
    
    async createFieldDefinition() {
      return '';
    }
  }
  
  /**
   * Invalid provider for negative testing
   */
  class InvalidProvider implements Partial<TestManagementProvider> {
    id = 'invalid-provider';
    name = 'Invalid Provider';
    
    // Missing required properties and methods
  }
  
  it('should verify base provider interface implementation', () => {
    const provider = new MockBaseProvider();
    ProviderInterfaceTester.testBaseProviderInterface(provider);
  });
  
  it('should verify source provider interface implementation', () => {
    const provider = new MockSourceProvider();
    ProviderInterfaceTester.testSourceProviderInterface(provider);
  });
  
  it('should verify target provider interface implementation', () => {
    const provider = new MockTargetProvider();
    ProviderInterfaceTester.testTargetProviderInterface(provider);
  });
  
  it('should verify full provider interface implementation', () => {
    const provider = new MockFullProvider();
    ProviderInterfaceTester.testFullProviderInterface(provider);
  });
  
  it('should reject invalid provider implementation', () => {
    const provider = new InvalidProvider() as TestManagementProvider;
    expect(() => ProviderInterfaceTester.testBaseProviderInterface(provider)).toThrow();
  });
});