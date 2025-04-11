/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Azure DevOps Provider
 * 
 * Implements the provider interface for Azure DevOps' test management system
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider, ConnectionStatus, EntityType } from '../../../packages/common/src/interfaces/provider';
import { Project, TestCase, Folder, TestCycle, TestExecution, Attachment } from '../../../packages/common/src/models/entities';
import { AttachmentContent } from '../../../packages/common/src/models/attachment';
import { PaginatedResult } from '../../../packages/common/src/models/paginated';
import { FieldDefinition } from '../../../packages/common/src/models/field-definition';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { defaultLogger as logger } from '../../../packages/common/src/utils/logger';

// Enum for Azure DevOps error categories
export enum AzureDevOpsErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for Azure DevOps specific errors
export class AzureDevOpsError extends Error {
  category: AzureDevOpsErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: AzureDevOpsErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'AzureDevOpsError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static authentication(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.VALIDATION, details);
  }
  
  static rateLimit(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.RATE_LIMIT, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): AzureDevOpsError {
    return new AzureDevOpsError(message, AzureDevOpsErrorCategory.UNKNOWN, details);
  }
}

// Work item type enumeration
export enum WorkItemType {
  TEST_CASE = 'Test Case',
  BUG = 'Bug',
  TASK = 'Task',
  USER_STORY = 'User Story',
  FEATURE = 'Feature',
  EPIC = 'Epic',
  REQUIREMENT = 'Requirement',
  ISSUE = 'Issue'
}

// Test point status enumeration
export enum TestPointStatus {
  READY = 'Ready',
  IN_PROGRESS = 'In Progress',
  BLOCKED = 'Blocked',
  COMPLETED = 'Completed'
}

// Test run status enumeration
export enum TestRunStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ABORTED = 'Aborted',
  NEEDS_INVESTIGATION = 'Needs Investigation'
}

// Test result outcome enumeration
export enum TestOutcome {
  PASSED = 'Passed',
  FAILED = 'Failed',
  BLOCKED = 'Blocked',
  NOT_APPLICABLE = 'Not Applicable',
  PAUSED = 'Paused',
  IN_PROGRESS = 'In Progress',
  NOT_RUN = 'Not Run',
  TIMEOUT = 'Timeout',
  WARNING = 'Warning',
  ERROR = 'Error',
  INCONCLUSIVE = 'Inconclusive'
}

// Configuration interface for Azure DevOps Provider
export interface AzureDevOpsProviderConfig extends ProviderConfig {
  organization: string;
  project: string;
  // Authentication options
  personalAccessToken?: string;
  username?: string;
  password?: string;
  // Connection options
  apiVersion?: string;
  baseUrl?: string;
  proxyUrl?: string;
  connectionTimeout?: number;
  maxRetries?: number;
  // Configuration options
  batchSize?: number;
  concurrentRequests?: number;
  // Additional metadata
  metadata?: {
    defaultAreaPath?: string;
    defaultIterationPath?: string;
    defaultWorkItemType?: string;
    defaultTestPlanId?: number;
    defaultTestSuiteId?: number;
    customFieldMappings?: Record<string, string>;
    testCaseFieldMappings?: Record<string, string>;
    linkTypes?: Record<string, string>;
  };
}

/**
 * Azure DevOps API Client for interacting with Azure DevOps REST API
 */
