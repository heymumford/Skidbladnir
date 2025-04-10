/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MigrateTestCasesUseCase, MigrateTestCasesInput, MigrateTestCasesResult } from '../../../../pkg/usecases/migration/MigrateTestCases';
import { TestCase } from '../../../../pkg/domain/entities/TestCase';
import { EntityNotFoundError } from '../../../../pkg/domain/errors/DomainErrors';

describe('MigrateTestCasesUseCase', () => {
  // Mock implementations
  const mockSourceProvider = {
    getTestCases: jest.fn(),
    createTestCase: jest.fn(),
    getTestCaseAttachments: jest.fn(),
    addTestCaseAttachment: jest.fn(),
    getTestCaseHistory: jest.fn(),
    addTestCaseHistory: jest.fn()
  };
  
  const mockTargetProvider = {
    getTestCases: jest.fn(),
    createTestCase: jest.fn(),
    getTestCaseAttachments: jest.fn(),
    addTestCaseAttachment: jest.fn(),
    getTestCaseHistory: jest.fn(),
    addTestCaseHistory: jest.fn()
  };
  
  const mockSourceProviderFactory = {
    createProvider: jest.fn()
  };
  
  const mockTargetProviderFactory = {
    createProvider: jest.fn()
  };
  
  // Test fixtures
  const testCases: TestCase[] = [
    {
      id: 'TC-1001',
      title: 'Login test',
      description: 'Verify user login',
      status: 'READY',
      priority: 'HIGH',
      steps: [],
      tags: ['login', 'security'],
      author: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'TC-1002',
      title: 'Logout test',
      description: 'Verify user logout',
      status: 'READY',
      priority: 'MEDIUM',
      steps: [],
      tags: ['logout', 'security'],
      author: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const mockAttachments = [
    {
      id: 'ATT-1',
      name: 'screenshot.png',
      contentType: 'image/png',
      content: Buffer.from('test'),
      size: 100
    }
  ];
  
  const mockHistory = [
    {
      id: 'HIST-1',
      date: new Date(),
      author: 'user1',
      field: 'status',
      oldValue: 'DRAFT',
      newValue: 'READY'
    }
  ];
  
  // Default migration input
  const defaultInput: MigrateTestCasesInput = {
    sourceSystem: 'zephyr',
    targetSystem: 'qtest',
    projectKey: 'TEST',
    options: {
      includeAttachments: true,
      includeHistory: true,
      preserveIds: false,
      dryRun: false
    }
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockSourceProviderFactory.createProvider.mockReturnValue(mockSourceProvider);
    mockTargetProviderFactory.createProvider.mockReturnValue(mockTargetProvider);
    mockSourceProvider.getTestCases.mockResolvedValue(testCases);
    mockSourceProvider.getTestCaseAttachments.mockResolvedValue(mockAttachments);
    mockSourceProvider.getTestCaseHistory.mockResolvedValue(mockHistory);
    mockTargetProvider.createTestCase.mockImplementation((projectKey, testCase) => {
      return Promise.resolve({
        ...testCase,
        id: `NEW-${testCase.id}`
      });
    });
  });
  
  it('should initialize correctly with provider factories', () => {
    // Arrange & Act
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Assert
    expect(useCase).toBeDefined();
  });
  
  it('should throw error when source provider is not found', async () => {
    // Arrange
    mockSourceProviderFactory.createProvider.mockReturnValue(null);
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Act & Assert
    await expect(useCase.execute(defaultInput))
      .rejects
      .toThrow(EntityNotFoundError);
  });
  
  it('should throw error when target provider is not found', async () => {
    // Arrange
    mockTargetProviderFactory.createProvider.mockReturnValue(null);
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Act & Assert
    await expect(useCase.execute(defaultInput))
      .rejects
      .toThrow(EntityNotFoundError);
  });
  
  it('should properly orchestrate migration in dry run mode', async () => {
    // Arrange
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    const dryRunInput = {
      ...defaultInput,
      options: {
        ...defaultInput.options,
        dryRun: true
      }
    };
    
    // Act
    const result = await useCase.execute(dryRunInput);
    
    // Assert
    expect(mockSourceProviderFactory.createProvider).toHaveBeenCalledWith('zephyr');
    expect(mockTargetProviderFactory.createProvider).toHaveBeenCalledWith('qtest');
    expect(mockSourceProvider.getTestCases).toHaveBeenCalledWith('TEST');
    
    // In dry run mode, no actual migration should occur
    expect(mockTargetProvider.createTestCase).not.toHaveBeenCalled();
    expect(mockSourceProvider.getTestCaseAttachments).not.toHaveBeenCalled();
    expect(mockSourceProvider.getTestCaseHistory).not.toHaveBeenCalled();
    
    // Verify result structure
    expect(result.dryRun).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.details.migrated.length).toBe(2);
  });
  
  it('should properly orchestrate full migration process', async () => {
    // Arrange
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Act
    const result = await useCase.execute(defaultInput);
    
    // Assert
    // 1. Correct provider creation
    expect(mockSourceProviderFactory.createProvider).toHaveBeenCalledWith('zephyr');
    expect(mockTargetProviderFactory.createProvider).toHaveBeenCalledWith('qtest');
    
    // 2. Test case extraction
    expect(mockSourceProvider.getTestCases).toHaveBeenCalledWith('TEST');
    
    // 3. Test case creation in target system - once per test case
    expect(mockTargetProvider.createTestCase).toHaveBeenCalledTimes(2);
    expect(mockTargetProvider.createTestCase).toHaveBeenCalledWith('TEST', testCases[0]);
    expect(mockTargetProvider.createTestCase).toHaveBeenCalledWith('TEST', testCases[1]);
    
    // 4. Attachment handling - once per test case
    expect(mockSourceProvider.getTestCaseAttachments).toHaveBeenCalledTimes(2);
    expect(mockTargetProvider.addTestCaseAttachment).toHaveBeenCalledTimes(2);
    
    // 5. History handling - once per test case
    expect(mockSourceProvider.getTestCaseHistory).toHaveBeenCalledTimes(2);
    expect(mockTargetProvider.addTestCaseHistory).toHaveBeenCalledTimes(2);
    
    // 6. Verify result structure
    expect(result.dryRun).toBe(false);
    expect(result.migratedCount).toBe(2);
    expect(result.details.migrated.length).toBe(2);
    expect(result.details.migrated[0].sourceId).toBe('TC-1001');
    expect(result.details.migrated[0].targetId).toBe('NEW-TC-1001');
  });
  
  it('should handle migration without attachments when option is disabled', async () => {
    // Arrange
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    const inputWithoutAttachments = {
      ...defaultInput,
      options: {
        ...defaultInput.options,
        includeAttachments: false
      }
    };
    
    // Act
    await useCase.execute(inputWithoutAttachments);
    
    // Assert
    expect(mockSourceProvider.getTestCaseAttachments).not.toHaveBeenCalled();
    expect(mockTargetProvider.addTestCaseAttachment).not.toHaveBeenCalled();
  });
  
  it('should handle migration without history when option is disabled', async () => {
    // Arrange
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    const inputWithoutHistory = {
      ...defaultInput,
      options: {
        ...defaultInput.options,
        includeHistory: false
      }
    };
    
    // Act
    await useCase.execute(inputWithoutHistory);
    
    // Assert
    expect(mockSourceProvider.getTestCaseHistory).not.toHaveBeenCalled();
    expect(mockTargetProvider.addTestCaseHistory).not.toHaveBeenCalled();
  });
  
  it('should handle errors during test case creation', async () => {
    // Arrange
    mockTargetProvider.createTestCase.mockImplementation((projectKey, testCase) => {
      if (testCase.id === 'TC-1002') {
        return Promise.reject(new Error('Error creating test case'));
      }
      return Promise.resolve({
        ...testCase,
        id: `NEW-${testCase.id}`
      });
    });
    
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Act
    const result = await useCase.execute(defaultInput);
    
    // Assert
    expect(result.migratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.details.migrated.length).toBe(1);
    expect(result.details.failed.length).toBe(1);
    expect(result.details.failed[0].sourceId).toBe('TC-1002');
    expect(result.details.failed[0].error).toBe('Error creating test case');
  });
  
  it('should handle errors during attachment processing', async () => {
    // Arrange
    mockTargetProvider.addTestCaseAttachment.mockImplementation((testCaseId, attachment) => {
      if (testCaseId === 'NEW-TC-1002') {
        return Promise.reject(new Error('Error adding attachment'));
      }
      return Promise.resolve();
    });
    
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    // Act
    const result = await useCase.execute(defaultInput);
    
    // Assert
    expect(result.migratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.details.migrated.length).toBe(1);
    expect(result.details.failed.length).toBe(1);
  });
  
  it('should preserve test case IDs when preserveIds option is enabled', async () => {
    // Arrange
    mockTargetProvider.createTestCase.mockImplementation((projectKey, testCase) => {
      return Promise.resolve({
        ...testCase
        // When preserveIds is true, the ID is not changed
      });
    });
    
    const useCase = new MigrateTestCasesUseCase(
      mockSourceProviderFactory,
      mockTargetProviderFactory
    );
    
    const inputWithPreservedIds = {
      ...defaultInput,
      options: {
        ...defaultInput.options,
        preserveIds: true
      }
    };
    
    // Act
    const result = await useCase.execute(inputWithPreservedIds);
    
    // Assert
    expect(result.details.migrated[0].sourceId).toBe('TC-1001');
    expect(result.details.migrated[0].targetId).toBe('TC-1001');
    expect(result.details.migrated[1].sourceId).toBe('TC-1002');
    expect(result.details.migrated[1].targetId).toBe('TC-1002');
  });
});