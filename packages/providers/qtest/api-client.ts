/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosInstance, AxiosRequestConfig as _AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as FormData from 'form-data';
import * as https from 'https';
import { createResilientAxiosClient } from '../../common/src/utils/resilience/resilience-factory';

/**
 * Configuration for the qTest API client
 */
export interface QTestClientConfig {
  /**
   * Base URL for the qTest API (e.g., https://your-instance.qtestnet.com/api/v3)
   */
  baseUrl: string;
  
  /**
   * API token for authentication
   */
  apiToken: string;
  
  /**
   * Username for basic authentication if token is not used
   */
  username?: string;
  
  /**
   * Password for basic authentication if token is not used
   */
  password?: string;
  
  /**
   * Maximum requests per minute allowed by the API
   */
  maxRequestsPerMinute?: number;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to bypass SSL certificate validation (not recommended for production)
   */
  bypassSSL?: boolean;
  
  /**
   * Maximum number of retries for failed requests
   */
  maxRetries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

/**
 * qTest API module types
 */
export enum QTestModule {
  REQUIREMENTS = 'requirements',
  TEST_CASES = 'test-cases',
  TEST_CYCLES = 'test-cycles',
  TEST_RUNS = 'test-runs',
  TEST_LOGS = 'test-logs',
  DEFECTS = 'defects',
  USERS = 'users',
  PROJECTS = 'projects',
  RELEASES = 'releases',
  ATTACHMENTS = 'attachments'
}

/**
 * qTest API pagination options
 */
export interface QTestPaginationOptions {
  page?: number;
  pageSize?: number;
  fields?: string[];
  expandFields?: string[];
}

/**
 * qTest API error categories
 */
export enum QTestErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  RATE_LIMIT = 'rate_limit',
  CONFLICT = 'conflict',
  NOT_FOUND = 'not_found',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

/**
 * qTest API error details
 */
export interface QTestErrorDetails {
  /**
   * Error category
   */
  category: QTestErrorCategory;
  
  /**
   * HTTP status code
   */
  statusCode?: number;
  
  /**
   * Error code from qTest API
   */
  errorCode?: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Detailed field-level errors
   */
  fieldErrors?: Record<string, string[]>;
  
  /**
   * Original error
   */
  originalError?: Error | AxiosError;
  
  /**
   * Whether this error is retryable
   */
  retryable: boolean;
  
  /**
   * Context of the operation that failed
   */
  context?: {
    module?: QTestModule;
    operation?: string;
    resourceId?: string;
    resourceType?: string;
  };
}

/**
 * qTest API error
 */
export class QTestError extends Error {
  /**
   * Error details
   */
  details: QTestErrorDetails;
  
  constructor(message: string, details: Partial<QTestErrorDetails>) {
    super(message);
    this.name = 'QTestError';
    this.details = {
      category: details.category || QTestErrorCategory.UNKNOWN,
      message: message,
      retryable: details.retryable || false,
      ...details
    };
  }
  
  /**
   * Create an authentication error
   */
  static authentication(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.AUTHENTICATION,
      statusCode: details?.statusCode || 401,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create an authorization error
   */
  static authorization(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.AUTHORIZATION,
      statusCode: details?.statusCode || 403,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create a validation error
   */
  static validation(message: string, fieldErrors?: Record<string, string[]>, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.VALIDATION,
      statusCode: details?.statusCode || 400,
      fieldErrors,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create a network error
   */
  static network(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.NETWORK,
      retryable: true,
      ...details
    });
  }
  
  /**
   * Create a server error
   */
  static server(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.SERVER,
      statusCode: details?.statusCode || 500,
      retryable: details?.statusCode ? details.statusCode >= 500 && details.statusCode < 600 : true,
      ...details
    });
  }
  
