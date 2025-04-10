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
import '@testing-library/jest-dom';
import { MigrationStatusCard } from './MigrationStatusCard';
import { MigrationStatus } from '../../types';

describe('MigrationStatusCard', () => {
  const createMockMigration = (overrides = {}): MigrationStatus => ({
    id: 'migration-1',
    status: 'running',
    progress: 42,
    source: 'Zephyr',
    target: 'qTest',
    startTime: '2025-01-01T12:00:00Z',
    totalItems: 100,
    processedItems: 42,
    successfulItems: 40,
    failedItems: 2,
    errorCount: 0,
    warningCount: 1,
    currentOperation: 'Processing test cases',
    ...overrides
  });

  it('renders basic migration information correctly', () => {
    const migration = createMockMigration();
    render(<MigrationStatusCard migration={migration} />);

    expect(screen.getByText('Migration migration-1')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('Progress: 42%')).toBeInTheDocument();
    expect(screen.getByText('42 / 100 items')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('shows proper status indicators for different states', () => {
    // Test completed state
    const completedMigration = createMockMigration({ 
      status: 'completed', 
      progress: 100, 
      processedItems: 100,
      endTime: '2025-01-01T13:00:00Z'
    });
    
    const { rerender } = render(<MigrationStatusCard migration={completedMigration} />);
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    
    // Test failed state
    const failedMigration = createMockMigration({ 
      status: 'failed', 
      progress: 70, 
      processedItems: 70,
      failedItems: 20,
      endTime: '2025-01-01T13:00:00Z' 
    });
    
    rerender(<MigrationStatusCard migration={failedMigration} />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Failed Items')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    
    // Test paused state
    const pausedMigration = createMockMigration({ 
      status: 'paused', 
      progress: 50, 
      processedItems: 50
    });
    
    rerender(<MigrationStatusCard migration={pausedMigration} />);
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
  });

  it('displays time information correctly', () => {
    // Test with start and end time
    const completedMigration = createMockMigration({ 
      status: 'completed', 
      progress: 100, 
      processedItems: 100,
      startTime: '2025-01-01T12:00:00Z',
      endTime: '2025-01-01T13:00:00Z'
    });
    
    render(<MigrationStatusCard migration={completedMigration} />);
    
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    
    // Note: Actual formatted times will depend on locale settings
    // We're just checking that the duration text exists
    expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument();
  });

  it('displays control buttons when showControls is true', () => {
    const runningMigration = createMockMigration();
    const onPause = jest.fn();
    const onCancel = jest.fn();
    const onViewDetails = jest.fn();
    
    render(
      <MigrationStatusCard 
        migration={runningMigration} 
        onPause={onPause}
        onCancel={onCancel}
        onViewDetails={onViewDetails}
        showControls={true}
      />
    );
    
    // Pause button should be visible for running migrations
    const pauseButton = screen.getByLabelText('Pause Migration');
    expect(pauseButton).toBeInTheDocument();
    
    // Cancel button should be visible for running migrations
    const cancelButton = screen.getByLabelText('Cancel Migration');
    expect(cancelButton).toBeInTheDocument();
    
    // View details button should be visible
    const viewDetailsButton = screen.getByLabelText('View Details');
    expect(viewDetailsButton).toBeInTheDocument();
  });

  it('hides control buttons when showControls is false', () => {
    const runningMigration = createMockMigration();
    const onPause = jest.fn();
    const onCancel = jest.fn();
    const onViewDetails = jest.fn();
    
    render(
      <MigrationStatusCard 
        migration={runningMigration} 
        onPause={onPause}
        onCancel={onCancel}
        onViewDetails={onViewDetails}
        showControls={false}
      />
    );
    
    // Control buttons should not be visible
    expect(screen.queryByLabelText('Pause Migration')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cancel Migration')).not.toBeInTheDocument();
    
    // View details button should still be visible as it's not part of the controls section
    expect(screen.getByLabelText('View Details')).toBeInTheDocument();
  });

  it('calls the appropriate callback when buttons are clicked', () => {
    const runningMigration = createMockMigration();
    const onPause = jest.fn();
    const onCancel = jest.fn();
    const onViewDetails = jest.fn();
    
    render(
      <MigrationStatusCard 
        migration={runningMigration} 
        onPause={onPause}
        onCancel={onCancel}
        onViewDetails={onViewDetails}
        showControls={true}
      />
    );
    
    // Click the pause button
    fireEvent.click(screen.getByLabelText('Pause Migration'));
    expect(onPause).toHaveBeenCalledWith(runningMigration.id);
    
    // Click the cancel button
    fireEvent.click(screen.getByLabelText('Cancel Migration'));
    expect(onCancel).toHaveBeenCalledWith(runningMigration.id);
    
    // Click the view details button
    fireEvent.click(screen.getByLabelText('View Details'));
    expect(onViewDetails).toHaveBeenCalledWith(runningMigration.id);
  });

  it('shows resume button for paused migrations', () => {
    const pausedMigration = createMockMigration({ status: 'paused' });
    const onResume = jest.fn();
    
    render(
      <MigrationStatusCard 
        migration={pausedMigration} 
        onResume={onResume}
        showControls={true}
      />
    );
    
    // Resume button should be visible for paused migrations
    const resumeButton = screen.getByLabelText('Resume Migration');
    expect(resumeButton).toBeInTheDocument();
    
    // Click the resume button
    fireEvent.click(resumeButton);
    expect(onResume).toHaveBeenCalledWith(pausedMigration.id);
  });
});