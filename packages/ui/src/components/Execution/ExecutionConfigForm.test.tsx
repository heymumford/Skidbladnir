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
import { ExecutionConfigForm } from './ExecutionConfigForm';

describe('ExecutionConfigForm', () => {
  it('renders all configuration options', () => {
    render(
      <ExecutionConfigForm 
        onSubmit={jest.fn()}
      />
    );
    
    // Check that all form elements are rendered
    expect(screen.getByLabelText('Migration Scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Batch Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Concurrent Operations')).toBeInTheDocument();
    expect(screen.getByLabelText('Retry Attempts')).toBeInTheDocument();
    expect(screen.getByLabelText('Error Handling')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Attachments')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Test History')).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByText('Start Test Run')).toBeInTheDocument();
    expect(screen.getByText('Start Full Migration')).toBeInTheDocument();
  });
  
  it('submits form with default values', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ExecutionConfigForm 
        onSubmit={handleSubmit}
      />
    );
    
    // Click start test run button
    await user.click(screen.getByText('Start Test Run'));
    
    // Check that onSubmit was called with the correct values
    expect(handleSubmit).toHaveBeenCalledWith({
      scope: 'test',
      batchSize: 10,
      concurrentOperations: 5,
      retryAttempts: 3,
      errorHandling: 'stop',
      includeAttachments: true,
      includeHistory: false
    });
  });
  
  it('submits form with custom values', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ExecutionConfigForm 
        onSubmit={handleSubmit}
      />
    );
    
    // Set custom values
    await user.click(screen.getByLabelText('Migration Scope'));
    await user.click(screen.getByText('All Items'));
    
    await user.clear(screen.getByLabelText('Batch Size'));
    await user.type(screen.getByLabelText('Batch Size'), '20');
    
    await user.clear(screen.getByLabelText('Max Concurrent Operations'));
    await user.type(screen.getByLabelText('Max Concurrent Operations'), '8');
    
    await user.clear(screen.getByLabelText('Retry Attempts'));
    await user.type(screen.getByLabelText('Retry Attempts'), '5');
    
    await user.click(screen.getByLabelText('Error Handling'));
    await user.click(screen.getByText('Continue on Error'));
    
    // Toggle checkboxes
    await user.click(screen.getByLabelText('Include Attachments'));
    await user.click(screen.getByLabelText('Include Test History'));
    
    // Click start full migration button
    await user.click(screen.getByText('Start Full Migration'));
    
    // Check that onSubmit was called with the correct values
    expect(handleSubmit).toHaveBeenCalledWith({
      scope: 'all',
      batchSize: 20,
      concurrentOperations: 8,
      retryAttempts: 5,
      errorHandling: 'continue',
      includeAttachments: false,
      includeHistory: true
    });
  });
  
  it('validates batch size', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ExecutionConfigForm 
        onSubmit={handleSubmit}
      />
    );
    
    // Set invalid batch size
    await user.clear(screen.getByLabelText('Batch Size'));
    await user.type(screen.getByLabelText('Batch Size'), '-5');
    
    // Click start button
    await user.click(screen.getByText('Start Test Run'));
    
    // Check that validation error is displayed
    await waitFor(() => {
      expect(screen.getByText('Batch size must be a positive number')).toBeInTheDocument();
    });
    
    // Check that onSubmit was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });
  
  it('validates concurrent operations', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ExecutionConfigForm 
        onSubmit={handleSubmit}
      />
    );
    
    // Set invalid concurrent operations
    await user.clear(screen.getByLabelText('Max Concurrent Operations'));
    await user.type(screen.getByLabelText('Max Concurrent Operations'), '0');
    
    // Click start button
    await user.click(screen.getByText('Start Test Run'));
    
    // Check that validation error is displayed
    await waitFor(() => {
      expect(screen.getByText('Concurrent operations must be at least 1')).toBeInTheDocument();
    });
    
    // Check that onSubmit was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });
  
  it('displays migration preview information', async () => {
    const previewInfo = {
      estimatedItems: 1243,
      estimatedDuration: 45, // in minutes
      potentialIssues: [
        'Some attachments may exceed size limits',
        'Custom fields may require manual review'
      ]
    };
    
    render(
      <ExecutionConfigForm 
        onSubmit={jest.fn()}
        migrationPreview={previewInfo}
      />
    );
    
    // Check that preview information is displayed
    expect(screen.getByText('Estimated Items: 1,243')).toBeInTheDocument();
    expect(screen.getByText('Estimated Duration: ~45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Potential Issues: 2 warnings')).toBeInTheDocument();
    
    // Expand to see potential issues
    await userEvent.click(screen.getByText('View Details'));
    
    // Check that issues are displayed
    expect(screen.getByText('Some attachments may exceed size limits')).toBeInTheDocument();
    expect(screen.getByText('Custom fields may require manual review')).toBeInTheDocument();
  });
  
  it('handles disabled state', () => {
    render(
      <ExecutionConfigForm 
        onSubmit={jest.fn()}
        disabled={true}
      />
    );
    
    // Check that form elements are disabled
    expect(screen.getByLabelText('Migration Scope')).toBeDisabled();
    expect(screen.getByLabelText('Batch Size')).toBeDisabled();
    expect(screen.getByLabelText('Max Concurrent Operations')).toBeDisabled();
    expect(screen.getByLabelText('Retry Attempts')).toBeDisabled();
    expect(screen.getByLabelText('Error Handling')).toBeDisabled();
    expect(screen.getByLabelText('Include Attachments')).toBeDisabled();
    expect(screen.getByLabelText('Include Test History')).toBeDisabled();
    
    // Check buttons
    expect(screen.getByText('Start Test Run')).toBeDisabled();
    expect(screen.getByText('Start Full Migration')).toBeDisabled();
  });
});