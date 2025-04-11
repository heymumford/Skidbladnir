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
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { lcarsThemeExtended } from '../theme';
import { EnhancedProviderConfigPage } from './EnhancedProviderConfigPage';
import { providerService } from '../services';

// Mock the provider service
jest.mock('../services', () => ({
  providerService: {
    getProviders: jest.fn(),
    getConnectionConfig: jest.fn(),
    saveConnection: jest.fn()
  }
}));

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock provider data
const mockProviders = [
  {
    id: 'zephyr',
    name: 'Zephyr Scale',
    version: '1.0.0',
    icon: 'zephyr.png',
    type: 'source',
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
    icon: 'qtest.png',
    type: 'target',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  }
];

// Mock Zephyr connection config
const mockZephyrConfig = {
  baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
  apiKey: 'test-api-key',
  projectKey: 'TEST',
  cloudInstance: true
};

// Mock qTest connection config
const mockQTestConfig = {
  baseUrl: 'https://example.qtestnet.com',
  apiToken: 'test-api-token',
  projectId: '12345'
};

describe('EnhancedProviderConfigPage', () => {
  beforeEach(() => {
    // Set up the mocks
    (providerService.getProviders as jest.Mock).mockResolvedValue(mockProviders);
    (providerService.getConnectionConfig as jest.Mock).mockImplementation((providerId) => {
      if (providerId === 'zephyr') {
        return Promise.resolve(mockZephyrConfig);
      }
      if (providerId === 'qtest') {
        return Promise.resolve(mockQTestConfig);
      }
      return Promise.resolve(null);
    });
    (providerService.saveConnection as jest.Mock).mockResolvedValue({ id: 'conn-123' });
    
    mockNavigate.mockClear();
  });
  
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={lcarsThemeExtended}>
          <EnhancedProviderConfigPage />
        </ThemeProvider>
      </BrowserRouter>
    );
  };
  
  it('renders the page title and breadcrumbs', async () => {
    renderPage();
    
    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Provider Configuration')).toBeInTheDocument();
    });
    
    // Check for breadcrumbs
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Check for subtitle
    expect(screen.getByText(/Configure source and target providers/)).toBeInTheDocument();
  });
  
  it('loads and displays provider cards', async () => {
    renderPage();
    
    // Wait for providers to load
    await waitFor(() => {
      expect(screen.getByText('Zephyr Scale')).toBeInTheDocument();
      expect(screen.getByText('qTest')).toBeInTheDocument();
    });
    
    // Check for correct versioning
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    
    // Check for configuration status chips
    expect(screen.getAllByText('Configured').length).toBe(2);
  });
  
  it('renders configuration tabs', async () => {
    renderPage();
    
    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Zephyr Scale (Source)')).toBeInTheDocument();
    });
    
    expect(screen.getByText('qTest Manager (Target)')).toBeInTheDocument();
    
    // Check that the Zephyr tab is active by default
    await waitFor(() => {
      expect(screen.getByText('Zephyr Scale Configuration')).toBeInTheDocument();
    });
    
    // Switch to qTest tab
    fireEvent.click(screen.getByText('qTest Manager (Target)'));
    
    // Check that qTest config is shown
    await waitFor(() => {
      expect(screen.getByText('qTest Manager Configuration')).toBeInTheDocument();
    });
  });
  
  it('enables continue button when both configurations are present', async () => {
    renderPage();
    
    // Wait for providers to load and continue button to be enabled
    await waitFor(() => {
      const continueButton = screen.getByText('Continue to Field Mapping');
      expect(continueButton).not.toBeDisabled();
    });
    
    // Click continue button
    fireEvent.click(screen.getByText('Continue to Field Mapping'));
    
    // Check that navigate was called with the right path
    expect(mockNavigate).toHaveBeenCalledWith('/mapping');
  });
  
  it('navigates to correct tab when configure button is clicked', async () => {
    // Configure qTest connection to be missing
    (providerService.getConnectionConfig as jest.Mock).mockImplementation((providerId) => {
      if (providerId === 'zephyr') {
        return Promise.resolve(mockZephyrConfig);
      }
      return Promise.resolve(null);
    });
    
    renderPage();
    
    // Wait for providers to load
    await waitFor(() => {
      expect(screen.getByText('Zephyr Scale')).toBeInTheDocument();
    });
    
    // Now, even though the Zephyr tab is active, clicking the Configure button for qTest
    // should switch to the qTest tab
    const configureButtons = screen.getAllByText('Configure');
    fireEvent.click(configureButtons[0]); // Assuming the qTest Configure button is first
    
    // Check that qTest config is shown
    await waitFor(() => {
      expect(screen.getByText('qTest Manager Configuration')).toBeInTheDocument();
    });
  });
  
  it('shows error alert when provider loading fails', async () => {
    // Set up the mock to fail
    (providerService.getProviders as jest.Mock).mockRejectedValue(new Error('Failed to load providers'));
    
    renderPage();
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading providers: Failed to load providers/)).toBeInTheDocument();
    });
  });
});