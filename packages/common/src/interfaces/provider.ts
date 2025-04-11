/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Provider interface definitions for TestBridge
 * 
 * These interfaces define the standard contract that all test management
 * system providers must implement to integrate with TestBridge.
 */

import {
  Project,
  Folder,
  TestCase,
  TestCycle,
  TestExecution,
  Attachment as _Attachment
} from '../models/entities';
import { AttachmentContent } from '../models/attachment';
import { FieldDefinition } from '../models/field-definition';
import { PaginatedResult } from '../models/paginated';

/**
 * Basic provider configuration
 */
export interface ProviderConfig {
  /**
   * Provider-specific configuration
   */
  [key: string]: any;
}

/**
 * Connection status result
 */
export interface ConnectionStatus {
  /**
   * Connection successful
   */
  connected: boolean;
  
  /**
   * Error message if connection failed
   */
  error?: string;
  
  /**
   * Additional details about the connection
   */
  details?: Record<string, any>;
  
  /**
   * API version of the connected system
   */
  apiVersion?: string;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  /**
   * Name of the system this provider connects to
   */
  systemName: string;
  
  /**
   * Version of the provider implementation
   */
  providerVersion: string;
  
  /**
   * Available features and capabilities
   */
  capabilities: ProviderCapabilities;
  
  /**
   * Configuration schema for this provider
   */
  configSchema?: Record<string, any>;
}

/**
 * Provider capabilities flags
 */
export interface ProviderCapabilities {
  /**
   * Can act as a source system (extract data)
   */
  canBeSource: boolean;
  
  /**
   * Can act as a target system (load data)
   */
  canBeTarget: boolean;
  
  /**
   * Supported entity types
   */
  entityTypes: EntityType[];
  
  /**
   * Supports attachments
   */
  supportsAttachments: boolean;
  
  /**
   * Supports execution history
   */
  supportsExecutionHistory: boolean;
  
  /**
   * Supports test steps
   */
  supportsTestSteps: boolean;
  
  /**
   * Supports folders/hierarchies
   */
  supportsHierarchy: boolean;
  
  /**
   * Supports custom fields
   */
  supportsCustomFields: boolean;
}

/**
 * Entity types that can be handled by providers
 */
export enum EntityType {
  PROJECT = 'project',
  FOLDER = 'folder',
  TEST_CASE = 'test_case',
  TEST_STEP = 'test_step',
  TEST_CYCLE = 'test_cycle',
  TEST_EXECUTION = 'test_execution',
  DEFECT = 'defect',
  ATTACHMENT = 'attachment',
  FIELD_DEFINITION = 'field_definition'
}

/**
 * Base query options for pagination
 */
export interface BaseQueryOptions {
  /**
   * Page number (1-based)
   */
  page?: number;
  
  /**
   * Page size
   */
  pageSize?: number;
  
  /**
   * Zero-based offset (alternative to page)
   */
  startAt?: number;
  
  /**
   * Maximum results to return (alternative to pageSize)
   */
  maxResults?: number;
  
  /**
   * Only include items modified since this date
   */
  modifiedSince?: Date;
}

/**
 * Query options for test cases
 */
export interface TestCaseQueryOptions extends BaseQueryOptions {
  /**
   * Filter by folder ID
   */
  folderId?: string;
  
  /**
   * Include test steps in results
   */
  includeSteps?: boolean;
  
  /**
   * Include attachment metadata in results
   */
  includeAttachments?: boolean;
  
  /**
   * Filter by status
   */
  status?: string;
}

/**
 * Query options for test cycles
 */
export interface TestCycleQueryOptions extends BaseQueryOptions {
  /**
   * Filter by status
   */
  status?: string;
  
  /**
   * Filter by start date (inclusive)
   */
  startDate?: Date;
  
  /**
   * Filter by end date (inclusive)
   */
  endDate?: Date;
}

/**
 * Query options for test executions
 */
export interface ExecutionQueryOptions extends BaseQueryOptions {
  /**
   * Filter by status
   */
  status?: string;
  
  /**
   * Filter by executor
   */
  executedBy?: string;
  
  /**
   * Filter by execution date (inclusive)
   */
  executedSince?: Date;
}

/**
 * API Operation Contract for provider operation dependencies
 */
export interface ProviderApiContract {
  providerId: string;
  operations: Record<string, OperationDefinition>;
  validationRules?: {
    [key: string]: (value: any) => boolean;
  };
}

