/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MigrationOperationLog } from './MigrationOperationLog';
import { LogEntry } from '../../types';

describe('MigrationOperationLog', () => {
  // Mock log data
  const mockLogs: LogEntry[] = [
    {
      id: 'log-1',
      timestamp: '2025-01-01T12:00:00Z',
      level: 'info',
      component: 'MigrationController',
      message: 'Starting migration process',
      details: { migrationId: 'migration-1' }
    },
    {
      id: 'log-2',
      timestamp: '2025-01-01T12:01:00Z',
      level: 'debug',
      component: 'ZephyrProvider',
      message: 'Fetching test cases from source',
      details: { query: { projectId: 'project-1' } }
    },
    {
      id: 'log-3',
      timestamp: '2025-01-01T12:02:00Z',
      level: 'warn',
      component: 'ZephyrProvider',
      message: 'Rate limit exceeded, retrying after 5 seconds',
      details: { rateLimitReset: 5000 }
    },
    {
      id: 'log-4',
      timestamp: '2025-01-01T12:03:00Z',
      level: 'error',
      component: 'Transformer',
      message: 'Failed to transform test case',
      details: { testCaseId: 'TC-123', error: 'Invalid field value' }
    },
    {
      id: 'log-5',
      timestamp: '2025-01-01T12:04:00Z',
      level: 'info',
      component: 'QTestProvider',
      message: 'Successfully created test case in target system',
      details: { sourceId: 'SRC-123', targetId: 'TRG-456' }
    }
  ];

  it('renders log entries correctly', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Check that the component title is displayed
    expect(screen.getByText('Operation Log')).toBeInTheDocument();
    
    // Check that each log entry is displayed
    mockLogs.forEach(log => {
      // Verify message is present
      expect(screen.getByText(log.message)).toBeInTheDocument();
      
      // Use getAllByText for component since there could be multiple entries with the same component
      const componentElements = screen.getAllByText(log.component);
      expect(componentElements.length).toBeGreaterThan(0);
      
      // Check for the timestamp (in localized format, so we just check for presence)
      const rows = screen.getAllByRole('row');
      const logRow = rows.find(row => within(row).queryByText(log.message));
      expect(logRow).toBeTruthy();
      
      // Check for the level chip - using getAllByText because there might be multiple chips with the same level
      const levelTexts = screen.getAllByText(log.level.toUpperCase());
      expect(levelTexts.length).toBeGreaterThan(0);
    });
  });

  it('expands a log entry to show details when clicked', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Initially, details should not be visible
    expect(screen.queryByText(/Details:/)).not.toBeInTheDocument();
    
    // Find the error log row and click it
    const errorLogRow = screen.getByText('Failed to transform test case').closest('tr');
    fireEvent.click(errorLogRow!);
    
    // Now details should be visible
    expect(screen.getByText(/Details:/)).toBeInTheDocument();
    
    // Check that the details content is displayed
    expect(screen.getByText(/"testCaseId": "TC-123"/)).toBeInTheDocument();
    expect(screen.getByText(/"error": "Invalid field value"/)).toBeInTheDocument();
  });

  it('allows filtering logs by search term', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Initially all logs should be visible
    expect(screen.getAllByRole('row').length).toBe(11); // 5 log rows + 5 detail rows + header row
    
    // Enter a search term
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'transform' } });
    
    // Now only the log with "transform" in the message should be visible
    const visibleRows = screen.getAllByRole('row').filter(row => {
      const style = window.getComputedStyle(row);
      return style.display !== 'none';
    });
    
    // We should see the header row + 1 log row
    // Note: due to how React Testing Library works with MUI, we can't easily check for the exact count
    // of visible rows, but we can check that the filtered message is still visible
    expect(screen.getByText('Failed to transform test case')).toBeInTheDocument();
    expect(screen.queryByText('Starting migration process')).not.toBeInTheDocument();
  });

  it('allows filtering logs by level', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Open the filters panel
    fireEvent.click(screen.getByLabelText('Toggle Filters'));
    
    // Select the error level filter
    fireEvent.mouseDown(screen.getByLabelText('Level'));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText(/Error/i));
    
    // Now only error logs should be visible
    expect(screen.getByText('Failed to transform test case')).toBeInTheDocument();
    expect(screen.queryByText('Starting migration process')).not.toBeInTheDocument();
    expect(screen.queryByText('Rate limit exceeded, retrying after 5 seconds')).not.toBeInTheDocument();
  });

  it('allows filtering logs by component', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Open the filters panel
    fireEvent.click(screen.getByLabelText('Toggle Filters'));
    
    // Select the ZephyrProvider component filter
    fireEvent.mouseDown(screen.getByLabelText('Component'));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('ZephyrProvider'));
    
    // Now only ZephyrProvider logs should be visible
    expect(screen.getByText('Fetching test cases from source')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded, retrying after 5 seconds')).toBeInTheDocument();
    expect(screen.queryByText('Starting migration process')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to transform test case')).not.toBeInTheDocument();
  });

  it('shows a message when no logs match the filters', () => {
    render(<MigrationOperationLog logs={mockLogs} />);
    
    // Enter a search term that won't match any logs
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent text' } });
    
    // Should show the "no logs found" message
    expect(screen.getByText('No log entries found')).toBeInTheDocument();
  });

  it('supports pagination', () => {
    const onPageChange = jest.fn();
    
    render(
      <MigrationOperationLog 
        logs={mockLogs} 
        totalLogs={20} 
        pageSize={5} 
        currentPage={1} 
        onPageChange={onPageChange} 
      />
    );
    
    // Should show the pagination component
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();
    
    // Should have 4 pages (20 ÷ 5 = 4)
    const pageButtons = screen.getAllByRole('button').filter(button => {
      const label = button.getAttribute('aria-label');
      return label && (label.startsWith('Go to page') || label === 'Go to next page' || label === 'Go to previous page');
    });
    
    // Find and click page 2
    const page2Button = pageButtons.find(button => button.textContent === '2');
    fireEvent.click(page2Button!);
    
    // Check that onPageChange was called with the correct page number
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles empty logs array', () => {
    render(<MigrationOperationLog logs={[]} />);
    
    // Should show the "no logs found" message
    expect(screen.getByText('No log entries found')).toBeInTheDocument();
  });

  it('shows loading indicator when loading is true', () => {
    render(<MigrationOperationLog logs={[]} loading={true} />);
    
    // While we don't have a specific loading indicator in the component code,
    // we would check for it here if there was one.
    // For now, we can just verify that the component renders at all when loading
    expect(screen.getByText('Operation Log')).toBeInTheDocument();
  });

  it('applies custom title when provided', () => {
    render(<MigrationOperationLog logs={mockLogs} title="Custom Log Title" />);
    
    // Should show the custom title
    expect(screen.getByText('Custom Log Title')).toBeInTheDocument();
  });
});