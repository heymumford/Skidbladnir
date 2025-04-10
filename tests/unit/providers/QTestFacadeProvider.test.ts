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
import { QTestParametersProvider } from '../../../packages/providers/qtest/parameters-provider';
import { Parameter, ParameterStatus } from '../../../packages/providers/qtest/api-client/parameters-client';
import { TestCase, Folder } from '../../../packages/common/src/models/entities';

// Mock QTestManagerProvider
jest.mock('../../../packages/providers/qtest/manager-provider');
const MockedManagerProvider = QTestManagerProvider as jest.MockedClass<typeof QTestManagerProvider>;

// Mock QTestParametersProvider
jest.mock('../../../packages/providers/qtest/parameters-provider');
const MockedParametersProvider = QTestParametersProvider as jest.MockedClass<typeof QTestParametersProvider>;

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
    
    // Set up mock implementations for QTestParametersProvider
    MockedParametersProvider.prototype.initialize.mockResolvedValue(undefined);
    MockedParametersProvider.prototype.testConnection.mockResolvedValue({
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
          },
          parameters: {
            defaultParameterSetId: 123
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
      
      // Verify Parameters provider was initialized
      expect(MockedParametersProvider.prototype.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://test.qtestnet.com/api/v3',
          apiToken: 'test-token',
          defaultParameterSetId: 123
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
        apiToken: 'test-token',
        products: {
          parameters: {}
        }
      });
    });
    
    it('returns successful connection if any product is connected', async () => {
      // Set up mocks for successful connection
      MockedManagerProvider.prototype.testConnection.mockResolvedValue({
        connected: true,
        details: { metrics: {} }
      });
      
      MockedParametersProvider.prototype.testConnection.mockResolvedValue({
        connected: true,
        details: { metrics: {} }
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details.manager).toBeDefined();
      expect(result.details.parameters).toBeDefined();
      expect(MockedManagerProvider.prototype.testConnection).toHaveBeenCalled();
      expect(MockedParametersProvider.prototype.testConnection).toHaveBeenCalled();
    });
    
    it('returns failed connection if all products fail', async () => {
      // Set up mocks for failed connection
      MockedManagerProvider.prototype.testConnection.mockResolvedValue({
        connected: false,
        error: 'Connection failed'
      });
      
      // Override parameter provider mock (if it exists) to return false too
      if (provider["parametersProvider"]) {
        MockedParametersProvider.prototype.testConnection.mockResolvedValue({
          connected: false,
          error: 'Connection failed'
        });
      }
      
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
  
  describe('parameters operations', () => {
    beforeEach(async () => {
      // Initialize provider with parameters product
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token',
        products: {
          parameters: {}
        }
      });
    });
    
    it('delegates getParameters to Parameters provider', async () => {
      // Set up mock
      const mockParameters = {
        items: [
          { id: 1, name: 'Browser', type: 'STRING', status: ParameterStatus.ACTIVE },
          { id: 2, name: 'Operating System', type: 'STRING', status: ParameterStatus.ACTIVE }
        ],
        total: 2,
        page: 1,
        pageSize: 10
      };
      MockedParametersProvider.prototype.getParameters.mockResolvedValue(mockParameters);
      
      // Call method
      const result = await provider.getParameters('1', { page: 1, pageSize: 10 });
      
      // Verify
      expect(result).toEqual(mockParameters);
      expect(MockedParametersProvider.prototype.getParameters).toHaveBeenCalledWith(
        '1',
        { page: 1, pageSize: 10 }
      );
    });
    
    it('delegates getParameter to Parameters provider', async () => {
      // Set up mock
      const mockParameter: Parameter = {
        id: 1,
        name: 'Browser',
        type: 'STRING',
        status: ParameterStatus.ACTIVE
      };
      MockedParametersProvider.prototype.getParameter.mockResolvedValue(mockParameter);
      
      // Call method
      const result = await provider.getParameter('1', '1');
      
      // Verify
      expect(result).toEqual(mockParameter);
      expect(MockedParametersProvider.prototype.getParameter).toHaveBeenCalledWith('1', '1');
    });
    
    it('delegates createParameter to Parameters provider', async () => {
      // Set up mock
      MockedParametersProvider.prototype.createParameter.mockResolvedValue('1');
      
      // Mock parameter
      const parameter: Parameter = {
        name: 'Browser',
        type: 'STRING',
        status: ParameterStatus.ACTIVE
      };
      
      // Call method
      const result = await provider.createParameter('1', parameter);
      
      // Verify
      expect(result).toBe('1');
      expect(MockedParametersProvider.prototype.createParameter).toHaveBeenCalledWith('1', parameter);
    });
    
    it('delegates getParameterizedTestCase to Parameters provider', async () => {
      // Set up mock
      const mockTestCase = {
        id: 'tc1',
        name: 'Login Test',
        parameters: [],
        datasets: []
      };
      MockedParametersProvider.prototype.getParameterizedTestCase.mockResolvedValue(mockTestCase);
      
      // Call method
      const result = await provider.getParameterizedTestCase('1', 'tc1');
      
      // Verify
      expect(result).toEqual(mockTestCase);
      expect(MockedParametersProvider.prototype.getParameterizedTestCase).toHaveBeenCalledWith('1', 'tc1');
    });
    
    it('delegates createParameterizedTestCase to Parameters provider', async () => {
      // Set up mock
      MockedParametersProvider.prototype.createParameterizedTestCase.mockResolvedValue('tc1');
      
      // Mock test case
      const testCase = {
        name: 'Login Test',
        parameters: [],
        datasets: []
      };
      
      // Call method
      const result = await provider.createParameterizedTestCase('1', testCase);
      
      // Verify
      expect(result).toBe('tc1');
      expect(MockedParametersProvider.prototype.createParameterizedTestCase).toHaveBeenCalledWith('1', testCase);
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
    
    it('connects to migration functionality', async () => {
      // Set up minimal mocks
      MockedManagerProvider.prototype.getFolders.mockResolvedValue([]);
      MockedManagerProvider.prototype.createFolderStructure = jest.fn().mockResolvedValue(new Map());
      MockedManagerProvider.prototype.migrateTestCases = jest.fn().mockResolvedValue({
        total: 0,
        migrated: 0,
        errors: 0,
        errorDetails: [],
        idMapping: new Map<string, string>()
      });
      
      // Prepare test cases
      const testCases: TestCase[] = [
        {
          id: 'tc1',
          name: 'Test Case 1'
        }
      ];
      
      // Call method
      await provider.migrateTestCases('1', testCases);
      
      // Only verify that the getFolders method was called
      expect(MockedManagerProvider.prototype.getFolders).toHaveBeenCalled();
    });
  });
});