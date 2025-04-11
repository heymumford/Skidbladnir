/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Data Export Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * specifically for qTest Data Export for accessing and downloading exports.
 */

import {
  ProviderConfig as _ProviderConfig,
  ConnectionStatus,
  SourceProvider as _SourceProvider
} from '../../common/src/interfaces/provider';

import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestProviderConfig, QTestProvider } from './index';
import {
  QTestDataExportClient,
  FileMetadata,
  FileQueryOptions
} from './api-client/data-export-client';
import { ExternalServiceError as _ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * Enhanced qTest Data Export provider configuration
 */
export interface QTestDataExportProviderConfig extends QTestProviderConfig {
  /**
   * Default export directory
   */
  defaultExportDir?: string;
  
  /**
   * Default export file pattern
   */
  defaultExportPattern?: string;
  
  /**
   * Maximum file size to download (in bytes)
   */
  maxFileSize?: number;
}

/**
 * Export file with content
 */
export interface ExportFile extends FileMetadata {
  /**
   * File content (base64 encoded if binary)
   */
  content?: string;
  
  /**
   * Content type
   */
  contentType?: string;
  
  /**
   * Whether the content is base64 encoded
   */
  isBase64?: boolean;
}

/**
 * qTest Data Export Provider specialization for accessing exports
 */
export class QTestDataExportProvider extends QTestProvider {
  private dataExportClient: QTestDataExportClient | null = null;
  private dataExportConfig: QTestDataExportProviderConfig | null = null;
  
  /**
   * Override id to clearly identify the provider type
   */
  readonly id = 'qtest-data-export';
  
  /**
   * Override name to clearly identify the provider type
   */
  readonly name = 'qTest Data Export';
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: QTestDataExportProviderConfig): Promise<void> {
    // First initialize the base provider
    await super.initialize(config);
    
    try {
      this.dataExportConfig = config;
      
      // Create specialized data export client
      this.dataExportClient = new QTestDataExportClient({
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        username: config.username,
        password: config.password,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        bypassSSL: config.bypassSSL,
        maxRetries: config.maxRetries
      });
    } catch (error) {
      throw this.wrapError('Failed to initialize qTest Data Export provider', error);
    }
  }
  
  /**
   * Test connection to qTest Data Export
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      this.ensureDataExportClient();
      
      const isConnected = await this.dataExportClient!.testConnection();
      
      return {
        connected: isConnected,
        details: {
          metrics: this.dataExportClient!.getRateLimiterMetrics()
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          connected: false,
          error: `qTest Data Export API error: ${error.message}`
        };
      }
      
      return {
        connected: false,
        error: 'Unknown error occurred'
      };
    }
  }
  
  /**
   * List files in the export directory
   */
  async listFiles(
    projectId: string,
    options: FileQueryOptions = {}
  ): Promise<PaginatedResult<FileMetadata>> {
    try {
      this.ensureDataExportClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Set default path if not provided
      options.projectId = numericProjectId;
      
      if (!options.path && this.dataExportConfig?.defaultExportDir) {
        options.path = this.dataExportConfig.defaultExportDir;
      }
      
      // Query files
      const response = await this.dataExportClient!.listFiles(options);
      
      // Return as paginated result (API doesn't provide pagination, so we fake it)
      const files = response.data || [];
      
      return {
        items: files,
        total: files.length,
        page: 1,
        pageSize: files.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to list files for project ${projectId}`, error);
    }
  }
  
  /**
   * Get file metadata
   */
  async getFileMetadata(
    projectId: string,
    filePath: string
  ): Promise<FileMetadata> {
    try {
      this.ensureDataExportClient();
      
      // Get file metadata
      const response = await this.dataExportClient!.getFileMetadata(filePath);
      
      // Extract metadata from headers
      const headers = response.headers;
      const metadata: FileMetadata = {
        name: filePath.split('/').pop() || '',
        path: filePath,
        size: parseInt(headers['content-length'] || '0', 10),
        lastModified: headers['last-modified'] || new Date().toISOString(),
        type: 'file'
      };
      
      return metadata;
    } catch (error) {
      throw this.wrapError(`Failed to get file metadata for ${filePath}`, error);
    }
  }
  
  /**
   * Download a file
   */
  async downloadFile(
    projectId: string,
    filePath: string,
    asBinary = false
  ): Promise<ExportFile> {
    try {
      this.ensureDataExportClient();
      
      // Check file size before downloading
      const metadata = await this.getFileMetadata(projectId, filePath);
      
      // Check if file is too large
      if (
        this.dataExportConfig?.maxFileSize &&
        metadata.size > this.dataExportConfig.maxFileSize
      ) {
        throw new Error(`File size (${metadata.size} bytes) exceeds maximum allowed size (${this.dataExportConfig.maxFileSize} bytes)`);
      }
      
      // Download file
      const response = await this.dataExportClient!.downloadFile(filePath, {
        asBinary
      });
      
      // Determine content type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Process content based on type
      let content = '';
      let isBase64 = false;
      
      if (asBinary) {
        // Convert binary data to base64
        content = Buffer.from(response.data).toString('base64');
        isBase64 = true;
      } else if (typeof response.data === 'object') {
        // JSON data
        content = JSON.stringify(response.data);
      } else {
        // Text data
        content = response.data.toString();
      }
      
      return {
        ...metadata,
        content,
        contentType,
        isBase64
      };
    } catch (error) {
      throw this.wrapError(`Failed to download file ${filePath}`, error);
    }
  }
  
  /**
   * Search for files
   */
  async searchFiles(
    projectId: string,
    pattern: string,
    options: {
      path?: string;
      recursive?: boolean;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<FileMetadata>> {
    try {
      this.ensureDataExportClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Search files
      const response = await this.dataExportClient!.searchFiles(
        numericProjectId,
        pattern,
        options
      );
      
      // Return as paginated result (API doesn't provide pagination, so we fake it)
      const files = response.data || [];
      
      return {
        items: files,
        total: files.length,
        page: 1,
        pageSize: files.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to search files for project ${projectId}`, error);
    }
  }
  
  /**
   * Get project exports
   */
  async getProjectExports(projectId: string): Promise<PaginatedResult<FileMetadata>> {
    try {
      this.ensureDataExportClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Get project exports
      const response = await this.dataExportClient!.getProjectExports(numericProjectId);
      
      // Return as paginated result (API doesn't provide pagination, so we fake it)
      const files = response.data || [];
      
      return {
        items: files,
        total: files.length,
        page: 1,
        pageSize: files.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to get exports for project ${projectId}`, error);
    }
  }
  
  /**
   * Get latest export
   */
  async getLatestExport(
    projectId: string,
    pattern?: string
  ): Promise<FileMetadata | null> {
    try {
      this.ensureDataExportClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Use default pattern if not provided
      if (!pattern && this.dataExportConfig?.defaultExportPattern) {
        pattern = this.dataExportConfig.defaultExportPattern;
      }
      
      // Get latest export
      const response = await this.dataExportClient!.getLatestExport(
        numericProjectId,
        pattern
      );
      
      return response.data || null;
    } catch (error) {
      throw this.wrapError(`Failed to get latest export for project ${projectId}`, error);
    }
  }
  
  /**
   * Download latest export
   */
  async downloadLatestExport(
    projectId: string,
    pattern?: string,
    asBinary = false
  ): Promise<ExportFile | null> {
    try {
      // First get the latest export metadata
      const latestExport = await this.getLatestExport(projectId, pattern);
      
      if (!latestExport) {
        return null;
      }
      
      // Then download the file
      return this.downloadFile(projectId, latestExport.path, asBinary);
    } catch (error) {
      throw this.wrapError(`Failed to download latest export for project ${projectId}`, error);
    }
  }
  
  // Helper methods
  
  /**
   * Ensure the data export client is initialized
   */
  private ensureDataExportClient(): void {
    if (!this.dataExportClient || !this.dataExportConfig) {
      throw new Error('qTest Data Export provider not initialized. Call initialize() first.');
    }
  }
}