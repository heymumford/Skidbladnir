/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestExecutionPreview } from './TestExecutionPreview';
import { 
  TestExecution, 
  ExecutionStatus, 
  testExecutionService 
} from '../../services';

// Mock the service
jest.mock('../../services', () => ({
  testExecutionService: {
    getTestExecution: jest.fn(),
    getExecutionsForTestCase: jest.fn()
  },
  ExecutionStatus: {
    PASSED: 'PASSED',
    FAILED: 'FAILED',
    BLOCKED: 'BLOCKED',
    NOT_EXECUTED: 'NOT_EXECUTED',
    IN_PROGRESS: 'IN_PROGRESS'
  }
}));

describe('TestExecutionPreview', () => {
  // Mock test execution data
  const mockTestExecution: TestExecution = {
    id: 'exec-123',
    testCaseId: 'TC-123',
    executionDate: '2025-01-01T12:00:00Z',
    executedBy: 'jane.doe@example.com',
    status: ExecutionStatus.PASSED,
    duration: 180, // 3 minutes
    environment: 'QA',
    buildVersion: '1.2.3',
    notes: 'Test execution notes',
    stepResults: [
      {
        stepOrder: 1,
        status: ExecutionStatus.PASSED,
        actualResult: 'Step 1 passed',
        notes: 'Step 1 notes'
      },
      {
        stepOrder: 2,
        status: ExecutionStatus.PASSED,
        actualResult: 'Step 2 passed',
        notes: ''
      }
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'screenshot.png',
        fileType: 'image/png',
        size: 10240,
        description: 'Test screenshot'
      }
    ]
  };

  // Mock recent executions
  const mockRecentExecutions: TestExecution[] = [
    mockTestExecution,
    {
      ...mockTestExecution,
      id: 'exec-122',
      executionDate: '2024-12-31T10:00:00Z',
      status: ExecutionStatus.FAILED
    },
    {
      ...mockTestExecution,
      id: 'exec-121',
      executionDate: '2024-12-30T09:00:00Z',
      status: ExecutionStatus.BLOCKED
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up successful mock implementations
    (testExecutionService.getTestExecution as jest.Mock).mockResolvedValue(mockTestExecution);
    (testExecutionService.getExecutionsForTestCase as jest.Mock).mockResolvedValue(mockRecentExecutions);
  });

  it('renders execution details correctly', async () => {
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check that basic execution info is displayed
    expect(screen.getByText(/Test Execution Details/)).toBeInTheDocument();
    expect(screen.getByText(/Execution ID: exec-123/)).toBeInTheDocument();
    expect(screen.getByText(/Test Case ID: TC-123/)).toBeInTheDocument();
    
    // Check execution summary
    expect(screen.getByText('Execution Summary')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('3m 0s')).toBeInTheDocument();
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('QA')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('Test execution notes')).toBeInTheDocument();
    
    // Check step results
    expect(screen.getByText('Step Results')).toBeInTheDocument();
    const stepTable = screen.getByRole('table');
    expect(stepTable).toBeInTheDocument();
    expect(screen.getByText('Step 1 passed')).toBeInTheDocument();
    expect(screen.getByText('Step 2 passed')).toBeInTheDocument();
  });

  it('handles tab navigation', async () => {
    const user = userEvent.setup();
    
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Default tab should be "Step Results"
    expect(screen.getByText('Step 1 passed')).toBeInTheDocument();
    
    // Switch to "Attachments" tab
    await user.click(screen.getByText('Attachments (1)'));
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    
    // Switch to "Recent Executions" tab
    await user.click(screen.getByText('Recent Executions'));
    expect(screen.getAllByText('exec-123')).toHaveLength(2); // Once in header, once in table
    expect(screen.getByText('exec-122')).toBeInTheDocument();
    expect(screen.getByText('exec-121')).toBeInTheDocument();
  });

  it('opens attachment preview dialog when clicking on attachment', async () => {
    const user = userEvent.setup();
    
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Switch to "Attachments" tab
    await user.click(screen.getByText('Attachments (1)'));
    
    // Click on attachment
    const attachmentCard = screen.getByText('screenshot.png').closest('div[role="button"]') || 
                          screen.getByText('screenshot.png').closest('.MuiCard-root');
    await user.click(attachmentCard!);
    
    // Dialog should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Close dialog
    await user.click(screen.getByText('Close'));
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls navigate callback when clicking on another execution', async () => {
    const handleNavigate = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestExecutionPreview 
        executionId="exec-123" 
        onNavigate={handleNavigate} 
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Switch to "Recent Executions" tab
    await user.click(screen.getByText('Recent Executions'));
    
    // Click on "View" for another execution
    await user.click(screen.getAllByText('View')[0]);
    
    // Check that navigate callback was called
    expect(handleNavigate).toHaveBeenCalledWith('exec-122');
  });

  it('shows navigation buttons when multiple executions exist', async () => {
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Navigation buttons should be visible
    expect(screen.getByText('Previous Execution')).toBeInTheDocument();
    expect(screen.getByText('Next Execution')).toBeInTheDocument();
    
    // First execution has no "next", so button should be disabled
    expect(screen.getByText('Next Execution')).toBeDisabled();
    
    // Should have a "previous" button that's enabled
    expect(screen.getByText('Previous Execution')).not.toBeDisabled();
  });

  it('handles loading state', () => {
    // Mock service to delay response
    (testExecutionService.getTestExecution as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTestExecution), 100))
    );
    
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Loading indicator should be shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    // Mock service to reject
    (testExecutionService.getTestExecution as jest.Mock).mockRejectedValue(
      new Error('Failed to load execution')
    );
    
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Error message should be shown
    expect(screen.getByText(/Error loading test execution/)).toBeInTheDocument();
  });

  it('displays empty state when execution not found', async () => {
    // Mock service to return null
    (testExecutionService.getTestExecution as jest.Mock).mockResolvedValue(null);
    
    render(<TestExecutionPreview executionId="exec-123" />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Empty state message should be shown
    expect(screen.getByText(/No execution data available/)).toBeInTheDocument();
  });
});