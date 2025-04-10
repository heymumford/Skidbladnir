/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { TestExecutionPreview } from './TestExecutionPreview';
import { ExecutionStatus } from '../../services';

const meta: Meta<typeof TestExecutionPreview> = {
  title: 'Components/TestCase/TestExecutionPreview',
  component: TestExecutionPreview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onNavigate: { action: 'navigated' }
  }
};

export default meta;
type Story = StoryObj<typeof TestExecutionPreview>;

// Mock data for Storybook
const mockPassedExecution = {
  id: 'exec-123',
  testCaseId: 'TC-456',
  executionDate: new Date().toISOString(),
  executedBy: 'jane.doe@example.com',
  status: ExecutionStatus.PASSED,
  duration: 245, // seconds
  environment: 'QA',
  buildVersion: '2.0.1',
  notes: 'Execution completed successfully. All steps passed as expected.',
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
      notes: 'User input field validated correctly'
    },
    {
      stepOrder: 3,
      status: ExecutionStatus.PASSED,
      actualResult: 'Login successful, user redirected to dashboard',
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
      uploadedAt: new Date().toISOString()
    },
    {
      id: 'att-2',
      name: 'console_log.txt',
      fileType: 'text/plain',
      size: 15200,
      description: 'Browser console log',
      uploadedBy: 'jane.doe@example.com',
      uploadedAt: new Date().toISOString()
    }
  ]
};

const mockFailedExecution = {
  ...mockPassedExecution,
  id: 'exec-124',
  status: ExecutionStatus.FAILED,
  notes: 'Execution failed during step 3. API returned a 500 error.',
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
      status: ExecutionStatus.FAILED,
      actualResult: 'API returned 500 error during authentication',
      notes: 'Error details: Internal Server Error. Check server logs for more information.'
    },
    {
      stepOrder: 4,
      status: ExecutionStatus.NOT_EXECUTED,
      actualResult: 'Step not executed due to previous step failure',
      notes: ''
    }
  ],
  attachments: [
    ...mockPassedExecution.attachments,
    {
      id: 'att-3',
      name: 'error_screenshot.png',
      fileType: 'image/png',
      size: 156000,
      description: 'Screenshot of error message',
      uploadedBy: 'jane.doe@example.com',
      uploadedAt: new Date().toISOString()
    },
    {
      id: 'att-4',
      name: 'api_response.json',
      fileType: 'application/json',
      size: 2340,
      description: 'API error response',
      uploadedBy: 'jane.doe@example.com',
      uploadedAt: new Date().toISOString()
    }
  ]
};

const mockBlockedExecution = {
  ...mockPassedExecution,
  id: 'exec-125',
  status: ExecutionStatus.BLOCKED,
  notes: 'Test execution blocked due to environment issues. Test database was not available.',
  stepResults: [
    {
      stepOrder: 1,
      status: ExecutionStatus.PASSED,
      actualResult: 'Login page loaded successfully',
      notes: ''
    },
    {
      stepOrder: 2,
      status: ExecutionStatus.BLOCKED,
      actualResult: 'Unable to proceed due to database connection failure',
      notes: 'Test database was not accessible. Contacted DevOps team.'
    },
    {
      stepOrder: 3,
      status: ExecutionStatus.NOT_EXECUTED,
      actualResult: '',
      notes: ''
    }
  ],
  attachments: [
    {
      id: 'att-5',
      name: 'database_error.png',
      fileType: 'image/png',
      size: 180000,
      description: 'Screenshot of database error',
      uploadedBy: 'jane.doe@example.com',
      uploadedAt: new Date().toISOString()
    }
  ]
};

// Mock API calls for different states
const mockGetTestExecution = (executionId: string) => {
  if (executionId === 'exec-123') return Promise.resolve(mockPassedExecution);
  if (executionId === 'exec-124') return Promise.resolve(mockFailedExecution);
  if (executionId === 'exec-125') return Promise.resolve(mockBlockedExecution);
  if (executionId === 'error-exec') return Promise.reject(new Error('Failed to load execution'));
  if (executionId === 'loading-exec') {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockPassedExecution), 5000);
    });
  }
  return Promise.resolve(null);
};

const mockGetExecutionsForTestCase = () => {
  return Promise.resolve([
    mockPassedExecution,
    mockFailedExecution,
    mockBlockedExecution
  ]);
};

// Mocking service calls for Storybook
export const PassedExecution: Story = {
  args: {
    executionId: 'exec-123'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};

export const FailedExecution: Story = {
  args: {
    executionId: 'exec-124'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};

export const BlockedExecution: Story = {
  args: {
    executionId: 'exec-125'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};

export const LoadingState: Story = {
  args: {
    executionId: 'loading-exec'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};

export const ErrorState: Story = {
  args: {
    executionId: 'error-exec'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};

export const EmptyState: Story = {
  args: {
    executionId: 'unknown-exec'
  },
  parameters: {
    mockData: {
      getTestExecution: mockGetTestExecution,
      getExecutionsForTestCase: mockGetExecutionsForTestCase
    }
  }
};