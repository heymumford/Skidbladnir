/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Rally Provider
 * 
 * Implements the provider interface for Rally (formerly CA Agile Central) test management
 * with specific support for rate limiting to comply with API constraints.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProviderConfig, SourceProvider, TargetProvider, ConnectionStatus, EntityType } from '../../../packages/common/src/interfaces/provider';
import { Project, TestCase, Folder, TestCycle, TestExecution, Attachment } from '../../../packages/common/src/models/entities';
import { FieldDefinition } from '../../../packages/common/src/models/field-definition';
import { AttachmentContent } from '../../../packages/common/src/models/attachment';
import { PaginatedResult } from '../../../packages/common/src/models/paginated';
import { ResilientApiClient } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { defaultLogger as logger } from '../../../packages/common/src/utils/logger';

// Enum for Rally error categories
export enum RallyErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

// Custom error class for Rally specific errors
export class RallyError extends Error {
  category: RallyErrorCategory;
  details?: Record<string, any>;
  statusCode?: number;
  
  constructor(message: string, category: RallyErrorCategory, details?: Record<string, any>) {
    super(message);
    this.name = 'RallyError';
    this.category = category;
    this.details = details;
    this.statusCode = details?.statusCode;
  }
  
  // Factory methods for creating specific error types
  static rateLimit(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.RATE_LIMIT, details);
  }
  
  static authentication(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.AUTHENTICATION, details);
  }
  
  static authorization(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.AUTHORIZATION, details);
  }
  
  static network(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.NETWORK, details);
  }
  
  static resourceNotFound(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.RESOURCE_NOT_FOUND, details);
  }
  
  static validation(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.VALIDATION, details);
  }
  
  static serverError(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.SERVER_ERROR, details);
  }
  
  static unknown(message: string, details?: Record<string, any>): RallyError {
    return new RallyError(message, RallyErrorCategory.UNKNOWN, details);
  }
}

// Configuration interface for Rally Provider
export interface RallyProviderConfig extends ProviderConfig {
  // Authentication options
  apiKey?: string;
  username?: string;
  password?: string;
  // Connection options
  workspace?: string; 
  project?: string;
  baseUrl?: string;
  apiVersion?: string;
  proxyUrl?: string;
  connectionTimeout?: number;
  maxRetries?: number;
  // Rate limiting options
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  maxConcurrentRequests?: number;
  retryAfterRateLimit?: boolean;
  retryDelayMs?: number;
  // Additional metadata
  metadata?: {
    defaultFolder?: string;
    fieldMappings?: Record<string, string>;
  };
}

/**
 * Rate Limiter class for Rally API
 * 
 * Handles rate limiting for the Rally API to prevent 429 Too Many Requests errors
 * Based on token bucket algorithm with configurable rate limits.
 */
