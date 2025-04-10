/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosResponse } from 'axios';
import { QTestParametersProvider } from '../../../packages/providers/qtest/parameters-provider';
import { QTestParametersClient, Parameter, ParameterType, ParameterStatus, Dataset, ParameterValue, DatasetRow } from '../../../packages/providers/qtest/api-client/parameters-client';
import { TestCase } from '../../../packages/common/src/models/entities';
import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock QTestParametersClient
jest.mock('../../../packages/providers/qtest/api-client/parameters-client');
const MockedQTestParametersClient = QTestParametersClient as jest.MockedClass<typeof QTestParametersClient>;

describe('QTestParametersProvider', () => {
  let provider: QTestParametersProvider;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create provider
    provider = new QTestParametersProvider();
  });
  
  describe('initialization', () => {
    it('initializes correctly with valid config', async () => {
      // Set up mock implementation for QTestParametersClient
      MockedQTestParametersClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
      
      // Verify
      expect(MockedQTestParametersClient).toHaveBeenCalled();
    });
    
    it('throws error with invalid config', async () => {
      // Invalid config (missing baseUrl)
      await expect(provider.initialize({} as any)).rejects.toThrow();
    });
  });
  
  describe('test connection', () => {
    it('returns successful connection status', async () => {
      // Set up mock implementation
      MockedQTestParametersClient.prototype.testConnection.mockResolvedValue(true);
      MockedQTestParametersClient.prototype.getRateLimiterMetrics.mockReturnValue({
        requestsPerMinute: 600,
        currentRequestCount: 10
      });
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
      
      // Test connection
      const result = await provider.testConnection();
      
      // Verify
      expect(result.connected).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details.metrics).toBeDefined();
      expect(MockedQTestParametersClient.prototype.testConnection).toHaveBeenCalled();
    });
    
    it('returns failed connection status on error', async () => {
      // Set up mock implementation
      MockedQTestParametersClient.prototype.testConnection.mockRejectedValue(new Error('Connection failed'));
      
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
      expect(result.error).toContain('Connection failed');
      expect(MockedQTestParametersClient.prototype.testConnection).toHaveBeenCalled();
    });
  });
  
  describe('parameter operations', () => {
    beforeEach(async () => {
      // Set up mock implementations
      MockedQTestParametersClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('gets parameters correctly', async () => {
      // Create mock response
      const mockParameters: Parameter[] = [
        {
          id: 1,
          name: 'Browser',
          description: 'Browser type',
          type: ParameterType.STRING,
          status: ParameterStatus.ACTIVE,
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Operating System',
          description: 'OS type',
          type: ParameterType.STRING,
          status: ParameterStatus.ACTIVE,
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString()
        }
      ];
      
      // Mock queryParameters response
      MockedQTestParametersClient.prototype.queryParameters.mockResolvedValue({
        data: {
          content: mockParameters,
          totalElements: 2,
          number: 0,
          size: 10
        }
      } as AxiosResponse);
      
      // Get parameters
      const result = await provider.getParameters('1', {
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      });
      
      // Verify
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(MockedQTestParametersClient.prototype.queryParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 0, // Provider converts to 0-based for qTest API
          size: 10,
          filter: expect.objectContaining({
            projectId: 1,
            status: ParameterStatus.ACTIVE,
            name: { $contains: 'Browser' }
          })
        })
      );
    });
    
    it('gets parameter by ID correctly', async () => {
      // Create mock response
      const mockParameter: Parameter = {
        id: 1,
        name: 'Browser',
        description: 'Browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE,
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString()
      };
      
      // Mock getParameter response
      MockedQTestParametersClient.prototype.getParameter.mockResolvedValue({
        data: mockParameter
      } as AxiosResponse);
      
      // Get parameter
      const result = await provider.getParameter('1', '1');
      
      // Verify
      expect(result.id).toBe(1);
      expect(result.name).toBe('Browser');
      expect(MockedQTestParametersClient.prototype.getParameter).toHaveBeenCalledWith(1);
    });
    
    it('creates parameter correctly', async () => {
      // Create mock request
      const mockParameter: Parameter = {
        name: 'Browser',
        description: 'Browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      };
      
      // Mock createParameter response
      MockedQTestParametersClient.prototype.createParameter.mockResolvedValue({
        data: { 
          ...mockParameter,
          id: 1 
        }
      } as AxiosResponse);
      
      // Create parameter
      const result = await provider.createParameter('1', mockParameter);
      
      // Verify
      expect(result).toBe('1');
      expect(MockedQTestParametersClient.prototype.createParameter).toHaveBeenCalledWith(
        1,
        mockParameter
      );
    });
    
    it('updates parameter correctly', async () => {
      // Create mock request
      const mockParameter: Parameter = {
        id: 1,
        name: 'Updated Browser',
        description: 'Updated browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      };
      
      // Mock updateParameter response
      MockedQTestParametersClient.prototype.updateParameter.mockResolvedValue({
        data: mockParameter
      } as AxiosResponse);
      
      // Update parameter
      await provider.updateParameter('1', '1', mockParameter);
      
      // Verify
      expect(MockedQTestParametersClient.prototype.updateParameter).toHaveBeenCalledWith(
        1,
        mockParameter
      );
    });
    
    it('deletes parameter correctly', async () => {
      // Mock deleteParameter response
      MockedQTestParametersClient.prototype.deleteParameter.mockResolvedValue({
        data: { success: true }
      } as AxiosResponse);
      
      // Delete parameter
      await provider.deleteParameter('1', '1');
      
      // Verify
      expect(MockedQTestParametersClient.prototype.deleteParameter).toHaveBeenCalledWith(1);
    });

    it('throws error when getParameter fails', async () => {
      // Mock error response
      const mockError = new Error('API Error');
      MockedQTestParametersClient.prototype.getParameter.mockRejectedValue(mockError);
      
      // Attempt to get parameter and expect error
      await expect(provider.getParameter('1', '1')).rejects.toThrow(ExternalServiceError);
    });

    it('gets parameter values correctly', async () => {
      // Create mock values
      const mockValues: ParameterValue[] = [
        { id: 1, value: 'Chrome', type: ParameterType.STRING },
        { id: 2, value: 'Firefox', type: ParameterType.STRING }
      ];
      
      // Mock response
      MockedQTestParametersClient.prototype.queryParameterValues.mockResolvedValue({
        data: {
          content: mockValues,
          totalElements: 2,
          number: 0,
          size: 10
        }
      } as AxiosResponse);
      
      // Get parameter values
      const result = await provider.getParameterValues('1', '1', { page: 1, pageSize: 10 });
      
      // Verify
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(MockedQTestParametersClient.prototype.queryParameterValues).toHaveBeenCalledWith(
        1,
        { page: 0, size: 10 } // Page converted to 0-based
      );
    });

    it('adds parameter value correctly', async () => {
      // Create mock value
      const mockValue: ParameterValue = {
        value: 'Chrome',
        type: ParameterType.STRING
      };
      
      // Mock response
      MockedQTestParametersClient.prototype.createParameterValue.mockResolvedValue({
        data: { ...mockValue, id: 5 }
      } as AxiosResponse);
      
      // Add parameter value
      const result = await provider.addParameterValue('1', '1', mockValue);
      
      // Verify
      expect(result).toBe('5');
      expect(MockedQTestParametersClient.prototype.createParameterValue).toHaveBeenCalledWith(
        1, mockValue
      );
    });
  });
  
  describe('dataset operations', () => {
    beforeEach(async () => {
      // Set up mock implementations
      MockedQTestParametersClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('gets datasets correctly', async () => {
      // Create mock response
      const mockDatasets: Dataset[] = [
        {
          id: 1,
          name: 'Browser Dataset',
          description: 'Browser combinations',
          status: ParameterStatus.ACTIVE,
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString(),
          parameters: [1, 2]
        },
        {
          id: 2,
          name: 'Login Dataset',
          description: 'Login test data',
          status: ParameterStatus.ACTIVE,
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString(),
          parameters: [3, 4]
        }
      ];
      
      // Mock queryDatasets response
      MockedQTestParametersClient.prototype.queryDatasets.mockResolvedValue({
        data: {
          content: mockDatasets,
          totalElements: 2,
          number: 0,
          size: 10
        }
      } as AxiosResponse);
      
      // Get datasets
      const result = await provider.getDatasets('1', {
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      });
      
      // Verify
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(MockedQTestParametersClient.prototype.queryDatasets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 0, // Provider converts to 0-based for qTest API
          size: 10,
          filter: expect.objectContaining({
            projectId: 1,
            status: ParameterStatus.ACTIVE,
            name: { $contains: 'Browser' }
          })
        })
      );
    });
    
    it('gets dataset by ID correctly', async () => {
      // Create mock response
      const mockDataset: Dataset = {
        id: 1,
        name: 'Browser Dataset',
        description: 'Browser combinations',
        status: ParameterStatus.ACTIVE,
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString(),
        parameters: [1, 2]
      };
      
      // Mock getDataset response
      MockedQTestParametersClient.prototype.getDataset.mockResolvedValue({
        data: mockDataset
      } as AxiosResponse);
      
      // Get dataset
      const result = await provider.getDataset('1', '1');
      
      // Verify
      expect(result.id).toBe(1);
      expect(result.name).toBe('Browser Dataset');
      expect(MockedQTestParametersClient.prototype.getDataset).toHaveBeenCalledWith(1);
    });
    
    it('creates dataset correctly', async () => {
      // Create mock request
      const mockDataset: Dataset = {
        name: 'Browser Dataset',
        description: 'Browser combinations',
        status: ParameterStatus.ACTIVE,
        parameters: [1, 2]
      };
      
      // Mock createDataset response
      MockedQTestParametersClient.prototype.createDataset.mockResolvedValue({
        data: { 
          ...mockDataset,
          id: 1 
        }
      } as AxiosResponse);
      
      // Create dataset
      const result = await provider.createDataset('1', mockDataset);
      
      // Verify
      expect(result).toBe('1');
      expect(MockedQTestParametersClient.prototype.createDataset).toHaveBeenCalledWith(
        1,
        mockDataset
      );
    });

    it('updates dataset correctly', async () => {
      // Create mock request
      const mockDataset: Dataset = {
        id: 1,
        name: 'Updated Dataset',
        description: 'Updated description',
        status: ParameterStatus.ACTIVE
      };
      
      // Mock updateDataset response
      MockedQTestParametersClient.prototype.updateDataset.mockResolvedValue({
        data: mockDataset
      } as AxiosResponse);
      
      // Update dataset
      await provider.updateDataset('1', '1', mockDataset);
      
      // Verify
      expect(MockedQTestParametersClient.prototype.updateDataset).toHaveBeenCalledWith(
        1,
        mockDataset
      );
    });

    it('gets dataset rows correctly', async () => {
      // Create mock rows
      const mockRows: DatasetRow[] = [
        { id: 1, row: { browser: 'Chrome', os: 'Windows' }},
        { id: 2, row: { browser: 'Firefox', os: 'MacOS' }}
      ];
      
      // Mock response
      MockedQTestParametersClient.prototype.getDatasetRows.mockResolvedValue({
        data: {
          content: mockRows,
          totalElements: 2,
          number: 0,
          size: 10
        }
      } as AxiosResponse);
      
      // Get dataset rows
      const result = await provider.getDatasetRows('1', '1', { page: 1, pageSize: 10 });
      
      // Verify
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(MockedQTestParametersClient.prototype.getDatasetRows).toHaveBeenCalledWith(
        1,
        { page: 0, size: 10 } // Page converted to 0-based
      );
    });

    it('adds dataset rows correctly', async () => {
      // Create mock rows
      const mockRows: DatasetRow[] = [
        { row: { browser: 'Chrome', os: 'Windows' }},
        { row: { browser: 'Firefox', os: 'MacOS' }}
      ];
      
      // Mock response
      MockedQTestParametersClient.prototype.addDatasetRows.mockResolvedValue({
        data: { success: true }
      } as AxiosResponse);
      
      // Add dataset rows
      await provider.addDatasetRows('1', '1', mockRows);
      
      // Verify
      expect(MockedQTestParametersClient.prototype.addDatasetRows).toHaveBeenCalledWith(
        1, mockRows
      );
    });
  });
  
  describe('parameterized test case operations', () => {
    beforeEach(async () => {
      // Set up mock implementations
      MockedQTestParametersClient.prototype.testConnection.mockResolvedValue(true);
      
      // Initialize provider with super class mockup
      provider = new QTestParametersProvider();
      
      // Mock the super.getTestCases method
      const mockGetTestCases = jest.fn().mockResolvedValue({
        items: [
          {
            id: 'tc1',
            name: 'Login Test',
            description: 'Test login functionality'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10
      });
      
      const mockGetTestCase = jest.fn().mockResolvedValue({
        id: 'tc1',
        name: 'Login Test',
        description: 'Test login functionality'
      });
      
      // Mock super class methods
      Object.setPrototypeOf(provider, {
        ...Object.getPrototypeOf(provider),
        getTestCases: mockGetTestCases,
        getTestCase: mockGetTestCase,
        createTestCase: jest.fn().mockResolvedValue('tc1')
      });
      
      await provider.initialize({
        baseUrl: 'https://test.qtestnet.com/api/v3',
        apiToken: 'test-token'
      });
    });
    
    it('gets parameterized test cases correctly', async () => {
      // Get parameterized test cases
      const result = await provider.getParameterizedTestCases('1');
      
      // Verify
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('tc1');
      expect(result.items[0].parameters).toEqual([]);
      expect(result.items[0].datasets).toEqual([]);
    });
    
    it('gets parameterized test case by ID correctly', async () => {
      // Get parameterized test case
      const result = await provider.getParameterizedTestCase('1', 'tc1');
      
      // Verify
      expect(result.id).toBe('tc1');
      expect(result.parameters).toEqual([]);
      expect(result.datasets).toEqual([]);
    });
    
    it('creates parameterized test case correctly', async () => {
      // Create mock parameterized test case
      const mockTestCase = {
        id: 'tc1',
        name: 'Login Test',
        description: 'Test login functionality',
        parameters: [
          {
            id: 'param1',
            name: 'Username',
            description: 'Username for login',
            parameters: [
              {
                id: 'p1',
                name: 'Username',
                type: 'string',
                values: [
                  { id: 'v1', value: 'user1' },
                  { id: 'v2', value: 'user2' }
                ]
              }
            ]
          }
        ],
        datasets: [
          {
            id: 'ds1',
            name: 'Login Credentials',
            parameters: ['p1'],
            rows: [
              { username: 'user1' },
              { username: 'user2' }
            ]
          }
        ]
      };
      
      // Create parameterized test case
      const result = await provider.createParameterizedTestCase('1', mockTestCase);
      
      // Verify
      expect(result).toBe('tc1');
    });
  });
});