/**
 * Operation definition with dependencies
 */
export interface OperationDefinition {
  type: string;
  dependencies: string[];
  required: boolean;
  description: string;
  requiredParams: string[];
  estimatedTimeCost?: number;
}

/**
 * Base provider interface that all providers must implement
 */
export interface TestManagementProvider {
  /**
   * Unique identifier for this provider
   */
  id: string;
  
  /**
   * Human-readable name for this provider
   */
  name: string;
  
  /**
   * Provider version
   */
  version: string;
  
  /**
   * Provider capabilities
   */
  capabilities: ProviderCapabilities;
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Test connection with the remote system
   */
  testConnection(): Promise<ConnectionStatus>;
  
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;
  
  /**
   * Get provider API contract with operation dependencies
   */
  getApiContract(): Promise<ProviderApiContract>;
}

/**
 * Source provider interface for extracting data
 */
export interface SourceProvider extends TestManagementProvider {
  /**
   * Get projects from the source system
   */
  getProjects(): Promise<Project[]>;
  
  /**
   * Get test folders/hierarchical structure
   */
  getFolders(projectId: string): Promise<Folder[]>;
  
  /**
   * Get test cases
   */
  getTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<TestCase>>;
  
  /**
   * Get a single test case with details
   */
  getTestCase(
    projectId: string,
    testCaseId: string
  ): Promise<TestCase>;
  
  /**
   * Get test cycles
   */
  getTestCycles(
    projectId: string,
    options?: TestCycleQueryOptions
  ): Promise<PaginatedResult<TestCycle>>;
  
  /**
   * Get test executions
   */
  getTestExecutions(
    projectId: string,
    testCycleId: string,
    options?: ExecutionQueryOptions
  ): Promise<PaginatedResult<TestExecution>>;
  
  /**
   * Get attachment content
   */
  getAttachmentContent(
    projectId: string,
    attachmentId: string
  ): Promise<AttachmentContent>;
  
  /**
   * Get field definitions (including custom fields)
   */
  getFieldDefinitions(
    projectId: string
  ): Promise<FieldDefinition[]>;
}

/**
 * Target provider interface for loading data
 */
export interface TargetProvider extends TestManagementProvider {
  /**
   * Get projects from the target system (for mapping)
   */
  getProjects(): Promise<Project[]>;
  
  /**
   * Create or update a folder structure
   */
  createFolder(
    projectId: string,
    folder: Folder
  ): Promise<string>;
  
  /**
   * Create or update a test case
   */
  createTestCase(
    projectId: string,
    testCase: TestCase
  ): Promise<string>;
  
  /**
   * Create or update test steps
   */
  createTestSteps(
    projectId: string,
    testCaseId: string,
    steps: TestCase['steps']
  ): Promise<void>;
  
  /**
   * Create or update a test cycle
   */
  createTestCycle(
    projectId: string,
    testCycle: TestCycle
  ): Promise<string>;
  
  /**
   * Create or update test executions
   */
  createTestExecutions(
    projectId: string,
    testCycleId: string,
    executions: TestExecution[]
  ): Promise<void>;
  
  /**
   * Upload an attachment
   */
  uploadAttachment(
    projectId: string,
    entityType: string,
    entityId: string,
    attachment: AttachmentContent
  ): Promise<string>;
  
  /**
   * Create or update field definitions (if supported)
   */
  createFieldDefinition?(
    projectId: string,
    fieldDefinition: FieldDefinition
  ): Promise<string>;
}

/**
 * Provider registry for managing providers
 */
export class ProviderRegistry {
  private providers: Map<string, TestManagementProvider> = new Map();
  
  /**
   * Register a provider with the registry
   */
  registerProvider(provider: TestManagementProvider): void {
    this.providers.set(provider.id, provider);
  }
  
  /**
   * Get a provider by ID
   */
  getProvider(id: string): TestManagementProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * Get all registered providers
   */
  getAllProviders(): TestManagementProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get providers that can act as source systems
   */
  getSourceProviders(): SourceProvider[] {
    return this.getAllProviders()
      .filter(p => p.capabilities.canBeSource)
      .map(p => p as SourceProvider);
  }
  
  /**
   * Get providers that can act as target systems
   */
  getTargetProviders(): TargetProvider[] {
    return this.getAllProviders()
      .filter(p => p.capabilities.canBeTarget)
      .map(p => p as TargetProvider);
  }
}