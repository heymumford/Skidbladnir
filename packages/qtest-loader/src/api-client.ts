/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimiter } from '../../common/src/utils/rate-limiter';

/**
 * Configuration for the qTest API client
 */
export interface QTestClientConfig {
  baseUrl: string;
  apiToken: string;
  maxRequestsPerMinute?: number;
}

/**
 * Client for interacting with the qTest API
 */
export class QTestClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  
  constructor(config: QTestClientConfig) {
    // Create API client
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      maxRequestsPerMinute: config.maxRequestsPerMinute || 200
    });
    
    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimiter.throttle();
      return config;
    });
    
    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 429) {
          // Default to 60 seconds if header not present
          const resetTime = parseInt(
            error.response.headers['x-ratelimit-reset'] || '60000',
            10
          );
          this.rateLimiter.handleRateLimitResponse(resetTime);
          // Retry the request after the rate limit reset
          await new Promise(resolve => setTimeout(resolve, resetTime));
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Get project information
   */
  async getProject(projectId: number): Promise<AxiosResponse> {
    return this.client.get(`/projects/${projectId}`);
  }
  
  /**
   * Get all modules (folders) in a project
   */
  async getModules(
    projectId: number,
    page: number = 1,
    pageSize: number = 100
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/projects/${projectId}/modules?page=${page}&pageSize=${pageSize}`
    );
  }
  
  /**
   * Create a new module (folder)
   */
  async createModule(
    projectId: number,
    module: {
      name: string;
      description?: string;
      parentId?: number;
      parentType?: string;
    }
  ): Promise<AxiosResponse> {
    return this.client.post(`/projects/${projectId}/modules`, module);
  }
  
  /**
   * Get test cases
   */
  async getTestCases(
    projectId: number,
    moduleId?: number,
    page: number = 1,
    pageSize: number = 100
  ): Promise<AxiosResponse> {
    let url = `/projects/${projectId}/test-cases?page=${page}&pageSize=${pageSize}`;
    
    if (moduleId) {
      url += `&parentId=${moduleId}&parentType=module`;
    }
    
    return this.client.get(url);
  }
  
  /**
   * Create a test case
   */
  async createTestCase(
    projectId: number,
    testCase: {
      name: string;
      description?: string;
      precondition?: string;
      parentId?: number;
      parentType?: string;
      properties?: any[];
    }
  ): Promise<AxiosResponse> {
    return this.client.post(`/projects/${projectId}/test-cases`, testCase);
  }
  
  /**
   * Get test steps for a test case
   */
  async getTestSteps(
    projectId: number,
    testCaseId: number
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/projects/${projectId}/test-cases/${testCaseId}/test-steps`
    );
  }
  
  /**
   * Create test steps for a test case
   */
  async createTestSteps(
    projectId: number,
    testCaseId: number,
    steps: {
      description: string;
      expected_result?: string;
      order: number;
    }[]
  ): Promise<AxiosResponse> {
    return this.client.post(
      `/projects/${projectId}/test-cases/${testCaseId}/test-steps`,
      steps
    );
  }
  
  /**
   * Get test cycles
   */
  async getTestCycles(
    projectId: number,
    page: number = 1,
    pageSize: number = 100
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/projects/${projectId}/test-cycles?page=${page}&pageSize=${pageSize}`
    );
  }
  
  /**
   * Create a test cycle
   */
  async createTestCycle(
    projectId: number,
    cycle: {
      name: string;
      description?: string;
      parentId?: number;
      parentType?: string;
      properties?: any[];
    }
  ): Promise<AxiosResponse> {
    return this.client.post(`/projects/${projectId}/test-cycles`, cycle);
  }
  
  /**
   * Create test runs (add test cases to cycle)
   */
  async createTestRuns(
    projectId: number,
    cycleId: number,
    runs: {
      name?: string;
      test_case: { id: number };
      properties?: any[];
    }[]
  ): Promise<AxiosResponse> {
    return this.client.post(
      `/projects/${projectId}/test-cycles/${cycleId}/test-runs`,
      runs
    );
  }
  
  /**
   * Get a specific test run
   */
  async getTestRun(
    projectId: number,
    runId: number
  ): Promise<AxiosResponse> {
    return this.client.get(`/projects/${projectId}/test-runs/${runId}`);
  }
  
  /**
   * Update test run status and results
   */
  async updateTestRun(
    projectId: number,
    runId: number,
    data: {
      status: { id: number };
      properties?: any[];
    }
  ): Promise<AxiosResponse> {
    return this.client.put(
      `/projects/${projectId}/test-runs/${runId}`,
      data
    );
  }
  
  /**
   * Create a test log (execution result)
   */
  async createTestLog(
    projectId: number,
    runId: number,
    log: {
      status: { id: number };
      note?: string;
      test_step_logs?: {
        description?: string;
        expected_result?: string;
        actual_result?: string;
        status: { id: number };
        order: number;
      }[];
    }
  ): Promise<AxiosResponse> {
    return this.client.post(
      `/projects/${projectId}/test-runs/${runId}/test-logs`,
      log
    );
  }
  
  /**
   * Upload an attachment
   */
  async uploadAttachment(
    projectId: number,
    entityType: string,
    entityId: number,
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<AxiosResponse> {
    const formData = new FormData();
    const blob = new Blob([file], { type: contentType });
    formData.append('file', blob, fileName);
    
    return this.client.post(
      `/projects/${projectId}/${entityType}/${entityId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
  
  /**
   * Get attachment
   */
  async getAttachment(
    projectId: number,
    attachmentId: number
  ): Promise<AxiosResponse<ArrayBuffer>> {
    return this.client.get(
      `/projects/${projectId}/attachments/${attachmentId}`,
      {
        responseType: 'arraybuffer'
      }
    );
  }
}