/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { QTestFacadeProvider } from '../../../packages/providers/qtest/facade';
import { QTestManagerProvider } from '../../../packages/providers/qtest/manager-provider';
import { TestCase, Folder } from '../../../packages/common/src/models/entities';

// Mock QTestManagerProvider
jest.mock('../../../packages/providers/qtest/manager-provider');
const MockedManagerProvider = QTestManagerProvider as jest.MockedClass<typeof QTestManagerProvider>;

describe('QTestFacadeProvider', () => {
  let provider: QTestFacadeProvider;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up mock implementations for QTestManagerProvider
    MockedManagerProvider.prototype.initialize.mockResolvedValue(undefined);
    MockedManagerProvider.prototype.testConnection.mockResolvedValue({
      connected: true,
      details: { metrics: {} }
    });
    
    // Create facade provider
    provider = new QTestFacadeProvider();
  });
  
  describe('initialization', () => {
    it('initializes all configured product providers', async () => {
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token',
        products: {
          manager: {
            enableMigration: true
          }
        }
      });
      
      // Verify Manager provider was initialized
      expect(MockedManagerProvider.prototype.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://test.qtestnet.com/api/v3',
          apiToken: 'test-token',
          enableMigration: true
        })
      );
    });
    
    it('throws error with invalid config', async () => {
      // Invalid config (missing baseUrl)
      await expect(provider.initialize({} as any)).rejects.toThrow();
    });
    
    it('throws error if authentication is missing', async () => {
      // Config with baseUrl but no auth
      await expect(provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3'
      })).rejects.toThrow(/apiToken or both username and password/);
    });
  });
  
  describe('test connection', () => {
    beforeEach(async () => {
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('returns successful connection if any product is connected', async () => {
      // Set up mocks for successful connection
      MockedManagerProvider.prototype.testConnection.mockResolvedValue({
        connected: true,
        details: { metrics: {} }
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(true);
      expect(result.details).toBeDefined();
      expect(MockedManagerProvider.prototype.testConnection).toHaveBeenCalled();
    });
    
    it('returns failed connection if all products fail', async () => {
      // Set up mocks for failed connection
      MockedManagerProvider.prototype.testConnection.mockResolvedValue({
        connected: false,
        error: 'Connection failed'
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(false);
      expect(result.details).toBeDefined();
      expect(MockedManagerProvider.prototype.testConnection).toHaveBeenCalled();
    });
    
    it('handles exceptions during connection test', async () => {
      // Set up mocks to throw
      MockedManagerProvider.prototype.testConnection.mockRejectedValue(
        new Error('Unexpected error')
      );
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(false);
      expect(result.error).toContain('Unexpected error');
      expect(MockedManagerProvider.prototype.testConnection).toHaveBeenCalled();
    });
  });
  
  describe('provider operations', () => {
    beforeEach(async () => {
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('delegates getProjects to Manager provider', async () => {
      // Set up mock
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' }
      ];
      MockedManagerProvider.prototype.getProjects.mockResolvedValue(mockProjects);
      
      // Call method
      const result = await provider.getProjects();
      
      // Verify
      expect(result).toEqual(mockProjects);
      expect(MockedManagerProvider.prototype.getProjects).toHaveBeenCalled();
    });
    
    it('delegates getFolders to Manager provider', async () => {
      // Set up mock
      const mockFolders = [
        { id: '1', name: 'Folder 1' },
        { id: '2', name: 'Folder 2', parentId: '1' }
      ];
      MockedManagerProvider.prototype.getFolders.mockResolvedValue(mockFolders);
      
      // Call method
      const result = await provider.getFolders('1');
      
      // Verify
      expect(result).toEqual(mockFolders);
      expect(MockedManagerProvider.prototype.getFolders).toHaveBeenCalledWith('1');
    });
    
    it('delegates getTestCases to Manager provider', async () => {
      // Set up mock
      const mockTestCases = {
        items: [{ id: '1', name: 'Test Case 1' }],
        total: 1,
        page: 1,
        pageSize: 10
      };
      MockedManagerProvider.prototype.getTestCases.mockResolvedValue(mockTestCases);
      
      // Call method
      const result = await provider.getTestCases('1', { page: 1, pageSize: 10 });
      
      // Verify
      expect(result).toEqual(mockTestCases);
      expect(MockedManagerProvider.prototype.getTestCases).toHaveBeenCalledWith(
        '1',
        { page: 1, pageSize: 10 }
      );
    });
    
    it('delegates createTestCase to Manager provider', async () => {
      // Set up mock
      MockedManagerProvider.prototype.createTestCase.mockResolvedValue('101');
      
      // Prepare test case
      const testCase: TestCase = {
        name: 'Test Case 1',
        description: 'Test description'
      };
      
      // Call method
      const result = await provider.createTestCase('1', testCase);
      
      // Verify
      expect(result).toBe('101');
      expect(MockedManagerProvider.prototype.createTestCase).toHaveBeenCalledWith(
        '1',
        testCase
      );
    });
  });
  
  describe('specialized operations', () => {
    beforeEach(async () => {
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('migrates test cases using Manager provider', async () => {
      // Set up mock for getFolders
      const mockFolders = [
        { id: 'folder1', name: 'Folder 1' },
        { id: 'folder2', name: 'Folder 2' }
      ];
      MockedManagerProvider.prototype.getFolders.mockResolvedValue(mockFolders);
      
      // Set up mock for createFolderStructure
      const mockFolderMapping = new Map<string, string>();
      mockFolderMapping.set('folder1', '101');
      mockFolderMapping.set('folder2', '102');
      MockedManagerProvider.prototype.createFolderStructure = jest.fn().mockResolvedValue(mockFolderMapping);
      
      // Set up mock for migrateTestCases
      const mockMigrationResult = {
        total: 2,
        migrated: 2,
        errors: 0,
        errorDetails: [],
        idMapping: new Map<string, string>([
          ['tc1', '1001'],
          ['tc2', '1002']
        ])
      };
      MockedManagerProvider.prototype.migrateTestCases = jest.fn().mockResolvedValue(mockMigrationResult);
      
      // Prepare test cases
      const testCases: TestCase[] = [
        {
          id: 'tc1',
          name: 'Test Case 1',
          folder: 'folder1'
        },
        {
          id: 'tc2',
          name: 'Test Case 2',
          folder: 'folder2'
        }
      ];
      
      // Call method
      const result = await provider.migrateTestCases('1', testCases);
      
      // Verify
      expect(result).toEqual(mockMigrationResult);
      expect(MockedManagerProvider.prototype.getFolders).toHaveBeenCalledWith('1');
      expect(MockedManagerProvider.prototype.createFolderStructure).toHaveBeenCalledWith(
        '1',
        expect.arrayContaining([
          expect.objectContaining({ id: 'folder1' }),
          expect.objectContaining({ id: 'folder2' })
        ])
      );
      expect(MockedManagerProvider.prototype.migrateTestCases).toHaveBeenCalledWith(
        '1',
        testCases,
        mockFolderMapping
      );
    });
  });
});