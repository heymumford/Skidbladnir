/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { AxiosInstance as _AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { QTestClient, QTestClientConfig, QTestError, QTestModule, QTestPaginationOptions } from '../api-client';

/**
 * qTest Manager API client
 * 
 * This client provides methods specifically for qTest Manager API
 * endpoints related to test case migration.
 */
export class QTestManagerClient {
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
    return this.client.testConnection();
  }
  
  // Project Management
  
  /**
   * Get all projects
   */
  async getProjects(options: QTestPaginationOptions = {}): Promise<AxiosResponse> {
    return this.client.getProjects(options);
  }
  
  /**
   * Get project by ID
   */
  async getProject(projectId: number): Promise<AxiosResponse> {
    return this.client.getProject(projectId);
  }
  
  // Module/Folder Management
  
  /**
   * Get all modules (folders) for a project
   */
  async getModules(projectId: number, options: QTestPaginationOptions = {}): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/modules`, {
        params: {
          ...options,
          expandFields: [...(options.expandFields || []), 'sub_modules']
        }
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'getModules',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Create a module (folder)
   */
  async createModule(projectId: number, moduleData: any): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!moduleData.name) {
        throw QTestError.validation('Module name is required', {
          name: ['Name is required']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/modules`, moduleData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'createModule',
        resourceType: 'module'
      });
    }
  }
  
  // Test Case Management
  
  /**
   * Get test cases with detailed filtering options
   */
  async getTestCasesWithFilters(
    projectId: number, 
    options: QTestPaginationOptions & {
      moduleId?: number;
      searchText?: string;
      createdFrom?: Date;
      createdTo?: Date;
      updatedFrom?: Date;
      updatedTo?: Date;
      statuses?: string[];
      priorities?: string[];
    } = {}
  ): Promise<AxiosResponse> {
    try {
      // Build parameters
      const params: Record<string, any> = {};
      
      // Pagination options
      if (options.page !== undefined) params.page = options.page;
      if (options.pageSize !== undefined) params.pageSize = options.pageSize;
      if (options.fields) params.fields = options.fields.join(',');
      if (options.expandFields) params.expandFields = options.expandFields.join(',');
      
      // Filter options
      if (options.moduleId) params.parentId = options.moduleId;
      if (options.searchText) params.search = options.searchText;
      
      // Date filters
      if (options.createdFrom) params.createdFrom = options.createdFrom.toISOString();
      if (options.createdTo) params.createdTo = options.createdTo.toISOString();
      if (options.updatedFrom) params.updatedFrom = options.updatedFrom.toISOString();
      if (options.updatedTo) params.updatedTo = options.updatedTo.toISOString();
      
      // Status and priority filters
      if (options.statuses && options.statuses.length > 0) params.statuses = options.statuses.join(',');
      if (options.priorities && options.priorities.length > 0) params.priorities = options.priorities.join(',');
      
      return await this.client.get(`/projects/${projectId}/test-cases`, { params });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'getTestCasesWithFilters',
        resourceId: projectId.toString()
      });
    }
  }
  
  /**
   * Get a test case by ID with expanded details
   */
  async getTestCaseWithDetails(
    projectId: number,
    testCaseId: number,
    includeSteps = true,
    includeAttachments = true,
    includeLinks = true
  ): Promise<AxiosResponse> {
    try {
      const expandFields = [];
      if (includeSteps) expandFields.push('test_steps');
      if (includeAttachments) expandFields.push('attachments');
      if (includeLinks) expandFields.push('links');
      
      return await this.client.get(`/projects/${projectId}/test-cases/${testCaseId}`, {
        params: {
          expandFields: expandFields.join(',')
        }
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'getTestCaseWithDetails',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case'
      });
    }
  }
  
  /**
   * Create a test case with detailed error handling
   */
  async createTestCase(projectId: number, testCaseData: any): Promise<AxiosResponse> {
    try {
      // Validate required fields
      if (!testCaseData.name) {
        throw QTestError.validation('Test case name is required', {
          name: ['Name is required']
        });
      }
      
      // Ensure we have a module/parent if specified
      if (testCaseData.parent_id && typeof testCaseData.parent_id !== 'number') {
        throw QTestError.validation('Parent ID must be a number', {
          parent_id: ['Parent ID must be a number']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/test-cases`, testCaseData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'createTestCase',
        resourceType: 'test-case'
      });
    }
  }
  
  /**
   * Update an existing test case
   */
  async updateTestCase(projectId: number, testCaseId: number, testCaseData: any): Promise<AxiosResponse> {
    try {
      // Ensure this is an update not a create
      if (!testCaseId) {
        throw QTestError.validation('Test case ID is required for updates', {
          id: ['Test case ID is required']
        });
      }
      
      return await this.client.put(`/projects/${projectId}/test-cases/${testCaseId}`, testCaseData);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'updateTestCase',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case'
      });
    }
  }
  
  /**
   * Delete a test case
   */
  async deleteTestCase(projectId: number, testCaseId: number): Promise<AxiosResponse> {
    try {
      return await this.client.delete(`/projects/${projectId}/test-cases/${testCaseId}`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'deleteTestCase',
        resourceId: testCaseId.toString(),
        resourceType: 'test-case'
      });
    }
  }
  
  // Test Step Management
  
  /**
   * Update test steps for a test case
   */
  async updateTestSteps(projectId: number, testCaseId: number, steps: any[]): Promise<AxiosResponse> {
    try {
      return await this.client.put(`/projects/${projectId}/test-cases/${testCaseId}/test-steps`, steps);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'updateTestSteps',
        resourceId: testCaseId.toString(),
        resourceType: 'test-steps'
      });
    }
  }
  
  // Field Definition Management
  
  /**
   * Get all field definitions for a project
   */
  async getFieldDefinitions(projectId: number): Promise<AxiosResponse> {
    try {
      return await this.client.get(`/projects/${projectId}/fields`);
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'getFieldDefinitions',
        resourceId: projectId.toString()
      });
    }
  }
  
  // Link Management
  
  /**
   * Create a link between two objects
   */
  async createLink(
    projectId: number, 
    sourceType: string, 
    sourceId: number, 
    targetType: string, 
    targetId: number, 
    linkType: string
  ): Promise<AxiosResponse> {
    try {
      return await this.client.post(`/projects/${projectId}/links`, {
        source_id: sourceId,
        source_type: sourceType,
        target_id: targetId,
        target_type: targetType,
        link_type: linkType
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.PROJECTS,
        operation: 'createLink',
        resourceType: 'link'
      });
    }
  }
  
  // Batch Operations
  
  /**
   * Batch create test cases
   */
  async batchCreateTestCases(projectId: number, testCases: any[]): Promise<AxiosResponse> {
    try {
      // Validate input
      if (!Array.isArray(testCases)) {
        throw QTestError.validation('Test cases must be an array', {
          testCases: ['Must be an array']
        });
      }
      
      if (testCases.some(tc => !tc.name)) {
        throw QTestError.validation('All test cases must have a name', {
          'testCases[].name': ['Name is required for all test cases']
        });
      }
      
      return await this.client.post(`/projects/${projectId}/test-cases/batch`, {
        items: testCases
      });
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'batchCreateTestCases',
        resourceType: 'test-cases'
      });
    }
  }
  
  // Helper methods
  
  /**
   * Delete all test cases from a module (useful for migrations)
   */
  async deleteAllTestCasesInModule(projectId: number, moduleId: number): Promise<void> {
    try {
      // First get all test cases in the module
      const response = await this.getTestCasesWithFilters(projectId, {
        moduleId,
        pageSize: 100
      });
      
      const testCases = response.data;
      
      // Delete each test case
      for (const testCase of testCases) {
        await this.deleteTestCase(projectId, testCase.id);
      }
    } catch (error) {
      if (error instanceof QTestError) {
        throw error;
      }
      throw QTestError.fromAxiosError(error as AxiosError, {
        module: QTestModule.TEST_CASES,
        operation: 'deleteAllTestCasesInModule',
        resourceId: moduleId.toString(),
        resourceType: 'module'
      });
    }
  }
}