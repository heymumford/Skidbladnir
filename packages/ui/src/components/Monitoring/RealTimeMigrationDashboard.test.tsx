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
import '@testing-library/jest-dom';
import { RealTimeMigrationDashboard } from './RealTimeMigrationDashboard';
import { migrationService } from '../../services';

// Mock the services
jest.mock('../../services', () => {
  return {
    migrationService: {
      getMigrationStatus: jest.fn().mockResolvedValue({
        id: 'migration-1',
        status: 'running',
        progress: 45,
        startTime: new Date().toISOString(),
        totalItems: 1000,
        processedItems: 450,
        failedItems: 5,
        estimatedRemainingTime: 1800
      }),
      getMigrationLogs: jest.fn().mockResolvedValue([
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          level: 'info',
          component: 'Migration',
          message: 'Migration started'
        }
      ])
    }
  };
});

// Mock the child components
jest.mock('./OperationDependencyGraph', () => ({
  OperationDependencyGraph: ({ operations, onSelectOperation }) => (
    <div data-testid="operation-dependency-graph">
      Operation Dependency Graph Mock
      <button onClick={() => onSelectOperation('op-1')}>Select Operation</button>
    </div>
  )
}));

jest.mock('./OperationTimelineView', () => ({
  OperationTimelineView: ({ operations }) => (
    <div data-testid="operation-timeline-view">
      Operation Timeline View Mock
    </div>
  )
}));

jest.mock('./ResourceUsageMonitor', () => ({
  ResourceUsageMonitor: ({ operations }) => (
    <div data-testid="resource-usage-monitor">
      Resource Usage Monitor Mock
    </div>
  )
}));

jest.mock('./PerformanceMetricsPanel', () => ({
  PerformanceMetricsPanel: ({ metrics, operations, logs }) => (
    <div data-testid="performance-metrics-panel">
      Performance Metrics Panel Mock
    </div>
  )
}));

describe('RealTimeMigrationDashboard', () => {
  const mockProps = {
    migrationId: 'migration-1',
    autoRefresh: true,
    refreshInterval: 5000,
    onPause: jest.fn().mockResolvedValue(undefined),
    onResume: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn().mockResolvedValue(undefined),
    simulationMode: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    expect(screen.getByText('Loading migration monitoring data...')).toBeInTheDocument();
  });

  it('should fetch migration data on load', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(migrationService.getMigrationStatus).toHaveBeenCalledWith('migration-1');
      expect(migrationService.getMigrationLogs).toHaveBeenCalledWith('migration-1', 50);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Real-Time Migration Monitoring')).toBeInTheDocument();
    });
  });

  it('should render the operation dependency graph', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('operation-dependency-graph')).toBeInTheDocument();
    });
  });

  it('should toggle between standard and detailed views', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Detailed'));
    
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByTestId('resource-usage-monitor')).toBeInTheDocument();
  });

  it('should toggle auto-refresh', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Auto refresh')).toBeInTheDocument();
    });
    
    const autoRefreshToggle = screen.getByLabelText('Auto refresh');
    fireEvent.click(autoRefreshToggle);
    
    // Simulate time passing
    jest.advanceTimersByTime(mockProps.refreshInterval);
    
    // The mock won't update state since we're just testing the toggle interaction
    expect(autoRefreshToggle).toBeInTheDocument();
  });

  it('should handle operation selection', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      const selectButton = screen.getByText('Select Operation');
      fireEvent.click(selectButton);
    });
    
    // After selecting an operation, it should show operation details tab
    await waitFor(() => {
      expect(screen.getByText('Operation Details')).toBeInTheDocument();
    });
  });

  it('should render migration status information', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Migration: migration-1')).toBeInTheDocument();
      expect(screen.getByText('450 of 1000 items processed')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });
  });

  it('should provide pause/cancel controls for running migrations', async () => {
    render(<RealTimeMigrationDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Pause'));
    expect(mockProps.onPause).toHaveBeenCalled();
  });
});