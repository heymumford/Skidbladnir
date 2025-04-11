/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Visure Solutions Provider
 * 
 * Implements the provider interface for Visure Solutions requirements management tool
 * with specific support for requirements tracing
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider } from '../../../packages/common/src/interfaces/provider';
import { ErrorResponse, ConnectionStatus, EntityType } from '../../../packages/common/src/interfaces/provider';
import { Project, TestCase, Folder, TestCycle, TestExecution, Attachment, FieldDefinition } from '../../../packages/common/src/models/entities';
import { AttachmentContent } from '../../../packages/common/src/models/attachment';
import { PaginatedResult } from '../../../packages/common/src/models/paginated';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import * as logger from '../../../internal/typescript/common/logger/LoggerAdapter';

// Enum for Visure error categories
export enum VisureErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for Visure specific errors
export class VisureError extends Error {
  category: VisureErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: VisureErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'VisureError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static authentication(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.VALIDATION, details);
  }
  
  static rateLimit(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.RATE_LIMIT, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): VisureError {
    return new VisureError(message, VisureErrorCategory.UNKNOWN, details);
  }
}

// TraceabilityLink interface representing a relationship between requirements and test cases
export interface TraceabilityLink {
  sourceId: string;
  targetId: string;
  linkType: TraceabilityLinkType;
  direction: TraceDirection;
  description?: string;
  attributes?: Record<string, any>;
}

// Traceability link types for requirements management
export enum TraceabilityLinkType {
  VERIFIES = 'VERIFIES',
  VALIDATES = 'VALIDATES',
  IMPLEMENTS = 'IMPLEMENTS',
  RELATED = 'RELATED',
  DEPENDS_ON = 'DEPENDS_ON',
  DERIVED_FROM = 'DERIVED_FROM'
}

// Direction of trace links
export enum TraceDirection {
  FORWARD = 'FORWARD',
  BACKWARD = 'BACKWARD',
  BIDIRECTIONAL = 'BIDIRECTIONAL'
}

// Requirement interface for Visure
export interface Requirement {
  id: string;
  identifier: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  version: string;
  attributes: Record<string, any>;
  tags: string[];
  parentId?: string;
  childIds?: string[];
  traceLinks?: TraceabilityLink[];
}

// Configuration interface for Visure Provider
export interface VisureProviderConfig extends ProviderConfig {
  baseUrl: string;
  username: string;
  password?: string;
  apiToken?: string;
  projectId?: string;
  basePath?: string;
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
    defaultFolderId?: string; // Default folder ID for new items
    fieldMappings?: Record<string, string>; // Custom field mappings between canonical and Visure fields
    customFields?: Record<string, any>; // Default values for custom fields
  };
}

/**
 * Visure Solutions API Client for interacting with Visure Solutions REST API
 */
