/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Facade Provider
 * 
 * Provides a unified interface for all qTest products, coordinating
 * interactions between them when necessary.
 */

import {
  TestManagementProvider,
  SourceProvider,
  TargetProvider,
  ProviderConfig,
  ConnectionStatus,
  ProviderMetadata,
  ProviderCapabilities,
  EntityType,
  TestCaseQueryOptions,
  TestCycleQueryOptions,
  ExecutionQueryOptions
} from '../../common/src/interfaces/provider';

import {
  Project,
  Folder,
  TestCase,
  TestCycle,
  TestExecution
} from '../../common/src/models/entities';

import { AttachmentContent } from '../../common/src/models/attachment';
import { FieldDefinition } from '../../common/src/models/field-definition';
import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestProviderFactory, QTestProductType, QTestFactoryConfig } from './provider-factory';
import { QTestManagerProvider } from './manager-provider';
import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * qTest Facade Provider Configuration
 */
export interface QTestFacadeConfig extends ProviderConfig {
  /**
   * Base URL for qTest
   */
  baseUrl: string;
  
  /**
   * API token
   */
  apiToken?: string;
  
  /**
   * Username
   */
  username?: string;
  
  /**
   * Password
   */
  password?: string;
  
  /**
   * Default project ID
   */
  defaultProjectId?: number;
  
  /**
   * Product-specific configuration
   */
  products?: {
    manager?: Record<string, any>;
    parameters?: Record<string, any>;
    scenario?: Record<string, any>;
    pulse?: Record<string, any>;
    dataExport?: Record<string, any>;
  };
  
  /**
   * Common configuration
   */
  common?: {
    maxRequestsPerMinute?: number;
    bypassSSL?: boolean;
    maxRetries?: number;
  };
}

/**
 * qTest Facade Provider
 * 
 * Acts as a unified interface for all qTest products.
 */
export class QTestFacadeProvider implements SourceProvider, TargetProvider {
  private config: QTestFacadeConfig | null = null;
  
  // Individual product providers
  private managerProvider: QTestManagerProvider | null = null;
  private parametersProvider: TestManagementProvider | null = null;
  private scenarioProvider: TestManagementProvider | null = null;
  private pulseProvider: TestManagementProvider | null = null;
  private dataExportProvider: TestManagementProvider | null = null;
  
  // Connection status for each product
  private productStatus: Record<QTestProductType, boolean> = {
    [QTestProductType.MANAGER]: false,
    [QTestProductType.PARAMETERS]: false,
    [QTestProductType.SCENARIO]: false,
    [QTestProductType.PULSE]: false,
    [QTestProductType.DATA_EXPORT]: false
  };
  
  // Provider identity
  readonly id = 'qtest-facade';
  readonly name = 'qTest Unified';
  readonly version = '1.0.0';
  
  // Combined capabilities from all products
  readonly capabilities: ProviderCapabilities = {
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
    supportsCustomFields: true
  };
  
  /**
   * Initialize the facade provider
   */
  async initialize(config: QTestFacadeConfig): Promise<void> {
    this.config = config;
    
    // Basic validation
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    
    // Authentication validation
    if (!config.apiToken && (!config.username || !config.password)) {
      throw new Error('Either apiToken or both username and password must be provided');
    }
    
    // Initialize the qTest Manager provider (always initialized as core product)
    await this.initializeManagerProvider();
    
    // Initialize other providers as needed (will be implemented in future tasks)
    // These are commented out for now as they will be addressed in future tasks
    
    /*
    // Initialize Parameters provider if configured
    if (config.products?.parameters) {
      await this.initializeParametersProvider();
    }
    
    // Initialize Scenario provider if configured
    if (config.products?.scenario) {
      await this.initializeScenarioProvider();
    }
    
    // Initialize Pulse provider if configured
    if (config.products?.pulse) {
      await this.initializePulseProvider();
    }
    
    // Initialize Data Export provider if configured
    if (config.products?.dataExport) {
      await this.initializeDataExportProvider();
    }
    */
  }
  
