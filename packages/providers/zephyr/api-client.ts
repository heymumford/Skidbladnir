/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import { createResilientAxiosClient } from '../../common/src/utils/resilience/resilience-factory';

/**
 * Configuration for the Zephyr Scale API client
 */
export interface ZephyrClientConfig {
  /**
   * Base URL for the Zephyr Scale API
   */
  baseUrl: string;
  
  /**
   * API token for authentication
   */
  apiToken: string;
  
  /**
   * Optional Jira URL for Jira integration
   */
  jiraUrl?: string;
  
  /**
   * Optional Jira username
   */
  jiraUsername?: string;
  
  /**
   * Optional Jira API token
   */
  jiraApiToken?: string;
  
  /**
   * Maximum requests per minute allowed by the API
   */
  maxRequestsPerMinute?: number;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Zephyr Scale API pagination options
 */
export interface ZephyrPaginationOptions {
  startAt?: number;
  maxResults?: number;
}

/**
 * Zephyr Scale API test options
 */
export interface ZephyrTestOptions extends ZephyrPaginationOptions {
  folderId?: string;
  folderPath?: string;
  status?: string[];
  labels?: string[];
  priority?: string[];
  fields?: string[];
  includeExecutions?: boolean;
}

/**
 * Zephyr Scale API cycle options
 */
export interface ZephyrCycleOptions extends ZephyrPaginationOptions {
  folderId?: string;
  folderPath?: string;
  status?: string[];
  fields?: string[];
}

/**
 * Zephyr Scale API execution options
 */
export interface ZephyrExecutionOptions extends ZephyrPaginationOptions {
  testId?: string;
  cycleId?: string;
  status?: string[];
  executedBy?: string;
  executedSince?: Date;
  fields?: string[];
}

/**
 * Client for interacting with the Zephyr Scale API
 * 
 * This client provides methods for all Zephyr Scale API endpoints
 * with proper rate limiting and error handling.
 */
export class ZephyrClient {
  private client: AxiosInstance;
  private jiraClient?: AxiosInstance;
  
  constructor(config: ZephyrClientConfig) {
    // Create resilient API client for Zephyr Scale
    // Using resilience patterns (circuit breaker, retry, bulkhead, cache)
    this.client = createResilientAxiosClient(
      'zephyr', 
      config.baseUrl, 
      {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: config.timeout || 30000
      }
    );
    
    // Create resilient API client for Jira if credentials provided
    if (config.jiraUrl && config.jiraUsername && config.jiraApiToken) {
      const auth = Buffer.from(
        `${config.jiraUsername}:${config.jiraApiToken}`
      ).toString('base64');
      
      this.jiraClient = createResilientAxiosClient(
        'jira',
        config.jiraUrl,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: config.timeout || 30000
        }
      );
    }
  }
  
  /**
   * Get API health status
   */
  getHealthStatus() {
    // This is now provided by the resilience facade
    return {
      status: 'HEALTHY', // This would be populated from resilience facade
      activeRequests: 0,
      failedRequests: 0,
      isCircuitOpen: false
    };
  }
  
