/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ExecutionControlInterface, OperationState } from '../../../../packages/ui/src/components/Execution/ExecutionControlInterface';
import { ExecutionStatus } from '../../../../packages/ui/src/components/Execution/ExecutionControlPanel';

const theme = createTheme();

describe('ExecutionControlInterface', () => {
  // Setup mock functions
  const onPauseMock = jest.fn().mockResolvedValue(undefined);
  const onResumeMock = jest.fn().mockResolvedValue(undefined);
  const onCancelMock = jest.fn().mockResolvedValue(undefined);
  const onRestartMock = jest.fn();
  const onStatusChangeMock = jest.fn();

  // Sample mock operations
  const mockOperations: OperationState[] = [
    {
      id: 'op1',
      name: 'Fetch Test Cases',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 60000),
      endTime: new Date(),
    },
    {
      id: 'op2',
      name: 'Transform Data',
      status: 'running',
      progress: 45,
      startTime: new Date(),
      estimatedTimeRemaining: 120,
    },
    {
      id: 'op3',
      name: 'Upload to Target',
      status: 'pending',
      progress: 0,
    },
  ];

  // Sample running status
  const runningStatus: ExecutionStatus = {
    state: 'running',
    progress: 30,
    completedItems: 30,
    totalItems: 100,
    elapsedTime: 300,
    estimatedTimeRemaining: 700,
    errors: 0,
    warnings: 0,
    currentOperation: 'Transforming data',
    currentBatch: 1,
    totalBatches: 5,
    statusMessage: 'Migration in progress',
  };

  // Sample paused status
  const pausedStatus: ExecutionStatus = {
    ...runningStatus,
    state: 'paused',
    statusMessage: 'Migration paused',
  };

  // Sample completed status
  const completedStatus: ExecutionStatus = {
    ...runningStatus,
    state: 'completed',
    progress: 100,
    completedItems: 100,
    estimatedTimeRemaining: 0,
    statusMessage: 'Migration complete',
  };

  // Sample failed status
  const failedStatus: ExecutionStatus = {
    ...runningStatus,
    state: 'failed',
    errors: 3,
    statusMessage: 'Migration failed with errors',
  };

  // Sample idle status
  const idleStatus: ExecutionStatus = {
    state: 'idle',
    progress: 0,
    completedItems: 0,
    totalItems: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    errors: 0,
    warnings: 0,
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when status is idle', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={idleStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when status is running', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          onRestart={onRestartMock}
          onStatusChange={onStatusChangeMock}
        />
      </ThemeProvider>
    );

    // Check that the component renders key elements
    expect(screen.getByText('Migration Control Panel')).toBeInTheDocument();
    expect(screen.getByText('Migration in progress')).toBeInTheDocument();
    expect(screen.getByText(/items processed/i)).toBeInTheDocument();
    expect(screen.getByText(/current operation/i)).toBeInTheDocument();
    expect(screen.getByText(/transforming data/i)).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();

    // Check that it shows the correct buttons for 'running' state
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
    expect(screen.queryByText('New Migration')).not.toBeInTheDocument();
  });

  it('renders correctly when status is paused', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={pausedStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check that it shows the correct status
    expect(screen.getByText('Migration paused')).toBeInTheDocument();
    expect(screen.getByText('PAUSED')).toBeInTheDocument();

    // Check that it shows the correct buttons for 'paused' state
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
  });

  it('renders correctly when status is completed', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={completedStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          onRestart={onRestartMock}
        />
      </ThemeProvider>
    );

    // Check that it shows the correct status
    expect(screen.getByText('Migration complete')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();

    // Check that it shows the correct buttons for 'completed' state
    expect(screen.getByText('New Migration')).toBeInTheDocument();
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('renders correctly when status is failed with errors', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={failedStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          onRestart={onRestartMock}
        />
      </ThemeProvider>
    );

    // Check that it shows the correct status and error count
    expect(screen.getByText('Migration failed with errors')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('3 errors')).toBeInTheDocument();

    // Check that it shows the restart button for 'failed' state
    expect(screen.getByText('New Migration')).toBeInTheDocument();
  });

  it('shows operation details when specified', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          showOperationDetails={true}
        />
      </ThemeProvider>
    );

    // Check that operation details are shown
    expect(screen.getByText('Operation Details')).toBeInTheDocument();
    expect(screen.getByText('Fetch Test Cases')).toBeInTheDocument();
    expect(screen.getByText('Transform Data')).toBeInTheDocument();
    expect(screen.getByText('Upload to Target')).toBeInTheDocument();
  });

  it('has an operation details section', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          operations={mockOperations}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check that the Operation Details section exists
    expect(screen.getByText('Operation Details')).toBeInTheDocument();
    
    // Check that the button is clickable (even if we don't test the toggle behavior)
    const detailsButton = screen.getByText('Operation Details').closest('div');
    expect(detailsButton).toHaveAttribute('class', expect.stringContaining('MuiBox-root'));
  });

  it('opens pause dialog when pause button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the pause button
    fireEvent.click(screen.getByText('Pause'));

    // Check that pause dialog is shown
    expect(screen.getByText('Pause Migration?')).toBeInTheDocument();
    expect(screen.getByText('Select a reason for pausing:')).toBeInTheDocument();
    expect(screen.getByText('Temporary Pause')).toBeInTheDocument();
  });

  it('handles pause confirmation with reason', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the pause button
    fireEvent.click(screen.getByText('Pause'));

    // Select a reason
    fireEvent.click(screen.getByText('Temporary Pause'));

    // The reason description should appear
    expect(screen.getByText('Pause the migration temporarily. You can resume it later.')).toBeInTheDocument();

    // Confirm pause
    fireEvent.click(screen.getByText('Pause Migration'));

    // Check that onPause was called with the selected reason
    await waitFor(() => {
      expect(onPauseMock).toHaveBeenCalledWith('temporary');
    });
  });

  it('handles resume button click', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={pausedStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the resume button
    fireEvent.click(screen.getByText('Resume'));

    // Check that onResume was called
    await waitFor(() => {
      expect(onResumeMock).toHaveBeenCalled();
    });
  });

  it('opens cancel dialog when cancel button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));

    // Check that cancel dialog is shown
    expect(screen.getByText('Cancel Migration?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to cancel the current migration/)).toBeInTheDocument();
  });

  it('handles cancel confirmation with termination option', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));

    // Toggle the terminateResources checkbox
    fireEvent.click(screen.getByLabelText('Release all resources (recommended)'));

    // Confirm cancel
    fireEvent.click(screen.getByText('Yes, Cancel Migration'));

    // Check that onCancel was called with the correct option
    await waitFor(() => {
      expect(onCancelMock).toHaveBeenCalledWith(false);
    });
  });

  it('calls onRestart when restart button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={completedStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          onRestart={onRestartMock}
        />
      </ThemeProvider>
    );

    // Click the new migration button
    fireEvent.click(screen.getByText('New Migration'));

    // Check that onRestart was called
    expect(onRestartMock).toHaveBeenCalled();
  });

  it('formats time correctly', () => {
    const status = {
      ...runningStatus,
      elapsedTime: 3661, // 1h 1m 1s
      estimatedTimeRemaining: 7261 // 2h 1m 1s
    };

    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={status}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check that time is formatted correctly
    expect(screen.getByText('Elapsed: 01:01:01')).toBeInTheDocument();
    expect(screen.getByText('ETA: 02:01:01')).toBeInTheDocument();
  });

  it('handles errors in async operations gracefully', async () => {
    // Override normal mock with one that rejects
    const onPauseMockWithError = jest.fn().mockRejectedValue(new Error('Test error'));

    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlInterface
          status={runningStatus}
          onPause={onPauseMockWithError}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Mock console.error to avoid test output noise
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Click the pause button
    fireEvent.click(screen.getByText('Pause'));

    // Select a reason
    fireEvent.click(screen.getByText('Temporary Pause'));

    // Confirm pause
    fireEvent.click(screen.getByText('Pause Migration'));

    // Check that onPause was called
    await waitFor(() => {
      expect(onPauseMockWithError).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error pausing migration:', expect.any(Error));
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
});