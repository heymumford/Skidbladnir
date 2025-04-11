/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Jama Software Provider
 * 
 * Implements the provider interface for Jama Software's test management system
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider } from '../../../pkg/interfaces/providers';
import { ErrorResponse, ProviderConnectionStatus, TestCase } from '../../../pkg/domain/entities';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { Identifier } from '../../../pkg/domain/value-objects/Identifier';
import * as logger from '../../../internal/typescript/common/logger/LoggerAdapter';

// Enum for Jama error categories
export enum JamaErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for Jama specific errors
export class JamaError extends Error {
  category: JamaErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: JamaErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'JamaError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static authentication(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.VALIDATION, details);
  }
  
  static rateLimit(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.RATE_LIMIT, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): JamaError {
    return new JamaError(message, JamaErrorCategory.UNKNOWN, details);
  }
}

// Configuration interface for Jama Provider
export interface JamaProviderConfig extends ProviderConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string; 
  refreshToken?: string;
  projectId?: number;
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
    defaultItemTypeId?: number; // Default item type ID to use when creating new test cases
    defaultParentId?: number; // Default parent ID for new items
    fieldMappings?: Record<string, string>; // Custom field mappings between canonical and Jama fields
    customFields?: Record<string, any>; // Default values for custom fields
  };
}

/**
 * Jama API Client for interacting with Jama REST API
 */
