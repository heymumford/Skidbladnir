/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { QTestClient, QTestClientConfig, QTestError } from '../api-client';

/**
 * qTest Parameters API status values
 */
export enum ParameterStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT'
}

/**
 * qTest Parameters API parameter type
 */
export enum ParameterType {
  FILE = 'FILE',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  TIMESTAMP = 'TIMESTAMP'
}

/**
 * qTest Parameters API pagination options
 */
export interface ParameterQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  filter?: Record<string, any>;
  fields?: string[];
}

/**
 * qTest Parameters API parameter value
 */
export interface ParameterValue {
  id?: number;
  value: string | number | boolean | Date;
  type: ParameterType;
  createdOn?: string;
  createdBy?: string;
  modifiedOn?: string;
  modifiedBy?: string;
}

/**
 * qTest Parameters API parameter
 */
export interface Parameter {
  id?: number;
  name: string;
  type: ParameterType;
  description?: string;
  status?: ParameterStatus;
  projectId?: number;
  values?: ParameterValue[];
  createdOn?: string;
  createdBy?: string;
  modifiedOn?: string;
  modifiedBy?: string;
}

/**
 * qTest Parameters API dataset row
 */
export interface DatasetRow {
  id?: number;
  row: Record<string, any>;
  createdOn?: string;
  createdBy?: string;
  modifiedOn?: string;
  modifiedBy?: string;
}

/**
 * qTest Parameters API dataset
 */
export interface Dataset {
  id?: number;
  name: string;
  description?: string;
  status?: ParameterStatus;
  projectId?: number;
  parameters?: Parameter[];
  rows?: DatasetRow[];
  createdOn?: string;
  createdBy?: string;
  modifiedOn?: string;
  modifiedBy?: string;
}

/**
 * qTest Parameters API client
 * 
 * This client provides methods specifically for qTest Parameters API
 * endpoints related to parameterized testing.
 */
export class QTestParametersClient {
  private client: QTestClient;
  
  constructor(config: QTestClientConfig) {
    this.client = new QTestClient(config);
  }
  
