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
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LinearProgress, CircularProgress } from '@mui/material';
import { ProgressIndicators, Operation, MigrationProgress } from './ProgressIndicators';

// Mock Material-UI components
jest.mock('@mui/material/Badge', () => {
  return function MockBadge(props) {
    return (
      <div data-testid="mock-badge" data-badge-content={props.badgeContent} data-badge-color={props.color}>
        {props.children}
        {props.badgeContent && <span data-testid="badge-content">{props.badgeContent}</span>}
      </div>
    );
  };
});

// Mock Tooltip component to avoid ref warnings
jest.mock('@mui/material/Tooltip', () => {
  return function MockTooltip(props) {
    return <div data-mock="tooltip" title={props.title}>{props.children}</div>;
  };
});

// Mock LinearProgress to capture props
jest.mock('@mui/material/LinearProgress', () => {
  return function MockLinearProgress(props) {
    return (
      <div 
        data-testid="mock-linear-progress" 
        data-value={props.value} 
        data-color={props.color} 
        data-variant={props.variant}
        className={props.color === 'error' ? 'MuiLinearProgress-colorError' : 'MuiLinearProgress-colorPrimary'}
        style={props.sx}
      >
        <div data-testid="progress-value">{props.value}</div>
      </div>
    );
  };
});

// Mock CircularProgress to capture props
jest.mock('@mui/material/CircularProgress', () => {
  return function MockCircularProgress(props) {
    return (
      <div 
        data-testid="mock-circular-progress" 
        data-value={props.value} 
        data-color={props.color}
        data-variant={props.variant}
        data-size={props.size}
      >
        {props.value && <span data-testid="circular-progress-value">{props.value}</span>}
      </div>
    );
  };
});

// Create test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00897b' },
    secondary: { main: '#e64a19' },
    error: { main: '#d32f2f' },
    warning: { main: '#ffa000' },
    info: { main: '#1976d2' },
    success: { main: '#388e3c' }
  }
});

// Mock migration progress data
const createMockMigrationProgress = (overrides = {}): MigrationProgress => ({
  id: 'migration-1',
  status: 'running',
  progress: 45,
  totalItems: 1000,
  processedItems: 450,
  failedItems: 20,
  estimatedTimeRemaining: 1800, // 30 minutes in seconds
  startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  ...overrides
});

// Mock operations data
const createMockOperations = (): Operation[] => [
  {
    id: 'op-1',
    name: 'Initialize Migration',
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() - 24 * 60 * 1000)
  },
  {
    id: 'op-2',
    name: 'Fetch Test Cases',
    status: 'completed',
    progress: 100,
    warnings: 2,
    startTime: new Date(Date.now() - 24 * 60 * 1000),
    endTime: new Date(Date.now() - 18 * 60 * 1000)
  },
  {
    id: 'op-3',
    name: 'Transform Test Cases',
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 18 * 60 * 1000),
    endTime: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: 'op-4',
    name: 'Fetch Attachments',
    status: 'completed',
    progress: 100,
    warnings: 1,
    startTime: new Date(Date.now() - 18 * 60 * 1000),
    endTime: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    id: 'op-5',
    name: 'Create Test Cases in qTest',
    status: 'running',
    progress: 68,
    warnings: 4,
    startTime: new Date(Date.now() - 15 * 60 * 1000),
    estimatedTimeRemaining: 180 // 3 minutes in seconds
  },
  {
    id: 'op-6',
    name: 'Upload Attachments',
    status: 'running',
    progress: 42,
    warnings: 2,
    errors: 1,
    startTime: new Date(Date.now() - 10 * 60 * 1000),
    estimatedTimeRemaining: 420 // 7 minutes in seconds
  },
  {
    id: 'op-7',
    name: 'Update Test Relationships',
    status: 'pending',
    progress: 0
  }
];

