/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock TestCaseService

const TestCaseService = function() {
  return {
    getTestCase: jest.fn().mockResolvedValue({
      id: 'tc-123',
      name: 'Login Functionality Test',
      description: 'Verify that users can log in with valid credentials',
      priority: 'High',
      status: 'Active',
      steps: [
        { id: 'step-1', description: 'Navigate to login page', expectedResult: 'Login page is displayed' },
        { id: 'step-2', description: 'Enter valid username and password', expectedResult: 'Credentials are accepted' },
        { id: 'step-3', description: 'Click login button', expectedResult: 'User is logged in and redirected to dashboard' }
      ],
      attachments: [],
      tags: ['login', 'authentication', 'smoke-test'],
      createdBy: 'john.doe',
      createdDate: '2024-04-01T10:00:00Z',
      modifiedBy: 'jane.smith',
      modifiedDate: '2024-04-05T14:30:00Z'
    }),
    
    getTestCases: jest.fn().mockResolvedValue([
      {
        id: 'tc-123',
        name: 'Login Functionality Test',
        description: 'Verify that users can log in with valid credentials',
        priority: 'High',
        status: 'Active'
      },
      {
        id: 'tc-124',
        name: 'Password Reset Test',
        description: 'Verify that users can reset their password',
        priority: 'Medium',
        status: 'Active'
      }
    ]),
    
    getTestCaseAttachment: jest.fn().mockResolvedValue({
      id: 'attachment-1',
      fileName: 'screenshot.png',
      fileType: 'image/png',
      fileSize: 1024,
      url: 'https://example.com/attachments/screenshot.png',
      testCaseId: 'tc-123',
      uploadedBy: 'john.doe',
      uploadedDate: '2024-04-01T10:30:00Z'
    }),
    
    getTestCaseAttachments: jest.fn().mockResolvedValue([
      {
        id: 'attachment-1',
        fileName: 'screenshot.png',
        fileType: 'image/png',
        fileSize: 1024,
        testCaseId: 'tc-123'
      },
      {
        id: 'attachment-2',
        fileName: 'test-data.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 2048,
        testCaseId: 'tc-123'
      }
    ]),
    
    createTestCase: jest.fn().mockResolvedValue({
      id: 'tc-125',
      name: 'New Test Case',
      description: 'A new test case created via the API',
      priority: 'Medium',
      status: 'Draft'
    }),
    
    updateTestCase: jest.fn().mockResolvedValue({
      id: 'tc-123',
      name: 'Updated Login Functionality Test',
      description: 'Updated description for login test',
      priority: 'High',
      status: 'Active'
    }),
    
    deleteTestCase: jest.fn().mockResolvedValue(true)
  };
};

// Create a mock instance
const testCaseService = TestCaseService();

module.exports = {
  TestCaseService,
  testCaseService
};