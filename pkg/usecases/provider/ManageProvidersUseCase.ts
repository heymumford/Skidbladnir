/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../domain/services/LoggerService';
import { 
  TestManagementProvider, 
  SourceProvider, 
  TargetProvider, 
  ProviderConfig, 
  ConnectionStatus, 
  ProviderRegistry
} from '../../../packages/common/src/interfaces/provider';
import { 
  Project, 
  TestCase,
  Folder,
  TestCycle,
  TestExecution,
  MigrationJob
} from '../../../packages/common/src/models/entities';
import { AttachmentContent } from '../../../packages/common/src/models/attachment';
import { PaginatedResult } from '../../../packages/common/src/models/paginated';
import { FieldDefinition } from '../../../packages/common/src/models/field-definition';

/**
 * Input for registering a provider
 */
export interface RegisterProviderInput {
  provider: TestManagementProvider;
}

/**
 * Input for initializing a provider
 */
export interface InitializeProviderInput {
  providerId: string;
  config: ProviderConfig;
}

/**
 * Input for testing provider connection
 */
export interface TestConnectionInput {
  providerId: string;
}

/**
 * Input for getting provider capabilities
 */
export interface GetProviderCapabilitiesInput {
  providerId: string;
}

/**
 * Input for getting test cases
 */
export interface GetTestCasesInput {
  providerId: string;
  projectId: string;
  options?: {
    page?: number;
    pageSize?: number;
    folderId?: string;
    includeSteps?: boolean;
    includeAttachments?: boolean;
    status?: string;
  };
}

/**
 * Input for getting a test case
 */
export interface GetTestCaseInput {
  providerId: string;
  projectId: string;
  testCaseId: string;
}

/**
 * Input for creating a test case
 */
export interface CreateTestCaseInput {
  providerId: string;
  projectId: string;
  testCase: TestCase;
}

/**
 * Input for uploading an attachment
 */
export interface UploadAttachmentInput {
  providerId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  attachment: AttachmentContent;
}

/**
 * Input for migrating test cases between providers
 */
export interface MigrateTestCasesInput {
  sourceProviderId: string;
  targetProviderId: string;
  sourceProjectId: string;
  targetProjectId: string;
  options: {
    testCaseIds?: string[];
    folderIds?: string[];
    includeAttachments?: boolean;
    includeHistory?: boolean;
    preserveHierarchy?: boolean;
    preserveIds?: boolean;
  };
}

/**
 * Result for migration operation
 */
export interface MigrationResult {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'cancelled';
  sourceProvider: string;
  targetProvider: string;
  sourceProject: string;
  targetProject: string;
  totalTestCases: number;
  migratedTestCases: number;
  failedTestCases: number;
  idMapping: Map<string, string>;
  errors: string[];
}

/**
 * Main use case for managing providers and their operations
 */
export class ManageProvidersUseCase {
  private logger: LoggerService;
  private providerRegistry: ProviderRegistry;
  private migrationJobs: Map<string, MigrationJob> = new Map();

  constructor(
    loggerService: LoggerService,
    providerRegistry?: ProviderRegistry
  ) {
    this.logger = loggerService;
    this.providerRegistry = providerRegistry || new ProviderRegistry();
  }

  /**
   * Register a provider in the system
   */
  registerProvider(input: RegisterProviderInput): void {
    this.logger.info(`Registering provider ${input.provider.id} (${input.provider.name})`);
    this.providerRegistry.registerProvider(input.provider);
  }

  /**
   * Initialize a provider with configuration
   */
  async initializeProvider(input: InitializeProviderInput): Promise<void> {
    const provider = this.getProviderById(input.providerId);
    
    this.logger.info(`Initializing provider ${provider.id} (${provider.name})`);
    await provider.initialize(input.config);
  }