  /**
   * Test connection to all configured qTest products
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      const details: Record<string, any> = {};
      let connected = false;
      
      // Test connection to qTest Manager
      if (this.managerProvider) {
        const managerStatus = await this.managerProvider.testConnection();
        this.productStatus[QTestProductType.MANAGER] = managerStatus.connected;
        details[QTestProductType.MANAGER] = managerStatus;
        
        // Only need one successful connection for facade to be considered connected
        if (managerStatus.connected) {
          connected = true;
        }
      }
      
      // Test connection to other products (will be implemented in future tasks)
      // ...
      
      return {
        connected,
        details
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          connected: false,
          error: `qTest Facade error: ${error.message}`
        };
      }
      
      return {
        connected: false,
        error: 'Unknown connection error'
      };
    }
  }
  
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      systemName: 'qTest Unified',
      providerVersion: this.version,
      capabilities: this.capabilities,
      configSchema: {
        baseUrl: { type: 'string', required: true },
        apiToken: { type: 'string', required: false },
        username: { type: 'string', required: false },
        password: { type: 'string', required: false },
        defaultProjectId: { type: 'number', required: false },
        products: {
          type: 'object',
          properties: {
            manager: { type: 'object' },
            parameters: { type: 'object' },
            scenario: { type: 'object' },
            pulse: { type: 'object' },
            dataExport: { type: 'object' }
          }
        },
        common: {
          type: 'object',
          properties: {
            maxRequestsPerMinute: { type: 'number' },
            bypassSSL: { type: 'boolean' },
            maxRetries: { type: 'number' }
          }
        }
      }
    };
  }
  
  /**
   * Get projects from qTest Manager
   */
  async getProjects(): Promise<Project[]> {
    this.ensureManagerProvider();
    return this.managerProvider!.getProjects();
  }
  
  /**
   * Get folders/module structure from qTest Manager
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    this.ensureManagerProvider();
    return this.managerProvider!.getFolders(projectId);
  }
  
  /**
   * Get test cases from qTest Manager
   */
  async getTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<TestCase>> {
    this.ensureManagerProvider();
    return this.managerProvider!.getTestCases(projectId, options);
  }
  
  /**
   * Get a single test case from qTest Manager
   */
  async getTestCase(
    projectId: string,
    testCaseId: string
  ): Promise<TestCase> {
    this.ensureManagerProvider();
    return this.managerProvider!.getTestCase(projectId, testCaseId);
  }
  
  /**
   * Get test cycles from qTest Manager
   */
  async getTestCycles(
    projectId: string,
    options?: TestCycleQueryOptions
  ): Promise<PaginatedResult<TestCycle>> {
    this.ensureManagerProvider();
    return this.managerProvider!.getTestCycles(projectId, options);
  }
  
  /**
   * Get test executions from qTest Manager
   */
  async getTestExecutions(
    projectId: string,
    testCycleId: string,
    options?: ExecutionQueryOptions
  ): Promise<PaginatedResult<TestExecution>> {
    this.ensureManagerProvider();
    return this.managerProvider!.getTestExecutions(projectId, testCycleId, options);
  }
  
  /**
   * Get attachment content from qTest Manager
   */
  async getAttachmentContent(
    projectId: string,
    attachmentId: string
  ): Promise<AttachmentContent> {
    this.ensureManagerProvider();
    return this.managerProvider!.getAttachmentContent(projectId, attachmentId);
  }
  
  /**
   * Get field definitions from qTest Manager
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    this.ensureManagerProvider();
    return this.managerProvider!.getFieldDefinitions(projectId);
  }
  
  /**
   * Create a folder in qTest Manager
   */
  async createFolder(
    projectId: string,
    folder: Folder
  ): Promise<string> {
    this.ensureManagerProvider();
    return this.managerProvider!.createFolder(projectId, folder);
  }
  
