/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock TestExecutionService

const TestExecutionService = function() {
  return {
    getTestExecution: jest.fn().mockResolvedValue({
      id: 'exec-123',
      testCaseId: 'tc-123',
      status: 'PASSED',
      startTime: '2024-04-05T10:00:00Z',
      endTime: '2024-04-05T10:15:00Z',
      executor: 'john.doe',
      environment: 'Production',
      stepResults: [
        { id: 'step-result-1', stepId: 'step-1', result: 'PASSED', comment: 'Login page loaded properly' },
        { id: 'step-result-2', stepId: 'step-2', result: 'PASSED', comment: 'Credentials accepted' },
        { id: 'step-result-3', stepId: 'step-3', result: 'PASSED', comment: 'Successfully redirected to dashboard' }
      ],
      attachments: [],
      defects: [],
      comments: ['Test executed successfully']
    }),
    
    getTestExecutions: jest.fn().mockResolvedValue([
      {
        id: 'exec-123',
        testCaseId: 'tc-123',
        status: 'PASSED',
        startTime: '2024-04-05T10:00:00Z',
        endTime: '2024-04-05T10:15:00Z',
        executor: 'john.doe'
      },
      {
        id: 'exec-124',
        testCaseId: 'tc-124',
        status: 'FAILED',
        startTime: '2024-04-05T11:00:00Z',
        endTime: '2024-04-05T11:10:00Z',
        executor: 'jane.smith'
      }
    ]),
    
    createTestExecution: jest.fn().mockResolvedValue({
      id: 'exec-125',
      testCaseId: 'tc-123',
      status: 'NOT_EXECUTED',
      startTime: null,
      endTime: null,
      executor: null,
      environment: null,
      stepResults: [],
      attachments: [],
      defects: [],
      comments: []
    }),
    
    updateTestExecution: jest.fn().mockResolvedValue({
      id: 'exec-123',
      testCaseId: 'tc-123',
      status: 'FAILED',
      startTime: '2024-04-05T10:00:00Z',
      endTime: '2024-04-05T10:15:00Z',
      executor: 'john.doe',
      environment: 'Production',
      stepResults: [
        { id: 'step-result-1', stepId: 'step-1', result: 'PASSED', comment: 'Login page loaded properly' },
        { id: 'step-result-2', stepId: 'step-2', result: 'PASSED', comment: 'Credentials accepted' },
        { id: 'step-result-3', stepId: 'step-3', result: 'FAILED', comment: 'Not redirected to dashboard' }
      ],
      attachments: [],
      defects: [{ id: 'defect-1', key: 'BUG-123', summary: 'Dashboard redirect not working' }],
      comments: ['Test failed on the last step']
    }),
    
    deleteTestExecution: jest.fn().mockResolvedValue(true)
  };
};

// Create a mock instance
const testExecutionService = TestExecutionService();

module.exports = {
  TestExecutionService,
  testExecutionService
};