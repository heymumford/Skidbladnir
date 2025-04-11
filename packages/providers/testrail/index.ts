/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * TestRail Provider
 * 
 * Implements the provider interface for TestRail test management system
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider } from '../../../pkg/interfaces/providers';
import { ErrorResponse, ProviderConnectionStatus, TestCase } from '../../../pkg/domain/entities';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { Identifier } from '../../../pkg/domain/value-objects/Identifier';
import * as logger from '../../../internal/typescript/common/logger/LoggerAdapter';

// Enum for TestRail error categories
export enum TestRailErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for TestRail specific errors
export class TestRailError extends Error {
  category: TestRailErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: TestRailErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'TestRailError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static authentication(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.VALIDATION, details);
  }
  
  static rateLimit(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.RATE_LIMIT, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): TestRailError {
    return new TestRailError(message, TestRailErrorCategory.UNKNOWN, details);
  }
}

// Configuration interface for TestRail Provider
export interface TestRailProviderConfig extends ProviderConfig {
  baseUrl: string;
  username: string;
  password?: string;
  apiKey: string;
  projectId?: number;
  suiteId?: number;
  proxyUrl?: string;
  connectionTimeout?: number;
  maxRetries?: number;
  // Additional configuration options
  batchSize?: number; // Number of items to process in batch operations, defaults to 50
  concurrentRequests?: number; // Maximum number of concurrent requests, defaults to 5
  retryDelay?: number; // Delay between retries in milliseconds, defaults to 1000
  metadata?: {
    useProxy?: boolean; // Flag to force proxy usage
    disableSSLVerification?: boolean; // Flag to disable SSL verification (not recommended for production)
    customHeaders?: Record<string, string>; // Custom headers to include with every request
    defaultSectionId?: number; // Default section ID to use when creating new test cases
    defaultTemplateId?: number; // Default template ID to use for new test cases
    defaultPriorityId?: number; // Default priority ID for new test cases
    defaultTypeId?: number; // Default type ID for new test cases
    fieldMappings?: Record<string, string>; // Custom field mappings between canonical and TestRail fields
    customFields?: Record<string, any>; // Default values for custom fields
  };
}

