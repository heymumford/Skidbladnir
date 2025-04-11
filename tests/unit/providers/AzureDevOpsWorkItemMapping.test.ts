/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Azure DevOps Work Item Mapping Tests
 * 
 * Tests for the Azure DevOps provider's work item field mapping functionality
 */

import axios from 'axios';
import { 
  AzureDevOpsProvider, 
  AzureDevOpsClient, 
  createAzureDevOpsProvider, 
  AzureDevOpsProviderConfig,
  WorkItemType
} from '../../../packages/providers/azure-devops';

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

describe('Azure DevOps Work Item Mapping', () => {
  let provider: AzureDevOpsProvider;
  const mockConfig: AzureDevOpsProviderConfig = {
    organization: 'myorg',
    project: 'myproject',
    personalAccessToken: 'fake-pat-token',
    metadata: {
      defaultAreaPath: 'myproject\\MyArea',
      defaultIterationPath: 'myproject\\Iteration 1',
      testCaseFieldMappings: {
        automationStatus: 'Microsoft.VSTS.TCM.AutomationStatus',
        businessValue: 'Microsoft.VSTS.Common.BusinessValue'
      }
    }
  };
  
  // Mock for axios.create
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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
    provider = createAzureDevOpsProvider(mockConfig);
    
    // Mock axios interceptors
    mockAxiosInstance.interceptors.request.use.mockImplementation((callback) => {
      // Store the callback
      (mockAxiosInstance as any).requestInterceptor = callback;
    });
    
    mockAxiosInstance.interceptors.response.use.mockImplementation((successCb, errorCb) => {
      // Store the callbacks
      (mockAxiosInstance as any).responseInterceptor = { successCb, errorCb };
    });
  });
  
  describe('Work Item to Test Case Mapping', () => {
    it('should map Azure DevOps work item to canonical test case correctly', async () => {
      // Mock a work item from Azure DevOps
      const adoWorkItem = {
        id: 12345,
        fields: {
          'System.Title': 'Test Login Functionality',
          'System.Description': '<div>Test the user login functionality</div>',
          'System.State': 'Ready',
          'Microsoft.VSTS.Common.Priority': 2,
          'Microsoft.VSTS.TCM.Steps': `
            <steps id="0">
              <step id="1" type="ActionStep">
                <parameterizedString>Navigate to login page</parameterizedString>
                <parameterizedString>Login page is displayed</parameterizedString>
              </step>
              <step id="2" type="ActionStep">
                <parameterizedString>Enter valid credentials</parameterizedString>
                <parameterizedString>User is logged in</parameterizedString>
              </step>
            </steps>
          `,
          'System.Tags': 'login; authentication',
          'System.CreatedDate': '2024-01-15T10:00:00Z',
          'System.ChangedDate': '2024-01-16T14:30:00Z',
          'System.WorkItemType': 'Test Case',
          'System.AreaPath': 'myproject\\Login',
          'System.IterationPath': 'myproject\\Sprint 1',
          'System.AssignedTo': { displayName: 'Jane Doe' },
          'System.CreatedBy': { displayName: 'John Smith' },
          'System.ChangedBy': { displayName: 'Jane Doe' },
          'System.Reason': 'New',
          // Custom fields
          'Microsoft.VSTS.TCM.AutomationStatus': 'Automated',
          'Microsoft.VSTS.Common.BusinessValue': 'High',
          'Custom.TestEnvironment': 'Production'
        },
        // Relations for requirements links
        relations: [
          {
            rel: 'Microsoft.VSTS.Common.TestedBy-Reverse',
            url: 'https://dev.azure.com/myorg/myproject/_apis/wit/workItems/6789'
          },
          {
            rel: 'Microsoft.VSTS.Common.TestedBy-Reverse',
            url: 'https://dev.azure.com/myorg/myproject/_apis/wit/workItems/5678'
          }
        ]
      };

      // Mock getWorkItem API call
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: adoWorkItem
      });
      
      // Get the test case via the provider
      const result = await provider.getTestCase('myproject', '12345');
      
      // Verify standard fields are mapped correctly
      expect(result.id).toBe('12345');
      expect(result.title).toBe('Test Login Functionality');
      expect(result.description).toBe('<div>Test the user login functionality</div>');
      expect(result.status).toBe('READY'); // Mapped to uppercase canonical status
      expect(result.priority).toBe('HIGH'); // Mapped from 2 to HIGH
      
      // Verify steps are mapped and extracted from HTML
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].description).toBe('Navigate to login page');
      expect(result.steps[0].expectedResult).toBe('Login page is displayed');
      expect(result.steps[1].order).toBe(2);
      
      // Verify tags are split correctly
      expect(result.tags).toHaveLength(2);
      expect(result.tags).toContain('login');
      expect(result.tags).toContain('authentication');
      
      // Verify date fields are converted to Date objects
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      
      // Verify Azure DevOps-specific fields are preserved in attributes
      expect(result.attributes.adoId).toBe('12345');
      expect(result.attributes.adoWorkItemType).toBe('Test Case');
      expect(result.attributes.adoAreaPath).toBe('myproject\\Login');
      expect(result.attributes.adoIterationPath).toBe('myproject\\Sprint 1');
      expect(result.attributes.adoAssignedTo).toBe('Jane Doe');
      
      // Verify requirement IDs are extracted from relations
      expect(result.attributes.adoRequirementIds).toHaveLength(2);
      expect(result.attributes.adoRequirementIds).toContain('6789');
      expect(result.attributes.adoRequirementIds).toContain('5678');
      
      // Verify custom fields are mapped correctly
      expect(result.attributes.customFields).toBeDefined();
      // Field is mapped back to canonical key using the mapping
      expect(result.attributes.customFields.automationStatus).toBe('Automated');
      expect(result.attributes.customFields.businessValue).toBe('High');
      // Field without mapping is kept with original key
      expect(result.attributes.customFields['Custom.TestEnvironment']).toBe('Production');
    });
    
    it('should map canonical test case to Azure DevOps work item fields correctly', async () => {
      // Create a canonical test case
      const canonicalTestCase = {
        id: 'tc-new',
        title: 'New Test Case',
        description: '<p>Description for test case</p>',
        status: 'READY',
        priority: 'HIGH',
        steps: [
          { order: 1, description: 'Step 1 action', expectedResult: 'Step 1 expected' },
          { order: 2, description: 'Step 2 action', expectedResult: 'Step 2 expected' }
        ],
        tags: ['regression', 'critical'],
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-16T14:30:00Z'),
        attributes: {
          adoAreaPath: 'myproject\\UI',
          adoIterationPath: 'myproject\\Sprint 2',
          customFields: {
            automationStatus: 'Not Automated',
            businessValue: 'Medium',
            testDataSource: 'Database'
          }
        }
      };
      
      // Mock createWorkItem API call
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 67890,
          fields: {
            'System.Title': 'New Test Case'
          }
        }
      });
      
      // Create the test case via the provider
      await provider.createTestCase('myproject', canonicalTestCase);
      
      // Get the document that was sent to the API
      const callArguments = mockAxiosInstance.post.mock.calls[0];
      const url = callArguments[0];
      const operations = callArguments[1];
      
      // Verify endpoint includes the correct work item type
      expect(url).toMatch(`/myproject/_apis/wit/workitems/$${WorkItemType.TEST_CASE}`);
      
      // Find operation values for each field by their path
      const findOperation = (path: string) => 
        operations.find((op: any) => op.path === `/fields/${path}`)?.value;
      
      // Verify basic fields
      expect(findOperation('System.Title')).toBe('New Test Case');
      expect(findOperation('System.Description')).toBe('<p>Description for test case</p>');
      expect(findOperation('System.State')).toBe('Ready'); // Mapped from READY
      expect(findOperation('Microsoft.VSTS.Common.Priority')).toBe(2); // Mapped from HIGH
      
      // Verify steps were formatted as HTML
      const stepsHtml = findOperation('Microsoft.VSTS.TCM.Steps');
      expect(stepsHtml).toContain('<steps id="0">');
      expect(stepsHtml).toContain('<step id="1" type="ActionStep">');
      expect(stepsHtml).toContain('<parameterizedString>Step 1 action</parameterizedString>');
      expect(stepsHtml).toContain('<parameterizedString>Step 1 expected</parameterizedString>');
      
      // Verify tags were joined
      expect(findOperation('System.Tags')).toBe('regression; critical');
      
      // Verify area and iteration paths
      expect(findOperation('System.AreaPath')).toBe('myproject\\UI');
      expect(findOperation('System.IterationPath')).toBe('myproject\\Sprint 2');
      
      // Verify custom fields are mapped to Azure DevOps field names
      expect(findOperation('Microsoft.VSTS.TCM.AutomationStatus')).toBe('Not Automated');
      expect(findOperation('Microsoft.VSTS.Common.BusinessValue')).toBe('Medium');
      // Fields without mappings are kept as is
      expect(findOperation('testDataSource')).toBe('Database');
    });
    
    it('should map custom fields using field mappings config', async () => {
      // Create a provider with custom field mappings
      const providerWithCustomMappings = createAzureDevOpsProvider({
        ...mockConfig,
        metadata: {
          ...mockConfig.metadata,
          testCaseFieldMappings: {
            testEnvironment: 'Custom.Environment',
            complexity: 'Custom.Complexity',
            testType: 'Custom.TestType'
          }
        }
      });
      
      // Create a canonical test case with custom fields
      const canonicalTestCase = {
        id: 'tc-new',
        title: 'Test Case with Custom Fields',
        description: 'Test case description',
        status: 'DRAFT',
        priority: 'MEDIUM',
        steps: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes: {
          customFields: {
            testEnvironment: 'Production',
            complexity: 'High',
            testType: 'Integration',
            unmappedField: 'Value'
          }
        }
      };
      
      // Mock createWorkItem API call
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 67890,
          fields: {
            'System.Title': 'Test Case with Custom Fields'
          }
        }
      });
      
      // Create the test case via the provider with custom mappings
      await providerWithCustomMappings.createTestCase('myproject', canonicalTestCase);
      
      // Get the document that was sent to the API
      const callArguments = mockAxiosInstance.post.mock.calls[0];
      const operations = callArguments[1];
      
      // Find operation values for each field by their path
      const findOperation = (path: string) => 
        operations.find((op: any) => op.path === `/fields/${path}`)?.value;
      
      // Verify custom fields are mapped according to the config
      expect(findOperation('Custom.Environment')).toBe('Production');
      expect(findOperation('Custom.Complexity')).toBe('High');
      expect(findOperation('Custom.TestType')).toBe('Integration');
      // Unmapped fields should use the original field name
      expect(findOperation('unmappedField')).toBe('Value');
    });
    
    it('should handle missing field values in Azure DevOps work item', async () => {
      // Mock a minimal work item from Azure DevOps
      const minimalWorkItem = {
        id: 56789,
        fields: {
          'System.Title': 'Minimal Test Case',
          // No description, state, priority, steps, etc.
          'System.WorkItemType': 'Test Case',
          'System.CreatedDate': '2024-01-15T10:00:00Z',
          'System.ChangedDate': '2024-01-16T14:30:00Z'
        }
      };
      
      // Mock getWorkItem API call
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: minimalWorkItem
      });
      
      // Get the test case via the provider
      const result = await provider.getTestCase('myproject', '56789');
      
      // Verify default values are applied
      expect(result.id).toBe('56789');
      expect(result.title).toBe('Minimal Test Case');
      expect(result.description).toBe(''); // Empty string for missing description
      expect(result.status).toBe('DRAFT'); // Default status
      expect(result.priority).toBe('MEDIUM'); // Default priority
      expect(result.steps).toEqual([]); // Empty array for missing steps
      expect(result.tags).toEqual([]); // Empty array for missing tags
    });
    
    it('should update test steps correctly in HTML format', async () => {
      // Mock test steps
      const testSteps = [
        { order: 1, description: 'Step 1 action', expectedResult: 'Step 1 expected' },
        { order: 2, description: 'Step 2 action', expectedResult: 'Step 2 expected' }
      ];
      
      // Mock updateWorkItem API call
      mockAxiosInstance.patch.mockResolvedValueOnce({
        data: {
          id: 12345,
          fields: {
            'System.Title': 'Test Case',
            'Microsoft.VSTS.TCM.Steps': '<steps>...</steps>' // Not actually used in test
          }
        }
      });
      
      // Update test steps via the provider
      await provider.createTestSteps('myproject', '12345', testSteps);
      
      // Get the document that was sent to the API
      const callArguments = mockAxiosInstance.patch.mock.calls[0];
      const url = callArguments[0];
      const operations = callArguments[1];
      
      // Verify endpoint includes the correct work item ID
      expect(url).toMatch(`/myproject/_apis/wit/workitems/12345`);
      
      // Find the steps operation
      const stepsOperation = operations.find((op: any) => op.path === '/fields/Microsoft.VSTS.TCM.Steps');
      
      // Verify steps were formatted as HTML
      expect(stepsOperation).toBeDefined();
      expect(stepsOperation.value).toContain('<steps id="0">');
      expect(stepsOperation.value).toContain('<step id="1" type="ActionStep">');
      expect(stepsOperation.value).toContain('<parameterizedString>Step 1 action</parameterizedString>');
      expect(stepsOperation.value).toContain('<parameterizedString>Step 1 expected</parameterizedString>');
      expect(stepsOperation.value).toContain('<step id="2" type="ActionStep">');
      expect(stepsOperation.value).toContain('<parameterizedString>Step 2 action</parameterizedString>');
      expect(stepsOperation.value).toContain('<parameterizedString>Step 2 expected</parameterizedString>');
    });
  });
  
  describe('Status and Priority Mapping', () => {
    it('should map all Azure DevOps work item states to canonical statuses', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Create test cases for each state mapping
      const stateTestCases = [
        { state: 'New', expectedCanonical: 'DRAFT' },
        { state: 'Active', expectedCanonical: 'DRAFT' },
        { state: 'In Progress', expectedCanonical: 'DRAFT' },
        { state: 'Ready', expectedCanonical: 'READY' },
        { state: 'Ready for Review', expectedCanonical: 'READY' },
        { state: 'Approved', expectedCanonical: 'APPROVED' },
        { state: 'Design', expectedCanonical: 'DRAFT' },
        { state: 'Resolved', expectedCanonical: 'APPROVED' },
        { state: 'Proposed', expectedCanonical: 'DRAFT' },
        { state: 'Committed', expectedCanonical: 'APPROVED' },
        { state: 'Closed', expectedCanonical: 'APPROVED' },
        { state: 'Removed', expectedCanonical: 'DEPRECATED' },
        { state: 'Unknown State', expectedCanonical: 'DRAFT' }, // Default fallback
        { state: undefined, expectedCanonical: 'DRAFT' } // Undefined case
      ];
      
      for (const testCase of stateTestCases) {
        const result = provider1.mapWorkItemStateToCanonical(testCase.state);
        expect(result).toBe(testCase.expectedCanonical);
      }
    });
    
    it('should map all canonical statuses to Azure DevOps work item states', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Create test cases for each status mapping
      const statusTestCases = [
        { canonicalStatus: 'DRAFT', expectedState: 'New' },
        { canonicalStatus: 'READY', expectedState: 'Ready' },
        { canonicalStatus: 'APPROVED', expectedState: 'Approved' },
        { canonicalStatus: 'DEPRECATED', expectedState: 'Removed' },
        { canonicalStatus: 'UNKNOWN_STATUS', expectedState: 'New' }, // Default fallback
        { canonicalStatus: undefined, expectedState: 'New' } // Undefined case
      ];
      
      for (const testCase of statusTestCases) {
        const result = provider1.mapCanonicalStatusToWorkItemState(testCase.canonicalStatus);
        expect(result).toBe(testCase.expectedState);
      }
    });
    
    it('should map all Azure DevOps work item priorities to canonical priorities', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Create test cases for each priority mapping
      const priorityTestCases = [
        { priority: 1, expectedCanonical: 'CRITICAL' },
        { priority: 2, expectedCanonical: 'HIGH' },
        { priority: 3, expectedCanonical: 'MEDIUM' },
        { priority: 4, expectedCanonical: 'LOW' },
        { priority: 5, expectedCanonical: 'MEDIUM' }, // Default fallback
        { priority: undefined, expectedCanonical: 'MEDIUM' } // Undefined case
      ];
      
      for (const testCase of priorityTestCases) {
        const result = provider1.mapWorkItemPriorityToCanonical(testCase.priority);
        expect(result).toBe(testCase.expectedCanonical);
      }
    });
    
    it('should map all canonical priorities to Azure DevOps work item priorities', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Create test cases for each priority mapping
      const priorityTestCases = [
        { canonicalPriority: 'CRITICAL', expectedPriority: 1 },
        { canonicalPriority: 'HIGH', expectedPriority: 2 },
        { canonicalPriority: 'MEDIUM', expectedPriority: 3 },
        { canonicalPriority: 'LOW', expectedPriority: 4 },
        { canonicalPriority: 'UNKNOWN_PRIORITY', expectedPriority: 3 }, // Default fallback
        { canonicalPriority: undefined, expectedPriority: 3 } // Undefined case
      ];
      
      for (const testCase of priorityTestCases) {
        const result = provider1.mapCanonicalPriorityToWorkItemPriority(testCase.canonicalPriority);
        expect(result).toBe(testCase.expectedPriority);
      }
    });
  });
  
  describe('Test Steps HTML Handling', () => {
    it('should correctly extract test steps from HTML format', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      const stepsHtml = `
        <steps id="0">
          <step id="1" type="ActionStep">
            <parameterizedString>Navigate to login page</parameterizedString>
            <parameterizedString>Login page is displayed</parameterizedString>
          </step>
          <step id="2" type="ActionStep">
            <parameterizedString>Enter <b>valid</b> credentials</parameterizedString>
            <parameterizedString>User is <i>successfully</i> logged in</parameterizedString>
          </step>
          <step id="3" type="ActionStep">
            <parameterizedString>Click logout</parameterizedString>
            <parameterizedString>User is logged out</parameterizedString>
          </step>
        </steps>
      `;
      
      const steps = provider1.extractTestStepsFromHtml(stepsHtml);
      
      // Verify steps are correctly extracted and HTML tags are removed
      expect(steps).toHaveLength(3);
      
      expect(steps[0].order).toBe(1);
      expect(steps[0].description).toBe('Navigate to login page');
      expect(steps[0].expectedResult).toBe('Login page is displayed');
      
      expect(steps[1].order).toBe(2);
      expect(steps[1].description).toBe('Enter valid credentials');
      expect(steps[1].expectedResult).toBe('User is successfully logged in');
      
      expect(steps[2].order).toBe(3);
      expect(steps[2].description).toBe('Click logout');
      expect(steps[2].expectedResult).toBe('User is logged out');
    });
    
    it('should correctly format test steps as HTML', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      const steps = [
        { order: 1, description: 'Navigate to login page', expectedResult: 'Login page is displayed' },
        { order: 2, description: 'Enter credentials with <special> chars', expectedResult: 'User is logged in' },
        { order: 3, description: 'Click logout', expectedResult: 'User is logged out' }
      ];
      
      const html = provider1.formatTestStepsAsHtml(steps);
      
      // Verify HTML structure
      expect(html).toContain('<steps id="0">');
      
      // Verify step 1
      expect(html).toContain('<step id="1" type="ActionStep">');
      expect(html).toContain('<parameterizedString>Navigate to login page</parameterizedString>');
      expect(html).toContain('<parameterizedString>Login page is displayed</parameterizedString>');
      
      // Verify step 2 with special characters escaped
      expect(html).toContain('<step id="2" type="ActionStep">');
      expect(html).toContain('<parameterizedString>Enter credentials with &lt;special&gt; chars</parameterizedString>');
      expect(html).toContain('<parameterizedString>User is logged in</parameterizedString>');
      
      // Verify step 3
      expect(html).toContain('<step id="3" type="ActionStep">');
      expect(html).toContain('<parameterizedString>Click logout</parameterizedString>');
      expect(html).toContain('<parameterizedString>User is logged out</parameterizedString>');
    });
    
    it('should handle empty steps array when formatting as HTML', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Test with empty array
      const html1 = provider1.formatTestStepsAsHtml([]);
      expect(html1).toBe('');
      
      // Test with null
      const html2 = provider1.formatTestStepsAsHtml(null);
      expect(html2).toBe('');
    });
    
    it('should handle malformed HTML when extracting steps', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Malformed HTML that doesn't match the expected pattern
      const malformedHtml = `
        <steps>
          <step>
            <action>This doesn't follow the expected format</action>
            <expected>No parameterizedString tags</expected>
          </step>
        </steps>
      `;
      
      const steps = provider1.extractTestStepsFromHtml(malformedHtml);
      
      // Should return empty array for malformed HTML
      expect(steps).toEqual([]);
    });
  });
  
  describe('Custom Fields Extraction', () => {
    it('should correctly extract custom fields from work item fields', async () => {
      // Get a reference to the private method
      const provider1 = provider as any;
      
      // Create a test object with standard and custom fields
      const fields = {
        'System.Id': '12345',
        'System.Title': 'Test Case',
        'System.Description': 'Description',
        'System.State': 'Ready',
        'System.WorkItemType': 'Test Case',
        'System.AreaPath': 'Project\\Area',
        'System.IterationPath': 'Project\\Iteration',
        'System.Tags': 'tag1; tag2',
        'System.AssignedTo': { displayName: 'User' },
        'System.CreatedBy': { displayName: 'Creator' },
        'System.CreatedDate': '2023-01-01',
        'System.ChangedBy': { displayName: 'Changer' },
        'System.ChangedDate': '2023-01-02',
        'System.Reason': 'New',
        'Microsoft.VSTS.Common.Priority': 2,
        'Microsoft.VSTS.TCM.Steps': '<steps></steps>',
        // Custom fields below
        'Microsoft.VSTS.TCM.AutomationStatus': 'Automated',
        'Microsoft.VSTS.Common.BusinessValue': 'High',
        'Custom.TestEnvironment': 'Production',
        'Custom.TestLevel': 'Integration',
        'Custom.RiskLevel': 'Medium',
        'CustomField1': 'Value1',
        'CustomField2': 'Value2'
      };
      
      // Test with default mappings
      const customFields1 = provider1.extractCustomFields(fields);
      
      // Verify standard fields are not included
      expect(customFields1['System.Id']).toBeUndefined();
      expect(customFields1['System.Title']).toBeUndefined();
      expect(customFields1['System.Description']).toBeUndefined();
      expect(customFields1['Microsoft.VSTS.TCM.Steps']).toBeUndefined();
      
      // Verify custom fields are extracted
      // Fields with mappings are transformed back to canonical names
      expect(customFields1.automationStatus).toBe('Automated');
      expect(customFields1.businessValue).toBe('High');
      
      // Fields without mappings keep original names
      expect(customFields1['Custom.TestEnvironment']).toBe('Production');
      expect(customFields1['Custom.TestLevel']).toBe('Integration');
      expect(customFields1['Custom.RiskLevel']).toBe('Medium');
      expect(customFields1['CustomField1']).toBe('Value1');
      expect(customFields1['CustomField2']).toBe('Value2');
      
      // Count custom fields
      expect(Object.keys(customFields1).length).toBe(7);
      
      // Test with overridden provider config
      provider1.config = {
        ...mockConfig,
        metadata: {
          ...mockConfig.metadata,
          testCaseFieldMappings: {
            testEnvironment: 'Custom.TestEnvironment',
            testLevel: 'Custom.TestLevel',
            riskLevel: 'Custom.RiskLevel'
          }
        }
      };
      
      const customFields2 = provider1.extractCustomFields(fields);
      
      // Verify fields are mapped according to the updated config
      expect(customFields2.testEnvironment).toBe('Production');
      expect(customFields2.testLevel).toBe('Integration');
      expect(customFields2.riskLevel).toBe('Medium');
      
      // Original automation and business fields aren't mapped anymore
      expect(customFields2['Microsoft.VSTS.TCM.AutomationStatus']).toBe('Automated');
      expect(customFields2['Microsoft.VSTS.Common.BusinessValue']).toBe('High');
    });
  });
});