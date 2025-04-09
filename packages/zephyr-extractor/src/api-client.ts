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
 * Configuration for the Zephyr Scale API client
 */
export interface ZephyrClientConfig {
  baseUrl: string;
  apiToken: string;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraApiToken?: string;
  maxRequestsPerMinute?: number;
}

/**
 * Client for interacting with the Zephyr Scale API
 */
export class ZephyrClient {
  private client: AxiosInstance;
  private jiraClient?: AxiosInstance;
  private rateLimiter: RateLimiter;
  
  constructor(config: ZephyrClientConfig) {
    // Create API client for Zephyr Scale
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Create API client for Jira if credentials provided
    if (config.jiraUrl && config.jiraUsername && config.jiraApiToken) {
      const auth = Buffer.from(
        `${config.jiraUsername}:${config.jiraApiToken}`
      ).toString('base64');
      
      this.jiraClient = axios.create({
        baseURL: config.jiraUrl,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      maxRequestsPerMinute: config.maxRequestsPerMinute || 300
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
   * Get all tests (test cases) with pagination
   */
  async getTests(
    projectKey: string,
    folderId?: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<AxiosResponse> {
    let url = `/tests?projectKey=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`;
    
    if (folderId) {
      url += `&folderId=${folderId}`;
    }
    
    return this.client.get(url);
  }
  
  /**
   * Get a specific test by ID
   */
  async getTest(testId: string): Promise<AxiosResponse> {
    return this.client.get(`/tests/${testId}`);
  }
  
  /**
   * Get all folders with pagination
   */
  async getFolders(
    projectKey: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/folders?projectKey=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`
    );
  }
  
  /**
   * Get a specific folder by ID
   */
  async getFolder(folderId: string): Promise<AxiosResponse> {
    return this.client.get(`/folders/${folderId}`);
  }
  
  /**
   * Get all test cycles with pagination
   */
  async getCycles(
    projectKey: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/cycles?projectKey=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`
    );
  }
  
  /**
   * Get a specific test cycle by ID
   */
  async getCycle(cycleId: string): Promise<AxiosResponse> {
    return this.client.get(`/cycles/${cycleId}`);
  }
  
  /**
   * Get execution results for a cycle
   */
  async getExecutions(
    cycleId: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<AxiosResponse> {
    return this.client.get(
      `/executions?cycleId=${cycleId}&startAt=${startAt}&maxResults=${maxResults}`
    );
  }
  
  /**
   * Get a specific execution by ID
   */
  async getExecution(executionId: string): Promise<AxiosResponse> {
    return this.client.get(`/executions/${executionId}`);
  }
  
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
   * Get issue from Jira
   */
  async getJiraIssue(issueKey: string): Promise<AxiosResponse | null> {
    if (!this.jiraClient) {
      throw new Error('Jira client not configured');
    }
    
    return this.jiraClient.get(`/rest/api/3/issue/${issueKey}`);
  }
}