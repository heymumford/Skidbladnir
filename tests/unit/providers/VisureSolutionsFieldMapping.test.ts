/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Visure Solutions Field Mapping Tests
 * 
 * Tests for the Visure Solutions field mapping functionality
 */

import axios from 'axios';
import { VisureProvider, VisureClient, createVisureProvider, VisureProviderConfig } from '../../../packages/providers/visure';
import { EntityType } from '../../../packages/common/src/interfaces/provider';

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

describe('Visure Solutions Field Mapping', () => {
  let provider: VisureProvider;
  const mockConfig: VisureProviderConfig = {
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
    
    // Mock axios interceptors
    mockAxiosInstance.interceptors.request.use.mockImplementation((callback) => {
      // Store the callback
      (mockAxiosInstance as any).requestInterceptor = callback;
    });
    
    mockAxiosInstance.interceptors.response.use.mockImplementation((successCb, errorCb) => {
      // Store the callbacks
      (mockAxiosInstance as any).responseInterceptor = { successCb, errorCb };
    });
    
    // Setup auth token
    (provider as any).client.accessToken = 'mock-token';
    (provider as any).client.accessTokenExpiry = Date.now() + 3600000;
  });
  
  describe('Test Case Field Mapping', () => {
    it('should map Visure test case to canonical model correctly', async () => {
      // Mock a test case from Visure
      const visureTestCase = {
        id: 'tc1',
        title: 'Test Login Functionality',
        description: 'Test the user login functionality',
        status: 'Approved',
        priority: 'High',
        steps: [
          { order: 1, action: 'Navigate to login page', expected: 'Login page is displayed' },
          { order: 2, action: 'Enter valid credentials', expected: 'User is logged in' }
        ],
        tags: ['login', 'authentication'],
        createdDate: '2024-01-15T10:00:00Z',
        modifiedDate: '2024-01-16T14:30:00Z',
        identifier: 'TC-001',
        type: 'Functional Test',
        folderId: 'folder1',
        createdBy: 'user1',
        modifiedBy: 'user2',
        traceLinks: [
          { sourceId: 'req1', targetId: 'tc1', linkType: 'VERIFIES', direction: 'FORWARD' },
          { sourceId: 'req2', targetId: 'tc1', linkType: 'VALIDATES', direction: 'FORWARD' }
        ],
        // Custom fields
        automationStatus: 'Automated',
        testEnvironment: 'Production',
        estimatedDuration: 15
      };

      // Mock getTestCase API call
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: visureTestCase }
      });
      
      // Get the test case via the provider
      const result = await provider.getTestCase('project123', 'tc1');
      
      // Verify standard fields are mapped correctly
      expect(result.id).toBe('tc1');
      expect(result.title).toBe('Test Login Functionality');
      expect(result.description).toBe('Test the user login functionality');
      expect(result.status).toBe('APPROVED'); // Mapped to uppercase canonical status
      expect(result.priority).toBe('HIGH'); // Mapped to uppercase canonical priority
      
      // Verify steps are mapped correctly
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].description).toBe('Navigate to login page');
      expect(result.steps[0].expectedResult).toBe('Login page is displayed');
      expect(result.steps[1].order).toBe(2);
      
      // Verify date fields are converted to Date objects
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      
      // Verify requirement IDs are extracted from trace links
      expect(result.attributes.requirementIds).toContain('req1');
      expect(result.attributes.requirementIds).toContain('req2');
      
      // Verify Visure-specific fields are preserved in attributes
      expect(result.attributes.visureId).toBe('tc1');
      expect(result.attributes.visureIdentifier).toBe('TC-001');
      expect(result.attributes.visureType).toBe('Functional Test');
      expect(result.attributes.visureFolderId).toBe('folder1');
      expect(result.attributes.createdBy).toBe('user1');
      expect(result.attributes.modifiedBy).toBe('user2');
      
      // Verify custom fields are captured
      expect(result.attributes.customFields).toBeDefined();
      expect(result.attributes.customFields.automationStatus).toBe('Automated');
      expect(result.attributes.customFields.testEnvironment).toBe('Production');
      expect(result.attributes.customFields.estimatedDuration).toBe(15);
    });
    
    it('should map canonical test case to Visure format correctly', async () => {
      // Create a canonical test case
      const canonicalTestCase = {
        id: 'tc-new',
        title: 'New Test Case',
        description: 'Description for test case',
        status: 'READY',
        priority: 'MEDIUM',
        steps: [
          { order: 1, description: 'Step 1 action', expectedResult: 'Step 1 expected' },
          { order: 2, description: 'Step 2 action', expectedResult: 'Step 2 expected' }
        ],
        tags: ['regression', 'smoke'],
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-16T14:30:00Z'),
        attributes: {
          visureFolderId: 'folder2',
          visureType: 'API Test',
          customFields: {
            automationStatus: 'Manual',
            testEnvironment: 'QA',
            estimatedDuration: 30
          }
        }
      };
      
      // Mock createTestCase API call
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            id: 'tc-created',
            title: 'New Test Case'
          }
        }
      });
      
      // Create the test case via the provider
      await provider.createTestCase('project123', canonicalTestCase);
      
      // Verify the conversion via the API call
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/projects/project123/testcases',
        expect.objectContaining({
          title: 'New Test Case',
          description: 'Description for test case',
          status: 'Ready for Review', // Mapped from READY to Visure format
          priority: 'Medium', // Mapped from MEDIUM to Visure format
          folderId: 'folder2',
          type: 'API Test',
          // Steps should be mapped correctly
          steps: [
            { order: 1, action: 'Step 1 action', expected: 'Step 1 expected', notes: '' },
            { order: 2, action: 'Step 2 action', expected: 'Step 2 expected', notes: '' }
          ],
          // Custom fields should be included
          automationStatus: 'Manual',
          testEnvironment: 'QA',
          estimatedDuration: 30
        })
      );
    });
    
    it('should handle missing field values in Visure test case', async () => {
      // Mock a minimal test case from Visure
      const minimialVisureTestCase = {
        id: 'tc2',
        title: 'Minimal Test Case',
        // No description, status, priority, etc.
        createdDate: '2024-01-15T10:00:00Z',
        modifiedDate: '2024-01-16T14:30:00Z'
      };
      
      // Mock getTestCase API call
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: minimialVisureTestCase }
      });
      
      // Get the test case via the provider
      const result = await provider.getTestCase('project123', 'tc2');
      
      // Verify default values are applied
      expect(result.id).toBe('tc2');
      expect(result.title).toBe('Minimal Test Case');
      expect(result.description).toBe(''); // Empty string for missing description
      expect(result.status).toBe('DRAFT'); // Default status
      expect(result.priority).toBe('MEDIUM'); // Default priority
      expect(result.steps).toEqual([]); // Empty array for missing steps
      expect(result.tags).toEqual([]); // Empty array for missing tags
    });
  });
  
  describe('Status and Priority Mapping', () => {
    it('should map all Visure status values to canonical formats', async () => {
      // Create a test case for each status mapping
      const statusTestCases = [
        { status: 'Draft', expectedCanonical: 'DRAFT' },
        { status: 'In Progress', expectedCanonical: 'DRAFT' },
        { status: 'Ready for Review', expectedCanonical: 'READY' },
        { status: 'Reviewed', expectedCanonical: 'READY' },
        { status: 'Approved', expectedCanonical: 'APPROVED' },
        { status: 'Baselined', expectedCanonical: 'APPROVED' },
        { status: 'Obsolete', expectedCanonical: 'DEPRECATED' },
        { status: 'Deprecated', expectedCanonical: 'DEPRECATED' },
        { status: 'Unknown Status', expectedCanonical: 'DRAFT' }, // Default fallback
        { status: undefined, expectedCanonical: 'DRAFT' } // Undefined case
      ];
      
      for (const testCase of statusTestCases) {
        // Access the private method via type assertion
        const result = (provider as any).mapVisureStatusToCanonical(testCase.status);
        expect(result).toBe(testCase.expectedCanonical);
      }
    });
    
    it('should map all canonical status values to Visure formats', async () => {
      // Create a test case for each status mapping
      const statusTestCases = [
        { canonicalStatus: 'DRAFT', expectedVisure: 'Draft' },
        { canonicalStatus: 'READY', expectedVisure: 'Ready for Review' },
        { canonicalStatus: 'APPROVED', expectedVisure: 'Approved' },
        { canonicalStatus: 'DEPRECATED', expectedVisure: 'Deprecated' },
        { canonicalStatus: 'UNKNOWN_STATUS', expectedVisure: 'Draft' }, // Default fallback
        { canonicalStatus: undefined, expectedVisure: 'Draft' } // Undefined case
      ];
      
      for (const testCase of statusTestCases) {
        // Access the private method via type assertion
        const result = (provider as any).mapCanonicalStatusToVisure(testCase.canonicalStatus);
        expect(result).toBe(testCase.expectedVisure);
      }
    });
    
    it('should map all Visure priority values to canonical formats', async () => {
      // Create a test case for each priority mapping
      const priorityTestCases = [
        { priority: 'Critical', expectedCanonical: 'CRITICAL' },
        { priority: 'High', expectedCanonical: 'HIGH' },
        { priority: 'Medium', expectedCanonical: 'MEDIUM' },
        { priority: 'Low', expectedCanonical: 'LOW' },
        { priority: 'Unknown Priority', expectedCanonical: 'MEDIUM' }, // Default fallback
        { priority: undefined, expectedCanonical: 'MEDIUM' } // Undefined case
      ];
      
      for (const testCase of priorityTestCases) {
        // Access the private method via type assertion
        const result = (provider as any).mapVisurePriorityToCanonical(testCase.priority);
        expect(result).toBe(testCase.expectedCanonical);
      }
    });
    
    it('should map all canonical priority values to Visure formats', async () => {
      // Create a test case for each priority mapping
      const priorityTestCases = [
        { canonicalPriority: 'CRITICAL', expectedVisure: 'Critical' },
        { canonicalPriority: 'HIGH', expectedVisure: 'High' },
        { canonicalPriority: 'MEDIUM', expectedVisure: 'Medium' },
        { canonicalPriority: 'LOW', expectedVisure: 'Low' },
        { canonicalPriority: 'UNKNOWN_PRIORITY', expectedVisure: 'Medium' }, // Default fallback
        { canonicalPriority: undefined, expectedVisure: 'Medium' } // Undefined case
      ];
      
      for (const testCase of priorityTestCases) {
        // Access the private method via type assertion
        const result = (provider as any).mapCanonicalPriorityToVisure(testCase.canonicalPriority);
        expect(result).toBe(testCase.expectedVisure);
      }
    });
  });
  
  describe('Field Definition Mapping', () => {
    it('should map Visure field definitions correctly', async () => {
      // Mock field definitions from Visure API
      const requirementFields = [
        {
          id: 'field1',
          name: 'description',
          label: 'Description',
          description: 'Requirement description',
          type: 'textarea',
          required: true,
          readOnly: false
        },
        {
          id: 'field2',
          name: 'status',
          label: 'Status',
          description: 'Requirement status',
          type: 'enum',
          required: true,
          readOnly: false,
          allowedValues: ['Draft', 'Approved', 'Rejected']
        }
      ];
      
      const testCaseFields = [
        {
          id: 'field3',
          name: 'priority',
          label: 'Priority',
          description: 'Test case priority',
          type: 'enum',
          required: false,
          readOnly: false,
          allowedValues: ['Low', 'Medium', 'High', 'Critical']
        },
        {
          id: 'field4',
          name: 'automationStatus',
          label: 'Automation Status',
          description: 'Test automation status',
          type: 'enum',
          required: false,
          readOnly: false,
          allowedValues: ['Manual', 'Automated', 'Planned']
        }
      ];
      
      // Mock API responses
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: requirementFields }
      }).mockResolvedValueOnce({
        data: { data: testCaseFields }
      });
      
      // Get field definitions via the provider
      const result = await provider.getFieldDefinitions('project123');
      
      // Verify field count
      expect(result).toHaveLength(4);
      
      // Verify requirement field mappings
      const descriptionField = result.find(f => f.name === 'description');
      expect(descriptionField).toBeDefined();
      expect(descriptionField?.type).toBe('text'); // Mapped from 'textarea'
      expect(descriptionField?.required).toBe(true);
      expect(descriptionField?.entityType).toBe(EntityType.FIELD_DEFINITION);
      expect(descriptionField?.attributes.visureEntityType).toBe('requirement');
      
      // Verify status field mappings
      const statusField = result.find(f => f.name === 'status');
      expect(statusField).toBeDefined();
      expect(statusField?.type).toBe('enum');
      expect(statusField?.allowedValues).toEqual(['Draft', 'Approved', 'Rejected']);
      
      // Verify test case field mappings
      const priorityField = result.find(f => f.name === 'priority');
      expect(priorityField).toBeDefined();
      expect(priorityField?.entityType).toBe(EntityType.TEST_CASE);
      expect(priorityField?.attributes.visureEntityType).toBe('testcase');
      
      // Verify custom field mappings
      const automationField = result.find(f => f.name === 'automationStatus');
      expect(automationField).toBeDefined();
      expect(automationField?.label).toBe('Automation Status');
    });
    
    it('should map all Visure field types to canonical types', async () => {
      // Define field type mappings to test
      const fieldTypeMappings = [
        { visureType: 'text', expectedType: 'string' },
        { visureType: 'textarea', expectedType: 'text' },
        { visureType: 'number', expectedType: 'number' },
        { visureType: 'integer', expectedType: 'integer' },
        { visureType: 'date', expectedType: 'date' },
        { visureType: 'datetime', expectedType: 'datetime' },
        { visureType: 'boolean', expectedType: 'boolean' },
        { visureType: 'user', expectedType: 'user' },
        { visureType: 'enum', expectedType: 'enum' },
        { visureType: 'multi-enum', expectedType: 'array' },
        { visureType: 'unknown', expectedType: 'string' }, // Default fallback
        { visureType: undefined, expectedType: 'string' } // Undefined case
      ];
      
      for (const mapping of fieldTypeMappings) {
        // Access the private method via type assertion
        const result = (provider as any).mapVisureFieldTypeToCanonical(mapping.visureType);
        expect(result).toBe(mapping.expectedType);
      }
    });
  });
  
  describe('Custom Fields Extraction', () => {
    it('should correctly extract custom fields from Visure objects', async () => {
      // Create a test object with standard and custom fields
      const visureObject = {
        id: 'tc3',
        title: 'Test Case with Custom Fields',
        description: 'Description text',
        status: 'Draft',
        priority: 'Medium',
        steps: [],
        tags: ['test'],
        createdBy: 'user1',
        createdDate: '2024-01-15T10:00:00Z',
        modifiedBy: 'user2',
        modifiedDate: '2024-01-16T14:30:00Z',
        identifier: 'TC-003',
        type: 'Security Test',
        folderId: 'folder3',
        // Custom fields below
        testLevel: 'Integration',
        complexity: 'Medium',
        reviewDate: '2024-02-01',
        isAutomated: true,
        estimatedTime: 45,
        targetRelease: '2.0'
      };
      
      // Access the private method via type assertion
      const customFields = (provider as any).extractCustomFields(visureObject);
      
      // Verify standard fields are not included
      expect(customFields.id).toBeUndefined();
      expect(customFields.title).toBeUndefined();
      expect(customFields.description).toBeUndefined();
      expect(customFields.status).toBeUndefined();
      expect(customFields.priority).toBeUndefined();
      expect(customFields.createdBy).toBeUndefined();
      
      // Verify custom fields are extracted
      expect(customFields.testLevel).toBe('Integration');
      expect(customFields.complexity).toBe('Medium');
      expect(customFields.reviewDate).toBe('2024-02-01');
      expect(customFields.isAutomated).toBe(true);
      expect(customFields.estimatedTime).toBe(45);
      expect(customFields.targetRelease).toBe('2.0');
      
      // Count the number of custom fields
      expect(Object.keys(customFields).length).toBe(6);
    });
  });
});