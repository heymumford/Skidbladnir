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
import { ProviderConfigPanel } from './ProviderConfigPanel';
import { Provider, ConnectionParams } from '../../types';

const mockProviders: Provider[] = [
  {
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
  },
  {
    id: 'qtest',
    name: 'qTest',
    version: '1.0.0',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  }
];

// Mock connection fields for each provider
const mockConnectionFields = {
  jira: [
    { name: 'url', label: 'API URL', type: 'text' as const, required: true },
    { name: 'apiKey', label: 'API Key', type: 'password' as const, required: true },
    { name: 'projectKey', label: 'Project Key', type: 'text' as const, required: false }
  ],
  qtest: [
    { name: 'url', label: 'Instance URL', type: 'text' as const, required: true },
    { name: 'apiKey', label: 'API Key', type: 'password' as const, required: true },
    { name: 'projectId', label: 'Project ID', type: 'number' as const, required: true }
  ]
};

// Mock API functions
const mockGetConnectionFields = jest.fn().mockImplementation((providerId: string) => {
  return Promise.resolve(mockConnectionFields[providerId] || []);
});

const mockTestConnection = jest.fn().mockImplementation((providerId: string, params: ConnectionParams) => {
  return Promise.resolve({
    success: true,
    message: 'Connection successful'
  });
});

const mockSaveConnection = jest.fn();

describe('ProviderConfigPanel', () => {
  it('renders provider selector', () => {
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
      />
    );
    
    // Check that provider selector is rendered
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
  });
  
  it('loads connection fields when provider is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
      />
    );
    
    // Select a provider
    await user.click(screen.getByLabelText('Provider'));
    await user.click(screen.getByText('Jira/Zephyr'));
    
    // Check that the getConnectionFields function was called
    expect(mockGetConnectionFields).toHaveBeenCalledWith('jira');
    
    // Check that connection form is rendered with fields
    await waitFor(() => {
      expect(screen.getByLabelText('API URL')).toBeInTheDocument();
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Key')).toBeInTheDocument();
    });
  });
  
  it('tests connection with form data', async () => {
    const user = userEvent.setup();
    
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
      />
    );
    
    // Select a provider
    await user.click(screen.getByLabelText('Provider'));
    await user.click(screen.getByText('Jira/Zephyr'));
    
    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('API URL')).toBeInTheDocument();
    });
    
    // Fill in the form
    await user.type(screen.getByLabelText('API URL'), 'https://example.atlassian.net');
    await user.type(screen.getByLabelText('API Key'), 'test-api-key');
    
    // Test connection
    await user.click(screen.getByText('Test Connection'));
    
    // Check that the testConnection function was called with correct data
    expect(mockTestConnection).toHaveBeenCalledWith('jira', {
      url: 'https://example.atlassian.net',
      apiKey: 'test-api-key',
      projectKey: ''
    });
    
    // Check that success message is displayed
    await waitFor(() => {
      expect(screen.getByText('Connection successful')).toBeInTheDocument();
    });
  });
  
  it('saves connection configuration', async () => {
    const user = userEvent.setup();
    
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
      />
    );
    
    // Select a provider
    await user.click(screen.getByLabelText('Provider'));
    await user.click(screen.getByText('Jira/Zephyr'));
    
    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('API URL')).toBeInTheDocument();
    });
    
    // Fill in the form
    await user.type(screen.getByLabelText('API URL'), 'https://example.atlassian.net');
    await user.type(screen.getByLabelText('API Key'), 'test-api-key');
    await user.type(screen.getByLabelText('Project Key'), 'TEST');
    
    // Save connection
    await user.click(screen.getByText('Save'));
    
    // Check that the saveConnection function was called with correct data
    expect(mockSaveConnection).toHaveBeenCalledWith('jira', {
      url: 'https://example.atlassian.net',
      apiKey: 'test-api-key',
      projectKey: 'TEST'
    });
  });
  
  it('loads existing connection if provided', async () => {
    const existingConfig = {
      providerId: 'jira',
      params: {
        url: 'https://existing.atlassian.net',
        apiKey: 'existing-key',
        projectKey: 'EXIST'
      }
    };
    
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
        existingConfig={existingConfig}
      />
    );
    
    // Check that provider is pre-selected
    expect(screen.getByLabelText('Provider')).toHaveTextContent('Jira/Zephyr');
    
    // Check that connection form is loaded with existing values
    await waitFor(() => {
      expect(screen.getByLabelText('API URL')).toHaveValue('https://existing.atlassian.net');
      expect(screen.getByLabelText('API Key')).toHaveValue('existing-key');
      expect(screen.getByLabelText('Project Key')).toHaveValue('EXIST');
    });
  });
  
  it('disables components when disabled prop is true', () => {
    render(
      <ProviderConfigPanel 
        title="Source Provider"
        providers={mockProviders}
        getConnectionFields={mockGetConnectionFields}
        testConnection={mockTestConnection}
        saveConnection={mockSaveConnection}
        disabled={true}
      />
    );
    
    // Check that provider selector is disabled
    expect(screen.getByLabelText('Provider')).toBeDisabled();
  });
});