export class AzureDevOpsClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private organization: string;
  private project: string;
  private apiVersion: string;
  private personalAccessToken: string | null = null;
  
  constructor(private config: AzureDevOpsProviderConfig) {
    this.organization = config.organization;
    this.project = config.project;
    this.apiVersion = config.apiVersion || '6.0';
    
    if (config.personalAccessToken) {
      this.personalAccessToken = config.personalAccessToken;
    }
    
    // Set base URL (default to the Azure DevOps public instance)
    this.baseUrl = config.baseUrl || `https://dev.azure.com/${this.organization}`;
    
    // Determine if we should use a proxy
    const useProxy = config.proxyUrl;
    let proxyConfig = undefined;
    
    if (useProxy && config.proxyUrl) {
      try {
        const proxyUrl = new URL(config.proxyUrl);
        proxyConfig = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10) || (proxyUrl.protocol === 'https:' ? 443 : 80),
          protocol: proxyUrl.protocol
        };
        logger.debug('Configured proxy', { proxy: proxyConfig });
      } catch (error) {
        logger.warn('Invalid proxy URL format', { proxyUrl: config.proxyUrl });
      }
    }
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Create axios instance with consistent configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: config.connectionTimeout || 30000,
      headers,
      proxy: proxyConfig
    });
    
    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(async (config) => {
      // Add basic authentication for PAT token
      if (this.personalAccessToken) {
        const token = Buffer.from(`:${this.personalAccessToken}`).toString('base64');
        config.headers['Authorization'] = `Basic ${token}`;
      } else if (this.config.username && this.config.password) {
        const token = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        config.headers['Authorization'] = `Basic ${token}`;
      }
      
      // Add API version to all requests
      if (!config.params) {
        config.params = {};
      }
      config.params['api-version'] = this.apiVersion;
      
      // Log request for debugging (sanitize sensitive information)
      logger.debug('Sending request', { 
        method: config.method, 
        url: config.url,
        params: config.params,
        // Don't log body content to avoid logging sensitive data
        bodySize: config.data ? JSON.stringify(config.data).length : 0
      });
      
      return config;
    });
    
    // Add response interceptor for error handling and logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses
        logger.debug('Received response', {
          status: response.status,
          url: response.config.url,
          size: response.data ? JSON.stringify(response.data).length : 0
        });
        return response;
      },
      (error) => {
        // Handle different error types
        return this.handleApiError(error);
      }
    );
  }
  
  /**
   * Test connection to Azure DevOps
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test connection by getting project information
      await this.getProject(this.project);
      return true;
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    }
  }
  
  /**
   * Get project information
   */
  async getProject(projectName: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/${projectName}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all projects in the organization
   */
  async getProjects(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/_apis/projects`);
      return response.data.value;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get work item by ID
   */
  async getWorkItem(id: string, expand?: string): Promise<any> {
    try {
      const params: Record<string, any> = {};
      if (expand) {
        params.$expand = expand;
      }
      
      const response = await this.axiosInstance.get(
        `/${this.project}/_apis/wit/workitems/${id}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get multiple work items by IDs
   */
  async getWorkItems(ids: string[], expand?: string): Promise<any[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      
      const params: Record<string, any> = {
        ids: ids.join(',')
      };
      
      if (expand) {
        params.$expand = expand;
      }
      
      const response = await this.axiosInstance.get(
        `/${this.project}/_apis/wit/workitems`,
        { params }
      );
      return response.data.value;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new work item
   */
  async createWorkItem(type: string, fields: Record<string, any>): Promise<any> {
    try {
      // Format the document for creating a work item
      const document = this.formatWorkItemDocument(fields);
      
      const response = await this.axiosInstance.post(
        `/${this.project}/_apis/wit/workitems/$${type}`,
        document,
        {
          headers: {
            'Content-Type': 'application/json-patch+json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing work item
   */
  async updateWorkItem(id: string, fields: Record<string, any>): Promise<any> {
    try {
      // Format the document for updating a work item
      const document = this.formatWorkItemDocument(fields);
      
      const response = await this.axiosInstance.patch(
        `/${this.project}/_apis/wit/workitems/${id}`,
        document,
        {
          headers: {
            'Content-Type': 'application/json-patch+json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test plans
   */
  async getTestPlans(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.project}/_apis/test/plans`
      );
      return response.data.value;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test suites for a plan
   */
  async getTestSuites(planId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.project}/_apis/test/Plans/${planId}/suites`
      );
      return response.data.value;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test cases for a suite
   */
  async getTestCases(planId: string, suiteId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.project}/_apis/test/Plans/${planId}/Suites/${suiteId}/TestCase`
      );
      
      // The response contains test point ids, we need to extract the actual work item ids
      const testPoints = response.data.value;
      const workItemIds = testPoints.map((point: any) => point.workItem.id.toString());
      
      // Get the actual test cases if there are any
      if (workItemIds.length > 0) {
        return await this.getWorkItems(workItemIds);
      }
      
      return [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Format work item document for create/update operations
   */
  private formatWorkItemDocument(fields: Record<string, any>): any[] {
    const operations = [];
    
    // Add fields
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        operations.push({
          op: 'add',
          path: `/fields/${key}`,
          value: value
        });
      }
    }
    
    return operations;
  }
  
  /**
   * Handle API errors and convert them to AzureDevOpsError types
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = AzureDevOpsErrorCategory.UNKNOWN;
    let statusCode = 0;
    const details: Record<string, any> = {};
    
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = error.response.status;
        details.data = error.response.data;
        details.headers = error.response.headers;
        
        // Extract error message from response if available
        if (error.response.data) {
          if (error.response.data.message) {
            message = error.response.data.message;
          } else if (error.response.data.error) {
            message = error.response.data.error.message || error.response.data.error;
          }
        } else {
          message = error.message;
        }
        
        // Categorize by status code
        if (statusCode === 401) {
          category = AzureDevOpsErrorCategory.AUTHENTICATION;
          message = 'Authentication failed: ' + message;
        } else if (statusCode === 403) {
          category = AzureDevOpsErrorCategory.AUTHORIZATION;
          message = 'Authorization failed: ' + message;
        } else if (statusCode === 404) {
          category = AzureDevOpsErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
        } else if (statusCode === 400) {
          category = AzureDevOpsErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
        } else if (statusCode === 429) {
          category = AzureDevOpsErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded: ' + message;
        } else if (statusCode >= 500) {
          category = AzureDevOpsErrorCategory.SERVER_ERROR;
          message = 'Server error: ' + message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = AzureDevOpsErrorCategory.NETWORK;
        message = 'Network error: ' + error.message;
        details.request = error.request;
      } else {
        // Something happened in setting up the request
        category = AzureDevOpsErrorCategory.UNKNOWN;
        message = 'Error setting up request: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof AzureDevOpsError) {
      // If it's already an AzureDevOpsError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
    }
    
    // Log the error with appropriate severity
    if (category === AzureDevOpsErrorCategory.NETWORK || category === AzureDevOpsErrorCategory.SERVER_ERROR) {
      logger.error(`Azure DevOps API Error: ${message}`, { category, statusCode, error });
    } else if (category === AzureDevOpsErrorCategory.AUTHENTICATION || category === AzureDevOpsErrorCategory.AUTHORIZATION) {
      logger.warn(`Azure DevOps API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`Azure DevOps API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case AzureDevOpsErrorCategory.AUTHENTICATION:
        throw AzureDevOpsError.authentication(message, details);
      case AzureDevOpsErrorCategory.AUTHORIZATION:
        throw AzureDevOpsError.authorization(message, details);
      case AzureDevOpsErrorCategory.NETWORK:
        throw AzureDevOpsError.network(message, details);
      case AzureDevOpsErrorCategory.RESOURCE_NOT_FOUND:
        throw AzureDevOpsError.resourceNotFound(message, details);
      case AzureDevOpsErrorCategory.VALIDATION:
        throw AzureDevOpsError.validation(message, details);
      case AzureDevOpsErrorCategory.RATE_LIMIT:
        throw AzureDevOpsError.rateLimit(message, details);
      case AzureDevOpsErrorCategory.SERVER_ERROR:
        throw AzureDevOpsError.serverError(message, details);
      default:
        throw AzureDevOpsError.unknown(message, details);
    }
  }
}

/**
 * Azure DevOps Provider implementation
 */
export class AzureDevOpsProvider implements SourceProvider, TargetProvider {
  private id = 'azure-devops';
  private name = 'Azure DevOps';
  private version = '1.0.0';
  private client: AzureDevOpsClient;
  private resilientClient: ResilientApiClient;
  
  constructor(private config: AzureDevOpsProviderConfig) {
    this.client = new AzureDevOpsClient(config);
    
    // Create resilient client for API calls
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl || `https://dev.azure.com/${config.organization}`,
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3
    });
    
    logger.debug('Azure DevOps Provider initialized', { 
      organization: config.organization, 
      project: config.project
    });
  }
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    if (config) {
      // Cast and merge configs
      this.config = { ...this.config, ...config as AzureDevOpsProviderConfig };
      this.client = new AzureDevOpsClient(this.config);
    }
  }
  
  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      logger.debug('Testing connection to Azure DevOps', { 
        organization: this.config.organization,
        project: this.config.project
      });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to Azure DevOps', { 
        organization: this.config.organization,
        project: this.config.project
      });
      
      return {
        connected: result,
        details: {
          organization: this.config.organization,
          project: this.config.project
        }
      };
    } catch (error) {
      logger.error('Failed to connect to Azure DevOps', { 
        error, 
        organization: this.config.organization,
        project: this.config.project
      });
      
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof AzureDevOpsError ? error.category : AzureDevOpsErrorCategory.UNKNOWN,
          organization: this.config.organization,
          project: this.config.project
        }
      };
    }
  }
  
  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      systemName: this.name,
      providerVersion: this.version,
      capabilities: {
        canBeSource: true,
        canBeTarget: true,
        entityTypes: [
          EntityType.PROJECT,
          EntityType.FOLDER,
          EntityType.TEST_CASE,
          EntityType.TEST_STEP,
          EntityType.TEST_CYCLE,
          EntityType.TEST_EXECUTION,
          EntityType.ATTACHMENT,
          EntityType.FIELD_DEFINITION
        ],
        supportsAttachments: true,
        supportsExecutionHistory: true,
        supportsTestSteps: true,
        supportsHierarchy: true,
        supportsCustomFields: true
      }
    };
  }
  
  /**
   * Get provider API contract with operation dependencies
   */
  async getApiContract() {
    return {
      providerId: this.id,
      operations: {
        getProjects: {
          type: 'query',
          dependencies: [],
          required: true,
          description: 'Get all projects',
          requiredParams: []
        },
        getTestPlans: {
          type: 'query',
          dependencies: [],
          required: true,
          description: 'Get all test plans',
          requiredParams: []
        },
        getTestSuites: {
          type: 'query',
          dependencies: ['getTestPlans'],
          required: true,
          description: 'Get test suites for a plan',
          requiredParams: ['planId']
        },
        getTestCases: {
          type: 'query',
          dependencies: ['getTestSuites'],
          required: true,
          description: 'Get test cases for a suite',
          requiredParams: ['planId', 'suiteId']
        },
        getWorkItem: {
          type: 'query',
          dependencies: [],
          required: true,
          description: 'Get a work item by ID',
          requiredParams: ['id']
        },
        createWorkItem: {
          type: 'mutation',
          dependencies: [],
          required: false,
          description: 'Create a new work item',
          requiredParams: ['type', 'fields']
        },
        updateWorkItem: {
          type: 'mutation',
          dependencies: ['getWorkItem'],
          required: false,
          description: 'Update an existing work item',
          requiredParams: ['id', 'fields']
        }
      }
    };
  }
  
  /**
   * Get projects from the source system
   */
  async getProjects(): Promise<Project[]> {
    try {
      logger.debug('Getting projects from Azure DevOps');
      
      const adoProjects = await this.client.getProjects();
      
      // Map to canonical Project model
      const projects = adoProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        sourceProjectId: project.id,
        targetProjectId: project.id,
        attributes: {
          adoId: project.id,
          adoName: project.name,
          adoUrl: project.url,
          adoState: project.state,
          adoRevision: project.revision,
          adoVisibility: project.visibility,
          adoLastUpdateTime: project.lastUpdateTime
        }
      }));
      
      logger.info(`Retrieved ${projects.length} projects from Azure DevOps`);
      
      return projects;
    } catch (error) {
      logger.error('Failed to get projects', { error });
      throw error;
    }
  }
  
  /**
   * Get test folders/hierarchical structure
   * In Azure DevOps, test suites can be used as folders
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      logger.debug('Getting test suites as folders from Azure DevOps');
      
      // Get test plans first
      const testPlans = await this.client.getTestPlans();
      
      // Get test suites for each plan
      const allSuites: any[] = [];
      for (const plan of testPlans) {
        const suites = await this.client.getTestSuites(plan.id);
        allSuites.push(...suites.map(suite => ({ ...suite, planId: plan.id })));
      }
      
      // Map to canonical Folder model
      const folders = allSuites.map(suite => ({
        id: `${suite.planId}-${suite.id}`, // Combine plan and suite ID for uniqueness
        name: suite.name,
        path: suite.path || '',
        parentId: suite.parentSuite ? `${suite.planId}-${suite.parentSuite.id}` : undefined,
        attributes: {
          adoSuiteId: suite.id,
          adoPlanId: suite.planId,
          adoSuiteType: suite.suiteType,
          adoUrl: suite.url
        }
      }));
      
      logger.info(`Retrieved ${folders.length} test suites as folders from Azure DevOps`);
      
      return folders;
    } catch (error) {
      logger.error('Failed to get folders', { error });
      throw error;
    }
  }
  
  /**
   * Get test cases
   */
  async getTestCases(projectId: string, options?: any): Promise<PaginatedResult<TestCase>> {
    try {
      logger.debug('Getting test cases from Azure DevOps', { projectId });
      
      // Extract planId and suiteId from options or use defaults
      const planId = options?.planId || this.config.metadata?.defaultTestPlanId;
      const suiteId = options?.suiteId || this.config.metadata?.defaultTestSuiteId;
      
      if (!planId || !suiteId) {
        logger.warn('No test plan or suite specified, and no defaults configured');
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
          nextPage: null
        };
      }
      
      // Get test cases from Azure DevOps
      const adoTestCases = await this.client.getTestCases(planId.toString(), suiteId.toString());
      
      // Map to canonical TestCase model
      const testCases = await Promise.all(adoTestCases.map(async (tc) => {
        return this.mapWorkItemToTestCase(tc);
      }));
      
      logger.info(`Retrieved ${testCases.length} test cases from Azure DevOps`, { 
        projectId,
        planId,
        suiteId
      });
      
      // Return as paginated result
      return {
        items: testCases,
        totalCount: testCases.length,
        hasMore: false,
        nextPage: null
      };
    } catch (error) {
      logger.error('Failed to get test cases', { projectId, error });
      throw error;
    }
  }
  
  /**
   * Get a single test case with details
   */
  async getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    try {
      logger.debug('Getting test case from Azure DevOps', { projectId, testCaseId });
      
      // Get work item with relations to get full test case details
      const workItem = await this.client.getWorkItem(testCaseId, 'relations');
      
      // Map to canonical TestCase model
      const testCase = this.mapWorkItemToTestCase(workItem);
      
      logger.info('Retrieved test case from Azure DevOps', { 
        projectId,
        testCaseId,
        title: testCase.title
      });
      
      return testCase;
    } catch (error) {
      logger.error('Failed to get test case', { projectId, testCaseId, error });
      throw error;
    }
  }
  
  /**
   * Get test cycles
   */
  async getTestCycles(projectId: string, options?: any): Promise<PaginatedResult<TestCycle>> {
    // Test plans in Azure DevOps can be considered test cycles
    try {
      logger.debug('Getting test plans as test cycles from Azure DevOps');
      
      const testPlans = await this.client.getTestPlans();
      
      // Map to canonical TestCycle model
      const testCycles = testPlans.map(plan => ({
        id: plan.id.toString(),
        name: plan.name,
        description: plan.description || '',
        startDate: plan.startDate ? new Date(plan.startDate) : new Date(),
        endDate: plan.endDate ? new Date(plan.endDate) : new Date(),
        status: this.mapPlanStatusToCanonical(plan.state),
        attributes: {
          adoPlanId: plan.id,
          adoUrl: plan.url,
          adoArea: plan.area,
          adoIteration: plan.iteration
        }
      }));
      
      logger.info(`Retrieved ${testCycles.length} test plans as test cycles from Azure DevOps`);
      
      return {
        items: testCycles,
        totalCount: testCycles.length,
        hasMore: false,
        nextPage: null
      };
    } catch (error) {
      logger.error('Failed to get test cycles', { projectId, error });
      throw error;
    }
  }
  
  /**
   * Get test executions
   */
  async getTestExecutions(projectId: string, testCycleId: string, options?: any): Promise<PaginatedResult<TestExecution>> {
    // Placeholder for test executions
    // Azure DevOps has test runs that would need to be fetched
    return {
      items: [],
      totalCount: 0,
      hasMore: false,
      nextPage: null
    };
  }
  
  /**
   * Get attachment content
   */
  async getAttachmentContent(projectId: string, attachmentId: string): Promise<AttachmentContent> {
    // Placeholder for attachment content
    throw new Error('Get attachment content not implemented for Azure DevOps provider');
  }
  
  /**
   * Get field definitions (including custom fields)
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    // Placeholder for field definitions
    return [];
  }
  
  /**
   * Create or update a folder structure
   */
  async createFolder(projectId: string, folder: Folder): Promise<string> {
    // Placeholder for folder creation
    throw new Error('Folder creation not implemented for Azure DevOps provider');
  }
  
  /**
   * Create or update a test case
   */
  async createTestCase(projectId: string, testCase: TestCase): Promise<string> {
    try {
      logger.debug('Creating test case in Azure DevOps', { 
        projectId,
        title: testCase.title
      });
      
      // Map canonical model to Azure DevOps fields
      const fields = this.mapTestCaseToWorkItemFields(testCase);
      
      // Create work item in Azure DevOps
      const workItem = await this.client.createWorkItem(WorkItemType.TEST_CASE, fields);
      
      logger.info('Test case created successfully', { 
        projectId,
        workItemId: workItem.id,
        title: workItem.fields['System.Title']
      });
      
      return workItem.id.toString();
    } catch (error) {
      logger.error('Failed to create test case', { 
        projectId,
        title: testCase.title,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create or update test steps
   */
  async createTestSteps(projectId: string, testCaseId: string, steps: any[]): Promise<void> {
    try {
      logger.debug('Updating test steps in Azure DevOps', { 
        projectId,
        testCaseId,
        stepCount: steps.length
      });
      
      // Format steps in Azure DevOps format (HTML)
      const stepsHtml = this.formatTestStepsAsHtml(steps);
      
      // Update the work item with the steps
      await this.client.updateWorkItem(testCaseId, {
        'Microsoft.VSTS.TCM.Steps': stepsHtml
      });
      
      logger.info('Test steps updated successfully', { 
        projectId,
        testCaseId,
        stepCount: steps.length
      });
    } catch (error) {
      logger.error('Failed to update test steps', { 
        projectId,
        testCaseId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create or update a test cycle
   */
  async createTestCycle(projectId: string, testCycle: TestCycle): Promise<string> {
    // Placeholder for test cycle creation
    throw new Error('Test cycle creation not implemented for Azure DevOps provider');
  }
  
  /**
   * Create or update test executions
   */
  async createTestExecutions(projectId: string, testCycleId: string, executions: TestExecution[]): Promise<void> {
    // Placeholder for test execution creation
    throw new Error('Test execution creation not implemented for Azure DevOps provider');
  }
  
  /**
   * Upload an attachment
   */
  async uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: AttachmentContent): Promise<string> {
    // Placeholder for attachment upload
    throw new Error('Attachment upload not implemented for Azure DevOps provider');
  }
  
  /**
   * Map Azure DevOps work item to canonical test case
   */
  private mapWorkItemToTestCase(workItem: any): TestCase {
    // Extract fields from the work item
    const fields = workItem.fields || {};
    const workItemId = workItem.id.toString();
    
    // Extract test steps from the HTML format
    const stepsHtml = fields['Microsoft.VSTS.TCM.Steps'];
    const steps = this.extractTestStepsFromHtml(stepsHtml);
    
    // Extract relationships (requirements, bugs, etc.)
    const relations = workItem.relations || [];
    const requirements = relations
      .filter((rel: any) => rel.rel === 'Microsoft.VSTS.Common.TestedBy-Reverse')
      .map((rel: any) => {
        // Extract the work item ID from the URL
        const urlParts = rel.url.split('/');
        return urlParts[urlParts.length - 1];
      });
    
    // Map to canonical TestCase model
    return {
      id: workItemId,
      title: fields['System.Title'] || '',
      description: fields['System.Description'] || '',
      status: this.mapWorkItemStateToCanonical(fields['System.State']),
      priority: this.mapWorkItemPriorityToCanonical(fields['Microsoft.VSTS.Common.Priority']),
      steps,
      tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map((tag: string) => tag.trim()) : [],
      createdAt: fields['System.CreatedDate'] ? new Date(fields['System.CreatedDate']) : new Date(),
      updatedAt: fields['System.ChangedDate'] ? new Date(fields['System.ChangedDate']) : new Date(),
      attributes: {
        adoId: workItemId,
        adoWorkItemType: fields['System.WorkItemType'],
        adoAreaPath: fields['System.AreaPath'],
        adoIterationPath: fields['System.IterationPath'],
        adoAssignedTo: fields['System.AssignedTo']?.displayName,
        adoCreatedBy: fields['System.CreatedBy']?.displayName,
        adoChangedBy: fields['System.ChangedBy']?.displayName,
        adoReason: fields['System.Reason'],
        adoRequirementIds: requirements,
        customFields: this.extractCustomFields(fields)
      }
    };
  }
  
  /**
   * Map canonical test case to Azure DevOps work item fields
   */
  private mapTestCaseToWorkItemFields(testCase: TestCase): Record<string, any> {
    // Map steps to HTML format
    const stepsHtml = this.formatTestStepsAsHtml(testCase.steps);
    
    // Format tags as semicolon-separated string
    const tags = testCase.tags?.length ? testCase.tags.join('; ') : '';
    
    // Map standard fields
    const fields: Record<string, any> = {
      'System.Title': testCase.title,
      'System.Description': testCase.description,
      'System.State': this.mapCanonicalStatusToWorkItemState(testCase.status),
      'Microsoft.VSTS.Common.Priority': this.mapCanonicalPriorityToWorkItemPriority(testCase.priority),
      'Microsoft.VSTS.TCM.Steps': stepsHtml,
      'System.Tags': tags
    };
    
    // Add custom fields from attributes if available
    if (testCase.attributes?.customFields) {
      // Use field mappings from config if available
      const fieldMappings = this.config.metadata?.testCaseFieldMappings || {};
      
      for (const [key, value] of Object.entries(testCase.attributes.customFields)) {
        // Map field name using mappings or use the key directly
        const fieldName = fieldMappings[key] || key;
        fields[fieldName] = value;
      }
    }
    
    // Add area path and iteration path if available
    if (this.config.metadata?.defaultAreaPath) {
      fields['System.AreaPath'] = testCase.attributes?.adoAreaPath || this.config.metadata.defaultAreaPath;
    }
    
    if (this.config.metadata?.defaultIterationPath) {
      fields['System.IterationPath'] = testCase.attributes?.adoIterationPath || this.config.metadata.defaultIterationPath;
    }
    
    return fields;
  }
  
  /**
   * Extract test steps from HTML format
   */
  private extractTestStepsFromHtml(stepsHtml?: string): any[] {
    if (!stepsHtml) {
      return [];
    }
    
    try {
      // Very simple parser for Azure DevOps test steps HTML format
      // In a real implementation, you would use a proper HTML parser
      
      // The format is typically:
      // <steps id="0">
      //   <step id="1" type="ActionStep">
      //     <parameterizedString>Action 1</parameterizedString>
      //     <parameterizedString>Expected Result 1</parameterizedString>
      //   </step>
      //   ... more steps ...
      // </steps>
      
      const steps: any[] = [];
      const stepRegex = /<step id="(\d+)"[^>]*>.*?<parameterizedString>(.*?)<\/parameterizedString>.*?<parameterizedString>(.*?)<\/parameterizedString>.*?<\/step>/gs;
      
      let match;
      while ((match = stepRegex.exec(stepsHtml)) !== null) {
        steps.push({
          order: parseInt(match[1], 10),
          description: this.stripHtmlTags(match[2]) || '',
          expectedResult: this.stripHtmlTags(match[3]) || ''
        });
      }
      
      return steps;
    } catch (error) {
      logger.warn('Failed to parse test steps HTML', { error });
      return [];
    }
  }
  
  /**
   * Format test steps as HTML for Azure DevOps
   */
  private formatTestStepsAsHtml(steps: any[]): string {
    if (!steps || steps.length === 0) {
      return '';
    }
    
    try {
      // Generate HTML for test steps
      let stepsHtml = '<steps id="0">\n';
      
      steps.forEach((step, index) => {
        const stepId = index + 1;
        const action = this.escapeHtml(step.description || step.action || '');
        const expected = this.escapeHtml(step.expectedResult || step.expected || '');
        
        stepsHtml += `  <step id="${stepId}" type="ActionStep">\n`;
        stepsHtml += `    <parameterizedString>${action}</parameterizedString>\n`;
        stepsHtml += `    <parameterizedString>${expected}</parameterizedString>\n`;
        stepsHtml += `  </step>\n`;
      });
      
      stepsHtml += '</steps>';
      return stepsHtml;
    } catch (error) {
      logger.warn('Failed to format test steps as HTML', { error });
      return '';
    }
  }
  
  /**
   * Extract custom fields from Azure DevOps work item fields
   */
  private extractCustomFields(fields: Record<string, any>): Record<string, any> {
    // Define standard fields to exclude
    const standardFields = [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.State',
      'System.CreatedDate',
      'System.CreatedBy',
      'System.ChangedDate',
      'System.ChangedBy',
      'System.WorkItemType',
      'System.AreaPath',
      'System.IterationPath',
      'System.Tags',
      'System.AssignedTo',
      'System.Reason',
      'Microsoft.VSTS.Common.Priority',
      'Microsoft.VSTS.TCM.Steps'
    ];
    
    const customFields: Record<string, any> = {};
    
    // Extract fields that are not in the standard fields list
    for (const [key, value] of Object.entries(fields)) {
      if (!standardFields.includes(key)) {
        // Use field mappings from config if available for reverse mapping
        const fieldMappings = this.config.metadata?.testCaseFieldMappings || {};
        const reverseMappings: Record<string, string> = {};
        
        // Create reverse mappings
        for (const [canonicalKey, adoKey] of Object.entries(fieldMappings)) {
          reverseMappings[adoKey] = canonicalKey;
        }
        
        // Use reversed mapping or original key
        const customKey = reverseMappings[key] || key;
        customFields[customKey] = value;
      }
    }
    
    return customFields;
  }
  
  /**
   * Map Azure DevOps work item state to canonical status
   */
  private mapWorkItemStateToCanonical(state?: string): string {
    if (!state) return 'DRAFT';
    
    // Map based on common work item states
    const stateMap: Record<string, string> = {
      'New': 'DRAFT',
      'Active': 'DRAFT',
      'In Progress': 'DRAFT',
      'Ready': 'READY',
      'Ready for Review': 'READY',
      'Approved': 'APPROVED',
      'Design': 'DRAFT',
      'Resolved': 'APPROVED',
      'Proposed': 'DRAFT',
      'Committed': 'APPROVED',
      'Closed': 'APPROVED',
      'Removed': 'DEPRECATED'
    };
    
    return stateMap[state] || 'DRAFT';
  }
  
  /**
   * Map canonical status to Azure DevOps work item state
   */
  private mapCanonicalStatusToWorkItemState(status?: string): string {
    if (!status) return 'New';
    
    // Map based on common work item states
    const statusMap: Record<string, string> = {
      'DRAFT': 'New',
      'READY': 'Ready',
      'APPROVED': 'Approved',
      'DEPRECATED': 'Removed'
    };
    
    return statusMap[status] || 'New';
  }
  
  /**
   * Map Azure DevOps work item priority to canonical priority
   */
  private mapWorkItemPriorityToCanonical(priority?: number): string {
    if (!priority) return 'MEDIUM';
    
    // Map based on Azure DevOps 1-4 priority scale
    const priorityMap: Record<number, string> = {
      1: 'CRITICAL',
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW'
    };
    
    return priorityMap[priority] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to Azure DevOps work item priority
   */
  private mapCanonicalPriorityToWorkItemPriority(priority?: string): number {
    if (!priority) return 3; // Default to Medium (3)
    
    // Map based on Azure DevOps 1-4 priority scale
    const priorityMap: Record<string, number> = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4
    };
    
    return priorityMap[priority] || 3;
  }
  
  /**
   * Map plan status to canonical status
   */
  private mapPlanStatusToCanonical(state?: string): string {
    if (!state) return 'DRAFT';
    
    // Map based on common plan states
    const stateMap: Record<string, string> = {
      'New': 'DRAFT',
      'Active': 'IN_PROGRESS',
      'Completed': 'COMPLETED',
      'InProgress': 'IN_PROGRESS',
      'NotStarted': 'DRAFT',
      'Inactive': 'DEPRECATED'
    };
    
    return stateMap[state] || 'DRAFT';
  }
  
  /**
   * Helper to strip HTML tags
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
  
  /**
   * Helper to escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Factory function to create an instance of the provider
export function createAzureDevOpsProvider(config: AzureDevOpsProviderConfig): AzureDevOpsProvider {
  return new AzureDevOpsProvider(config);
}