// TestRail API Client for interacting with TestRail API
export class TestRailClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  
  constructor(private config: TestRailProviderConfig) {
    this.baseUrl = config.baseUrl;
    
    // Determine if we should use a proxy
    const useProxy = config.proxyUrl || config.metadata?.useProxy;
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
        logger.warn('Invalid proxy URL format', { proxyUrl: config.proxyUrl, error });
      }
    }
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add any custom headers from metadata
    if (config.metadata?.customHeaders) {
      Object.assign(headers, config.metadata.customHeaders);
      logger.debug('Added custom headers', { headers: Object.keys(config.metadata.customHeaders) });
    }
    
    // Create axios instance with consistent configuration
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl + '/index.php?/api/v2/',
      timeout: config.connectionTimeout || 30000,
      headers,
      proxy: proxyConfig,
      // Add option to disable SSL verification if requested (not recommended for production)
      httpsAgent: config.metadata?.disableSSLVerification ? 
        new (require('https').Agent)({ rejectUnauthorized: false }) : 
        undefined,
      // TestRail API uses basic authentication
      auth: {
        username: config.username,
        password: config.apiKey
      }
    });
    
    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(async (config) => {
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
   * Test connection to the TestRail server
   */
  async testConnection(): Promise<{ connected: boolean }> {
    try {
      // Try to fetch current user to verify API access
      const response = await this.axiosInstance.get('get_current_user');
      
      return { connected: true };
    } catch (error) {
      // Handle connection errors
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all projects
   */
  async getProjects(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('get_projects');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific project
   */
  async getProject(projectId: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`get_project/${projectId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all suites for a project
   */
  async getSuites(projectId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`get_suites/${projectId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all sections for a project and suite
   */
  async getSections(projectId: number, suiteId?: number): Promise<any[]> {
    try {
      let url = `get_sections/${projectId}`;
      if (suiteId) {
        url += `&suite_id=${suiteId}`;
      }
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new section
   */
  async createSection(projectId: number, name: string, suiteId?: number, parentId?: number): Promise<any> {
    try {
      const data: any = {
        name,
        suite_id: suiteId || this.config.suiteId,
        project_id: projectId
      };
      
      if (parentId) {
        data.parent_id = parentId;
      }
      
      const response = await this.axiosInstance.post('add_section', data);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all test cases for a project, suite, and section
   */
  async getTestCases(projectId: number, suiteId: number, sectionId?: number): Promise<any[]> {
    try {
      let url = `get_cases/${projectId}`;
      
      // Add suite ID
      url += `&suite_id=${suiteId}`;
      
      // Add section ID if provided
      if (sectionId) {
        url += `&section_id=${sectionId}`;
      }
      
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific test case
   */
  async getTestCase(caseId: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`get_case/${caseId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(sectionId: number, testCase: any): Promise<any> {
    try {
      const data = {
        section_id: sectionId,
        ...testCase
      };
      
      const response = await this.axiosInstance.post('add_case', data);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(caseId: number, testCase: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`update_case/${caseId}`, testCase);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(caseId: number): Promise<boolean> {
    try {
      await this.axiosInstance.post(`delete_case/${caseId}`);
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all test runs for a project
   */
  async getTestRuns(projectId: number, suiteId?: number): Promise<any[]> {
    try {
      let url = `get_runs/${projectId}`;
      
      if (suiteId) {
        url += `&suite_id=${suiteId}`;
      }
      
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new test run
   */
  async createTestRun(projectId: number, name: string, suiteId: number, includeAll = true, caseIds?: number[]): Promise<any> {
    try {
      const data: any = {
        suite_id: suiteId,
        name,
        include_all: includeAll
      };
      
      if (!includeAll && caseIds) {
        data.case_ids = caseIds;
      }
      
      const response = await this.axiosInstance.post(`add_run/${projectId}`, data);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test results for a test run
   */
  async getTestResults(runId: number, testId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`get_results/${testId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Add a test result
   */
  async addTestResult(testId: number, statusId: number, comment?: string, elapsed?: string, attachments?: any[]): Promise<any> {
    try {
      const data: any = {
        status_id: statusId
      };
      
      if (comment) {
        data.comment = comment;
      }
      
      if (elapsed) {
        data.elapsed = elapsed;
      }
      
      const response = await this.axiosInstance.post(`add_result/${testId}`, data);
      
      // If there are attachments, add them
      if (attachments?.length && response.data?.id) {
        for (const attachment of attachments) {
          await this.addAttachment(response.data.id, attachment.name, attachment.content, attachment.contentType);
        }
      }
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Add an attachment to a test result
   */
  async addAttachment(resultId: number, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      // TestRail API requires multipart/form-data for file uploads
      const formData = new FormData();
      const blob = new Blob([content], { type: contentType });
      formData.append('attachment', blob, filename);
      
      const response = await this.axiosInstance.post(`add_attachment_to_result/${resultId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Handle API errors and convert them to TestRailError types
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = TestRailErrorCategory.UNKNOWN;
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
        message = error.response.data?.error || error.message;
        
        // Categorize by status code
        if (statusCode === 401 || statusCode === 403) {
          if (statusCode === 401) {
            category = TestRailErrorCategory.AUTHENTICATION;
            message = 'Authentication failed: ' + message;
          } else {
            category = TestRailErrorCategory.AUTHORIZATION;
            message = 'Authorization failed: ' + message;
          }
        } else if (statusCode === 404) {
          category = TestRailErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
          
          // Extract URL for more specific error message
          const url = error.config?.url || '';
          if (url.includes('get_case/')) {
            message = `Test case not found: ${url.split('get_case/')[1]}`;
          } else if (url.includes('get_project/')) {
            message = `Project not found: ${url.split('get_project/')[1]}`;
          } else if (url.includes('get_suite/')) {
            message = `Suite not found: ${url.split('get_suite/')[1]}`;
          } else if (url.includes('get_section/')) {
            message = `Section not found: ${url.split('get_section/')[1]}`;
          }
        } else if (statusCode === 400) {
          category = TestRailErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
        } else if (statusCode === 429) {
          category = TestRailErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded: ' + message;
          
          // Extract rate limiting headers if available
          if (error.response.headers['retry-after']) {
            details.retryAfter = error.response.headers['retry-after'];
            message = `Rate limit exceeded. Retry after ${details.retryAfter} seconds`;
          }
        } else if (statusCode >= 500) {
          category = TestRailErrorCategory.SERVER_ERROR;
          
          // Specific messages for common server errors
          if (statusCode === 500) {
            message = 'Internal server error: ' + message;
          } else if (statusCode === 502) {
            message = 'Bad gateway: The TestRail server is unreachable';
          } else if (statusCode === 503) {
            message = 'Service unavailable: The TestRail server is temporarily unavailable';
          } else if (statusCode === 504) {
            message = 'Gateway timeout: The TestRail server took too long to respond';
          } else {
            message = 'Server error: ' + message;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = TestRailErrorCategory.NETWORK;
        
        // Specific network error messages
        if (error.code === 'ECONNREFUSED') {
          message = 'Connection refused: The TestRail server actively refused the connection';
          details.code = 'ECONNREFUSED';
        } else if (error.code === 'ECONNABORTED') {
          message = 'Connection aborted: The request was aborted due to a timeout';
          details.code = 'ECONNABORTED';
          details.timeout = error.config?.timeout;
        } else if (error.code === 'ENOTFOUND') {
          message = `DNS lookup failed: The hostname ${this.config.baseUrl} could not be resolved`;
          details.code = 'ENOTFOUND';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out: The TestRail server took too long to establish a connection';
          details.code = 'ETIMEDOUT';
        } else {
          message = 'Network error: No response received from server';
        }
        
        // Check if proxy is being used
        if (this.config.proxyUrl) {
          details.proxy = true;
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            message = `Proxy connection failed: ${message}`;
          }
        }
        
        details.request = error.request;
      } else {
        // Something happened in setting up the request
        category = TestRailErrorCategory.UNKNOWN;
        message = 'Request setup error: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof TestRailError) {
      // If it's already a TestRailError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
      
      // Try to categorize common error patterns
      if (message.includes('timeout') || message.includes('timed out')) {
        category = TestRailErrorCategory.NETWORK;
        message = 'Connection timed out: ' + message;
      } else if (message.includes('network') || message.includes('connection')) {
        category = TestRailErrorCategory.NETWORK;
        message = 'Network error: ' + message;
      }
    }
    
    // Log the error with appropriate severity
    if (category === TestRailErrorCategory.NETWORK || category === TestRailErrorCategory.SERVER_ERROR) {
      logger.error(`TestRail API Error: ${message}`, { category, statusCode, error });
    } else if (category === TestRailErrorCategory.AUTHENTICATION || category === TestRailErrorCategory.AUTHORIZATION) {
      logger.warn(`TestRail API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`TestRail API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case TestRailErrorCategory.AUTHENTICATION:
        throw TestRailError.authentication(message, details);
      case TestRailErrorCategory.AUTHORIZATION:
        throw TestRailError.authorization(message, details);
      case TestRailErrorCategory.NETWORK:
        throw TestRailError.network(message, details);
      case TestRailErrorCategory.RESOURCE_NOT_FOUND:
        throw TestRailError.resourceNotFound(message, details);
      case TestRailErrorCategory.VALIDATION:
        throw TestRailError.validation(message, details);
      case TestRailErrorCategory.RATE_LIMIT:
        throw TestRailError.rateLimit(message, details);
      case TestRailErrorCategory.SERVER_ERROR:
        throw TestRailError.serverError(message, details);
      default:
        throw TestRailError.unknown(message, details);
    }
  }
}

/**
 * Main TestRail Provider implementation
 */
export class TestRailProvider implements SourceProvider, TargetProvider {
  private client: TestRailClient;
  private resilientClient: ResilientApiClient;
  
  constructor(private config: TestRailProviderConfig) {
    this.client = new TestRailClient(config);
    
    // Create resilient client for API calls
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl,
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3
    });
    
    logger.debug('TestRail Provider initialized', { baseUrl: config.baseUrl, projectId: config.projectId });
  }
  
  /**
   * Get provider name
   */
  getName(): string {
    return 'TestRail';
  }
  
  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<ProviderConnectionStatus> {
    try {
      logger.debug('Testing connection to TestRail', { baseUrl: this.config.baseUrl });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to TestRail', { baseUrl: this.config.baseUrl });
      
      return {
        connected: result.connected,
        provider: this.getName(),
        details: {
          baseUrl: this.config.baseUrl,
          projectId: this.config.projectId
        }
      };
    } catch (error) {
      logger.error('Failed to connect to TestRail', { error, baseUrl: this.config.baseUrl });
      
      return {
        connected: false,
        provider: this.getName(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof TestRailError ? error.category : TestRailErrorCategory.UNKNOWN,
          baseUrl: this.config.baseUrl
        }
      };
    }
  }
  
  /**
   * Get a test case by ID
   */
  async getTestCase(id: string): Promise<TestCase> {
    try {
      logger.debug('Getting test case from TestRail', { id });
      
      // Get the test case from TestRail
      const testRailCase = await this.client.getTestCase(parseInt(id, 10));
      
      // Convert to canonical model
      return this.convertToCanonicalTestCase(testRailCase);
      
    } catch (error) {
      logger.error('Failed to get test case', { id, error });
      throw error;
    }
  }
  
  /**
   * Get test cases, optionally filtered by section
   */
  async getTestCases(sectionId?: string): Promise<TestCase[]> {
    try {
      // Ensure required configuration values are available
      if (!this.config.projectId || !this.config.suiteId) {
        throw TestRailError.validation('Project ID and Suite ID are required to get test cases', {
          projectId: this.config.projectId,
          suiteId: this.config.suiteId
        });
      }
      
      logger.debug('Getting test cases from TestRail', { 
        projectId: this.config.projectId,
        suiteId: this.config.suiteId,
        sectionId
      });
      
      // Get test cases from TestRail
      const testRailCases = await this.client.getTestCases(
        this.config.projectId,
        this.config.suiteId,
        sectionId ? parseInt(sectionId, 10) : undefined
      );
      
      // Convert each to canonical model
      return Promise.all(testRailCases.map(tc => this.convertToCanonicalTestCase(tc)));
      
    } catch (error) {
      logger.error('Failed to get test cases', { 
        projectId: this.config.projectId,
        suiteId: this.config.suiteId,
        sectionId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      // Ensure we have a section ID either from the test case or default config
      const sectionId = testCase.metadata?.sectionId || this.config.metadata?.defaultSectionId;
      
      if (!sectionId) {
        throw TestRailError.validation('Section ID is required to create a test case', {
          testCase: testCase.name
        });
      }
      
      logger.debug('Creating test case in TestRail', { name: testCase.name, sectionId });
      
      // Convert canonical model to TestRail format
      const testRailCase = this.convertFromCanonicalTestCase(testCase);
      
      // Create test case in TestRail
      const createdCase = await this.client.createTestCase(sectionId as number, testRailCase);
      
      logger.info('Test case created successfully', { id: createdCase.id, name: createdCase.title });
      
      // Return the created test case in canonical format
      return this.convertToCanonicalTestCase(createdCase);
      
    } catch (error) {
      logger.error('Failed to create test case', { testCase: testCase.name, error });
      throw error;
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      const id = testCase.id.value;
      logger.debug('Updating test case in TestRail', { id, name: testCase.name });
      
      // Convert canonical model to TestRail format
      const testRailCase = this.convertFromCanonicalTestCase(testCase);
      
      // Update test case in TestRail
      const updatedCase = await this.client.updateTestCase(parseInt(id, 10), testRailCase);
      
      logger.info('Test case updated successfully', { id, name: updatedCase.title });
      
      // Return the updated test case in canonical format
      return this.convertToCanonicalTestCase(updatedCase);
      
    } catch (error) {
      logger.error('Failed to update test case', { id: testCase.id.value, name: testCase.name, error });
      throw error;
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(id: string): Promise<boolean> {
    try {
      logger.debug('Deleting test case from TestRail', { id });
      
      // Delete the test case
      const result = await this.client.deleteTestCase(parseInt(id, 10));
      
      logger.info('Test case deleted successfully', { id });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to delete test case', { id, error });
      throw error;
    }
  }
  
  /**
   * Get projects available in TestRail
   */
  async getProjects(): Promise<any[]> {
    try {
      logger.debug('Getting projects from TestRail');
      
      const projects = await this.client.getProjects();
      
      logger.debug(`Found ${projects.length} projects in TestRail`);
      
      return projects;
      
    } catch (error) {
      logger.error('Failed to get projects', { error });
      throw error;
    }
  }
  
  /**
   * Get suites for a project
   */
  async getSuites(projectId?: number): Promise<any[]> {
    try {
      const pId = projectId || this.config.projectId;
      
      if (!pId) {
        throw TestRailError.validation('Project ID is required to get suites', {});
      }
      
      logger.debug('Getting suites from TestRail', { projectId: pId });
      
      const suites = await this.client.getSuites(pId);
      
      logger.debug(`Found ${suites.length} suites in project ${pId}`);
      
      return suites;
      
    } catch (error) {
      logger.error('Failed to get suites', { 
        projectId: projectId || this.config.projectId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Get sections for a project and suite
   */
  async getSections(projectId?: number, suiteId?: number): Promise<any[]> {
    try {
      const pId = projectId || this.config.projectId;
      const sId = suiteId || this.config.suiteId;
      
      if (!pId) {
        throw TestRailError.validation('Project ID is required to get sections', {});
      }
      
      logger.debug('Getting sections from TestRail', { 
        projectId: pId,
        suiteId: sId
      });
      
      const sections = await this.client.getSections(pId, sId);
      
      logger.debug(`Found ${sections.length} sections in project ${pId}`);
      
      return sections;
      
    } catch (error) {
      logger.error('Failed to get sections', { 
        projectId: projectId || this.config.projectId,
        suiteId: suiteId || this.config.suiteId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create a new section
   */
  async createSection(name: string, projectId?: number, suiteId?: number, parentId?: number): Promise<any> {
    try {
      const pId = projectId || this.config.projectId;
      const sId = suiteId || this.config.suiteId;
      
      if (!pId) {
        throw TestRailError.validation('Project ID is required to create a section', {});
      }
      
      logger.debug('Creating section in TestRail', { 
        name,
        projectId: pId,
        suiteId: sId,
        parentId
      });
      
      const section = await this.client.createSection(pId, name, sId, parentId);
      
      logger.info('Section created successfully', { id: section.id, name: section.name });
      
      return section;
      
    } catch (error) {
      logger.error('Failed to create section', { 
        name,
        projectId: projectId || this.config.projectId,
        suiteId: suiteId || this.config.suiteId,
        parentId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create a test run
   */
  async createTestRun(name: string, includeAll = true, caseIds?: string[]): Promise<any> {
    try {
      if (!this.config.projectId || !this.config.suiteId) {
        throw TestRailError.validation('Project ID and Suite ID are required to create a test run', {
          projectId: this.config.projectId,
          suiteId: this.config.suiteId
        });
      }
      
      logger.debug('Creating test run in TestRail', { 
        name,
        projectId: this.config.projectId,
        suiteId: this.config.suiteId,
        includeAll,
        caseCount: caseIds?.length
      });
      
      const run = await this.client.createTestRun(
        this.config.projectId,
        name,
        this.config.suiteId,
        includeAll,
        caseIds?.map(id => parseInt(id, 10))
      );
      
      logger.info('Test run created successfully', { id: run.id, name: run.name });
      
      return run;
      
    } catch (error) {
      logger.error('Failed to create test run', { 
        name,
        projectId: this.config.projectId,
        suiteId: this.config.suiteId,
        includeAll,
        caseCount: caseIds?.length,
        error
      });
      throw error;
    }
  }
  
  /**
   * Convert TestRail test case to canonical model
   */
  private convertToCanonicalTestCase(testRailCase: any): TestCase {
    // Map steps from custom_steps or custom_steps_separated
    let steps: any[] = [];
    
    if (testRailCase.custom_steps_separated) {
      steps = testRailCase.custom_steps_separated.map((step: any) => ({
        action: step.content || '',
        expected: step.expected || ''
      }));
    } else if (testRailCase.custom_steps) {
      // Parse steps from markdown-like format if available
      try {
        // Simple parser for TestRail's markdown-like step format
        // Format is usually:
        // Step 1: Do this
        // Expected: Result should be X
        // 
        // Step 2: Do that
        // Expected: Result should be Y
        const stepRegex = /Step \d+:(.+?)(?:Expected:(.+?))?(?=Step \d+:|$)/gs;
        const matches = [...testRailCase.custom_steps.matchAll(stepRegex)];
        
        steps = matches.map(match => ({
          action: match[1]?.trim() || '',
          expected: match[2]?.trim() || ''
        }));
      } catch (e) {
        // If parsing fails, use the whole text as a single step
        steps = [{
          action: testRailCase.custom_steps || '',
          expected: ''
        }];
      }
    }
    
    return {
      id: new Identifier(testRailCase.id.toString()),
      name: testRailCase.title || '',
      description: testRailCase.description || '',
      steps,
      status: this.mapFromTestRailStatus(testRailCase.status_id),
      priority: this.mapFromTestRailPriority(testRailCase.priority_id),
      // Map additional fields as needed
      metadata: {
        originalProvider: 'TestRail',
        sectionId: testRailCase.section_id,
        suiteId: testRailCase.suite_id,
        templateId: testRailCase.template_id,
        typeId: testRailCase.type_id,
        createdBy: testRailCase.created_by,
        createdOn: testRailCase.created_on,
        updatedBy: testRailCase.updated_by,
        updatedOn: testRailCase.updated_on,
        // Include custom fields
        customFields: Object.entries(testRailCase)
          .filter(([key]) => key.startsWith('custom_') && 
                            key !== 'custom_steps' && 
                            key !== 'custom_steps_separated')
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      }
    };
  }
  
  /**
   * Convert canonical test case to TestRail format
   */
  private convertFromCanonicalTestCase(testCase: TestCase): any {
    const testRailCase: any = {
      title: testCase.name,
      description: testCase.description,
      status_id: this.mapToTestRailStatus(testCase.status),
      priority_id: this.mapToTestRailPriority(testCase.priority),
    };
    
    // Handle steps - TestRail supports multiple step formats, choose one based on configuration
    if (testCase.steps?.length) {
      const useStepsSeparated = true; // Could be a config option
      
      if (useStepsSeparated) {
        testRailCase.custom_steps_separated = testCase.steps.map(step => ({
          content: step.action || '',
          expected: step.expected || ''
        }));
      } else {
        // Convert to markdown-like format
        testRailCase.custom_steps = testCase.steps.map((step, index) => 
          `Step ${index + 1}: ${step.action || ''}\nExpected: ${step.expected || ''}`
        ).join('\n\n');
      }
    }
    
    // Add template ID if configured
    if (this.config.metadata?.defaultTemplateId && !testCase.metadata?.templateId) {
      testRailCase.template_id = this.config.metadata.defaultTemplateId;
    } else if (testCase.metadata?.templateId) {
      testRailCase.template_id = testCase.metadata.templateId;
    }
    
    // Add type ID if configured
    if (this.config.metadata?.defaultTypeId && !testCase.metadata?.typeId) {
      testRailCase.type_id = this.config.metadata.defaultTypeId;
    } else if (testCase.metadata?.typeId) {
      testRailCase.type_id = testCase.metadata.typeId;
    }
    
    // Include any additional custom fields from metadata.customFields
    if (this.config.metadata?.customFields) {
      Object.entries(this.config.metadata.customFields).forEach(([key, value]) => {
        if (!key.startsWith('custom_')) {
          testRailCase[`custom_${key}`] = value;
        } else {
          testRailCase[key] = value;
        }
      });
    }
    
    // Include any TestRail-specific custom fields from the test case metadata
    if (testCase.metadata?.customFields) {
      Object.entries(testCase.metadata.customFields).forEach(([key, value]) => {
        testRailCase[key] = value;
      });
    }
    
    return testRailCase;
  }
  
  /**
   * Map TestRail status ID to canonical status
   */
  private mapFromTestRailStatus(statusId?: number): string {
    if (!statusId) return 'OPEN';
    
    // TestRail default status IDs
    // 1: Passed
    // 2: Blocked
    // 3: Untested (default)
    // 4: Retest
    // 5: Failed
    const statusMap: Record<number, string> = {
      1: 'PASSED',
      2: 'BLOCKED',
      3: 'NOT_RUN',
      4: 'RETEST',
      5: 'FAILED'
    };
    
    return statusMap[statusId] || 'OPEN';
  }
  
  /**
   * Map canonical status to TestRail status ID
   */
  private mapToTestRailStatus(status?: string): number {
    if (!status) return 3; // Untested
    
    const statusMap: Record<string, number> = {
      'PASSED': 1,
      'BLOCKED': 2,
      'NOT_RUN': 3,
      'RETEST': 4,
      'FAILED': 5,
      'OPEN': 3
    };
    
    return statusMap[status] || 3;
  }
  
  /**
   * Map TestRail priority ID to canonical priority
   */
  private mapFromTestRailPriority(priorityId?: number): string {
    if (!priorityId) return 'MEDIUM';
    
    // TestRail default priority IDs
    // 1: Low
    // 2: Medium (default)
    // 3: High
    // 4: Critical
    const priorityMap: Record<number, string> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'CRITICAL'
    };
    
    return priorityMap[priorityId] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to TestRail priority ID
   */
  private mapToTestRailPriority(priority?: string): number {
    if (!priority) return 2; // Medium
    
    const priorityMap: Record<string, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4,
      'TRIVIAL': 1
    };
    
    return priorityMap[priority] || 2;
  }
}

// Factory function to create an instance of the provider
export function createTestRailProvider(config: TestRailProviderConfig): TestRailProvider {
  return new TestRailProvider(config);
}