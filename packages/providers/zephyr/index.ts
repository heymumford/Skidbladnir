/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Zephyr Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * for Zephyr Scale, supporting both source and target operations.
 */

import {
  TestManagementProvider as _TestManagementProvider,
  SourceProvider,
  TargetProvider,
  ProviderConfig,
  ConnectionStatus,
  ProviderMetadata,
  ProviderCapabilities,
  EntityType,
  TestCaseQueryOptions,
  TestCycleQueryOptions,
  ExecutionQueryOptions,
  ProviderApiContract,
  OperationDefinition as _OperationDefinition
} from '../../common/src/interfaces/provider';

import {
  Project,
  Folder,
  TestCase,
  TestCycle,
  TestExecution,
  Attachment
} from '../../common/src/models/entities';

import { AttachmentContent } from '../../common/src/models/attachment';
import { FieldDefinition } from '../../common/src/models/field-definition';
import { PaginatedResult } from '../../common/src/models/paginated';

import { ZephyrClient } from './api-client';
import { ZephyrMapper } from './models/mappers';
import { ExternalServiceError as _ExternalServiceError } from '../../pkg/domain/errors/DomainErrors';
import { createErrorHandler } from '../../common/src/utils/resilience/error-handler';

/**
 * Zephyr provider configuration
 */
export interface ZephyrProviderConfig extends ProviderConfig {
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
   * Default project key to use if not specified
   */
  defaultProjectKey?: string;
  
  /**
   * Maximum requests per minute allowed by the API
   */
  maxRequestsPerMinute?: number;
}

/**
 * Implementation of the Zephyr Scale provider
 */
export class ZephyrProvider implements SourceProvider, TargetProvider {
  private client: ZephyrClient | null = null;
  private config: ZephyrProviderConfig | null = null;
  
  // Provider identity
  readonly id = 'zephyr-scale';
  readonly name = 'Zephyr Scale';
  readonly version = '1.0.0';
  
  // Provider capabilities
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
   * Initialize the provider with configuration
   */
  async initialize(config: ZephyrProviderConfig): Promise<void> {
    this.config = config;
    this.client = new ZephyrClient({
      baseUrl: config.baseUrl,
      apiToken: config.apiToken,
      jiraUrl: config.jiraUrl,
      jiraUsername: config.jiraUsername,
      jiraApiToken: config.jiraApiToken,
      maxRequestsPerMinute: config.maxRequestsPerMinute
    });
  }
  
  /**
   * Test connection with Zephyr Scale
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      if (!this.client) {
        throw new Error('Provider not initialized');
      }
      
      const response = await this.client.testConnection();
      
      return {
        connected: response.status >= 200 && response.status < 300,
        error: response.status >= 300 ? `HTTP ${response.status}: ${response.statusText}` : undefined,
        details: {
          status: response.status,
          headers: response.headers
        }
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      systemName: 'Zephyr Scale',
      providerVersion: this.version,
      capabilities: this.capabilities,
      configSchema: {
        baseUrl: { type: 'string', required: true },
        apiToken: { type: 'string', required: true },
        defaultProjectKey: { type: 'string', required: false },
        jiraUrl: { type: 'string', required: false },
        jiraUsername: { type: 'string', required: false },
        jiraApiToken: { type: 'string', required: false },
        maxRequestsPerMinute: { type: 'number', required: false }
      }
    };
  }
  
  /**
   * Get projects from Zephyr Scale
   */
  async getProjects(): Promise<Project[]> {
    try {
      this.ensureInitialized();
      
      const response = await this.client!.getProjects();
      return ZephyrMapper.toProjects(response.data);
    } catch (error) {
      throw this.wrapError('Failed to get projects', error);
    }
  }
  
  /**
   * Get folders from Zephyr Scale
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const response = await this.client!.getFolders(projectKey);
      return ZephyrMapper.toFolders(response.data);
    } catch (error) {
      throw this.wrapError(`Failed to get folders for project ${projectId}`, error);
    }
  }
  
  /**
   * Get test cases from Zephyr Scale
   */
  async getTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<TestCase>> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const response = await this.client!.getTests(projectKey, {
        folderId: options?.folderId,
        startAt: options?.startAt,
        maxResults: options?.maxResults || options?.pageSize,
        status: options?.status ? [options.status] : undefined,
        includeExecutions: true
      });
      
      const testCases = response.data.map(ZephyrMapper.toTestCase);
      
