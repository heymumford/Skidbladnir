/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Visure Solutions Provider Unit Tests
 * 
 * Tests for the Visure Solutions provider implementation
 */

import axios from 'axios';
import { VisureProvider, VisureClient, createVisureProvider, VisureError, VisureErrorCategory, TraceabilityLinkType } from './index';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../../internal/typescript/common/logger/LoggerAdapter', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock ResilientApiClient
jest.mock('../../../internal/typescript/api-bridge/clients/resilient-api-client', () => {
  return {
    ResilientApiClient: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
      };
    })
  };
});

describe('Visure Solutions Provider', () => {
  let provider: VisureProvider;
  const mockConfig = {
    baseUrl: 'https://visure-test.example.com',
    username: 'testuser',
    password: 'testpassword',
    projectId: 'project123'
  };
  
  // Mock for axios.create
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Create provider with mock config
    provider = createVisureProvider(mockConfig);
  });
  
  describe('Provider initialization', () => {
    it('should create a provider instance', () => {
      expect(provider).toBeInstanceOf(VisureProvider);
    });
    
    it('should initialize with config values', async () => {
      await provider.initialize({ baseUrl: 'https://new-url.example.com' });
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Connection testing', () => {
    it('should return connected status when connection succeeds', async () => {
      // Mock successful connection
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: { id: 'user1', name: 'Test User' } }
      });
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.details).toHaveProperty('baseUrl', mockConfig.baseUrl);
    });
    
    it('should return error status when connection fails', async () => {
      // Mock failed connection
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection failed'));
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });
  
  describe('Metadata and capabilities', () => {
    it('should return provider metadata', () => {
      const metadata = provider.getMetadata();
      
      expect(metadata.systemName).toBe('Visure Solutions');
      expect(metadata.capabilities.canBeSource).toBe(true);
      expect(metadata.capabilities.canBeTarget).toBe(true);
      expect(metadata.capabilities.supportsAttachments).toBe(true);
    });
    
    it('should return API contract with operations', async () => {
      const contract = await provider.getApiContract();
      
      expect(contract.providerId).toBe('visure');
      expect(contract.operations).toHaveProperty('getProjects');
      expect(contract.operations).toHaveProperty('getRequirements');
      expect(contract.operations).toHaveProperty('createTraceabilityLink');
    });
  });
  
  describe('Project operations', () => {
    it('should retrieve projects', async () => {
      // Mock API response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'proj1', name: 'Project 1', description: 'Test Project 1' },
            { id: 'proj2', name: 'Project 2', description: 'Test Project 2' }
          ]
        }
      });
      
      const projects = await provider.getProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe('proj1');
      expect(projects[0].name).toBe('Project 1');
    });
  });
  
  describe('Folder operations', () => {
    it('should retrieve folders', async () => {
      // Mock API response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'folder1', name: 'Folder 1', path: '/folder1' },
            { id: 'folder2', name: 'Folder 2', path: '/folder2', parentId: 'folder1' }
          ]
        }
      });
      
      const folders = await provider.getFolders('project123');
      
      expect(folders).toHaveLength(2);
      expect(folders[0].id).toBe('folder1');
      expect(folders[1].parentId).toBe('folder1');
    });
  });
  
  describe('Test case operations', () => {
    it('should retrieve test cases', async () => {
      // Mock API response for test cases
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { 
              id: 'tc1', 
              title: 'Test Case 1',
              description: 'Description for TC1',
              status: 'Draft',
              priority: 'Medium',
              steps: [
                { order: 1, action: 'Step 1', expected: 'Result 1' }
              ],
              tags: ['automated'],
              createdDate: '2024-01-01T00:00:00Z',
              modifiedDate: '2024-01-02T00:00:00Z'
            }
          ]
        }
      });
      
      const result = await provider.getTestCases('project123');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Case 1');
      expect(result.items[0].steps).toHaveLength(1);
    });
    
    it('should retrieve a single test case', async () => {
      // Mock API response for a single test case
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: { 
            id: 'tc1', 
            title: 'Test Case 1',
            description: 'Description for TC1',
            status: 'Draft',
            priority: 'Medium',
            steps: [
              { order: 1, action: 'Step 1', expected: 'Result 1' }
            ],
            tags: ['automated'],
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-02T00:00:00Z',
            traceLinks: [
              { sourceId: 'req1', targetId: 'tc1', linkType: 'VERIFIES' }
            ]
          }
        }
      });
      
      const testCase = await provider.getTestCase('project123', 'tc1');
      
      expect(testCase.id).toBe('tc1');
      expect(testCase.title).toBe('Test Case 1');
      expect(testCase.attributes.requirementIds).toContain('req1');
    });
    
    it('should create a test case', async () => {
      // Mock API response for creating a test case
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: { 
            id: 'tc-new', 
            title: 'New Test Case',
            description: 'Description for new TC'
          }
        }
      });
      
      const testCase = {
        id: '',
        title: 'New Test Case',
        description: 'Description for new TC',
        status: 'DRAFT',
        priority: 'HIGH',
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ],
        tags: ['automated'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const id = await provider.createTestCase('project123', testCase);
      
      expect(id).toBe('tc-new');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/projects/project123/testcases',
        expect.objectContaining({
          title: 'New Test Case',
          priority: 'High'
        })
      );
    });
  });
  
  describe('Requirement operations', () => {
    it('should retrieve requirements', async () => {
      // Mock API response for requirements
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { 
              id: 'req1', 
              title: 'Requirement 1',
              description: 'Description for Req1',
              type: 'Functional',
              status: 'Approved',
              priority: 'High'
            }
          ]
        }
      });
      
      const requirements = await provider.getRequirements('project123');
      
      expect(requirements).toHaveLength(1);
      expect(requirements[0].id).toBe('req1');
      expect(requirements[0].title).toBe('Requirement 1');
    });
  });
  
  describe('Traceability operations', () => {
    it('should create a traceability link', async () => {
      // Mock API response for creating a link
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: { 
            sourceId: 'req1',
            targetId: 'tc1',
            linkType: 'VERIFIES',
            direction: 'FORWARD'
          }
        }
      });
      
      const link = await provider.createTraceabilityLink(
        'project123',
        'req1',
        'tc1',
        TraceabilityLinkType.VERIFIES
      );
      
      expect(link.sourceId).toBe('req1');
      expect(link.targetId).toBe('tc1');
    });
    
    it('should generate a traceability matrix', async () => {
      // Mock API response for matrix
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: { 
            rows: [{ id: 'req1', name: 'Requirement 1' }],
            columns: [{ id: 'tc1', name: 'Test Case 1' }],
            cells: [{ row: 'req1', column: 'tc1', value: 'VERIFIES' }]
          }
        }
      });
      
      const matrix = await provider.generateTraceabilityMatrix('project123');
      
      expect(matrix.rows).toHaveLength(1);
      expect(matrix.columns).toHaveLength(1);
    });
  });
  
  describe('Error handling', () => {
    it('should handle network errors', async () => {
      // Mock a network error
      const error = new Error('Network error');
      (error as any).code = 'ECONNREFUSED';
      (error as any).request = {};
      mockAxiosInstance.get.mockRejectedValueOnce(error);
      
      await expect(provider.getProjects()).rejects.toThrow();
    });
    
    it('should handle authentication errors', async () => {
      // Mock an authentication error
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
          headers: {}
        },
        config: { url: '/auth/login' }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);
      
      await expect(provider.getProjects()).rejects.toThrow();
    });
  });
});