export class RallyRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private tokensPerInterval: number;
  private intervalMs: number;
  private queue: Array<{
    resolve: (value: boolean) => void;
    reject: (reason: any) => void;
  }> = [];
  private activeRequests = 0;
  private maxConcurrentRequests: number;
  private enabled = true;
  
  constructor(
    requestsPerInterval = 5, 
    intervalMs = 1000, 
    maxConcurrentRequests = 3
  ) {
    this.tokens = requestsPerInterval;
    this.maxTokens = requestsPerInterval;
    this.tokensPerInterval = requestsPerInterval;
    this.intervalMs = intervalMs;
    this.lastRefill = Date.now();
    this.maxConcurrentRequests = maxConcurrentRequests;
    
    logger.debug('Rally Rate Limiter initialized', {
      requestsPerInterval,
      intervalMs,
      maxConcurrentRequests
    });
  }
  
  /**
   * Enable or disable the rate limiter
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Check if the rate limiter is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Update rate limiter configuration
   */
  updateConfig(
    requestsPerInterval?: number, 
    intervalMs?: number, 
    maxConcurrentRequests?: number
  ): void {
    if (requestsPerInterval !== undefined) {
      this.maxTokens = requestsPerInterval;
      this.tokensPerInterval = requestsPerInterval;
    }
    
    if (intervalMs !== undefined) {
      this.intervalMs = intervalMs;
    }
    
    if (maxConcurrentRequests !== undefined) {
      this.maxConcurrentRequests = maxConcurrentRequests;
    }
    
    logger.debug('Rally Rate Limiter updated', {
      requestsPerInterval: this.tokensPerInterval,
      intervalMs: this.intervalMs,
      maxConcurrentRequests: this.maxConcurrentRequests
    });
  }
  
  /**
   * Refill tokens based on time elapsed since last refill
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeElapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timeElapsed / this.intervalMs * this.tokensPerInterval);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  /**
   * Get current token count (for testing)
   */
  getTokenCount(): number {
    this.refillTokens();
    return this.tokens;
  }
  
  /**
   * Get current active requests count (for testing)
   */
  getActiveRequestsCount(): number {
    return this.activeRequests;
  }
  
  /**
   * Get current queue length (for testing)
   */
  getQueueLength(): number {
    return this.queue.length;
  }
  
  /**
   * Process queue - check if there are any requests waiting that can now be processed
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;
    
    if (this.tokens > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const next = this.queue.shift();
      if (next) {
        this.tokens--;
        this.activeRequests++;
        next.resolve(true);
      }
    }
  }
  
  /**
   * Acquire permission to make a request
   * Returns a promise that resolves when a request can be made
   * Rejects if timeout is reached
   */
  async acquireToken(timeoutMs = 30000): Promise<boolean> {
    // If rate limiting is disabled, immediately allow the request
    if (!this.enabled) {
      this.activeRequests++;
      return Promise.resolve(true);
    }
    
    this.refillTokens();
    
    // If we have tokens and not too many concurrent requests, immediately allow
    if (this.tokens > 0 && this.activeRequests < this.maxConcurrentRequests) {
      this.tokens--;
      this.activeRequests++;
      return Promise.resolve(true);
    }
    
    // Otherwise, add to queue and wait
    return new Promise<boolean>((resolve, reject) => {
      const queueItem = { resolve, reject };
      this.queue.push(queueItem);
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        const index = this.queue.indexOf(queueItem);
        if (index >= 0) {
          this.queue.splice(index, 1);
          reject(new Error('Rate limit timeout exceeded'));
        }
      }, timeoutMs);
      
      // Cleanup timeout when resolved
      const originalResolve = resolve;
      queueItem.resolve = (value) => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };
    });
  }
  
  /**
   * Release a token after a request is complete
   */
  releaseToken(): void {
    if (!this.enabled) {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      return;
    }
    
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.processQueue();
  }
}

/**
 * Rally API Client for interacting with Rally REST API
 */
