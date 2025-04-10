/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Test Suite for qTest Loader Error Handling
 * 
 * This test ensures the qTest loader correctly handles all error scenarios
 * during data loading operations.
 */

import axios, { AxiosError } from 'axios';
import { QTestProvider, QTestProviderConfig } from '../../../packages/providers/qtest';
import { QTestClient, QTestError, QTestErrorCategory } from '../../../packages/providers/qtest/api-client';
import { ConnectionStatus, EntityType } from '../../../packages/common/src/interfaces/provider';
import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

// Mock axios
jest.mock('axios');

// Mock QTestClient
jest.mock('../../../packages/providers/qtest/api-client', () => {
  // Preserve the actual QTestErrorCategory and QTestError implementations
  const actual = jest.requireActual('../../../packages/providers/qtest/api-client');
  
  return {
    ...actual,
    QTestClient: jest.fn().mockImplementation(() => ({
      testConnection: jest.fn().mockResolvedValue(true),
      getProjects: jest.fn().mockResolvedValue({ data: [] }),
      getTestCases: jest.fn().mockResolvedValue({ data: [] }),
      getTestCase: jest.fn().mockResolvedValue({ data: {} }),
      getTestCycles: jest.fn().mockResolvedValue({ data: [] }),
      getTestExecutions: jest.fn().mockResolvedValue({ data: [] }),
      downloadAttachment: jest.fn().mockResolvedValue({ 
        data: Buffer.from('test'), 
        headers: { 'content-type': 'text/plain' } 
      }),
      createTestCase: jest.fn().mockResolvedValue({ data: { id: 1 } }),
      createTestCycle: jest.fn().mockResolvedValue({ data: { id: 1 } }),
      createTestRun: jest.fn().mockResolvedValue({ data: { id: 1 } }),
      createTestLog: jest.fn().mockResolvedValue({ data: { id: 1 } }),
      uploadAttachment: jest.fn().mockResolvedValue({ data: { id: 1 } }),
      getRateLimiterMetrics: jest.fn().mockReturnValue({})
    }))
  };
});