      return {
        items: testCases,
        total: response.data.total || testCases.length,
        page: options?.page || 1,
        pageSize: options?.pageSize || testCases.length
      };
    } catch (error) {
      // Need to get projectKey here in catch block to avoid reference error
      const safeProjectKey = this.config?.defaultProjectKey || projectId;
      throw this.wrapError(
        `Failed to get test cases for project ${projectId}`,
        error,
        {
          operation: 'getTestCases',
          params: { projectId, options },
          additionalInfo: {
            projectKey: safeProjectKey,
            clientConfigured: !!this.client
          }
        }
      );
    }
  }
  
  /**
   * Get a single test case with details
   */
  async getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    try {
      this.ensureInitialized();
      
      const response = await this.client!.getTest(testCaseId);
      return ZephyrMapper.toTestCase(response.data);
    } catch (error) {
      throw this.wrapError(`Failed to get test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Get test cycles from Zephyr Scale
   */
  async getTestCycles(
    projectId: string,
    options?: TestCycleQueryOptions
  ): Promise<PaginatedResult<TestCycle>> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const response = await this.client!.getCycles(projectKey, {
        folderId: options?.folderId,
        startAt: options?.startAt,
        maxResults: options?.maxResults || options?.pageSize,
        status: options?.status ? [options.status] : undefined
      });
      
      const cycles = response.data.map(ZephyrMapper.toTestCycle);
      
      return {
        items: cycles,
        total: response.data.total || cycles.length,
        page: options?.page || 1,
        pageSize: options?.pageSize || cycles.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to get test cycles for project ${projectId}`, error);
    }
  }
  
  /**
   * Get test executions from Zephyr Scale
   */
  async getTestExecutions(
    projectId: string,
    testCycleId: string,
    options?: ExecutionQueryOptions
  ): Promise<PaginatedResult<TestExecution>> {
    try {
      this.ensureInitialized();
      
      const response = await this.client!.getExecutions({
        cycleId: testCycleId,
        startAt: options?.startAt,
        maxResults: options?.maxResults || options?.pageSize,
        status: options?.status ? [options.status] : undefined,
        executedBy: options?.executedBy,
        executedSince: options?.executedSince
      });
      
      const executions = response.data.map(ZephyrMapper.toTestExecution);
      
      return {
        items: executions,
        total: response.data.total || executions.length,
        page: options?.page || 1,
        pageSize: options?.pageSize || executions.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to get test executions for cycle ${testCycleId}`, error);
    }
  }
  
  /**
   * Get attachment content from Zephyr Scale
   */
  async getAttachmentContent(
    projectId: string,
    attachmentId: string
  ): Promise<AttachmentContent> {
    try {
      this.ensureInitialized();
      
      const metadataResponse = await this.client!.getAttachment(attachmentId);
      const contentResponse = await this.client!.getAttachmentContent(attachmentId);
      
      return {
        id: attachmentId,
        name: metadataResponse.data.filename,
        contentType: metadataResponse.data.contentType || 'application/octet-stream',
        size: metadataResponse.data.fileSize || contentResponse.data.byteLength,
        content: Buffer.from(contentResponse.data),
        description: metadataResponse.data.comment
      };
    } catch (error) {
      throw this.wrapError(`Failed to get attachment ${attachmentId}`, error);
    }
  }
  
  /**
   * Get field definitions from Zephyr Scale
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const response = await this.client!.getCustomFields(projectKey);
      
      return ZephyrMapper.toFieldDefinitions(response.data);
    } catch (error) {
      throw this.wrapError(`Failed to get field definitions for project ${projectId}`, error);
    }
  }
  
  /**
   * Create a folder in Zephyr Scale
   */
  async createFolder(
    projectId: string,
    folder: Folder
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const response = await this.client!.createFolder(
        projectKey,
        folder.name,
        folder.parentId
      );
      
      return response.data.id;
    } catch (error) {
      throw this.wrapError(`Failed to create folder in project ${projectId}`, error);
    }
  }
  
  /**
   * Create a test case in Zephyr Scale
   */
  async createTestCase(
    projectId: string,
    testCase: TestCase
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const zephyrTest = ZephyrMapper.fromTestCase(testCase);
      const response = await this.client!.createTest(projectKey, zephyrTest);
      
      // If test case has attachments, upload them
      if (testCase.attachments && testCase.attachments.length > 0) {
        await this.uploadTestCaseAttachments(response.data.id, testCase.attachments);
      }
      
      return response.data.id;
    } catch (error) {
      throw this.wrapError(`Failed to create test case in project ${projectId}`, error);
    }
  }
  
  /**
   * Update test steps in Zephyr Scale
   */
  async createTestSteps(
    projectId: string,
    testCaseId: string,
    steps: TestCase['steps']
  ): Promise<void> {
    try {
      this.ensureInitialized();
      
      // Get the current test case
      const testResponse = await this.client!.getTest(testCaseId);
      const testData = testResponse.data;
      
      // Update with new steps
      testData.steps = ZephyrMapper.fromTestSteps(steps);
      
      // Update the test case
      await this.client!.updateTest(testCaseId, testData);
    } catch (error) {
      throw this.wrapError(`Failed to update test steps for test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Create a test cycle in Zephyr Scale
   */
  async createTestCycle(
    projectId: string,
    testCycle: TestCycle
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const projectKey = this.getProjectKey(projectId);
      const zephyrCycle = ZephyrMapper.fromTestCycle(testCycle);
      const response = await this.client!.createCycle(projectKey, zephyrCycle);
      
      // If test cycle has test cases, add them to the cycle
      if (testCycle.testCases && testCycle.testCases.length > 0) {
        const testKeys = testCycle.testCases.map(item => item.testCaseId);
        await this.client!.addTestsToCycle(response.data.id, testKeys);
      }
      
      return response.data.id;
    } catch (error) {
      throw this.wrapError(`Failed to create test cycle in project ${projectId}`, error);
    }
  }
  
  /**
   * Create test executions in Zephyr Scale
   */
  async createTestExecutions(
    projectId: string,
    testCycleId: string,
    executions: TestExecution[]
  ): Promise<void> {
    try {
      this.ensureInitialized();
      
      // Process executions in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < executions.length; i += batchSize) {
        const batch = executions.slice(i, i + batchSize);
        const zephyrExecutions = batch.map(exec => {
          const zephyrExec = ZephyrMapper.fromTestExecution(exec);
          // Ensure cycle ID is set
          zephyrExec.cycleId = testCycleId;
          return zephyrExec;
        });
        
        // Create executions in bulk
        const response = await this.client!.bulkCreateExecutions(zephyrExecutions);
        
        // Upload attachments for each execution if present
        for (let j = 0; j < batch.length; j++) {
          const execution = batch[j];
          const executionId = response.data[j]?.id;
          
          if (executionId && execution.attachments && execution.attachments.length > 0) {
            await this.uploadExecutionAttachments(executionId, execution.attachments);
          }
        }
      }
    } catch (error) {
      throw this.wrapError(`Failed to create test executions for cycle ${testCycleId}`, error);
    }
  }
  
  /**
   * Upload an attachment to Zephyr Scale
   */
  async uploadAttachment(
    projectId: string,
    entityType: string,
    entityId: string,
    attachment: AttachmentContent
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      if (entityType === EntityType.TEST_CASE) {
        const response = await this.client!.createTestAttachment(
          entityId,
          attachment.name,
          attachment.content,
          attachment.contentType
        );
        return response.data.id;
      } else if (entityType === EntityType.TEST_EXECUTION) {
        const response = await this.client!.createExecutionAttachment(
          entityId,
          attachment.name,
          attachment.content,
          attachment.contentType
        );
        return response.data.id;
      } else {
        throw new Error(`Unsupported entity type for attachments: ${entityType}`);
      }
    } catch (error) {
      throw this.wrapError(`Failed to upload attachment for ${entityType} ${entityId}`, error);
    }
  }
  
  /**
   * Create a field definition in Zephyr Scale
   * Note: Zephyr Scale doesn't support creating custom fields via API
   */
  async createFieldDefinition(
    _projectId: string,
    _fieldDefinition: FieldDefinition
  ): Promise<string> {
    throw new Error('Creating custom fields is not supported by the Zephyr Scale API');
  }
  
  /**
   * Get API contract with operation dependencies
   */
  async getApiContract(): Promise<ProviderApiContract> {
    return {
      providerId: this.id,
      operations: {
        'authenticate': {
          type: 'authenticate',
          dependencies: [],
          required: true,
          description: 'Authenticate with Zephyr API',
          requiredParams: ['apiKey', 'baseUrl'],
          estimatedTimeCost: 1000
        },
        'get_projects': {
          type: 'get_projects',
          dependencies: ['authenticate'],
          required: true,
          description: 'Get all projects from Zephyr',
          requiredParams: [],
          estimatedTimeCost: 2000
        },
        'get_project': {
          type: 'get_project',
          dependencies: ['authenticate', 'get_projects'],
          required: true,
          description: 'Get a specific project from Zephyr',
          requiredParams: ['projectId'],
          estimatedTimeCost: 1000
        },
        'get_test_cases': {
          type: 'get_test_cases',
          dependencies: ['authenticate', 'get_project'],
          required: true,
          description: 'Get test cases from a Zephyr project',
          requiredParams: ['projectId'],
          estimatedTimeCost: 5000
        },
        'get_test_case': {
          type: 'get_test_case',
          dependencies: ['authenticate'],
          required: true,
          description: 'Get a specific test case from Zephyr',
          requiredParams: ['testCaseId'],
          estimatedTimeCost: 1000
        },
        'get_attachments': {
          type: 'get_attachments',
          dependencies: ['authenticate', 'get_test_case'],
          required: false,
          description: 'Get attachments for a Zephyr test case',
          requiredParams: ['testCaseId'],
          estimatedTimeCost: 2000
        },
        'get_attachment': {
          type: 'get_attachment',
          dependencies: ['authenticate', 'get_attachments'],
          required: false,
          description: 'Get a specific attachment from Zephyr',
          requiredParams: ['attachmentId'],
          estimatedTimeCost: 3000
        },
        'get_test_runs': {
          type: 'get_test_runs',
          dependencies: ['authenticate', 'get_test_case'],
          required: false,
          description: 'Get test runs for a Zephyr test case',
          requiredParams: ['testCaseId'],
          estimatedTimeCost: 2000
        },
        'get_test_executions': {
          type: 'get_test_executions',
          dependencies: ['authenticate', 'get_test_runs'],
          required: false,
          description: 'Get test executions for a Zephyr test run',
          requiredParams: ['testRunId'],
          estimatedTimeCost: 2000
        },
        'get_history': {
          type: 'get_history',
          dependencies: ['authenticate', 'get_test_case'],
          required: false,
          description: 'Get history for a Zephyr test case',
          requiredParams: ['testCaseId'],
          estimatedTimeCost: 2000
        },
        'create_test_case': {
          type: 'create_test_case',
          dependencies: ['authenticate', 'get_project'],
          required: true,
          description: 'Create a test case in Zephyr',
          requiredParams: ['projectId', 'testCaseData'],
          estimatedTimeCost: 2000
        },
        'upload_attachment': {
          type: 'upload_attachment',
          dependencies: ['authenticate', 'create_test_case'],
          required: false,
          description: 'Upload an attachment to a Zephyr test case',
          requiredParams: ['testCaseId', 'attachmentData'],
          estimatedTimeCost: 3000
        }
      },
      validationRules: {
        projectId: (value: any) => typeof value === 'string' && value.length > 0,
        testCaseId: (value: any) => typeof value === 'string' && /^[A-Z]+-\d+$/.test(value),
        attachmentId: (value: any) => typeof value === 'string' && value.length > 0
      }
    };
  }
  
  // Helper methods
  
  /**
   * Ensure that the provider is initialized
   */
  private ensureInitialized(): void {
    if (!this.client || !this.config) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Get project key from project ID or use default
   */
  private getProjectKey(projectId: string): string {
    // If the projectId looks like a project key, use it directly
    if (/^[A-Z0-9]+$/.test(projectId)) {
      return projectId;
    }
    
    // Otherwise, use the default project key from config
    if (this.config?.defaultProjectKey) {
      return this.config.defaultProjectKey;
    }
    
    // If no default is set, just use the projectId
    return projectId;
  }
  
  /**
   * Error handler for Zephyr Scale API errors
   */
  private wrapError = createErrorHandler('Zephyr Scale', {
    includeErrorStack: process.env.NODE_ENV !== 'production',
    includeParams: true,
    sensitiveParamKeys: ['apiToken', 'jiraApiToken', 'password']
  });
  
  /**
   * Upload attachments for a test case
   */
  private async uploadTestCaseAttachments(
    testId: string,
    attachments: Attachment[]
  ): Promise<void> {
    for (const attachment of attachments) {
      if (!attachment.id && attachment.storageKey) {
        // Get attachment content from storage
        // In a real implementation, this would retrieve from a storage service
        const content = Buffer.from('Mock attachment content');
        
        await this.client!.createTestAttachment(
          testId,
          attachment.filename,
          content,
          attachment.contentType
        );
      }
    }
  }
  
  /**
   * Upload attachments for an execution
   */
  private async uploadExecutionAttachments(
    executionId: string,
    attachments: Attachment[]
  ): Promise<void> {
    for (const attachment of attachments) {
      if (!attachment.id && attachment.storageKey) {
        // Get attachment content from storage
        // In a real implementation, this would retrieve from a storage service
        const content = Buffer.from('Mock attachment content');
        
        await this.client!.createExecutionAttachment(
          executionId,
          attachment.filename,
          content,
          attachment.contentType
        );
      }
    }
  }
}