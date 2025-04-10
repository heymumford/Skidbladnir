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
import { StatusWindow } from './StatusWindow';

// Mock clipboard API
beforeEach(() => {
  // Create a proper mock for the clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    },
    configurable: true,
  });
});

describe('StatusWindow', () => {
  const mockLogs = [
    'Starting migration process',
    'Connecting to Jira API',
    'Connection successful',
    'Retrieving test cases',
    'Received 253 test cases',
    'Processing test case TC-1001',
    'Processing test case TC-1002',
    'Processing test case TC-1003',
  ];
  
  it('displays the status window with logs', () => {
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    expect(screen.getByText('Migration Status')).toBeInTheDocument();
    expect(screen.getByText('Starting migration process')).toBeInTheDocument();
    expect(screen.getByText('Connecting to Jira API')).toBeInTheDocument();
  });

  it('shows the LCARS status header', () => {
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    expect(screen.getByText('Test Migration')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('allows saving logs to file', () => {
    // Create a mock anchor element that won't cause infinite recursion
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
    };
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    
    // Save the original document.createElement to restore it later
    const originalCreateElement = document.createElement;
    
    // Use a more careful mock implementation
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'a') {
        return mockAnchor;
      }
      // Use the original for everything else
      return originalCreateElement.call(document, tag);
    });
    
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockAnchor.download).toContain('migration_log');
    expect(mockAnchor.click).toHaveBeenCalled();
    
    // Restore the original document.createElement
    document.createElement = originalCreateElement;
  });

  it('copies logs to clipboard when copy button is clicked', () => {
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    fireEvent.click(screen.getByText('Copy'));
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockLogs.join('\n'));
  });

  it('allows changing display format when format button is clicked', () => {
    // Create a mock for Date.prototype.toLocaleTimeString
    const mockTime = '12:34:56';
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = jest.fn().mockReturnValue(mockTime);
    
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    // Open format dropdown
    fireEvent.click(screen.getByText('Format'));
    
    // Select a different format
    fireEvent.click(screen.getByText('Show Timestamps'));
    
    // The logs should now display with timestamps
    const timestampElements = screen.getAllByText(mockTime);
    expect(timestampElements).toHaveLength(mockLogs.length);
    
    // Restore the original function
    Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
  });

  it('allows searching log content', () => {
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    // Type in search field
    fireEvent.change(screen.getByPlaceholderText('Search logs...'), {
      target: { value: 'test case' },
    });
    
    // Only the logs with "test case" should be visible
    expect(screen.queryByText('Starting migration process')).not.toBeInTheDocument();
    expect(screen.queryByText('Processing test case TC-1001')).toBeInTheDocument();
    expect(screen.queryByText('Processing test case TC-1002')).toBeInTheDocument();
    expect(screen.queryByText('Processing test case TC-1003')).toBeInTheDocument();
  });

  it('allows changing layout configuration', () => {
    render(
      <StatusWindow 
        title="Migration Status"
        logs={mockLogs}
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    // Open layout dropdown
    fireEvent.click(screen.getByText('Layout'));
    
    // Select a different layout
    fireEvent.click(screen.getByText('Compact'));
    
    // The window should have compact class
    expect(screen.getByTestId('status-log-container')).toHaveClass('compact');
  });
});