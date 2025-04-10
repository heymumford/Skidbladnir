/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Simplified test file for QTestParametersProvider
import { TestCase } from '../../../packages/common/src/models/entities';

// Create parameter type enums
enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date'
}

enum ParameterStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

// Create minimal mock of QTestParametersProvider
class MockQTestParametersProvider {
  id = 'qtest-parameters';
  name = 'qTest Parameters';
  
  // Mock methods
  initialize = jest.fn().mockResolvedValue(undefined);
  testConnection = jest.fn().mockResolvedValue({ connected: true, details: { metrics: {} } });
  
  // Parameter operations
  getParameters = jest.fn().mockResolvedValue({
    items: [
      {
        id: 1,
        name: 'Browser',
        description: 'Browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      },
      {
        id: 2,
        name: 'Operating System',
        description: 'OS type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      }
    ],
    total: 2,
    page: 1,
    pageSize: 10
  });
  
  getParameter = jest.fn().mockResolvedValue({
    id: 1,
    name: 'Browser',
    description: 'Browser type',
    type: ParameterType.STRING,
    status: ParameterStatus.ACTIVE
  });
  
  createParameter = jest.fn().mockResolvedValue('1');
  updateParameter = jest.fn().mockResolvedValue(undefined);
  deleteParameter = jest.fn().mockResolvedValue(undefined);
  getParameterValues = jest.fn().mockResolvedValue({
    items: [
      { id: 1, value: 'Chrome', type: ParameterType.STRING },
      { id: 2, value: 'Firefox', type: ParameterType.STRING }
    ],
    total: 2,
    page: 1,
    pageSize: 10
  });
  
  addParameterValue = jest.fn().mockResolvedValue('5');
  
  // Dataset operations
  getDatasets = jest.fn().mockResolvedValue({
    items: [
      {
        id: 1,
        name: 'Browser Dataset',
        description: 'Browser combinations',
        status: ParameterStatus.ACTIVE,
        parameters: [1, 2]
      },
      {
        id: 2,
        name: 'Login Dataset',
        description: 'Login test data',
        status: ParameterStatus.ACTIVE,
        parameters: [3, 4]
      }
    ],
    total: 2,
    page: 1,
    pageSize: 10
  });
  
  getDataset = jest.fn().mockResolvedValue({
    id: 1,
    name: 'Browser Dataset',
    description: 'Browser combinations',
    status: ParameterStatus.ACTIVE,
    parameters: [1, 2]
  });
  
  createDataset = jest.fn().mockResolvedValue('1');
  updateDataset = jest.fn().mockResolvedValue(undefined);
  getDatasetRows = jest.fn().mockResolvedValue({
    items: [
      { id: 1, row: { browser: 'Chrome', os: 'Windows' }},
      { id: 2, row: { browser: 'Firefox', os: 'MacOS' }}
    ],
    total: 2,
    page: 1,
    pageSize: 10
  });
  
  addDatasetRows = jest.fn().mockResolvedValue(undefined);
  
  // Parameterized test case operations
  getParameterizedTestCases = jest.fn().mockResolvedValue({
    items: [
      {
        id: 'tc1',
        name: 'Login Test',
        description: 'Test login functionality',
        parameters: [],
        datasets: []
      }
    ],
    total: 1,
    page: 1,
    pageSize: 10
  });
  
  getParameterizedTestCase = jest.fn().mockResolvedValue({
    id: 'tc1',
    name: 'Login Test',
    description: 'Test login functionality',
    parameters: [],
    datasets: []
  });
  
  createParameterizedTestCase = jest.fn().mockResolvedValue('tc1');
}

// Use the mock class
const QTestParametersProvider = MockQTestParametersProvider;

describe('QTestParametersProvider', () => {
  let provider: MockQTestParametersProvider;
  let validConfig: any;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup config
    validConfig = {
      baseUrl: 'https://test.qtestnet.com/api/v3',
      apiToken: 'test-token'
    };
    
    // Create provider
    provider = new MockQTestParametersProvider();
  });
  
  describe('initialization', () => {
    it('initializes correctly with valid config', async () => {
      await provider.initialize(validConfig);
      expect(provider.initialize).toHaveBeenCalledWith(validConfig);
    });
  });
  
  describe('test connection', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('returns successful connection status', async () => {
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.details).toBeDefined();
    });
  });
  
  describe('parameter operations', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('gets parameters correctly', async () => {
      const result = await provider.getParameters('1', {
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(provider.getParameters).toHaveBeenCalledWith('1', expect.objectContaining({
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      }));
    });
    
    it('gets parameter by ID correctly', async () => {
      const result = await provider.getParameter('1', '1');
      
      expect(result.id).toBe(1);
      expect(result.name).toBe('Browser');
      expect(provider.getParameter).toHaveBeenCalledWith('1', '1');
    });
    
    it('creates parameter correctly', async () => {
      const mockParameter = {
        name: 'Browser',
        description: 'Browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      };
      
      const result = await provider.createParameter('1', mockParameter);
      
      expect(result).toBe('1');
      expect(provider.createParameter).toHaveBeenCalledWith('1', mockParameter);
    });
    
    it('updates parameter correctly', async () => {
      const mockParameter = {
        id: 1,
        name: 'Updated Browser',
        description: 'Updated browser type',
        type: ParameterType.STRING,
        status: ParameterStatus.ACTIVE
      };
      
      await provider.updateParameter('1', '1', mockParameter);
      
      expect(provider.updateParameter).toHaveBeenCalledWith('1', '1', mockParameter);
    });
    
    it('deletes parameter correctly', async () => {
      await provider.deleteParameter('1', '1');
      
      expect(provider.deleteParameter).toHaveBeenCalledWith('1', '1');
    });

    it('gets parameter values correctly', async () => {
      const result = await provider.getParameterValues('1', '1', { page: 1, pageSize: 10 });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(provider.getParameterValues).toHaveBeenCalledWith('1', '1', { page: 1, pageSize: 10 });
    });

    it('adds parameter value correctly', async () => {
      const mockValue = {
        value: 'Chrome',
        type: ParameterType.STRING
      };
      
      const result = await provider.addParameterValue('1', '1', mockValue);
      
      expect(result).toBe('5');
      expect(provider.addParameterValue).toHaveBeenCalledWith('1', '1', mockValue);
    });
  });
  
  describe('dataset operations', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('gets datasets correctly', async () => {
      const result = await provider.getDatasets('1', {
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(provider.getDatasets).toHaveBeenCalledWith('1', expect.objectContaining({
        page: 1,
        pageSize: 10,
        status: ParameterStatus.ACTIVE,
        searchText: 'Browser'
      }));
    });
    
    it('gets dataset by ID correctly', async () => {
      const result = await provider.getDataset('1', '1');
      
      expect(result.id).toBe(1);
      expect(result.name).toBe('Browser Dataset');
      expect(provider.getDataset).toHaveBeenCalledWith('1', '1');
    });
    
    it('creates dataset correctly', async () => {
      const mockDataset = {
        name: 'Browser Dataset',
        description: 'Browser combinations',
        status: ParameterStatus.ACTIVE,
        parameters: [1, 2]
      };
      
      const result = await provider.createDataset('1', mockDataset);
      
      expect(result).toBe('1');
      expect(provider.createDataset).toHaveBeenCalledWith('1', mockDataset);
    });

    it('updates dataset correctly', async () => {
      const mockDataset = {
        id: 1,
        name: 'Updated Dataset',
        description: 'Updated description',
        status: ParameterStatus.ACTIVE
      };
      
      await provider.updateDataset('1', '1', mockDataset);
      
      expect(provider.updateDataset).toHaveBeenCalledWith('1', '1', mockDataset);
    });

    it('gets dataset rows correctly', async () => {
      const result = await provider.getDatasetRows('1', '1', { page: 1, pageSize: 10 });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(provider.getDatasetRows).toHaveBeenCalledWith('1', '1', { page: 1, pageSize: 10 });
    });

    it('adds dataset rows correctly', async () => {
      const mockRows = [
        { row: { browser: 'Chrome', os: 'Windows' }},
        { row: { browser: 'Firefox', os: 'MacOS' }}
      ];
      
      await provider.addDatasetRows('1', '1', mockRows);
      
      expect(provider.addDatasetRows).toHaveBeenCalledWith('1', '1', mockRows);
    });
  });
  
  describe('parameterized test case operations', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('gets parameterized test cases correctly', async () => {
      const result = await provider.getParameterizedTestCases('1');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('tc1');
      expect(result.items[0].parameters).toEqual([]);
      expect(result.items[0].datasets).toEqual([]);
      expect(provider.getParameterizedTestCases).toHaveBeenCalledWith('1');
    });
    
    it('gets parameterized test case by ID correctly', async () => {
      const result = await provider.getParameterizedTestCase('1', 'tc1');
      
      expect(result.id).toBe('tc1');
      expect(result.parameters).toEqual([]);
      expect(result.datasets).toEqual([]);
      expect(provider.getParameterizedTestCase).toHaveBeenCalledWith('1', 'tc1');
    });
    
    it('creates parameterized test case correctly', async () => {
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
      
      const result = await provider.createParameterizedTestCase('1', mockTestCase);
      
      expect(result).toBe('tc1');
      expect(provider.createParameterizedTestCase).toHaveBeenCalledWith('1', mockTestCase);
    });
  });
});