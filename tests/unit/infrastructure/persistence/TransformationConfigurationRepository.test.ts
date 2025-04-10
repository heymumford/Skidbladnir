/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { InMemoryTransformationConfigurationRepository } from '../../../../pkg/infrastructure/persistence/TransformationConfigurationRepository';
import { TransformationConfiguration } from '../../../../pkg/usecases/transformation/TransformTestCasesUseCase';
import { LoggerService } from '../../../../pkg/interfaces/LoggerService';

// Mock logger
const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('InMemoryTransformationConfigurationRepository', () => {
  let repository: InMemoryTransformationConfigurationRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new InMemoryTransformationConfigurationRepository(mockLogger);
  });
  
  describe('getTransformationConfiguration', () => {
    it('should retrieve a configuration by ID', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: { name: 'title' },
        valueMappings: {}
      };
      
      await repository.saveTransformationConfiguration(testConfig);
      
      // Act
      const result = await repository.getTransformationConfiguration('test-config');
      
      // Assert
      expect(result).not.toBeNull();
      expect(result).toEqual(testConfig);
    });
    
    it('should return null for non-existent configuration', async () => {
      // Act
      const result = await repository.getTransformationConfiguration('non-existent');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should return a copy of the configuration, not the original', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: { name: 'title' },
        valueMappings: {}
      };
      
      await repository.saveTransformationConfiguration(testConfig);
      
      // Act
      const result = await repository.getTransformationConfiguration('test-config');
      
      // Modify the result
      if (result) {
        result.name = 'Modified';
      }
      
      // Get the configuration again
      const secondResult = await repository.getTransformationConfiguration('test-config');
      
      // Assert - original should be unchanged
      expect(secondResult?.name).toBe('Test Configuration');
    });
  });
  
  describe('saveTransformationConfiguration', () => {
    it('should save a new configuration', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: { name: 'title' },
        valueMappings: {}
      };
      
      // Act
      const result = await repository.saveTransformationConfiguration(testConfig);
      
      // Assert
      expect(result).toEqual(testConfig);
      
      // Verify it was stored
      const savedConfig = await repository.getTransformationConfiguration('test-config');
      expect(savedConfig).not.toBeNull();
    });
    
    it('should update an existing configuration', async () => {
      // Arrange
      const initialConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: { name: 'title' },
        valueMappings: {}
      };
      
      await repository.saveTransformationConfiguration(initialConfig);
      
      const updatedConfig: TransformationConfiguration = {
        ...initialConfig,
        name: 'Updated Configuration',
        fieldMappings: { name: 'title', description: 'summary' }
      };
      
      // Act
      await repository.saveTransformationConfiguration(updatedConfig);
      
      // Assert
      const result = await repository.getTransformationConfiguration('test-config');
      expect(result).toEqual(updatedConfig);
    });
    
    it('should set the first configuration as default for a source-target pair', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-x',
        targetSystem: 'system-y',
        fieldMappings: {},
        valueMappings: {}
      };
      
      // Act
      await repository.saveTransformationConfiguration(testConfig);
      
      // Assert - should be the default
      const defaultConfig = await repository.getDefaultConfiguration('system-x', 'system-y');
      expect(defaultConfig).not.toBeNull();
      expect(defaultConfig?.id).toBe('test-config');
    });
  });
  
  describe('deleteTransformationConfiguration', () => {
    it('should delete an existing configuration', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {},
        valueMappings: {}
      };
      
      await repository.saveTransformationConfiguration(testConfig);
      
      // Act
      const result = await repository.deleteTransformationConfiguration('test-config');
      
      // Assert
      expect(result).toBe(true);
      
      // Verify it was deleted
      const deletedConfig = await repository.getTransformationConfiguration('test-config');
      expect(deletedConfig).toBeNull();
    });
    
    it('should return false when trying to delete a non-existent configuration', async () => {
      // Act
      const result = await repository.deleteTransformationConfiguration('non-existent');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should remove the default configuration reference when deleting a default', async () => {
      // Arrange
      const testConfig: TransformationConfiguration = {
        id: 'test-config',
        name: 'Test Configuration',
        sourceSystem: 'system-c',
        targetSystem: 'system-d',
        fieldMappings: {},
        valueMappings: {}
      };
      
      await repository.saveTransformationConfiguration(testConfig);
      
      // Verify it's the default
      const defaultBefore = await repository.getDefaultConfiguration('system-c', 'system-d');
      expect(defaultBefore?.id).toBe('test-config');
      
      // Act - delete the configuration
      await repository.deleteTransformationConfiguration('test-config');
      
      // Assert - default should be removed
      const defaultAfter = await repository.getDefaultConfiguration('system-c', 'system-d');
      expect(defaultAfter).toBeNull();
    });
  });
  
  describe('getDefaultConfiguration', () => {
    it('should return the default configuration for a source-target pair', async () => {
      // Default configurations are initialized in the constructor
      
      // Act
      const result = await repository.getDefaultConfiguration('qtest', 'zephyr');
      
      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('default-qtest-to-zephyr');
    });
    
    it('should return null when no default configuration exists', async () => {
      // Act
      const result = await repository.getDefaultConfiguration('unknown', 'system');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('Default configurations', () => {
    it('should initialize with default configurations', async () => {
      // Act
      const qtestToZephyr = await repository.getDefaultConfiguration('qtest', 'zephyr');
      const zephyrToQTest = await repository.getDefaultConfiguration('zephyr', 'qtest');
      
      // Assert
      expect(qtestToZephyr).not.toBeNull();
      expect(qtestToZephyr?.name).toBe('Default qTest to Zephyr');
      
      expect(zephyrToQTest).not.toBeNull();
      expect(zephyrToQTest?.name).toBe('Default Zephyr to qTest');
    });
    
    it('should have correct field mappings in default configurations', async () => {
      // Act
      const qtestToZephyr = await repository.getDefaultConfiguration('qtest', 'zephyr');
      
      // Assert
      expect(qtestToZephyr?.fieldMappings).toEqual({
        'name': 'name',
        'description': 'description',
        'objective': 'objective',
        'precondition': 'precondition',
        'test_steps': 'steps'
      });
      
      expect(qtestToZephyr?.valueMappings?.status).toBeDefined();
      expect(qtestToZephyr?.valueMappings?.priority).toBeDefined();
    });
  });
});