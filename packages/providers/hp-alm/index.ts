/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Micro Focus ALM Provider
 * 
 * Implements the provider interface for Micro Focus Application Lifecycle Management (formerly HP ALM/Quality Center)
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider } from '../../../pkg/interfaces/providers';
import { ErrorResponse, ProviderConnectionStatus, TestCase } from '../../../pkg/domain/entities';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { Identifier } from '../../../pkg/domain/value-objects/Identifier';
import * as logger from '../../../internal/typescript/common/logger/LoggerAdapter';

// Enum for HP ALM error categories
export enum HPALMErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for HP ALM specific errors
export class HPALMError extends Error {
  category: HPALMErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: HPALMErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'HPALMError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static authentication(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.VALIDATION, details);
  }
  
  static rateLimit(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.RATE_LIMIT, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): HPALMError {
    return new HPALMError(message, HPALMErrorCategory.UNKNOWN, details);
  }
}

// Configuration interface for HP ALM Provider
export interface HPALMProviderConfig extends ProviderConfig {
  baseUrl: string;
  username: string;
  password: string;
  domain: string;
  project: string;
  clientId?: string;
  clientSecret?: string;
  useApiKey?: boolean;
  apiKey?: string;
  proxyUrl?: string;
  connectionTimeout?: number;
  maxRetries?: number;
  // Additional configuration options
  batchSize?: number; // Number of items to process in batch operations, defaults to 50
  concurrentRequests?: number; // Maximum number of concurrent requests, defaults to 5
  retryDelay?: number; // Delay between retries in milliseconds, defaults to 1000
  metadata?: {
    useSaml?: boolean; // Flag to force SAML authentication
    useProxy?: boolean; // Flag to force proxy usage
    disableSSLVerification?: boolean; // Flag to disable SSL verification (not recommended for production)
    customHeaders?: Record<string, string>; // Custom headers to include with every request
    defaultFolder?: string; // Default folder ID to use when creating new test cases
    defaultFields?: Record<string, any>; // Default field values to apply to all created test cases
    fieldMappings?: Record<string, string>; // Custom field mappings between canonical and ALM fields
    batchProcessing?: boolean; // Flag to enable batch processing for bulk operations
  };
}

// HP ALM API Client for interacting with ALM API
export class HPALMClient {
  private axiosInstance: AxiosInstance;
  private sessionId: string | null = null;
  private baseUrl: string;
  