describe('QTest Loader Error Handling', () => {
  let provider: QTestProvider;
  let mockClient: any;
  
  const mockConfig: QTestProviderConfig = {
    baseUrl: 'https://qtest.example.com/api/v3',
    apiToken: 'mock-api-token'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    provider = new QTestProvider();
    // Initialize the provider
    provider.initialize(mockConfig);
    
    // Get the mocked client
    // @ts-ignore - accessing private property for testing
    mockClient = (QTestClient as jest.Mock).mock.results[0].value;
  });
  
  describe('Authentication Error Scenarios', () => {
    it('should handle invalid API token', async () => {
      // Setup the error
      const error = new Error('Invalid API token') as AxiosError;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        data: { message: 'Invalid API token' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.testConnection.mockRejectedValueOnce(
        QTestError.authentication('Invalid API token', {
          statusCode: 401,
          originalError: error
        })
      );
      
      // Test the provider method
      const result = await provider.testConnection();
      
      // Verify the result
      expect(result.connected).toBe(false);
      expect(result.error).toContain('Invalid API token');
      expect(result.details?.category).toBe(QTestErrorCategory.AUTHENTICATION);
    });
    
    it('should handle authorization failure', async () => {
      // Setup the error
      const error = new Error('Insufficient permissions') as AxiosError;
      error.response = {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        data: { message: 'Insufficient permissions to access project' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.authorization('Insufficient permissions to access project', {
          statusCode: 403,
          originalError: error
        })
      );
      
      // Test the provider method - we need to use a new expectation since each call resets the mock
      await expect(provider.getTestCases('123')).rejects.toThrow(/Insufficient permissions/);
    });
    
    it('should handle token expiration during operation', async () => {
      // Setup a sequence of responses: first failure due to token expiration, then success after "refresh"
      mockClient.getProjects
        .mockRejectedValueOnce(QTestError.authentication('Token expired', { statusCode: 401 }))
        .mockResolvedValueOnce({ data: [{ id: 1, name: 'Project 1' }] });
      
      // Expect the operation to fail
      await expect(provider.getProjects()).rejects.toThrow('Failed to get projects: Token expired');
    });
  });
  
  describe('Network Error Scenarios', () => {
    it('should handle connection timeout', async () => {
      // Setup the error
      const error = new Error('Connection timeout') as AxiosError;
      error.code = 'ECONNABORTED';
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.network('Connection timeout', {
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCases('123')).rejects.toThrow('Connection timeout');
    });
    
    it('should handle server unavailable (5xx errors)', async () => {
      // Setup the error
      const error = new Error('Internal server error') as AxiosError;
      error.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        data: { message: 'Internal server error' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.server('Internal server error', {
          statusCode: 500,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCases('123')).rejects.toThrow('Internal server error');
    });
    
    it('should handle invalid SSL certificate', async () => {
      // Setup the error
      const error = new Error('Certificate has expired') as AxiosError;
      error.code = 'CERT_HAS_EXPIRED';
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.network('Certificate has expired', {
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCases('123')).rejects.toThrow('Certificate has expired');
    });
  });
  
  describe('API Constraint Errors', () => {
    it('should handle rate limiting', async () => {
      // Setup the error
      const error = new Error('Rate limit exceeded') as AxiosError;
      error.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '60' },
        data: { message: 'Rate limit exceeded' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.rateLimit('Rate limit exceeded', 60, {
          statusCode: 429,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCases('123')).rejects.toThrow('Rate limit exceeded');
    });
    
    it('should handle payload size limits', async () => {
      // Setup the error
      const error = new Error('Request entity too large') as AxiosError;
      error.response = {
        status: 413,
        statusText: 'Request Entity Too Large',
        headers: {},
        data: { message: 'Request entity too large' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestCase.mockRejectedValueOnce(
        QTestError.validation('Request entity too large', undefined, {
          statusCode: 413,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.createTestCase('123', {
        id: '',
        name: 'Test Case',
        steps: []
      })).rejects.toThrow('Request entity too large');
    });
  });
  
  describe('Data Validation Errors', () => {
    it('should handle required field missing', async () => {
      // Setup the error
      const error = new Error('Validation failed') as AxiosError;
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        data: { 
          message: 'Validation failed',
          fieldErrors: {
            name: ['Name is required']
          }
        },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestCase.mockRejectedValueOnce(
        QTestError.validation('Validation failed', { name: ['Name is required'] }, {
          statusCode: 400,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.createTestCase('123', {
        id: '',
        name: '', // Empty name
        steps: []
      })).rejects.toThrow('Validation failed');
    });
    
    it('should handle invalid field format', async () => {
      // Setup the error
      const error = new Error('Validation failed') as AxiosError;
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        data: { 
          message: 'Validation failed',
          fieldErrors: {
            executedAt: ['Invalid date format']
          }
        },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestLog.mockRejectedValueOnce(
        QTestError.validation('Validation failed', { executedAt: ['Invalid date format'] }, {
          statusCode: 400,
          originalError: error
        })
      );
      
      // Test the provider method by making a call that would eventually call createTestLog
      await expect(provider.createTestExecutions('123', '456', [{
        id: '',
        name: 'Test Execution',
        testCaseId: '789',
        testCycleId: '456',
        status: 'PASSED',
        results: []
      }])).rejects.toThrow('Validation failed');
    });
    
    it('should handle referential integrity errors', async () => {
      // Setup the error
      const error = new Error('Invalid reference') as AxiosError;
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        data: { 
          message: 'Invalid reference',
          fieldErrors: {
            'test_case.id': ['Test case does not exist']
          }
        },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestRun.mockRejectedValueOnce(
        QTestError.validation('Invalid reference', { 'test_case.id': ['Test case does not exist'] }, {
          statusCode: 400,
          originalError: error
        })
      );
      
      // Test the provider method by making a call that would eventually call createTestRun
      await expect(provider.createTestExecutions('123', '456', [{
        id: '',
        name: 'Test Execution',
        testCaseId: '999', // Non-existent test case
        testCycleId: '456',
        status: 'PASSED',
        results: []
      }])).rejects.toThrow('Invalid reference');
    });
  });
  
  describe('Resource Conflict Errors', () => {
    it('should handle duplicate resources', async () => {
      // Setup the error
      const error = new Error('Resource already exists') as AxiosError;
      error.response = {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        data: { message: 'Test case with this name already exists in the same module' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestCase.mockRejectedValueOnce(
        QTestError.conflict('Test case with this name already exists in the same module', {
          statusCode: 409,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.createTestCase('123', {
        id: '',
        name: 'Duplicate Test Case',
        steps: []
      })).rejects.toThrow('Test case with this name already exists');
    });
    
    it('should handle concurrent modification', async () => {
      // Setup the error
      const error = new Error('Concurrent modification') as AxiosError;
      error.response = {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        data: { message: 'The resource has been modified by another user' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.createTestCase.mockRejectedValueOnce(
        QTestError.conflict('The resource has been modified by another user', {
          statusCode: 409,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.createTestCase('123', {
        id: '456',
        name: 'Test Case',
        steps: []
      })).rejects.toThrow('modified by another user');
    });
  });
  
  describe('Resource Not Found Errors', () => {
    it('should handle non-existent project', async () => {
      // Setup the error
      const error = new Error('Project not found') as AxiosError;
      error.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { message: 'Project with ID 999 not found' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.getTestCases.mockRejectedValueOnce(
        QTestError.notFound('Project with ID 999 not found', {
          statusCode: 404,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCases('999')).rejects.toThrow('Project with ID 999 not found');
    });
    
    it('should handle non-existent test case', async () => {
      // Setup the error
      const error = new Error('Test case not found') as AxiosError;
      error.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { message: 'Test case with ID 999 not found' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.getTestCase.mockRejectedValueOnce(
        QTestError.notFound('Test case with ID 999 not found', {
          statusCode: 404,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getTestCase('123', '999')).rejects.toThrow('Test case with ID 999 not found');
    });
    
    it('should handle non-existent attachment', async () => {
      // Setup the error
      const error = new Error('Attachment not found') as AxiosError;
      error.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { message: 'Attachment with ID 999 not found' },
        config: {}
      };
      
      // Make the client method throw the error
      mockClient.downloadAttachment.mockRejectedValueOnce(
        QTestError.notFound('Attachment with ID 999 not found', {
          statusCode: 404,
          originalError: error
        })
      );
      
      // Test the provider method
      await expect(provider.getAttachmentContent('123', '999')).rejects.toThrow('Attachment with ID 999 not found');
    });
  });
  
  describe('Input Validation Errors', () => {
    it('should handle invalid project ID format', async () => {
      // Setup a case where the project ID is not a number and no default is configured
      // @ts-ignore - Replacing the config with one that has no default
      provider.config = { ...mockConfig, defaultProjectId: undefined };
      
      // Test the provider method with a non-numeric project ID
      await expect(provider.getTestCases('not-a-number')).rejects.toThrow('Invalid project ID and no default');
    });
    
    it('should handle invalid test case ID format', async () => {
      // Test the provider method with a non-numeric test case ID
      await expect(provider.getTestCase('123', 'not-a-number')).rejects.toThrow('Invalid test case ID');
    });
    
    it('should handle invalid attachment ID format', async () => {
      // Test the provider method with a non-numeric attachment ID
      await expect(provider.getAttachmentContent('123', 'not-a-number')).rejects.toThrow('Invalid attachment ID');
    });
    
    it('should handle unsupported entity type for attachments', async () => {
      // Test the provider method with an unsupported entity type
      await expect(provider.uploadAttachment('123', EntityType.FIELD_DEFINITION, '456', {
        name: 'test.txt',
        contentType: 'text/plain',
        size: 4,
        content: Buffer.from('test')
      })).rejects.toThrow('Unsupported entity type');
    });
    
    it('should handle missing configuration fields', async () => {
      const invalidProvider = new QTestProvider();
      
      // Test initialization with missing baseUrl
      await expect(invalidProvider.initialize({
        apiToken: 'test-token'
      } as QTestProviderConfig)).rejects.toThrow('baseUrl is required');
      
      // Test initialization with missing authentication
      await expect(invalidProvider.initialize({
        baseUrl: 'https://qtest.example.com'
      } as QTestProviderConfig)).rejects.toThrow('Either apiToken or both username and password must be provided');
    });
  });
  
  describe('Complex Error Recovery', () => {
    it('should handle creating field definitions which is not supported', async () => {
      // Test the unsupported operation
      await expect(provider.createFieldDefinition('123', {
        id: '',
        name: 'Custom Field',
        type: 'STRING',
        required: false
      })).rejects.toThrow('Creating custom fields is not supported');
    });
    
    it('should handle provider not initialized', async () => {
      // Create a new provider without initialization
      const uninitializedProvider = new QTestProvider();
      
      // Test methods without initialization
      await expect(uninitializedProvider.getProjects()).rejects.toThrow('Provider not initialized');
      await expect(uninitializedProvider.getTestCases('123')).rejects.toThrow('Provider not initialized');
    });
  });
  
  // This section outlines tests that will be implemented for cross-product error handling
  describe('Cross-Product Error Scenarios', () => {
    // These tests are placeholders and will be implemented once the unified qTest facade is complete
    
    it.todo('should handle qTest Manager API failures while qTest Parameters API is available');
    
    it.todo('should handle qTest Parameters API failures while qTest Manager API is available');
    
    it.todo('should handle qTest Scenario API failures during BDD feature migration');
    
    it.todo('should handle qTest Pulse API timeouts without affecting core migration');
    
    it.todo('should handle partial data availability across products');
    
    it.todo('should coordinate authentication refresh across all product APIs');
    
    it.todo('should maintain transaction consistency across product boundaries');
    
    it.todo('should handle mixed permission levels across different qTest products');
    
    it.todo('should recover from temporary service unavailability for specific products');
    
    it.todo('should handle API version differences between products');
  });
});