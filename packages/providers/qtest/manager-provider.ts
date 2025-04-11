/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Manager Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * specifically for qTest Manager test case migration.
 */

import {
  ProviderConfig,
  ConnectionStatus,
  TestCaseQueryOptions,
  EntityType,
  SourceProvider,
  TargetProvider
} from '../../common/src/interfaces/provider';

import {
  Project,
  Folder,
  TestCase
} from '../../common/src/models/entities';

import { AttachmentContent } from '../../common/src/models/attachment';
import { FieldDefinition } from '../../common/src/models/field-definition';
import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestProviderConfig, QTestProvider } from './index';
import { QTestManagerClient } from './api-client/manager-client';
import { QTestMapper } from './models/mappers';
import { DomainError, ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * Enhanced qTest Manager provider configuration
 */
export interface QTestManagerProviderConfig extends QTestProviderConfig {
  /**
   * Enable test case migration-specific features
   */
  enableMigration?: boolean;
  
  /**
   * Batch size for creating test cases in bulk
   */
  migrationBatchSize?: number;
  
  /**
   * Whether to preserve original test case IDs during migration
   */
  preserveSourceIds?: boolean;
  
  /**
   * Whether to delete existing test cases before migrating new ones
   */
  cleanBeforeMigration?: boolean;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  /**
   * Total number of test cases to migrate
   */
  total: number;
  
  /**
   * Number of test cases successfully migrated
   */
  migrated: number;
  
  /**
   * Number of test cases with errors
   */
  errors: number;
  
  /**
   * Detailed error information
   */
  errorDetails: Array<{
    testCaseId: string;
    error: string;
  }>;
  
  /**
   * ID mapping from source to target system
   */
  idMapping: Map<string, string>;
}

/**
 * qTest Manager Provider specialization for test case migration
 */
export class QTestManagerProvider extends QTestProvider {
  private managerClient: QTestManagerClient | null = null;
  private migrationConfig: QTestManagerProviderConfig | null = null;
  private migrationStatus: MigrationStatus = {
    total: 0,
    migrated: 0,
    errors: 0,
    errorDetails: [],
    idMapping: new Map<string, string>()
  };
  
  /**
   * Override id to clearly identify the provider type
   */
  readonly id = 'qtest-manager';
  
  /**
   * Override name to clearly identify the provider type
   */
  readonly name = 'qTest Manager';
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: QTestManagerProviderConfig): Promise<void> {
    // First initialize the base provider
    await super.initialize(config);
    
    try {
      this.migrationConfig = config;
      
      // Create specialized manager client
      this.managerClient = new QTestManagerClient({
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        username: config.username,
        password: config.password,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        bypassSSL: config.bypassSSL,
        maxRetries: config.maxRetries
      });
    } catch (error) {
      throw this.wrapError('Failed to initialize qTest Manager provider', error);
    }
  }
  
  /**
   * Reset migration status tracking
   */
  resetMigrationStatus(): void {
    this.migrationStatus = {
      total: 0,
      migrated: 0,
      errors: 0,
      errorDetails: [],
      idMapping: new Map<string, string>()
    };
  }
  
  /**
   * Get current migration status
   */
  getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus, idMapping: new Map(this.migrationStatus.idMapping) };
  }
  
  // Enhanced capabilities
  
  /**
   * Get folders with module structure from qTest Manager
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      this.ensureManagerClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Get modules (folders) from qTest Manager
      const modulesResponse = await this.managerClient!.getModules(numericProjectId);
      const modules = modulesResponse.data;
      
      // Convert to internal Folder structure
      return this.convertModulesToFolders(modules);
    } catch (error) {
      throw this.wrapError(`Failed to get folders for project ${projectId}`, error);
    }
  }
  
  /**
   * Get test cases with enhanced filtering
   */
  async getTestCasesWithFilters(
    projectId: string,
    options: TestCaseQueryOptions & {
      searchText?: string;
      createdFrom?: Date;
      createdTo?: Date;
      updatedFrom?: Date;
      updatedTo?: Date;
      statuses?: string[];
      priorities?: string[];
    } = {}
  ): Promise<PaginatedResult<TestCase>> {
    try {
      this.ensureManagerClient();
      
      const numericProjectId = this.getProjectId(projectId);
      const moduleId = options.folderId ? parseInt(options.folderId, 10) : undefined;
      
      // Prepare filters for qTest Manager
      const response = await this.managerClient!.getTestCasesWithFilters(
        numericProjectId,
        {
          page: options.page,
          pageSize: options.pageSize,
          moduleId: !isNaN(moduleId!) ? moduleId : undefined,
          searchText: options.searchText,
          createdFrom: options.createdFrom,
          createdTo: options.createdTo,
          updatedFrom: options.updatedFrom,
          updatedTo: options.updatedTo,
          statuses: options.statuses,
          priorities: options.priorities,
          expandFields: ['test_steps', 'attachments']
        }
      );
      
      const testCases = QTestMapper.toTestCases(response.data);
      
      return {
        items: testCases,
        total: response.data.total || testCases.length,
        page: options.page || 1,
        pageSize: options.pageSize || testCases.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to get test cases with filters for project ${projectId}`, error);
    }
  }
  
  /**
   * Create folder structure in qTest Manager
   */
  async createFolderStructure(
    projectId: string,
    folders: Folder[]
  ): Promise<Map<string, string>> {
    try {
      this.ensureManagerClient();
      
      const numericProjectId = this.getProjectId(projectId);
      const folderMapping = new Map<string, string>();
      
      // Process root folders first
      for (const folder of folders.filter(f => !f.parentId)) {
        await this.createFolderWithHierarchy(numericProjectId, folder, null, folderMapping);
      }
      
      return folderMapping;
    } catch (error) {
      throw this.wrapError(`Failed to create folder structure in project ${projectId}`, error);
    }
  }
  
  /**
   * Migrate test cases to qTest Manager
   */
  async migrateTestCases(
    projectId: string,
    testCases: TestCase[],
    targetFolderMapping: Map<string, string>
  ): Promise<MigrationStatus> {
    try {
      this.ensureManagerClient();
      
      const numericProjectId = this.getProjectId(projectId);
      const batchSize = this.migrationConfig?.migrationBatchSize || 20;
      
      // Reset migration status
      this.resetMigrationStatus();
      this.migrationStatus.total = testCases.length;
      
      // Check if we need to clean target folders first
      if (this.migrationConfig?.cleanBeforeMigration) {
        await this.cleanTargetFolders(numericProjectId, targetFolderMapping);
      }
      
      // Process test cases in batches
      for (let i = 0; i < testCases.length; i += batchSize) {
        const batch = testCases.slice(i, i + batchSize);
        await this.migrateTestCaseBatch(numericProjectId, batch, targetFolderMapping);
      }
      
      return this.getMigrationStatus();
    } catch (error) {
      throw this.wrapError(`Failed to migrate test cases to project ${projectId}`, error);
    }
  }
  
  /**
   * Migrate test case links
   * Links represent relationships between test cases
   */
  async migrateTestCaseLinks(
    projectId: string,
    links: Array<{
      sourceId: string;
      targetId: string;
      linkType: string;
    }>
  ): Promise<void> {
    try {
      this.ensureManagerClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Process each link
      for (const link of links) {
        // Look up mapped IDs from migration
        const sourceId = this.migrationStatus.idMapping.get(link.sourceId);
        const targetId = this.migrationStatus.idMapping.get(link.targetId);
        
        if (sourceId && targetId) {
          await this.managerClient!.createLink(
            numericProjectId,
            'test-case',
            parseInt(sourceId, 10),
            'test-case',
            parseInt(targetId, 10),
            this.mapLinkType(link.linkType)
          );
        }
      }
    } catch (error) {
      throw this.wrapError(`Failed to migrate test case links to project ${projectId}`, error);
    }
  }
  
  // Helper methods
  
  /**
   * Ensure the manager client is initialized
   */
  private ensureManagerClient(): void {
    if (!this.managerClient || !this.migrationConfig) {
      throw new Error('qTest Manager provider not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Convert qTest modules to internal Folder structure
   */
  private convertModulesToFolders(modules: any[], parentId = ''): Folder[] {
    if (!Array.isArray(modules)) {
      return [];
    }
    
    const folders: Folder[] = [];
    
    for (const module of modules) {
      const folder: Folder = {
        id: module.id.toString(),
        name: module.name,
        path: module.path || `/${module.name}`,
        description: module.description || '',
        parentId: parentId || undefined
      };
      
      folders.push(folder);
      
      // Add submodules
      if (module.sub_modules && Array.isArray(module.sub_modules)) {
        folders.push(...this.convertModulesToFolders(module.sub_modules, folder.id));
      }
    }
    
    return folders;
  }
  
  /**
   * Create a folder and its subfolders recursively
   */
  private async createFolderWithHierarchy(
    projectId: number,
    folder: Folder,
    parentId: number | null,
    folderMapping: Map<string, string>
  ): Promise<string> {
    try {
      // Create the folder in qTest
      const moduleData: any = {
        name: folder.name,
        description: folder.description || ''
      };
      
      if (parentId !== null) {
        moduleData.parent_id = parentId;
      }
      
      const response = await this.managerClient!.createModule(projectId, moduleData);
      const newFolderId = response.data.id.toString();
      
      // Map the original folder ID to the new one
      folderMapping.set(folder.id, newFolderId);
      
      // Create child folders
      const childFolders = folder.children || [];
      for (const childFolder of childFolders) {
        await this.createFolderWithHierarchy(
          projectId,
          childFolder,
          parseInt(newFolderId, 10),
          folderMapping
        );
      }
      
      return newFolderId;
    } catch (error) {
      throw this.wrapError(`Failed to create folder ${folder.name}`, error);
    }
  }
  
  /**
   * Clean target folders before migration
   */
  private async cleanTargetFolders(
    projectId: number,
    folderMapping: Map<string, string>
  ): Promise<void> {
    try {
      for (const targetFolderId of folderMapping.values()) {
        await this.managerClient!.deleteAllTestCasesInModule(
          projectId,
          parseInt(targetFolderId, 10)
        );
      }
    } catch (error) {
      throw this.wrapError('Failed to clean target folders', error);
    }
  }
  
  /**
   * Migrate a batch of test cases
   */
  private async migrateTestCaseBatch(
    projectId: number,
    testCases: TestCase[],
    folderMapping: Map<string, string>
  ): Promise<void> {
    // Process each test case
    for (const testCase of testCases) {
      try {
        // Map folder ID if available
        const targetFolderId = testCase.folder && folderMapping.get(testCase.folder);
        
        // Create qTest test case
        const qTestCase = QTestMapper.fromTestCase(testCase);
        
        // Set correct folder ID
        if (targetFolderId) {
          qTestCase.parent_id = parseInt(targetFolderId, 10);
        }
        
        // Create the test case
        const response = await this.managerClient!.createTestCase(projectId, qTestCase);
        const newTestCaseId = response.data.id.toString();
        
        // Save ID mapping
        if (testCase.id) {
          this.migrationStatus.idMapping.set(testCase.id, newTestCaseId);
        }
        
        // Upload attachments if available
        if (testCase.attachments && testCase.attachments.length > 0) {
          await this.migrateTestCaseAttachments(
            projectId,
            parseInt(newTestCaseId, 10),
            testCase.attachments
          );
        }
        
        // Update migration status
        this.migrationStatus.migrated++;
      } catch (error) {
        // Track errors
        this.migrationStatus.errors++;
        this.migrationStatus.errorDetails.push({
          testCaseId: testCase.id || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  
  /**
   * Migrate test case attachments
   */
  private async migrateTestCaseAttachments(
    projectId: number,
    testCaseId: number,
    attachments: TestCase['attachments']
  ): Promise<void> {
    if (!attachments || attachments.length === 0) {
      return;
    }
    
    // Process each attachment
    for (const attachment of attachments) {
      try {
        if (!attachment.id) {
          continue;
        }
        
        // Get the attachment content
        const content = await super.getAttachmentContent(
          projectId.toString(),
          attachment.id
        );
        
        // Upload the attachment to the new test case
        await super.uploadAttachment(
          projectId.toString(),
          EntityType.TEST_CASE,
          testCaseId.toString(),
          content
        );
      } catch (error) {
        // Log error but continue with other attachments
        console.error(`Failed to migrate attachment ${attachment.id}: ${error}`);
      }
    }
  }
  
  /**
   * Map link type to qTest link type
   */
  private mapLinkType(linkType: string): string {
    const linkTypeMap: Record<string, string> = {
      'RELATED': 'related',
      'DEPENDS': 'depends',
      'PARENT': 'parent',
      'CHILD': 'child',
      'BLOCKS': 'blocks',
      'BLOCKED_BY': 'blocked-by',
      'DUPLICATES': 'duplicates',
      'DUPLICATED_BY': 'duplicated-by'
    };
    
    return linkTypeMap[linkType.toUpperCase()] || 'related';
  }
}