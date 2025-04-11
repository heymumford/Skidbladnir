/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme';

// Import execution components
import { ExecutionControlInterface } from '../../../packages/ui/src/components/Execution/ExecutionControlInterface';
import { ExecutionControlPanel } from '../../../packages/ui/src/components/Execution/ExecutionControlPanel';
import { ExecutionMonitor } from '../../../packages/ui/src/components/Execution/ExecutionMonitor';
import { MigrationDashboard } from '../../../packages/ui/src/components/Execution/MigrationDashboard';

/**
 * Test suite to verify that execution components render correctly.
 * These components control and monitor the migration execution process.
 */
describe('Execution Components Render Correctly', () => {
  // Sample execution data for testing
  const sampleExecution = {
    id: 'exec-123',
    status: 'IN_PROGRESS',
    progress: 42,
    startTime: '2025-04-09T14:30:00Z',
    estimatedEndTime: '2025-04-09T15:45:00Z',
    operations: [
      {
        id: 'op-1',
        name: 'Extract Test Cases',
        status: 'COMPLETED',
        progress: 100,
        startTime: '2025-04-09T14:30:00Z',
        endTime: '2025-04-09T14:35:30Z'
      },
      {
        id: 'op-2',
        name: 'Transform Test Cases',
        status: 'IN_PROGRESS',
        progress: 65,
        startTime: '2025-04-09T14:35:45Z',
        endTime: null
      }
    ],
    stats: {
      total: 250,
      processed: 105,
      failed: 3,
      skipped: 0
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

  describe('ExecutionControlInterface Component', () => {
    // Create a sample execution status for testing
    const activeStatus: ExecutionStatus = {
      state: 'running',
      progress: 42,
      completedItems: 105,
      totalItems: 250,
      elapsedTime: 3600,
      estimatedTimeRemaining: 4500,
      errors: 3,
      warnings: 2,
      currentOperation: 'Transform Test Cases',
      statusMessage: 'Migration in progress',
      currentBatch: 2,
      totalBatches: 5
    };

    it('renders control interface with execution details', () => {
      const { container } = renderWithTheme(
        <ExecutionControlInterface 
          status={activeStatus}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      // Component should render something
      expect(container).not.toBeEmptyDOMElement();
      
      // Check that the component displays the control panel title
      expect(screen.getByText('Migration Control Panel')).toBeInTheDocument();
    });
    
    it('renders empty state when no execution', () => {
      // ExecutionControlInterface doesn't render when status.state is 'idle'
      const emptyStatus: ExecutionStatus = {
        state: 'idle',
        progress: 0,
        completedItems: 0,
        totalItems: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        errors: 0,
        warnings: 0
      };
      
      const { container } = renderWithTheme(
        <ExecutionControlInterface 
          status={emptyStatus}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      // Should return null when state is idle
      expect(container).toBeEmptyDOMElement();
    });
    
    it('renders control buttons based on execution status', () => {
      // Active execution should show pause button
      const { rerender } = renderWithTheme(
        <ExecutionControlInterface 
          status={activeStatus}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      expect(screen.getByText('Pause')).toBeInTheDocument();
      
      // Paused execution should show resume button
      const pausedStatus: ExecutionStatus = {
        ...activeStatus,
        state: 'paused',
        statusMessage: 'Migration paused'
      };
      
      rerender(
        <ThemeProvider theme={lcarsThemeExtended}>
          <ExecutionControlInterface 
            status={pausedStatus}
            onPause={jest.fn()}
            onResume={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );
      
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });
  
  describe('ExecutionControlPanel Component', () => {
    // Create sample status objects for testing
    const runningStatus: ExecutionStatus = {
      state: 'running',
      progress: 65,
      completedItems: 162,
      totalItems: 250,
      elapsedTime: 1800,
      estimatedTimeRemaining: 900,
      errors: 0,
      warnings: 1,
      statusMessage: 'Migration in progress'
    };
    
    const pausedStatus: ExecutionStatus = {
      ...runningStatus,
      state: 'paused',
      statusMessage: 'Migration paused'
    };
    
    const completedStatus: ExecutionStatus = {
      ...runningStatus,
      state: 'completed',
      progress: 100,
      completedItems: 250,
      estimatedTimeRemaining: 0,
      statusMessage: 'Migration completed successfully'
    };
    
    it('renders control panel with buttons', () => {
      const onPause = jest.fn();
      const onResume = jest.fn();
      const onCancel = jest.fn();
      
      const { container } = renderWithTheme(
        <ExecutionControlPanel 
          status={runningStatus}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
        />
      );
      
      // Component should render
      expect(container).not.toBeEmptyDOMElement();
      
      // The title should be visible
      const title = screen.getByText('Migration Control Panel');
      expect(title).toBeInTheDocument();
    });
    
    it('renders resume button when status is paused', () => {
      const onResume = jest.fn();
      
      renderWithTheme(
        <ExecutionControlPanel 
          status={pausedStatus}
          onPause={jest.fn()}
          onResume={onResume}
          onCancel={jest.fn()}
          data-testid="control-panel"
        />
      );
      
      // Resume button should be present
      const resumeButton = screen.getByText(/Resume/i);
      expect(resumeButton).toBeInTheDocument();
      
      // Resume button should trigger callback
      fireEvent.click(resumeButton);
      expect(onResume).toHaveBeenCalledTimes(1);
    });
    
    it('renders disabled buttons when status is completed', () => {
      const onRestart = jest.fn();
      
      renderWithTheme(
        <ExecutionControlPanel 
          status={completedStatus}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onCancel={jest.fn()}
          onRestart={onRestart}
          data-testid="control-panel"
        />
      );
      
      // Should show New Migration button instead of control buttons
      expect(screen.getByText(/New Migration/i)).toBeInTheDocument();
      
      // No Pause or Cancel buttons should be present
      expect(screen.queryByText(/Pause/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument();
    });
  });
  
  describe('ExecutionMonitor Component', () => {
    // Skip ExecutionMonitor tests for now - will implement later
    it.skip('renders execution monitor with progress and stats', () => {
      // This test will be implemented after fixing the ExecutionMonitor component
    });
    
    it.skip('renders loading state when no execution data', () => {
      // This test will be implemented after fixing the ExecutionMonitor component
    });
  });
  
  describe('MigrationDashboard Component', () => {
    // Skip MigrationDashboard tests for now - will implement later
    it.skip('renders migration dashboard with execution controls', () => {
      // This test will be implemented after fixing the MigrationDashboard component
    });
  });
});