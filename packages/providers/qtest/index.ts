/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * for qTest, supporting both source and target operations across
 * all qTest products using a unified facade.
 * 
 * Supported qTest products:
 * - qTest Manager (core test case management)
 * - qTest Parameters (parameterized testing)
 * - qTest Scenario (BDD testing)
 * - qTest Pulse (insights and analytics)
 * - qTest Data Export (data export and archiving)
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
  ExecutionQueryOptions
} from '../../common/src/interfaces/provider';

import {
  Project,
  Folder,
  TestCase,
  TestCycle,
  TestExecution,
  Attachment as _Attachment
} from '../../common/src/models/entities';

import { AttachmentContent } from '../../common/src/models/attachment';
import { FieldDefinition } from '../../common/src/models/field-definition';
import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestClient, QTestClientConfig as _QTestClientConfig, QTestError, QTestErrorCategory as _QTestErrorCategory } from './api-client';
import { QTestMapper } from './models/mappers';
import { DomainError as _DomainError, ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * qTest provider configuration
 */
export interface QTestProviderConfig extends ProviderConfig {
  /**
   * Base URL for the qTest API
   */
  baseUrl: string;
  
  /**
   * API token for authentication
   */
  apiToken?: string;
  
  /**
   * Username for qTest
   */
  username?: string;
  
  /**
   * Password for qTest
   */
  password?: string;
  
  /**
   * Maximum requests per minute allowed by the API
   */
  maxRequestsPerMinute?: number;
  
  /**
   * Whether to bypass SSL certificate validation
   */
  bypassSSL?: boolean;
  
  /**
   * Maximum number of retries for failed requests
   */
  maxRetries?: number;
  
  /**
   * Default project ID to use if not specified
   */
  defaultProjectId?: number;
}

/**
 * Base qTest Provider implementation
 */
export class QTestProvider implements SourceProvider, TargetProvider {
  private client: QTestClient | null = null;
  private config: QTestProviderConfig | null = null;
  
  // Provider identity
  readonly id = 'qtest';
  readonly name = 'qTest';
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
  async initialize(config: QTestProviderConfig): Promise<void> {
    try {
      this.config = config;
      
      // Validate configuration
      this.validateConfig(config);
      
      // Create client
      this.client = new QTestClient({
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        username: config.username,
        password: config.password,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        bypassSSL: config.bypassSSL,
        maxRetries: config.maxRetries
      });
    } catch (error) {
      throw this.wrapError('Failed to initialize provider', error);
    }
  }
  
  /**
   * Validate provider configuration
   */
  private validateConfig(config: QTestProviderConfig): void {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    
    if (!config.apiToken && (!config.username || !config.password)) {
      throw new Error('Either apiToken or both username and password must be provided');
    }
  }
  
  /**
   * Test connection with qTest
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      this.ensureInitialized();
      
      const isConnected = await this.client!.testConnection();
      
      return {
        connected: isConnected,
        details: {
          metrics: this.client!.getRateLimiterMetrics()
        }
      };
    } catch (error) {
      if (error instanceof QTestError) {
        return {
          connected: false,
          error: `qTest API error: ${error.message}`,
          details: {
            category: error.details.category,
            statusCode: error.details.statusCode
          }
        };
      }
      
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
      systemName: 'qTest',
      providerVersion: this.version,
      capabilities: this.capabilities,
      configSchema: {
        baseUrl: { type: 'string', required: true },
        apiToken: { type: 'string', required: false },
        username: { type: 'string', required: false },
        password: { type: 'string', required: false },
        defaultProjectId: { type: 'number', required: false },
        maxRequestsPerMinute: { type: 'number', required: false },
        bypassSSL: { type: 'boolean', required: false },
        maxRetries: { type: 'number', required: false }
      }
    };
  }
  
  /**
   * Get projects from qTest
   */
  async getProjects(): Promise<Project[]> {
    try {
      this.ensureInitialized();
      
      const response = await this.client!.getProjects();
      return QTestMapper.toProjects(response.data);
    } catch (error) {
      throw this.wrapError('Failed to get projects', error);
    }
  }
  
  /**
   * Get folders from qTest
   */
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      
      // qTest doesn't have a direct folders API, so we need to
      // fetch from modules, test-suites, and test-cycles
      
      // Implementation to be completed
      // This is a placeholder that will be expanded in the future
      return [];
    } catch (error) {
      throw this.wrapError(`Failed to get folders for project ${projectId}`, error);
    }
  }
  
  /**
   * Get test cases from qTest
   */
  async getTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<TestCase>> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      
      const response = await this.client!.getTestCases(numericProjectId, {
        page: options?.page,
        pageSize: options?.pageSize
      });
      
      const testCases = QTestMapper.toTestCases(response.data);
      
      return {
        items: testCases,
        total: response.data.total || testCases.length,
        page: options?.page || 1,
        pageSize: options?.pageSize || testCases.length
      };
    } catch (error) {
      throw this.wrapError(`Failed to get test cases for project ${projectId}`, error);
    }
  }
  
  /**
   * Get a single test case with details
   */
  async getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericTestCaseId = parseInt(testCaseId, 10);
      
      if (isNaN(numericTestCaseId)) {
        throw new Error(`Invalid test case ID: ${testCaseId}`);
      }
      
      const response = await this.client!.getTestCase(numericProjectId, numericTestCaseId);
      return QTestMapper.toTestCase(response.data);
    } catch (error) {
      throw this.wrapError(`Failed to get test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Get test cycles from qTest
   */
  async getTestCycles(
    projectId: string,
    options?: TestCycleQueryOptions
  ): Promise<PaginatedResult<TestCycle>> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      
      const response = await this.client!.getTestCycles(numericProjectId, {
        page: options?.page,
        pageSize: options?.pageSize
      });
      
      const cycles = QTestMapper.toTestCycles(response.data);
      
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
   * Get test executions from qTest
   */
  async getTestExecutions(
    projectId: string,
    testCycleId: string,
    options?: ExecutionQueryOptions
  ): Promise<PaginatedResult<TestExecution>> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericTestCycleId = parseInt(testCycleId, 10);
      
      if (isNaN(numericTestCycleId)) {
        throw new Error(`Invalid test cycle ID: ${testCycleId}`);
      }
      
      // qTest doesn't have a direct API for this, so we need to
      // get test runs for a cycle and then get the logs for each run
      // Implementation to be completed
      // This is a placeholder that will be expanded in the future
      
      return {
        items: [],
        total: 0,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10
      };
    } catch (error) {
      throw this.wrapError(`Failed to get test executions for cycle ${testCycleId}`, error);
    }
  }
  
  /**
   * Get attachment content from qTest
   */
  async getAttachmentContent(
    projectId: string,
    attachmentId: string
  ): Promise<AttachmentContent> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericAttachmentId = parseInt(attachmentId, 10);
      
      if (isNaN(numericAttachmentId)) {
        throw new Error(`Invalid attachment ID: ${attachmentId}`);
      }
      
      // Get attachment content
      const contentResponse = await this.client!.downloadAttachment(
        numericProjectId,
        numericAttachmentId
      );
      
      // We don't have direct metadata API in qTest, so we'll infer from headers
      const contentType = contentResponse.headers['content-type'] || 'application/octet-stream';
      const disposition = contentResponse.headers['content-disposition'] || '';
      const filename = disposition.match(/filename="([^"]+)"/) ? 
        disposition.match(/filename="([^"]+)"/)[1] : 
        `attachment-${attachmentId}`;
      const size = contentResponse.data.byteLength;
      
      return {
        id: attachmentId,
        name: filename,
        contentType,
        size,
        content: Buffer.from(contentResponse.data)
      };
    } catch (error) {
      throw this.wrapError(`Failed to get attachment ${attachmentId}`, error);
    }
  }
  
  /**
   * Get field definitions from qTest
   */
  async getFieldDefinitions(projectId: string): Promise<FieldDefinition[]> {
    try {
      this.ensureInitialized();
      
      // qTest doesn't have a direct API for field definitions
      // We need to infer from various endpoints
      // Implementation to be completed
      // This is a placeholder that will be expanded in the future
      return [];
    } catch (error) {
      throw this.wrapError(`Failed to get field definitions for project ${projectId}`, error);
    }
  }
  
  /**
   * Create a folder in qTest
   */
  async createFolder(
    projectId: string,
    _folder: Folder
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      // qTest doesn't have a direct folder creation API
      // This is a placeholder that will be expanded in the future
      return 'folder-id';
    } catch (error) {
      throw this.wrapError(`Failed to create folder in project ${projectId}`, error);
    }
  }
  
  /**
   * Create a test case in qTest
   */
  async createTestCase(
    projectId: string,
    testCase: TestCase
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      
      // Convert testCase to qTest format
      const qTestTestCase = QTestMapper.fromTestCase(testCase);
      
      // Create test case
      const response = await this.client!.createTestCase(numericProjectId, qTestTestCase);
      
      // Return the ID
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to create test case in project ${projectId}`, error);
    }
  }
  
  /**
   * Create test steps in qTest
   */
  async createTestSteps(
    projectId: string,
    testCaseId: string,
    steps: TestCase['steps']
  ): Promise<void> {
    try {
      this.ensureInitialized();
      
      // qTest doesn't have a separate steps API
      // Steps are part of the test case object
      // We need to get the test case, update its steps, and update the test case
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericTestCaseId = parseInt(testCaseId, 10);
      
      if (isNaN(numericTestCaseId)) {
        throw new Error(`Invalid test case ID: ${testCaseId}`);
      }
      
      // Get the current test case
      const response = await this.client!.getTestCase(numericProjectId, numericTestCaseId);
      const testCase = response.data;
      
      // Update the steps
      testCase.test_steps = QTestMapper.fromTestSteps(steps);
      
      // Update the test case
      await this.client!.createTestCase(numericProjectId, testCase);
    } catch (error) {
      throw this.wrapError(`Failed to create test steps for test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Create a test cycle in qTest
   */
  async createTestCycle(
    projectId: string,
    testCycle: TestCycle
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      
      // Convert testCycle to qTest format
      const qTestTestCycle = QTestMapper.fromTestCycle(testCycle);
      
      // Create test cycle
      const response = await this.client!.createTestCycle(numericProjectId, qTestTestCycle);
      
      // Return the ID
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to create test cycle in project ${projectId}`, error);
    }
  }
  
  /**
   * Create test executions in qTest
   */
  async createTestExecutions(
    projectId: string,
    testCycleId: string,
    executions: TestExecution[]
  ): Promise<void> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericTestCycleId = parseInt(testCycleId, 10);
      
      if (isNaN(numericTestCycleId)) {
        throw new Error(`Invalid test cycle ID: ${testCycleId}`);
      }
      
      // For each execution, we need to:
      // 1. Get or create a test run
      // 2. Create a test log
      
      for (const execution of executions) {
        const numericTestCaseId = parseInt(execution.testCaseId, 10);
        
        if (isNaN(numericTestCaseId)) {
          throw new Error(`Invalid test case ID: ${execution.testCaseId}`);
        }
        
        // Create a test run (qTest's equivalent of a test execution)
        const testRunResponse = await this.client!.createTestRun(numericProjectId, {
          name: execution.name,
          test_case: {
            id: numericTestCaseId
          },
          test_cycle: {
            id: numericTestCycleId
          }
        });
        
        const testRunId = testRunResponse.data.id;
        
        // Create a test log (execution result)
        await this.client!.createTestLog(numericProjectId, testRunId, {
          status: {
            id: QTestMapper.mapStatusToQTest(execution.status)
          },
          note: execution.description,
          execution_date: execution.executedAt ? execution.executedAt.toISOString() : new Date().toISOString(),
          executed_by: execution.executedBy
        });
      }
    } catch (error) {
      throw this.wrapError(`Failed to create test executions for cycle ${testCycleId}`, error);
    }
  }
  
  /**
   * Upload an attachment to qTest
   */
  async uploadAttachment(
    projectId: string,
    entityType: string,
    entityId: string,
    attachment: AttachmentContent
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const _numericProjectId = this.getProjectId(projectId);
      const numericEntityId = parseInt(entityId, 10);
      
      if (isNaN(numericEntityId)) {
        throw new Error(`Invalid entity ID: ${entityId}`);
      }
      
      // Map entity type to qTest entity type
      const qTestEntityType = this.mapEntityTypeToQTest(entityType);
      
      // Upload attachment
      const response = await this.client!.uploadAttachment(
        numericProjectId,
        qTestEntityType,
        numericEntityId,
        attachment.name,
        attachment.content,
        attachment.contentType
      );
      
      // Return the ID
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to upload attachment for ${entityType} ${entityId}`, error);
    }
  }
  
  /**
   * Create a field definition in qTest
   */
  async createFieldDefinition(
    _projectId: string,
    _fieldDefinition: FieldDefinition
  ): Promise<string> {
    // qTest doesn't support creating custom fields via API
    throw new Error('Creating custom fields is not supported by the qTest API');
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
   * Get project ID from project ID string or use default
   */
  private getProjectId(projectId: string): number {
    // If the projectId is a number, use it directly
    const numericProjectId = parseInt(projectId, 10);
    
    if (!isNaN(numericProjectId)) {
      return numericProjectId;
    }
    
    // Otherwise, use the default project ID from config
    if (this.config?.defaultProjectId) {
      return this.config.defaultProjectId;
    }
    
    // If no default is set, throw an error
    throw new Error('Invalid project ID and no default project ID configured');
  }
  
  /**
   * Map entity type to qTest entity type
   */
  private mapEntityTypeToQTest(entityType: string): string {
    const entityTypeMap: Record<string, string> = {
      [EntityType.TEST_CASE]: 'test-cases',
      [EntityType.TEST_CYCLE]: 'test-cycles',
      [EntityType.TEST_EXECUTION]: 'test-runs'
    };
    
    const qTestEntityType = entityTypeMap[entityType];
    
    if (!qTestEntityType) {
      throw new Error(`Unsupported entity type for attachments: ${entityType}`);
    }
    
    return qTestEntityType;
  }
  
  /**
   * Wrap an error in an ExternalServiceError
   */
  private wrapError(message: string, error: unknown): ExternalServiceError {
    // If it's already a QTestError, convert it to an ExternalServiceError
    if (error instanceof QTestError) {
      return new ExternalServiceError(
        'qTest',
        `${message}: ${error.message}. Category: ${error.details.category}, Status: ${error.details.statusCode}`
      );
    }
    
    // Otherwise, create a generic error
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ExternalServiceError('qTest', `${message}: ${errorMessage}`);
  }
}