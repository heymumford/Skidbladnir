/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MigrationValidatorFactoryImpl } from '../../../../pkg/usecases/migration/MigrationValidatorFactory';
import { MigrationValidator } from '../../../../pkg/usecases/migration/MigrationValidator';

// Create mock provider factory
const mockSourceProviderFactory = {
  createProvider: jest.fn()
};

const mockTargetProviderFactory = {
  createProvider: jest.fn()
};

// Create mock providers
const mockSourceProvider = {
  getName: jest.fn().mockReturnValue('MockSource'),
  testConnection: jest.fn().mockResolvedValue({ connected: true }),
  getProjects: jest.fn(),
  getTestCases: jest.fn(),
  createTestCase: jest.fn(),
  getTestCaseAttachments: jest.fn(),
  getTestCaseHistory: jest.fn(),
  addTestCaseAttachment: jest.fn(),
  addTestCaseHistory: jest.fn()
};

const mockTargetProvider = {
  getName: jest.fn().mockReturnValue('MockTarget'),
  testConnection: jest.fn().mockResolvedValue({ connected: true }),
  getProjects: jest.fn(),
  getTestCases: jest.fn(),
  createTestCase: jest.fn(),
  getTestCaseAttachments: jest.fn(),
  getTestCaseHistory: jest.fn(),
  addTestCaseAttachment: jest.fn(),
  addTestCaseHistory: jest.fn()
};

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockImplementation(() => mockLogger)
};

describe('MigrationValidatorFactory', () => {
  let factory: MigrationValidatorFactoryImpl;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up mock implementations
    mockSourceProviderFactory.createProvider.mockImplementation((type) => {
      if (type === 'source-provider') {
        return mockSourceProvider;
      }
      return null;
    });
    
    mockTargetProviderFactory.createProvider.mockImplementation((type) => {
      if (type === 'target-provider') {
        return mockTargetProvider;
      }
      return null;
    });
    
    // Create factory instance
    factory = new MigrationValidatorFactoryImpl(
      mockSourceProviderFactory,
      mockTargetProviderFactory,
      mockLogger
    );
  });
  
  it('should create a validator for valid provider types', async () => {
    const validator = await factory.createValidator('source-provider', 'target-provider');
    
    expect(validator).toBeInstanceOf(MigrationValidator);
    expect(mockSourceProviderFactory.createProvider).toHaveBeenCalledWith('source-provider');
    expect(mockTargetProviderFactory.createProvider).toHaveBeenCalledWith('target-provider');
    expect(mockLogger.debug).toHaveBeenCalled();
  });
  
  it('should throw error when source provider type is not found', async () => {
    // Change mock to return null for source provider
    mockSourceProviderFactory.createProvider.mockReturnValue(null);
    
    await expect(factory.createValidator('unknown-source', 'target-provider'))
      .rejects.toThrow("Source provider 'unknown-source' not found");
  });
  
  it('should throw error when target provider type is not found', async () => {
    // Change mock to return null for target provider
    mockTargetProviderFactory.createProvider.mockReturnValue(null);
    
    await expect(factory.createValidator('source-provider', 'unknown-target'))
      .rejects.toThrow("Target provider 'unknown-target' not found");
  });
  
  it('should work without a logger', async () => {
    // Create factory without logger
    const factoryWithoutLogger = new MigrationValidatorFactoryImpl(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    const validator = await factoryWithoutLogger.createValidator('source-provider', 'target-provider');
    
    expect(validator).toBeInstanceOf(MigrationValidator);
  });
});