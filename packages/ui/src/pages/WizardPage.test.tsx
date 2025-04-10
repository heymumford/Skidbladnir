/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { lcarsThemeExtended } from '../theme';
import { WizardPage } from './WizardPage';

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock service
jest.mock('../services/ProviderConnectionService', () => ({
  ProviderConnectionService: jest.fn().mockImplementation(() => ({
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      message: 'Connection successful!',
      details: {
        version: '2.5.0',
        authenticatedUser: 'test@example.com',
        projectName: 'Test Project'
      }
    }),
    getConnectionFields: jest.fn().mockResolvedValue([
      { name: 'baseUrl', label: 'API Base URL', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'projectId', label: 'Project ID', type: 'text', required: true }
    ])
  })),
  providerConnectionService: {
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      message: 'Connection successful!',
      details: {
        version: '2.5.0',
        authenticatedUser: 'test@example.com',
        projectName: 'Test Project'
      }
    }),
    getConnectionFields: jest.fn().mockResolvedValue([
      { name: 'baseUrl', label: 'API Base URL', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'projectId', label: 'Project ID', type: 'text', required: true }
    ])
  }
}));

describe('WizardPage', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  it('renders the wizard page with title and info alert', () => {
    renderWithTheme(<WizardPage />);
    
    // Check for page title
    expect(screen.getByText('Zephyr → qTest Migration Wizard')).toBeInTheDocument();
    
    // Check for info alert
    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText(/This wizard will guide you/)).toBeInTheDocument();
  });
  
  it('renders the migration wizard component', () => {
    renderWithTheme(<WizardPage />);
    
    // Check for the step labels in the stepper
    expect(screen.getByText('Provider Selection')).toBeInTheDocument();
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Transformation Preview')).toBeInTheDocument();
    expect(screen.getByText('Execution Configuration')).toBeInTheDocument();
    expect(screen.getByText('Review & Start')).toBeInTheDocument();
    
    // Check for provider config panels in the first step
    expect(screen.getByText('Source Provider')).toBeInTheDocument();
    expect(screen.getByText('Target Provider')).toBeInTheDocument();
    
    // And buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});