export class RallyClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private apiVersion: string;
  private rateLimiter: RallyRateLimiter;
  private apiKey: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private workspace: string;
  private project: string;
  
  constructor(private config: RallyProviderConfig) {
    this.workspace = config.workspace || '';
    this.project = config.project || '';
    this.apiVersion = config.apiVersion || 'v2.0';
    
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    } else if (config.username && config.password) {
      this.username = config.username;
      this.password = config.password;
    }
    
    // Set base URL (default to Rally's public instance)
    this.baseUrl = config.baseUrl || 'https://rally1.rallydev.com/slm/webservice';
    
    // Create rate limiter
    const requestsPerSecond = config.requestsPerSecond || 5;
    const requestsPerMinute = config.requestsPerMinute || 180;
    
    // Use the more restrictive of the two rate limits
    const effectiveRequests = Math.min(requestsPerSecond, requestsPerMinute / 60);
    
    this.rateLimiter = new RallyRateLimiter(
      effectiveRequests,
      1000, // 1 second interval
      config.maxConcurrentRequests || 3
    );
    
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
      baseURL: `${this.baseUrl}/${this.apiVersion}`,
      timeout: config.connectionTimeout || 30000,
      headers,
      proxy: proxyConfig
    });
    
    // Add request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      try {
        // Wait for rate limiter to allow the request
        await this.rateLimiter.acquireToken(config.timeout || 30000);
        
        // Add authentication header
        if (this.apiKey) {
          config.headers['zsApiKey'] = this.apiKey;
        } else if (this.username && this.password) {
          const token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${token}`;
        }
        
        // Log request (sanitized)
        logger.debug('Sending request to Rally API', { 
          method: config.method, 
          url: config.url,
          params: config.params
        });
        
        return config;
      } catch (error) {
        logger.error('Failed to acquire rate limit token', { error });
        return Promise.reject(error);
      }
    });
    
    // Add response interceptor for rate limit handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Release rate limit token
        this.rateLimiter.releaseToken();
        
        // Log success response
        logger.debug('Rally API response received', {
          status: response.status,
          url: response.config.url
        });
        
        return response;
      },
      (error) => {
        // Release rate limit token
        this.rateLimiter.releaseToken();
        
        // Handle response error, especially rate limits
        return this.handleApiError(error);
      }
    );
  }
  
  /**
   * Get rate limiter instance for testing
   */
  getRateLimiter(): RallyRateLimiter {
    return this.rateLimiter;
  }
  
  /**
   * Test connection to Rally
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test connection by getting subscription information
      await this.getSubscription();
      return true;
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    }
  }
  
  /**
   * Get subscription information
   */
  async getSubscription(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/subscription');
      return response.data.Subscription;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get workspace information
   */
  async getWorkspace(workspaceId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/workspace/${workspaceId}`);
      return response.data.Workspace;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get workspaces
   */
  async getWorkspaces(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/workspaces');
      return response.data.Results;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get projects within a workspace
   */
  async getProjects(workspaceId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/workspace/${workspaceId}/projects`);
      return response.data.Results;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get test cases within a project
   */
  async getTestCases(projectId: string, query?: string, start?: number, pageSize?: number): Promise<any> {
    try {
      const params: Record<string, any> = {
        project: `/project/${projectId}`
      };
      
      if (query) {
        params.query = query;
      }
      
      if (start !== undefined) {
        params.start = start;
      }
      
      if (pageSize !== undefined) {
        params.pageSize = pageSize;
      }
      
      const response = await this.axiosInstance.get('/testcase', { params });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Get a single test case by ID
   */
  async getTestCase(testCaseId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/testcase/${testCaseId}`);
      return response.data.TestCase;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Create a test case
   */
  async createTestCase(workspaceId: string, projectId: string, testCase: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/testcase/create', {
        TestCase: {
          ...testCase,
          Workspace: `/workspace/${workspaceId}`,
          Project: `/project/${projectId}`
        }
      });
      
      return response.data.CreateResult;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Update a test case
   */
  async updateTestCase(testCaseId: string, updates: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`/testcase/${testCaseId}`, {
        TestCase: updates
      });
      
      return response.data.OperationResult;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Handle API errors with specific handling for rate limits
   */
  private handleApiError(error: any): never {
    // Default error information
    let message = 'Unknown error occurred';
    let category = RallyErrorCategory.UNKNOWN;
    let statusCode = 0;
    const details: Record<string, any> = {};
    
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      if (error.response) {
        // The request was made and the server responded with a status code
        statusCode = error.response.status;
        details.data = error.response.data;
        details.headers = error.response.headers;
        
        // Extract error message from response if available
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            message = error.response.data;
          } else if (error.response.data.message) {
            message = error.response.data.message;
          } else if (error.response.data.errors && error.response.data.errors.length > 0) {
            message = error.response.data.errors.join(', ');
          }
        } else {
          message = error.message;
        }
        
        // Categorize by status code with special handling for rate limits
        if (statusCode === 429) {
          category = RallyErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded. Too many requests to Rally API.';
          
          // Extract retry-after header if available
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            details.retryAfter = retryAfter;
            message += ` Try again after ${retryAfter} seconds.`;
          }
          
          logger.warn('Rally API rate limit exceeded', { 
            retryAfter,
            details: error.response.data
          });
        } else if (statusCode === 401) {
          category = RallyErrorCategory.AUTHENTICATION;
          message = 'Authentication failed: ' + message;
        } else if (statusCode === 403) {
          category = RallyErrorCategory.AUTHORIZATION;
          message = 'Authorization failed: ' + message;
        } else if (statusCode === 404) {
          category = RallyErrorCategory.RESOURCE_NOT_FOUND;
          message = 'Resource not found: ' + message;
        } else if (statusCode === 400) {
          category = RallyErrorCategory.VALIDATION;
          message = 'Validation failed: ' + message;
        } else if (statusCode >= 500) {
          category = RallyErrorCategory.SERVER_ERROR;
          message = 'Server error: ' + message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        category = RallyErrorCategory.NETWORK;
        message = 'Network error: ' + error.message;
        details.request = error.request;
      } else {
        // Something happened in setting up the request
        category = RallyErrorCategory.UNKNOWN;
        message = 'Error setting up request: ' + error.message;
      }
      
      // Include additional error details
      details.statusCode = statusCode;
      details.originalError = error;
      details.url = error.config?.url;
      details.method = error.config?.method;
    } else if (error instanceof RallyError) {
      // If it's already a RallyError, just re-throw it
      throw error;
    } else if (error instanceof Error) {
      // For generic errors
      message = error.message;
      details.originalError = error;
    }
    
    // Log the error with appropriate severity
    if (category === RallyErrorCategory.NETWORK || category === RallyErrorCategory.SERVER_ERROR) {
      logger.error(`Rally API Error: ${message}`, { category, statusCode, error });
    } else if (category === RallyErrorCategory.AUTHENTICATION || category === RallyErrorCategory.AUTHORIZATION) {
      logger.warn(`Rally API Error: ${message}`, { category, statusCode });
    } else {
      logger.debug(`Rally API Error: ${message}`, { category, statusCode });
    }
    
    // Create and throw the appropriate error based on category
    switch (category) {
      case RallyErrorCategory.RATE_LIMIT:
        throw RallyError.rateLimit(message, details);
      case RallyErrorCategory.AUTHENTICATION:
        throw RallyError.authentication(message, details);
      case RallyErrorCategory.AUTHORIZATION:
        throw RallyError.authorization(message, details);
      case RallyErrorCategory.NETWORK:
        throw RallyError.network(message, details);
      case RallyErrorCategory.RESOURCE_NOT_FOUND:
        throw RallyError.resourceNotFound(message, details);
      case RallyErrorCategory.VALIDATION:
        throw RallyError.validation(message, details);
      case RallyErrorCategory.SERVER_ERROR:
        throw RallyError.serverError(message, details);
      default:
        throw RallyError.unknown(message, details);
    }
  }
}

