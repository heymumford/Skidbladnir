/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ProviderManagementFacade } from '../../../../pkg/usecases/provider/ProviderManagementFacade';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';
import { TestManagementProvider, ProviderCapabilities, EntityType } from '../../../../packages/common/src/interfaces/provider';
import { ProviderConfiguration } from '../../../../pkg/usecases/provider/ProviderConfigurationUseCase';

describe('ProviderManagementFacade', () => {
  // Mock logger
  const mockLogger: LoggerService = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis()
  };

  // Mock provider
  const mockProvider: TestManagementProvider = {
    id: 'mock-provider',
    name: 'Mock Provider',
    version: '1.0.0',
    capabilities: {
      canBeSource: true,
      canBeTarget: true,
      entityTypes: [EntityType.TEST_CASE],
      supportsAttachments: true,
      supportsExecutionHistory: true,
      supportsTestSteps: true,
      supportsHierarchy: true,
      supportsCustomFields: true
    },
    initialize: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue({ connected: true }),
    getMetadata: jest.fn().mockReturnValue({
      systemName: 'Mock System',
      providerVersion: '1.0.0',
      capabilities: {} as ProviderCapabilities
    })
  };

  // Mock provider builder
  const mockProviderBuilder = jest.fn().mockReturnValue(mockProvider);

  let facade: ProviderManagementFacade;

  beforeEach(() => {
    jest.clearAllMocks();
    facade = new ProviderManagementFacade(mockLogger);
    
    // Register mock provider builder
    facade.registerProviderBuilder('mock', mockProviderBuilder);
  });

  describe('Provider Creation and Registration', () => {
    it('should register provider builders', () => {
      expect(facade.getAvailableProviderTypes()).toContain('mock');
    });

    it('should create provider instance', () => {
      const result = facade.createProvider({
        type: 'mock',
        config: { apiKey: 'test-key' }
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBeDefined();
      expect(result.provider!.id).toBe('mock-provider');
    });

    it('should return available provider types', () => {
      const types = facade.getAvailableProviderTypes();
      expect(types).toEqual(['mock']);
    });
  });

  describe('Provider Management', () => {
    beforeEach(() => {
      // Create and register a provider
      facade.createProvider({ type: 'mock', config: {} });
    });

    it('should get all registered providers', () => {
      const providers = facade.getAllProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('mock-provider');
    });

    it('should get provider by ID', () => {
      const provider = facade.getProviderById('mock-provider');
      expect(provider).toBeDefined();
      expect(provider.id).toBe('mock-provider');
    });

    it('should get source providers', () => {
      const providers = facade.getSourceProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('mock-provider');
    });

    it('should get target providers', () => {
      const providers = facade.getTargetProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('mock-provider');
    });

    it('should initialize provider with configuration', async () => {
      await facade.initializeProvider('mock-provider', { apiKey: 'test-key' });
      expect(mockProvider.initialize).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });

  describe('Configuration Management', () => {
    const _mockConfig: ProviderConfiguration = {
      id: 'config-1',
      name: 'Test Config',
      providerId: 'mock-provider',
      config: { apiKey: 'test-key' },
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true
    };

    beforeEach(() => {
      // Create and register a provider
      facade.createProvider({ type: 'mock', config: {} });
    });

    it('should save provider configuration', async () => {
      const result = await facade.saveProviderConfiguration({
        name: 'Test Config',
        providerId: 'mock-provider',
        config: { apiKey: 'test-key' },
        isDefault: true
      });

      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.configuration!.name).toBe('Test Config');
      expect(result.configuration!.providerId).toBe('mock-provider');
    });

    it('should handle errors when testing provider connection', async () => {
      await expect(
        facade.testProviderConnection('non-existent-provider')
      ).rejects.toThrow('No default configuration found for provider');
    });
  });

  describe('Migration', () => {
    // We need to mock repository methods for these tests
    // This is challenging to test directly since we'd need to
    // mock the repository implementations internal to the facade
    
    beforeEach(() => {
      // Create and register a provider
      facade.createProvider({ type: 'mock', config: {} });
    });

    it('should reject migration with missing configurations', async () => {
      await expect(
        facade.startMigration({
          sourceProviderId: 'mock-provider',
          targetProviderId: 'non-existent-provider',
          projectKey: 'TEST',
          options: {
            includeAttachments: true,
            includeHistory: true,
            preserveIds: false,
            dryRun: false
          }
        })
      ).rejects.toThrow('No default configuration found for');
    });

    it('should get migration status by job ID', () => {
      const status = facade.getMigrationStatus('non-existent-job');
      expect(status).toBeNull();
    });
  });
});