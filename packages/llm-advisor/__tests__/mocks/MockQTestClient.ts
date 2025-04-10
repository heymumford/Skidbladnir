/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Mock qTest API client for testing
 */
export class MockQTestClient {
  private mockProjects = [
    { id: 1, name: 'qTest Project 1', description: 'First test project' },
    { id: 2, name: 'qTest Project 2', description: 'Second test project' }
  ];

  private mockModules = [
    { id: 1, name: 'Module 1', project_id: 1, parent_id: null },
    { id: 2, name: 'Module 2', project_id: 1, parent_id: 1 }
  ];

  private mockTestCases = [
    {
      id: 101,
      name: 'qTest Case 1',
      description: 'First test case',
      module_id: 1,
      properties: [
        { field_id: 1, field_name: 'Priority', field_value: 'High' },
        { field_id: 2, field_name: 'Status', field_value: 'Ready' }
      ],
      test_steps: [
        { id: 201, description: 'Step 1', expected: 'Result 1', order: 1 },
        { id: 202, description: 'Step 2', expected: 'Result 2', order: 2 }
      ]
    },
    {
      id: 102,
      name: 'qTest Case 2',
      description: 'Second test case',
      module_id: 2,
      properties: [
        { field_id: 1, field_name: 'Priority', field_value: 'Medium' },
        { field_id: 2, field_name: 'Status', field_value: 'Draft' }
      ],
      test_steps: [
        { id: 203, description: 'Step 1', expected: 'Result 1', order: 1 }
      ]
    }
  ];

  private mockTestRuns = [
    {
      id: 301,
      name: 'Test Run 1',
      status: 'PASSED',
      test_case: { id: 101 },
      executed_by: { id: 401, username: 'tester1' },
      execution_date: '2025-02-10T10:30:00Z'
    },
    {
      id: 302,
      name: 'Test Run 2',
      status: 'FAILED',
      test_case: { id: 102 },
      executed_by: { id: 402, username: 'tester2' },
      execution_date: '2025-02-12T15:45:00Z'
    }
  ];

  // Default behavior flags for testing different scenarios
  public failNextRequest = false;
  public simulateTimeout = false;
  public simulateAuthError = false;

  // Mock methods
  async getProjects() {
    this.checkFailures();
    return { data: this.mockProjects };
  }

  async getProject(projectId: number) {
    this.checkFailures();
    const project = this.mockProjects.find(p => p.id === projectId);
    if (!project) {
      return { status: 404, data: { message: 'Project not found' } };
    }
    return { data: project };
  }

  async getModules(projectId: number) {
    this.checkFailures();
    const modules = this.mockModules.filter(m => m.project_id === projectId);
    return { data: modules };
  }

  async getTestCases(projectId: number, moduleId?: number) {
    this.checkFailures();
    let testCases = this.mockTestCases;
    
    if (moduleId) {
      testCases = testCases.filter(tc => tc.module_id === moduleId);
    }
    
    return { data: testCases };
  }

  async getTestCase(projectId: number, testCaseId: number) {
    this.checkFailures();
    const testCase = this.mockTestCases.find(tc => tc.id === testCaseId);
    if (!testCase) {
      return { status: 404, data: { message: 'Test case not found' } };
    }
    return { data: testCase };
  }

  async getTestRuns(projectId: number, testCaseId?: number) {
    this.checkFailures();
    let runs = this.mockTestRuns;
    
    if (testCaseId) {
      runs = runs.filter(r => r.test_case.id === testCaseId);
    }
    
    return { data: runs };
  }

  async createModule(projectId: number, module: any) {
    this.checkFailures();
    const newModule = {
      id: this.mockModules.length + 3,
      name: module.name,
      project_id: projectId,
      parent_id: module.parent_id || null
    };
    
    this.mockModules.push(newModule);
    return { data: newModule };
  }

  async createTestCase(projectId: number, testCase: any) {
    this.checkFailures();
    const newTestCase = {
      id: this.mockTestCases.length + 103,
      name: testCase.name,
      description: testCase.description || '',
      module_id: testCase.module_id,
      properties: testCase.properties || [],
      test_steps: testCase.test_steps || []
    };
    
    this.mockTestCases.push(newTestCase);
    return { data: newTestCase };
  }

  async createTestRun(projectId: number, testRun: any) {
    this.checkFailures();
    const newTestRun = {
      id: this.mockTestRuns.length + 303,
      name: testRun.name,
      status: testRun.status || 'NOT_RUN',
      test_case: { id: testRun.test_case_id },
      executed_by: { id: 401, username: 'tester1' },
      execution_date: testRun.execution_date || new Date().toISOString()
    };
    
    this.mockTestRuns.push(newTestRun);
    return { data: newTestRun };
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
    
    if (this.simulateAuthError) {
      throw new Error('Authentication failed');
    }
  }
}