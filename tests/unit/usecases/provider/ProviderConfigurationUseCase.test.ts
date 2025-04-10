/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ProviderConfigurationUseCase, ProviderConfiguration } from '../../../../pkg/usecases/provider/ProviderConfigurationUseCase';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';
import { TestManagementProvider, ProviderCapabilities, EntityType } from '../../../../packages/common/src/interfaces/provider';

describe('ProviderConfigurationUseCase', () => {
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

  const mockProviderResolver = jest.fn().mockReturnValue(mockProvider);
  let useCase: ProviderConfigurationUseCase;
  let mockConfig: ProviderConfiguration;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProviderConfigurationUseCase(mockLogger, mockProviderResolver);
    
    mockConfig = {
      id: 'config-1',
      name: 'Test Config',
      providerId: 'mock-provider',
      config: { apiKey: 'test-key' },
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true
    };
  });

  describe('Configuration Creation', () => {
    it('should create a new configuration', async () => {
      const input = {
        name: 'Test Config',
        providerId: 'mock-provider',
        config: { apiKey: 'test-key' },
        isDefault: true
      };

      const result = await useCase.saveConfiguration(input);

      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.configuration!.name).toBe('Test Config');
      expect(result.configuration!.providerId).toBe('mock-provider');
      expect(result.configuration!.config).toEqual({ apiKey: 'test-key' });
      expect(result.configuration!.isDefault).toBe(true);
      expect(result.configuration!.id).toBeDefined();
      expect(result.configuration!.createdAt).toBeDefined();
      expect(result.configuration!.updatedAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const input = {
        name: '',
        providerId: 'mock-provider',
        config: {}
      };

      const result = await useCase.saveConfiguration(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should validate provider ID', async () => {
      const input = {
        name: 'Test Config',
        providerId: '',
        config: { apiKey: 'test-key' }
      };

      const result = await useCase.saveConfiguration(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider ID is required');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      // Save a configuration for testing
      await useCase.saveConfiguration({
        name: 'Test Config',
        providerId: 'mock-provider',
        config: { apiKey: 'test-key' },
        isDefault: true
      });
    });

    it('should get a configuration by ID', async () => {
      // Get all configurations
      const allConfigs = await useCase.getAllConfigurations();
      const configId = allConfigs[0].id;
      
      // Get by ID
      const result = await useCase.getConfiguration(configId);
      
      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.configuration!.id).toBe(configId);
    });

    it('should handle non-existent configuration ID', async () => {
      const result = await useCase.getConfiguration('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Configuration not found');
    });

    it('should get configurations by provider ID', async () => {
      const result = await useCase.getConfigurationsByProvider('mock-provider');
      
      expect(result.success).toBe(true);
      expect(result.configurations).toBeDefined();
      expect(result.configurations!.length).toBe(1);
      expect(result.configurations![0].providerId).toBe('mock-provider');
    });

    it('should delete a configuration', async () => {
      // Get all configurations
      const allConfigs = await useCase.getAllConfigurations();
      const configId = allConfigs[0].id;
      
      // Delete
      const result = await useCase.deleteConfiguration(configId);
      
      expect(result.success).toBe(true);
      
      // Verify deleted
      const getResult = await useCase.getConfiguration(configId);
      expect(getResult.success).toBe(false);
      expect(getResult.error).toBe('Configuration not found');
    });

    it('should update an existing configuration', async () => {
      // Get all configurations
      const allConfigs = await useCase.getAllConfigurations();
      const configId = allConfigs[0].id;
      
      // Update
      const result = await useCase.saveConfiguration({
        id: configId,
        name: 'Updated Config',
        providerId: 'mock-provider',
        config: { apiKey: 'new-key' }
      });
      
      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.configuration!.id).toBe(configId);
      expect(result.configuration!.name).toBe('Updated Config');
      expect(result.configuration!.config).toEqual({ apiKey: 'new-key' });
    });
  });

  describe('Testing Configuration', () => {
    let configId: string;

    beforeEach(async () => {
      // Save a configuration for testing
      const result = await useCase.saveConfiguration({
        name: 'Test Config',
        providerId: 'mock-provider',
        config: { apiKey: 'test-key' },
        isDefault: true
      });
      
      configId = result.configuration!.id;
    });

    it('should test a connection successfully', async () => {
      mockProvider.testConnection.mockResolvedValueOnce({ connected: true });
      
      const result = await useCase.testConfiguration({ configId });
      
      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status!.connected).toBe(true);
      expect(mockProvider.initialize).toHaveBeenCalledWith({ apiKey: 'test-key' });
      expect(mockProvider.testConnection).toHaveBeenCalled();
    });

    it('should handle failed connections', async () => {
      mockProvider.testConnection.mockResolvedValueOnce({ 
        connected: false, 
        error: 'Invalid credentials'
      });
      
      const result = await useCase.testConfiguration({ configId });
      
      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status!.connected).toBe(false);
      expect(result.status!.error).toBe('Invalid credentials');
    });

    it('should handle provider lookup errors', async () => {
      mockProviderResolver.mockReturnValueOnce(undefined);
      
      const result = await useCase.testConfiguration({ configId });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider not found');
    });

    it('should handle configuration not found', async () => {
      const result = await useCase.testConfiguration({ configId: 'non-existent' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Configuration not found');
    });
  });
});