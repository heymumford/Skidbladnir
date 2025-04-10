/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ExecutionStatus, StepResult } from '../../../pkg/domain/entities/TestExecution';
import { TestCaseAttachment } from './TestCaseService';

/**
 * TestExecution structure matching the domain entity
 */
export interface TestExecution {
  id: string;
  testCaseId: string;
  executionDate: string;
  executedBy: string;
  status: ExecutionStatus;
  duration: number; // in seconds
  environment: string;
  buildVersion: string;
  notes: string;
  stepResults: StepResult[];
  attachments?: TestExecutionAttachment[];
}

/**
 * TestExecutionAttachment represents a file attached to a test execution
 */
export interface TestExecutionAttachment extends TestCaseAttachment {
  stepId?: string; // Optional reference to a specific step this attachment is for
  description?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

/**
 * ExecutionFilter provides options for filtering test executions
 */
export interface ExecutionFilter {
  testCaseId?: string;
  status?: ExecutionStatus;
  dateFrom?: string;
  dateTo?: string;
  executedBy?: string;
  environment?: string;
}

/**
 * Service for handling test execution operations in the UI
 */
export class TestExecutionService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get a test execution by ID
   * 
   * @param executionId The ID of the test execution to retrieve
   * @returns A promise that resolves to the test execution
   */
  async getTestExecution(executionId: string): Promise<TestExecution> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/executions/${executionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get test execution: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting test execution:', error);
      
      // For development/demo purposes, return mock data
      return this.getMockTestExecution(executionId);
    }
  }

  /**
   * Get executions for a test case
   * 
   * @param testCaseId The ID of the test case
   * @param limit Optional limit on the number of executions to retrieve
   * @returns A promise that resolves to an array of test executions
   */
  async getExecutionsForTestCase(testCaseId: string, limit?: number): Promise<TestExecution[]> {
    try {
      const url = limit 
        ? `${this.apiBaseUrl}/testcases/${testCaseId}/executions?limit=${limit}`
        : `${this.apiBaseUrl}/testcases/${testCaseId}/executions`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get test executions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting test executions:', error);
      
      // For development/demo purposes, return mock data
      return this.getMockExecutionsForTestCase(testCaseId, limit);
    }
  }

  /**
   * Get attachment data for a test execution
   * 
   * @param executionId The ID of the test execution
   * @param attachmentId The ID of the attachment
   * @returns A promise that resolves to the attachment data
   */
  async getAttachment(executionId: string, attachmentId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/executions/${executionId}/attachments/${attachmentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get attachment: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error getting attachment:', error);
      
      // For development/demo purposes, return a placeholder blob
      return new Blob(['Mock attachment data'], { type: 'text/plain' });
    }
  }

  /**
   * Search for test executions based on filters
   * 
   * @param filter The filter criteria
   * @param page The page number (1-based)
   * @param pageSize The number of items per page
   * @returns A promise that resolves to an array of test executions
   */
  async searchExecutions(
    filter: ExecutionFilter,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ executions: TestExecution[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters if they exist
      if (filter.testCaseId) queryParams.append('testCaseId', filter.testCaseId);
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
      if (filter.executedBy) queryParams.append('executedBy', filter.executedBy);
      if (filter.environment) queryParams.append('environment', filter.environment);
      
      // Add pagination
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', pageSize.toString());
      
      const response = await fetch(`${this.apiBaseUrl}/executions?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search executions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        executions: data.data,
        total: data.meta.total
      };
    } catch (error) {
      console.error('Error searching executions:', error);
      
      // For development/demo purposes, return mock data
      const mockExecutions = [
        this.getMockTestExecution('exec-1'),
        this.getMockTestExecution('exec-2'),
        this.getMockTestExecution('exec-3')
      ];
      
      return {
        executions: mockExecutions,
        total: mockExecutions.length
      };
    }
  }

  /**
   * For development/demo purposes - returns a mock test execution
   */
  private getMockTestExecution(executionId: string): TestExecution {
    // Generate a random result for variety in the UI
    const statuses: ExecutionStatus[] = [
      ExecutionStatus.PASSED,
      ExecutionStatus.FAILED,
      ExecutionStatus.BLOCKED,
      ExecutionStatus.NOT_EXECUTED,
      ExecutionStatus.IN_PROGRESS
    ];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in the last 30 days
    
    return {
      id: executionId || `exec-${Math.floor(Math.random() * 1000)}`,
      testCaseId: 'TC-123',
      executionDate: date.toISOString(),
      executedBy: 'jane.doe@example.com',
      status: randomStatus,
      duration: Math.floor(Math.random() * 300), // Random duration up to 5 minutes
      environment: 'QA',
      buildVersion: '1.2.3',
      notes: 'Executed as part of the sprint 5 regression test cycle',
      stepResults: [
        {
          stepOrder: 1,
          status: ExecutionStatus.PASSED,
          actualResult: 'Login page loaded successfully',
          notes: ''
        },
        {
          stepOrder: 2,
          status: ExecutionStatus.PASSED,
          actualResult: 'Username accepted without validation errors',
          notes: ''
        },
        {
          stepOrder: 3,
          status: randomStatus === ExecutionStatus.FAILED ? ExecutionStatus.FAILED : ExecutionStatus.PASSED,
          actualResult: randomStatus === ExecutionStatus.FAILED 
            ? 'Login button click did not trigger authentication' 
            : 'User successfully authenticated',
          notes: randomStatus === ExecutionStatus.FAILED 
            ? 'Possible API connection issue - system returned timeout' 
            : ''
        },
        {
          stepOrder: 4,
          status: randomStatus === ExecutionStatus.FAILED ? ExecutionStatus.NOT_EXECUTED : ExecutionStatus.PASSED,
          actualResult: randomStatus === ExecutionStatus.FAILED 
            ? 'Step not executed due to previous step failure' 
            : 'User profile information displayed correctly',
          notes: ''
        }
      ],
      attachments: [
        {
          id: 'att-1',
          name: 'login_success.png',
          fileType: 'image/png',
          size: 245000,
          description: 'Screenshot of successful login',
          uploadedBy: 'jane.doe@example.com',
          uploadedAt: date.toISOString()
        },
        {
          id: 'att-2',
          name: 'console_log.txt',
          fileType: 'text/plain',
          size: 15200,
          description: 'Browser console log',
          uploadedBy: 'jane.doe@example.com',
          uploadedAt: date.toISOString()
        },
        {
          id: 'att-3',
          name: 'execution_video.mp4',
          fileType: 'video/mp4',
          size: 3540000,
          description: 'Screen recording of test execution',
          uploadedBy: 'jane.doe@example.com',
          uploadedAt: date.toISOString()
        }
      ]
    };
  }

  /**
   * For development/demo purposes - returns multiple mock test executions
   */
  private getMockExecutionsForTestCase(testCaseId: string, limit: number = 5): TestExecution[] {
    const executions: TestExecution[] = [];
    
    // Generate several mock executions with different dates and statuses
    for (let i = 0; i < limit; i++) {
      const execution = this.getMockTestExecution(`exec-${i + 1}`);
      execution.testCaseId = testCaseId;
      
      // Set descending dates so the most recent is first
      const date = new Date();
      date.setDate(date.getDate() - i);
      execution.executionDate = date.toISOString();
      
      executions.push(execution);
    }
    
    return executions;
  }
}