  /**
   * Get client metrics
   */
  getRateLimiterMetrics() {
    return this.client.getRateLimiterMetrics();
  }
  
  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to query parameters with a small page size to test connection
      await this.queryParameters({ page: 1, size: 1 });
      return true;
    } catch (error) {
      if (error instanceof QTestError && 
          error.details.category === 'authentication') {
        throw error;
      }
      return false;
    }
  }
  
  // Parameter Management
  
  /**
   * Create a parameter
   */
  async createParameter(projectId: number, parameter: Parameter): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!parameter.name || parameter.name.trim() === '') {
        throw QTestError.validation('Parameter name is required', {
          name: ['Name is required']
        });
      }
      
      if (!parameter.type) {
        throw QTestError.validation('Parameter type is required', {
          type: ['Type is required']
        });
      }
      
      // Set project ID if not already set
      if (!parameter.projectId) {
        parameter.projectId = projectId;
      }
      
      return await this.client.post('/api/v1/parameters/create', parameter);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'createParameter',
        resourceType: 'parameter'
      });
    }
  }
  
  /**
   * Query parameters with filtering and pagination
   */
  async queryParameters(options: ParameterQueryOptions = {}): Promise<AxiosResponse> {
    try {
      const query: Record<string, any> = {
        page: options.page || 0,
        size: options.size || 20
      };
      
      if (options.sort) {
        query.sort = options.sort;
      }
      
      if (options.filter) {
        query.filter = options.filter;
      }
      
      if (options.fields && options.fields.length > 0) {
        query.fields = options.fields;
      }
      
      return await this.client.post('/api/v1/parameters/query', query);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'queryParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Query multiple parameters by IDs
   */
  async bulkQueryParameters(parameterIds: number[]): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(parameterIds) || parameterIds.length === 0) {
        throw QTestError.validation('Parameter IDs array is required and must not be empty', {
          parameterIds: ['Parameter IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post('/api/v1/parameters/bulk-query', {
        ids: parameterIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'bulkQueryParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Get a parameter by ID
   */
  async getParameter(parameterId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v1/parameters/${parameterId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getParameter',
        resourceId: parameterId.toString(),
        resourceType: 'parameter'
      });
    }
  }
  
  /**
   * Update a parameter
   */
  async updateParameter(parameterId: number, parameter: Parameter): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!parameter.name || parameter.name.trim() === '') {
        throw QTestError.validation('Parameter name is required', {
          name: ['Name is required']
        });
      }
      
      if (!parameter.type) {
        throw QTestError.validation('Parameter type is required', {
          type: ['Type is required']
        });
      }
      
      return await this.client.put(`/api/v1/parameters/${parameterId}`, parameter);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'updateParameter',
        resourceId: parameterId.toString(),
        resourceType: 'parameter'
      });
    }
  }
  
  /**
   * Delete a parameter
   */
  async deleteParameter(parameterId: number): Promise<AxiosResponse> {
    try {
      return await this.client.delete(`/api/v1/parameters/${parameterId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'deleteParameter',
        resourceId: parameterId.toString(),
        resourceType: 'parameter'
      });
    }
  }
  
  /**
   * Bulk delete parameters
   */
  async bulkDeleteParameters(parameterIds: number[]): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(parameterIds) || parameterIds.length === 0) {
        throw QTestError.validation('Parameter IDs array is required and must not be empty', {
          parameterIds: ['Parameter IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post('/api/v1/parameters/bulk-delete', {
        ids: parameterIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'bulkDeleteParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Bulk archive parameters
   */
  async bulkArchiveParameters(parameterIds: number[]): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(parameterIds) || parameterIds.length === 0) {
        throw QTestError.validation('Parameter IDs array is required and must not be empty', {
          parameterIds: ['Parameter IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post('/api/v1/parameters/bulk-archive', {
        ids: parameterIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'bulkArchiveParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Update parameter status
   */
  async updateParameterStatus(
    parameterId: number,
    status: ParameterStatus
  ): Promise<AxiosResponse> {
    try {
      return await this.client.put('/api/v1/parameters/status', {
        id: parameterId,
        status: status
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'updateParameterStatus',
        resourceId: parameterId.toString(),
        resourceType: 'parameter'
      });
    }
  }
  
  /**
   * Import parameters from file
   */
  async importParameters(
    projectId: number,
    fileContent: Buffer,
    fileName: string,
    fileType: 'CSV' | 'EXCEL'
  ): Promise<AxiosResponse> {
    try {
      const formData = new FormData();
      formData.append('projectId', projectId.toString());
      formData.append('file', new Blob([fileContent]), fileName);
      formData.append('fileType', fileType);
      
      return await this.client.post('/api/v1/parameters/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'importParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Export parameters
   */
  async exportParameters(
    parameterIds: number[],
    fileType: 'CSV' | 'EXCEL'
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(parameterIds) || parameterIds.length === 0) {
        throw QTestError.validation('Parameter IDs array is required and must not be empty', {
          parameterIds: ['Parameter IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post('/api/v1/parameters/export', {
        ids: parameterIds,
        fileType: fileType
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'exportParameters',
        resourceType: 'parameters'
      });
    }
  }
  
  /**
   * Download exported parameters file
   */
  async downloadExportedParameters(exportId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v1/download/parameters/export/${exportId}`, {
        responseType: 'arraybuffer'
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'downloadExportedParameters',
        resourceId: exportId.toString(),
        resourceType: 'parameters-export'
      });
    }
  }
  
  // Parameter Value Management
  
  /**
   * Create parameter value
   */
  async createParameterValue(
    parameterId: number,
    value: ParameterValue
  ): Promise<AxiosResponse> {
    try {
      if (value.value === undefined || value.value === null) {
        throw QTestError.validation('Parameter value is required', {
          value: ['Value is required']
        });
      }
      
      if (!value.type) {
        throw QTestError.validation('Parameter value type is required', {
          type: ['Type is required']
        });
      }
      
      return await this.client.post(`/api/v1/parameters/${parameterId}/values`, value);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'createParameterValue',
        resourceId: parameterId.toString(),
        resourceType: 'parameter-value'
      });
    }
  }
  
  /**
   * Update parameter value
   */
  async updateParameterValue(
    parameterId: number,
    valueId: number,
    value: ParameterValue
  ): Promise<AxiosResponse> {
    try {
      if (value.value === undefined || value.value === null) {
        throw QTestError.validation('Parameter value is required', {
          value: ['Value is required']
        });
      }
      
      if (!value.type) {
        throw QTestError.validation('Parameter value type is required', {
          type: ['Type is required']
        });
      }
      
      return await this.client.put(
        `/api/v1/parameters/${parameterId}/values/${valueId}`,
        value
      );
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'updateParameterValue',
        resourceId: valueId.toString(),
        resourceType: 'parameter-value'
      });
    }
  }
  
  /**
   * Delete parameter values
   */
  async deleteParameterValues(
    parameterId: number,
    valueIds: number[]
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(valueIds) || valueIds.length === 0) {
        throw QTestError.validation('Value IDs array is required and must not be empty', {
          valueIds: ['Value IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post(`/api/v1/parameters/${parameterId}/values/delete`, {
        ids: valueIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'deleteParameterValues',
        resourceId: parameterId.toString(),
        resourceType: 'parameter-values'
      });
    }
  }
  
  /**
   * Query parameter values
   */
  async queryParameterValues(
    parameterId: number,
    options: ParameterQueryOptions = {}
  ): Promise<AxiosResponse> {
    try {
      const query: Record<string, any> = {
        page: options.page || 0,
        size: options.size || 20
      };
      
      if (options.sort) {
        query.sort = options.sort;
      }
      
      if (options.filter) {
        query.filter = options.filter;
      }
      
      if (options.fields && options.fields.length > 0) {
        query.fields = options.fields;
      }
      
      return await this.client.post(
        `/api/v1/parameters/${parameterId}/values/query`,
        query
      );
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'queryParameterValues',
        resourceId: parameterId.toString(),
        resourceType: 'parameter-values'
      });
    }
  }
  
  // Dataset Management
  
  /**
   * Create a dataset
   */
  async createDataset(projectId: number, dataset: Dataset): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!dataset.name || dataset.name.trim() === '') {
        throw QTestError.validation('Dataset name is required', {
          name: ['Name is required']
        });
      }
      
      // Set project ID if not already set
      if (!dataset.projectId) {
        dataset.projectId = projectId;
      }
      
      return await this.client.post('/api/v1/data-sets/create', dataset);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'createDataset',
        resourceType: 'dataset'
      });
    }
  }
  
  /**
   * Get a dataset by ID
   */
  async getDataset(datasetId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v1/data-sets/${datasetId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getDataset',
        resourceId: datasetId.toString(),
        resourceType: 'dataset'
      });
    }
  }
  
  /**
   * Update a dataset
   */
  async updateDataset(datasetId: number, dataset: Dataset): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!dataset.name || dataset.name.trim() === '') {
        throw QTestError.validation('Dataset name is required', {
          name: ['Name is required']
        });
      }
      
      return await this.client.put(`/api/v1/data-sets/${datasetId}`, dataset);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'updateDataset',
        resourceId: datasetId.toString(),
        resourceType: 'dataset'
      });
    }
  }
  
  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: number): Promise<AxiosResponse> {
    try {
      return await this.client.delete(`/api/v1/data-sets/${datasetId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'deleteDataset',
        resourceId: datasetId.toString(),
        resourceType: 'dataset'
      });
    }
  }
  
  /**
   * Query datasets with filtering and pagination
   */
  async queryDatasets(options: ParameterQueryOptions = {}): Promise<AxiosResponse> {
    try {
      const query: Record<string, any> = {
        page: options.page || 0,
        size: options.size || 20
      };
      
      if (options.sort) {
        query.sort = options.sort;
      }
      
      if (options.filter) {
        query.filter = options.filter;
      }
      
      if (options.fields && options.fields.length > 0) {
        query.fields = options.fields;
      }
      
      return await this.client.post('/api/v1/data-sets/query', query);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'queryDatasets',
        resourceType: 'datasets'
      });
    }
  }
  
  /**
   * Bulk delete datasets
   */
  async bulkDeleteDatasets(datasetIds: number[]): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(datasetIds) || datasetIds.length === 0) {
        throw QTestError.validation('Dataset IDs array is required and must not be empty', {
          datasetIds: ['Dataset IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post('/api/v1/data-sets/bulk-delete', {
        ids: datasetIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'bulkDeleteDatasets',
        resourceType: 'datasets'
      });
    }
  }
  
  /**
   * Update dataset status
   */
  async updateDatasetStatus(
    datasetId: number,
    status: ParameterStatus
  ): Promise<AxiosResponse> {
    try {
      return await this.client.put('/api/v1/data-sets/status', {
        id: datasetId,
        status: status
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'updateDatasetStatus',
        resourceId: datasetId.toString(),
        resourceType: 'dataset'
      });
    }
  }
  
  /**
   * Import datasets from file
   */
  async importDatasets(
    projectId: number,
    fileContent: Buffer,
    fileName: string,
    fileType: 'CSV' | 'EXCEL'
  ): Promise<AxiosResponse> {
    try {
      const formData = new FormData();
      formData.append('projectId', projectId.toString());
      formData.append('file', new Blob([fileContent]), fileName);
      formData.append('fileType', fileType);
      
      return await this.client.post('/api/v1/data-sets/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'importDatasets',
        resourceType: 'datasets'
      });
    }
  }
  
  /**
   * Add rows to a dataset
   */
  async addDatasetRows(
    datasetId: number,
    rows: DatasetRow[]
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(rows) || rows.length === 0) {
        throw QTestError.validation('Rows array is required and must not be empty', {
          rows: ['Rows array is required and must not be empty']
        });
      }
      
      return await this.client.post(`/api/v1/data-sets/${datasetId}/rows`, rows);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'addDatasetRows',
        resourceId: datasetId.toString(),
        resourceType: 'dataset-rows'
      });
    }
  }
  
  /**
   * Get dataset rows
   */
  async getDatasetRows(
    datasetId: number,
    options: ParameterQueryOptions = {}
  ): Promise<AxiosResponse> {
    try {
      const params: Record<string, any> = {
        page: options.page || 0,
        size: options.size || 20
      };
      
      if (options.sort) {
        params.sort = options.sort;
      }
      
      return await this.client.get(`/api/v1/data-sets/${datasetId}/rows`, {
        params
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getDatasetRows',
        resourceId: datasetId.toString(),
        resourceType: 'dataset-rows'
      });
    }
  }
  
  /**
   * Delete dataset rows
   */
  async deleteDatasetRows(
    datasetId: number,
    rowIds: number[]
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(rowIds) || rowIds.length === 0) {
        throw QTestError.validation('Row IDs array is required and must not be empty', {
          rowIds: ['Row IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post(`/api/v1/data-sets/${datasetId}/rows/delete`, {
        ids: rowIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'deleteDatasetRows',
        resourceId: datasetId.toString(),
        resourceType: 'dataset-rows'
      });
    }
  }
  
  // Task Management
  
  /**
   * Get a task by ID
   */
  async getTask(taskId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v1/tasks/${taskId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getTask',
        resourceId: taskId.toString(),
        resourceType: 'task'
      });
    }
  }
  
  /**
   * Get task result
   */
  async getTaskResult(taskId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v1/tasks/${taskId}/result`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getTaskResult',
        resourceId: taskId.toString(),
        resourceType: 'task-result'
      });
    }
  }
  
  // Test Case Parameter Methods
  
  /**
   * Get test case parameters
   */
  async getTestCaseParameters(testCaseId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/api/v3/test-cases/${testCaseId}/parameters`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'getTestCaseParameters',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case-parameters'
      });
    }
  }

  /**
   * Assign parameters to test case
   */
  async assignParametersToTestCase(
    testCaseId: number,
    parameterIds: number[]
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(parameterIds) || parameterIds.length === 0) {
        throw QTestError.validation('Parameter IDs array is required and must not be empty', {
          parameterIds: ['Parameter IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post(`/api/v3/test-cases/${testCaseId}/parameters`, {
        parameterIds: parameterIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'assignParametersToTestCase',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case-parameters'
      });
    }
  }

  /**
   * Assign datasets to test case
   */
  async assignDatasetsToTestCase(
    testCaseId: number,
    datasetIds: number[]
  ): Promise<AxiosResponse> {
    try {
      if (!Array.isArray(datasetIds) || datasetIds.length === 0) {
        throw QTestError.validation('Dataset IDs array is required and must not be empty', {
          datasetIds: ['Dataset IDs array is required and must not be empty']
        });
      }
      
      return await this.client.post(`/api/v3/test-cases/${testCaseId}/datasets`, {
        datasetIds: datasetIds
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        operation: 'assignDatasetsToTestCase',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case-datasets'
      });
    }
  }
}