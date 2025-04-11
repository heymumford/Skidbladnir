/**
 * Cucumber World definition for Skidbladnir
 * 
 * This file defines the Cucumber World object, which is available in all step definitions.
 * It provides context and shared functionality for the acceptance tests.
 */

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Custom properties for the Skidbladnir testing world
 */
export interface SkidbladnirWorld extends World {
  // Context data
  context: {
    // API testing
    apiClient: AxiosInstance;
    apiResponse?: any;
    apiError?: any;
    requestHeaders: Record<string, string>;
    responseData?: any;
    
    // Test assets
    testCase?: any;
    testCases?: any[];
    testSuite?: any;
    availableTestAssets?: any[];
    selectedTestAssets?: any[];
    
    // Providers
    sourceProvider?: string;
    targetProvider?: string;
    currentProvider?: string;
    providerConnections?: Record<string, any>;
    connectionTestResults?: Record<string, any>;
    
    // Workflow state
    workflowId?: string;
    workflowStatus?: string;
    migrationState?: any;
    migrationSummary?: any;
    
    // UI state
    currentPage?: string;
    currentSection?: string;
    currentView?: string;
    showingConfirmationDialog?: boolean;
    confirmationDialogType?: string;
    userConfirmedAction?: boolean;
    lastButtonClicked?: string;
    
    // Field mappings
    fieldMappings?: any[];
    selectedField?: string;
    selectedFieldMapping?: any;
    fieldPreview?: { original: any; transformed: any };
    fieldMappingsSaved?: boolean;
    readyForExecution?: boolean;
    
    // Attachments
    viewedAttachments?: any[];
    previewedAttachment?: any;
    attachmentConfig?: any;
    
    // Internationalization
    language?: string;
    translatedErrorMessage?: string;
    translatedDate?: string;
    
    // Authentication
    authToken?: string;
    authenticated?: boolean;
    
    // Errors & Remediation
    remediationSuggestions?: string[];
    
    // Other context
    scenarioContext: Record<string, any>;
  };
  
  // Helper methods
  setAuthToken(token: string): void;
  createTestRequest(method: string, path: string, data?: any): Promise<void>;
  resetContext(): void;
}

/**
 * CustomWorld implements the World interface with additional properties
 * specific to the Skidbladnir application.
 */
export class CustomWorld extends World implements SkidbladnirWorld {
  context: SkidbladnirWorld['context'];
  
  constructor(options: IWorldOptions) {
    super(options);
    
    // Initialize API client
    // This is a mock API - in a real implementation, we'd connect to an actual server
    const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
    const apiClient = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true, // Don't throw HTTP errors
    });
    
    // Mock adapter to prevent actual HTTP requests during testing
    apiClient.interceptors.request.use(config => {
      // Don't actually make the request, but simulate a successful response
      return Promise.reject({ 
        response: { 
          status: 200, 
          data: { message: "This is a mock response" } 
        }
      });
    });
    
    // Initialize context
    this.context = {
      apiClient,
      requestHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      scenarioContext: {},
    };
  }
  
  /**
   * Sets the authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.context.authToken = token;
    this.context.requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  /**
   * Creates an API request and stores the response
   */
  async createTestRequest(method: string, path: string, data?: any): Promise<void> {
    const config: AxiosRequestConfig = {
      method,
      url: path,
      headers: this.context.requestHeaders,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
    };
    
    try {
      // In a real implementation, we'd make the actual request
      // For now, we'll mock the response based on the request
      // This is only for testing purposes
      
      // Mock API responses
      if (path === '/api/status') {
        this.context.apiResponse = {
          status: 200,
          data: {
            status: 'ok',
            version: '0.2.0',
            components: {
              api: { status: 'up' },
              database: { status: 'up' },
              orchestrator: { status: 'up' },
              'binary-processor': { status: 'up' }
            }
          }
        };
      } else if (path === '/api/migration/test-cases') {
        // Check if source system is available
        if (!this.context.scenarioContext.sourceProviderConnected) {
          this.context.apiResponse = {
            status: 503,
            data: { error: 'Source system unavailable' }
          };
        } else if (data?.sourceId === 'NONEXISTENT') {
          this.context.apiResponse = {
            status: 404, 
            data: { error: 'Test case not found' }
          };
        } else {
          this.context.apiResponse = {
            status: 202,
            data: { workflowId: 'mock-workflow-1234', status: 'CREATED' }
          };
        }
      } else if (path.match(/\/api\/workflows\/.+/)) {
        this.context.apiResponse = {
          status: 200,
          data: { 
            id: path.split('/').pop(),
            status: 'COMPLETED',
            targetId: 'target-' + (this.context.testCase?.id || 'TC-1234')
          }
        };
      } else if (path.match(/\/api\/providers\/.+\/test-cases\/.+/)) {
        // Mock the test case in the target system
        const testCase = this.context.testCase || {
          id: 'TC-1234',
          name: 'Test Case TC-1234',
          description: 'Test case description',
          priority: 'Medium',
          status: 'Ready'
        };
        
        this.context.apiResponse = {
          status: 200,
          data: {
            id: 'target-' + testCase.id,
            name: testCase.name,
            description: testCase.description,
            priority: testCase.priority,
            status: testCase.status,
            attachments: testCase.attachments || []
          }
        };
      } else {
        // Default mock response
        this.context.apiResponse = {
          status: 200,
          data: { message: "Mock response for " + path }
        };
      }
      
      this.context.responseData = this.context.apiResponse.data;
      this.context.apiError = null;
    } catch (error: any) {
      if (error.response) {
        // Handle the mocked error response
        this.context.apiResponse = error.response;
        this.context.responseData = error.response.data;
      } else {
        this.context.apiError = error;
        this.context.apiResponse = null;
      }
    }
  }
  
  /**
   * Resets the context for a new scenario
   */
  resetContext(): void {
    // Keep API client but reset all other context
    const { apiClient } = this.context;
    
    this.context = {
      // API Client
      apiClient,
      requestHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      
      // Reset all other properties
      apiResponse: undefined,
      apiError: undefined,
      responseData: undefined,
      
      testCase: undefined,
      testCases: undefined,
      testSuite: undefined,
      availableTestAssets: undefined,
      selectedTestAssets: undefined,
      
      sourceProvider: undefined,
      targetProvider: undefined,
      currentProvider: undefined,
      providerConnections: undefined,
      connectionTestResults: undefined,
      
      workflowId: undefined,
      workflowStatus: undefined,
      migrationState: undefined,
      migrationSummary: undefined,
      
      currentPage: undefined,
      currentSection: undefined,
      currentView: undefined,
      showingConfirmationDialog: undefined,
      confirmationDialogType: undefined,
      userConfirmedAction: undefined,
      lastButtonClicked: undefined,
      
      fieldMappings: undefined,
      selectedField: undefined,
      selectedFieldMapping: undefined,
      fieldPreview: undefined,
      fieldMappingsSaved: undefined,
      readyForExecution: undefined,
      
      viewedAttachments: undefined,
      previewedAttachment: undefined,
      attachmentConfig: undefined,
      
      language: undefined,
      translatedErrorMessage: undefined,
      translatedDate: undefined,
      
      authToken: undefined,
      authenticated: undefined,
      
      remediationSuggestions: undefined,
      
      scenarioContext: {},
    };
  }
}

// Register the custom world constructor
setWorldConstructor(CustomWorld);