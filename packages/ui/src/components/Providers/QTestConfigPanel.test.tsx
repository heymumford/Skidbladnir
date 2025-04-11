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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QTestConfigPanel } from './QTestConfigPanel';
import { providerConnectionService } from '../../services';

// Mock the services
jest.mock('../../services', () => ({
  providerConnectionService: {
    testConnection: jest.fn()
  }
}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve())
  }
});

// Create a test theme with necessary palette values
const testTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00897b',
      light: '#4ebaaa',
      dark: '#005b4f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5c6bc0',
      light: '#8e99f3',
      dark: '#26418f',
      contrastText: '#ffffff',
    },
    info: {
      main: '#29b6f6',
      light: '#73e8ff',
      dark: '#0086c3',
      contrastText: '#000000',
    },
    success: {
      main: '#66bb6a',
      light: '#98ee99',
      dark: '#338a3e',
      contrastText: '#000000',
    },
    warning: {
      main: '#ffa726',
      light: '#ffd95b',
      dark: '#c77800',
      contrastText: '#000000',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d',
      contrastText: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#d5d5d5',
      A200: '#aaaaaa',
      A400: '#303030',
      A700: '#616161',
      main: '#9e9e9e',
    }
  }
});

describe('QTestConfigPanel', () => {
  const mockOnSave = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders with default values', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Check if the component renders correctly
    expect(screen.getByText('qTest Manager Configuration')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /qTest Instance URL/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/API Token/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Project ID/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Use Automation Token/i })).not.toBeChecked();
  });
  
  it('validates required fields on save', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Try to save with empty fields
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('qTest Instance URL is required')).toBeInTheDocument();
      expect(screen.getByText('API Token is required')).toBeInTheDocument();
      expect(screen.getByText('Project ID is required')).toBeInTheDocument();
    });
    
    // Ensure onSave was not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  
  it('validates URL format', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Enter invalid URL
    const baseUrlInput = screen.getByRole('textbox', { name: /qTest Instance URL/i });
    fireEvent.change(baseUrlInput, { target: { value: 'invalid-url' } });
    
    // Try to save
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('Instance URL must be a valid URL starting with http:// or https://')).toBeInTheDocument();
    });
  });
  
  it('validates project ID format', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Enter invalid project ID (non-numeric)
    const projectIdInput = screen.getByRole('textbox', { name: /Project ID/i });
    fireEvent.change(projectIdInput, { target: { value: 'invalid-id' } });
    
    // Enter other required fields
    fireEvent.change(screen.getByRole('textbox', { name: /qTest Instance URL/i }), { target: { value: 'https://example.qtestnet.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i, { selector: 'input' }), { target: { value: 'valid-token' } });
    
    // Try to save
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('Project ID must be a number')).toBeInTheDocument();
    });
  });
  
  it('shows successful connection feedback with detailed info', async () => {
    // Mock successful connection response
    (providerConnectionService.testConnection as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Successfully connected to qTest Manager',
      details: {
        version: '10.5.3',
        authenticatedUser: 'test-user@example.com',
        projectName: 'Sample Project',
        testCaseCount: 1234,
        modules: 42
      }
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByRole('textbox', { name: /qTest Instance URL/i }), { target: { value: 'https://example.qtestnet.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i, { selector: 'input' }), { target: { value: 'valid-token' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project ID/i }), { target: { value: '12345' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for success message and details
    await waitFor(() => {
      expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      expect(screen.getByText('Successfully connected to qTest Manager')).toBeInTheDocument();
      expect(screen.getByText('10.5.3')).toBeInTheDocument();
      expect(screen.getByText('test-user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sample Project')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    
    // Connection status chip should show "Connected"
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
  
  it('shows failure connection feedback with error details', async () => {
    // Mock failed connection response
    (providerConnectionService.testConnection as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to connect to qTest Manager',
      details: {
        errorCode: 'INVALID_TOKEN',
        statusCode: 401
      }
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByRole('textbox', { name: /qTest Instance URL/i }), { target: { value: 'https://example.qtestnet.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i, { selector: 'input' }), { target: { value: 'invalid-token' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project ID/i }), { target: { value: '12345' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for failure message
    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to qTest Manager')).toBeInTheDocument();
    });
    
    // Connection status chip should show "Connection failed"
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });
  
  it('shows impersonation user field when automation token is enabled', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Impersonation user field should not be visible initially
    expect(screen.queryByText('Impersonation User')).not.toBeInTheDocument();
    
    // Enable automation token
    const automationToggle = screen.getByRole('checkbox', { name: /Use Automation Token/i });
    fireEvent.click(automationToggle);
    
    // Impersonation user field should now be visible
    await waitFor(() => {
      expect(screen.getByText('Impersonation User')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /User Email/i })).toBeInTheDocument();
    });
    
    // Try to save without impersonation user
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('Impersonation user is required when using automation token')).toBeInTheDocument();
    });
  });
  
  it('shows loading state during connection testing', async () => {
    // Mock slow connection response
    (providerConnectionService.testConnection as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Successfully connected to qTest Manager'
          });
        }, 100);
      });
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByRole('textbox', { name: /qTest Instance URL/i }), { target: { value: 'https://example.qtestnet.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i, { selector: 'input' }), { target: { value: 'valid-token' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project ID/i }), { target: { value: '12345' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for loading state
    expect(screen.getByText('Testing...')).toBeInTheDocument();
    
    // Wait for test to complete
    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });
  });
  
  it('saves connection settings when form is valid', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <QTestConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByRole('textbox', { name: /qTest Instance URL/i }), { target: { value: 'https://example.qtestnet.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i, { selector: 'input' }), { target: { value: 'valid-token' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project ID/i }), { target: { value: '12345' } });
    
    // Save the form
    fireEvent.click(screen.getByText('Save'));
    
    // Check that onSave was called with correct values
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://example.qtestnet.com',
        apiToken: 'valid-token',
        projectId: '12345',
        automationTokenEnabled: false
      })
    );
  });
});