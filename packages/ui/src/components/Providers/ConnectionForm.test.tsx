/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionForm } from './ConnectionForm';
import { Provider, ConnectionParams } from '../../types';

const mockProvider: Provider = {
  id: 'jira',
  name: 'Jira/Zephyr',
  version: '1.0.0',
  capabilities: {
    supportsTestCases: true,
    supportsTestCycles: true,
    supportsTestExecutions: true,
    supportsAttachments: true,
    supportsCustomFields: true
  }
};

// Mock connection fields definition for the provider
const mockConnectionFields = [
  { 
    name: 'url', 
    label: 'API URL', 
    type: 'text', 
    required: true,
    placeholder: 'https://your-instance.atlassian.net',
    helpText: 'The URL of your Jira instance'
  },
  { 
    name: 'apiKey', 
    label: 'API Key', 
    type: 'password', 
    required: true,
    placeholder: 'Enter your API key',
    helpText: 'The API key for authentication'
  },
  { 
    name: 'projectKey', 
    label: 'Project Key', 
    type: 'text', 
    required: false,
    placeholder: 'e.g. TEST',
    helpText: 'The key of the project to use (optional)'
  }
];

describe('ConnectionForm', () => {
  it('renders connection fields for the provider', () => {
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={jest.fn()}
        onTest={jest.fn()}
      />
    );
    
    // Check that all fields are rendered
    expect(screen.getByLabelText('API URL')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Key')).toBeInTheDocument();
    
    // Check that help text is displayed
    expect(screen.getByText('The URL of your Jira instance')).toBeInTheDocument();
    
    // Check that buttons are rendered
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
  
  it('validates required fields on submit', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={handleSubmit}
        onTest={jest.fn()}
      />
    );
    
    // Try to submit without filling required fields
    await user.click(screen.getByText('Save'));
    
    // Check that validation errors are displayed
    expect(screen.getByText('API URL is required')).toBeInTheDocument();
    expect(screen.getByText('API Key is required')).toBeInTheDocument();
    
    // Check that submit was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });
  
  it('submits form with valid data', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={handleSubmit}
        onTest={jest.fn()}
      />
    );
    
    // Fill in the form
    await user.type(screen.getByLabelText('API URL'), 'https://example.atlassian.net');
    await user.type(screen.getByLabelText('API Key'), 'test-api-key');
    await user.type(screen.getByLabelText('Project Key'), 'TEST');
    
    // Submit the form
    await user.click(screen.getByText('Save'));
    
    // Check that submit was called with correct data
    expect(handleSubmit).toHaveBeenCalledWith({
      url: 'https://example.atlassian.net',
      apiKey: 'test-api-key',
      projectKey: 'TEST'
    });
  });
  
  it('tests connection with form data', async () => {
    const handleTest = jest.fn().mockResolvedValue({ success: true, message: 'Connection successful' });
    const user = userEvent.setup();
    
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={jest.fn()}
        onTest={handleTest}
      />
    );
    
    // Fill in the form
    await user.type(screen.getByLabelText('API URL'), 'https://example.atlassian.net');
    await user.type(screen.getByLabelText('API Key'), 'test-api-key');
    
    // Test connection
    await user.click(screen.getByText('Test Connection'));
    
    // Check that test was called with correct data
    expect(handleTest).toHaveBeenCalledWith({
      url: 'https://example.atlassian.net',
      apiKey: 'test-api-key',
      projectKey: ''
    });
    
    // Check that success message is displayed
    await waitFor(() => {
      expect(screen.getByText('Connection successful')).toBeInTheDocument();
    });
  });
  
  it('displays connection test error', async () => {
    const handleTest = jest.fn().mockResolvedValue({ success: false, message: 'Connection failed: Invalid API key' });
    const user = userEvent.setup();
    
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={jest.fn()}
        onTest={handleTest}
      />
    );
    
    // Fill in the form
    await user.type(screen.getByLabelText('API URL'), 'https://example.atlassian.net');
    await user.type(screen.getByLabelText('API Key'), 'invalid-key');
    
    // Test connection
    await user.click(screen.getByText('Test Connection'));
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Connection failed: Invalid API key')).toBeInTheDocument();
    });
  });
  
  it('populates form with existing connection params', () => {
    const existingParams: ConnectionParams = {
      url: 'https://existing.atlassian.net',
      apiKey: 'existing-key',
      projectKey: 'EXIST'
    };
    
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={jest.fn()}
        onTest={jest.fn()}
        existingParams={existingParams}
      />
    );
    
    // Check that fields are populated with existing values
    expect(screen.getByLabelText('API URL')).toHaveValue('https://existing.atlassian.net');
    expect(screen.getByLabelText('API Key')).toHaveValue('existing-key');
    expect(screen.getByLabelText('Project Key')).toHaveValue('EXIST');
  });
  
  it('disables form when disabled prop is true', () => {
    render(
      <ConnectionForm 
        provider={mockProvider} 
        connectionFields={mockConnectionFields}
        onSubmit={jest.fn()}
        onTest={jest.fn()}
        disabled={true}
      />
    );
    
    // Check that all fields and buttons are disabled
    expect(screen.getByLabelText('API URL')).toBeDisabled();
    expect(screen.getByLabelText('API Key')).toBeDisabled();
    expect(screen.getByLabelText('Project Key')).toBeDisabled();
    expect(screen.getByText('Test Connection')).toBeDisabled();
    expect(screen.getByText('Save')).toBeDisabled();
  });
});