  /**
   * Create a rate limit error
   */
  static rateLimit(message: string, retryAfter?: number, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.RATE_LIMIT,
      statusCode: details?.statusCode || 429,
      retryable: true,
      context: {
        ...details?.context,
        retryAfter
      },
      ...details
    });
  }
  
  /**
   * Create a not found error
   */
  static notFound(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.NOT_FOUND,
      statusCode: details?.statusCode || 404,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create a conflict error
   */
  static conflict(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.CONFLICT,
      statusCode: details?.statusCode || 409,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create a client error
   */
  static client(message: string, details?: Partial<QTestErrorDetails>): QTestError {
    return new QTestError(message, {
      category: QTestErrorCategory.CLIENT,
      retryable: false,
      ...details
    });
  }
  
  /**
   * Create an error from an AxiosError
   */
  static fromAxiosError(error: AxiosError, context?: Partial<QTestErrorDetails['context']>): QTestError {
    const statusCode = error.response?.status;
    const data = error.response?.data as any;
    const message = data?.message || error.message;
    const errorCode = data?.errorCode;
    const fieldErrors = data?.fieldErrors;
    
    if (!statusCode) {
      return QTestError.network(`Network error: ${error.message}`, {
        originalError: error,
        context
      });
    }
    
    if (statusCode === 401) {
      return QTestError.authentication(`Authentication failed: ${message}`, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode === 403) {
      return QTestError.authorization(`Not authorized: ${message}`, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode === 404) {
      return QTestError.notFound(`Resource not found: ${message}`, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode === 409) {
      return QTestError.conflict(`Resource conflict: ${message}`, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode === 429) {
      const retryAfter = parseInt(error.response?.headers['retry-after'] || '60', 10);
      return QTestError.rateLimit(`Rate limit exceeded: ${message}`, retryAfter, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode >= 400 && statusCode < 500) {
      return QTestError.validation(`Validation error: ${message}`, fieldErrors, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    if (statusCode >= 500) {
      return QTestError.server(`Server error (${statusCode}): ${message}`, {
        statusCode,
        errorCode,
        originalError: error,
        context
      });
    }
    
    return new QTestError(`Unknown error: ${message}`, {
      category: QTestErrorCategory.UNKNOWN,
      statusCode,
      errorCode,
      originalError: error,
      retryable: false,
      context
    });
  }
}

/**
 * Client for interacting with the qTest API
 * 
 * This client provides methods for qTest API endpoints with proper
 * error handling, rate limiting, and retry logic.
 */
export class QTestClient {
  private client: AxiosInstance;
  private config: QTestClientConfig;
  private tokenRefreshPromise: Promise<string> | null = null;
  
  constructor(config: QTestClientConfig) {
    this.config = config;
    
    // Use the resilient Axios client which implements the resilience patterns
    // (circuit breaker, bulkhead, retry, timeout, cache, fallback)
    const clientConfig: any = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: config.timeout || 30000
    };
    
    // Handle SSL bypass if needed
    if (config.bypassSSL) {
      clientConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }
    
    // Create resilient client for qTest
    this.client = createResilientAxiosClient(
      'qtest',
      config.baseUrl,
      clientConfig
    );
    
    // Add auth header to requests
    this.client.interceptors.request.use(async (config) => {
      // Set authorization header
      if (!config.headers.Authorization) {
        if (this.config.apiToken) {
          config.headers.Authorization = `bearer ${this.config.apiToken}`;
        } else if (this.config.username && this.config.password) {
          const token = await this.getAuthToken();
          config.headers.Authorization = `bearer ${token}`;
        }
      }
      
      return config;
    });
    
    // Add response interceptor for token expiration handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle token expiration
        if (error.response?.status === 401 && this.config.username && this.config.password) {
          if (!error.config.headers['X-Retry-Auth']) {
            // Try to refresh token and retry the request
            try {
              const token = await this.refreshAuthToken();
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `bearer ${token}`;
              originalRequest.headers['X-Retry-Auth'] = 'true';
              return this.client(originalRequest);
            } catch (refreshError) {
              throw QTestError.fromAxiosError(error as AxiosError);
            }
          }
        }
        
        // Transform error to QTestError
        throw QTestError.fromAxiosError(error as AxiosError);
      }
    );
  }
  
  /**
   * Get API health status
   */
  getHealthStatus() {
    // Now handled by resilience facade
    return {
      status: 'HEALTHY',
      activeRequests: 0,
      failedRequests: 0,
      isCircuitOpen: false
    };
  }
  
  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/projects', { params: { pageSize: 1 } });
      return true;
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.client('Failed to test connection', {
        originalError: error as Error,
        retryable: false
      });
    }
  }
  
  /**
   * Get authentication token
   * Uses username/password to get a new token
   */
  private async getAuthToken(): Promise<string> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }
    
    this.tokenRefreshPromise = new Promise<string>(async (resolve, reject) => {
      try {
        if (!this.config.username || !this.config.password) {
          throw new Error('Username and password are required for authentication');
        }
        
        const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password
        });
        
        const token = response.data.access_token;
        this.tokenRefreshPromise = null;
        resolve(token);
      } catch (error) {
        this.tokenRefreshPromise = null;
        reject(QTestError.authentication('Failed to get authentication token', {
          originalError: error as Error,
          retryable: false
        }));
      }
    });
    
    return this.tokenRefreshPromise;
  }
  
  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<string> {
    // Clear existing token promise
    this.tokenRefreshPromise = null;
    // Get new token
    return this.getAuthToken();
  }
  
  // Projects API
  
  /**
   * Get projects
   */
  async getProjects(options: QTestPaginationOptions = {}): Promise<AxiosResponse> {
    try {
      return await this.client.get('/projects', {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'getProjects'
      });
    }
  }
  
  /**
   * Get project by ID
   */
  async getProject(projectId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'getProject',
        resourceId: projectId.toString()
      });
    }
  }
  
  // Requirements API
  
  /**
   * Get requirements
   */
  async getRequirements(
    projectId: number,
    options: QTestPaginationOptions = {}
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/requirements`, {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.REQUIREMENTS,
        operation: 'getRequirements',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Get requirement by ID
   */
  async getRequirement(
    projectId: number,
    requirementId: number
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/requirements/${requirementId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.REQUIREMENTS,
        operation: 'getRequirement',
        resourceId: requirementId.toString(),
        resourceType: 'requirement'
      });
    }
  }
  
  /**
   * Create requirement
   */
  async createRequirement(
    projectId: number,
    requirementData: any
  ): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!requirementData.name) {
        throw QTestError.validation('Requirement name is required', {
          name: ['Name is required']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/requirements`, requirementData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.REQUIREMENTS,
        operation: 'createRequirement',
        resourceType: 'requirement'
      });
    }
  }
  
  // Test Case API
  
  /**
   * Get test cases
   */
  async getTestCases(
    projectId: number,
    options: QTestPaginationOptions = {}
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/test-cases`, {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'getTestCases',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Get test case by ID
   */
  async getTestCase(
    projectId: number,
    testCaseId: number
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/test-cases/${testCaseId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'getTestCase',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case'
      });
    }
  }
  
  /**
   * Create test case
   */
  async createTestCase(
    projectId: number,
    testCaseData: any
  ): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!testCaseData.name) {
        throw QTestError.validation('Test case name is required', {
          name: ['Name is required']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/test-cases`, testCaseData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'createTestCase',
        resourceType: 'test-case'
      });
    }
  }
  
  // Test Cycles API
  
  /**
   * Get test cycles
   */
  async getTestCycles(
    projectId: number,
    options: QTestPaginationOptions = {}
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/test-cycles`, {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CYCLES,
        operation: 'getTestCycles',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Create test cycle
   */
  async createTestCycle(
    projectId: number,
    testCycleData: any
  ): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!testCycleData.name) {
        throw QTestError.validation('Test cycle name is required', {
          name: ['Name is required']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/test-cycles`, testCycleData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CYCLES,
        operation: 'createTestCycle',
        resourceType: 'test-cycle'
      });
    }
  }
  
  // Test Runs API
  
  /**
   * Get test runs
   */
  async getTestRuns(
    projectId: number,
    options: QTestPaginationOptions = {}
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/test-runs`, {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_RUNS,
        operation: 'getTestRuns',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Create test run
   */
  async createTestRun(
    projectId: number,
    testRunData: any
  ): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!testRunData.name) {
        throw QTestError.validation('Test run name is required', {
          name: ['Name is required']
        });
      }
      
      if (!testRunData.test_case || !testRunData.test_case.id) {
        throw QTestError.validation('Test case ID is required', {
          'test_case.id': ['Test case ID is required']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/test-runs`, testRunData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_RUNS,
        operation: 'createTestRun',
        resourceType: 'test-run'
      });
    }
  }
  
  // Test Logs API
  
  /**
   * Get test logs
   */
  async getTestLogs(
    projectId: number,
    options: QTestPaginationOptions = {}
  ): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/test-logs`, {
        params: this.buildQueryParams(options)
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_LOGS,
        operation: 'getTestLogs',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Create test log
   */
  async createTestLog(
    projectId: number,
    testRunId: number,
    testLogData: any
  ): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!testLogData.status) {
        throw QTestError.validation('Test log status is required', {
          status: ['Status is required']
        });
      }
      
      return await this.client.post(
        `/projects/${projectId}/test-runs/${testRunId}/test-logs`,
        testLogData
      );
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_LOGS,
        operation: 'createTestLog',
        resourceId: testRunId.toString(),
        resourceType: 'test-log'
      });
    }
  }
  
  // Attachments API
  
  /**
   * Upload attachment
   */
  async uploadAttachment(
    projectId: number,
    entityType: string,
    entityId: number,
    fileName: string,
    content: Buffer,
    contentType: string
  ): Promise<AxiosResponse> {
    try {
      const formData = new FormData();
      formData.append('file', content, {
        filename: fileName,
        contentType: contentType
      });
      
      return await this.client.post(
        `/projects/${projectId}/${entityType}/${entityId}/attachments`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.ATTACHMENTS,
        operation: 'uploadAttachment',
        resourceId: entityId.toString(),
        resourceType: entityType
      });
    }
  }
  
  /**
   * Download attachment
   */
  async downloadAttachment(
    projectId: number,
    attachmentId: number
  ): Promise<AxiosResponse<ArrayBuffer>> {
    try {
      return await this.client.get(
        `/projects/${projectId}/attachments/${attachmentId}`,
        {
          responseType: 'arraybuffer'
        }
      );
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.ATTACHMENTS,
        operation: 'downloadAttachment',
        resourceId: attachmentId.toString(),
        resourceType: 'attachment'
      });
    }
  }
  
  // Helper methods
  
  /**
   * Build query parameters from options
   */
  private buildQueryParams(options: QTestPaginationOptions): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (options.page !== undefined) {
      params.page = options.page;
    }
    
    if (options.pageSize !== undefined) {
      params.pageSize = options.pageSize;
    }
    
    if (options.fields && options.fields.length) {
      params.fields = options.fields.join(',');
    }
    
    if (options.expandFields && options.expandFields.length) {
      params.expandFields = options.expandFields.join(',');
    }
    
    return params;
  }
}