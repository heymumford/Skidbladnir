/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Parameters Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * specifically for qTest Parameters for parameterized testing.
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
  TestCase
} from '../../common/src/models/entities';

import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestProviderConfig, QTestProvider } from './index';
import { 
  QTestParametersClient, 
  Parameter, 
  ParameterType, 
  ParameterStatus,
  ParameterValue,
  Dataset,
  DatasetRow
} from './api-client/parameters-client';
import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * Enhanced qTest Parameters provider configuration
 */
export interface QTestParametersProviderConfig extends QTestProviderConfig {
  /**
   * Default parameter set to use if not specified
   */
  defaultParameterSetId?: number;
  
  /**
   * Default dataset to use if not specified
   */
  defaultDatasetId?: number;
  
  /**
   * Maximum number of parameter values to fetch per request
   */
  maxParameterValuesPerRequest?: number;
  
  /**
   * Maximum number of dataset rows to fetch per request
   */
  maxDatasetRowsPerRequest?: number;
}

/**
 * Parameter set with values
 */
export interface ParameterSet {
  id: string;
  name: string;
  description: string;
  parameters: Array<{
    id: string;
    name: string;
    type: string;
    values: Array<{
      id: string;
      value: string | number | boolean | Date;
    }>;
  }>;
}

/**
 * Parameterized test case
 */
export interface ParameterizedTestCase extends TestCase {
  parameters?: ParameterSet[];
  datasets?: Array<{
    id: string;
    name: string;
    parameters: string[]; // Parameter IDs
    rows: Record<string, any>[];
  }>;
}

/**
 * qTest Parameters Provider specialization for parameterized testing
 */
export class QTestParametersProvider extends QTestProvider {
  private parametersClient: QTestParametersClient | null = null;
  private parametersConfig: QTestParametersProviderConfig | null = null;
  
  /**
   * Override id to clearly identify the provider type
   */
  readonly id = 'qtest-parameters';
  
