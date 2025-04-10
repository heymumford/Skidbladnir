/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MigrationMonitoringDashboard } from './MigrationMonitoringDashboard';
import { migrationService } from '../../services';

// Mock the services
jest.mock('../../services', () => ({
  migrationService: {
    getMockMigrationStatuses: jest.fn().mockImplementation((count) => {
      return Array(count).fill(0).map((_, i) => ({
        id: `migration-${i}`,
        status: i === 0 ? 'running' : (i === 1 ? 'failed' : 'completed'),
        progress: i === 0 ? 42 : 100,
        source: 'Zephyr',
        target: 'qTest',
        startTime: new Date().toISOString(),
        endTime: i !== 0 ? new Date().toISOString() : undefined,
        totalItems: 100,
        processedItems: i === 0 ? 42 : 100,
        successfulItems: i === 0 ? 40 : (i === 1 ? 80 : 98),
        failedItems: i === 0 ? 2 : (i === 1 ? 20 : 2),
        errorCount: i === 1 ? 5 : 0,
        warningCount: 2,
        currentOperation: i === 0 ? 'Processing test cases' : undefined
      }));
    }),
    getMockMigrationLogs: jest.fn().mockImplementation(() => {
      return Array(10).fill(0).map((_, i) => ({
        id: `log-${i}`,
        timestamp: new Date().toISOString(),
        level: i % 5 === 0 ? 'error' : (i % 3 === 0 ? 'warn' : 'info'),
        component: i % 2 === 0 ? 'API' : 'Processor',
        message: `Test log message ${i}`,
        details: i % 3 === 0 ? { testId: `TC-${i}` } : undefined
      }));
    }),
    getErrorDetails: jest.fn().mockResolvedValue([
      {
        errorId: 'err-1',
        timestamp: new Date().toISOString(),
        errorType: 'validation',
        component: 'Processor',
        operation: 'ValidateTestCase',
        message: 'Validation failed for test case fields',
        details: {
          fields: ['priority', 'description'],
          violations: ['Field "priority" is required']
        }
      }
    ]),
    pauseMigration: jest.fn().mockResolvedValue({}),
    resumeMigration: jest.fn().mockResolvedValue({}),
    cancelMigration: jest.fn().mockResolvedValue({})
  }
}));

// Mock the timer
jest.useFakeTimers();

describe('MigrationMonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with active and recent migrations', async () => {
    render(<MigrationMonitoringDashboard />);

    // Loading state should be shown initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should show the dashboard title
    expect(screen.getByText('Migration Monitoring Dashboard')).toBeInTheDocument();

    // Should show the summary statistics
    expect(screen.getByText('Total Migrations')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();

    // Should show the tabs
    expect(screen.getByText('Active Migrations')).toBeInTheDocument();
    expect(screen.getByText('Migration Details')).toBeInTheDocument();
    expect(screen.getByText('Migration History')).toBeInTheDocument();

    // Should show active migration on the first tab
    expect(screen.getByText('Migration migration-0')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('handles tab switching correctly', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Initially on the active tab
    expect(screen.getByText('Active Migrations (1)')).toBeInTheDocument();

    // Click on the history tab
    fireEvent.click(screen.getByText('Migration History'));

    // Should now show history tab content
    expect(screen.getByText('Recent Migrations (4)')).toBeInTheDocument();
    expect(screen.getByText('Migration migration-1')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('auto-refreshes data at regular intervals', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(migrationService.getMockMigrationStatuses).toHaveBeenCalledTimes(1);
    });

    // Advance timers to trigger auto-refresh
    act(() => {
      jest.advanceTimersByTime(10000); // 10 seconds
    });

    // Should fetch data again
    await waitFor(() => {
      expect(migrationService.getMockMigrationStatuses).toHaveBeenCalledTimes(2);
    });

    // Toggle auto-refresh off
    fireEvent.click(screen.getByLabelText('Auto Refresh'));

    // Advance timers again
    act(() => {
      jest.advanceTimersByTime(10000); // 10 seconds
    });

    // Should not fetch data again
    await waitFor(() => {
      expect(migrationService.getMockMigrationStatuses).toHaveBeenCalledTimes(2);
    });
  });

  it('displays error reports for failed migrations', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Switch to history tab
    fireEvent.click(screen.getByText('Migration History'));

    // Find and click the "View Error Details" button
    const viewErrorDetailsButton = screen.getByText('View Error Details');
    fireEvent.click(viewErrorDetailsButton);

    // Check that error details API was called
    expect(migrationService.getErrorDetails).toHaveBeenCalled();

    // Should show the errors tab 
    await waitFor(() => {
      expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    });
  });

  it('allows controlling migrations (pause, resume, cancel)', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Find the pause button by its aria-label and click it
    const pauseButton = screen.getByLabelText('Pause Migration');
    fireEvent.click(pauseButton);

    // Check that pauseMigration API was called
    expect(migrationService.pauseMigration).toHaveBeenCalledWith('migration-0');

    // The migration service methods are mocked, so we need to simulate the API response
    // For a real component integration test, we would need to mock the API response
    // and check that the UI updates accordingly
  });

  it('displays migration details when clicking "View Details"', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Find the view details button
    const viewDetailsButton = screen.getByLabelText('View Details');
    fireEvent.click(viewDetailsButton);

    // Check that logs API was called
    expect(migrationService.getMockMigrationLogs).toHaveBeenCalled();

    // Should navigate to the details tab
    expect(screen.getByText('Migration Details: migration-0')).toBeInTheDocument();
    
    // Should show the operation log
    expect(screen.getByText('Operation Log')).toBeInTheDocument();
  });

  it('provides manual refresh capability', async () => {
    render(<MigrationMonitoringDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Get count of API calls before refresh
    const initialCallCount = migrationService.getMockMigrationStatuses.mock.calls.length;

    // Find and click refresh button
    const refreshButton = screen.getByLabelText('Refresh Data');
    fireEvent.click(refreshButton);

    // Check that data was refreshed
    await waitFor(() => {
      expect(migrationService.getMockMigrationStatuses.mock.calls.length).toBe(initialCallCount + 1);
    });
  });
});