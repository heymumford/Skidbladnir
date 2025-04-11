/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme';

// Import monitoring components
import { OperationDependencyGraph } from '../../../packages/ui/src/components/Monitoring/OperationDependencyGraph';
import { OperationTimelineView } from '../../../packages/ui/src/components/Monitoring/OperationTimelineView';
import { PerformanceMetricsPanel } from '../../../packages/ui/src/components/Monitoring/PerformanceMetricsPanel';
import { ProgressIndicators } from '../../../packages/ui/src/components/Monitoring/ProgressIndicators';
import { RealTimeMigrationDashboard } from '../../../packages/ui/src/components/Monitoring/RealTimeMigrationDashboard';
import { ResourceUsageMonitor } from '../../../packages/ui/src/components/Monitoring/ResourceUsageMonitor';

/**
 * Test suite to verify that monitoring components render correctly.
 * These components show critical migration progress information to users.
 */
describe('Monitoring Components Render Correctly', () => {
  // Sample operation data for testing
  const sampleOperations = [
    {
      id: 'op-1',
      name: 'Extract Test Cases',
      status: 'COMPLETED',
      progress: 100,
      startTime: '2025-04-09T15:00:00Z',
      endTime: '2025-04-09T15:05:30Z',
      dependencies: [],
      provider: 'ZEPHYR'
    },
    {
      id: 'op-2',
      name: 'Transform Test Cases',
      status: 'IN_PROGRESS',
      progress: 65,
      startTime: '2025-04-09T15:05:45Z',
      endTime: null,
      dependencies: ['op-1'],
      provider: 'SYSTEM'
    },
    {
      id: 'op-3',
      name: 'Import Test Cases',
      status: 'PENDING',
      progress: 0,
      startTime: null,
      endTime: null,
      dependencies: ['op-2'],
      provider: 'QTEST'
    }
  ];

  // Sample performance metrics for testing
  const sampleMetrics = {
    responseTime: {
      zephyr: {
        avg: 350,
        min: 120,
        max: 890
      },
      qtest: {
        avg: 420,
        min: 180,
        max: 980
      }
    },
    throughput: {
      testCasesPerMinute: 28.5,
      lastMinute: 32
    },
    resources: {
      cpu: 45,
      memory: 68,
      network: {
        sent: 1458000,
        received: 9872000
      }
    }
  };

  // Helper to render with theme
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  // Helper to render with theme and router
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={lcarsThemeExtended}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('OperationDependencyGraph Component', () => {
    it('renders with operation data', () => {
      renderWithTheme(
        <OperationDependencyGraph 
          operations={sampleOperations}
          data-testid="dependency-graph"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('dependency-graph')).toBeInTheDocument();
      
      // Operation nodes should be present
      expect(screen.getByText('Extract Test Cases')).toBeInTheDocument();
      expect(screen.getByText('Transform Test Cases')).toBeInTheDocument();
      expect(screen.getByText('Import Test Cases')).toBeInTheDocument();
    });
    
    it('renders empty state when no operations', () => {
      renderWithTheme(
        <OperationDependencyGraph 
          operations={[]}
          data-testid="dependency-graph"
        />
      );
      
      // Component should render with empty state
      expect(screen.getByTestId('dependency-graph')).toBeInTheDocument();
      expect(screen.getByText(/No operations to display/i)).toBeInTheDocument();
    });
  });
  
  describe('OperationTimelineView Component', () => {
    it('renders operation timeline', () => {
      renderWithTheme(
        <OperationTimelineView 
          operations={sampleOperations}
          data-testid="timeline-view"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
      
      // Operation items should be displayed
      expect(screen.getByText('Extract Test Cases')).toBeInTheDocument();
      expect(screen.getByText('Transform Test Cases')).toBeInTheDocument();
      expect(screen.getByText('Import Test Cases')).toBeInTheDocument();
    });
  });
  
  describe('PerformanceMetricsPanel Component', () => {
    it('renders performance metrics', () => {
      renderWithTheme(
        <PerformanceMetricsPanel 
          metrics={sampleMetrics}
          data-testid="performance-metrics"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      
      // Metrics should be displayed
      expect(screen.getByText(/Response Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Throughput/i)).toBeInTheDocument();
      expect(screen.getByText('28.5')).toBeInTheDocument(); // throughput value
    });
    
    it('renders loading state when metrics undefined', () => {
      renderWithTheme(
        <PerformanceMetricsPanel 
          metrics={undefined}
          data-testid="performance-metrics"
        />
      );
      
      // Component should render with loading state
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByText(/Loading metrics/i)).toBeInTheDocument();
    });
  });
  
  describe('ProgressIndicators Component', () => {
    it('renders progress indicators for operations', () => {
      renderWithTheme(
        <ProgressIndicators 
          operations={sampleOperations}
          data-testid="progress-indicators"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('progress-indicators')).toBeInTheDocument();
      
      // Progress values should be displayed
      expect(screen.getByText('100%')).toBeInTheDocument(); // completed operation
      expect(screen.getByText('65%')).toBeInTheDocument(); // in progress operation
      expect(screen.getByText('0%')).toBeInTheDocument(); // pending operation
    });
  });
  
  describe('RealTimeMigrationDashboard Component', () => {
    it('renders migration dashboard with all sections', () => {
      // Mock data for dashboard
      const migrationData = {
        operations: sampleOperations,
        metrics: sampleMetrics,
        migrationId: 'mig-123',
        status: 'IN_PROGRESS',
        progress: 55,
        startTime: '2025-04-09T15:00:00Z',
        estimatedEndTime: '2025-04-09T16:15:00Z'
      };
      
      renderWithRouter(
        <RealTimeMigrationDashboard 
          migrationData={migrationData}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
          data-testid="migration-dashboard"
        />
      );
      
      // Dashboard should render
      expect(screen.getByTestId('migration-dashboard')).toBeInTheDocument();
      
      // Dashboard sections should be present
      expect(screen.getByText(/Migration ID: mig-123/i)).toBeInTheDocument();
      expect(screen.getByText(/Overall Progress/i)).toBeInTheDocument();
      expect(screen.getByText('55%')).toBeInTheDocument(); // overall progress
    });
    
    it('renders loading state when no migration data', () => {
      renderWithRouter(
        <RealTimeMigrationDashboard 
          migrationData={null}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
          data-testid="migration-dashboard"
        />
      );
      
      // Dashboard should render with loading state
      expect(screen.getByTestId('migration-dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Loading migration data/i)).toBeInTheDocument();
    });
  });
  
  describe('ResourceUsageMonitor Component', () => {
    it('renders resource usage charts', () => {
      renderWithTheme(
        <ResourceUsageMonitor 
          cpuUsage={45}
          memoryUsage={68}
          networkSent={1458000}
          networkReceived={9872000}
          data-testid="resource-monitor"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('resource-monitor')).toBeInTheDocument();
      
      // Resource metrics should be displayed
      expect(screen.getByText(/CPU Usage/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory Usage/i)).toBeInTheDocument();
      expect(screen.getByText(/Network Traffic/i)).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('68%')).toBeInTheDocument(); // Memory usage
    });
  });
});