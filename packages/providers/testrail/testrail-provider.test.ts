/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios from 'axios';
import { TestRailProvider, TestRailError as _TestRailError, TestRailErrorCategory as _TestRailErrorCategory } from './index';
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

describe('TestRailProvider', () => {
  const mockConfig = {
    baseUrl: 'https://example.testrail.com',
    username: 'test@example.com',
    apiKey: 'testApiKey123',
    projectId: 1,
    suiteId: 2
  };
  
  let provider: TestRailProvider;
  let mockedAxios: jest.Mocked<typeof axios>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh provider instance for each test
    provider = new TestRailProvider(mockConfig);
    
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
  });
  
  describe('Constructor', () => {
    it('should initialize correctly with configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('TestRail');
    });
  });
  
  describe('testConnection', () => {
    it('should return successful connection status when API responds correctly', async () => {
      // Mock successful API response
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { id: 1, email: 'test@example.com' }
      });
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.provider).toBe('TestRail');
      expect(result.details).toEqual({
        baseUrl: mockConfig.baseUrl,
        projectId: mockConfig.projectId
      });
    });
    
    it('should return failed connection status when API responds with error', async () => {
      // Mock failed API response
      const mockAxiosInstance = mockedAxios.create();
      const error = new Error('Connection failed');
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(error);
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.provider).toBe('TestRail');
      expect(result.error).toBe('Connection failed');
    });
  });
  
  describe('getTestCase', () => {
    it('should retrieve and convert a test case correctly', async () => {
      // Mock successful API response with a test case
      const mockTestCase = {
        id: 123,
        title: 'Test Case Title',
        description: 'Test Case Description',
        section_id: 1,
        suite_id: 2,
        type_id: 1,
        priority_id: 2,
        status_id: 1,
        custom_steps_separated: [
          { content: 'Step 1', expected: 'Expected 1' },
          { content: 'Step 2', expected: 'Expected 2' }
        ],
        created_by: 1,
        created_on: 12345678,
        updated_by: 2,
        updated_on: 87654321
      };
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockTestCase
      });
      
      const result = await provider.getTestCase('123');
      
      expect(result).toBeDefined();
      expect(result.id).toEqual(new Identifier('123'));
      expect(result.name).toBe('Test Case Title');
      expect(result.description).toBe('Test Case Description');
      expect(result.status).toBe('PASSED');
      expect(result.priority).toBe('MEDIUM');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].action).toBe('Step 1');
      expect(result.steps[0].expected).toBe('Expected 1');
      expect(result.metadata.originalProvider).toBe('TestRail');
      expect(result.metadata.sectionId).toBe(1);
      expect(result.metadata.suiteId).toBe(2);
    });
    
    it('should throw appropriate error when API request fails', async () => {
      // Mock API error
      const mockAxiosInstance = mockedAxios.create();
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Test case not found' },
          headers: {}
        },
        config: {
          url: 'get_case/123'
        }
      };
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(error);
      
      await expect(provider.getTestCase('123')).rejects.toThrow('Resource not found');
    });
  });
  
  describe('createTestCase', () => {
    it('should create a test case successfully', async () => {
      // Mock the test case to create
      const testCase = {
        id: new Identifier(''),
        name: 'New Test Case',
        description: 'Test Case Description',
        steps: [
          { action: 'Step 1', expected: 'Expected 1' },
          { action: 'Step 2', expected: 'Expected 2' }
        ],
        status: 'OPEN',
        priority: 'HIGH',
        metadata: {
          sectionId: 5
        }
      };
      
      // Mock the API response
      const mockCreatedCase = {
        id: 456,
        title: 'New Test Case',
        description: 'Test Case Description',
        section_id: 5,
        suite_id: 2,
        type_id: 1,
        priority_id: 3,
        status_id: 3,
        custom_steps_separated: [
          { content: 'Step 1', expected: 'Expected 1' },
          { content: 'Step 2', expected: 'Expected 2' }
        ]
      };
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: mockCreatedCase
      });
      
      const result = await provider.createTestCase(testCase);
      
      expect(result).toBeDefined();
      expect(result.id).toEqual(new Identifier('456'));
      expect(result.name).toBe('New Test Case');
      expect(result.status).toBe('NOT_RUN');
      expect(result.priority).toBe('HIGH');
    });
    
    it('should throw validation error when section ID is missing', async () => {
      // Test case without section ID
      const testCase = {
        id: new Identifier(''),
        name: 'New Test Case',
        description: 'Description',
        steps: [],
        status: 'OPEN',
        priority: 'MEDIUM'
      };
      
      await expect(provider.createTestCase(testCase)).rejects.toThrow('Section ID is required');
    });
  });
  
  describe('getTestCases', () => {
    it('should retrieve test cases from a section', async () => {
      // Mock API response
      const mockTestCases = [
        {
          id: 123,
          title: 'Test Case 1',
          section_id: 5,
          suite_id: 2,
          priority_id: 2,
          status_id: 1
        },
        {
          id: 124,
          title: 'Test Case 2',
          section_id: 5,
          suite_id: 2,
          priority_id: 3,
          status_id: 3
        }
      ];
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockTestCases
      });
      
      const result = await provider.getTestCases('5');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(new Identifier('123'));
      expect(result[0].name).toBe('Test Case 1');
      expect(result[1].id).toEqual(new Identifier('124'));
      expect(result[1].name).toBe('Test Case 2');
    });
    
    it('should throw validation error when project ID or suite ID is missing', async () => {
      // Create provider without project ID
      const incompleteProvider = new TestRailProvider({
        baseUrl: 'https://example.testrail.com',
        username: 'test@example.com',
        apiKey: 'testApiKey123'
      });
      
      await expect(incompleteProvider.getTestCases('5')).rejects.toThrow('Project ID and Suite ID are required');
    });
  });
  
  describe('mapFromTestRailStatus', () => {
    it('should map TestRail status IDs to canonical statuses', async () => {
      // We need a way to test private methods - one approach is to test indirectly 
      // by creating a test case with known status IDs and checking the mapped result
      
      // Mock API response with different status IDs
      const mockTestCasePassed = {
        id: 1,
        title: 'Passed Test',
        status_id: 1
      };
      
      const mockTestCaseBlocked = {
        id: 2,
        title: 'Blocked Test',
        status_id: 2
      };
      
      const mockTestCaseNotRun = {
        id: 3,
        title: 'Not Run Test',
        status_id: 3
      };
      
      const mockTestCaseFailed = {
        id: 5,
        title: 'Failed Test',
        status_id: 5
      };
      
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockTestCasePassed })
        .mockResolvedValueOnce({ data: mockTestCaseBlocked })
        .mockResolvedValueOnce({ data: mockTestCaseNotRun })
        .mockResolvedValueOnce({ data: mockTestCaseFailed });
      
      const passedCase = await provider.getTestCase('1');
      const blockedCase = await provider.getTestCase('2');
      const notRunCase = await provider.getTestCase('3');
      const failedCase = await provider.getTestCase('5');
      
      expect(passedCase.status).toBe('PASSED');
      expect(blockedCase.status).toBe('BLOCKED');
      expect(notRunCase.status).toBe('NOT_RUN');
      expect(failedCase.status).toBe('FAILED');
    });
  });
});