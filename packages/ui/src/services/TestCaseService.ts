/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * TestCase structure matching the domain entity
 */
export interface TestCase {
  id: string;
  title: string;
  description?: string;
  platform: string;
  steps?: TestStep[];
  expectedResults?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  status?: string;
  priority?: string;
  automationStatus?: 'automated' | 'manual' | 'planned';
  attachments?: TestCaseAttachment[];
  customFields?: Record<string, any>;
}

/**
 * TestStep represents a single step within a test case
 */
export interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult?: string;
}

/**
 * TestCaseAttachment represents a file attached to a test case
 */
export interface TestCaseAttachment {
  id: string;
  name: string;
  fileType: string;
  size: number;
  url?: string;
}

/**
 * Provider-specific formats for test cases
 */
export interface ProviderFormat {
  id: string;
  name: string;
  structure: any;
  sampleData?: any;
}

/**
 * Service for handling test case operations in the UI
 */
export class TestCaseService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get a test case by ID
   * 
   * @param testCaseId The ID of the test case to retrieve
   * @param providerId Optional provider ID to retrieve provider-specific format
   * @returns A promise that resolves to the test case
   */
  async getTestCase(testCaseId: string, providerId?: string): Promise<TestCase> {
    try {
      const url = providerId 
        ? `${this.apiBaseUrl}/testcases/${testCaseId}?providerId=${providerId}`
        : `${this.apiBaseUrl}/testcases/${testCaseId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get test case: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting test case:', error);
      
      // For development/demo purposes, return mock data
      return this.getMockTestCase(testCaseId, providerId);
    }
  }

  /**
   * Get provider-specific format information for a test case structure
   * 
   * @param providerId The provider ID to get format for
   * @returns A promise that resolves to the provider format information
   */
  async getProviderFormat(providerId: string): Promise<ProviderFormat> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/providers/${providerId}/format`);
      
      if (!response.ok) {
        throw new Error(`Failed to get provider format: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting provider format:', error);
      
      // For development/demo purposes, return mock data
      return this.getMockProviderFormat(providerId);
    }
  }

  /**
   * Compare two test case formats side by side
   * 
   * @param testCaseId The ID of the test case to compare formats for
   * @param sourceProviderId The source provider ID
   * @param targetProviderId The target provider ID
   * @returns A promise that resolves to both formats of the test case
   */
  async compareTestCaseFormats(
    testCaseId: string,
    sourceProviderId: string,
    targetProviderId: string
  ): Promise<{ source: any; target: any }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/testcases/${testCaseId}/compare?sourceProviderId=${sourceProviderId}&targetProviderId=${targetProviderId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to compare test case formats: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error comparing test case formats:', error);
      
      // For development/demo purposes, return mock data
      return {
        source: this.getMockTestCase(testCaseId, sourceProviderId),
        target: this.getMockTestCase(testCaseId, targetProviderId)
      };
    }
  }

  /**
   * For development/demo purposes - returns a mock test case
   */
  private getMockTestCase(testCaseId: string, providerId?: string): TestCase {
    // Mock test case that can be formatted according to providerId
    const baseMockTestCase: TestCase = {
      id: testCaseId || 'TC-123',
      title: 'Login Functionality Test',
      description: 'Verify that users can successfully log in to the application using valid credentials.',
      platform: providerId || 'generic',
      status: 'Active',
      priority: 'High',
      automationStatus: 'manual',
      createdBy: 'jane.doe@example.com',
      createdAt: '2023-04-15T10:30:00Z',
      updatedAt: '2023-05-10T14:45:00Z',
      tags: ['login', 'authentication', 'security'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate to the login page',
          expectedResult: 'The login page is displayed with username and password fields'
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Enter a valid username and password',
          expectedResult: 'The credentials are accepted without validation errors'
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Click the "Login" button',
          expectedResult: 'The user is successfully authenticated and redirected to the dashboard'
        },
        {
          id: 'step-4',
          order: 4,
          description: 'Verify that user-specific data is displayed',
          expectedResult: 'User profile information and personalized content is visible'
        }
      ],
      attachments: [
        {
          id: 'att-1',
          name: 'login_screen.png',
          fileType: 'image/png',
          size: 245000
        },
        {
          id: 'att-2',
          name: 'test_data.xlsx',
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 18500
        }
      ],
      customFields: {
        testType: 'Functional',
        component: 'Authentication',
        estimatedTime: '15m',
        requirements: 'REQ-AUTH-001, REQ-AUTH-002'
      }
    };

    // Customize based on provider
    if (providerId === 'zephyr') {
      return {
        ...baseMockTestCase,
        platform: 'zephyr',
        id: `ZEPHYR-${testCaseId.replace('TC-', '')}`,
        status: 'Draft', // Zephyr-specific status
        priority: 'Medium',
        customFields: {
          ...baseMockTestCase.customFields,
          labels: baseMockTestCase.tags,
          testCaseType: 'Manual',
          component: ['Authentication', 'User Interface'],
          sprint: 'Sprint 5',
          epicLink: 'AUTH-123'
        }
      };
    } else if (providerId === 'qtest') {
      return {
        ...baseMockTestCase,
        platform: 'qtest',
        id: `QTEST-${testCaseId.replace('TC-', '')}`,
        status: 'Ready to Test', // qTest-specific status
        priority: 'High',
        customFields: {
          ...baseMockTestCase.customFields,
          testCaseType: 'Functional Test',
          module: 'Authentication',
          release: 'R2023Q2',
          assignedTo: 'jane.doe@example.com',
          automationStatus: 'Not Automated'
        }
      };
    }

    return baseMockTestCase;
  }

  /**
   * For development/demo purposes - returns a mock provider format
   */
  private getMockProviderFormat(providerId: string): ProviderFormat {
    if (providerId === 'zephyr') {
      return {
        id: 'zephyr',
        name: 'Zephyr Scale',
        structure: {
          key: 'string (ID of the test in Zephyr/Jira)',
          summary: 'string (Title of the test case)',
          description: 'string (Detailed description in Jira markup)',
          status: 'string (Draft, Ready to Test, Approved, Deprecated)',
          priority: 'string (Highest, High, Medium, Low, Lowest)',
          labels: 'array of strings (Tags for categorization)',
          components: 'array of strings (Components the test case belongs to)',
          testType: 'string (Manual, Automated, Exploratory)',
          testSteps: [
            {
              stepNumber: 'number (Position in sequence)',
              description: 'string (Step action description)',
              expectedResult: 'string (Expected outcome of the step)',
              data: 'string (Optional test data for the step)'
            }
          ],
          folder: 'string (Test folder path)',
          projectKey: 'string (Jira project identifier)',
          epicLink: 'string (Associated epic)',
          sprint: 'string (Associated sprint)',
          creationDate: 'date-time (When the test was created)',
          modifiedDate: 'date-time (When the test was last updated)',
          createdBy: 'string (Username who created the test)',
          modifiedBy: 'string (Username who last modified the test)',
          attachments: [
            {
              id: 'string (Unique identifier)',
              name: 'string (File name)',
              contentType: 'string (MIME type)',
              size: 'number (File size in bytes)',
              created: 'date-time (When the attachment was added)'
            }
          ]
        },
        sampleData: {
          key: 'TEST-123',
          summary: 'Verify login with valid credentials',
          description: 'Test case to verify that users can successfully log in using valid credentials.',
          status: 'Ready to Test',
          priority: 'High',
          labels: ['login', 'authentication', 'smoke-test'],
          components: ['Authentication', 'User Interface'],
          testType: 'Manual',
          testSteps: [
            {
              stepNumber: 1,
              description: 'Navigate to login page',
              expectedResult: 'Login form is displayed',
              data: ''
            },
            {
              stepNumber: 2,
              description: 'Enter valid username: {username}',
              expectedResult: 'Username is accepted',
              data: 'username=testuser@example.com'
            },
            {
              stepNumber: 3,
              description: 'Enter valid password: {password}',
              expectedResult: 'Password is masked and accepted',
              data: 'password=********'
            },
            {
              stepNumber: 4,
              description: 'Click Login button',
              expectedResult: 'User is authenticated and redirected to dashboard',
              data: ''
            }
          ],
          folder: '/Regression/Authentication',
          projectKey: 'PROJ',
          epicLink: 'PROJ-456',
          sprint: 'Sprint 5',
          creationDate: '2023-01-15T09:30:45Z',
          modifiedDate: '2023-02-20T14:15:30Z',
          createdBy: 'jsmith',
          modifiedBy: 'jdoe',
          attachments: [
            {
              id: 'att-789',
              name: 'login_screen.png',
              contentType: 'image/png',
              size: 245000,
              created: '2023-01-15T10:15:20Z'
            }
          ]
        }
      };
    } else if (providerId === 'qtest') {
      return {
        id: 'qtest',
        name: 'qTest',
        structure: {
          id: 'number (Internal qTest ID)',
          name: 'string (Test case name/title)',
          description: 'string (Detailed description in HTML)',
          status: {
            id: 'number (Status ID)',
            name: 'string (Status name: Draft, Ready to Test, Approved, Obsolete)'
          },
          priority: {
            id: 'number (Priority ID)',
            name: 'string (Priority name: Critical, High, Medium, Low)'
          },
          properties: [
            {
              field_id: 'number (Custom field ID)',
              field_name: 'string (Custom field name)',
              field_value: 'any (Value of the custom field)'
            }
          ],
          test_steps: [
            {
              id: 'number (Step ID)',
              description: 'string (Step description in HTML)',
              expected_result: 'string (Expected outcome in HTML)',
              order: 'number (Position in sequence)',
              attachments: [
                {
                  id: 'number (Attachment ID)',
                  name: 'string (File name)',
                  content_type: 'string (MIME type)',
                  web_url: 'string (URL to access attachment)'
                }
              ]
            }
          ],
          creator: {
            id: 'number (User ID)',
            name: 'string (User full name)',
            username: 'string (User login name)'
          },
          created_date: 'date-time (Creation timestamp)',
          last_modified_date: 'date-time (Last update timestamp)',
          automation: 'string (None, In Progress, Automated)',
          module: {
            id: 'number (Module ID)',
            name: 'string (Module name)'
          },
          parent_id: 'number (Parent folder ID)',
          attachments: [
            {
              id: 'number (Attachment ID)',
              name: 'string (File name)',
              content_type: 'string (MIME type)',
              web_url: 'string (URL to access attachment)',
              created_date: 'date-time (When attachment was added)'
            }
          ],
          tags: 'array of strings (Keywords for categorization)'
        },
        sampleData: {
          id: 12345,
          name: 'Verify Login with Valid Credentials',
          description: '<p>Test case to verify that users can successfully log in using valid credentials.</p>',
          status: {
            id: 601,
            name: 'Ready to Test'
          },
          priority: {
            id: 252,
            name: 'High'
          },
          properties: [
            {
              field_id: 511,
              field_name: 'Component',
              field_value: 'Authentication'
            },
            {
              field_id: 512,
              field_name: 'Test Type',
              field_value: 'Functional Test'
            }
          ],
          test_steps: [
            {
              id: 78901,
              description: '<p>Navigate to the login page</p>',
              expected_result: '<p>Login form is displayed</p>',
              order: 1,
              attachments: []
            },
            {
              id: 78902,
              description: '<p>Enter valid username: testuser@example.com</p>',
              expected_result: '<p>Username is accepted</p>',
              order: 2,
              attachments: []
            },
            {
              id: 78903,
              description: '<p>Enter valid password: ********</p>',
              expected_result: '<p>Password is masked and accepted</p>',
              order: 3,
              attachments: []
            },
            {
              id: 78904,
              description: '<p>Click Login button</p>',
              expected_result: '<p>User is authenticated and redirected to dashboard</p>',
              order: 4,
              attachments: [
                {
                  id: 45678,
                  name: 'dashboard.png',
                  content_type: 'image/png',
                  web_url: 'https://qtest.example.com/attachments/45678'
                }
              ]
            }
          ],
          creator: {
            id: 121,
            name: 'John Smith',
            username: 'jsmith'
          },
          created_date: '2023-03-10T11:20:30Z',
          last_modified_date: '2023-04-05T09:45:15Z',
          automation: 'None',
          module: {
            id: 987,
            name: 'Authentication'
          },
          parent_id: 654,
          attachments: [
            {
              id: 34567,
              name: 'login_form.png',
              content_type: 'image/png',
              web_url: 'https://qtest.example.com/attachments/34567',
              created_date: '2023-03-10T11:25:45Z'
            }
          ],
          tags: ['login', 'authentication', 'smoke-test']
        }
      };
    }

    // Generic format
    return {
      id: 'generic',
      name: 'Generic Test Case Format',
      structure: {
        id: 'string (Unique identifier)',
        title: 'string (Name of the test case)',
        description: 'string (Detailed description of the test)',
        status: 'string (Current status)',
        priority: 'string (Priority level)',
        steps: [
          {
            id: 'string (Step identifier)',
            order: 'number (Position in sequence)',
            description: 'string (Action to perform)',
            expectedResult: 'string (Expected outcome)'
          }
        ],
        tags: 'array of strings (Keywords for categorization)',
        createdBy: 'string (Author of the test case)',
        createdAt: 'date-time (Creation timestamp)',
        updatedAt: 'date-time (Last modification timestamp)'
      }
    };
  }
}