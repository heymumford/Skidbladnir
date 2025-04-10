/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionPage } from './ExecutionPage';

// Mock the timer functions
jest.useFakeTimers();

describe('ExecutionPage', () => {
  it('renders the execution page with stepper and form', () => {
    render(<ExecutionPage />);
    
    // Check page title and stepper
    expect(screen.getByText('Test Case Migration')).toBeInTheDocument();
    expect(screen.getByText('Provider Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Migration Execution')).toBeInTheDocument();
    
    // Check form elements
    expect(screen.getByLabelText('Migration Scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Batch Size')).toBeInTheDocument();
    expect(screen.getByText('Start Test Run')).toBeInTheDocument();
    expect(screen.getByText('Start Full Migration')).toBeInTheDocument();
  });

  it('shows progress when starting a test run', async () => {
    render(<ExecutionPage />);
    const user = userEvent.setup({ delay: null }); // Turn off delay for testing
    
    // Start test run
    await user.click(screen.getByText('Start Test Run'));
    
    // Check that progress is shown
    await waitFor(() => {
      expect(screen.getByText('Migration in progress...')).toBeInTheDocument();
    });
    
    // Fast-forward timers
    jest.advanceTimersByTime(3000);
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Test migration completed successfully.')).toBeInTheDocument();
      expect(screen.getByText('Start New Migration')).toBeInTheDocument();
    });
  });

  it('shows progressive updates during full migration', async () => {
    render(<ExecutionPage />);
    const user = userEvent.setup({ delay: null });
    
    // Start full migration
    await user.click(screen.getByText('Start Full Migration'));
    
    // Check initial progress
    expect(screen.getByText('Migration in progress...')).toBeInTheDocument();
    
    // Advance timer to trigger first progress update
    jest.advanceTimersByTime(1500);
    
    // Check for updated progress
    await waitFor(() => {
      expect(screen.getByText('0 of 1,243 items processed (10%)')).toBeInTheDocument();
    });
    
    // Advance timer to trigger second progress update
    jest.advanceTimersByTime(1500);
    
    // Check for updated progress
    await waitFor(() => {
      expect(screen.getByText('248 of 1,243 items processed (20%)')).toBeInTheDocument();
    });
    
    // Fast-forward to completion
    jest.advanceTimersByTime(15000);
    
    // Check completion message
    await waitFor(() => {
      expect(screen.getByText('Migration completed successfully.')).toBeInTheDocument();
    });
  });

  it('allows starting new migration after completion', async () => {
    render(<ExecutionPage />);
    const user = userEvent.setup({ delay: null });
    
    // Start test run
    await user.click(screen.getByText('Start Test Run'));
    
    // Fast-forward timers to completion
    jest.advanceTimersByTime(3000);
    
    // Verify success state
    await waitFor(() => {
      expect(screen.getByText('Test migration completed successfully.')).toBeInTheDocument();
    });
    
    // Start new migration
    await user.click(screen.getByText('Start New Migration'));
    
    // Verify that we're back to the initial state
    await waitFor(() => {
      expect(screen.queryByText('Test migration completed successfully.')).not.toBeInTheDocument();
      expect(screen.getByText('Start Test Run')).toBeEnabled();
      expect(screen.getByText('Start Full Migration')).toBeEnabled();
    });
  });
});