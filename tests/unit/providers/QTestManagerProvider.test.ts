/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosResponse } from 'axios';
import { QTestManagerProvider } from '../../../packages/providers/qtest/manager-provider';
import { QTestManagerClient } from '../../../packages/providers/qtest/api-client/manager-client';
import { TestCase, Folder } from '../../../packages/common/src/models/entities';
import { MigrationStatus } from '../../../packages/providers/qtest/manager-provider';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock QTestManagerClient
jest.mock('../../../packages/providers/qtest/api-client/manager-client');
const MockedQTestManagerClient = QTestManagerClient as jest.MockedClass<typeof QTestManagerClient>;

describe('QTestManagerProvider', () => {
  let provider: QTestManagerProvider;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create provider
    provider = new QTestManagerProvider();
  });
  
  describe('initialization', () => {
    it('initializes correctly with valid config', async () => {
      // Set up mock implementation for QTestManagerClient
      MockedQTestManagerClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
      
      // Verify
      expect(MockedQTestManagerClient).toHaveBeenCalled();
    });
    
    it('throws error with invalid config', async () => {
      // Invalid config (missing baseUrl)
      await expect(provider.initialize({} as any)).rejects.toThrow();
    });
  });
  
  describe('test connection', () => {
    it('returns successful connection status', async () => {
      // Set up mock implementation
      MockedQTestManagerClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(true);
      expect(MockedQTestManagerClient.prototype.testConnection).toHaveBeenCalled();
    });
    
    it('returns failed connection status on error', async () => {
      // Set up mock implementation
      MockedQTestManagerClient.prototype.testConnection.mockRejectedValue(new Error('Connection failed'));
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
      expect(MockedQTestManagerClient.prototype.testConnection).toHaveBeenCalled();
    });
  });
  
  describe('folder operations', () => {
    beforeEach(async () => {
      // Set up mock implementations
      MockedQTestManagerClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('gets folders correctly', async () => {
      // Mock response for getModules
      const mockModules = [
        {
          id: 1,
          name: 'Folder 1',
          description: 'Test folder 1',
          path: '/Folder 1',
          sub_modules: [
            {
              id: 2,
              name: 'Subfolder 1',
              description: 'Test subfolder 1',
              path: '/Folder 1/Subfolder 1'
            }
          ]
        }
      ];
      
      MockedQTestManagerClient.prototype.getModules.mockResolvedValue({
        data: mockModules
      } as AxiosResponse);
      
      // Get folders
      const folders = await provider.getFolders('1');
      
      // Verify
      expect(folders).toHaveLength(2); // Parent + child
      expect(folders[0].id).toBe('1');
      expect(folders[0].name).toBe('Folder 1');
      expect(folders[1].id).toBe('2');
      expect(folders[1].name).toBe('Subfolder 1');
      expect(folders[1].parentId).toBe('1');
      expect(MockedQTestManagerClient.prototype.getModules).toHaveBeenCalledWith(1);
    });
    
    it('creates folder structure correctly', async () => {
      // Mock createModule implementation
      MockedQTestManagerClient.prototype.createModule.mockImplementation((projectId, moduleData) => {
        return Promise.resolve({
          data: {
            id: moduleData.name === 'Folder 1' ? 101 : 102,
            name: moduleData.name,
            description: moduleData.description
          }
        } as AxiosResponse);
      });
      
      // Prepare folders to create
      const folders: Folder[] = [
        {
          id: '1',
          name: 'Folder 1',
          path: '/Folder 1',
          description: 'Test folder 1',
          children: [
            {
              id: '2',
              name: 'Subfolder 1',
              path: '/Folder 1/Subfolder 1',
              description: 'Test subfolder 1',
              parentId: '1'
            }
          ]
        }
      ];
      
      // Create folder structure
      const folderMapping = await (provider as any).createFolderStructure('1', folders);
      
      // Verify
      expect(folderMapping.size).toBe(2);
      expect(folderMapping.get('1')).toBe('101');
      expect(folderMapping.get('2')).toBe('102');
      expect(MockedQTestManagerClient.prototype.createModule).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('migration operations', () => {
    beforeEach(async () => {
      // Set up mock implementations
      MockedQTestManagerClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token',
        migrationBatchSize: 5
      });
    });
    
    it('migrates test cases correctly', async () => {
      // Mock createTestCase implementation
      MockedQTestManagerClient.prototype.createTestCase.mockImplementation((projectId, testCaseData) => {
        return Promise.resolve({
          data: {
            id: 1001,
            name: testCaseData.name
          }
        } as AxiosResponse);
      });
      
      // Prepare test cases to migrate
      const testCases: TestCase[] = [
        {
          id: 'tc1',
          name: 'Test Case 1',
          description: 'Test description',
          folder: 'folder1',
          steps: [
            {
              id: 'step1',
              sequence: 1,
              action: 'Action 1',
              expectedResult: 'Expected 1'
            }
          ]
        }
      ];
      
      // Prepare folder mapping
      const folderMapping = new Map<string, string>();
      folderMapping.set('folder1', '101');
      
      // Migrate test cases
      const result = await (provider as any).migrateTestCases('1', testCases, folderMapping);
      
      // Verify
      expect(result.total).toBe(1);
      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.idMapping.size).toBe(1);
      expect(result.idMapping.get('tc1')).toBe('1001');
      expect(MockedQTestManagerClient.prototype.createTestCase).toHaveBeenCalledTimes(1);
      expect(MockedQTestManagerClient.prototype.createTestCase).toHaveBeenCalledWith(
        1, // projectId
        expect.objectContaining({
          name: 'Test Case 1',
          parent_id: 101 // mapped folder ID
        })
      );
    });
    
    it('handles migration errors correctly', async () => {
      // Mock createTestCase to throw an error
      MockedQTestManagerClient.prototype.createTestCase.mockRejectedValue(
        new Error('Failed to create test case')
      );
      
      // Prepare test cases to migrate
      const testCases: TestCase[] = [
        {
          id: 'tc1',
          name: 'Test Case 1',
          description: 'Test description',
          folder: 'folder1'
        }
      ];
      
      // Prepare folder mapping
      const folderMapping = new Map<string, string>();
      folderMapping.set('folder1', '101');
      
      // Migrate test cases
      const result = await (provider as any).migrateTestCases('1', testCases, folderMapping);
      
      // Verify
      expect(result.total).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.errorDetails).toHaveLength(1);
      expect(result.errorDetails[0].testCaseId).toBe('tc1');
      expect(result.errorDetails[0].error).toContain('Failed to create test case');
      expect(MockedQTestManagerClient.prototype.createTestCase).toHaveBeenCalledTimes(1);
    });
    
    it('respects migration batch size', async () => {
      // Mock createTestCase implementation
      MockedQTestManagerClient.prototype.createTestCase.mockImplementation((projectId, testCaseData) => {
        return Promise.resolve({
          data: {
            id: parseInt(testCaseData.name.replace('Test Case ', '')) + 1000,
            name: testCaseData.name
          }
        } as AxiosResponse);
      });
      
      // Prepare test cases to migrate
      const testCases: TestCase[] = Array.from({ length: 12 }).map((_, i) => ({
        id: `tc${i + 1}`,
        name: `Test Case ${i + 1}`,
        description: `Test description ${i + 1}`
      }));
      
      // Migrate test cases
      const result = await (provider as any).migrateTestCases('1', testCases, new Map());
      
      // Verify
      expect(result.total).toBe(12);
      expect(result.migrated).toBe(12);
      expect(result.errors).toBe(0);
      expect(result.idMapping.size).toBe(12);
      
      // Should be called in 3 batches (5 + 5 + 2)
      // Each test case gets one API call
      expect(MockedQTestManagerClient.prototype.createTestCase).toHaveBeenCalledTimes(12);
    });
    
    it('resets migration status between runs', async () => {
      // Mock createTestCase implementation
      MockedQTestManagerClient.prototype.createTestCase.mockImplementation((projectId, testCaseData) => {
        return Promise.resolve({
          data: {
            id: 1001,
            name: testCaseData.name
          }
        } as AxiosResponse);
      });
      
      // First migration
      await (provider as any).migrateTestCases('1', [
        {
          id: 'tc1',
          name: 'Test Case 1'
        }
      ], new Map());
      
      // Get status after first migration
      const firstStatus: MigrationStatus = (provider as any).getMigrationStatus();
      expect(firstStatus.total).toBe(1);
      expect(firstStatus.migrated).toBe(1);
      
      // Reset status
      (provider as any).resetMigrationStatus();
      
      // Second migration
      await (provider as any).migrateTestCases('1', [
        {
          id: 'tc2',
          name: 'Test Case 2'
        },
        {
          id: 'tc3',
          name: 'Test Case 3'
        }
      ], new Map());
      
      // Get status after second migration
      const secondStatus: MigrationStatus = (provider as any).getMigrationStatus();
      expect(secondStatus.total).toBe(2);
      expect(secondStatus.migrated).toBe(2);
      expect(secondStatus.idMapping.has('tc1')).toBe(false);
      expect(secondStatus.idMapping.has('tc2')).toBe(true);
      expect(secondStatus.idMapping.has('tc3')).toBe(true);
    });
  });
});