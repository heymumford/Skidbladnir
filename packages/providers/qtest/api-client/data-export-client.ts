/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Data Export API Client
 * 
 * Client for interacting with the qTest Data Export API for accessing and downloading
 * exported files from qTest.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as https from 'https';
import { ApiRateLimiter, ApiRateLimiterMetrics } from '../../../common/src/utils/http-client';
import { QTestApiClientConfig } from './index';

/**
 * File metadata model
 */
export interface FileMetadata {
  /**
   * File name
   */
  name: string;
  
  /**
   * Full file path
   */
  path: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * Last modified date
   */
  lastModified: string;
  
  /**
   * File type
   */
  type: 'file' | 'directory';
  
  /**
   * For directories, the list of contained files
   */
  files?: FileMetadata[];
}

/**
 * File query options
 */
export interface FileQueryOptions {
  /**
   * Project ID
   */
  projectId?: number;
  
  /**
   * Path to search in
   */
  path?: string;
  
  /**
   * File name pattern to match
   */
  pattern?: string;
  
  /**
   * Include subdirectories
   */
  recursive?: boolean;
  
  /**
   * Maximum number of results to return
   */
  limit?: number;
}

/**
 * File download options
 */
export interface FileDownloadOptions {
  /**
   * Whether to download as binary
   */
  asBinary?: boolean;
  
  /**
   * Response type
   */
  responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
}

/**
 * qTest Data Export Client implementation
 */
export class QTestDataExportClient {
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
      baseURL: `${config.baseUrl}/data-export`,
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
   * Test connection to qTest Data Export API
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
  
  /**
   * List files
   */
  async listFiles(options: FileQueryOptions = {}): Promise<AxiosResponse> {
    // Build query parameters
    const params: Record<string, any> = {};
    
    if (options.projectId) {
      params.projectId = options.projectId;
    }
    
    if (options.path) {
      params.path = options.path;
    }
    
    if (options.pattern) {
      params.pattern = options.pattern;
    }
    
    if (options.recursive !== undefined) {
      params.recursive = options.recursive;
    }
    
    if (options.limit) {
      params.limit = options.limit;
    }
    
    return this.rateLimiter.limit(() => 
      this.client.get('/files', { params })
    );
  }
  
  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<AxiosResponse> {
    return this.rateLimiter.limit(() => 
      this.client.head(`/file/${encodeURIComponent(filePath)}`)
    );
  }
  
  /**
   * Download file
   */
  async downloadFile(filePath: string, options: FileDownloadOptions = {}): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {};
    
    if (options.responseType) {
      config.responseType = options.responseType;
    } else if (options.asBinary) {
      config.responseType = 'arraybuffer';
    }
    
    return this.rateLimiter.limit(() => 
      this.client.get(`/file/${encodeURIComponent(filePath)}`, config)
    );
  }
  
  /**
   * Search for files
   */
  async searchFiles(
    projectId: number,
    pattern: string,
    options: {
      path?: string;
      recursive?: boolean;
      limit?: number;
    } = {}
  ): Promise<AxiosResponse> {
    return this.listFiles({
      projectId,
      pattern,
      path: options.path,
      recursive: options.recursive,
      limit: options.limit
    });
  }
  
  /**
   * Get project exports
   */
  async getProjectExports(projectId: number): Promise<AxiosResponse> {
    return this.listFiles({
      projectId,
      path: `/projects/${projectId}/exports`
    });
  }
  
  /**
   * Get latest export
   */
  async getLatestExport(
    projectId: number,
    pattern?: string
  ): Promise<AxiosResponse> {
    const response = await this.getProjectExports(projectId);
    
    if (response.data && Array.isArray(response.data)) {
      // Sort files by lastModified date (newest first)
      const sortedFiles = [...response.data].sort((a, b) => {
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      });
      
      // Filter by pattern if provided
      const matchingFiles = pattern
        ? sortedFiles.filter(file => file.name.match(new RegExp(pattern)))
        : sortedFiles;
      
      if (matchingFiles.length > 0) {
        return {
          ...response,
          data: matchingFiles[0]
        };
      }
    }
    
    return response;
  }
}