/**
 * Rally Provider implementation
 */
export class RallyProvider implements SourceProvider, TargetProvider {
  private id = 'rally';
  private name = 'Rally';
  private version = '1.0.0';
  private client: RallyClient;
  private resilientClient: ResilientApiClient;
  
  constructor(private config: RallyProviderConfig) {
    this.client = new RallyClient(config);
    
    // Create resilient client for API calls with rate limiting awareness
    this.resilientClient = new ResilientApiClient({
      baseURL: config.baseUrl || 'https://rally1.rallydev.com/slm/webservice',
      timeout: config.connectionTimeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelayMs || 1000,
      retryCondition: (error) => {
        // Retry on network errors, 5xx server errors and rate limits (429)
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          return (
            status >= 500 || 
            status === 429 || 
            !error.response
          );
        }
        return false;
      }
    });
    
    logger.debug('Rally Provider initialized', { 
      workspace: config.workspace, 
      project: config.project
    });
  }
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    if (config) {
      // Cast and merge configs
      this.config = { ...this.config, ...config as RallyProviderConfig };
      this.client = new RallyClient(this.config);
    }
  }
  
  /**
   * Get provider ID
   */
  getId(): string {
    return this.id;
  }
  
  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get provider version
   */
  getVersion(): string {
    return this.version;
  }
  
  /**
   * Get rate limiter for testing
   */
  getRateLimiter(): RallyRateLimiter {
    return this.client.getRateLimiter();
  }
  
  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      logger.debug('Testing connection to Rally', { 
        workspace: this.config.workspace,
        project: this.config.project
      });
      
      // Test connection using client
      const result = await this.client.testConnection();
      
      logger.info('Successfully connected to Rally', { 
        workspace: this.config.workspace,
        project: this.config.project
      });
      
      return {
        connected: result,
        details: {
          workspace: this.config.workspace,
          project: this.config.project
        }
      };
    } catch (error) {
      logger.error('Failed to connect to Rally', { 
        error, 
        workspace: this.config.workspace,
        project: this.config.project
      });
      
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          category: error instanceof RallyError ? error.category : RallyErrorCategory.UNKNOWN,
          workspace: this.config.workspace,
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
        supportsCustomFields: true,
        rateLimiting: {
          requestsPerSecond: this.config.requestsPerSecond || 5,
          requestsPerMinute: this.config.requestsPerMinute || 180,
          maxConcurrentRequests: this.config.maxConcurrentRequests || 3
        }
      }
    };
  }
  
  /**
   * Get projects from the source system
   */
  async getProjects(): Promise<Project[]> {
    try {
      logger.debug('Getting projects from Rally');
      
      // First, get workspaces
      const workspaces = await this.client.getWorkspaces();
      
      // Get projects for each workspace
      const allProjects: Project[] = [];
      
      for (const workspace of workspaces) {
        const workspaceId = workspace._refObjectUUID;
        const projects = await this.client.getProjects(workspaceId);
        
        // Map to canonical Project model
        const mappedProjects = projects.map((project: any) => ({
          id: project._refObjectUUID,
          name: project.Name,
          description: project.Description || '',
          attributes: {
            rallyId: project._refObjectUUID,
            rallyRef: project._ref,
            rallyWorkspaceId: workspaceId,
            rallyWorkspaceName: workspace.Name,
            rallyObjectID: project.ObjectID,
            rallyCreationDate: project.CreationDate,
            rallyState: project.State
          }
        }));
        
        allProjects.push(...mappedProjects);
      }
      
      logger.info(`Retrieved ${allProjects.length} projects from Rally`);
      
      return allProjects;
    } catch (error) {
      logger.error('Failed to get projects', { error });
      throw error;
    }
  }
  
  /**
   * Get test cases
   */
  async getTestCases(projectId: string, options?: any): Promise<PaginatedResult<TestCase>> {
    try {
      const start = options?.start || 1;
      const pageSize = options?.pageSize || 20;
      const query = options?.query || '';
      
      const result = await this.client.getTestCases(projectId, query, start, pageSize);
      
      // Map to canonical TestCase model
      const testCases = result.Results.map((tc: any) => this.mapRallyTestCaseToCanonical(tc));
      
      logger.info(`Retrieved ${testCases.length} test cases from Rally`, { 
        projectId,
        start,
        pageSize,
        totalResults: result.TotalResultCount
      });
      
      return {
        items: testCases,
        totalCount: result.TotalResultCount,
        hasMore: (start + result.Results.length) < result.TotalResultCount,
        nextPage: (start + result.Results.length) < result.TotalResultCount ? start + result.Results.length : null
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
      logger.debug('Getting test case from Rally', { projectId, testCaseId });
      
      const rallyTestCase = await this.client.getTestCase(testCaseId);
      
      // Map to canonical TestCase model
      const testCase = this.mapRallyTestCaseToCanonical(rallyTestCase);
      
      logger.info('Retrieved test case from Rally', { 
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
   * Map Rally test case to canonical model
   */
  private mapRallyTestCaseToCanonical(rallyTestCase: any): TestCase {
    // Extract steps from formatted text or steps collection
    let steps = [];
    
    if (rallyTestCase.Steps && Array.isArray(rallyTestCase.Steps)) {
      steps = rallyTestCase.Steps.map((step: any, index: number) => ({
        order: index + 1,
        description: step.Input || '',
        expectedResult: step.ExpectedResult || ''
      }));
    } else if (rallyTestCase.Steps && typeof rallyTestCase.Steps === 'string') {
      // If steps are in formatted string, try to parse them
      steps = this.parseStepsFromText(rallyTestCase.Steps);
    }
    
    // Map status
    const status = this.mapRallyStatusToCanonical(rallyTestCase.LastVerdict);
    
    // Map priority
    const priority = this.mapRallyPriorityToCanonical(rallyTestCase.Priority);
    
    // Map to canonical TestCase model
    return {
      id: rallyTestCase._refObjectUUID,
      title: rallyTestCase.Name || '',
      description: rallyTestCase.Description || '',
      status,
      priority,
      steps,
      tags: rallyTestCase.Tags ? rallyTestCase.Tags.map((tag: any) => tag.Name) : [],
      createdAt: rallyTestCase.CreationDate ? new Date(rallyTestCase.CreationDate) : new Date(),
      updatedAt: rallyTestCase.LastUpdateDate ? new Date(rallyTestCase.LastUpdateDate) : new Date(),
      attributes: {
        rallyId: rallyTestCase._refObjectUUID,
        rallyRef: rallyTestCase._ref,
        rallyObjectID: rallyTestCase.ObjectID,
        rallyFormattedID: rallyTestCase.FormattedID,
        rallyWorkspaceRef: rallyTestCase.Workspace?._ref,
        rallyProjectRef: rallyTestCase.Project?._ref,
        rallyOwner: rallyTestCase.Owner?.DisplayName,
        rallyLastResult: rallyTestCase.LastResult?.Name,
        rallyMethod: rallyTestCase.Method,
        rallyRisk: rallyTestCase.Risk,
        rallyType: rallyTestCase.Type,
        customFields: this.extractCustomFields(rallyTestCase)
      }
    };
  }
  
  /**
   * Parse steps from formatted text
   */
  private parseStepsFromText(stepsText: string): any[] {
    const steps = [];
    
    // This is a simplified parser that looks for patterns like:
    // Step 1: Action - Result
    // Step 2: Action - Result
    
    const stepPattern = /Step\s+(\d+)\s*:\s*(.*?)\s*-\s*(.*?)(?=Step\s+\d+\s*:|$)/gsi;
    
    let match;
    while ((match = stepPattern.exec(stepsText)) !== null) {
      steps.push({
        order: parseInt(match[1], 10),
        description: match[2].trim(),
        expectedResult: match[3].trim()
      });
    }
    
    return steps;
  }
  
  /**
   * Extract custom fields from Rally test case
   */
  private extractCustomFields(rallyTestCase: any): Record<string, any> {
    // Define standard fields to exclude
    const standardFields = [
      '_ref',
      '_refObjectUUID',
      '_refObjectName',
      '_type',
      'ObjectID',
      'Name',
      'Description',
      'CreationDate',
      'LastUpdateDate',
      'FormattedID',
      'Workspace',
      'Project',
      'Owner',
      'Steps',
      'Priority',
      'LastVerdict',
      'LastResult',
      'Method',
      'Risk',
      'Type',
      'Tags'
    ];
    
    const customFields: Record<string, any> = {};
    
    // Extract fields that are not in the standard fields list
    for (const [key, value] of Object.entries(rallyTestCase)) {
      if (!standardFields.includes(key) && value !== null && value !== undefined) {
        customFields[key] = value;
      }
    }
    
    return customFields;
  }
  
  /**
   * Map Rally status to canonical status
   */
  private mapRallyStatusToCanonical(status?: string): string {
    if (!status) return 'DRAFT';
    
    // Map based on common Rally verdicts
    const statusMap: Record<string, string> = {
      'Passed': 'APPROVED',
      'Failed': 'REJECTED',
      'Blocked': 'BLOCKED',
      'Not Run': 'DRAFT',
      'In Progress': 'IN_PROGRESS',
      'Incomplete': 'DRAFT'
    };
    
    return statusMap[status] || 'DRAFT';
  }
  
  /**
   * Map canonical status to Rally status
   */
  private mapCanonicalStatusToRally(status?: string): string {
    if (!status) return 'Not Run';
    
    // Map based on common Rally verdicts
    const statusMap: Record<string, string> = {
      'DRAFT': 'Not Run',
      'READY': 'Not Run',
      'IN_PROGRESS': 'In Progress',
      'APPROVED': 'Passed',
      'REJECTED': 'Failed',
      'BLOCKED': 'Blocked',
      'DEPRECATED': 'Not Run'
    };
    
    return statusMap[status] || 'Not Run';
  }
  
  /**
   * Map Rally priority to canonical priority
   */
  private mapRallyPriorityToCanonical(priority?: string): string {
    if (!priority) return 'MEDIUM';
    
    // Map based on common Rally priorities
    const priorityMap: Record<string, string> = {
      'Resolve Immediately': 'CRITICAL',
      'High Attention': 'HIGH',
      'Normal': 'MEDIUM',
      'Low': 'LOW'
    };
    
    return priorityMap[priority] || 'MEDIUM';
  }
  
  /**
   * Map canonical priority to Rally priority
   */
  private mapCanonicalPriorityToRally(priority?: string): string {
    if (!priority) return 'Normal';
    
    // Map based on common Rally priorities
    const priorityMap: Record<string, string> = {
      'CRITICAL': 'Resolve Immediately',
      'HIGH': 'High Attention',
      'MEDIUM': 'Normal',
      'LOW': 'Low'
    };
    
    return priorityMap[priority] || 'Normal';
  }
  
  /**
   * Get test folders/hierarchical structure
   * Use folder structure in Rally
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    // Placeholder implementation
    return [];
  }
  
  /**
   * Get test cycles
   */
  async getTestCycles(projectId: string, options?: any): Promise<PaginatedResult<TestCycle>> {
    // Placeholder implementation
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
    // Placeholder implementation
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
    // Placeholder implementation
    throw new Error('Get attachment content not implemented for Rally provider');
  }
  
  /**
   * Get field definitions (including custom fields)
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    // Placeholder implementation
    return [];
  }
  
  /**
   * Create or update a folder structure
   */
  async createFolder(projectId: string, folder: Folder): Promise<string> {
    // Placeholder implementation
    throw new Error('Folder creation not implemented for Rally provider');
  }
  
  /**
   * Create or update a test case
   */
  async createTestCase(projectId: string, testCase: TestCase): Promise<string> {
    try {
      logger.debug('Creating test case in Rally', { 
        projectId,
        title: testCase.title
      });
      
      // Map canonical model to Rally fields
      const rallyTestCase = {
        Name: testCase.title,
        Description: testCase.description,
        Priority: this.mapCanonicalPriorityToRally(testCase.priority),
        Method: testCase.attributes?.rallyMethod || 'Manual',
        Type: testCase.attributes?.rallyType || 'Functional',
        Risk: testCase.attributes?.rallyRisk || 'Low',
        // Add other mapped fields here
      };
      
      // Format steps
      if (testCase.steps && testCase.steps.length > 0) {
        rallyTestCase['Steps'] = testCase.steps.map(step => ({
          Input: step.description,
          ExpectedResult: step.expectedResult
        }));
      }
      
      // Add any custom fields
      if (testCase.attributes?.customFields) {
        Object.entries(testCase.attributes.customFields).forEach(([key, value]) => {
          rallyTestCase[key] = value;
        });
      }
      
      // Get workspace ID (either from config or from the test case attributes)
      const workspaceId = this.config.workspace || 
        (testCase.attributes?.rallyWorkspaceRef ? 
          testCase.attributes.rallyWorkspaceRef.split('/').pop() : '');
      
      if (!workspaceId) {
        throw new Error('Workspace ID is required to create a test case');
      }
      
      // Create test case in Rally
      const result = await this.client.createTestCase(workspaceId, projectId, rallyTestCase);
      
      logger.info('Test case created successfully', { 
        projectId,
        testCaseId: result.Object.ObjectUUID,
        title: testCase.title
      });
      
      return result.Object.ObjectUUID;
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
      logger.debug('Updating test steps in Rally', { 
        projectId,
        testCaseId,
        stepCount: steps.length
      });
      
      // Format steps for Rally
      const rallySteps = steps.map(step => ({
        Input: step.description,
        ExpectedResult: step.expectedResult
      }));
      
      // Update the test case with the steps
      await this.client.updateTestCase(testCaseId, {
        Steps: rallySteps
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
    // Placeholder implementation
    throw new Error('Test cycle creation not implemented for Rally provider');
  }
  
  /**
   * Create or update test executions
   */
  async createTestExecutions(projectId: string, testCycleId: string, executions: TestExecution[]): Promise<void> {
    // Placeholder implementation
    throw new Error('Test execution creation not implemented for Rally provider');
  }
  
  /**
   * Upload an attachment
   */
  async uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: AttachmentContent): Promise<string> {
    // Placeholder implementation
    throw new Error('Attachment upload not implemented for Rally provider');
  }
}

// Factory function to create an instance of the provider
export function createRallyProvider(config: RallyProviderConfig): RallyProvider {
  return new RallyProvider(config);
}