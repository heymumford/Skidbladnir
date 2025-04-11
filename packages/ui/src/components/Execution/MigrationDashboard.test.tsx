/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MigrationDashboard } from './MigrationDashboard';
import { migrationService } from '../../services/MigrationService';

// Mock the services
jest.mock('../../services/MigrationService', () => {
  return {
    migrationService: {
      getMigrationStatus: jest.fn(),
      getErrorDetails: jest.fn(),
      getMigrationLogs: jest.fn(),
      pauseMigration: jest.fn(),
      resumeMigration: jest.fn(),
      cancelMigration: jest.fn()
    }
  };
});

describe('MigrationDashboard', () => {
  const mockMigrationStatus = {
    id: 'migration-1',
    status: 'running',
    progress: 45,
    startTime: new Date().toISOString(),
    totalItems: 1000,
    processedItems: 450,
    failedItems: 5,
    estimatedRemainingTime: 1800 // 30 minutes in seconds
  };

  const mockErrors = [
    {
      errorId: 'error-123',
      timestamp: new Date().toISOString(),
      errorType: 'network',
      component: 'ZephyrProvider',
      operation: 'FetchTestCase',
      message: 'Network timeout during operation',
      details: {
        statusCode: 408,
        message: 'Request timeout'
      },
      context: {
        testCaseId: 'TC-456'
      }
    }
  ];

  const mockLogs = [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      component: 'MigrationController',
      message: 'Started migration process',
      details: {}
    },
    {
      id: 'log-2',
      timestamp: new Date().toISOString(),
      level: 'warn',
      component: 'Transformer',
      message: 'Field truncated due to length constraints',
      details: {
        field: 'description',
        maxLength: 5000
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (migrationService.getMigrationStatus as jest.Mock).mockResolvedValue(mockMigrationStatus);
    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockErrors);
    (migrationService.getMigrationLogs as jest.Mock).mockResolvedValue(mockLogs);
  });

  it('should render loading state initially', () => {
    render(<MigrationDashboard migrationId="migration-1" />);
    expect(screen.getByText(/loading migration data/i)).toBeInTheDocument();
  });

  it('should display migration metrics after loading', async () => {
    render(<MigrationDashboard migrationId="migration-1" autoRefresh={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Migration Metrics')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Items Completed')).toBeInTheDocument();
    expect(screen.getByText('Elapsed Time')).toBeInTheDocument();
  });

  it('should display error summary when errors exist', async () => {
    render(<MigrationDashboard migrationId="migration-1" autoRefresh={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Summary')).toBeInTheDocument();
    });
  });

  it('should call migration service methods on load', async () => {
    render(<MigrationDashboard migrationId="migration-1" autoRefresh={false} />);
    
    await waitFor(() => {
      expect(migrationService.getMigrationStatus).toHaveBeenCalledWith('migration-1');
      expect(migrationService.getErrorDetails).toHaveBeenCalledWith('migration-1');
      expect(migrationService.getMigrationLogs).toHaveBeenCalledWith('migration-1');
    });
  });

  it('should handle view mode switching', async () => {
    render(<MigrationDashboard migrationId="migration-1" autoRefresh={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Detailed View')).toBeInTheDocument();
    });
    
    // Initially in dashboard mode
    expect(screen.getByText('Migration Metrics')).toBeInTheDocument();
    
    // Switch to detailed view
    act(() => {
      screen.getByText('Detailed View').click();
    });
    
    // Should now show the detailed monitor
    await waitFor(() => {
      // The ExecutionMonitor is loaded in detailed view
      expect(screen.queryByText('Migration Metrics')).not.toBeInTheDocument();
    });
  });

  // Clean up intervals
  afterEach(() => {
    jest.useRealTimers();
  });
});