  /**
   * Create a test case in qTest Manager
   */
  async createTestCase(
    projectId: string,
    testCase: TestCase
  ): Promise<string> {
    this.ensureManagerProvider();
    return this.managerProvider!.createTestCase(projectId, testCase);
  }
  
  /**
   * Create test steps in qTest Manager
   */
  async createTestSteps(
    projectId: string,
    testCaseId: string,
    steps: TestCase['steps']
  ): Promise<void> {
    this.ensureManagerProvider();
    return this.managerProvider!.createTestSteps(projectId, testCaseId, steps);
  }
  
  /**
   * Create a test cycle in qTest Manager
   */
  async createTestCycle(
    projectId: string,
    testCycle: TestCycle
  ): Promise<string> {
    this.ensureManagerProvider();
    return this.managerProvider!.createTestCycle(projectId, testCycle);
  }
  
  /**
   * Create test executions in qTest Manager
   */
  async createTestExecutions(
    projectId: string,
    testCycleId: string,
    executions: TestExecution[]
  ): Promise<void> {
    this.ensureManagerProvider();
    return this.managerProvider!.createTestExecutions(projectId, testCycleId, executions);
  }
  
  /**
   * Upload an attachment to qTest Manager
   */
  async uploadAttachment(
    projectId: string,
    entityType: string,
    entityId: string,
    attachment: AttachmentContent
  ): Promise<string> {
    this.ensureManagerProvider();
    return this.managerProvider!.uploadAttachment(projectId, entityType, entityId, attachment);
  }
  
  /**
   * Create a field definition in qTest Manager (not supported)
   */
  async createFieldDefinition(
    projectId: string,
    fieldDefinition: FieldDefinition
  ): Promise<string> {
    throw new Error('Creating custom fields is not supported by the qTest API');
  }
  
  /**
   * Migrate test cases to qTest Manager
   * 
   * Special facade method for test case migration that coordinates
   * across multiple qTest products as needed.
   */
  async migrateTestCases(
    projectId: string,
    testCases: TestCase[]
  ): Promise<Record<string, any>> {
    this.ensureManagerProvider();
    
    // Create a folder mapping for all test case folders
    const folderIds = new Set<string>();
    testCases.forEach(tc => {
      if (tc.folder) folderIds.add(tc.folder);
    });
    
    // Get folder data for all folders that contain test cases
    const folders = await this.getFolders(projectId);
    const relevantFolders = folders.filter(f => folderIds.has(f.id));
    
    // Create folder structure
    const folderMapping = await (this.managerProvider as QTestManagerProvider)
      .createFolderStructure(projectId, relevantFolders);
    
    // Migrate the test cases
    return (this.managerProvider as QTestManagerProvider)
      .migrateTestCases(projectId, testCases, folderMapping);
  }
  
  // Provider initialization methods
  
  /**
   * Initialize qTest Manager provider
   */
  private async initializeManagerProvider(): Promise<void> {
    try {
      // Create and initialize the provider
      this.managerProvider = QTestProviderFactory.createProvider({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        product: QTestProductType.MANAGER,
        productConfig: this.config!.products?.manager || {}
      }) as QTestManagerProvider;
      
      await this.managerProvider.initialize({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        ...this.config!.products?.manager
      });
    } catch (error) {
      throw new ExternalServiceError(
        'qTest Manager',
        `Failed to initialize qTest Manager provider: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Ensure the Manager provider is initialized
   */
  private ensureManagerProvider(): void {
    if (!this.managerProvider) {
      throw new Error('qTest Manager provider not initialized');
    }
  }
  
  // The following methods will be implemented in future tasks
  
  /*
  private async initializeParametersProvider(): Promise<void> {
    // TODO: Implement in future tasks
  }
  
  private async initializeScenarioProvider(): Promise<void> {
    // TODO: Implement in future tasks
  }
  
  private async initializePulseProvider(): Promise<void> {
    // TODO: Implement in future tasks
  }
  
  private async initializeDataExportProvider(): Promise<void> {
    // TODO: Implement in future tasks
  }
  */
}