export class JamaClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private accessTokenExpiry: number | null = null;
  private refreshToken: string | null = null;
  private baseUrl: string;
  
  constructor(private config: JamaProviderConfig) {
    this.baseUrl = config.baseUrl;
    
    // Set initial tokens if provided
    if (config.accessToken) {
      this.accessToken = config.accessToken;
      // Set default expiry to 1 hour from now if not known
      this.accessTokenExpiry = Date.now() + 3600000;
    }
    
    if (config.refreshToken) {
      this.refreshToken = config.refreshToken;
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
      baseURL: `${config.baseUrl}/rest/v1`,
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
      // Refresh token if needed
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
    
    // If we have a refresh token, try to use it
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return;
      } catch (error) {
        logger.warn('Failed to refresh token with refresh token', { error });
        // Fall back to full authentication
      }
    }
    
    // If we have client credentials, use oauth client credentials flow
    if (this.config.clientId && this.config.clientSecret) {
      await this.authenticateWithClientCredentials();
      return;
    }
    
    // Otherwise, try password flow if credentials are provided
    if (this.config.username && this.config.password) {
      await this.authenticateWithPassword();
      return;
    }
    
    // If we get here and still don't have a valid token, throw an error
    if (!this.accessToken) {
      throw JamaError.authentication('No valid authentication method available. Please provide credentials, client ID/secret, or tokens.');
    }
  }
  
  /**
   * Authenticate with password flow
   */
  private async authenticateWithPassword(): Promise<void> {
    try {
      logger.debug('Authenticating with username and password');
      
      const tokenUrl = `${this.config.baseUrl}/rest/oauth/token`;
      
      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password
        },
        auth: {
          username: 'Jama API Client',
          password: ''
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.accessTokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      logger.debug('Successfully authenticated with password', { 
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      });
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Authenticate with client credentials flow
   */
  private async authenticateWithClientCredentials(): Promise<void> {
    try {
      logger.debug('Authenticating with client credentials');
      
      const tokenUrl = `${this.config.baseUrl}/rest/oauth/token`;
      
      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: 'client_credentials'
        },
        auth: {
          username: this.config.clientId,
          password: this.config.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.accessToken = response.data.access_token;
      this.accessTokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      // Client credentials flow may not return a refresh token
      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }
      
      logger.debug('Successfully authenticated with client credentials', { 
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      });
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      logger.debug('Refreshing access token');
      
      if (!this.refreshToken) {
        throw JamaError.authentication('No refresh token available');
      }
      
      const tokenUrl = `${this.config.baseUrl}/rest/oauth/token`;
      
      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        },
        auth: {
          username: this.config.clientId || 'Jama API Client',
          password: this.config.clientSecret || ''
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.accessTokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      logger.debug('Successfully refreshed access token', { 
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      });
    } catch (error) {
      // If refresh fails, clear tokens to force full authentication
      this.accessToken = null;
      this.refreshToken = null;
      this.accessTokenExpiry = null;
      
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Test connection to the Jama server
   */
  async testConnection(): Promise<{ connected: boolean }> {
    try {
      // Try to connect to the Jama server by fetching current user
      await this.ensureValidToken();
      const response = await this.axiosInstance.get('/users/current');
      
      return { connected: true };
    } catch (error) {
      // Handle connection errors
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get user information
   */
  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/users/current');
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all projects
   */
  async getProjects(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/projects');
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific project
   */
  async getProject(projectId: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all item types for a project
   */
  async getItemTypes(projectId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/itemtypes`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all items of a specific type in a project
   */
  async getItemsByType(projectId: number, itemTypeId: number): Promise<any[]> {
    try {
      // Jama API supports pagination
      const pageSize = this.config.batchSize || 50;
      let startAt = 0;
      let allItems: any[] = [];
      let hasMoreItems = true;
      
      while (hasMoreItems) {
        const response = await this.axiosInstance.get(`/items`, {
          params: {
            project: projectId,
            itemType: itemTypeId,
            startAt,
            maxResults: pageSize
          }
        });
        
        const items = response.data.data;
        allItems = allItems.concat(items);
        
        // Check if we've reached the end
        if (items.length < pageSize) {
          hasMoreItems = false;
        } else {
          startAt += pageSize;
        }
      }
      
      return allItems;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a specific item by ID
   */
  async getItem(itemId: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/items/${itemId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test case steps for a test case item
   */
  async getTestCaseSteps(itemId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/items/${itemId}/teststeps`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a new item (test case, requirement, etc.)
   */
  async createItem(projectId: number, itemTypeId: number, item: any): Promise<any> {
    try {
      const payload = {
        project: projectId,
        itemType: itemTypeId,
        ...item
      };
      
      const response = await this.axiosInstance.post(`/items`, payload);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create test steps for a test case
   */
  async createTestSteps(itemId: number, steps: any[]): Promise<any[]> {
    try {
      const response = await this.axiosInstance.post(`/items/${itemId}/teststeps`, {
        testSteps: steps
      });
      
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update an existing item
   */
  async updateItem(itemId: number, item: any): Promise<any> {
    try {
      const response = await this.axiosInstance.put(`/items/${itemId}`, item);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update test steps for a test case
   */
  async updateTestSteps(itemId: number, steps: any[]): Promise<any[]> {
    try {
      const response = await this.axiosInstance.put(`/items/${itemId}/teststeps`, {
        testSteps: steps
      });
      
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Delete an item
   */
  async deleteItem(itemId: number): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/items/${itemId}`);
      return true;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get relationships for an item
   */
  async getRelationships(itemId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/items/${itemId}/relationships`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a relationship between items
   */
  async createRelationship(fromItem: number, toItem: number, relationshipType: number): Promise<any> {
    try {
      const payload = {
        fromItem,
        toItem,
        relationshipType
      };
      
      const response = await this.axiosInstance.post(`/relationships`, payload);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get attachments for an item
   */
  async getAttachments(itemId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/items/${itemId}/attachments`);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Upload an attachment to an item
   */
  async uploadAttachment(itemId: number, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      // Create form data
      const formData = new FormData();
      const blob = new Blob([content], { type: contentType });
      formData.append('file', blob, filename);
      
      const response = await this.axiosInstance.post(`/items/${itemId}/attachments`, formData, {
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
   * Download an attachment
   */
  async downloadAttachment(attachmentId: number): Promise<{ content: Buffer, contentType: string }> {
    try {
      const response = await this.axiosInstance.get(`/attachments/${attachmentId}/file`, {
        responseType: 'arraybuffer'
      });
      
      return {
        content: Buffer.from(response.data),
        contentType: response.headers['content-type']
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get all test runs for a test case
   */
  async getTestRuns(testCaseId: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/testruns`, {
        params: {
          testCase: testCaseId
        }
      });
      
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a test run
   */
  async createTestRun(testCaseId: number, testRun: any): Promise<any> {
    try {
      const payload = {
        testCase: testCaseId,
        ...testRun
      };
      
      const response = await this.axiosInstance.post(`/testruns`, payload);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update a test run
   */
  async updateTestRun(testRunId: number, testRun: any): Promise<any> {
    try {
      const response = await this.axiosInstance.put(`/testruns/${testRunId}`, testRun);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Handle API errors and convert them to JamaError types
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = JamaErrorCategory.UNKNOWN;
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
        message = error.response.data?.meta?.message || 
                  error.response.data?.meta?.status?.message || 
                  error.response.data?.error_description || 
                  error.response.data?.error || 
                  error.message;
        
        // Categorize by status code
        if (statusCode === 401) {
          category = JamaErrorCategory.AUTHENTICATION;
          message = 'Authentication failed: ' + message;
        } else if (statusCode === 403) {
          category = JamaErrorCategory.AUTHORIZATION;
          message = 'Authorization failed: ' + message;
        } else if (statusCode === 404) {
          category = JamaErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
          
          // Provide more specific error messages based on the URL
          const url = error.config?.url || '';
          if (url.includes('/items/')) {
            const itemId = url.split('/items/')[1].split('/')[0];
            message = `Item not found: ${itemId}`;
          } else if (url.includes('/projects/')) {
            const projectId = url.split('/projects/')[1].split('/')[0];
            message = `Project not found: ${projectId}`;
          }
        } else if (statusCode === 400) {
          category = JamaErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
          
          // Extract field validation errors if available
          if (error.response.data?.meta?.field_errors) {
            details.fieldErrors = error.response.data.meta.field_errors;
            
            const fieldErrorMessages = Object.entries(error.response.data.meta.field_errors)
              .map(([field, errorMsg]) => `${field}: ${errorMsg}`)
              .join(', ');
            
            if (fieldErrorMessages) {
              message = `Validation failed: ${fieldErrorMessages}`;
            }
          }
        } else if (statusCode === 429) {
          category = JamaErrorCategory.RATE_LIMIT;
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
          category = JamaErrorCategory.SERVER_ERROR;
          
          // Provide specific messages for common server errors
          if (statusCode === 500) {
            message = 'Internal server error: ' + message;
          } else if (statusCode === 502) {
            message = 'Bad gateway: The Jama server is unreachable';
          } else if (statusCode === 503) {
            message = 'Service unavailable: The Jama server is temporarily unavailable';
          } else if (statusCode === 504) {
            message = 'Gateway timeout: The Jama server took too long to respond';
          } else {
            message = 'Server error: ' + message;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = JamaErrorCategory.NETWORK;
        
        // Provide more specific network error messages
        if (error.code === 'ECONNREFUSED') {
          message = 'Connection refused: The Jama server actively refused the connection';
          details.code = 'ECONNREFUSED';
        } else if (error.code === 'ECONNABORTED') {
          message = 'Connection aborted: The request was aborted due to a timeout';
          details.code = 'ECONNABORTED';
          details.timeout = error.config?.timeout;
        } else if (error.code === 'ENOTFOUND') {
          message = `DNS lookup failed: The hostname ${this.config.baseUrl} could not be resolved`;
          details.code = 'ENOTFOUND';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out: The Jama server took too long to establish a connection';
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
        category = JamaErrorCategory.UNKNOWN;
        message = 'Request setup error: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof JamaError) {
      // If it's already a JamaError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
      
      // Try to categorize common error patterns
      if (message.includes('timeout') || message.includes('timed out')) {
        category = JamaErrorCategory.NETWORK;
        message = 'Connection timed out: ' + message;
      } else if (message.includes('network') || message.includes('connection')) {
        category = JamaErrorCategory.NETWORK;
        message = 'Network error: ' + message;
      }
    }
    
    // Log the error with appropriate severity
    if (category === JamaErrorCategory.NETWORK || category === JamaErrorCategory.SERVER_ERROR) {
      logger.error(`Jama API Error: ${message}`, { category, statusCode, error });
    } else if (category === JamaErrorCategory.AUTHENTICATION || category === JamaErrorCategory.AUTHORIZATION) {
      logger.warn(`Jama API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`Jama API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case JamaErrorCategory.AUTHENTICATION:
        throw JamaError.authentication(message, details);
      case JamaErrorCategory.AUTHORIZATION:
        throw JamaError.authorization(message, details);
      case JamaErrorCategory.NETWORK:
        throw JamaError.network(message, details);
      case JamaErrorCategory.RESOURCE_NOT_FOUND:
        throw JamaError.resourceNotFound(message, details);
      case JamaErrorCategory.VALIDATION:
        throw JamaError.validation(message, details);
      case JamaErrorCategory.RATE_LIMIT:
        throw JamaError.rateLimit(message, details);
      case JamaErrorCategory.SERVER_ERROR:
        throw JamaError.serverError(message, details);
      default:
        throw JamaError.unknown(message, details);
    }
  }
}

/**
 * Main Jama Provider implementation
 */
export class JamaProvider implements SourceProvider, TargetProvider {
  private client: JamaClient;
  private resilientClient: ResilientApiClient;
  private testCaseTypeId: number | null = null;
  
  constructor(private config: JamaProviderConfig) {
    this.client = new JamaClient(config);
    
    // Create resilient client for API calls
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl,
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3
    });
    
    logger.debug('Jama Provider initialized', { baseUrl: config.baseUrl, projectId: config.projectId });
  }
  
  /**
   * Get provider name
   */
  getName(): string {
    return 'Jama Software';
  }
  
  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<ProviderConnectionStatus> {
    try {
      logger.debug('Testing connection to Jama', { baseUrl: this.config.baseUrl });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to Jama', { baseUrl: this.config.baseUrl });
      
      return {
        connected: result.connected,
        provider: this.getName(),
        details: {
          baseUrl: this.config.baseUrl,
          projectId: this.config.projectId
        }
      };
    } catch (error) {
      logger.error('Failed to connect to Jama', { error, baseUrl: this.config.baseUrl });
      
      return {
        connected: false,
        provider: this.getName(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof JamaError ? error.category : JamaErrorCategory.UNKNOWN,
          baseUrl: this.config.baseUrl
        }
      };
    }
  }
  
  /**
   * Get projects available in Jama
   */
  async getProjects(): Promise<any[]> {
    try {
      logger.debug('Getting projects from Jama');
      
      const projects = await this.client.getProjects();
      
      logger.debug(`Found ${projects.length} projects in Jama`);
      
      return projects;
    } catch (error) {
      logger.error('Failed to get projects', { error });
      throw error;
    }
  }
  
  /**
   * Get item types for a project
   */
  async getItemTypes(projectId?: number): Promise<any[]> {
    try {
      const pId = projectId || this.config.projectId;
      
      if (!pId) {
        throw JamaError.validation('Project ID is required to get item types', {});
      }
      
      logger.debug('Getting item types from Jama', { projectId: pId });
      
      const types = await this.client.getItemTypes(pId);
      
      logger.debug(`Found ${types.length} item types in project ${pId}`);
      
      return types;
    } catch (error) {
      logger.error('Failed to get item types', { 
        projectId: projectId || this.config.projectId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Find the test case type ID for a project
   */
  private async findTestCaseTypeId(projectId: number): Promise<number> {
    // Return cached value if available
    if (this.testCaseTypeId !== null) {
      return this.testCaseTypeId;
    }
    
    // Get item types from the project
    const itemTypes = await this.client.getItemTypes(projectId);
    
    // Find the test case type
    // Jama typically has a type named "Test Case" or similar
    const testCaseType = itemTypes.find(type => 
      type.name.toLowerCase().includes('test case') || 
      type.typeKey.toLowerCase().includes('testcase')
    );
    
    if (!testCaseType) {
      throw JamaError.validation('Could not find test case type in project', {
        projectId,
        availableTypes: itemTypes.map(t => ({ id: t.id, name: t.name }))
      });
    }
    
    // Cache the found type ID
    this.testCaseTypeId = testCaseType.id;
    
    return testCaseType.id;
  }
  
  /**
   * Get test cases from Jama
   */
  async getTestCases(parentId?: string): Promise<TestCase[]> {
    try {
      if (!this.config.projectId) {
        throw JamaError.validation('Project ID is required to get test cases', {});
      }
      
      // Find test case type ID if not explicitly provided
      const typeId = this.config.metadata?.defaultItemTypeId || 
        await this.findTestCaseTypeId(this.config.projectId);
      
      logger.debug('Getting test cases from Jama', { 
        projectId: this.config.projectId,
        typeId,
        parentId
      });
      
      // Get items from Jama
      const items = await this.client.getItemsByType(this.config.projectId, typeId);
      
      // Filter by parent ID if provided
      const filteredItems = parentId ? 
        items.filter(item => item.parentId === parseInt(parentId, 10)) : 
        items;
      
      // Convert to canonical model
      const testCases = await Promise.all(
        filteredItems.map(async (item) => {
          // Get test steps
          const steps = await this.client.getTestCaseSteps(item.id);
          
          // Convert to canonical test case
          return this.convertToCanonicalTestCase(item, steps);
        })
      );
      
      logger.info(`Retrieved ${testCases.length} test cases from Jama`);
      
      return testCases;
    } catch (error) {
      logger.error('Failed to get test cases', { 
        projectId: this.config.projectId,
        parentId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Get a test case by ID
   */
  async getTestCase(id: string): Promise<TestCase> {
    try {
      const itemId = parseInt(id, 10);
      
      logger.debug('Getting test case from Jama', { id: itemId });
      
      // Get the item from Jama
      const item = await this.client.getItem(itemId);
      
      // Get test steps
      const steps = await this.client.getTestCaseSteps(itemId);
      
      // Convert to canonical test case
      const testCase = this.convertToCanonicalTestCase(item, steps);
      
      return testCase;
    } catch (error) {
      logger.error('Failed to get test case', { id, error });
      throw error;
    }
  }
  
  /**
   * Create a new test case
   */
  async createTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      if (!this.config.projectId) {
        throw JamaError.validation('Project ID is required to create a test case', {});
      }
      
      // Find test case type ID if not explicitly provided
      const typeId = this.config.metadata?.defaultItemTypeId || 
        await this.findTestCaseTypeId(this.config.projectId);
      
      logger.debug('Creating test case in Jama', { 
        name: testCase.name,
        projectId: this.config.projectId,
        typeId
      });
      
      // Convert to Jama format
      const jamaItem = this.convertFromCanonicalTestCase(testCase);
      
      // Create item in Jama
      const createdItem = await this.client.createItem(
        this.config.projectId,
        typeId,
        jamaItem
      );
      
      // Create test steps if available
      if (testCase.steps && testCase.steps.length > 0) {
        const jamaSteps = testCase.steps.map((step, index) => ({
          action: step.action || '',
          expectedResult: step.expected || '',
          notes: '',
          sequence: index + 1
        }));
        
        await this.client.createTestSteps(createdItem.id, jamaSteps);
      }
      
      // Get the created item with steps
      const item = await this.client.getItem(createdItem.id);
      const steps = await this.client.getTestCaseSteps(createdItem.id);
      
      // Convert back to canonical
      const createdTestCase = this.convertToCanonicalTestCase(item, steps);
      
      logger.info('Test case created successfully', { 
        id: createdItem.id, 
        name: createdItem.fields.name 
      });
      
      return createdTestCase;
    } catch (error) {
      logger.error('Failed to create test case', { 
        name: testCase.name,
        error
      });
      throw error;
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(testCase: TestCase): Promise<TestCase> {
    try {
      const itemId = parseInt(testCase.id.value, 10);
      
      logger.debug('Updating test case in Jama', { id: itemId, name: testCase.name });
      
      // Convert to Jama format
      const jamaItem = this.convertFromCanonicalTestCase(testCase);
      
      // Update item in Jama
      const updatedItem = await this.client.updateItem(itemId, jamaItem);
      
      // Update test steps if available
      if (testCase.steps && testCase.steps.length > 0) {
        const jamaSteps = testCase.steps.map((step, index) => ({
          action: step.action || '',
          expectedResult: step.expected || '',
          notes: '',
          sequence: index + 1
        }));
        
        await this.client.updateTestSteps(itemId, jamaSteps);
      }
      
      // Get the updated item with steps
      const item = await this.client.getItem(itemId);
      const steps = await this.client.getTestCaseSteps(itemId);
      
      // Convert back to canonical
      const updatedTestCase = this.convertToCanonicalTestCase(item, steps);
      
      logger.info('Test case updated successfully', { 
        id: itemId, 
        name: updatedItem.fields.name 
      });
      
      return updatedTestCase;
    } catch (error) {
      logger.error('Failed to update test case', { 
        id: testCase.id.value, 
        name: testCase.name,
        error
      });
      throw error;
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(id: string): Promise<boolean> {
    try {
      const itemId = parseInt(id, 10);
      
      logger.debug('Deleting test case from Jama', { id: itemId });
      
      // Delete the item
      const result = await this.client.deleteItem(itemId);
      
      logger.info('Test case deleted successfully', { id: itemId });
      
      return result;
    } catch (error) {
      logger.error('Failed to delete test case', { id, error });
      throw error;
    }
  }
  
  /**
   * Create a relationship between items
   */
  async createRelationship(fromItemId: string, toItemId: string, relationshipType: string): Promise<any> {
    try {
      const fromId = parseInt(fromItemId, 10);
      const toId = parseInt(toItemId, 10);
      
      // Map relationship type string to ID
      // This is typically defined in the Jama instance
      // For simplicity, we use a default relationship type ID of 1
      const relationshipTypeId = 1;
      
      logger.debug('Creating relationship in Jama', { 
        fromId, 
        toId, 
        relationshipType 
      });
      
      const result = await this.client.createRelationship(fromId, toId, relationshipTypeId);
      
      logger.info('Relationship created successfully', { id: result.id });
      
      return result;
    } catch (error) {
      logger.error('Failed to create relationship', { 
        fromItemId, 
        toItemId, 
        relationshipType,
        error
      });
      throw error;
    }
  }
  
  /**
   * Get attachments for a test case
   */
  async getAttachments(testCaseId: string): Promise<any[]> {
    try {
      const itemId = parseInt(testCaseId, 10);
      
      logger.debug('Getting attachments for test case', { testCaseId: itemId });
      
      // Get attachments from Jama
      const attachments = await this.client.getAttachments(itemId);
      
      logger.debug(`Found ${attachments.length} attachments`, { testCaseId: itemId });
      
      return attachments;
    } catch (error) {
      logger.error('Failed to get attachments', { testCaseId, error });
      throw error;
    }
  }
  
  /**
   * Get a specific attachment
   */
  async getAttachment(testCaseId: string, attachmentId: string): Promise<{ content: Buffer, contentType: string }> {
    try {
      const itemId = parseInt(testCaseId, 10);
      const attId = parseInt(attachmentId, 10);
      
      logger.debug('Getting attachment', { testCaseId: itemId, attachmentId: attId });
      
      // Get attachment from Jama
      const attachment = await this.client.downloadAttachment(attId);
      
      return attachment;
    } catch (error) {
      logger.error('Failed to get attachment', { testCaseId, attachmentId, error });
      throw error;
    }
  }
  
  /**
   * Upload an attachment to a test case
   */
  async uploadAttachment(testCaseId: string, filename: string, content: Buffer, contentType: string): Promise<any> {
    try {
      const itemId = parseInt(testCaseId, 10);
      
      logger.debug('Uploading attachment', { 
        testCaseId: itemId, 
        filename, 
        contentType, 
        size: content.length 
      });
      
      // Upload attachment to Jama
      const result = await this.client.uploadAttachment(itemId, filename, content, contentType);
      
      logger.info('Attachment uploaded successfully', { testCaseId, filename });
      
      return result;
    } catch (error) {
      logger.error('Failed to upload attachment', { testCaseId, filename, error });
      throw error;
    }
  }
  
  /**
   * Create a test run
   */
  async createTestRun(testCaseId: string, status: string, result: string): Promise<any> {
    try {
      const itemId = parseInt(testCaseId, 10);
      
      logger.debug('Creating test run', { 
        testCaseId: itemId, 
        status, 
        result 
      });
      
      // Map status to Jama test run status
      const statusId = this.mapToJamaStatusId(status);
      
      // Create test run
      const testRun = {
        status: statusId,
        result,
        note: `Created by Skidbladnir on ${new Date().toISOString()}`
      };
      
      const createdRun = await this.client.createTestRun(itemId, testRun);
      
      logger.info('Test run created successfully', { id: createdRun.id });
      
      return createdRun;
    } catch (error) {
      logger.error('Failed to create test run', { testCaseId, status, error });
      throw error;
    }
  }
  
  /**
   * Convert Jama item to canonical test case model
   */
  private convertToCanonicalTestCase(jamaItem: any, steps: any[] = []): TestCase {
    // Map steps to canonical format
    const canonicalSteps = steps.map(step => ({
      action: step.fields.action || '',
      expected: step.fields.expectedResult || ''
    }));
    
    // Create canonical test case
    return {
      id: new Identifier(jamaItem.id.toString()),
      name: jamaItem.fields.name || '',
      description: jamaItem.fields.description || '',
      steps: canonicalSteps,
      status: this.mapFromJamaStatus(jamaItem.fields.status),
      priority: this.mapFromJamaPriority(jamaItem.fields.priority),
      // Map additional fields as needed
      metadata: {
        originalProvider: 'Jama Software',
        jamaFields: { ...jamaItem.fields },
        projectId: jamaItem.project,
        parentId: jamaItem.parent ? jamaItem.parent.toString() : null,
        documentKey: jamaItem.documentKey,
        globalId: jamaItem.globalId,
        itemType: jamaItem.itemType,
        createdBy: jamaItem.createdBy,
        createdDate: jamaItem.createdDate,
        modifiedBy: jamaItem.modifiedBy,
        modifiedDate: jamaItem.modifiedDate
      }
    };
  }
  
  /**
   * Convert canonical test case to Jama format
   */
  private convertFromCanonicalTestCase(testCase: TestCase): any {
    // Create fields object for Jama
    const fields: Record<string, any> = {
      name: testCase.name,
      description: testCase.description,
      // Map status and priority if available
      status: this.mapToJamaStatus(testCase.status),
      priority: this.mapToJamaPriority(testCase.priority)
    };
    
    // Add parent ID if specified
    const parentId = testCase.metadata?.parentId || this.config.metadata?.defaultParentId;
    if (parentId) {
      fields.parent = parentId;
    }
    
    // Include any custom fields from metadata if available
    if (testCase.metadata?.jamaFields) {
      // Filter out fields we've already handled
      const customFields = { ...testCase.metadata.jamaFields };
      ['name', 'description', 'status', 'priority', 'parent'].forEach(key => {
        delete customFields[key];
      });
      
      // Add remaining custom fields
      Object.assign(fields, customFields);
    }
    
    // Include any custom fields from config if available
    if (this.config.metadata?.customFields) {
      Object.assign(fields, this.config.metadata.customFields);
    }
    
    // Return Jama item format
    return {
      fields
    };
  }
  
  /**
   * Map Jama status to canonical status
   */
  private mapFromJamaStatus(jamaStatus?: string): string {
    if (!jamaStatus) return 'OPEN';
    
    // Default mapping based on common Jama status values
    const statusMap: Record<string, string> = {
      'Draft': 'DRAFT',
      'Approved': 'APPROVED',
      'In Progress': 'IN_PROGRESS',
      'Complete': 'COMPLETE',
      'Review': 'REVIEW',
      'Passed': 'PASSED',
      'Failed': 'FAILED',
      'Not Run': 'NOT_RUN',
      'Not Applicable': 'NOT_APPLICABLE',
      'Blocked': 'BLOCKED'
    };
    
    return statusMap[jamaStatus] || 'OPEN';
  }
  
  /**
   * Map canonical status to Jama status
   */
  private mapToJamaStatus(status?: string): string {
    if (!status) return 'Draft';
    
    // Default mapping based on common Jama status values
    const statusMap: Record<string, string> = {
      'DRAFT': 'Draft',
      'APPROVED': 'Approved',
      'IN_PROGRESS': 'In Progress',
      'COMPLETE': 'Complete',
      'REVIEW': 'Review',
      'PASSED': 'Passed',
      'FAILED': 'Failed',
      'NOT_RUN': 'Not Run',
      'NOT_APPLICABLE': 'Not Applicable',
      'BLOCKED': 'Blocked',
      'OPEN': 'Draft'
    };
    
    return statusMap[status] || 'Draft';
  }
  
  /**
   * Map Jama status to Jama status ID (for test runs)
   */
  private mapToJamaStatusId(status: string): number {
    // Default mapping based on common Jama status values
    // These IDs may vary between Jama instances
    const statusIdMap: Record<string, number> = {
      'DRAFT': 1,
      'APPROVED': 2,
      'IN_PROGRESS': 3,
      'COMPLETE': 4,
      'REVIEW': 5,
      'PASSED': 6,
      'FAILED': 7,
      'NOT_RUN': 8,
      'NOT_APPLICABLE': 9,
      'BLOCKED': 10
    };
    
    return statusIdMap[status] || 1;
  }
  
  /**
   * Map Jama priority to canonical priority
   */
  private mapFromJamaPriority(jamaPriority?: string): string {
    if (!jamaPriority) return 'MEDIUM';
    
    // Default mapping based on common Jama priority values
    const priorityMap: Record<string, string> = {
      'Critical': 'CRITICAL',
      'High': 'HIGH',
      'Medium': 'MEDIUM',
      'Low': 'LOW'
    };
    
    return priorityMap[jamaPriority] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to Jama priority
   */
  private mapToJamaPriority(priority?: string): string {
    if (!priority) return 'Medium';
    
    // Default mapping based on common Jama priority values
    const priorityMap: Record<string, string> = {
      'CRITICAL': 'Critical',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low',
      'TRIVIAL': 'Low'
    };
    
    return priorityMap[priority] || 'Medium';
  }
}

// Factory function to create an instance of the provider
export function createJamaProvider(config: JamaProviderConfig): JamaProvider {
  return new JamaProvider(config);
}