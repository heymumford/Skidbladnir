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
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ExecutionControlPanel, ExecutionStatus } from '../../../../packages/ui/src/components/Execution/ExecutionControlPanel';

const theme = createTheme();

describe('ExecutionControlPanel', () => {
  // Setup mock functions
  const onPauseMock = jest.fn();
  const onResumeMock = jest.fn();
  const onCancelMock = jest.fn();
  const onRestartMock = jest.fn();

  // Sample running status
  const runningStatus: ExecutionStatus = {
    state: 'running',
    progress: 40,
    completedItems: 40,
    totalItems: 100,
    elapsedTime: 300,
    estimatedTimeRemaining: 450,
    errors: 0,
    warnings: 0,
    currentOperation: 'Processing test cases',
    currentBatch: 2,
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
    errors: 2,
    warnings: 3,
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
        <ExecutionControlPanel
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
        <ExecutionControlPanel
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check that the component renders key elements
    expect(screen.getByText('Migration Control Panel')).toBeInTheDocument();
    expect(screen.getByText('Migration in progress')).toBeInTheDocument();
    expect(screen.getByText(/items processed/i)).toBeInTheDocument();
    expect(screen.getByText(/current operation/i)).toBeInTheDocument();
    expect(screen.getByText(/processing test cases/i)).toBeInTheDocument();
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
        <ExecutionControlPanel
          status={pausedStatus}
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
        <ExecutionControlPanel
          status={completedStatus}
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

  it('renders correctly when status is failed with errors and warnings', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={failedStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
          onRestart={onRestartMock}
        />
      </ThemeProvider>
    );

    // Check that it shows the correct status, error count, and warning count
    expect(screen.getByText('Migration failed with errors')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('2 errors')).toBeInTheDocument();
    expect(screen.getByText('3 warnings')).toBeInTheDocument();

    // Check that it shows the restart button for 'failed' state
    expect(screen.getByText('New Migration')).toBeInTheDocument();
  });

  it('handles pause button click', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the pause button
    fireEvent.click(screen.getByText('Pause'));

    // Check that onPause was called
    expect(onPauseMock).toHaveBeenCalled();
  });

  it('handles resume button click', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
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
    expect(onResumeMock).toHaveBeenCalled();
  });

  it('opens cancel dialog when cancel button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
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

  it('handles cancel confirmation dialog', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the cancel button to open dialog
    fireEvent.click(screen.getByText('Cancel'));

    // Confirm cancel
    fireEvent.click(screen.getByText('Yes, Cancel Migration'));

    // Check that onCancel was called
    expect(onCancelMock).toHaveBeenCalled();
  });

  it('handles cancel dialog close without confirming', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={runningStatus}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Click the cancel button to open dialog
    fireEvent.click(screen.getByText('Cancel'));

    // Close dialog without confirming
    fireEvent.click(screen.getByText('No, Continue'));

    // Check that onCancel was not called
    expect(onCancelMock).not.toHaveBeenCalled();
  });

  it('calls onRestart when restart button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
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
        <ExecutionControlPanel
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

  it('handles singular form of error and warning counts', () => {
    const statusWithSingularCounts: ExecutionStatus = {
      ...runningStatus,
      errors: 1,
      warnings: 1
    };

    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={statusWithSingularCounts}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check singular forms
    expect(screen.getByText('1 error')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
  });

  it('shows the number of processed items when available', () => {
    const statusWithProcessedInfo: ExecutionStatus = {
      ...completedStatus,
      completedItems: 95,
      totalItems: 100
    };

    render(
      <ThemeProvider theme={theme}>
        <ExecutionControlPanel
          status={statusWithProcessedInfo}
          onPause={onPauseMock}
          onResume={onResumeMock}
          onCancel={onCancelMock}
        />
      </ThemeProvider>
    );

    // Check processed items info - just verify the content is generally there
    expect(screen.getByText(/items processed/i)).toBeInTheDocument();
  });
});