  /**
   * Override name to clearly identify the provider type
   */
  readonly name = 'qTest Parameters';
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: QTestParametersProviderConfig): Promise<void> {
    // First initialize the base provider
    await super.initialize(config);
    
    try {
      this.parametersConfig = config;
      
      // Create specialized parameters client
      this.parametersClient = new QTestParametersClient({
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        username: config.username,
        password: config.password,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        bypassSSL: config.bypassSSL,
        maxRetries: config.maxRetries
      });
    } catch (error) {
      throw this.wrapError('Failed to initialize qTest Parameters provider', error);
    }
  }
  
  /**
   * Test connection to qTest Parameters
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      this.ensureParametersClient();
      
      const isConnected = await this.parametersClient!.testConnection();
      
      return {
        connected: isConnected,
        details: {
          metrics: this.parametersClient!.getRateLimiterMetrics()
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          connected: false,
          error: `qTest Parameters API error: ${error.message}`
        };
      }
      
      return {
        connected: false,
        error: 'Unknown error occurred'
      };
    }
  }
  
  // Parameter Management
  
  /**
   * Get all parameters
   */
  async getParameters(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: ParameterStatus;
      searchText?: string;
    } = {}
  ): Promise<PaginatedResult<Parameter>> {
    try {
      this.ensureParametersClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Build filter for query
      const filter: Record<string, any> = {
        projectId: numericProjectId
      };
      
      if (options.status) {
        filter.status = options.status;
      }
      
      if (options.searchText) {
        filter.name = { $contains: options.searchText };
      }
      
      // Query parameters
      const response = await this.parametersClient!.queryParameters({
        page: options.page,
        size: options.pageSize,
        filter,
        sort: 'name,asc'
      });
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get parameters for project ${projectId}`, error);
    }
  }
  
  /**
   * Get parameter by ID
   */
  async getParameter(
    projectId: string,
    parameterId: string
  ): Promise<Parameter> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      // Get parameter
      const response = await this.parametersClient!.getParameter(numericParameterId);
      
      return response.data;
    } catch (error) {
      throw this.wrapError(`Failed to get parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Create a parameter
   */
  async createParameter(
    projectId: string,
    parameter: Parameter
  ): Promise<string> {
    try {
      this.ensureParametersClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Create parameter
      const response = await this.parametersClient!.createParameter(
        numericProjectId,
        parameter
      );
      
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to create parameter in project ${projectId}`, error);
    }
  }
  
  /**
   * Update a parameter
   */
  async updateParameter(
    projectId: string,
    parameterId: string,
    parameter: Parameter
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      // Update parameter
      await this.parametersClient!.updateParameter(
        numericParameterId,
        parameter
      );
    } catch (error) {
      throw this.wrapError(`Failed to update parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Delete a parameter
   */
  async deleteParameter(
    projectId: string,
    parameterId: string
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      // Delete parameter
      await this.parametersClient!.deleteParameter(numericParameterId);
    } catch (error) {
      throw this.wrapError(`Failed to delete parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Get parameter values
   */
  async getParameterValues(
    projectId: string,
    parameterId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<ParameterValue>> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      // Query parameter values
      const response = await this.parametersClient!.queryParameterValues(
        numericParameterId,
        {
          page: options.page,
          size: options.pageSize
        }
      );
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get values for parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Add a parameter value
   */
  async addParameterValue(
    projectId: string,
    parameterId: string,
    value: ParameterValue
  ): Promise<string> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      // Create parameter value
      const response = await this.parametersClient!.createParameterValue(
        numericParameterId,
        value
      );
      
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to add value to parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Update a parameter value
   */
  async updateParameterValue(
    projectId: string,
    parameterId: string,
    valueId: string,
    value: ParameterValue
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      const numericValueId = parseInt(valueId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      if (isNaN(numericValueId)) {
        throw new Error(`Invalid value ID: ${valueId}`);
      }
      
      // Update parameter value
      await this.parametersClient!.updateParameterValue(
        numericParameterId,
        numericValueId,
        value
      );
    } catch (error) {
      throw this.wrapError(`Failed to update value ${valueId} of parameter ${parameterId}`, error);
    }
  }
  
  /**
   * Delete parameter values
   */
  async deleteParameterValues(
    projectId: string,
    parameterId: string,
    valueIds: string[]
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericParameterId = parseInt(parameterId, 10);
      
      if (isNaN(numericParameterId)) {
        throw new Error(`Invalid parameter ID: ${parameterId}`);
      }
      
      const numericValueIds = valueIds.map(id => {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) {
          throw new Error(`Invalid value ID: ${id}`);
        }
        return numId;
      });
      
      // Delete parameter values
      await this.parametersClient!.deleteParameterValues(
        numericParameterId,
        numericValueIds
      );
    } catch (error) {
      throw this.wrapError(`Failed to delete values from parameter ${parameterId}`, error);
    }
  }
  
  // Dataset Management
  
  /**
   * Get all datasets
   */
  async getDatasets(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: ParameterStatus;
      searchText?: string;
    } = {}
  ): Promise<PaginatedResult<Dataset>> {
    try {
      this.ensureParametersClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Build filter for query
      const filter: Record<string, any> = {
        projectId: numericProjectId
      };
      
      if (options.status) {
        filter.status = options.status;
      }
      
      if (options.searchText) {
        filter.name = { $contains: options.searchText };
      }
      
      // Query datasets
      const response = await this.parametersClient!.queryDatasets({
        page: options.page,
        size: options.pageSize,
        filter,
        sort: 'name,asc'
      });
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get datasets for project ${projectId}`, error);
    }
  }
  
  /**
   * Get dataset by ID
   */
  async getDataset(
    projectId: string,
    datasetId: string
  ): Promise<Dataset> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      // Get dataset
      const response = await this.parametersClient!.getDataset(numericDatasetId);
      
      return response.data;
    } catch (error) {
      throw this.wrapError(`Failed to get dataset ${datasetId}`, error);
    }
  }
  
  /**
   * Create a dataset
   */
  async createDataset(
    projectId: string,
    dataset: Dataset
  ): Promise<string> {
    try {
      this.ensureParametersClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Create dataset
      const response = await this.parametersClient!.createDataset(
        numericProjectId,
        dataset
      );
      
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to create dataset in project ${projectId}`, error);
    }
  }
  
  /**
   * Update a dataset
   */
  async updateDataset(
    projectId: string,
    datasetId: string,
    dataset: Dataset
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      // Update dataset
      await this.parametersClient!.updateDataset(
        numericDatasetId,
        dataset
      );
    } catch (error) {
      throw this.wrapError(`Failed to update dataset ${datasetId}`, error);
    }
  }
  
  /**
   * Delete a dataset
   */
  async deleteDataset(
    projectId: string,
    datasetId: string
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      // Delete dataset
      await this.parametersClient!.deleteDataset(numericDatasetId);
    } catch (error) {
      throw this.wrapError(`Failed to delete dataset ${datasetId}`, error);
    }
  }
  
  /**
   * Get dataset rows
   */
  async getDatasetRows(
    projectId: string,
    datasetId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<DatasetRow>> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      // Get dataset rows
      const response = await this.parametersClient!.getDatasetRows(
        numericDatasetId,
        {
          page: options.page,
          size: options.pageSize
        }
      );
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get rows for dataset ${datasetId}`, error);
    }
  }
  
  /**
   * Add rows to a dataset
   */
  async addDatasetRows(
    projectId: string,
    datasetId: string,
    rows: DatasetRow[]
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      // Add rows to dataset
      await this.parametersClient!.addDatasetRows(
        numericDatasetId,
        rows
      );
    } catch (error) {
      throw this.wrapError(`Failed to add rows to dataset ${datasetId}`, error);
    }
  }
  
  /**
   * Delete rows from a dataset
   */
  async deleteDatasetRows(
    projectId: string,
    datasetId: string,
    rowIds: string[]
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericDatasetId = parseInt(datasetId, 10);
      
      if (isNaN(numericDatasetId)) {
        throw new Error(`Invalid dataset ID: ${datasetId}`);
      }
      
      const numericRowIds = rowIds.map(id => {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) {
          throw new Error(`Invalid row ID: ${id}`);
        }
        return numId;
      });
      
      // Delete rows from dataset
      await this.parametersClient!.deleteDatasetRows(
        numericDatasetId,
        numericRowIds
      );
    } catch (error) {
      throw this.wrapError(`Failed to delete rows from dataset ${datasetId}`, error);
    }
  }
  
  // Parameterized Test Case Management
  
  /**
   * Get parameterized test cases
   * This extends the base getTestCases to include parameter information
   */
  async getParameterizedTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<ParameterizedTestCase>> {
    try {
      // First get the test cases using the base provider
      const testCases = await super.getTestCases(projectId, options);
      
      // Now enhance them with parameter information
      const parameterizedTestCases: ParameterizedTestCase[] = [];
      
      for (const testCase of testCases.items) {
        // Get parameters for this test case
        const parameterized = await this.enhanceTestCaseWithParameters(projectId, testCase);
        parameterizedTestCases.push(parameterized);
      }
      
      return {
        items: parameterizedTestCases,
        total: testCases.total,
        page: testCases.page,
        pageSize: testCases.pageSize
      };
    } catch (error) {
      throw this.wrapError(`Failed to get parameterized test cases for project ${projectId}`, error);
    }
  }
  
  /**
   * Get parameterized test case
   * This extends the base getTestCase to include parameter information
   */
  async getParameterizedTestCase(
    projectId: string,
    testCaseId: string
  ): Promise<ParameterizedTestCase> {
    try {
      // First get the test case using the base provider
      const testCase = await super.getTestCase(projectId, testCaseId);
      
      // Now enhance it with parameter information
      return await this.enhanceTestCaseWithParameters(projectId, testCase);
    } catch (error) {
      throw this.wrapError(`Failed to get parameterized test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Create a parameterized test case
   */
  async createParameterizedTestCase(
    projectId: string,
    testCase: ParameterizedTestCase
  ): Promise<string> {
    try {
      // First create the test case using the base provider
      const testCaseId = await super.createTestCase(projectId, testCase);
      
      // Now add parameter information
      if (testCase.parameters && testCase.parameters.length > 0) {
        await this.assignParametersToTestCase(projectId, testCaseId, testCase.parameters);
      }
      
      if (testCase.datasets && testCase.datasets.length > 0) {
        await this.assignDatasetsToTestCase(projectId, testCaseId, testCase.datasets);
      }
      
      return testCaseId;
    } catch (error) {
      throw this.wrapError(`Failed to create parameterized test case in project ${projectId}`, error);
    }
  }
  
  // Helper methods
  
  /**
   * Ensure the parameters client is initialized
   */
  private ensureParametersClient(): void {
    if (!this.parametersClient || !this.parametersConfig) {
      throw new Error('qTest Parameters provider not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Enhance a test case with parameters information
   */
  private async enhanceTestCaseWithParameters(
    projectId: string,
    testCase: TestCase
  ): Promise<ParameterizedTestCase> {
    // First convert to parameterized test case
    const parameterizedTestCase: ParameterizedTestCase = { ...testCase };
    
    try {
      this.ensureParametersClient();
      
      const numericTestCaseId = parseInt(testCase.id, 10);
      
      if (isNaN(numericTestCaseId)) {
        throw new Error(`Invalid test case ID: ${testCase.id}`);
      }
      
      // Get parameters for the test case
      const response = await this.parametersClient!.getTestCaseParameters(numericTestCaseId);
      
      // Initialize empty arrays
      parameterizedTestCase.parameters = [];
      parameterizedTestCase.datasets = [];
      
      if (response.data && Array.isArray(response.data.parameters)) {
        // For each parameter, get full details including values
        for (const parameterRef of response.data.parameters) {
          const parameterId = parameterRef.id;
          const parameterDetail = await this.getParameter(projectId, parameterId.toString());
          
          // Get parameter values
          const values = await this.getParameterValues(projectId, parameterId.toString());
          
          // Build parameter set structure
          parameterizedTestCase.parameters.push({
            id: parameterId.toString(),
            name: parameterDetail.name,
            description: parameterDetail.description || '',
            parameters: [{
              id: parameterId.toString(),
              name: parameterDetail.name,
              type: parameterDetail.type,
              values: values.items.map(v => ({
                id: v.id?.toString() || '',
                value: v.value
              }))
            }]
          });
        }
      }
      
      // If datasets are present, process them too
      if (response.data && Array.isArray(response.data.datasets)) {
        for (const datasetRef of response.data.datasets) {
          const datasetId = datasetRef.id;
          const datasetDetail = await this.getDataset(projectId, datasetId.toString());
          
          // Get dataset rows
          const rows = await this.getDatasetRows(projectId, datasetId.toString());
          
          parameterizedTestCase.datasets.push({
            id: datasetId.toString(),
            name: datasetDetail.name,
            parameters: datasetDetail.parameters?.map(p => p.id?.toString() || '') || [],
            rows: rows.items.map(row => row.row)
          });
        }
      }
      
      return parameterizedTestCase;
    } catch (error) {
      // If we can't get parameters, still return the test case without them
      this.logger?.warn(`Error getting parameters for test case ${testCase.id}:`, error);
      
      // Return basic structure with empty arrays
      parameterizedTestCase.parameters = [];
      parameterizedTestCase.datasets = [];
      return parameterizedTestCase;
    }
  }
  
  /**
   * Assign parameters to a test case
   */
  private async assignParametersToTestCase(
    projectId: string,
    testCaseId: string,
    parameters: ParameterSet[]
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericTestCaseId = parseInt(testCaseId, 10);
      
      if (isNaN(numericTestCaseId)) {
        throw new Error(`Invalid test case ID: ${testCaseId}`);
      }
      
      // Create any parameters that don't exist yet
      const parameterIds: number[] = [];
      
      for (const paramSet of parameters) {
        for (const param of paramSet.parameters) {
          let parameterId: number;
          
          // If the parameter has no ID, we need to create it first
          if (!param.id || param.id === '0' || param.id === '') {
            // Create parameter
            const parameter: Parameter = {
              name: param.name,
              type: param.type as ParameterType,
              description: paramSet.description,
              status: ParameterStatus.ACTIVE
            };
            
            const newId = await this.createParameter(projectId, parameter);
            parameterId = parseInt(newId, 10);
            
            // Add all values
            for (const value of param.values) {
              await this.addParameterValue(projectId, newId, {
                value: value.value,
                type: param.type as ParameterType
              });
            }
          } else {
            parameterId = parseInt(param.id, 10);
          }
          
          parameterIds.push(parameterId);
        }
      }
      
      // Now assign all parameters to the test case
      if (parameterIds.length > 0) {
        await this.parametersClient!.assignParametersToTestCase(numericTestCaseId, parameterIds);
      }
    } catch (error) {
      throw this.wrapError(`Failed to assign parameters to test case ${testCaseId}`, error);
    }
  }
  
  /**
   * Assign datasets to a test case
   */
  private async assignDatasetsToTestCase(
    projectId: string,
    testCaseId: string,
    datasets: ParameterizedTestCase['datasets']
  ): Promise<void> {
    try {
      this.ensureParametersClient();
      
      const numericTestCaseId = parseInt(testCaseId, 10);
      
      if (isNaN(numericTestCaseId)) {
        throw new Error(`Invalid test case ID: ${testCaseId}`);
      }
      
      // Create any datasets that don't exist yet
      const datasetIds: number[] = [];
      
      if (!datasets || datasets.length === 0) {
        return; // No datasets to assign
      }
      
      for (const dataset of datasets) {
        let datasetId: number;
        
        // If the dataset has no ID, we need to create it first
        if (!dataset.id || dataset.id === '0' || dataset.id === '') {
          // First, we need to get parameter IDs
          const parameterIds = dataset.parameters.map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
          
          // Create dataset
          const newDataset: Dataset = {
            name: dataset.name,
            status: ParameterStatus.ACTIVE,
            parameters: parameterIds.map(id => ({ id }))
          };
          
          const newId = await this.createDataset(projectId, newDataset);
          datasetId = parseInt(newId, 10);
          
          // Add rows
          if (dataset.rows && dataset.rows.length > 0) {
            const datasetRows = dataset.rows.map(row => ({ row }));
            await this.addDatasetRows(projectId, newId, datasetRows);
          }
        } else {
          datasetId = parseInt(dataset.id, 10);
        }
        
        datasetIds.push(datasetId);
      }
      
      // Now assign all datasets to the test case
      if (datasetIds.length > 0) {
        await this.parametersClient!.assignDatasetsToTestCase(numericTestCaseId, datasetIds);
      }
    } catch (error) {
      throw this.wrapError(`Failed to assign datasets to test case ${testCaseId}`, error);
    }
  }
}