  constructor(private config: HPALMProviderConfig) {
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
      baseURL: config.baseUrl,
      timeout: config.connectionTimeout || 30000,
      headers,
      proxy: proxyConfig,
      // Add option to disable SSL verification if requested (not recommended for production)
      httpsAgent: config.metadata?.disableSSLVerification ? 
        new (require('https').Agent)({ rejectUnauthorized: false }) : 
        undefined
    });
    
    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(async (config) => {
      // Add session ID if available
      if (this.sessionId) {
        config.headers['ALM_SESSION_ID'] = this.sessionId;
      }
      
      // Add API key if configured to use it
      if (this.config.useApiKey && this.config.apiKey) {
        config.headers['X-API-KEY'] = this.config.apiKey;
      }
      
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
   * Test connection to the HP ALM server
   */
  async testConnection(): Promise<{ connected: boolean }> {
    try {
      // Try to connect to the ALM server
      const response = await this.axiosInstance.get(`/rest/domains/${this.config.domain}/projects/${this.config.project}`);
      
      return { connected: true };
    } catch (error) {
      // Handle connection errors
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Authenticate with the ALM server
   */
  async login(): Promise<{ sessionId: string }> {
    try {
      // Determine authentication method
      if (this.config.useApiKey && this.config.apiKey) {
        // API Key authentication
        logger.debug('Authenticating with API key');
        const response = await this.axiosInstance.get('/authentication/sign-in-with-api-key', {
          headers: {
            'X-API-KEY': this.config.apiKey
          }
        });
        
        // Extract session ID from response
        const sessionId = response.headers['alm_session_id'] || response.data?.sessionId;
        
        if (!sessionId) {
          throw HPALMError.authentication('No session ID returned from API key authentication', {
            statusCode: response.status
          });
        }
        
        this.sessionId = sessionId;
        return { sessionId };
      } else if (this.config.clientId && this.config.clientSecret) {
        // OAuth authentication
        logger.debug('Authenticating with OAuth credentials');
        const authData = {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        };
        
        const response = await this.axiosInstance.post('/authentication/oauth/token', authData);
        
        if (!response.data?.access_token) {
          throw HPALMError.authentication('No access token returned from OAuth authentication', {
            statusCode: response.status
          });
        }
        
        // Use the OAuth token to get a session
        const sessionResponse = await this.axiosInstance.post('/authentication/sign-in-with-token', {
          token: response.data.access_token
        });
        
        const sessionId = sessionResponse.headers['alm_session_id'] || sessionResponse.data?.sessionId;
        
        if (!sessionId) {
          throw HPALMError.authentication('No session ID returned from token authentication', {
            statusCode: sessionResponse.status
          });
        }
        
        this.sessionId = sessionId;
        return { sessionId };
      } else {
        // Standard username/password authentication
        logger.debug('Authenticating with username and password');
        const authData = {
          username: this.config.username,
          password: this.config.password
        };
        
        // Check if we need to use SAML
        const useSaml = this.config.domain.toLowerCase().includes('saml') || 
          (this.config.metadata && this.config.metadata.useSaml);
        
        if (useSaml) {
          logger.debug('Using SAML authentication flow');
          try {
            // First request initiates SAML authentication
            const samlResponse = await this.axiosInstance.post('/authentication/saml/login', {
              username: this.config.username,
              domain: this.config.domain
            });
            
            // Process SAML response and complete authentication
            // This is a simplified flow - actual SAML would involve redirect handling
            if (samlResponse.data?.samlRequest) {
              // Complete SAML flow with second request
              const completeSaml = await this.axiosInstance.post('/authentication/saml/complete', {
                samlResponse: samlResponse.data.samlRequest,
                password: this.config.password
              });
              
              const sessionId = completeSaml.headers['alm_session_id'] || completeSaml.data?.sessionId;
              
              if (!sessionId) {
                throw HPALMError.authentication('No session ID returned from SAML authentication', {
                  statusCode: completeSaml.status,
                  samlResponse: true
                });
              }
              
              this.sessionId = sessionId;
              return { sessionId };
            }
          } catch (samlError) {
            logger.error('SAML authentication failed', { error: samlError });
            throw HPALMError.authentication('SAML authentication failed', { 
              originalError: samlError,
              samlResponse: true 
            });
          }
        }
        
        // Standard authentication flow
        const response = await this.axiosInstance.post('/authentication/sign-in', authData);
        
        // Extract session ID from response
        const sessionId = response.headers['alm_session_id'] || response.data?.sessionId;
        
        if (!sessionId) {
          throw HPALMError.authentication('No session ID returned from server', {
            statusCode: response.status
          });
        }
        
        this.sessionId = sessionId;
        return { sessionId };
      }
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * End the current session
   */
  async logout(): Promise<boolean> {
    if (!this.sessionId) {
      return true;
    }
    
    try {
      await this.axiosInstance.post('/authentication/sign-out');
      this.sessionId = null;
      return true;
    } catch (error) {
      // Just log the error but don't propagate it
      logger.warn('Error during HP ALM logout', { error });
      this.sessionId = null;
      return false;
    }
  }
  
  /**
   * Get a list of test cases
   */
  async getTestCases(folderId?: string, filter?: string): Promise<any[]> {
    try {
      let url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests`;
      
      // Add query parameters if provided
      const params: Record<string, string> = {};
      if (folderId) {
        params['query'] = `parent-id[${folderId}]`;
      }
      if (filter) {
        params['query'] = params['query'] ? `${params['query']};${filter}` : filter;
      }
      
      const response = await this.axiosInstance.get(url, { params });
      
      return response.data?.entities || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific test case by ID
   */
  async getTestCase(id: string): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${id}`;
      const response = await this.axiosInstance.get(url);
      
      // Get test steps for this test case
      const stepsUrl = `${url}/design-steps`;
      const stepsResponse = await this.axiosInstance.get(stepsUrl);
      
      // Combine test case and steps
      const testCase = response.data;
      testCase.design_steps = stepsResponse.data?.entities || [];
      
      return testCase;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(testCase: any): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests`;
      const response = await this.axiosInstance.post(url, testCase);
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(id: string, testCase: any): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${id}`;
      const response = await this.axiosInstance.put(url, testCase);
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(id: string): Promise<boolean> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${id}`;
      await this.axiosInstance.delete(url);
      
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test folders
   */
  async getFolders(parentId?: string): Promise<any[]> {
    try {
      let url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/test-folders`;
      
      // Add query parameters if provided
      const params: Record<string, string> = {};
      if (parentId) {
        params['query'] = `parent-id[${parentId}]`;
      }
      
      const response = await this.axiosInstance.get(url, { params });
      
      return response.data?.entities || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new test folder
   */
  async createFolder(folder: any): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/test-folders`;
      const response = await this.axiosInstance.post(url, folder);
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get attachments for a test case
   */
  async getAttachments(testId: string): Promise<any[]> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${testId}/attachments`;
      const response = await this.axiosInstance.get(url);
      
      return response.data?.entities || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific attachment
   */
  async getAttachment(testId: string, attachmentId: string): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${testId}/attachments/${attachmentId}`;
      const response = await this.axiosInstance.get(url, { responseType: 'arraybuffer' });
      
      return {
        content: Buffer.from(response.data),
        contentType: response.headers['content-type']
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Upload an attachment to a test case
   */
  async uploadAttachment(testId: string, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      const url = `/rest/domains/${this.config.domain}/projects/${this.config.project}/tests/${testId}/attachments`;
      
      // Set up multipart form data
      const formData = new FormData();
      const blob = new Blob([content], { type: contentType });
      formData.append('file', blob, filename);
      
      const response = await this.axiosInstance.post(url, formData, {
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
   * Handle API errors and convert them to HPALMError types
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = HPALMErrorCategory.UNKNOWN;
    let statusCode = 0;
    let details: Record<string, any> = {};
    
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = error.response.status;
        details.data = error.response.data;
        details.headers = error.response.headers;
        
        // Extract error message from response if available
        message = error.response.data?.message || 
                  error.response.data?.error || 
                  error.response.data?.error_description || 
                  error.message;
        
        // Categorize by status code
        if (statusCode === 401) {
          category = HPALMErrorCategory.AUTHENTICATION;
          message = 'Authentication failed: ' + message;
          
          // Check for SAML-related errors
          if (error.response.headers['www-authenticate']?.includes('SAML') ||
              error.response.data?.error_description?.includes('SAML')) {
            details.samlError = true;
            message = 'SAML authentication failed: ' + message;
          }
        } else if (statusCode === 403) {
          category = HPALMErrorCategory.AUTHORIZATION;
          message = 'Authorization failed: ' + message;
        } else if (statusCode === 404) {
          category = HPALMErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
          
          // Provide more specific error message for common resources
          const url = error.config?.url || '';
          if (url.includes('/projects/')) {
            if (url.includes('/tests/')) {
              message = `Test case not found: ${url.split('/tests/')[1]}`;
            } else if (url.includes('/test-folders/')) {
              message = `Test folder not found: ${url.split('/test-folders/')[1]}`;
            } else {
              message = `Project not found: ${this.config.project} in domain ${this.config.domain}`;
            }
          } else if (url.includes('/domains/')) {
            message = `Domain not found: ${this.config.domain}`;
          }
        } else if (statusCode === 422) {
          category = HPALMErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
          
          // Extract validation errors if available
          if (error.response.data?.errors || error.response.data?.validationErrors) {
            details.fields = error.response.data?.errors || error.response.data?.validationErrors;
            
            // Build a more descriptive message
            const fieldErrors = Object.entries(details.fields || {})
              .map(([field, errorMsg]) => `${field}: ${errorMsg}`)
              .join(', ');
            
            if (fieldErrors) {
              message = `Validation failed: ${fieldErrors}`;
            }
          }
        } else if (statusCode === 429) {
          category = HPALMErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded: ' + message;
          
          // Extract rate limiting headers
          if (error.response.headers['retry-after']) {
            details.retryAfter = error.response.headers['retry-after'];
            message = `Rate limit exceeded. Retry after ${details.retryAfter} seconds`;
          }
          
          // Extract rate limit information if available
          if (error.response.headers['x-ratelimit-limit']) {
            details.limit = error.response.headers['x-ratelimit-limit'];
          }
          if (error.response.headers['x-ratelimit-remaining']) {
            details.remaining = error.response.headers['x-ratelimit-remaining'];
          }
          if (error.response.headers['x-ratelimit-reset']) {
            details.resetTime = error.response.headers['x-ratelimit-reset'];
          }
        } else if (statusCode >= 500) {
          category = HPALMErrorCategory.SERVER_ERROR;
          
          // Provide specific messages for common server errors
          if (statusCode === 500) {
            message = 'Internal server error: ' + message;
          } else if (statusCode === 502) {
            message = 'Bad gateway: The ALM server is unreachable';
          } else if (statusCode === 503) {
            message = 'Service unavailable: The ALM server is temporarily unavailable';
          } else if (statusCode === 504) {
            message = 'Gateway timeout: The ALM server took too long to respond';
          } else {
            message = 'Server error: ' + message;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = HPALMErrorCategory.NETWORK;
        
        // Provide more specific network error messages
        if (error.code === 'ECONNREFUSED') {
          message = 'Connection refused: The ALM server actively refused the connection';
          details.code = 'ECONNREFUSED';
        } else if (error.code === 'ECONNABORTED') {
          message = 'Connection aborted: The request was aborted due to a timeout';
          details.code = 'ECONNABORTED';
          details.timeout = error.config?.timeout;
        } else if (error.code === 'ENOTFOUND') {
          message = `DNS lookup failed: The hostname ${this.config.baseUrl} could not be resolved`;
          details.code = 'ENOTFOUND';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out: The ALM server took too long to establish a connection';
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
        category = HPALMErrorCategory.UNKNOWN;
        message = 'Request setup error: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof HPALMError) {
      // If it's already an HPALMError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
      
      // Try to categorize common error patterns
      if (message.includes('timeout') || message.includes('timed out')) {
        category = HPALMErrorCategory.NETWORK;
        message = 'Connection timed out: ' + message;
      } else if (message.includes('network') || message.includes('connection')) {
        category = HPALMErrorCategory.NETWORK;
        message = 'Network error: ' + message;
      }
    }
    
    // Log the error with appropriate severity
    if (category === HPALMErrorCategory.NETWORK || category === HPALMErrorCategory.SERVER_ERROR) {
      logger.error(`HP ALM API Error: ${message}`, { category, statusCode, error });
    } else if (category === HPALMErrorCategory.AUTHENTICATION || category === HPALMErrorCategory.AUTHORIZATION) {
      logger.warn(`HP ALM API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`HP ALM API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case HPALMErrorCategory.AUTHENTICATION:
        throw HPALMError.authentication(message, details);
      case HPALMErrorCategory.AUTHORIZATION:
        throw HPALMError.authorization(message, details);
      case HPALMErrorCategory.NETWORK:
        throw HPALMError.network(message, details);
      case HPALMErrorCategory.RESOURCE_NOT_FOUND:
        throw HPALMError.resourceNotFound(message, details);
      case HPALMErrorCategory.VALIDATION:
        throw HPALMError.validation(message, details);
      case HPALMErrorCategory.RATE_LIMIT:
        throw HPALMError.rateLimit(message, details);
      case HPALMErrorCategory.SERVER_ERROR:
        throw HPALMError.serverError(message, details);
      default:
        throw HPALMError.unknown(message, details);
    }
  }
}

/**
 * Main HP ALM Provider implementation
 */
export class HPALMProvider implements SourceProvider, TargetProvider {
  private client: HPALMClient;
  private resilientClient: ResilientApiClient;
  private sessionId: string | null = null;
  private authenticated = false;
  
  constructor(private config: HPALMProviderConfig) {
    this.client = new HPALMClient(config);
    
    // Create resilient client for API calls
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl,
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3
    });
    
    logger.debug('Micro Focus ALM Provider initialized', { baseUrl: config.baseUrl, domain: config.domain, project: config.project });
  }
  
  /**
   * Get provider name
   */
  getName(): string {
    return 'Micro Focus ALM';
  }
  
  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<ProviderConnectionStatus> {
    try {
      logger.debug('Testing connection to Micro Focus ALM', { baseUrl: this.config.baseUrl });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to Micro Focus ALM', { baseUrl: this.config.baseUrl });
      
      return {
        connected: result.connected,
        provider: this.getName(),
        details: {
          baseUrl: this.config.baseUrl,
          domain: this.config.domain,
          project: this.config.project
        }
      };
    } catch (error) {
      logger.error('Failed to connect to Micro Focus ALM', { error, baseUrl: this.config.baseUrl });
      
      return {
        connected: false,
        provider: this.getName(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof HPALMError ? error.category : HPALMErrorCategory.UNKNOWN,
          baseUrl: this.config.baseUrl
        }
      };
    }
  }
  
  /**
   * Authenticate with the provider
   */
  private async authenticate(): Promise<void> {
    if (this.authenticated) {
      return;
    }
    
    try {
      logger.debug('Authenticating with Micro Focus ALM', { username: this.config.username });
      
      // Login to get session ID
      const result = await this.client.login();
      this.sessionId = result.sessionId;
      this.authenticated = true;
      
      logger.debug('Authentication successful', { sessionId: this.sessionId?.substring(0, 6) + '...' });
    } catch (error) {
      logger.error('Authentication failed', { error });
      this.authenticated = false;
      throw error;
    }
  }
  
  /**
   * Ensure the provider is authenticated
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      await this.authenticate();
    }
  }
  
  /**
   * Get a test case by ID
   */
  async getTestCase(id: string): Promise<TestCase> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Getting test case from Micro Focus ALM', { id });
      
      // Get the test case from ALM
      const almTestCase = await this.client.getTestCase(id);
      
      // Convert to canonical model
      return this.convertToCanonicalTestCase(almTestCase);
      
    } catch (error) {
      logger.error('Failed to get test case', { id, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        const almTestCase = await this.client.getTestCase(id);
        return this.convertToCanonicalTestCase(almTestCase);
      }
      
      throw error;
    }
  }
  
  /**
   * Get test cases, optionally filtered
   * @param folderId Optional folder ID to filter by
   * @param filter Optional filter criteria
   * @param pageSize Optional page size, defaults to 100
   * @param page Optional page number, defaults to 1
   */
  async getTestCases(folderId?: string, filter?: string, pageSize = 100, page = 1): Promise<TestCase[]> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Getting test cases from HP ALM', { folderId, filter, pageSize, page });
      
      // Get test cases from ALM with pagination
      const almTestCases = await this.client.getTestCases(folderId, filter);
      
      // Convert each to canonical model
      return Promise.all(almTestCases.map(tc => this.convertToCanonicalTestCase(tc)));
      
    } catch (error) {
      logger.error('Failed to get test cases', { folderId, filter, pageSize, page, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        const almTestCases = await this.client.getTestCases(folderId, filter);
        return Promise.all(almTestCases.map(tc => this.convertToCanonicalTestCase(tc)));
      }
      
      throw error;
    }
  }
  
  /**
   * Get all test cases with automatic pagination
   * @param folderId Optional folder ID to filter by
   * @param filter Optional filter criteria
   */
  async getAllTestCases(folderId?: string, filter?: string): Promise<TestCase[]> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Getting all test cases from HP ALM', { folderId, filter });
      
      let page = 1;
      const pageSize = 100;
      const allTestCases: TestCase[] = [];
      let hasMoreResults = true;
      
      // Fetch all pages of test cases
      while (hasMoreResults) {
        logger.debug(`Fetching page ${page} of test cases`, { pageSize });
        
        // Construct pagination filter
        const paginationFilter = filter ? 
          `${filter};start-index[${(page-1) * pageSize + 1}];page-size[${pageSize}]` : 
          `start-index[${(page-1) * pageSize + 1}];page-size[${pageSize}]`;
        
        const almTestCases = await this.client.getTestCases(folderId, paginationFilter);
        
        if (almTestCases.length === 0) {
          hasMoreResults = false;
        } else {
          const canonicalTestCases = await Promise.all(
            almTestCases.map(tc => this.convertToCanonicalTestCase(tc))
          );
          allTestCases.push(...canonicalTestCases);
          
          // If we got fewer items than the page size, we've reached the end
          if (almTestCases.length < pageSize) {
            hasMoreResults = false;
          } else {
            page++;
          }
        }
      }
      
      logger.info(`Retrieved ${allTestCases.length} test cases in total`);
      return allTestCases;
      
    } catch (error) {
      logger.error('Failed to get all test cases', { folderId, filter, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        return this.getAllTestCases(folderId, filter);
      }
      
      throw error;
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Creating test case in HP ALM');
      
      // Convert canonical model to ALM format
      const almTestCase = this.convertFromCanonicalTestCase(testCase);
      
      // Create test case in ALM
      const createdTestCase = await this.client.createTestCase(almTestCase);
      
      logger.info('Test case created successfully', { id: createdTestCase.id });
      
      // Return the created test case in canonical format
      return this.convertToCanonicalTestCase(createdTestCase);
      
    } catch (error) {
      logger.error('Failed to create test case', { error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        const almTestCase = this.convertFromCanonicalTestCase(testCase);
        const createdTestCase = await this.client.createTestCase(almTestCase);
        return this.convertToCanonicalTestCase(createdTestCase);
      }
      
      throw error;
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      await this.ensureAuthenticated();
      
      const id = testCase.id.value;
      logger.debug('Updating test case in HP ALM', { id });
      
      // Convert canonical model to ALM format
      const almTestCase = this.convertFromCanonicalTestCase(testCase);
      
      // Update test case in ALM
      const updatedTestCase = await this.client.updateTestCase(id, almTestCase);
      
      logger.info('Test case updated successfully', { id });
      
      // Return the updated test case in canonical format
      return this.convertToCanonicalTestCase(updatedTestCase);
      
    } catch (error) {
      logger.error('Failed to update test case', { id: testCase.id.value, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        const id = testCase.id.value;
        const almTestCase = this.convertFromCanonicalTestCase(testCase);
        const updatedTestCase = await this.client.updateTestCase(id, almTestCase);
        return this.convertToCanonicalTestCase(updatedTestCase);
      }
      
      throw error;
    }
  }
  
  /**
   * Delete a test case
   * @param id ID of the test case to delete
   */
  async deleteTestCase(id: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Deleting test case from HP ALM', { id });
      
      // Delete the test case
      const result = await this.client.deleteTestCase(id);
      
      logger.info('Test case deleted successfully', { id });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to delete test case', { id, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        return this.client.deleteTestCase(id);
      }
      
      throw error;
    }
  }
  
  /**
   * Get attachments for a test case
   * @param testCaseId ID of the test case
   */
  async getAttachments(testCaseId: string): Promise<any[]> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Getting attachments for test case', { testCaseId });
      
      // Get attachments from ALM
      const attachments = await this.client.getAttachments(testCaseId);
      
      logger.debug(`Found ${attachments.length} attachments`, { testCaseId });
      
      return attachments;
      
    } catch (error) {
      logger.error('Failed to get attachments', { testCaseId, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        return this.client.getAttachments(testCaseId);
      }
      
      throw error;
    }
  }
  
  /**
   * Get a specific attachment
   * @param testCaseId ID of the test case
   * @param attachmentId ID of the attachment
   */
  async getAttachment(testCaseId: string, attachmentId: string): Promise<{ content: Buffer, contentType: string }> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Getting attachment', { testCaseId, attachmentId });
      
      // Get attachment from ALM
      const attachment = await this.client.getAttachment(testCaseId, attachmentId);
      
      return attachment;
      
    } catch (error) {
      logger.error('Failed to get attachment', { testCaseId, attachmentId, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        return this.client.getAttachment(testCaseId, attachmentId);
      }
      
      throw error;
    }
  }
  
  /**
   * Upload an attachment to a test case
   * @param testCaseId ID of the test case
   * @param filename Name of the file
   * @param content Content of the file as a Buffer
   * @param contentType MIME type of the content
   */
  async uploadAttachment(testCaseId: string, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Uploading attachment', { testCaseId, filename, contentType, size: content.length });
      
      // Upload attachment to ALM
      const result = await this.client.uploadAttachment(testCaseId, filename, content, contentType);
      
      logger.info('Attachment uploaded successfully', { testCaseId, filename });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to upload attachment', { testCaseId, filename, error });
      
      if (error instanceof HPALMError && error.category === HPALMErrorCategory.AUTHENTICATION) {
        // Try to reauthenticate and retry once
        logger.debug('Session expired, reauthenticating');
        this.authenticated = false;
        await this.authenticate();
        
        return this.client.uploadAttachment(testCaseId, filename, content, contentType);
      }
      
      throw error;
    }
  }
  
  /**
   * Convert HP ALM test case to canonical model
   */
  private convertToCanonicalTestCase(almTestCase: any): TestCase {
    return {
      id: new Identifier(almTestCase.id.toString()),
      name: almTestCase.name,
      description: almTestCase.description || '',
      steps: this.convertFromALMSteps(almTestCase.design_steps || []),
      status: this.mapFromALMStatus(almTestCase.status),
      priority: this.mapFromALMPriority(almTestCase.priority),
      // Map additional fields as needed
      metadata: {
        originalProvider: 'HP ALM',
        createdBy: almTestCase.owner || '',
        updatedBy: almTestCase.last_modified_by || '',
        parentId: almTestCase.parent_id || null,
        // Add other ALM-specific fields that don't map directly
        almType: almTestCase.type || '',
        almSubtype: almTestCase.subtype || '',
        almAttributes: { ...almTestCase.fields }
      }
    };
  }
  
  /**
   * Convert canonical test case to HP ALM format
   */
  private convertFromCanonicalTestCase(testCase: TestCase): any {
    const almTestCase: any = {
      name: testCase.name,
      description: testCase.description,
      status: this.mapToALMStatus(testCase.status),
      priority: this.mapToALMPriority(testCase.priority),
      // Map additional fields as needed
    };
    
    // If test case has a parent folder ID, include it
    if (testCase.metadata?.parentId) {
      almTestCase.parent_id = testCase.metadata.parentId;
    }
    
    // Handle ALM-specific metadata if available
    if (testCase.metadata?.almAttributes) {
      Object.assign(almTestCase, testCase.metadata.almAttributes);
    }
    
    // Don't include id for create operations, only for updates
    if (testCase.id && testCase.id.value) {
      almTestCase.id = testCase.id.value;
    }
    
    return almTestCase;
  }
  
  /**
   * Convert ALM steps to canonical format
   */
  private convertFromALMSteps(almSteps: any[]): any[] {
    return almSteps.map(step => ({
      action: step.description || step.name || '',
      expected: step.expected || ''
    }));
  }
  
  /**
   * Convert canonical steps to ALM format
   */
  private convertToALMSteps(steps: any[]): any[] {
    return steps.map((step, index) => ({
      name: `Step ${index + 1}`,
      description: step.action || '',
      expected: step.expected || ''
    }));
  }
  
  /**
   * Map ALM status to canonical status
   */
  private mapFromALMStatus(almStatus: string): string {
    const statusMap: Record<string, string> = {
      'Not Completed': 'OPEN',
      'Passed': 'PASSED',
      'Failed': 'FAILED',
      'Blocked': 'BLOCKED',
      'No Run': 'NOT_RUN',
      'N/A': 'NOT_APPLICABLE'
    };
    
    return statusMap[almStatus] || 'UNKNOWN';
  }
  
  /**
   * Map canonical status to ALM status
   */
  private mapToALMStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'OPEN': 'Not Completed',
      'PASSED': 'Passed',
      'FAILED': 'Failed',
      'BLOCKED': 'Blocked',
      'NOT_RUN': 'No Run',
      'NOT_APPLICABLE': 'N/A'
    };
    
    return statusMap[status] || 'Not Completed';
  }
  
  /**
   * Map ALM priority to canonical priority
   */
  private mapFromALMPriority(almPriority: number): string {
    const priorityMap: Record<number, string> = {
      1: 'CRITICAL',
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW',
      5: 'TRIVIAL'
    };
    
    return priorityMap[almPriority] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to ALM priority
   */
  private mapToALMPriority(priority: string): number {
    const priorityMap: Record<string, number> = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4,
      'TRIVIAL': 5
    };
    
    return priorityMap[priority] || 3;
  }
}

// Factory function to create an instance of the provider
export function createHPALMProvider(config: HPALMProviderConfig): HPALMProvider {
  return new HPALMProvider(config);
}
