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
import { ZephyrConfigPanel } from './ZephyrConfigPanel';
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

describe('ZephyrConfigPanel', () => {
  const mockOnSave = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders with default values', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Check if the component renders correctly
    expect(screen.getByText('Zephyr Scale Configuration')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /API Base URL/i })).toHaveValue('https://api.zephyrscale.smartbear.com/v2');
    expect(screen.getByLabelText(/API Key/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Project Key/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cloud Instance/i })).toBeChecked();
  });
  
  it('validates required fields on save', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Try to save with empty fields
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('API Key is required')).toBeInTheDocument();
      expect(screen.getByText('Project Key is required')).toBeInTheDocument();
    });
    
    // Ensure onSave was not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  
  it('validates URL format', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Enter invalid URL
    const baseUrlInput = screen.getByRole('textbox', { name: /API Base URL/i });
    fireEvent.change(baseUrlInput, { target: { value: 'invalid-url' } });
    
    // Try to save
    fireEvent.click(screen.getByText('Save'));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('API Base URL must be a valid URL starting with http:// or https://')).toBeInTheDocument();
    });
  });
  
  it('shows successful connection feedback', async () => {
    // Mock successful connection response
    (providerConnectionService.testConnection as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Successfully connected to Zephyr Scale',
      details: {
        version: '8.7.2',
        authenticatedUser: 'test-user@example.com',
        projectName: 'TEST',
        testCaseCount: 1234
      }
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/API Key/i, { selector: 'input' }), { target: { value: 'valid-api-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project Key/i }), { target: { value: 'TEST' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for success message and details
    await waitFor(() => {
      expect(screen.getByText('Connection Successful')).toBeInTheDocument();
      expect(screen.getByText('Successfully connected to Zephyr Scale')).toBeInTheDocument();
      expect(screen.getByText('8.7.2')).toBeInTheDocument();
      expect(screen.getByText('test-user@example.com')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
    
    // Connection status chip should show "Connected"
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
  
  it('shows failure connection feedback with detailed error', async () => {
    // Mock failed connection response
    (providerConnectionService.testConnection as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to connect to Zephyr Scale',
      details: {
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: 401
      }
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/API Key/i, { selector: 'input' }), { target: { value: 'invalid-api-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project Key/i }), { target: { value: 'TEST' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for failure message
    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to Zephyr Scale')).toBeInTheDocument();
    });
    
    // Connection status chip should show "Connection failed"
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });
  
  it('shows loading state during connection testing', async () => {
    // Mock slow connection response
    (providerConnectionService.testConnection as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Successfully connected to Zephyr Scale'
          });
        }, 100);
      });
    });
    
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/API Key/i, { selector: 'input' }), { target: { value: 'valid-api-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project Key/i }), { target: { value: 'TEST' } });
    
    // Test connection
    fireEvent.click(screen.getByText('Test Connection'));
    
    // Check for loading state
    expect(screen.getByText('Testing...')).toBeInTheDocument();
    
    // Wait for test to complete
    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });
  });
  
  it('toggles API key visibility', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Enter API key
    const apiKeyInput = screen.getByLabelText(/API Key/i, { selector: 'input' });
    fireEvent.change(apiKeyInput, { target: { value: 'secret-api-key' } });
    
    // Key should be hidden initially (password type)
    expect(apiKeyInput).toHaveAttribute('type', 'password');
    
    // Click visibility toggle button - find it by role
    const visibilityButtons = screen.getAllByRole('button');
    const visibilityButton = visibilityButtons.find(button => 
      button.querySelector('svg[data-testid="VisibilityIcon"]') || 
      button.querySelector('svg[data-testid="VisibilityOffIcon"]')
    );
    
    if (visibilityButton) {
      fireEvent.click(visibilityButton);
    }
    
    // Key should be visible now (text type)
    await waitFor(() => {
      expect(apiKeyInput).toHaveAttribute('type', 'text');
    });
  });
  
  it('saves connection settings when form is valid', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/API Key/i, { selector: 'input' }), { target: { value: 'valid-api-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Project Key/i }), { target: { value: 'TEST' } });
    
    // Save the form
    fireEvent.click(screen.getByText('Save'));
    
    // Check that onSave was called with correct values
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
        apiKey: 'valid-api-key',
        projectKey: 'TEST',
        cloudInstance: true
      })
    );
  });
  
  it('toggles advanced settings', async () => {
    render(
      <ThemeProvider theme={testTheme}>
        <ZephyrConfigPanel onSave={mockOnSave} />
      </ThemeProvider>
    );
    
    // Find the show/hide advanced settings button
    const buttons = screen.getAllByRole('button');
    const advancedButton = buttons.find(button => 
      button.textContent?.includes('Advanced Settings')
    );
    
    expect(advancedButton).toBeDefined();
    
    if (advancedButton) {
      // Before clicking, verify advanced section is not visible
      // by checking data- attribute or another reliable indicator
      expect(advancedButton.textContent).toContain('Show');
      
      // Click to show advanced settings
      fireEvent.click(advancedButton);
      
      // After clicking, button should change to "Hide"
      await waitFor(() => {
        expect(advancedButton.textContent).toContain('Hide');
      });
      
      // Click to hide advanced settings
      fireEvent.click(advancedButton);
      
      // Button should change back to "Show"
      await waitFor(() => {
        expect(advancedButton.textContent).toContain('Show');
      });
    }
  });
});