  /**
   * Test API connection
   */
  async testConnection(): Promise<AxiosResponse> {
    try {
      const response = await this.client.get('/tests?maxResults=1');
      return response;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response;
      }
      throw error;
    }
  }
  
  // Project endpoints
  
  /**
   * Get projects
   */
  async getProjects(options: ZephyrPaginationOptions = {}): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    return this.client.get('/projects', { params });
  }
  
  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<AxiosResponse> {
    return this.client.get(`/projects/${projectId}`);
  }
  
  /**
   * Get project by key
   */
  async getProjectByKey(projectKey: string): Promise<AxiosResponse> {
    return this.client.get(`/projects/key/${projectKey}`);
  }
  
  // Folder endpoints
  
  /**
   * Get folders
   */
  async getFolders(
    projectKey: string,
    options: ZephyrPaginationOptions = {}
  ): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    params.projectKey = projectKey;
    return this.client.get('/folders', { params });
  }
  
  /**
   * Get folder by ID
   */
  async getFolder(folderId: string): Promise<AxiosResponse> {
    return this.client.get(`/folders/${folderId}`);
  }
  
  /**
   * Create folder
   */
  async createFolder(
    projectKey: string,
    name: string,
    parentId?: string,
    folderType = 'TEST_CASE'
  ): Promise<AxiosResponse> {
    const data: any = {
      name,
      projectKey,
      folderType
    };
    
    if (parentId) {
      data.parentId = parentId;
    }
    
    return this.client.post('/folders', data);
  }
  
  // Test (Test Case) endpoints
  
  /**
   * Get tests (test cases)
   */
  async getTests(
    projectKey: string,
    options: ZephyrTestOptions = {}
  ): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    params.projectKey = projectKey;
    
    // Handle arrays in options
    if (options.status && options.status.length > 0) {
      params.status = options.status.join(',');
    }
    
    if (options.labels && options.labels.length > 0) {
      params.labels = options.labels.join(',');
    }
    
    if (options.priority && options.priority.length > 0) {
      params.priority = options.priority.join(',');
    }
    
    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    
    return this.client.get('/tests', { params });
  }
  
  /**
   * Get test by ID
   */
  async getTest(testId: string): Promise<AxiosResponse> {
    return this.client.get(`/tests/${testId}`);
  }
  
  /**
   * Get test by key
   */
  async getTestByKey(testKey: string): Promise<AxiosResponse> {
    return this.client.get(`/tests/key/${testKey}`);
  }
  
  /**
   * Create test
   */
  async createTest(
    projectKey: string,
    testData: any
  ): Promise<AxiosResponse> {
    const data = {
      projectKey,
      ...testData
    };
    
    return this.client.post('/tests', data);
  }
  
  /**
   * Update test
   */
  async updateTest(
    testId: string,
    testData: any
  ): Promise<AxiosResponse> {
    return this.client.put(`/tests/${testId}`, testData);
  }
  
  /**
   * Delete test
   */
  async deleteTest(testId: string): Promise<AxiosResponse> {
    return this.client.delete(`/tests/${testId}`);
  }
  
  // Test Cycle endpoints
  
  /**
   * Get cycles
   */
  async getCycles(
    projectKey: string,
    options: ZephyrCycleOptions = {}
  ): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    params.projectKey = projectKey;
    
    if (options.status && options.status.length > 0) {
      params.status = options.status.join(',');
    }
    
    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    
    return this.client.get('/cycles', { params });
  }
  
  /**
   * Get cycle by ID
   */
  async getCycle(cycleId: string): Promise<AxiosResponse> {
    return this.client.get(`/cycles/${cycleId}`);
  }
  
  /**
   * Create cycle
   */
  async createCycle(
    projectKey: string,
    cycleData: any
  ): Promise<AxiosResponse> {
    const data = {
      projectKey,
      ...cycleData
    };
    
    return this.client.post('/cycles', data);
  }
  
  /**
   * Update cycle
   */
  async updateCycle(
    cycleId: string,
    cycleData: any
  ): Promise<AxiosResponse> {
    return this.client.put(`/cycles/${cycleId}`, cycleData);
  }
  
  /**
   * Delete cycle
   */
  async deleteCycle(cycleId: string): Promise<AxiosResponse> {
    return this.client.delete(`/cycles/${cycleId}`);
  }
  
  /**
   * Add tests to cycle
   */
  async addTestsToCycle(
    cycleId: string,
    testKeys: string[]
  ): Promise<AxiosResponse> {
    return this.client.post(`/cycles/${cycleId}/items`, { testKeys });
  }
  
  // Test Execution endpoints
  
  /**
   * Get executions
   */
  async getExecutions(
    options: ZephyrExecutionOptions = {}
  ): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    
    if (options.status && options.status.length > 0) {
      params.status = options.status.join(',');
    }
    
    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    
    if (options.executedSince) {
      params.executedSince = options.executedSince.toISOString();
    }
    
    return this.client.get('/executions', { params });
  }
  
  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<AxiosResponse> {
    return this.client.get(`/executions/${executionId}`);
  }
  
  /**
   * Create execution
   */
  async createExecution(executionData: any): Promise<AxiosResponse> {
    return this.client.post('/executions', executionData);
  }
  
  /**
   * Update execution
   */
  async updateExecution(
    executionId: string,
    executionData: any
  ): Promise<AxiosResponse> {
    return this.client.put(`/executions/${executionId}`, executionData);
  }
  
  /**
   * Bulk create executions
   */
  async bulkCreateExecutions(executionsData: any[]): Promise<AxiosResponse> {
    return this.client.post('/executions/bulk', executionsData);
  }
  
  // Attachment endpoints
  
  /**
   * Get attachment metadata
   */
  async getAttachment(attachmentId: string): Promise<AxiosResponse> {
    return this.client.get(`/attachments/${attachmentId}`);
  }
  
  /**
   * Get attachment content
   */
  async getAttachmentContent(
    attachmentId: string
  ): Promise<AxiosResponse<ArrayBuffer>> {
    return this.client.get(`/attachments/${attachmentId}/content`, {
      responseType: 'arraybuffer'
    });
  }
  
  /**
   * Create attachment for test
   */
  async createTestAttachment(
    testId: string,
    fileName: string,
    content: Buffer,
    contentType: string
  ): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('file', content, {
      filename: fileName,
      contentType: contentType
    });
    
    return this.client.post(`/tests/${testId}/attachments`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }
  
  /**
   * Create attachment for execution
   */
  async createExecutionAttachment(
    executionId: string,
    fileName: string,
    content: Buffer,
    contentType: string
  ): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('file', content, {
      filename: fileName,
      contentType: contentType
    });
    
    return this.client.post(`/executions/${executionId}/attachments`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }
  
  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string): Promise<AxiosResponse> {
    return this.client.delete(`/attachments/${attachmentId}`);
  }
  
  // Links endpoints
  
  /**
   * Get links for a test
   */
  async getTestLinks(testId: string): Promise<AxiosResponse> {
    return this.client.get(`/tests/${testId}/links`);
  }
  
  /**
   * Create link for a test
   */
  async createTestLink(
    testId: string,
    linkType: string,
    issueKey: string
  ): Promise<AxiosResponse> {
    return this.client.post(`/tests/${testId}/links`, {
      linkType,
      issueKey
    });
  }
  
  /**
   * Delete link
   */
  async deleteLink(linkId: string): Promise<AxiosResponse> {
    return this.client.delete(`/links/${linkId}`);
  }
  
  // Field endpoints
  
  /**
   * Get custom fields
   */
  async getCustomFields(
    projectKey: string,
    options: ZephyrPaginationOptions = {}
  ): Promise<AxiosResponse> {
    const params = this.buildQueryParams(options);
    params.projectKey = projectKey;
    return this.client.get('/fields/custom', { params });
  }
  
  // Helper methods
  
  /**
   * Build query parameters from options
   */
  private buildQueryParams(options: ZephyrPaginationOptions): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (options.startAt !== undefined) {
      params.startAt = options.startAt;
    }
    
    if (options.maxResults !== undefined) {
      params.maxResults = options.maxResults;
    }
    
    return params;
  }
}