describe('VisureError class', () => {
  it('should create authentication errors', () => {
    const error = VisureError.authentication('Invalid credentials');
    expect(error.category).toBe(VisureErrorCategory.AUTHENTICATION);
    expect(error.message).toBe('Invalid credentials');
  });
  
  it('should create resource not found errors', () => {
    const error = VisureError.resourceNotFound('Requirement not found');
    expect(error.category).toBe(VisureErrorCategory.RESOURCE_NOT_FOUND);
    expect(error.message).toBe('Requirement not found');
  });
});

describe('VisureClient', () => {
  let client: VisureClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Set up request and response interceptors
    mockAxiosInstance.interceptors.request.use.mockImplementation((callback) => {
      // Store the callback
      (mockAxiosInstance as any).requestInterceptor = callback;
    });
    
    mockAxiosInstance.interceptors.response.use.mockImplementation((successCb, errorCb) => {
      // Store the callbacks
      (mockAxiosInstance as any).responseInterceptor = { successCb, errorCb };
    });
    
    // Create client with mock config
    client = new VisureClient(mockConfig);
  });
  
  describe('Authentication', () => {
    it('should authenticate with username and password', async () => {
      // Mock successful login
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          token: 'mock-token',
          expiresIn: 86400
        }
      });
      
      // Call a method that triggers authentication
      await client.testConnection();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/auth/login',
        {
          username: 'testuser',
          password: 'testpassword'
        },
        expect.any(Object)
      );
    });
  });
  
  describe('API operations', () => {
    beforeEach(() => {
      // Simulate authenticated state
      (client as any).accessToken = 'mock-token';
      (client as any).accessTokenExpiry = Date.now() + 3600000;
    });
    
    it('should make API requests with authentication header', async () => {
      // Set up config to pass through the request interceptor
      const config = { headers: {} };
      
      // Apply request interceptor
      const interceptedConfig = await (mockAxiosInstance as any).requestInterceptor(config);
      
      expect(interceptedConfig.headers.Authorization).toBe('Bearer mock-token');
    });
    
    it('should retrieve test cases', async () => {
      // Mock API response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: [{ id: 'tc1', title: 'Test Case 1' }] }
      });
      
      const testCases = await client.getTestCases('project123');
      
      expect(testCases).toHaveLength(1);
      expect(testCases[0].id).toBe('tc1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/projects/project123/testcases',
        expect.any(Object)
      );
    });
    
    it('should retrieve requirements', async () => {
      // Mock API response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: [{ id: 'req1', title: 'Requirement 1' }] }
      });
      
      const requirements = await client.getRequirements('project123');
      
      expect(requirements).toHaveLength(1);
      expect(requirements[0].id).toBe('req1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/projects/project123/requirements',
        expect.any(Object)
      );
    });
  });
});