  /**
   * Test connection to a provider
   */
  async testConnection(input: TestConnectionInput): Promise<ConnectionStatus> {
    const provider = this.getProviderById(input.providerId);
    
    this.logger.info(`Testing connection to provider ${provider.id} (${provider.name})`);
    try {
      return await provider.testConnection();
    } catch (error) {
      this.logger.error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        connected: false,
        error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(input: GetProviderCapabilitiesInput): any {
    const provider = this.getProviderById(input.providerId);
    
    this.logger.debug(`Getting capabilities for provider ${provider.id}`);
    return provider.getMetadata().capabilities;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): TestManagementProvider[] {
    return this.providerRegistry.getAllProviders();
  }

  /**
   * Get all source providers
   */
  getSourceProviders(): SourceProvider[] {
    return this.providerRegistry.getSourceProviders();
  }

  /**
   * Get all target providers
   */
  getTargetProviders(): TargetProvider[] {
    return this.providerRegistry.getTargetProviders();
  }

  /**
   * Get projects from a provider
   */
  async getProjects(providerId: string): Promise<Project[]> {
    const provider = this.getProviderById(providerId);
    
    if ('getProjects' in provider) {
      // Use type assertion to help TypeScript understand this is a valid function
      const getProjectsFn = provider.getProjects as () => Promise<Project[]>;
      return getProjectsFn();
    }
    
    throw new Error(`Provider ${providerId} does not support getting projects`);
  }

  /**
   * Get folders from a provider
   */
  async getFolders(providerId: string, projectId: string): Promise<Folder[]> {
    const provider = this.getProviderById(providerId);
    
    if ('getFolders' in provider && this.isSourceProvider(provider)) {
      return provider.getFolders(projectId);
    }
    
    throw new Error(`Provider ${providerId} does not support getting folders`);
  }

  /**
   * Get test cases from a provider
   */
  async getTestCases(input: GetTestCasesInput): Promise<PaginatedResult<TestCase>> {
    const provider = this.getProviderById(input.providerId);
    
    if (this.isSourceProvider(provider)) {
      return provider.getTestCases(input.projectId, input.options);
    }
    
    throw new Error(`Provider ${input.providerId} does not support getting test cases`);
  }

  /**
   * Get a single test case from a provider
   */
  async getTestCase(input: GetTestCaseInput): Promise<TestCase> {
    const provider = this.getProviderById(input.providerId);
    
    if (this.isSourceProvider(provider)) {
      return provider.getTestCase(input.projectId, input.testCaseId);
    }
    
    throw new Error(`Provider ${input.providerId} does not support getting test cases`);
  }

  /**
   * Create a test case in a provider
   */
  async createTestCase(input: CreateTestCaseInput): Promise<string> {
    const provider = this.getProviderById(input.providerId);
    
    if (this.isTargetProvider(provider)) {
      return provider.createTestCase(input.projectId, input.testCase);
    }
    
    throw new Error(`Provider ${input.providerId} does not support creating test cases`);
  }

  /**
   * Upload an attachment to a provider
   */
  async uploadAttachment(input: UploadAttachmentInput): Promise<string> {
    const provider = this.getProviderById(input.providerId);
    
    if (this.isTargetProvider(provider)) {
      return provider.uploadAttachment(
        input.projectId,
        input.entityType,
        input.entityId,
        input.attachment
      );
    }
    
    throw new Error(`Provider ${input.providerId} does not support uploading attachments`);
  }

  /**
   * Start a migration job between providers
   */
  async startMigration(input: MigrateTestCasesInput): Promise<MigrationResult> {
    const sourceProvider = this.getProviderById(input.sourceProviderId);
    const targetProvider = this.getProviderById(input.targetProviderId);
    
    if (!this.isSourceProvider(sourceProvider)) {
      throw new Error(`Provider cannot be used as a source`);
    }
    
    if (!this.isTargetProvider(targetProvider)) {
      throw new Error(`Provider cannot be used as a target`);
    }
    
    // Validate that both providers are initialized
    if (!sourceProvider.testConnection || !targetProvider.testConnection) {
      throw new Error('Providers must be initialized before starting migration');
    }
    
    // Create migration job
    const jobId = `migration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize migration job
    const migrationJob: MigrationJob = {
      id: jobId,
      projectId: input.targetProjectId,
      sourceProvider: input.sourceProviderId,
      targetProvider: input.targetProviderId,
      status: 'in_progress',
      startedAt: new Date(),
      stats: {
        totalTestCases: 0,
        processedTestCases: 0,
        totalTestCycles: 0,
        processedTestCycles: 0,
        totalExecutions: 0,
        processedExecutions: 0,
        totalAttachments: 0,
        processedAttachments: 0,
        errors: 0
      }
    };
    
    this.migrationJobs.set(jobId, migrationJob);
    
    // Start migration in the background
    this.executeMigration(jobId, input, sourceProvider, targetProvider, migrationJob)
      .catch(error => {
        this.logger.error(`Migration job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`);
        
        // Update job status
        const job = this.migrationJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : String(error);
          this.migrationJobs.set(jobId, job);
        }
      });
    
    // Return initial job status
    return {
      jobId,
      status: 'pending',
      sourceProvider: sourceProvider.name,
      targetProvider: targetProvider.name,
      sourceProject: input.sourceProjectId,
      targetProject: input.targetProjectId,
      totalTestCases: 0,
      migratedTestCases: 0,
      failedTestCases: 0,
      idMapping: new Map<string, string>(),
      errors: []
    };
  }

  /**
   * Get the status of a migration job
   */
  getMigrationStatus(jobId: string): MigrationResult | null {
    const job = this.migrationJobs.get(jobId);
    
    if (!job) {
      return null;
    }
    
    return {
      jobId: job.id,
      status: job.status,
      sourceProvider: job.sourceProvider || '',
      targetProvider: job.targetProvider || '',
      sourceProject: '', // We don't store this in the job
      targetProject: job.projectId,
      totalTestCases: job.stats?.totalTestCases || 0,
      migratedTestCases: job.stats?.processedTestCases || 0,
      failedTestCases: job.stats?.errors || 0,
      idMapping: new Map<string, string>(), // We don't store this in the job
      errors: job.error ? [job.error] : []
    };
  }
  
  /**
   * Pause a migration job
   */
  pauseMigration(jobId: string): {
    success: boolean;
    error?: string;
  } {
    const job = this.migrationJobs.get(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Migration job not found'
      };
    }
    
    // Can only pause in-progress jobs
    if (job.status !== 'in_progress') {
      return {
        success: false,
        error: `Cannot pause migration job in ${job.status} state`
      };
    }
    
    job.status = 'paused';
    this.migrationJobs.set(jobId, job);
    
    this.logger.info(`Paused migration job ${jobId}`);
    
    return {
      success: true
    };
  }
  
  /**
   * Resume a migration job
   */
  resumeMigration(jobId: string): {
    success: boolean;
    error?: string;
  } {
    const job = this.migrationJobs.get(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Migration job not found'
      };
    }
    
    // Can only resume paused jobs
    if (job.status !== 'paused') {
      return {
        success: false,
        error: `Cannot resume migration job in ${job.status} state`
      };
    }
    
    job.status = 'in_progress';
    this.migrationJobs.set(jobId, job);
    
    this.logger.info(`Resumed migration job ${jobId}`);
    
    return {
      success: true
    };
  }
  
  /**
   * Cancel a migration job
   */
  cancelMigration(jobId: string): {
    success: boolean;
    error?: string;
  } {
    const job = this.migrationJobs.get(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Migration job not found'
      };
    }
    
    // Can only cancel in-progress or paused jobs
    if (job.status !== 'in_progress' && job.status !== 'paused') {
      return {
        success: false,
        error: `Cannot cancel migration job in ${job.status} state`
      };
    }
    
    job.status = 'cancelled';
    this.migrationJobs.set(jobId, job);
    
    this.logger.info(`Cancelled migration job ${jobId}`);
    
    return {
      success: true
    };
  }

  /**
   * Execute a migration job
   */
  private async executeMigration(
    jobId: string,
    input: MigrateTestCasesInput,
    sourceProvider: SourceProvider,
    targetProvider: TargetProvider,
    migrationJob: MigrationJob
  ): Promise<void> {
    try {
      // Update job status
      migrationJob.status = 'in_progress';
      this.migrationJobs.set(jobId, migrationJob);
      
      // Get test cases to migrate
      let testCases: TestCase[] = [];
      
      if (input.options.testCaseIds && input.options.testCaseIds.length > 0) {
        // Fetch specific test cases
        testCases = await Promise.all(
          input.options.testCaseIds.map(id => sourceProvider.getTestCase(input.sourceProjectId, id))
        );
      } else if (input.options.folderIds && input.options.folderIds.length > 0) {
        // Fetch test cases from specific folders
        const allTestCases: TestCase[] = [];
        
        for (const folderId of input.options.folderIds) {
          const result = await sourceProvider.getTestCases(input.sourceProjectId, {
            folderId,
            includeSteps: true,
            includeAttachments: input.options.includeAttachments
          });
          
          allTestCases.push(...result.items);
        }
        
        testCases = allTestCases;
      } else {
        // Fetch all test cases
        const result = await sourceProvider.getTestCases(input.sourceProjectId, {
          includeSteps: true,
          includeAttachments: input.options.includeAttachments
        });
        
        testCases = result.items;
      }
      
      // Update migration job with test case count
      migrationJob.stats!.totalTestCases = testCases.length;
      this.migrationJobs.set(jobId, migrationJob);
      
      // Create folder structure if needed
      if (input.options.preserveHierarchy) {
        const folders = await sourceProvider.getFolders(input.sourceProjectId);
        
        // Organize folders by parent ID
        const folderMap = new Map<string | undefined, Folder[]>();
        
        for (const folder of folders) {
          const parentId = folder.parentId;
          
          if (!folderMap.has(parentId)) {
            folderMap.set(parentId, []);
          }
          
          folderMap.get(parentId)!.push(folder);
        }
        
        // Create folders in target system
        const folderIdMapping = new Map<string, string>();
        
        // First, create root folders
        const rootFolders = folderMap.get(undefined) || [];
        
        for (const folder of rootFolders) {
          const targetFolderId = await targetProvider.createFolder(input.targetProjectId, folder);
          folderIdMapping.set(folder.id, targetFolderId);
        }
        
        // Then, create child folders
        // Convert keys to array to avoid downlevelIteration issue
        const parentIds = Array.from(folderMap.keys());
        
        for (const parentId of parentIds) {
          if (parentId === undefined) {
            continue;
          }
          
          const targetParentId = folderIdMapping.get(parentId);
          
          if (!targetParentId) {
            continue;
          }
          
          const childFolders = folderMap.get(parentId) || [];
          
          for (const folder of childFolders) {
            // Update parent ID to point to target system ID
            const folderToCreate = { ...folder, parentId: targetParentId };
            const targetFolderId = await targetProvider.createFolder(input.targetProjectId, folderToCreate);
            folderIdMapping.set(folder.id, targetFolderId);
          }
        }
      }
      
      // Process test cases
      const idMapping = new Map<string, string>();
      const errors: string[] = [];
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          // Create test case in target system
          const targetTestCaseId = await targetProvider.createTestCase(input.targetProjectId, testCase);
          
          // Map source ID to target ID
          idMapping.set(testCase.id, targetTestCaseId);
          
          // Create test steps if needed
          if (testCase.steps && testCase.steps.length > 0) {
            await targetProvider.createTestSteps(input.targetProjectId, targetTestCaseId, testCase.steps);
          }
          
          // Process attachments if needed
          if (input.options.includeAttachments && testCase.attachments && testCase.attachments.length > 0) {
            for (const attachment of testCase.attachments) {
              try {
                // Get attachment content
                const content = await sourceProvider.getAttachmentContent(input.sourceProjectId, attachment.id!);
                
                // Upload attachment to target system
                await targetProvider.uploadAttachment(
                  input.targetProjectId,
                  'test_case',
                  targetTestCaseId,
                  content
                );
                
                // Update statistics
                migrationJob.stats!.processedAttachments++;
              } catch (error) {
                this.logger.warn(`Failed to migrate attachment ${attachment.id} for test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
                errors.push(`Failed to migrate attachment ${attachment.id} for test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          }
          
          // Update statistics
          migrationJob.stats!.processedTestCases++;
        } catch (error) {
          this.logger.error(`Failed to migrate test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
          errors.push(`Failed to migrate test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
          migrationJob.stats!.errors++;
        }
        
        // Update job progress
        migrationJob.progress = Math.round((i + 1) / testCases.length * 100);
        this.migrationJobs.set(jobId, migrationJob);
      }
      
      // Process history if needed
      if (input.options.includeHistory) {
        // This would require additional implementation for execution history
      }
      
      // Complete migration job
      migrationJob.status = 'completed';
      migrationJob.completedAt = new Date();
      this.migrationJobs.set(jobId, migrationJob);
      
      this.logger.info(`Migration job ${jobId} completed successfully`);
    } catch (error) {
      this.logger.error(`Migration job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Update job status
      migrationJob.status = 'failed';
      migrationJob.error = error instanceof Error ? error.message : String(error);
      this.migrationJobs.set(jobId, migrationJob);
      
      throw error;
    }
  }

  /**
   * Get a provider by ID
   */
  private getProviderById(providerId: string): TestManagementProvider {
    const provider = this.providerRegistry.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider not found`);
    }
    
    return provider;
  }

  /**
   * Check if a provider is a source provider
   */
  private isSourceProvider(provider: TestManagementProvider): provider is SourceProvider {
    return provider.capabilities.canBeSource;
  }

  /**
   * Check if a provider is a target provider
   */
  private isTargetProvider(provider: TestManagementProvider): provider is TargetProvider {
    return provider.capabilities.canBeTarget;
  }
}