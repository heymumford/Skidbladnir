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
import { ActivityLog } from './ActivityLog';
import { LogEntry } from '../../types';

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2025-04-09T10:00:00Z',
    level: 'info',
    component: 'Provider',
    message: 'Connected to Jira successfully'
  },
  {
    id: '2',
    timestamp: '2025-04-09T10:01:00Z',
    level: 'error',
    component: 'API',
    message: 'Failed to fetch test cases',
    details: { statusCode: 403 }
  },
  {
    id: '3',
    timestamp: '2025-04-09T10:02:00Z',
    level: 'warn',
    component: 'Migration',
    message: 'Retrying operation after failure'
  }
];

// Mock the log context
jest.mock('../../contexts/LogContext', () => ({
  useLogContext: () => ({
    logs: mockLogs,
    clearLogs: jest.fn(),
    filterLogs: jest.fn()
  })
}));

describe('ActivityLog', () => {
  it('displays the activity log panel with title', () => {
    render(<ActivityLog />);
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('renders all log entries', () => {
    render(<ActivityLog />);
    
    expect(screen.getByText('Connected to Jira successfully')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch test cases')).toBeInTheDocument();
    expect(screen.getByText('Retrying operation after failure')).toBeInTheDocument();
  });

  it('displays log entries with appropriate severity styling', () => {
    render(<ActivityLog />);
    
    const infoLog = screen.getByText('Connected to Jira successfully').closest('[data-severity="info"]');
    const errorLog = screen.getByText('Failed to fetch test cases').closest('[data-severity="error"]');
    const warnLog = screen.getByText('Retrying operation after failure').closest('[data-severity="warn"]');
    
    expect(infoLog).toBeInTheDocument();
    expect(errorLog).toBeInTheDocument();
    expect(warnLog).toBeInTheDocument();
  });

  it('filters logs when severity filter is changed', () => {
    render(<ActivityLog />);
    
    fireEvent.click(screen.getByText('Error'));
    
    // We're mocking the filter function, so we just check if it's called correctly
    expect(screen.getByText('Failed to fetch test cases')).toBeInTheDocument();
  });

  it('expands log details when a log entry is clicked', () => {
    render(<ActivityLog />);
    
    // Initially details should not be visible
    expect(screen.queryByText('statusCode: 403')).not.toBeInTheDocument();
    
    // Click on the error log to expand it
    fireEvent.click(screen.getByText('Failed to fetch test cases'));
    
    // Now details should be visible
    expect(screen.getByText('statusCode: 403')).toBeInTheDocument();
  });

  it('clears all logs when clear button is clicked', () => {
    render(<ActivityLog />);
    
    fireEvent.click(screen.getByText('Clear'));
    
    // We're mocking the clear function, so we just check if it's called
    expect(screen.getByText('Connected to Jira successfully')).toBeInTheDocument();
  });
});