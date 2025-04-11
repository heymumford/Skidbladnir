/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios from 'axios';
import { JamaProvider, JamaError as _JamaError, JamaErrorCategory as _JamaErrorCategory } from './index';
import { Identifier } from '../../../pkg/domain/value-objects/Identifier';

// Mock axios and logger
jest.mock('axios');
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

describe('JamaProvider', () => {
  const mockConfig = {
    baseUrl: 'https://example.jamacloud.com',
    username: 'test@example.com',
    password: 'password123',
    clientId: 'clientId123',
    clientSecret: 'clientSecret123',
    projectId: 1
  };
  
  let provider: JamaProvider;
  let mockedAxios: jest.Mocked<typeof axios>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh provider instance for each test
    provider = new JamaProvider(mockConfig);
    
    // Cast the axios mock to the correct type
    mockedAxios = axios as jest.Mocked<typeof axios>;
    
    // Mock axios create to return a mocked instance
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    // Mock successful token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        token_type: 'bearer'
      }
    });
  });
  
  describe('Constructor', () => {
    it('should initialize correctly with configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('Jama Software');
    });
  });
  
  describe('Authentication', () => {
    it('should authenticate with client credentials', async () => {
      // Create a provider that will authenticate using client credentials
      const clientCredentialsProvider = new JamaProvider({
        baseUrl: 'https://example.jamacloud.com',
        clientId: 'clientId123',
        clientSecret: 'clientSecret123'
      });
      
      // Mock a successful API call that would trigger authentication
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1, name: 'Current User' } }
      });
      
      // Test connection should trigger authentication
      await clientCredentialsProvider.testConnection();
      
      // Verify client credentials were used
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            grant_type: 'client_credentials'
          }),
          auth: expect.objectContaining({
            username: 'clientId123',
            password: 'clientSecret123'
          })
        })
      );
    });
    
    it('should authenticate with username and password if client credentials not provided', async () => {
      // Create a provider that will authenticate using password flow
      const passwordProvider = new JamaProvider({
        baseUrl: 'https://example.jamacloud.com',
        username: 'test@example.com',
        password: 'password123'
      });
      
      // Mock a successful API call that would trigger authentication
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1, name: 'Current User' } }
      });
      
      // Test connection should trigger authentication
      await passwordProvider.testConnection();
      
      // Verify password flow was used
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            grant_type: 'password',
            username: 'test@example.com',
            password: 'password123'
          })
        })
      );
    });
    
    it('should use provided access token if available', async () => {
      // Create a provider with an access token
      const tokenProvider = new JamaProvider({
        baseUrl: 'https://example.jamacloud.com',
        accessToken: 'existing_access_token'
      });
      
      // Mock a successful API call
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1, name: 'Current User' } }
      });
      
      // Test connection should use existing token
      await tokenProvider.testConnection();
      
      // Verify token authentication was used (no need to post to token endpoint)
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        expect.anything(),
        expect.anything()
      );
    });
    
    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'invalid_client', error_description: 'Invalid client credentials' },
          headers: {}
        }
      });
      
      // Test connection should fail with authentication error
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });
  
  describe('testConnection', () => {
    it('should return successful connection status when API responds correctly', async () => {
      // Mock successful API response
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1, name: 'Current User' } }
      });
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.provider).toBe('Jama Software');
      expect(result.details).toEqual({
        baseUrl: mockConfig.baseUrl,
        projectId: mockConfig.projectId
      });
    });
    
    it('should return failed connection status when API responds with error', async () => {
      // Mock failed API response
      const mockAxiosInstance = mockedAxios.create();
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { meta: { message: 'Internal server error' } },
          headers: {}
        }
      };
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(error);
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.provider).toBe('Jama Software');
      expect(result.error).toContain('Internal server error');
    });
  });
  
  describe('getTestCase', () => {
    it('should retrieve and convert a test case correctly', async () => {
      // Mock successful API responses
      const mockTestCase = {
        id: 123,
        fields: {
          name: 'Test Case Title',
          description: 'Test Case Description',
          status: 'Complete',
          priority: 'High'
        },
        project: 1,
        parent: 100,
        documentKey: 'TC-123',
        globalId: 'TEST-123',
        itemType: 25,
        createdBy: 1,
        createdDate: '2023-01-15T12:00:00Z',
        modifiedBy: 2,
        modifiedDate: '2023-01-16T13:00:00Z'
      };
      
      const mockTestSteps = [
        {
          id: 1001,
          fields: {
            action: 'Step 1 Action',
            expectedResult: 'Step 1 Expected Result'
          }
        },
        {
          id: 1002,
          fields: {
            action: 'Step 2 Action',
            expectedResult: 'Step 2 Expected Result'
          }
        }
      ];
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockTestCase } })
        .mockResolvedValueOnce({ data: { data: mockTestSteps } });
      
      const result = await provider.getTestCase('123');
      
      expect(result).toBeDefined();
      expect(result.id).toEqual(new Identifier('123'));
      expect(result.name).toBe('Test Case Title');
      expect(result.description).toBe('Test Case Description');
      expect(result.status).toBe('COMPLETE');
      expect(result.priority).toBe('HIGH');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].action).toBe('Step 1 Action');
      expect(result.steps[0].expected).toBe('Step 1 Expected Result');
      expect(result.metadata.originalProvider).toBe('Jama Software');
      expect(result.metadata.documentKey).toBe('TC-123');
    });
    
    it('should throw appropriate error when API request fails', async () => {
      // Mock API error
      const mockAxiosInstance = mockedAxios.create();
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { meta: { message: 'Item not found' } },
          headers: {}
        },
        config: {
          url: '/items/123'
        }
      };
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(error);
      
      await expect(provider.getTestCase('123')).rejects.toThrow('Resource not found');
    });
  });
  
  describe('createTestCase', () => {
    it('should create a test case successfully', async () => {
      // Mock finding item type
      const mockItemTypes = [
        { id: 25, name: 'Test Case', typeKey: 'testcase' },
        { id: 26, name: 'Requirement', typeKey: 'requirement' }
      ];
      
      // Mock the test case to create
      const testCase = {
        id: new Identifier(''),
        name: 'New Test Case',
        description: 'Test Case Description',
        steps: [
          { action: 'Step 1', expected: 'Expected 1' },
          { action: 'Step 2', expected: 'Expected 2' }
        ],
        status: 'DRAFT',
        priority: 'HIGH',
        metadata: {}
      };
      
      // Mock the API responses
      const mockCreatedCase = {
        id: 456,
        fields: {
          name: 'New Test Case',
          description: 'Test Case Description',
          status: 'Draft',
          priority: 'High'
        },
        project: 1,
        parent: 100,
        documentKey: 'TC-456',
        globalId: 'TEST-456',
        itemType: 25
      };
      
      const mockCreatedSteps = [
        {
          id: 2001,
          fields: {
            action: 'Step 1',
            expectedResult: 'Expected 1',
            sequence: 1
          }
        },
        {
          id: 2002,
          fields: {
            action: 'Step 2',
            expectedResult: 'Expected 2',
            sequence: 2
          }
        }
      ];
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockItemTypes } })  // Get item types
        .mockResolvedValueOnce({ data: { data: mockCreatedCase } }) // Get item after creation
        .mockResolvedValueOnce({ data: { data: mockCreatedSteps } }); // Get steps after creation
      
      (mockAxiosInstance.post as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockCreatedCase } })  // Create item
        .mockResolvedValueOnce({ data: { data: mockCreatedSteps } }); // Create steps
      
      const result = await provider.createTestCase(testCase);
      
      expect(result).toBeDefined();
      expect(result.id).toEqual(new Identifier('456'));
      expect(result.name).toBe('New Test Case');
      expect(result.status).toBe('DRAFT');
      expect(result.priority).toBe('HIGH');
      expect(result.steps).toHaveLength(2);
    });
    
    it('should throw validation error when project ID is missing', async () => {
      // Create provider without project ID
      const incompleteProvider = new JamaProvider({
        baseUrl: 'https://example.jamacloud.com',
        username: 'test@example.com',
        password: 'password123'
      });
      
      // Test case to create
      const testCase = {
        id: new Identifier(''),
        name: 'New Test Case',
        description: 'Description',
        steps: [],
        status: 'DRAFT',
        priority: 'MEDIUM'
      };
      
      await expect(incompleteProvider.createTestCase(testCase)).rejects.toThrow('Project ID is required');
    });
  });
  
  describe('getTestCases', () => {
    it('should retrieve test cases for a project', async () => {
      // Mock finding item type
      const mockItemTypes = [
        { id: 25, name: 'Test Case', typeKey: 'testcase' },
        { id: 26, name: 'Requirement', typeKey: 'requirement' }
      ];
      
      // Mock API responses
      const mockTestCases = [
        {
          id: 123,
          fields: {
            name: 'Test Case 1',
            description: 'Description 1',
            status: 'Complete',
            priority: 'High'
          },
          project: 1,
          parent: 100,
          documentKey: 'TC-123',
          itemType: 25
        },
        {
          id: 124,
          fields: {
            name: 'Test Case 2',
            description: 'Description 2',
            status: 'Draft',
            priority: 'Medium'
          },
          project: 1,
          parent: 100,
          documentKey: 'TC-124',
          itemType: 25
        }
      ];
      
      const mockTestSteps1 = [
        {
          id: 1001,
          fields: {
            action: 'Step 1 Action',
            expectedResult: 'Step 1 Expected'
          }
        }
      ];
      
      const mockTestSteps2 = [
        {
          id: 1002,
          fields: {
            action: 'Step 2 Action',
            expectedResult: 'Step 2 Expected'
          }
        }
      ];
      
      const mockAxiosInstance = mockedAxios.create();
      
      // Mock responses for item types and items
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockItemTypes } })
        .mockResolvedValueOnce({ data: { data: mockTestCases } })
        .mockResolvedValueOnce({ data: { data: mockTestSteps1 } })
        .mockResolvedValueOnce({ data: { data: mockTestSteps2 } });
      
      const result = await provider.getTestCases();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(new Identifier('123'));
      expect(result[0].name).toBe('Test Case 1');
      expect(result[0].status).toBe('COMPLETE');
      expect(result[1].id).toEqual(new Identifier('124'));
      expect(result[1].name).toBe('Test Case 2');
      expect(result[1].status).toBe('DRAFT');
    });
    
    it('should filter test cases by parent ID when provided', async () => {
      // Mock finding item type
      const mockItemTypes = [
        { id: 25, name: 'Test Case', typeKey: 'testcase' }
      ];
      
      // Mock API responses with two different parent IDs
      const mockTestCases = [
        {
          id: 123,
          fields: { name: 'Test Case 1' },
          project: 1,
          parentId: 100
        },
        {
          id: 124,
          fields: { name: 'Test Case 2' },
          project: 1,
          parentId: 101
        },
        {
          id: 125,
          fields: { name: 'Test Case 3' },
          project: 1,
          parentId: 100
        }
      ];
      
      // Mock empty steps for simplicity
      const emptySteps = [];
      
      const mockAxiosInstance = mockedAxios.create();
      
      // Mock responses
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockItemTypes } })
        .mockResolvedValueOnce({ data: { data: mockTestCases } })
        .mockResolvedValueOnce({ data: { data: emptySteps } })
        .mockResolvedValueOnce({ data: { data: emptySteps } });
      
      // Get test cases with parent ID filter
      const result = await provider.getTestCases('100');
      
      // Should only return test cases with parentId 100 (two items)
      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(new Identifier('123'));
      expect(result[1].id).toEqual(new Identifier('125'));
    });
  });
  
  describe('Status and Priority Mapping', () => {
    it('should correctly map between Jama and canonical statuses', async () => {
      // Test different status mappings by creating test cases with various statuses
      const mockItemTypes = [
        { id: 25, name: 'Test Case', typeKey: 'testcase' }
      ];
      
      // Mock test cases with different statuses
      const mockTestCases = [
        {
          id: 101,
          fields: { name: 'Draft Case', status: 'Draft' },
          project: 1
        },
        {
          id: 102,
          fields: { name: 'Approved Case', status: 'Approved' },
          project: 1
        },
        {
          id: 103,
          fields: { name: 'Complete Case', status: 'Complete' },
          project: 1
        }
      ];
      
      // Mock empty steps for simplicity
      const emptySteps = [];
      
      const mockAxiosInstance = mockedAxios.create();
      
      // Mock responses
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockItemTypes } })
        .mockResolvedValueOnce({ data: { data: mockTestCases } })
        .mockResolvedValueOnce({ data: { data: emptySteps } })
        .mockResolvedValueOnce({ data: { data: emptySteps } })
        .mockResolvedValueOnce({ data: { data: emptySteps } });
      
      // Get test cases
      const result = await provider.getTestCases();
      
      // Check status mappings
      expect(result[0].status).toBe('DRAFT');
      expect(result[1].status).toBe('APPROVED');
      expect(result[2].status).toBe('COMPLETE');
    });
    
    it('should correctly map between Jama and canonical priorities', async () => {
      // Test different priority mappings by creating test cases with various priorities
      const mockItemTypes = [
        { id: 25, name: 'Test Case', typeKey: 'testcase' }
      ];
      
      // Mock test cases with different priorities
      const mockTestCases = [
        {
          id: 101,
          fields: { name: 'Critical Case', priority: 'Critical' },
          project: 1
        },
        {
          id: 102,
          fields: { name: 'High Case', priority: 'High' },
          project: 1
        },
        {
          id: 103,
          fields: { name: 'Low Case', priority: 'Low' },
          project: 1
        }
      ];
      
      // Mock empty steps for simplicity
      const emptySteps = [];
      
      const mockAxiosInstance = mockedAxios.create();
      
      // Mock responses
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: { data: mockItemTypes } })
        .mockResolvedValueOnce({ data: { data: mockTestCases } })
        .mockResolvedValueOnce({ data: { data: emptySteps } })
        .mockResolvedValueOnce({ data: { data: emptySteps } })
        .mockResolvedValueOnce({ data: { data: emptySteps } });
      
      // Get test cases
      const result = await provider.getTestCases();
      
      // Check priority mappings
      expect(result[0].priority).toBe('CRITICAL');
      expect(result[1].priority).toBe('HIGH');
      expect(result[2].priority).toBe('LOW');
    });
  });
});