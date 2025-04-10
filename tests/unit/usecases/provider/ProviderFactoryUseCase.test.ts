/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ProviderFactoryUseCase } from '../../../../pkg/usecases/provider/ProviderFactoryUseCase';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';
import { TestManagementProvider, ProviderCapabilities, EntityType, ProviderRegistry } from '../../../../packages/common/src/interfaces/provider';

describe('ProviderFactoryUseCase', () => {
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

  let providerFactoryUseCase: ProviderFactoryUseCase;
  let providerRegistry: ProviderRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    providerRegistry = new ProviderRegistry();
    providerFactoryUseCase = new ProviderFactoryUseCase(mockLogger, providerRegistry);
  });

  describe('Provider Registration', () => {
    it('should register provider builders', () => {
      providerFactoryUseCase.registerProviderBuilder('mock', mockProviderBuilder);
      expect(providerFactoryUseCase.getAvailableProviderTypes()).toContain('mock');
    });

    it('should reject duplicate provider type registrations', () => {
      // Register first provider
      providerFactoryUseCase.registerProviderBuilder('mock', mockProviderBuilder);
      
      // Try to register again
      expect(() => {
        providerFactoryUseCase.registerProviderBuilder('mock', mockProviderBuilder);
      }).toThrow('Provider type already registered');
    });

    it('should return available provider types', () => {
      providerFactoryUseCase.registerProviderBuilder('mock1', mockProviderBuilder);
      providerFactoryUseCase.registerProviderBuilder('mock2', mockProviderBuilder);
      
      const types = providerFactoryUseCase.getAvailableProviderTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain('mock1');
      expect(types).toContain('mock2');
    });
  });

  describe('Provider Creation', () => {
    beforeEach(() => {
      providerFactoryUseCase.registerProviderBuilder('mock', mockProviderBuilder);
    });

    it('should create provider instance', () => {
      const result = providerFactoryUseCase.createProvider({
        type: 'mock',
        config: { apiKey: 'test-key' }
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBeDefined();
      expect(result.provider!.id).toBe('mock-provider');
      expect(mockProviderBuilder).toHaveBeenCalled();
      
      // Verify provider was registered
      expect(providerRegistry.getProvider('mock-provider')).toBe(mockProvider);
    });

    it('should handle unknown provider type', () => {
      const result = providerFactoryUseCase.createProvider({
        type: 'unknown',
        config: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider type not found: unknown');
      expect(result.provider).toBeUndefined();
    });

    it('should handle builder errors', () => {
      // Set up builder to throw an error
      mockProviderBuilder.mockImplementationOnce(() => {
        throw new Error('Builder error');
      });

      const result = providerFactoryUseCase.createProvider({
        type: 'mock',
        config: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create provider: Builder error');
      expect(result.provider).toBeUndefined();
    });
  });
});