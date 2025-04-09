import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

// Mock migration context
jest.mock('../../contexts/MigrationContext', () => ({
  useMigrationContext: () => ({
    currentMigration: {
      id: 'migration-123',
      status: 'running',
      progress: 42,
      totalItems: 100,
      processedItems: 42,
      failedItems: 3,
      startTime: '2025-04-09T10:00:00Z',
      estimatedRemainingTime: 600 // 10 minutes in seconds
    }
  })
}));

describe('StatusBar', () => {
  it('renders the status bar', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('displays current operation status when migration is active', () => {
    render(<StatusBar />);
    expect(screen.getByText(/Current Operation/i)).toBeInTheDocument();
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
  });

  it('shows progress information for active migration', () => {
    render(<StatusBar />);
    
    // Check for progress percentage
    expect(screen.getByText(/42%/i)).toBeInTheDocument();
    
    // Check for progress bar element
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '42');
  });

  it('displays error count for active migration', () => {
    render(<StatusBar />);
    expect(screen.getByText(/Errors: 3/i)).toBeInTheDocument();
  });

  it('shows estimated time remaining', () => {
    render(<StatusBar />);
    expect(screen.getByText(/Estimated: 10 min remaining/i)).toBeInTheDocument();
  });

  it('displays ready status when no migration is active', () => {
    // Override the mock for this specific test
    jest.spyOn(require('../../contexts/MigrationContext'), 'useMigrationContext')
      .mockImplementation(() => ({
        currentMigration: null
      }));
    
    render(<StatusBar />);
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();
  });
});