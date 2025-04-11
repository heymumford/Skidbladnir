/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Scenario API Client
 * 
 * Client for interacting with the qTest Scenario API for BDD features and steps.
 */

import axios, { AxiosInstance, AxiosRequestConfig as _AxiosRequestConfig, AxiosResponse } from 'axios';
import * as https from 'https';
import { ApiRateLimiter, ApiRateLimiterMetrics } from '../../../common/src/utils/http-client';
import { QTestApiClientConfig } from './index';

/**
 * Feature status
 */
export enum FeatureStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

/**
 * Feature model
 */
export interface Feature {
  id?: number;
  name: string;
  description?: string;
  status?: FeatureStatus;
  projectId?: number;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  tags?: string[];
  steps?: Step[];
}

/**
 * Step type
 */
export enum StepType {
  GIVEN = 'given',
  WHEN = 'when',
  THEN = 'then',
  AND = 'and',
  BUT = 'but'
}

/**
 * Step model
 */
export interface Step {
  id?: number;
  type: StepType;
  description: string;
  featureId?: number;
  projectId?: number;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  order?: number;
}

/**
 * Feature query options
 */
export interface FeatureQueryOptions {
  page?: number;
  size?: number;
  filter?: Record<string, any>;
  sort?: string;
  searchText?: string;
  status?: FeatureStatus;
  tags?: string[];
}

/**
 * Step query options
 */
export interface StepQueryOptions {
  page?: number;
  size?: number;
  filter?: Record<string, any>;
  sort?: string;
  searchText?: string;
  type?: StepType;
  featureId?: number;
}

/**
 * qTest Scenario Client implementation
 */
export class QTestScenarioClient {
  private client: AxiosInstance;
  private rateLimiter: ApiRateLimiter;
  
  /**
   * Initialize the client with configuration
   */
  constructor(config: QTestApiClientConfig) {
    // Validate required configuration
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    
    // Set up authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }
    
    // Create HTTP client
    this.client = axios.create({
      baseURL: `${config.baseUrl}/scenario`,
      headers,
      timeout: 30000,
      httpsAgent: config.bypassSSL 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined
    });
    
    // Create rate limiter
    this.rateLimiter = new ApiRateLimiter({
      maxRequestsPerMinute: config.maxRequestsPerMinute || 600
    });
    
    // Set up basic auth if token not provided
    if (config.username && config.password) {
      this.client.defaults.auth = {
        username: config.username,
        password: config.password
      };
    }
  }
  
  /**
   * Test connection to qTest Scenario API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.rateLimiter.limit(() => this.client.get('/user/current'));
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get rate limiter metrics
   */
  getRateLimiterMetrics(): ApiRateLimiterMetrics {
    return this.rateLimiter.getMetrics();
  }
  
  // Feature operations
  
  /**
   * Query features
   */
  async queryFeatures(options: FeatureQueryOptions = {}): Promise<AxiosResponse> {
    // Build query parameters
    const params: Record<string, any> = {
      page: options.page !== undefined ? options.page : 0,
      size: options.size || 20
    };
    
    if (options.sort) {
      params.sort = options.sort;
    }
    
    if (options.filter) {
      params.filter = JSON.stringify(options.filter);
    }
    
    if (options.searchText) {
      params.searchText = options.searchText;
    }
    
    if (options.status) {
      params.status = options.status;
    }
    
    if (options.tags && options.tags.length > 0) {
      params.tags = options.tags.join(',');
    }
    
    return this.rateLimiter.limit(() => 
      this.client.get('/features', { params })
    );
  }
  
  /**
   * Get a feature by ID
   */
  async getFeature(featureId: number): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.get(`/features/${featureId}`)
    );
  }
  
  /**
   * Create a feature
   */
  async createFeature(feature: Feature): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.post('/features', feature)
    );
  }
  
  /**
   * Update a feature (full update)
   */
  async updateFeature(featureId: number, feature: Feature): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.put(`/features/${featureId}`, feature)
    );
  }
  
  /**
   * Update a feature (partial update)
   */
  async patchFeature(featureId: number, updates: Partial<Feature>): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.patch(`/features/${featureId}`, updates)
    );
  }
  
  /**
   * Delete a feature
   */
  async deleteFeature(featureId: number): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.delete(`/features/${featureId}`)
    );
  }
  
  // Step operations
  
  /**
   * Query steps
   */
  async querySteps(options: StepQueryOptions = {}): Promise<AxiosResponse> {
    // Build query parameters
    const params: Record<string, any> = {
      page: options.page !== undefined ? options.page : 0,
      size: options.size || 20
    };
    
    if (options.sort) {
      params.sort = options.sort;
    }
    
    if (options.filter) {
      params.filter = JSON.stringify(options.filter);
    }
    
    if (options.searchText) {
      params.searchText = options.searchText;
    }
    
    if (options.type) {
      params.type = options.type;
    }
    
    if (options.featureId) {
      params.featureId = options.featureId;
    }
    
    return this.rateLimiter.limit(() => 
      this.client.get('/steps', { params })
    );
  }
  
  /**
   * Get a step by ID
   */
  async getStep(stepId: number): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.get(`/steps/${stepId}`)
    );
  }
  
  /**
   * Create a step
   */
  async createStep(step: Step): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.post('/steps', step)
    );
  }
  
  /**
   * Update a step (full update)
   */
  async updateStep(stepId: number, step: Step): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.put(`/steps/${stepId}`, step)
    );
  }
  
  /**
   * Update a step (partial update)
   */
  async patchStep(stepId: number, updates: Partial<Step>): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.patch(`/steps/${stepId}`, updates)
    );
  }
  
  /**
   * Delete a step
   */
  async deleteStep(stepId: number): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.delete(`/steps/${stepId}`)
    );
  }
  
  /**
   * Get steps for a feature
   */
  async getFeatureSteps(featureId: number, options: StepQueryOptions = {}): Promise<AxiosResponse> {
    return this.querySteps({
      ...options,
      featureId
    });
  }
  
  /**
   * Add steps to a feature
   */
  async addFeatureSteps(featureId: number, steps: Step[]): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.post(`/features/${featureId}/steps`, steps)
    );
  }
}