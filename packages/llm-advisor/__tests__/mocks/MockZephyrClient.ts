/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Mock Zephyr API client for testing
 */
export class MockZephyrClient {
  private mockProjects = [
    { id: 'project1', key: 'PROJ1', name: 'Test Project 1' },
    { id: 'project2', key: 'PROJ2', name: 'Test Project 2' }
  ];

  private mockFolders = [
    { id: 'folder1', name: 'Folder 1', parentId: null },
    { id: 'folder2', name: 'Folder 2', parentId: 'folder1' }
  ];

  private mockTestCases = [
    { 
      id: 'tc1', 
      key: 'TC-1', 
      name: 'Test Case 1', 
      folder: 'folder1',
      steps: [
        { id: 'step1', order: 1, description: 'Step 1', expectedResult: 'Result 1' },
        { id: 'step2', order: 2, description: 'Step 2', expectedResult: 'Result 2' }
      ]
    },
    { 
      id: 'tc2', 
      key: 'TC-2', 
      name: 'Test Case 2', 
      folder: 'folder2',
      steps: [
        { id: 'step3', order: 1, description: 'Step 3', expectedResult: 'Result 3' }
      ]
    }
  ];

  private mockExecutions = [
    {
      id: 'exec1',
      testCase: { id: 'tc1', key: 'TC-1' },
      status: 'PASSED',
      executedBy: 'user1',
      executedOn: '2025-02-15T14:30:00Z'
    },
    {
      id: 'exec2',
      testCase: { id: 'tc2', key: 'TC-2' },
      status: 'FAILED',
      executedBy: 'user2',
      executedOn: '2025-02-16T09:15:00Z'
    }
  ];

  // Default behavior flags for testing different scenarios
  public failNextRequest = false;
  public simulateTimeout = false;
  public simulateRateLimit = false;

  // Mock methods to simulate API responses
  async getProjects() {
    this.checkFailures();
    return { status: 200, data: this.mockProjects };
  }

  async getFolders(_projectKey: string) {
    this.checkFailures();
    return { status: 200, data: this.mockFolders };
  }

  async getTestCases(_projectKey: string, _options?: any) {
    this.checkFailures();
    return { 
      status: 200, 
      data: this.mockTestCases,
      total: this.mockTestCases.length
    };
  }

  async getTestCase(id: string) {
    this.checkFailures();
    const testCase = this.mockTestCases.find(tc => tc.id === id || tc.key === id);
    if (!testCase) {
      return { status: 404, data: { error: 'Test case not found' } };
    }
    return { status: 200, data: testCase };
  }

  async getExecutions(_options?: any) {
    this.checkFailures();
    return { 
      status: 200, 
      data: this.mockExecutions,
      total: this.mockExecutions.length
    };
  }

  async createFolder(projectKey: string, name: string, parentId?: string) {
    this.checkFailures();
    const newFolder = {
      id: `folder-${Date.now()}`,
      name,
      parentId: parentId || null
    };
    this.mockFolders.push(newFolder);
    return { status: 201, data: newFolder };
  }

  async createTestCase(projectKey: string, testCase: any) {
    this.checkFailures();
    const newTestCase = {
      id: `tc-${Date.now()}`,
      key: `TC-${this.mockTestCases.length + 1}`,
      name: testCase.name,
      folder: testCase.folder,
      steps: testCase.steps || []
    };
    this.mockTestCases.push(newTestCase);
    return { status: 201, data: newTestCase };
  }

  async createExecution(testCaseId: string, execution: any) {
    this.checkFailures();
    const testCase = this.mockTestCases.find(tc => tc.id === testCaseId || tc.key === testCaseId);
    if (!testCase) {
      return { status: 404, data: { error: 'Test case not found' } };
    }
    
    const newExecution = {
      id: `exec-${Date.now()}`,
      testCase: { id: testCase.id, key: testCase.key },
      status: execution.status || 'EXECUTED',
      executedBy: execution.executedBy || 'system',
      executedOn: new Date().toISOString()
    };
    
    this.mockExecutions.push(newExecution);
    return { status: 201, data: newExecution };
  }

  // Helper method to simulate failures
  private checkFailures() {
    if (this.failNextRequest) {
      this.failNextRequest = false;
      throw new Error('Mock API request failed');
    }
    
    if (this.simulateTimeout) {
      throw new Error('Request timed out');
    }
    
    if (this.simulateRateLimit) {
      throw new Error('API rate limit exceeded');
    }
  }
}