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

import { QTestProviderFactory, QTestProductType, QTestFactoryConfig as _QTestFactoryConfig } from './provider-factory';
import { QTestManagerProvider } from './manager-provider';
import { 
  QTestParametersProvider, 
  ParameterizedTestCase, 
  ParameterSet as _ParameterSet 
} from './parameters-provider';
import { 
  Parameter, 
  ParameterValue, 
  Dataset, 
  DatasetRow 
} from './api-client/parameters-client';
import {
  QTestScenarioProvider,
  BDDFeature,
  GherkinScenario as _GherkinScenario
} from './scenario-provider';
import {
  Feature,
  FeatureStatus,
  Step,
  StepType as _StepType
} from './api-client/scenario-client';
import {
  QTestDataExportProvider,
  ExportFile
} from './data-export-provider';
import {
  FileMetadata
} from './api-client/data-export-client';
import { ExternalServiceError as _ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';
import { createErrorHandler } from '../../common/src/utils/resilience/error-handler';

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
  private parametersProvider: QTestParametersProvider | null = null;
  private scenarioProvider: QTestScenarioProvider | null = null;
  private pulseProvider: TestManagementProvider | null = null;
  private dataExportProvider: QTestDataExportProvider | null = null;
  
  // Error handler for standardized error handling
  private handleError = createErrorHandler('qTest Unified', {
    includeErrorStack: process.env.NODE_ENV !== 'production',
    includeParams: true,
    sensitiveParamKeys: ['apiToken', 'password', 'token', 'jiraApiToken']
  });
  
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
    
    // Initialize other providers as needed
    
    // Initialize Parameters provider if configured
    if (config.products?.parameters) {
      await this.initializeParametersProvider();
    }
    
    // Initialize Scenario provider if configured
    if (config.products?.scenario) {
      await this.initializeScenarioProvider();
    }
    
    // Initialize Data Export provider if configured
    if (config.products?.dataExport) {
      await this.initializeDataExportProvider();
    }
    
    // Initialize Pulse provider if configured
    if (config.products?.pulse) {
      await this.initializePulseProvider();
    }
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
      
      // Test connection to qTest Parameters
      if (this.parametersProvider) {
        const parametersStatus = await this.parametersProvider.testConnection();
        this.productStatus[QTestProductType.PARAMETERS] = parametersStatus.connected;
        details[QTestProductType.PARAMETERS] = parametersStatus;
        
        // Only need one successful connection for facade to be considered connected
        if (parametersStatus.connected) {
          connected = true;
        }
      }
      
      // Test connection to qTest Scenario
      if (this.scenarioProvider) {
        const scenarioStatus = await this.scenarioProvider.testConnection();
        this.productStatus[QTestProductType.SCENARIO] = scenarioStatus.connected;
        details[QTestProductType.SCENARIO] = scenarioStatus;
        
        // Only need one successful connection for facade to be considered connected
        if (scenarioStatus.connected) {
          connected = true;
        }
      }
      
      // Test connection to qTest Data Export
      if (this.dataExportProvider) {
        const dataExportStatus = await this.dataExportProvider.testConnection();
        this.productStatus[QTestProductType.DATA_EXPORT] = dataExportStatus.connected;
        details[QTestProductType.DATA_EXPORT] = dataExportStatus;
        
        // Only need one successful connection for facade to be considered connected
        if (dataExportStatus.connected) {
          connected = true;
        }
      }
      
      // Test connection to qTest Pulse
      if (this.pulseProvider) {
        const pulseStatus = await this.pulseProvider.testConnection();
        this.productStatus[QTestProductType.PULSE] = pulseStatus.connected;
        details[QTestProductType.PULSE] = pulseStatus;
        
        // Only need one successful connection for facade to be considered connected
        if (pulseStatus.connected) {
          connected = true;
        }
      }
      
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
    _projectId: string,
    _fieldDefinition: FieldDefinition
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
  
  // Parameters API methods
  
  /**
   * Get all parameters from qTest Parameters
   */
  async getParameters(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      searchText?: string;
    } = {}
  ): Promise<PaginatedResult<Parameter>> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getParameters(projectId, options);
  }
  
  /**
   * Get parameter by ID from qTest Parameters
   */
  async getParameter(
    projectId: string,
    parameterId: string
  ): Promise<Parameter> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getParameter(projectId, parameterId);
  }
  
  /**
   * Create a parameter in qTest Parameters
   */
  async createParameter(
    projectId: string,
    parameter: Parameter
  ): Promise<string> {
    this.ensureParametersProvider();
    return this.parametersProvider!.createParameter(projectId, parameter);
  }
  
  /**
   * Update a parameter in qTest Parameters
   */
  async updateParameter(
    projectId: string,
    parameterId: string,
    parameter: Parameter
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.updateParameter(projectId, parameterId, parameter);
  }
  
  /**
   * Delete a parameter from qTest Parameters
   */
  async deleteParameter(
    projectId: string,
    parameterId: string
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.deleteParameter(projectId, parameterId);
  }
  
  /**
   * Get parameter values from qTest Parameters
   */
  async getParameterValues(
    projectId: string,
    parameterId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<ParameterValue>> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getParameterValues(projectId, parameterId, options);
  }
  
  /**
   * Add a parameter value in qTest Parameters
   */
  async addParameterValue(
    projectId: string,
    parameterId: string,
    value: ParameterValue
  ): Promise<string> {
    this.ensureParametersProvider();
    return this.parametersProvider!.addParameterValue(projectId, parameterId, value);
  }
  
  /**
   * Update a parameter value in qTest Parameters
   */
  async updateParameterValue(
    projectId: string,
    parameterId: string,
    valueId: string,
    value: ParameterValue
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.updateParameterValue(projectId, parameterId, valueId, value);
  }
  
  /**
   * Delete parameter values from qTest Parameters
   */
  async deleteParameterValues(
    projectId: string,
    parameterId: string,
    valueIds: string[]
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.deleteParameterValues(projectId, parameterId, valueIds);
  }
  
  /**
   * Get all datasets from qTest Parameters
   */
  async getDatasets(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      searchText?: string;
    } = {}
  ): Promise<PaginatedResult<Dataset>> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getDatasets(projectId, options);
  }
  
  /**
   * Get dataset by ID from qTest Parameters
   */
  async getDataset(
    projectId: string,
    datasetId: string
  ): Promise<Dataset> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getDataset(projectId, datasetId);
  }
  
  /**
   * Create a dataset in qTest Parameters
   */
  async createDataset(
    projectId: string,
    dataset: Dataset
  ): Promise<string> {
    this.ensureParametersProvider();
    return this.parametersProvider!.createDataset(projectId, dataset);
  }
  
  /**
   * Update a dataset in qTest Parameters
   */
  async updateDataset(
    projectId: string,
    datasetId: string,
    dataset: Dataset
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.updateDataset(projectId, datasetId, dataset);
  }
  
  /**
   * Delete a dataset from qTest Parameters
   */
  async deleteDataset(
    projectId: string,
    datasetId: string
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.deleteDataset(projectId, datasetId);
  }
  
  /**
   * Get dataset rows from qTest Parameters
   */
  async getDatasetRows(
    projectId: string,
    datasetId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<DatasetRow>> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getDatasetRows(projectId, datasetId, options);
  }
  
  /**
   * Add rows to a dataset in qTest Parameters
   */
  async addDatasetRows(
    projectId: string,
    datasetId: string,
    rows: DatasetRow[]
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.addDatasetRows(projectId, datasetId, rows);
  }
  
  /**
   * Delete rows from a dataset in qTest Parameters
   */
  async deleteDatasetRows(
    projectId: string,
    datasetId: string,
    rowIds: string[]
  ): Promise<void> {
    this.ensureParametersProvider();
    return this.parametersProvider!.deleteDatasetRows(projectId, datasetId, rowIds);
  }
  
  /**
   * Get parameterized test cases from qTest
   */
  async getParameterizedTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<ParameterizedTestCase>> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getParameterizedTestCases(projectId, options);
  }
  
  /**
   * Get a parameterized test case from qTest
   */
  async getParameterizedTestCase(
    projectId: string,
    testCaseId: string
  ): Promise<ParameterizedTestCase> {
    this.ensureParametersProvider();
    return this.parametersProvider!.getParameterizedTestCase(projectId, testCaseId);
  }
  
  /**
   * Create a parameterized test case in qTest
   */
  async createParameterizedTestCase(
    projectId: string,
    testCase: ParameterizedTestCase
  ): Promise<string> {
    this.ensureParametersProvider();
    return this.parametersProvider!.createParameterizedTestCase(projectId, testCase);
  }
  
  // Scenario API methods
  
  /**
   * Get features from qTest Scenario
   */
  async getFeatures(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: FeatureStatus;
      searchText?: string;
      tags?: string[];
    } = {}
  ): Promise<PaginatedResult<Feature>> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.getFeatures(projectId, options);
  }
  
  /**
   * Get a feature by ID from qTest Scenario
   */
  async getFeature(
    projectId: string,
    featureId: string
  ): Promise<Feature> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.getFeature(projectId, featureId);
  }
  
  /**
   * Get a BDD feature with steps from qTest Scenario
   */
  async getBDDFeature(
    projectId: string,
    featureId: string
  ): Promise<BDDFeature> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.getBDDFeature(projectId, featureId);
  }
  
  /**
   * Create a feature in qTest Scenario
   */
  async createFeature(
    projectId: string,
    feature: Feature
  ): Promise<string> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.createFeature(projectId, feature);
  }
  
  /**
   * Update a feature in qTest Scenario
   */
  async updateFeature(
    projectId: string,
    featureId: string,
    feature: Feature
  ): Promise<void> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.updateFeature(projectId, featureId, feature);
  }
  
  /**
   * Delete a feature from qTest Scenario
   */
  async deleteFeature(
    projectId: string,
    featureId: string
  ): Promise<void> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.deleteFeature(projectId, featureId);
  }
  
  /**
   * Get steps for a feature from qTest Scenario
   */
  async getFeatureSteps(
    projectId: string,
    featureId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<Step>> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.getFeatureSteps(projectId, featureId, options);
  }
  
  /**
   * Create steps for a feature in qTest Scenario
   */
  async createFeatureSteps(
    projectId: string,
    featureId: string,
    steps: Step[]
  ): Promise<void> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.createFeatureSteps(projectId, featureId, steps);
  }
  
  /**
   * Create a BDD feature with steps in qTest Scenario
   */
  async createBDDFeature(
    projectId: string,
    feature: BDDFeature
  ): Promise<string> {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.createBDDFeature(projectId, feature);
  }
  
  /**
   * Format a BDD feature as Gherkin text
   */
  formatBDDFeatureAsGherkin(feature: BDDFeature): string {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.formatBDDFeatureAsGherkin(feature);
  }
  
  /**
   * Parse Gherkin text into a BDD feature
   */
  parseGherkinText(gherkinText: string): BDDFeature {
    this.ensureScenarioProvider();
    return this.scenarioProvider!.parseGherkinText(gherkinText);
  }
  
  // Data Export API methods
  
  /**
   * List files from qTest Data Export
   */
  async listFiles(
    projectId: string,
    options: {
      path?: string;
      pattern?: string;
      recursive?: boolean;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<FileMetadata>> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.listFiles(projectId, options);
  }
  
  /**
   * Get file metadata from qTest Data Export
   */
  async getFileMetadata(
    projectId: string,
    filePath: string
  ): Promise<FileMetadata> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.getFileMetadata(projectId, filePath);
  }
  
  /**
   * Download a file from qTest Data Export
   */
  async downloadFile(
    projectId: string,
    filePath: string,
    asBinary = false
  ): Promise<ExportFile> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.downloadFile(projectId, filePath, asBinary);
  }
  
  /**
   * Search for files in qTest Data Export
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
    this.ensureDataExportProvider();
    return this.dataExportProvider!.searchFiles(projectId, pattern, options);
  }
  
  /**
   * Get project exports from qTest Data Export
   */
  async getProjectExports(
    projectId: string
  ): Promise<PaginatedResult<FileMetadata>> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.getProjectExports(projectId);
  }
  
  /**
   * Get latest export from qTest Data Export
   */
  async getLatestExport(
    projectId: string,
    pattern?: string
  ): Promise<FileMetadata | null> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.getLatestExport(projectId, pattern);
  }
  
  /**
   * Download latest export from qTest Data Export
   */
  async downloadLatestExport(
    projectId: string,
    pattern?: string,
    asBinary = false
  ): Promise<ExportFile | null> {
    this.ensureDataExportProvider();
    return this.dataExportProvider!.downloadLatestExport(projectId, pattern, asBinary);
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
      throw this.handleError(
        'Failed to initialize qTest Manager provider',
        error,
        {
          operation: 'initializeManagerProvider',
          additionalInfo: {
            product: QTestProductType.MANAGER,
            baseUrl: this.config!.baseUrl,
            defaultProjectId: this.config!.defaultProjectId
          }
        }
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
  
  /**
   * Ensure the Parameters provider is initialized
   */
  private ensureParametersProvider(): void {
    if (!this.parametersProvider) {
      throw new Error('qTest Parameters provider not initialized');
    }
  }
  
  /**
   * Ensure the Scenario provider is initialized
   */
  private ensureScenarioProvider(): void {
    if (!this.scenarioProvider) {
      throw new Error('qTest Scenario provider not initialized');
    }
  }
  
  /**
   * Initialize qTest Parameters provider
   */
  private async initializeParametersProvider(): Promise<void> {
    try {
      // Create and initialize the provider
      this.parametersProvider = QTestProviderFactory.createProvider({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        product: QTestProductType.PARAMETERS,
        productConfig: this.config!.products?.parameters || {}
      }) as QTestParametersProvider;
      
      await this.parametersProvider.initialize({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        ...this.config!.products?.parameters
      });
    } catch (error) {
      throw this.handleError(
        'Failed to initialize qTest Parameters provider',
        error,
        {
          operation: 'initializeParametersProvider',
          additionalInfo: {
            product: QTestProductType.PARAMETERS,
            baseUrl: this.config!.baseUrl,
            defaultProjectId: this.config!.defaultProjectId
          }
        }
      );
    }
  }
  
  /**
   * Initialize qTest Scenario provider
   */
  private async initializeScenarioProvider(): Promise<void> {
    try {
      // Create and initialize the provider
      this.scenarioProvider = QTestProviderFactory.createProvider({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        product: QTestProductType.SCENARIO,
        productConfig: this.config!.products?.scenario || {}
      }) as QTestScenarioProvider;
      
      await this.scenarioProvider.initialize({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        ...this.config!.products?.scenario
      });
    } catch (error) {
      throw this.handleError(
        'Failed to initialize qTest Scenario provider',
        error,
        {
          operation: 'initializeScenarioProvider',
          additionalInfo: {
            product: QTestProductType.SCENARIO,
            baseUrl: this.config!.baseUrl,
            defaultProjectId: this.config!.defaultProjectId
          }
        }
      );
    }
  }
  
  /**
   * Initialize qTest Data Export provider
   */
  private async initializeDataExportProvider(): Promise<void> {
    try {
      // Create and initialize the provider
      this.dataExportProvider = QTestProviderFactory.createProvider({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        product: QTestProductType.DATA_EXPORT,
        productConfig: this.config!.products?.dataExport || {}
      }) as QTestDataExportProvider;
      
      await this.dataExportProvider.initialize({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        ...this.config!.products?.dataExport
      });
    } catch (error) {
      throw this.handleError(
        'Failed to initialize qTest Data Export provider',
        error,
        {
          operation: 'initializeDataExportProvider',
          additionalInfo: {
            product: QTestProductType.DATA_EXPORT,
            baseUrl: this.config!.baseUrl,
            defaultProjectId: this.config!.defaultProjectId
          }
        }
      );
    }
  }
  
  /**
   * Ensure the Data Export provider is initialized
   */
  private ensureDataExportProvider(): void {
    if (!this.dataExportProvider) {
      throw new Error('qTest Data Export provider not initialized');
    }
  }
  
  /**
   * Ensure the Pulse provider is initialized
   */
  private ensurePulseProvider(): void {
    if (!this.pulseProvider) {
      throw new Error('qTest Pulse provider not initialized');
    }
  }
  
  /**
   * Initialize qTest Pulse provider
   */
  private async initializePulseProvider(): Promise<void> {
    try {
      // Create and initialize the provider
      this.pulseProvider = QTestProviderFactory.createProvider({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        product: QTestProductType.PULSE,
        productConfig: this.config!.products?.pulse || {}
      });
      
      await this.pulseProvider.initialize({
        baseUrl: this.config!.baseUrl,
        apiToken: this.config!.apiToken,
        username: this.config!.username,
        password: this.config!.password,
        defaultProjectId: this.config!.defaultProjectId,
        maxRequestsPerMinute: this.config!.common?.maxRequestsPerMinute,
        bypassSSL: this.config!.common?.bypassSSL,
        maxRetries: this.config!.common?.maxRetries,
        ...this.config!.products?.pulse
      });
    } catch (error) {
      throw this.handleError(
        'Failed to initialize qTest Pulse provider',
        error,
        {
          operation: 'initializePulseProvider',
          additionalInfo: {
            product: QTestProductType.PULSE,
            baseUrl: this.config!.baseUrl,
            defaultProjectId: this.config!.defaultProjectId
          }
        }
      );
    }
  }
}