export class VisureClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private accessTokenExpiry: number | null = null;
  private baseUrl: string;
  
  constructor(private config: VisureProviderConfig) {
    this.baseUrl = config.baseUrl;
    
    // Set initial token if provided
    if (config.apiToken) {
      this.accessToken = config.apiToken;
      // Set default expiry to 24 hours from now if not known
      this.accessTokenExpiry = Date.now() + 86400000;
    }
    
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
      baseURL: `${config.baseUrl}/api/v1`,
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
      // Ensure we have a valid token
      await this.ensureValidToken();
      
      // Add access token if available
      if (this.accessToken) {
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
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
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    // If we have a valid token that's not about to expire, we're good
    if (this.accessToken && this.accessTokenExpiry && this.accessTokenExpiry > Date.now() + 60000) {
      return;
    }
    
    // Otherwise, authenticate with username/password
    if (this.config.username && this.config.password) {
      await this.authenticate();
      return;
    }
    
    // If we have an API token but no expiry, assume it's still valid
    if (this.config.apiToken) {
      this.accessToken = this.config.apiToken;
      this.accessTokenExpiry = Date.now() + 86400000; // 24 hours
      return;
    }
    
    // If we get here and still don't have a valid token, throw an error
    if (!this.accessToken) {
      throw VisureError.authentication('No valid authentication method available. Please provide credentials or API token.');
    }
  }
  
  /**
   * Authenticate with the Visure Solutions API
   */
  private async authenticate(): Promise<void> {
    try {
      logger.debug('Authenticating with Visure Solutions API');
      
      const response = await this.axiosInstance.post('/auth/login', {
        username: this.config.username,
        password: this.config.password
      }, {
        headers: {
          // Skip the auth interceptor for this request
          skipAuthInterceptor: true
        }
      });
      
      this.accessToken = response.data.token;
      
      // Set token expiry - Visure typically uses 24-hour tokens
      this.accessTokenExpiry = Date.now() + (response.data.expiresIn || 86400) * 1000;
      
      logger.debug('Successfully authenticated with Visure Solutions API');
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Test connection to the Visure server
   */
  async testConnection(): Promise<{ connected: boolean }> {
    try {
      // Try to connect to the Visure server by fetching current user
      await this.ensureValidToken();
      const response = await this.axiosInstance.get('/users/current');
      
      return { connected: true };
    } catch (error) {
      // Handle connection errors
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get projects
   */
  async getProjects(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/projects');
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific project
   */
  async getProject(projectId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get folders for a project
   */
  async getFolders(projectId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/folders`);
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get requirements for a project
   */
  async getRequirements(projectId: string, folderId?: string, includeTraceLinks = false): Promise<Requirement[]> {
    try {
      const url = `/projects/${projectId}/requirements`;
      const params: Record<string, any> = {};
      
      if (folderId) {
        params.folderId = folderId;
      }
      
      if (includeTraceLinks) {
        params.includeTraceLinks = 'true';
      }
      
      const response = await this.axiosInstance.get(url, { params });
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific requirement
   */
  async getRequirement(projectId: string, requirementId: string, includeTraceLinks = false): Promise<Requirement> {
    try {
      const params: Record<string, any> = {};
      
      if (includeTraceLinks) {
        params.includeTraceLinks = 'true';
      }
      
      const response = await this.axiosInstance.get(`/projects/${projectId}/requirements/${requirementId}`, { params });
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new requirement
   */
  async createRequirement(projectId: string, requirement: Partial<Requirement>): Promise<Requirement> {
    try {
      const response = await this.axiosInstance.post(`/projects/${projectId}/requirements`, requirement);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing requirement
   */
  async updateRequirement(projectId: string, requirementId: string, requirement: Partial<Requirement>): Promise<Requirement> {
    try {
      const response = await this.axiosInstance.put(`/projects/${projectId}/requirements/${requirementId}`, requirement);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete a requirement
   */
  async deleteRequirement(projectId: string, requirementId: string): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/projects/${projectId}/requirements/${requirementId}`);
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test cases for a project
   */
  async getTestCases(projectId: string, folderId?: string, includeTraceLinks = false): Promise<any[]> {
    try {
      const url = `/projects/${projectId}/testcases`;
      const params: Record<string, any> = {};
      
      if (folderId) {
        params.folderId = folderId;
      }
      
      if (includeTraceLinks) {
        params.includeTraceLinks = 'true';
      }
      
      const response = await this.axiosInstance.get(url, { params });
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific test case
   */
  async getTestCase(projectId: string, testCaseId: string, includeSteps = true, includeTraceLinks = false): Promise<any> {
    try {
      const params: Record<string, any> = {};
      
      if (includeSteps) {
        params.includeSteps = 'true';
      }
      
      if (includeTraceLinks) {
        params.includeTraceLinks = 'true';
      }
      
      const response = await this.axiosInstance.get(`/projects/${projectId}/testcases/${testCaseId}`, { params });
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(projectId: string, testCase: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`/projects/${projectId}/testcases`, testCase);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(projectId: string, testCaseId: string, testCase: any): Promise<any> {
    try {
      const response = await this.axiosInstance.put(`/projects/${projectId}/testcases/${testCaseId}`, testCase);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(projectId: string, testCaseId: string): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/projects/${projectId}/testcases/${testCaseId}`);
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get traceability links
   */
  async getTraceabilityLinks(projectId: string, itemId: string, itemType: string): Promise<TraceabilityLink[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/traceability`, {
        params: {
          itemId,
          itemType
        }
      });
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a traceability link
   */
  async createTraceabilityLink(projectId: string, link: TraceabilityLink): Promise<TraceabilityLink> {
    try {
      const response = await this.axiosInstance.post(`/projects/${projectId}/traceability`, link);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete a traceability link
   */
  async deleteTraceabilityLink(projectId: string, sourceId: string, targetId: string): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/projects/${projectId}/traceability`, {
        params: {
          sourceId,
          targetId
        }
      });
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get field definitions for a project
   */
  async getFieldDefinitions(projectId: string, entityType: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/fields`, {
        params: {
          entityType
        }
      });
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get attachments for an item
   */
  async getAttachments(projectId: string, itemId: string, itemType: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/attachments`, {
        params: {
          itemId,
          itemType
        }
      });
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Download an attachment
   */
  async downloadAttachment(projectId: string, attachmentId: string): Promise<{ content: Buffer, contentType: string, filename: string }> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/attachments/${attachmentId}/content`, {
        responseType: 'arraybuffer'
      });
      
      return {
        content: Buffer.from(response.data),
        contentType: response.headers['content-type'],
        filename: response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'unknown'
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Upload an attachment
   */
  async uploadAttachment(projectId: string, itemId: string, itemType: string, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      // Create form data
      const formData = new FormData();
      const blob = new Blob([content], { type: contentType });
      formData.append('file', blob, filename);
      formData.append('itemId', itemId);
      formData.append('itemType', itemType);
      
      const response = await this.axiosInstance.post(`/projects/${projectId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Generate traceability matrix
   */
  async generateTraceabilityMatrix(projectId: string, filters?: Record<string, any>): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`/projects/${projectId}/traceability/matrix`, filters || {});
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Handle API errors and convert them to VisureError types
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = VisureErrorCategory.UNKNOWN;
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
        message = error.response.data?.message || 
                  error.response.data?.error || 
                  error.message;
        
        // Categorize by status code
        if (statusCode === 401) {
          category = VisureErrorCategory.AUTHENTICATION;
          message = 'Authentication failed: ' + message;
        } else if (statusCode === 403) {
          category = VisureErrorCategory.AUTHORIZATION;
          message = 'Authorization failed: ' + message;
        } else if (statusCode === 404) {
          category = VisureErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
          
          // Provide more specific error messages based on the URL
          const url = error.config?.url || '';
          if (url.includes('/requirements/')) {
            const id = url.split('/requirements/')[1].split('/')[0];
            message = `Requirement not found: ${id}`;
          } else if (url.includes('/testcases/')) {
            const id = url.split('/testcases/')[1].split('/')[0];
            message = `Test case not found: ${id}`;
          } else if (url.includes('/projects/')) {
            const id = url.split('/projects/')[1].split('/')[0];
            message = `Project not found: ${id}`;
          }
        } else if (statusCode === 400) {
          category = VisureErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
          
          // Extract validation errors if available
          if (error.response.data?.errors) {
            details.validationErrors = error.response.data.errors;
            
            // Format validation errors as a string
            const errorMessages = Object.entries(error.response.data.errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            
            if (errorMessages) {
              message = `Validation failed: ${errorMessages}`;
            }
          }
        } else if (statusCode === 429) {
          category = VisureErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded: ' + message;
          
          // Extract rate limiting headers
          if (error.response.headers['retry-after']) {
            details.retryAfter = error.response.headers['retry-after'];
            message = `Rate limit exceeded. Retry after ${details.retryAfter} seconds`;
          }
        } else if (statusCode >= 500) {
          category = VisureErrorCategory.SERVER_ERROR;
          
          // Provide specific messages for common server errors
          if (statusCode === 500) {
            message = 'Internal server error: ' + message;
          } else if (statusCode === 502) {
            message = 'Bad gateway: The Visure server is unreachable';
          } else if (statusCode === 503) {
            message = 'Service unavailable: The Visure server is temporarily unavailable';
          } else if (statusCode === 504) {
            message = 'Gateway timeout: The Visure server took too long to respond';
          } else {
            message = 'Server error: ' + message;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = VisureErrorCategory.NETWORK;
        
        // Provide more specific network error messages
        if (error.code === 'ECONNREFUSED') {
          message = 'Connection refused: The Visure server actively refused the connection';
          details.code = 'ECONNREFUSED';
        } else if (error.code === 'ECONNABORTED') {
          message = 'Connection aborted: The request was aborted due to a timeout';
          details.code = 'ECONNABORTED';
          details.timeout = error.config?.timeout;
        } else if (error.code === 'ENOTFOUND') {
          message = `DNS lookup failed: The hostname ${this.config.baseUrl} could not be resolved`;
          details.code = 'ENOTFOUND';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out: The Visure server took too long to establish a connection';
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
        category = VisureErrorCategory.UNKNOWN;
        message = 'Request setup error: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof VisureError) {
      // If it's already a VisureError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
      
      // Try to categorize common error patterns
      if (message.includes('timeout') || message.includes('timed out')) {
        category = VisureErrorCategory.NETWORK;
        message = 'Connection timed out: ' + message;
      } else if (message.includes('network') || message.includes('connection')) {
        category = VisureErrorCategory.NETWORK;
        message = 'Network error: ' + message;
      }
    }
    
    // Log the error with appropriate severity
    if (category === VisureErrorCategory.NETWORK || category === VisureErrorCategory.SERVER_ERROR) {
      logger.error(`Visure API Error: ${message}`, { category, statusCode, error });
    } else if (category === VisureErrorCategory.AUTHENTICATION || category === VisureErrorCategory.AUTHORIZATION) {
      logger.warn(`Visure API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`Visure API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case VisureErrorCategory.AUTHENTICATION:
        throw VisureError.authentication(message, details);
      case VisureErrorCategory.AUTHORIZATION:
        throw VisureError.authorization(message, details);
      case VisureErrorCategory.NETWORK:
        throw VisureError.network(message, details);
      case VisureErrorCategory.RESOURCE_NOT_FOUND:
        throw VisureError.resourceNotFound(message, details);
      case VisureErrorCategory.VALIDATION:
        throw VisureError.validation(message, details);
      case VisureErrorCategory.RATE_LIMIT:
        throw VisureError.rateLimit(message, details);
      case VisureErrorCategory.SERVER_ERROR:
        throw VisureError.serverError(message, details);
      default:
        throw VisureError.unknown(message, details);
    }
  }
}

/**
 * Main Visure Solutions Provider implementation
 */
export class VisureProvider implements SourceProvider, TargetProvider {
  private id = 'visure';
  private name = 'Visure Solutions';
  private version = '1.0.0';
  private client: VisureClient;
  private resilientClient: ResilientApiClient;
  
  constructor(private config: VisureProviderConfig) {
    this.client = new VisureClient(config);
    
    // Create resilient client for API calls
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl,
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3
    });
    
    logger.debug('Visure Provider initialized', { baseUrl: config.baseUrl, projectId: config.projectId });
  }
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
      this.client = new VisureClient(this.config);
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
      logger.debug('Testing connection to Visure Solutions', { baseUrl: this.config.baseUrl });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to Visure Solutions', { baseUrl: this.config.baseUrl });
      
      return {
        connected: result.connected,
        details: {
          baseUrl: this.config.baseUrl,
          projectId: this.config.projectId
        }
      };
    } catch (error) {
      logger.error('Failed to connect to Visure Solutions', { error, baseUrl: this.config.baseUrl });
      
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof VisureError ? error.category : VisureErrorCategory.UNKNOWN,
          baseUrl: this.config.baseUrl
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
          EntityType.ATTACHMENT,
          EntityType.FIELD_DEFINITION
        ],
        supportsAttachments: true,
        supportsExecutionHistory: false,
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
        getProject: {
          type: 'query',
          dependencies: ['getProjects'],
          required: true,
          description: 'Get a specific project',
          requiredParams: ['projectId']
        },
        getFolders: {
          type: 'query',
          dependencies: ['getProject'],
          required: true,
          description: 'Get folders for a project',
          requiredParams: ['projectId']
        },
        getRequirements: {
          type: 'query',
          dependencies: ['getProject'],
          required: true,
          description: 'Get requirements for a project',
          requiredParams: ['projectId']
        },
        getRequirement: {
          type: 'query',
          dependencies: ['getRequirements'],
          required: true,
          description: 'Get a specific requirement',
          requiredParams: ['projectId', 'requirementId']
        },
        createRequirement: {
          type: 'mutation',
          dependencies: ['getProject'],
          required: false,
          description: 'Create a new requirement',
          requiredParams: ['projectId', 'requirement']
        },
        updateRequirement: {
          type: 'mutation',
          dependencies: ['getRequirement'],
          required: false,
          description: 'Update an existing requirement',
          requiredParams: ['projectId', 'requirementId', 'requirement']
        },
        getTestCases: {
          type: 'query',
          dependencies: ['getProject'],
          required: true,
          description: 'Get test cases for a project',
          requiredParams: ['projectId']
        },
        getTestCase: {
          type: 'query',
          dependencies: ['getTestCases'],
          required: true,
          description: 'Get a specific test case',
          requiredParams: ['projectId', 'testCaseId']
        },
        createTestCase: {
          type: 'mutation',
          dependencies: ['getProject'],
          required: false,
          description: 'Create a new test case',
          requiredParams: ['projectId', 'testCase']
        },
        updateTestCase: {
          type: 'mutation',
          dependencies: ['getTestCase'],
          required: false,
          description: 'Update an existing test case',
          requiredParams: ['projectId', 'testCaseId', 'testCase']
        },
        getTraceabilityLinks: {
          type: 'query',
          dependencies: ['getRequirement', 'getTestCase'],
          required: false,
          description: 'Get traceability links',
          requiredParams: ['projectId', 'itemId', 'itemType']
        },
        createTraceabilityLink: {
          type: 'mutation',
          dependencies: ['getRequirement', 'getTestCase'],
          required: false,
          description: 'Create a traceability link',
          requiredParams: ['projectId', 'link']
        },
        generateTraceabilityMatrix: {
          type: 'query',
          dependencies: ['getRequirements', 'getTestCases'],
          required: false,
          description: 'Generate traceability matrix',
          requiredParams: ['projectId']
        }
      }
    };
  }
  
  /**
   * Get projects from the source system
   */
  async getProjects(): Promise<Project[]> {
    try {
      logger.debug('Getting projects from Visure Solutions');
      
      const visureProjects = await this.client.getProjects();
      
      // Map to canonical Project model
      const projects = visureProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        attributes: {
          visureId: project.id,
          visureIdentifier: project.identifier || '',
          createdBy: project.createdBy,
          createdDate: project.createdDate,
          modifiedBy: project.modifiedBy,
          modifiedDate: project.modifiedDate
        }
      }));
      
      logger.info(`Retrieved ${projects.length} projects from Visure Solutions`);
      
      return projects;
    } catch (error) {
      logger.error('Failed to get projects', { error });
      throw error;
    }
  }
  
  /**
   * Get test folders/hierarchical structure
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      logger.debug('Getting folders from Visure Solutions', { projectId });
      
      const visureFolders = await this.client.getFolders(projectId);
      
      // Map to canonical Folder model
      const folders = visureFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.path || '',
        parentId: folder.parentId || null,
        attributes: {
          visureId: folder.id,
          visureType: folder.type || 'folder',
          modifiedDate: folder.modifiedDate
        }
      }));
      
      logger.info(`Retrieved ${folders.length} folders from Visure Solutions`, { projectId });
      
      return folders;
    } catch (error) {
      logger.error('Failed to get folders', { projectId, error });
      throw error;
    }
  }
  
  /**
   * Get test cases
   */
  async getTestCases(projectId: string, options?: any): Promise<PaginatedResult<TestCase>> {
    try {
      logger.debug('Getting test cases from Visure Solutions', { 
        projectId,
        folderId: options?.folderId
      });
      
      const visureTestCases = await this.client.getTestCases(
        projectId,
        options?.folderId,
        !!options?.includeTraceLinks
      );
      
      // Map to canonical TestCase model
      const testCases = await Promise.all(visureTestCases.map(async (tc) => {
        // If steps are not included, fetch them
        let testCaseWithSteps = tc;
        if (!tc.steps && options?.includeSteps !== false) {
          testCaseWithSteps = await this.client.getTestCase(projectId, tc.id, true, !!options?.includeTraceLinks);
        }
        
        return this.mapVisureTestCaseToCanonical(testCaseWithSteps);
      }));
      
      logger.info(`Retrieved ${testCases.length} test cases from Visure Solutions`, { 
        projectId,
        folderId: options?.folderId
      });
      
      // Return as paginated result
      return {
        items: testCases,
        totalCount: testCases.length,
        hasMore: false, // Visure API doesn't support pagination currently
        nextPage: null
      };
    } catch (error) {
      logger.error('Failed to get test cases', { projectId, options, error });
      throw error;
    }
  }
  
  /**
   * Get a single test case with details
   */
  async getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    try {
      logger.debug('Getting test case from Visure Solutions', { projectId, testCaseId });
      
      // Get test case with steps and trace links
      const visureTestCase = await this.client.getTestCase(projectId, testCaseId, true, true);
      
      // Map to canonical TestCase model
      const testCase = this.mapVisureTestCaseToCanonical(visureTestCase);
      
      logger.info('Retrieved test case from Visure Solutions', { 
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
    // Visure doesn't directly support test cycles as a concept
    // Return an empty result
    return {
      items: [],
      totalCount: 0,
      hasMore: false,
      nextPage: null
    };
  }
  
  /**
   * Get test executions
   */
  async getTestExecutions(projectId: string, testCycleId: string, options?: any): Promise<PaginatedResult<TestExecution>> {
    // Visure doesn't directly support test executions as a concept
    // Return an empty result
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
    try {
      logger.debug('Getting attachment from Visure Solutions', { projectId, attachmentId });
      
      const attachment = await this.client.downloadAttachment(projectId, attachmentId);
      
      return {
        id: attachmentId,
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        size: attachment.content.length
      };
    } catch (error) {
      logger.error('Failed to get attachment', { projectId, attachmentId, error });
      throw error;
    }
  }
  
  /**
   * Get field definitions (including custom fields)
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    try {
      logger.debug('Getting field definitions from Visure Solutions', { projectId });
      
      // Get field definitions for both requirements and test cases
      const requirementFields = await this.client.getFieldDefinitions(projectId, 'requirement');
      const testCaseFields = await this.client.getFieldDefinitions(projectId, 'testcase');
      
      // Combine and map to canonical FieldDefinition model
      const fields = [
        ...requirementFields.map(field => this.mapVisureFieldToCanonical(field, 'requirement')),
        ...testCaseFields.map(field => this.mapVisureFieldToCanonical(field, 'testcase'))
      ];
      
      logger.info(`Retrieved ${fields.length} field definitions from Visure Solutions`, { projectId });
      
      return fields;
    } catch (error) {
      logger.error('Failed to get field definitions', { projectId, error });
      throw error;
    }
  }
  
  /**
   * Create or update a folder structure
   */
  async createFolder(projectId: string, folder: Folder): Promise<string> {
    // Implement folder creation if Visure API supports it
    // This is a placeholder implementation
    throw new Error('Folder creation not implemented for Visure Solutions provider');
  }
  
  /**
   * Create or update a test case
   */
  async createTestCase(projectId: string, testCase: TestCase): Promise<string> {
    try {
      logger.debug('Creating test case in Visure Solutions', { 
        projectId,
        title: testCase.title
      });
      
      // Convert canonical model to Visure format
      const visureTestCase = this.mapCanonicalTestCaseToVisure(testCase);
      
      // Create test case in Visure
      const createdTestCase = await this.client.createTestCase(projectId, visureTestCase);
      
      logger.info('Test case created successfully', { 
        projectId,
        testCaseId: createdTestCase.id,
        title: createdTestCase.title
      });
      
      return createdTestCase.id;
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
      logger.debug('Updating test steps in Visure Solutions', { 
        projectId,
        testCaseId,
        stepCount: steps.length
      });
      
      // Get existing test case
      const existingTestCase = await this.client.getTestCase(projectId, testCaseId, true, false);
      
      // Update with new steps
      const visureSteps = steps.map((step, index) => ({
        order: index + 1,
        action: step.description || '',
        expected: step.expectedResult || '',
        notes: step.notes || ''
      }));
      
      existingTestCase.steps = visureSteps;
      
      // Update test case with new steps
      await this.client.updateTestCase(projectId, testCaseId, existingTestCase);
      
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
    // Visure doesn't directly support test cycles as a concept
    throw new Error('Test cycle creation not supported by Visure Solutions provider');
  }
  
  /**
   * Create or update test executions
   */
  async createTestExecutions(projectId: string, testCycleId: string, executions: TestExecution[]): Promise<void> {
    // Visure doesn't directly support test executions as a concept
    throw new Error('Test execution creation not supported by Visure Solutions provider');
  }
  
  /**
   * Upload an attachment
   */
  async uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: AttachmentContent): Promise<string> {
    try {
      logger.debug('Uploading attachment to Visure Solutions', { 
        projectId,
        entityType,
        entityId,
        filename: attachment.filename,
        size: attachment.content.length
      });
      
      // Map entity type to Visure item type
      const itemType = entityType === EntityType.TEST_CASE ? 'testcase' : 
                      entityType === EntityType.FOLDER ? 'folder' : 'requirement';
      
      // Upload attachment
      const uploadedAttachment = await this.client.uploadAttachment(
        projectId,
        entityId,
        itemType,
        attachment.filename,
        attachment.content,
        attachment.contentType
      );
      
      logger.info('Attachment uploaded successfully', { 
        projectId,
        entityType,
        entityId,
        attachmentId: uploadedAttachment.id,
        filename: attachment.filename
      });
      
      return uploadedAttachment.id;
    } catch (error) {
      logger.error('Failed to upload attachment', { 
        projectId,
        entityType,
        entityId,
        filename: attachment.filename,
        error
      });
      throw error;
    }
  }
  
  /**
   * Create or update field definitions (if supported)
   */
  async createFieldDefinition(projectId: string, fieldDefinition: FieldDefinition): Promise<string> {
    // Field definition creation typically requires admin access in Visure
    throw new Error('Field definition creation not implemented for Visure Solutions provider');
  }
  
  /**
   * Get requirements for a project
   */
  async getRequirements(projectId: string, folderId?: string): Promise<Requirement[]> {
    try {
      logger.debug('Getting requirements from Visure Solutions', { 
        projectId,
        folderId
      });
      
      const visureRequirements = await this.client.getRequirements(
        projectId,
        folderId,
        true // Include trace links
      );
      
      logger.info(`Retrieved ${visureRequirements.length} requirements from Visure Solutions`, { 
        projectId,
        folderId
      });
      
      return visureRequirements;
    } catch (error) {
      logger.error('Failed to get requirements', { projectId, folderId, error });
      throw error;
    }
  }
  
  /**
   * Create a traceability link between a requirement and a test case
   */
  async createTraceabilityLink(projectId: string, requirementId: string, testCaseId: string, linkType: TraceabilityLinkType): Promise<TraceabilityLink> {
    try {
      logger.debug('Creating traceability link in Visure Solutions', { 
        projectId,
        requirementId,
        testCaseId,
        linkType
      });
      
      const link: TraceabilityLink = {
        sourceId: requirementId,
        targetId: testCaseId,
        linkType,
        direction: TraceDirection.FORWARD,
        description: `${linkType} relationship created by Skidbladnir`
      };
      
      const createdLink = await this.client.createTraceabilityLink(projectId, link);
      
      logger.info('Traceability link created successfully', { 
        projectId,
        requirementId,
        testCaseId,
        linkType
      });
      
      return createdLink;
    } catch (error) {
      logger.error('Failed to create traceability link', { 
        projectId,
        requirementId,
        testCaseId,
        linkType,
        error
      });
      throw error;
    }
  }
  
  /**
   * Generate a traceability matrix
   */
  async generateTraceabilityMatrix(projectId: string, filters?: Record<string, any>): Promise<any> {
    try {
      logger.debug('Generating traceability matrix in Visure Solutions', { 
        projectId,
        filters
      });
      
      const matrix = await this.client.generateTraceabilityMatrix(projectId, filters);
      
      logger.info('Traceability matrix generated successfully', { 
        projectId,
        rows: matrix.rows?.length,
        columns: matrix.columns?.length
      });
      
      return matrix;
    } catch (error) {
      logger.error('Failed to generate traceability matrix', { 
        projectId,
        filters,
        error
      });
      throw error;
    }
  }
  
  /**
   * Map Visure Solutions test case to canonical model
   */
  private mapVisureTestCaseToCanonical(visureTestCase: any): TestCase {
    // Map steps to canonical format
    const steps = visureTestCase.steps?.map(step => ({
      order: step.order || 0,
      description: step.action || '',
      expectedResult: step.expected || ''
    })) || [];
    
    // Extract requirements from trace links if available
    const requirementIds = visureTestCase.traceLinks
      ?.filter(link => link.targetId === visureTestCase.id && 
              ['VERIFIES', 'VALIDATES', 'IMPLEMENTS'].includes(link.linkType))
      .map(link => link.sourceId) || [];
    
    return {
      id: visureTestCase.id,
      title: visureTestCase.title || '',
      description: visureTestCase.description || '',
      status: this.mapVisureStatusToCanonical(visureTestCase.status),
      priority: this.mapVisurePriorityToCanonical(visureTestCase.priority),
      steps,
      tags: visureTestCase.tags || [],
      createdAt: new Date(visureTestCase.createdDate),
      updatedAt: new Date(visureTestCase.modifiedDate),
      attributes: {
        visureId: visureTestCase.id,
        visureIdentifier: visureTestCase.identifier || '',
        visureType: visureTestCase.type || 'Test Case',
        visureFolderId: visureTestCase.folderId,
        createdBy: visureTestCase.createdBy,
        modifiedBy: visureTestCase.modifiedBy,
        requirementIds,
        customFields: this.extractCustomFields(visureTestCase)
      }
    };
  }
  
  /**
   * Map canonical test case to Visure format
   */
  private mapCanonicalTestCaseToVisure(testCase: TestCase): any {
    // Map custom attributes if available
    const customFields = testCase.attributes?.customFields || {};
    
    // Map steps to Visure format
    const steps = testCase.steps?.map((step, index) => ({
      order: step.order || index + 1,
      action: step.description || '',
      expected: step.expectedResult || '',
      notes: ''
    })) || [];
    
    return {
      title: testCase.title,
      description: testCase.description || '',
      status: this.mapCanonicalStatusToVisure(testCase.status),
      priority: this.mapCanonicalPriorityToVisure(testCase.priority),
      steps,
      tags: testCase.tags || [],
      folderId: testCase.attributes?.visureFolderId || this.config.metadata?.defaultFolderId,
      type: testCase.attributes?.visureType || 'Test Case',
      // Include any custom fields
      ...customFields
    };
  }
  
  /**
   * Map Visure field to canonical field definition
   */
  private mapVisureFieldToCanonical(field: any, entityType: string): FieldDefinition {
    return {
      id: field.id,
      name: field.name,
      label: field.label || field.name,
      description: field.description || '',
      type: this.mapVisureFieldTypeToCanonical(field.type),
      required: field.required || false,
      readOnly: field.readOnly || false,
      entityType: entityType === 'requirement' ? EntityType.FIELD_DEFINITION : EntityType.TEST_CASE,
      allowedValues: field.allowedValues || [],
      defaultValue: field.defaultValue,
      attributes: {
        visureId: field.id,
        visureType: field.type,
        visureEntityType: entityType
      }
    };
  }
  
  /**
   * Extract custom fields from Visure object
   */
  private extractCustomFields(visureObject: any): Record<string, any> {
    // Extract custom fields - fields that are not standard
    const standardFields = [
      'id', 'title', 'description', 'status', 'priority', 'steps', 'tags',
      'createdBy', 'createdDate', 'modifiedBy', 'modifiedDate', 'identifier',
      'type', 'folderId', 'traceLinks'
    ];
    
    const customFields: Record<string, any> = {};
    
    Object.entries(visureObject).forEach(([key, value]) => {
      if (!standardFields.includes(key)) {
        customFields[key] = value;
      }
    });
    
    return customFields;
  }
  
  /**
   * Map Visure status to canonical status
   */
  private mapVisureStatusToCanonical(status?: string): any {
    if (!status) return 'DRAFT';
    
    // Map based on common Visure status values
    const statusMap: Record<string, string> = {
      'Draft': 'DRAFT',
      'In Progress': 'DRAFT',
      'Ready for Review': 'READY',
      'Reviewed': 'READY',
      'Approved': 'APPROVED',
      'Baselined': 'APPROVED',
      'Obsolete': 'DEPRECATED',
      'Deprecated': 'DEPRECATED'
    };
    
    return statusMap[status] || 'DRAFT';
  }
  
  /**
   * Map canonical status to Visure status
   */
  private mapCanonicalStatusToVisure(status?: string): string {
    if (!status) return 'Draft';
    
    // Map based on common Visure status values
    const statusMap: Record<string, string> = {
      'DRAFT': 'Draft',
      'READY': 'Ready for Review',
      'APPROVED': 'Approved',
      'DEPRECATED': 'Deprecated'
    };
    
    return statusMap[status] || 'Draft';
  }
  
  /**
   * Map Visure priority to canonical priority
   */
  private mapVisurePriorityToCanonical(priority?: string): string {
    if (!priority) return 'MEDIUM';
    
    // Map based on common Visure priority values
    const priorityMap: Record<string, string> = {
      'Critical': 'CRITICAL',
      'High': 'HIGH',
      'Medium': 'MEDIUM',
      'Low': 'LOW'
    };
    
    return priorityMap[priority] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to Visure priority
   */
  private mapCanonicalPriorityToVisure(priority?: string): string {
    if (!priority) return 'Medium';
    
    // Map based on common Visure priority values
    const priorityMap: Record<string, string> = {
      'CRITICAL': 'Critical',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low'
    };
    
    return priorityMap[priority] || 'Medium';
  }
  
  /**
   * Map Visure field type to canonical field type
   */
  private mapVisureFieldTypeToCanonical(type?: string): string {
    if (!type) return 'string';
    
    // Map based on common Visure field types
    const typeMap: Record<string, string> = {
      'text': 'string',
      'textarea': 'text',
      'number': 'number',
      'integer': 'integer',
      'date': 'date',
      'datetime': 'datetime',
      'boolean': 'boolean',
      'user': 'user',
      'enum': 'enum',
      'multi-enum': 'array'
    };
    
    return typeMap[type.toLowerCase()] || 'string';
  }
}

// Factory function to create an instance of the provider
export function createVisureProvider(config: VisureProviderConfig): VisureProvider {
  return new VisureProvider(config);
}