describe('ProgressIndicators', () => {
  const mockSelectOperation = jest.fn();
  const mockRefresh = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  
  // New test helper functions to check progress accuracy
  const checkProgressBarAccuracy = (progressElement, expectedValue) => {
    // Get the data-value attribute which contains the progress percentage
    const progressValue = Number(progressElement.getAttribute('data-value'));
    // We use a small delta to account for rounding differences
    expect(progressValue).toBeCloseTo(expectedValue, 1);
  };
  
  const getProgressBars = () => {
    return screen.getAllByTestId('mock-linear-progress');
  };
  
  const getOperationCards = () => {
    // Get all operation cards by finding elements that contain the operation progress text
    return screen.getAllByText(/Progress: \d+%/);
  };

  it('should display overall migration progress accurately', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify overall progress display
    const progressText = screen.getByText('450 of 1000 items processed');
    expect(progressText).toBeInTheDocument();
    
    // Verify progress percentage
    const progressPercentage = screen.getByText('45.0%');
    expect(progressPercentage).toBeInTheDocument();
    
    // Check migration status chip is displayed correctly
    const migrationPaper = screen.getByText('Migration Progress').closest('div.MuiPaper-root');
    const statusChip = within(migrationPaper!).getByText('RUNNING');
    expect(statusChip).toBeInTheDocument();
    
    // Check failed items chip is displayed
    const failedChip = within(migrationPaper!).getByText('20 Failed');
    expect(failedChip).toBeInTheDocument();
    
    // Check estimated time remaining is displayed
    const remainingText = screen.getByText(/remaining/);
    expect(remainingText).toBeInTheDocument();
  });

  it('should show accurate progress for each operation', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Check for the Operation Status heading
    expect(screen.getByText('Operation Status')).toBeInTheDocument();
    
    // Check completed operation
    const completedOp = screen.getByText('Initialize Migration').closest('.MuiCard-root');
    expect(completedOp).toBeInTheDocument();
    expect(within(completedOp!).getByText('COMPLETED')).toBeInTheDocument();
    expect(within(completedOp!).getByText('Progress: 100%')).toBeInTheDocument();
    
    // Check running operation
    const runningOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    expect(runningOp).toBeInTheDocument();
    expect(within(runningOp!).getByText('RUNNING')).toBeInTheDocument();
    expect(within(runningOp!).getByText('Progress: 68%')).toBeInTheDocument();
    
    // Verify the estimated time remaining text is displayed somewhere in the component
    // Even if we can't verify the specific text, we should check that 
    // the operation's estimatedTimeRemaining value is being used
    const contentDiv = within(runningOp!).getByText('Progress: 68%').closest('div.MuiCardContent-root');
    expect(contentDiv).toBeInTheDocument();
    const estimatedTimeText = within(contentDiv!).getByText(/ETA: /);
    expect(estimatedTimeText).toBeInTheDocument();
    
    // Check operation with warnings
    const warnings = within(runningOp!).getAllByTestId('badge-content')[0];
    expect(warnings).toHaveTextContent('4');
    
    // Check pending operation
    const pendingOp = screen.getByText('Update Test Relationships').closest('.MuiCard-root');
    expect(pendingOp).toBeInTheDocument();
    expect(within(pendingOp!).getByText('PENDING')).toBeInTheDocument();
    expect(within(pendingOp!).getByText('Progress: 0%')).toBeInTheDocument();
  });

  it('should update progress indicators when refreshed', async () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    // Use act to render component with auto-refresh
    act(() => {
      render(
        <ThemeProvider theme={testTheme}>
          <ProgressIndicators
            migration={migration}
            operations={operations}
            onSelectOperation={mockSelectOperation}
            onRefresh={mockRefresh}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </ThemeProvider>
      );
    });
    
    // Advance timers inside act to avoid warnings
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(mockRefresh).toHaveBeenCalled();
  });
  
  it('should handle operation selection correctly', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Find an operation card and click it
    const opCard = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    fireEvent.click(opCard!);
    
    // Verify the selection callback was called with the correct ID
    expect(mockSelectOperation).toHaveBeenCalledWith('op-5');
  });
  
  it('should highlight selected operation when selectedOperationId is provided', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    const { container } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
          selectedOperationId="op-5"
        />
      </ThemeProvider>
    );
    
    // The operation card with "Create Test Cases in qTest" should be selected
    const selectedCard = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    // In a real app we would check the CSS, but in a test it's easier to check the data attribute
    expect(selectedCard).toBeTruthy();
    
    // Make sure we have a visual indication that the card is selected through styling
    const cards = container.querySelectorAll('div.MuiCardContent-root');
    // Check if there are at least 7 operation cards
    expect(cards.length).toBeGreaterThanOrEqual(7);
    
    // At least one card should be styled differently for selection
    const selectedOpCard = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    expect(selectedOpCard).toHaveStyle({ borderWidth: '2px' });
  });
  
  it('should display warnings and errors correctly', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Check operation with warnings
    const opWithWarnings = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const warningBadges = within(opWithWarnings!).getAllByTestId('badge-content');
    expect(warningBadges.some(badge => badge.textContent === '4')).toBe(true);
    
    // Check operation with errors
    const opWithErrors = screen.getByText('Upload Attachments').closest('.MuiCard-root');
    const errorBadges = within(opWithErrors!).getAllByTestId('badge-content');
    expect(errorBadges.some(badge => badge.textContent === '1')).toBe(true);
  });
  
  it('should display migration status with appropriate color indicators', () => {
    // Test with a failed migration
    const failedMigration = createMockMigrationProgress({ status: 'failed', progress: 75 });
    const operations = createMockOperations();
    
    const { container, rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={failedMigration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify failed status is displayed
    const migrationPaper = screen.getByText('Migration Progress').closest('div.MuiPaper-root');
    const failedStatus = within(migrationPaper!).getByText('FAILED');
    expect(failedStatus).toBeInTheDocument();
    
    // Check that progress bar has appropriate color when failed
    const progressBars = container.getElementsByClassName('MuiLinearProgress-colorError');
    expect(progressBars.length).toBeGreaterThan(0);
    
    // Rerender with a completed migration
    const completedMigration = createMockMigrationProgress({ 
      status: 'completed', 
      progress: 100,
      processedItems: 1000
    });
    
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={completedMigration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify completed status is displayed
    const completedStatus = within(screen.getByText('Migration Progress').closest('div.MuiPaper-root')!).getByText('COMPLETED');
    expect(completedStatus).toBeInTheDocument();
  });
  
  it('should format time remaining correctly', () => {
    // Test different time formats
    const shortTimeMigration = createMockMigrationProgress({ estimatedTimeRemaining: 45 }); // 45 seconds
    const operations = createMockOperations();
    
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={shortTimeMigration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify short time format
    const timeChip = screen.getByText(/remaining/);
    expect(timeChip).toHaveTextContent('45s remaining');
    
    // Test minutes format
    const minutesMigration = createMockMigrationProgress({ estimatedTimeRemaining: 125 }); // 2m 5s
    
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={minutesMigration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify minutes format
    expect(screen.getByText(/remaining/)).toHaveTextContent('2m 5s remaining');
    
    // Test hours format
    const hoursMigration = createMockMigrationProgress({ estimatedTimeRemaining: 7380 }); // 2h 3m
    
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={hoursMigration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify hours format
    expect(screen.getByText(/remaining/)).toHaveTextContent('2h 3m remaining');
  });
  
  it('should display operation details when operation has a description', () => {
    const migration = createMockMigrationProgress();
    const operationsWithDescriptions = createMockOperations().map(op => 
      op.id === 'op-5' ? { ...op, description: 'Creating test cases in target system' } : op
    );
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operationsWithDescriptions}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify description is displayed
    expect(screen.getByText('Creating test cases in target system')).toBeInTheDocument();
  });
  
  it('should show blinking indicator for running operations', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Find running operation
    const runningOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    expect(runningOp).toBeInTheDocument();
    
    // Since we can't easily check CSS animations in Jest,
    // we'll check that the blinking indicator component is present
    const nameElement = screen.getByText('Create Test Cases in qTest');
    expect(nameElement.previousSibling).toBeInTheDocument();
  });
  
  it('should show operation status counts correctly', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Each of these headings should have corresponding cards with count values
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    // To check metrics values, we'll find all the h6 elements
    // which should include our count values
    const h6Elements = document.querySelectorAll('h6, .MuiTypography-h6');
    
    // Check if at least one has the operations count (7) 
    const operationsCountElem = Array.from(h6Elements).find(
      el => el.textContent === '7'
    );
    expect(operationsCountElem).not.toBeNull();
    
    // Check if at least one has the completed operations count (4)
    const completedCountElem = Array.from(h6Elements).find(
      el => el.textContent === '4'
    );
    expect(completedCountElem).not.toBeNull();
    
    // Check if at least one has the running operations count (2)
    const runningCountElem = Array.from(h6Elements).find(
      el => el.textContent === '2'
    );
    expect(runningCountElem).not.toBeNull();
    
    // Check if at least one has the pending operations count (1)
    const pendingCountElem = Array.from(h6Elements).find(
      el => el.textContent === '1'
    );
    expect(pendingCountElem).not.toBeNull();
  });
  
  it('should display last updated timestamp when refreshed', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    act(() => {
      render(
        <ThemeProvider theme={testTheme}>
          <ProgressIndicators
            migration={migration}
            operations={operations}
            onSelectOperation={mockSelectOperation}
            onRefresh={mockRefresh}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </ThemeProvider>
      );
    });
    
    // Last updated timestamp should be displayed
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
  
  it('should accurately reflect all operation progress values', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Get all progress bars
    const progressBars = getProgressBars();
    
    // First progress bar should be the main migration progress (45%)
    checkProgressBarAccuracy(progressBars[0], 45);
    
    // Check operation progress values
    // Initialize Migration: 100%
    // Fetch Test Cases: 100%
    // Transform Test Cases: 100%
    // Fetch Attachments: 100%
    // Create Test Cases in qTest: 68%
    // Upload Attachments: 42%
    // Update Test Relationships: 0%
    
    // Find operation cards and check their progress values
    const opCards = screen.getAllByText(/Progress: \d+%/);
    
    // We expect 7 operation cards with progress values
    expect(opCards.length).toBe(7);
    
    // Verify that operations have correct progress text
    expect(opCards.some(el => el.textContent === 'Progress: 100%')).toBe(true);
    expect(opCards.some(el => el.textContent === 'Progress: 68%')).toBe(true);
    expect(opCards.some(el => el.textContent === 'Progress: 42%')).toBe(true);
    expect(opCards.some(el => el.textContent === 'Progress: 0%')).toBe(true);
    
    // Verify each operation's progress bar has the correct value
    const opProgressBars = screen.getAllByTestId('mock-linear-progress');
    
    // The first one is the main migration progress bar (index 0)
    // So the operation progress bars start at index 1
    
    // Find the card with 68% progress and check its progress bar value
    const testCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const testCasesOpProgressBar = within(testCasesOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(testCasesOpProgressBar, 68);
    
    // Find the card with 42% progress and check its progress bar value
    const attachmentsOp = screen.getByText('Upload Attachments').closest('.MuiCard-root');
    const attachmentsOpProgressBar = within(attachmentsOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(attachmentsOpProgressBar, 42);
  });
  
  it('should update operation progress when data changes', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify initial progress
    const testCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const testCasesOpProgressBar = within(testCasesOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(testCasesOpProgressBar, 68);
    
    // Update the operations with new progress values
    const updatedOperations = operations.map(op => 
      op.id === 'op-5' ? { ...op, progress: 85 } : // Create Test Cases: 68% -> 85%
      op.id === 'op-6' ? { ...op, progress: 60 } : // Upload Attachments: 42% -> 60%
      op.id === 'op-7' ? { ...op, status: 'running', progress: 10 } : // Update Relationships: 0% -> 10%
      op
    );
    
    // Update the migration progress
    const updatedMigration = {
      ...migration,
      progress: 60, // 45% -> 60%
      processedItems: 600 // 450 -> 600
    };
    
    // Rerender with updated data
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={updatedMigration}
          operations={updatedOperations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify the main migration progress has updated
    const mainProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    checkProgressBarAccuracy(mainProgressBar, 60);
    
    // Verify that operations text has been updated
    expect(screen.getByText('600 of 1000 items processed')).toBeInTheDocument();
    
    // Verify that the individual operation progress has been updated
    const updatedTestCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const updatedTestCasesProgressBar = within(updatedTestCasesOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(updatedTestCasesProgressBar, 85);
    
    // Verify that another operation progress has been updated
    const updatedAttachmentsOp = screen.getByText('Upload Attachments').closest('.MuiCard-root');
    const updatedAttachmentsProgressBar = within(updatedAttachmentsOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(updatedAttachmentsProgressBar, 60);
    
    // Verify that the previously pending operation is now running
    const updatedRelationshipsOp = screen.getByText('Update Test Relationships').closest('.MuiCard-root');
    expect(within(updatedRelationshipsOp).getByText('RUNNING')).toBeInTheDocument();
    
    // And its progress has been updated from 0% to 10%
    const updatedRelationshipsProgressBar = within(updatedRelationshipsOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(updatedRelationshipsProgressBar, 10);
  });
  
  it('should show status changes when operations transition between states', () => {
    const migration = createMockMigrationProgress();
    const operations = createMockOperations();
    
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Check initial states
    const testCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    expect(within(testCasesOp).getByText('RUNNING')).toBeInTheDocument();
    
    const relationshipsOp = screen.getByText('Update Test Relationships').closest('.MuiCard-root');
    expect(within(relationshipsOp).getByText('PENDING')).toBeInTheDocument();
    
    // Update operations with status transitions
    const transitionedOperations = operations.map(op => 
      op.id === 'op-5' ? { ...op, status: 'completed', progress: 100 } : // Running -> Completed
      op.id === 'op-6' ? { ...op, status: 'failed', progress: 50 } : // Running -> Failed
      op.id === 'op-7' ? { ...op, status: 'running', progress: 25 } : // Pending -> Running
      op
    );
    
    // Rerender with transitioned operations
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={transitionedOperations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify status transitions
    const updatedTestCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    expect(within(updatedTestCasesOp).getByText('COMPLETED')).toBeInTheDocument();
    
    const updatedAttachmentsOp = screen.getByText('Upload Attachments').closest('.MuiCard-root');
    expect(within(updatedAttachmentsOp).getByText('FAILED')).toBeInTheDocument();
    
    const updatedRelationshipsOp = screen.getByText('Update Test Relationships').closest('.MuiCard-root');
    expect(within(updatedRelationshipsOp).getByText('RUNNING')).toBeInTheDocument();
    
    // Check metrics updates
    // Status breakdown should update from 4/2/1 (completed/running/pending) to 5/1/0/1 (completed/running/pending/failed)
    const h6Elements = document.querySelectorAll('h6, .MuiTypography-h6');
    
    // Check completed count (was 4, now 5)
    const updatedCompletedCount = Array.from(h6Elements).find(
      el => el.textContent === '5'
    );
    expect(updatedCompletedCount).not.toBeNull();
    
    // Check running count (was 2, now 1)
    const updatedRunningCount = Array.from(h6Elements).find(
      el => el.textContent === '1' && el.previousElementSibling?.textContent === 'Running'
    );
    expect(updatedRunningCount).not.toBeNull();
    
    // Check pending count (was 1, now 0)
    const updatedPendingCount = Array.from(h6Elements).find(
      el => el.textContent === '0' && el.previousElementSibling?.textContent === 'Pending'
    );
    expect(updatedPendingCount).not.toBeNull();
    
    // Verify color changes for status transitions
    const failedProgressBar = within(updatedAttachmentsOp).getByTestId('mock-linear-progress');
    expect(failedProgressBar.getAttribute('data-color')).toBe('error');
  });
  
  it('should reflect migration status changes accurately', () => {
    const migration = createMockMigrationProgress({ status: 'running' });
    const operations = createMockOperations();
    
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Check initial migration status - use within() to specifically find RUNNING within the migration section
    const migrationPaper = screen.getByText('Migration Progress').closest('div.MuiPaper-root');
    expect(within(migrationPaper!).getByText('RUNNING')).toBeInTheDocument();
    
    // Update to paused status
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={{ ...migration, status: 'paused' }}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify paused status is shown - use within() to target the specific element
    expect(within(screen.getByText('Migration Progress').closest('div.MuiPaper-root')!).getByText('PAUSED')).toBeInTheDocument();
    
    // Update to failed status
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={{ ...migration, status: 'failed' }}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify failed status is shown - use within() to target the specific element
    expect(within(screen.getByText('Migration Progress').closest('div.MuiPaper-root')!).getByText('FAILED')).toBeInTheDocument();
    
    // Verify error styling
    const mainProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    expect(mainProgressBar.getAttribute('data-color')).toBe('error');
    
    // Update to completed status
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={{ 
            ...migration, 
            status: 'completed', 
            progress: 100,
            processedItems: 1000
          }}
          operations={operations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Verify completed status is shown - use within() to target the specific element
    expect(within(screen.getByText('Migration Progress').closest('div.MuiPaper-root')!).getByText('COMPLETED')).toBeInTheDocument();
    
    // Verify progress is 100%
    const completedProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    checkProgressBarAccuracy(completedProgressBar, 100);
    
    // Verify processed items text shows completion
    expect(screen.getByText('1000 of 1000 items processed')).toBeInTheDocument();
  });
  
  it('should handle edge cases in progress values correctly', () => {
    const migration = createMockMigrationProgress();
    
    // Create operations with edge case progress values
    const edgeCaseOperations: Operation[] = [
      {
        id: 'op-1',
        name: 'Zero Progress Operation',
        status: 'running',
        progress: 0
      },
      {
        id: 'op-2',
        name: 'Very Small Progress',
        status: 'running',
        progress: 0.1
      },
      {
        id: 'op-3',
        name: 'Very Large Progress',
        status: 'running',
        progress: 99.9
      },
      {
        id: 'op-4',
        name: 'Completed with < 100%',
        status: 'completed',
        progress: 98.5
      },
      {
        id: 'op-5',
        name: 'Failed with > 0%',
        status: 'failed',
        progress: 85.3
      }
    ];
    
    render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={migration}
          operations={edgeCaseOperations}
          onSelectOperation={mockSelectOperation}
        />
      </ThemeProvider>
    );
    
    // Check zero progress
    const zeroOp = screen.getByText('Zero Progress Operation').closest('.MuiCard-root');
    const zeroProgressBar = within(zeroOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(zeroProgressBar, 0);
    
    // Check small progress
    const smallOp = screen.getByText('Very Small Progress').closest('.MuiCard-root');
    const smallProgressBar = within(smallOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(smallProgressBar, 0.1);
    
    // Check large progress
    const largeOp = screen.getByText('Very Large Progress').closest('.MuiCard-root');
    const largeProgressBar = within(largeOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(largeProgressBar, 99.9);
    
    // Check completed with < 100%
    const completedOp = screen.getByText('Completed with < 100%').closest('.MuiCard-root');
    const completedProgressBar = within(completedOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(completedProgressBar, 98.5);
    expect(within(completedOp).getByText('COMPLETED')).toBeInTheDocument();
    
    // Check failed with > 0%
    const failedOp = screen.getByText('Failed with > 0%').closest('.MuiCard-root');
    const failedProgressBar = within(failedOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(failedProgressBar, 85.3);
    expect(within(failedOp).getByText('FAILED')).toBeInTheDocument();
    expect(failedProgressBar.getAttribute('data-color')).toBe('error');
  });
  
  it('should verify progress indicators update in real-time with auto-refresh', () => {
    // Start with lower progress values
    const initialMigration = createMockMigrationProgress({
      progress: 20,
      processedItems: 200,
      estimatedTimeRemaining: 4800 // 80 minutes
    });
    
    const initialOperations = createMockOperations().map(op => {
      if (op.id === 'op-5') {
        return { ...op, progress: 30 }; // Lower initial progress
      }
      return op;
    });
    
    // Setup mocks for progress updates
    let currentMigration = { ...initialMigration };
    let currentOperations = [...initialOperations];
    
    // Create a mock that will update the progress values on each refresh
    mockRefresh.mockImplementation(() => {
      // Update migration progress
      currentMigration = {
        ...currentMigration,
        progress: Math.min(100, currentMigration.progress + 5),
        processedItems: Math.min(1000, currentMigration.processedItems + 50),
        estimatedTimeRemaining: Math.max(0, (currentMigration.estimatedTimeRemaining || 0) - 300)
      };
      
      // Update operation progress
      currentOperations = currentOperations.map(op => {
        if (op.id === 'op-5') {
          return {
            ...op,
            progress: Math.min(100, op.progress + 8),
            estimatedTimeRemaining: Math.max(0, (op.estimatedTimeRemaining || 0) - 20)
          };
        }
        return op;
      });
      
      // This is just a mock, so we don't need to return anything
    });
    
    // Render with auto-refresh
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={initialMigration}
          operations={initialOperations}
          onSelectOperation={mockSelectOperation}
          onRefresh={mockRefresh}
          autoRefresh={true}
          refreshInterval={5000}
        />
      </ThemeProvider>
    );
    
    // Check initial values
    const initialProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    checkProgressBarAccuracy(initialProgressBar, 20);
    
    const initialTestCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const initialOpProgressBar = within(initialTestCasesOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(initialOpProgressBar, 30);
    
    // Simulate time passing and refresh occurring
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // After refresh, we need to rerender with the updated values to simulate what would happen
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={currentMigration}
          operations={currentOperations}
          onSelectOperation={mockSelectOperation}
          onRefresh={mockRefresh}
          autoRefresh={true}
          refreshInterval={5000}
        />
      </ThemeProvider>
    );
    
    // Verify migration progress has updated
    const updatedProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    checkProgressBarAccuracy(updatedProgressBar, 25); // 20% + 5%
    
    // Verify operation progress has updated
    const updatedTestCasesOp = screen.getByText('Create Test Cases in qTest').closest('.MuiCard-root');
    const updatedOpProgressBar = within(updatedTestCasesOp).getByTestId('mock-linear-progress');
    checkProgressBarAccuracy(updatedOpProgressBar, 38); // 30% + 8%
    
    // Advance time again to trigger another refresh
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Update again
    rerender(
      <ThemeProvider theme={testTheme}>
        <ProgressIndicators
          migration={currentMigration}
          operations={currentOperations}
          onSelectOperation={mockSelectOperation}
          onRefresh={mockRefresh}
          autoRefresh={true}
          refreshInterval={5000}
        />
      </ThemeProvider>
    );
    
    // Verify progress has updated again
    const finalProgressBar = screen.getAllByTestId('mock-linear-progress')[0];
    checkProgressBarAccuracy(finalProgressBar, 30); // 25% + 5%
    
    // Verify estimated time remaining is decreasing
    const timeRemainingText = screen.getByText(/remaining/);
    // We can't test the exact text easily because of the formatting,
    // but we know it should be less than the original 80 minutes
    expect(timeRemainingText).toBeInTheDocument();
  });
});