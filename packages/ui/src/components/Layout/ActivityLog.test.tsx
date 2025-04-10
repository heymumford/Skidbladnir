import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ActivityLog, { LogEntry } from './ActivityLog';

describe('ActivityLog', () => {
  const mockEntries: LogEntry[] = [
    { timestamp: '2025-01-01T12:00:00Z', level: 'info', message: 'Test info message', source: 'Test' },
    { timestamp: '2025-01-01T12:01:00Z', level: 'warn', message: 'Test warning message' },
    { timestamp: '2025-01-01T12:02:00Z', level: 'error', message: 'Test error message', source: 'Error Source' }
  ];

  it('renders without crashing', () => {
    render(<ActivityLog />);
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('No log entries to display')).toBeInTheDocument();
  });

  it('renders log entries correctly', () => {
    render(<ActivityLog entries={mockEntries} />);
    
    expect(screen.getByText('Test info message')).toBeInTheDocument();
    expect(screen.getByText('Test warning message')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Error Source')).toBeInTheDocument();
  });

  it('clears all logs when clear button is clicked', () => {
    render(<ActivityLog entries={mockEntries} />);
    
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('No log entries to display')).toBeInTheDocument();
    expect(screen.queryByText('Test info message')).not.toBeInTheDocument();
  });

  it('calls onClear callback when provided', () => {
    const mockOnClear = jest.fn();
    render(<ActivityLog entries={mockEntries} onClear={mockOnClear} />);
    
    fireEvent.click(screen.getByText('Clear'));
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
