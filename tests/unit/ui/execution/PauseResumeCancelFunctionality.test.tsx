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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ExecutionControlInterface } from '../../../../packages/ui/src/components/Execution/ExecutionControlInterface';
import { ExecutionStatus } from '../../../../packages/ui/src/components/Execution/ExecutionControlPanel';
import { migrationService } from '../../../../packages/ui/src/services/MigrationService';

// Mock the migration service
jest.mock('../../../../packages/ui/src/services/MigrationService', () => ({
  migrationService: {
    pauseMigration: jest.fn(),
    resumeMigration: jest.fn(),
    cancelMigration: jest.fn(),
    getMigrationStatus: jest.fn()
  }
}));

// Create a theme for testing
const theme = createTheme();

describe('Pause/Resume/Cancel Functionality', () => {
  // Sample mock status objects
  const runningStatus: ExecutionStatus = {
    state: 'running',
    progress: 45,
    completedItems: 45,
    totalItems: 100,
    elapsedTime: 300,
    estimatedTimeRemaining: 350,
    errors: 0,
    warnings: 0,
    currentOperation: 'Processing test cases',
    currentBatch: 2,
    totalBatches: 5,
    statusMessage: 'Migration in progress',
    startTime: new Date(Date.now() - 300000).toISOString()
  };

  const pausedStatus: ExecutionStatus = {
    ...runningStatus,
    state: 'paused',
    statusMessage: 'Migration paused'
  };

  const mockMigrationId = 'migration-123';

  // Sample operation states
  const operations = [
    {
      id: 'op1',
      name: 'Fetch Test Cases',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 120000),
      endTime: new Date(Date.now() - 60000)
    },
    {
      id: 'op2',
      name: 'Transform Data',
      status: 'running',
      progress: 45,
      startTime: new Date(Date.now() - 60000),
      estimatedTimeRemaining: 120
    },
    {
      id: 'op3',
      name: 'Upload to Target',
      status: 'pending',
      progress: 0
    }
  ];

  // Setup mock callback functions
  const onPauseMock = jest.fn().mockResolvedValue(undefined);
  const onResumeMock = jest.fn().mockResolvedValue(undefined);
  const onCancelMock = jest.fn().mockResolvedValue(undefined);
  const _onStatusChangeMock = jest.fn();
  const _onRestartMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock service implementations
    (migrationService.pauseMigration as jest.Mock).mockResolvedValue({
      ...pausedStatus,
      id: mockMigrationId
    });
    
    (migrationService.resumeMigration as jest.Mock).mockResolvedValue({
      ...runningStatus,
      id: mockMigrationId
    });
    
    (migrationService.cancelMigration as jest.Mock).mockResolvedValue({
      ...runningStatus,
      state: 'cancelled',
      statusMessage: 'Migration cancelled',
      id: mockMigrationId
    });
    
    (migrationService.getMigrationStatus as jest.Mock).mockResolvedValue({
      ...runningStatus,
      id: mockMigrationId
    });
  });

  describe('Pause Functionality', () => {
    it('should open pause dialog when pause button is clicked', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Verify pause dialog opens
      expect(screen.getByText('Pause Migration?')).toBeInTheDocument();
      expect(screen.getByText('Select a reason for pausing:')).toBeInTheDocument();
    });

    it('should disable pause confirmation until a reason is selected', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Verify the pause confirmation button is disabled
      const pauseButton = screen.getByText('Pause Migration');
      expect(pauseButton).toBeDisabled();

      // Select a reason
      fireEvent.click(screen.getByText('Temporary Pause'));

      // Verify the pause confirmation button is enabled
      expect(pauseButton).not.toBeDisabled();
    });

    it('should call onPause with the selected reason when confirmed', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Select a reason
      fireEvent.click(screen.getByText('API Rate Limit'));

      // Confirm pause
      fireEvent.click(screen.getByText('Pause Migration'));

      // Verify onPause was called with the correct reason
      await waitFor(() => {
        expect(onPauseMock).toHaveBeenCalledWith('rate-limit');
      });
    });

    it('should close the pause dialog when canceled', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Verify the dialog is open
      expect(screen.getByText('Pause Migration?')).toBeInTheDocument();

      // Get the dialog's cancel button specifically
      const cancelDialogButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelDialogButton);

      // Verify the dialog is closed
      await waitFor(() => {
        expect(screen.queryByText('Pause Migration?')).not.toBeInTheDocument();
      });

      // Verify onPause was not called
      expect(onPauseMock).not.toHaveBeenCalled();
    });

    it('should delegate to the pause handler', async () => {
      // Use a controlled mock function
      const delayedPauseMock = jest.fn().mockResolvedValue(undefined);

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={delayedPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Select a reason
      fireEvent.click(screen.getByText('Temporary Pause'));

      // Get the initial button state before confirming
      const pauseButton = screen.getByText('Pause Migration');
      
      // Confirm pause
      fireEvent.click(pauseButton);
      
      // Verify pause handler was called with the correct reason
      await waitFor(() => {
        expect(delayedPauseMock).toHaveBeenCalledWith('temporary');
      });
    });

    it('should handle errors during pause operation gracefully', async () => {
      // Mock console.error to avoid polluting test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a mock that rejects
      const errorPauseMock = jest.fn().mockRejectedValue(new Error('Failed to pause migration'));

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={errorPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));

      // Select a reason
      fireEvent.click(screen.getByText('Temporary Pause'));

      // Confirm pause
      fireEvent.click(screen.getByText('Pause Migration'));

      // Verify the error was handled gracefully
      await waitFor(() => {
        expect(errorPauseMock).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error pausing migration:', expect.any(Error));
      });

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Resume Functionality', () => {
    it('should call onResume when resume button is clicked', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={pausedStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the resume button
      fireEvent.click(screen.getByText('Resume'));

      // Verify onResume was called
      await waitFor(() => {
        expect(onResumeMock).toHaveBeenCalled();
      });
    });

    it('should show resuming state while resume is in progress', async () => {
      // Create a mock that doesn't resolve immediately
      const delayedResumeMock = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={pausedStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={delayedResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the resume button
      fireEvent.click(screen.getByText('Resume'));

      // Verify button text changes to "Resuming..."
      await waitFor(() => {
        expect(screen.getByText('Resuming...')).toBeInTheDocument();
      });

      // Wait for the mock to resolve
      await waitFor(() => {
        expect(delayedResumeMock).toHaveBeenCalled();
      });
    });

    it('should handle errors during resume operation gracefully', async () => {
      // Mock console.error to avoid polluting test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a mock that rejects
      const errorResumeMock = jest.fn().mockRejectedValue(new Error('Failed to resume migration'));

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={pausedStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={errorResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the resume button
      fireEvent.click(screen.getByText('Resume'));

      // Verify the error was handled gracefully
      await waitFor(() => {
        expect(errorResumeMock).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error resuming migration:', expect.any(Error));
      });

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cancel Functionality', () => {
    it('should open cancel dialog when cancel button is clicked', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Click the cancel button
      fireEvent.click(screen.getByText('Cancel'));

      // Verify cancel dialog opens
      expect(screen.getByText('Cancel Migration?')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to cancel the current migration/)).toBeInTheDocument();
    });

    it('should close cancel dialog when clicking "No, Continue"', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Find the cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Click "No, Continue"
      fireEvent.click(screen.getByText('No, Continue'));

      // Verify dialog is closed
      await waitFor(() => {
        expect(screen.queryByText('Cancel Migration?')).not.toBeInTheDocument();
      });

      // Verify onCancel was not called
      expect(onCancelMock).not.toHaveBeenCalled();
    });

    it('should call onCancel with terminateResources when confirmed', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Find the cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Default is checked, so onCancel should be called with true
      fireEvent.click(screen.getByText('Yes, Cancel Migration'));

      // Verify onCancel was called with true (default)
      await waitFor(() => {
        expect(onCancelMock).toHaveBeenCalledWith(true);
      });
    });

    it('should call onCancel with terminateResources=false when option is unchecked', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={onCancelMock}
          />
        </ThemeProvider>
      );

      // Find the cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Uncheck the "terminate resources" option
      fireEvent.click(screen.getByLabelText('Release all resources (recommended)'));

      // Confirm cancel
      fireEvent.click(screen.getByText('Yes, Cancel Migration'));

      // Verify onCancel was called with false
      await waitFor(() => {
        expect(onCancelMock).toHaveBeenCalledWith(false);
      });
    });

    it('should delegate to the cancel handler', async () => {
      // Use a controlled mock function
      const delayedCancelMock = jest.fn().mockResolvedValue(undefined);

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={delayedCancelMock}
          />
        </ThemeProvider>
      );

      // Find the cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Confirm cancel with the default setting (terminate resources = true)
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel Migration' }));
      
      // Verify cancel handler was called with the correct parameter
      await waitFor(() => {
        expect(delayedCancelMock).toHaveBeenCalledWith(true);
      });
    });

    it('should handle errors during cancel operation gracefully', async () => {
      // Mock console.error to avoid polluting test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a mock that rejects
      const errorCancelMock = jest.fn().mockRejectedValue(new Error('Failed to cancel migration'));

      render(
        <ThemeProvider theme={theme}>
          <ExecutionControlInterface
            status={runningStatus}
            operations={operations}
            onPause={onPauseMock}
            onResume={onResumeMock}
            onCancel={errorCancelMock}
          />
        </ThemeProvider>
      );

      // Find the cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Confirm cancel
      fireEvent.click(screen.getByText('Yes, Cancel Migration'));

      // Verify the error was handled gracefully
      await waitFor(() => {
        expect(errorCancelMock).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error cancelling migration:', expect.any(Error));
      });

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration with MigrationService', () => {
    it('should interact with the MigrationService when pausing a migration', async () => {
      // Create wrapper with direct integration to the migration service
      const TestWrapper = () => {
        const [status, setStatus] = React.useState(runningStatus);
        
        const handlePause = async (reason?: string) => {
          const result = await migrationService.pauseMigration(mockMigrationId, reason);
          setStatus({ ...result });
          return result;
        };
        
        const handleResume = async () => {
          const result = await migrationService.resumeMigration(mockMigrationId);
          setStatus({ ...result });
          return result;
        };
        
        const handleCancel = async (terminateResources?: boolean) => {
          const result = await migrationService.cancelMigration(mockMigrationId, terminateResources);
          setStatus({ ...result });
          return result;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <ExecutionControlInterface
              status={status}
              operations={operations}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          </ThemeProvider>
        );
      };
      
      render(<TestWrapper />);
      
      // Click the pause button
      fireEvent.click(screen.getByText('Pause'));
      
      // Select a reason
      fireEvent.click(screen.getByText('Temporary Pause'));
      
      // Confirm pause
      fireEvent.click(screen.getByText('Pause Migration'));
      
      // Verify service was called with the correct parameters
      await waitFor(() => {
        expect(migrationService.pauseMigration).toHaveBeenCalledWith(mockMigrationId, 'temporary');
      });
    });
    
    it('should interact with the MigrationService when resuming a migration', async () => {
      // Create wrapper with direct integration to the migration service
      const TestWrapper = () => {
        const [status, setStatus] = React.useState(pausedStatus);
        
        const handlePause = async (reason?: string) => {
          const result = await migrationService.pauseMigration(mockMigrationId, reason);
          setStatus({ ...result });
          return result;
        };
        
        const handleResume = async () => {
          const result = await migrationService.resumeMigration(mockMigrationId);
          setStatus({ ...result });
          return result;
        };
        
        const handleCancel = async (terminateResources?: boolean) => {
          const result = await migrationService.cancelMigration(mockMigrationId, terminateResources);
          setStatus({ ...result });
          return result;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <ExecutionControlInterface
              status={status}
              operations={operations}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          </ThemeProvider>
        );
      };
      
      render(<TestWrapper />);
      
      // Click the resume button
      fireEvent.click(screen.getByText('Resume'));
      
      // Verify service was called with the correct parameters
      await waitFor(() => {
        expect(migrationService.resumeMigration).toHaveBeenCalledWith(mockMigrationId);
      });
    });
    
    it('should interact with the MigrationService when cancelling a migration', async () => {
      // Create wrapper with direct integration to the migration service
      const TestWrapper = () => {
        const [status, setStatus] = React.useState(runningStatus);
        
        const handlePause = async (reason?: string) => {
          const result = await migrationService.pauseMigration(mockMigrationId, reason);
          setStatus({ ...result });
          return result;
        };
        
        const handleResume = async () => {
          const result = await migrationService.resumeMigration(mockMigrationId);
          setStatus({ ...result });
          return result;
        };
        
        const handleCancel = async (terminateResources?: boolean) => {
          const result = await migrationService.cancelMigration(mockMigrationId, terminateResources);
          setStatus({ ...result });
          return result;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <ExecutionControlInterface
              status={status}
              operations={operations}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          </ThemeProvider>
        );
      };
      
      render(<TestWrapper />);
      
      // Click the cancel button
      fireEvent.click(screen.getByText('Cancel'));
      
      // Uncheck the "terminate resources" option
      fireEvent.click(screen.getByLabelText('Release all resources (recommended)'));
      
      // Confirm cancel
      fireEvent.click(screen.getByText('Yes, Cancel Migration'));
      
      // Verify service was called with the correct parameters
      await waitFor(() => {
        expect(migrationService.cancelMigration).toHaveBeenCalledWith(mockMigrationId, false);
      });
    });
  });
  
  describe('End-to-End Migration Control Flow', () => {
    it('should integrate with UI state changes', async () => {
      // Create a component with controlled state for testing
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState(runningStatus);
        
        // Handlers that update the component state
        const handlePause = async (reason?: string) => {
          setCurrentStatus({
            ...currentStatus,
            state: 'paused',
            statusMessage: 'Migration paused due to ' + (reason || 'user request')
          });
          return undefined;
        };
        
        const handleResume = async () => {
          setCurrentStatus({
            ...currentStatus,
            state: 'running',
            statusMessage: 'Migration resumed'
          });
          return undefined;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="test-container">
              <p data-testid="status-state">Current state: {currentStatus.state}</p>
              <p data-testid="status-message">Message: {currentStatus.statusMessage}</p>
              <ExecutionControlInterface
                status={currentStatus}
                operations={operations}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={onCancelMock}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      render(<TestComponent />);
      
      // Verify initial state
      expect(screen.getByTestId('status-state').textContent).toContain('running');
      
      // Step 1: Pause the migration
      fireEvent.click(screen.getByText('Pause'));
      fireEvent.click(screen.getByText('Temporary Pause'));
      fireEvent.click(screen.getByText('Pause Migration'));
      
      // Verify state was updated to paused
      await waitFor(() => {
        expect(screen.getByTestId('status-state').textContent).toContain('paused');
        expect(screen.getByTestId('status-message').textContent).toContain('Migration paused due to temporary');
      });
      
      // Step 2: Resume the migration
      fireEvent.click(screen.getByText('Resume'));
      
      // Verify state was updated to running
      await waitFor(() => {
        expect(screen.getByTestId('status-state').textContent).toContain('running');
        expect(screen.getByTestId('status-message').textContent).toContain('Migration resumed');
      });
      
      // Verify that onCancel is properly mocked and reset
      expect(onCancelMock).not.toHaveBeenCalled();
    });
    
    it('should handle the complete pause-resume-cancel lifecycle', async () => {
      let pausePromiseResolve: (value: unknown) => void;
      const pausePromise = new Promise(resolve => {
        pausePromiseResolve = resolve;
      });

      // Create a component with comprehensive state handling and debug output
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState(runningStatus);
        const [statusHistory, setStatusHistory] = React.useState<string[]>([
          `Initial: ${runningStatus.state}`
        ]);
        
        // Add to status history
        const addToHistory = (action: string) => {
          setStatusHistory(prev => [...prev, action]);
        };
        
        // Handlers that update the component state
        const handlePause = async (reason?: string) => {
          // Debug log for test
          console.log(`Pausing with reason: ${reason}`);
          
          setCurrentStatus(prevStatus => ({
            ...prevStatus,
            state: 'paused',
            statusMessage: `Migration paused due to ${reason || 'user request'}`
          }));
          addToHistory(`Paused: ${reason}`);
          
          // Signal that the state has been updated
          pausePromiseResolve(true);
          
          return undefined;
        };
        
        const handleResume = async () => {
          // Debug log for test
          console.log('Resuming migration');
          
          setCurrentStatus(prevStatus => ({
            ...prevStatus,
            state: 'running',
            statusMessage: 'Migration resumed'
          }));
          addToHistory('Resumed');
          return undefined;
        };
        
        const handleCancel = async (terminateResources?: boolean) => {
          // Debug log for test
          console.log(`Cancelling with terminateResources=${terminateResources}`);
          
          setCurrentStatus(prevStatus => ({
            ...prevStatus,
            state: 'cancelled',
            statusMessage: `Migration cancelled${terminateResources ? ' with resource termination' : ''}`
          }));
          addToHistory(`Cancelled: terminateResources=${terminateResources}`);
          return undefined;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="test-container">
              <p data-testid="status-state">Current state: {currentStatus.state}</p>
              <p data-testid="status-message">Message: {currentStatus.statusMessage}</p>
              <div data-testid="history">
                {statusHistory.map((item, index) => (
                  <div key={index} data-testid={`history-item-${index}`}>{item}</div>
                ))}
              </div>
              <ExecutionControlInterface
                status={currentStatus}
                operations={operations}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Spy on console.log for debugging
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { debug } = render(<TestComponent />);
      
      // Verify initial state
      expect(screen.getByTestId('status-state').textContent).toContain('running');
      
      // Step 1: Pause the migration with "API Rate Limit" reason
      const pauseButton = screen.getByRole('button', { name: /pause$/i });
      fireEvent.click(pauseButton);
      
      // Click the API Rate Limit option
      const rateLimit = screen.getByText('API Rate Limit');
      fireEvent.click(rateLimit);
      
      // Click "Pause Migration" button
      const pauseMigrationButton = screen.getByRole('button', { name: /pause migration$/i });
      fireEvent.click(pauseMigrationButton);
      
      // Wait for the pause to complete - using our promise
      await pausePromise;
      
      // Verify state was updated to paused
      await waitFor(() => {
        expect(screen.getByTestId('status-state').textContent).toContain('paused');
        expect(screen.getByTestId('status-message').textContent).toContain('Migration paused due to rate-limit');
      });
      
      // Check history was updated
      expect(screen.getByTestId('history-item-1').textContent).toContain('Paused: rate-limit');
      
      // Force a re-render to ensure state updates are reflected in the UI
      debug();
      
      // Now we should be in paused state with a Resume button
      const resumeButton = await waitFor(() => {
        return screen.getByRole('button', { name: /^resume$/i });
      });
      
      // Click resume button
      fireEvent.click(resumeButton);
      
      // Verify state was updated to running
      await waitFor(() => {
        expect(screen.getByTestId('status-state').textContent).toContain('running');
        expect(screen.getByTestId('status-message').textContent).toContain('Migration resumed');
      });
      
      // Check history was updated
      expect(screen.getByTestId('history-item-2').textContent).toContain('Resumed');
      
      // Step 3: Cancel the migration without terminating resources
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelButton);
      
      // Uncheck "Release all resources" option
      const resourceCheckbox = screen.getByLabelText('Release all resources (recommended)');
      fireEvent.click(resourceCheckbox);
      
      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /yes, cancel migration/i });
      fireEvent.click(confirmButton);
      
      // Verify state was updated to cancelled
      await waitFor(() => {
        expect(screen.getByTestId('status-state').textContent).toContain('cancelled');
        expect(screen.getByTestId('status-message').textContent).not.toContain('with resource termination');
      });
      
      // Check history was updated
      expect(screen.getByTestId('history-item-3').textContent).toContain('Cancelled: terminateResources=false');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });
  });
  
  describe('Accessibility and Usability', () => {
    it('should provide appropriate visual feedback during state transitions', async () => {
      // A simpler approach - let's test one operation at a time with more explicit data-testid attributes
      
      // PART 1: Pause with loading indicator
      
      // Setup mock handler with controlled delay
      const pausePromise = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      // Component with loading state and explicit test id
      const PauseLoadingTest = () => {
        const [isPausing, setIsPausing] = React.useState(false);
        
        // Handler explicitly sets loading state
        const handlePause = async (reason?: string) => {
          setIsPausing(true);
          try {
            await pausePromise(reason);
          } finally {
            setIsPausing(false);
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div>
              <p data-testid="pausing-state">{isPausing ? 'Pausing...' : 'Not pausing'}</p>
              <ExecutionControlInterface
                status={runningStatus}
                operations={operations}
                onPause={handlePause}
                onResume={jest.fn()}
                onCancel={jest.fn()}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render and test the pause loading indicator
      const { unmount } = render(<PauseLoadingTest />);
      
      // Initial state - not pausing
      expect(screen.getByTestId('pausing-state').textContent).toBe('Not pausing');
      
      // Start pause operation - should trigger loading state
      const pauseButton = screen.getByRole('button', { name: /pause$/i });
      fireEvent.click(pauseButton);
      fireEvent.click(screen.getByText('Temporary Pause'));
      fireEvent.click(screen.getByRole('button', { name: /pause migration$/i }));
      
      // Verify loading state is active
      await waitFor(() => {
        expect(screen.getByTestId('pausing-state').textContent).toBe('Pausing...');
      });
      
      // Cleanup pause test
      unmount();
      
      // PART 2: Resume with loading indicator
      
      // Setup mock handler with controlled delay
      const resumePromise = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      // Component with loading state and explicit test id
      const ResumeLoadingTest = () => {
        const [isResuming, setIsResuming] = React.useState(false);
        
        // Handler explicitly sets loading state
        const handleResume = async () => {
          setIsResuming(true);
          try {
            await resumePromise();
          } finally {
            setIsResuming(false);
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div>
              <p data-testid="resuming-state">{isResuming ? 'Resuming...' : 'Not resuming'}</p>
              <ExecutionControlInterface
                status={{...runningStatus, state: 'paused'}}
                operations={operations}
                onPause={jest.fn()}
                onResume={handleResume}
                onCancel={jest.fn()}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render and test the resume loading indicator
      const { unmount: unmountResume } = render(<ResumeLoadingTest />);
      
      // Initial state - not resuming
      expect(screen.getByTestId('resuming-state').textContent).toBe('Not resuming');
      
      // Click resume button - should trigger loading state
      const resumeButton = screen.getByRole('button', { name: /resume$/i });
      fireEvent.click(resumeButton);
      
      // Verify loading state is active
      await waitFor(() => {
        expect(screen.getByTestId('resuming-state').textContent).toBe('Resuming...');
      });
      
      // Cleanup resume test
      unmountResume();
      
      // PART 3: Cancel with loading indicator
      
      // Setup mock handler with controlled delay
      const cancelPromise = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      // Component with loading state and explicit test id
      const CancelLoadingTest = () => {
        const [isCancelling, setIsCancelling] = React.useState(false);
        
        // Handler explicitly sets loading state
        const handleCancel = async (terminateResources?: boolean) => {
          setIsCancelling(true);
          try {
            await cancelPromise(terminateResources);
          } finally {
            setIsCancelling(false);
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div>
              <p data-testid="cancelling-state">{isCancelling ? 'Cancelling...' : 'Not cancelling'}</p>
              <ExecutionControlInterface
                status={runningStatus}
                operations={operations}
                onPause={jest.fn()}
                onResume={jest.fn()}
                onCancel={handleCancel}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render and test the cancel loading indicator
      render(<CancelLoadingTest />);
      
      // Initial state - not cancelling
      expect(screen.getByTestId('cancelling-state').textContent).toBe('Not cancelling');
      
      // Start cancel operation - should trigger loading state
      const cancelButton = screen.getByRole('button', { name: /cancel$/i });
      fireEvent.click(cancelButton);
      fireEvent.click(screen.getByRole('button', { name: /yes, cancel migration/i }));
      
      // Verify loading state is active
      await waitFor(() => {
        expect(screen.getByTestId('cancelling-state').textContent).toBe('Cancelling...');
      });
    });
    
    it('should handle different error scenarios during pause/resume/cancel operations', async () => {
      // Mock console errors to avoid polluting test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create mockup functions that will fail
      const failingPauseMock = jest.fn().mockRejectedValue(new Error('Network error during pause'));
      const failingResumeMock = jest.fn().mockRejectedValue(new Error('Service unavailable during resume'));
      const failingCancelMock = jest.fn().mockRejectedValue(new Error('Failed to cancel'));
      
      // PART 1: Test resume error handling
      
      // Create a component in paused state to test resume error
      const ResumeErrorComponent = () => {
        const [status, _setStatus] = React.useState({
          ...runningStatus,
          state: 'paused' // Start in paused state to test resume
        });
        
        // Flag to track if operation was attempted
        const [resumeAttempted, setResumeAttempted] = React.useState(false);
        
        const handleFailingResume = async () => {
          setResumeAttempted(true);
          try {
            return await failingResumeMock();
          } catch (error) {
            // The component should handle the error gracefully
            console.error('Error resuming migration:', error);
            throw error;
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="error-test-container">
              <p data-testid="resume-attempted">{resumeAttempted ? 'Attempted' : 'Not attempted'}</p>
              <ExecutionControlInterface
                status={status}
                operations={operations}
                onPause={failingPauseMock}
                onResume={handleFailingResume}
                onCancel={failingCancelMock}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render the component for testing resume
      const { unmount, rerender: _rerender } = render(<ResumeErrorComponent />);
      
      // Verify we have a Resume button
      expect(screen.getByRole('button', { name: /^resume$/i })).toBeInTheDocument();
      
      // Click resume to trigger the error
      fireEvent.click(screen.getByRole('button', { name: /^resume$/i }));
      
      // Verify the error was handled gracefully
      await waitFor(() => {
        expect(screen.getByTestId('resume-attempted').textContent).toBe('Attempted');
        expect(failingResumeMock).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error resuming migration:', expect.any(Error));
      });
      
      // PART 2: Test pause error handling
      
      // Clear previous mocks and errors
      consoleErrorSpy.mockClear();
      failingPauseMock.mockClear();
      failingResumeMock.mockClear();
      
      // Create a component in running state to test pause error
      const PauseErrorComponent = () => {
        const [status, _setStatus] = React.useState(runningStatus); // Start in running state
        const [pauseAttempted, setPauseAttempted] = React.useState(false);
        
        const handleFailingPause = async (reason?: string) => {
          setPauseAttempted(true);
          try {
            return await failingPauseMock(reason);
          } catch (error) {
            console.error('Error pausing migration:', error);
            throw error;
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="error-test-container">
              <p data-testid="pause-attempted">{pauseAttempted ? 'Attempted' : 'Not attempted'}</p>
              <ExecutionControlInterface
                status={status}
                operations={operations}
                onPause={handleFailingPause}
                onResume={failingResumeMock}
                onCancel={failingCancelMock}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Cleanup previous render and render the new component
      unmount();
      render(<PauseErrorComponent />);
      
      // Click pause, select reason, and confirm to trigger error
      fireEvent.click(screen.getByRole('button', { name: /^pause$/i }));
      fireEvent.click(screen.getByText('Temporary Pause'));
      fireEvent.click(screen.getByRole('button', { name: /pause migration$/i }));
      
      // Verify error was handled gracefully
      await waitFor(() => {
        expect(screen.getByTestId('pause-attempted').textContent).toBe('Attempted');
        expect(failingPauseMock).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error pausing migration:', expect.any(Error));
      });
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should test recovery from failed operations', async () => {
      // Split test into two parts for better isolation
      
      // PART 1: Test pause failure recovery
      
      // Mock for first attempt (fails) and second attempt (succeeds)
      const failThenSucceedPauseMock = jest.fn()
        .mockImplementationOnce(() => Promise.reject(new Error('Failed pause')))
        .mockImplementationOnce(() => Promise.resolve());
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simple component just to test pause flow
      const PauseRecoveryTest = () => {
        const [attemptCount, setAttemptCount] = React.useState(0);
        const [status, setStatus] = React.useState(runningStatus);
        
        const handlePause = async (reason?: string) => {
          const newCount = attemptCount + 1;
          setAttemptCount(newCount);
          
          // Log attempt number for verification
          console.log(`Pause attempt ${newCount}`);
          
          try {
            await failThenSucceedPauseMock(reason);
            // Update state on success
            setStatus(prev => ({...prev, state: 'paused'}));
          } catch (error) {
            console.error('Error in pause handler:', error);
          }
          
          return undefined;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="recovery-test">
              <p data-testid="pause-state">{status.state}</p>
              <p data-testid="attempt-count">{attemptCount}</p>
              <ExecutionControlInterface
                status={status}
                operations={operations}
                onPause={handlePause}
                onResume={jest.fn()}
                onCancel={jest.fn()}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render pause recovery test
      const { unmount } = render(<PauseRecoveryTest />);
      
      // Initial state
      expect(screen.getByTestId('pause-state').textContent).toBe('running');
      expect(screen.getByTestId('attempt-count').textContent).toBe('0');
      
      // First attempt - will fail
      const pauseButton = screen.getByRole('button', { name: /pause$/i });
      fireEvent.click(pauseButton);
      fireEvent.click(screen.getByText('Temporary Pause'));
      fireEvent.click(screen.getByRole('button', { name: /pause migration$/i }));
      
      // Verify attempt was made and error was logged
      await waitFor(() => {
        expect(screen.getByTestId('attempt-count').textContent).toBe('1');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in pause handler:', expect.any(Error));
      });
      
      // State should still be running (failure)
      expect(screen.getByTestId('pause-state').textContent).toBe('running');
      
      // Second attempt - should succeed
      fireEvent.click(pauseButton);
      fireEvent.click(screen.getByText('API Rate Limit'));
      fireEvent.click(screen.getByRole('button', { name: /pause migration$/i }));
      
      // Verify second attempt was made
      await waitFor(() => {
        expect(screen.getByTestId('attempt-count').textContent).toBe('2');
      });
      
      // State should now be paused (success)
      await waitFor(() => {
        expect(screen.getByTestId('pause-state').textContent).toBe('paused');
      });
      
      // Clean up this part of the test
      unmount();
      consoleErrorSpy.mockClear();
      
      // PART 2: Test resume failure recovery
      
      // Mock for resume - first fails, second succeeds
      const failThenSucceedResumeMock = jest.fn()
        .mockImplementationOnce(() => Promise.reject(new Error('Failed resume')))
        .mockImplementationOnce(() => Promise.resolve());
      
      // Component to test resume recovery
      const ResumeRecoveryTest = () => {
        const [attemptCount, setAttemptCount] = React.useState(0);
        const [status, _setStatus] = React.useState({...runningStatus, state: 'paused'});
        
        const handleResume = async () => {
          const newCount = attemptCount + 1;
          setAttemptCount(newCount);
          
          console.log(`Resume attempt ${newCount}`);
          
          try {
            await failThenSucceedResumeMock();
            setStatus(prev => ({...prev, state: 'running'}));
          } catch (error) {
            console.error('Error in resume handler:', error);
          }
          
          return undefined;
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div data-testid="recovery-test">
              <p data-testid="resume-state">{status.state}</p>
              <p data-testid="attempt-count">{attemptCount}</p>
              <ExecutionControlInterface
                status={status}
                operations={operations}
                onPause={jest.fn()}
                onResume={handleResume}
                onCancel={jest.fn()}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      // Render resume recovery test
      render(<ResumeRecoveryTest />);
      
      // Initial state - paused
      expect(screen.getByTestId('resume-state').textContent).toBe('paused');
      expect(screen.getByTestId('attempt-count').textContent).toBe('0');
      
      // First resume attempt - will fail
      const resumeButton = screen.getByRole('button', { name: /resume$/i });
      fireEvent.click(resumeButton);
      
      // Verify attempt was made and error was logged
      await waitFor(() => {
        expect(screen.getByTestId('attempt-count').textContent).toBe('1');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in resume handler:', expect.any(Error));
      });
      
      // State should still be paused (failure)
      expect(screen.getByTestId('resume-state').textContent).toBe('paused');
      
      // Second attempt - should succeed
      fireEvent.click(resumeButton);
      
      // Verify second attempt was made
      await waitFor(() => {
        expect(screen.getByTestId('attempt-count').textContent).toBe('2');
      });
      
      // State should now be running (success)
      await waitFor(() => {
        expect(screen.getByTestId('resume-state').textContent).toBe('running');
      });
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });
    
    it('should handle concurrent operations correctly', async () => {
      // Create mock handlers that delay
      const delayedPauseMock = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      );
      
      const delayedResumeMock = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      );
      
      // Create component with state
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState({
          ...runningStatus,
          state: 'running'
        });
        const [operationInProgress, setOperationInProgress] = React.useState(false);
        
        const handlePause = async (reason?: string) => {
          if (operationInProgress) return;
          
          setOperationInProgress(true);
          try {
            await delayedPauseMock(reason);
            setCurrentStatus(prev => ({...prev, state: 'paused'}));
          } finally {
            setOperationInProgress(false);
          }
        };
        
        const handleResume = async () => {
          if (operationInProgress) return;
          
          setOperationInProgress(true);
          try {
            await delayedResumeMock();
            setCurrentStatus(prev => ({...prev, state: 'running'}));
          } finally {
            setOperationInProgress(false);
          }
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div>
              <p data-testid="operation-status">
                Operation in progress: {operationInProgress ? 'Yes' : 'No'}
              </p>
              <ExecutionControlInterface
                status={currentStatus}
                operations={operations}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={onCancelMock}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      render(<TestComponent />);
      
      // Initial state
      expect(screen.getByTestId('operation-status').textContent).toContain('No');
      
      // Start pause operation
      fireEvent.click(screen.getByText('Pause'));
      fireEvent.click(screen.getByText('Temporary Pause'));
      fireEvent.click(screen.getByText('Pause Migration'));
      
      // Verify operation in progress
      await waitFor(() => {
        expect(screen.getByTestId('operation-status').textContent).toContain('Yes');
      });
      
      // Attempt to click multiple times during operation
      fireEvent.click(screen.getByText('Pausing...'));
      fireEvent.click(screen.getByText('Pausing...'));
      
      // Wait for operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      // Verify pause was only called once
      expect(delayedPauseMock).toHaveBeenCalledTimes(1);
      
      // Now we should be in paused state
      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument();
        expect(screen.getByTestId('operation-status').textContent).toContain('No');
      });
      
      // Test resume with multiple clicks
      fireEvent.click(screen.getByText('Resume'));
      
      await waitFor(() => {
        expect(screen.getByTestId('operation-status').textContent).toContain('Yes');
      });
      
      // Click multiple times
      fireEvent.click(screen.getByText('Resuming...'));
      fireEvent.click(screen.getByText('Resuming...'));
      
      // Wait for operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      // Verify resume was only called once
      expect(delayedResumeMock).toHaveBeenCalledTimes(1);
    });

    it('should maintain accessibility attributes during state transitions', async () => {
      // Create state-tracking component
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState(runningStatus);
        const [isLoading, setIsLoading] = React.useState(false);
        
        const handlePause = async (reason?: string) => {
          setIsLoading(true);
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 100));
          setCurrentStatus({
            ...currentStatus,
            state: 'paused',
            statusMessage: `Migration paused due to ${reason}`
          });
          setIsLoading(false);
        };
        
        return (
          <ThemeProvider theme={theme}>
            <div role="region" aria-label="Migration Control">
              <p aria-live="polite" data-testid="status-message">
                Status: {currentStatus.state}
                {isLoading ? ' - Operation in progress' : ''}
              </p>
              <ExecutionControlInterface
                status={currentStatus}
                operations={operations}
                onPause={handlePause}
                onResume={onResumeMock}
                onCancel={onCancelMock}
              />
            </div>
          </ThemeProvider>
        );
      };
      
      render(<TestComponent />);
      
      // Check initial accessibility
      const controlRegion = screen.getByRole('region');
      expect(controlRegion).toHaveAttribute('aria-label', 'Migration Control');
      
      // Pause button should be properly accessible
      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toHaveAttribute('type', 'button');
      
      // Start pause operation
      fireEvent.click(pauseButton);
      fireEvent.click(screen.getByText('Temporary Pause'));
      
      // Dialog should have proper accessibility attributes
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'pause-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'pause-dialog-description');
      
      // Confirm pause
      fireEvent.click(screen.getByText('Pause Migration'));
      
      // Status should be updated
      await waitFor(() => {
        expect(screen.getByTestId('status-message').textContent).toContain('Operation in progress');
      });
      
      // Wait for operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      // Status should reflect completed operation
      await waitFor(() => {
        expect(screen.getByTestId('status-message').textContent).toContain('paused');
      });
    });
  });
});