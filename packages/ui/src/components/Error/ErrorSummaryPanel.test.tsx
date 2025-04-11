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
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ErrorSummaryPanel } from './ErrorSummaryPanel';
import { migrationService } from '../../services/MigrationService';
import { Feature } from '../../../../packages/common/src/utils/feature-flags';

// Mock the MigrationService
jest.mock('../../services/MigrationService', () => {
  const originalModule = jest.requireActual('../../services/MigrationService');
  return {
    ...originalModule,
    migrationService: {
      getErrorDetails: jest.fn()
    }
  };
});

// Mock the FeatureFlagContext
jest.mock('../../context/FeatureFlagContext', () => ({
  useFeature: jest.fn().mockImplementation((feature) => {
    // Default all features to enabled for tests
    return true;
  }),
  FeatureFlagProvider: ({ children }) => children
}));

describe('ErrorSummaryPanel', () => {
  // Create a test theme
  const theme = createTheme({
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

  const mockErrors = [
    {
      errorId: 'error-123',
      timestamp: new Date().toISOString(),
      errorType: 'network',
      component: 'ZephyrProvider',
      operation: 'FetchTestCase',
      message: 'Network timeout during operation',
      details: {
        statusCode: 408,
        message: 'Request timeout'
      },
      context: {
        testCaseId: 'TC-456',
        apiEndpoint: '/api/v3/testcases/456',
        requestMethod: 'GET'
      }
    },
    {
      errorId: 'error-124',
      timestamp: new Date().toISOString(),
      errorType: 'auth',
      component: 'QTestProvider',
      operation: 'UploadTestCase',
      message: 'Authentication token expired',
      details: {
        statusCode: 401,
        message: 'Unauthorized'
      },
      context: {
        testCaseId: 'TC-789',
        apiEndpoint: '/api/v3/testcases'
      }
    },
    {
      errorId: 'error-125',
      timestamp: new Date().toISOString(),
      errorType: 'validation',
      component: 'DataTransformer',
      operation: 'TransformTestCaseData',
      message: 'Validation error in test case data',
      details: {
        fields: ['priority', 'steps'],
        violations: ['Field "priority" is required']
      },
      context: {
        testCaseId: 'TC-101',
        sourceFormat: 'Zephyr',
        targetFormat: 'qTest'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockErrors);
    
    // Reset mock implementation for useFeature
    const useFeatureMock = require('../../context/FeatureFlagContext').useFeature;
    if (useFeatureMock.mockReset) {
      useFeatureMock.mockReset();
      useFeatureMock.mockImplementation(() => true);
    }
  });

  it('should render loading state initially', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123" 
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error summary after loading', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123" 
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check for error count display
    expect(screen.getByText('3 errors')).toBeInTheDocument();
    
    // Expand error panel if collapsed
    try {
      const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
      if (expandButton) {
        fireEvent.click(expandButton);
      }
    } catch (e) {
      // Panel might already be expanded
    }

    // Verify all errors are displayed
    expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
    expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
    
    // Should display component and operation information
    expect(screen.getByText(/ZephyrProvider/i)).toBeInTheDocument();
    expect(screen.getByText(/FetchTestCase/i)).toBeInTheDocument();
    expect(screen.getByText(/QTestProvider/i)).toBeInTheDocument();
    expect(screen.getByText(/UploadTestCase/i)).toBeInTheDocument();
  });

  it('should expand panel when autoExpand is true', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123"
          autoExpand={true}
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
      expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
      expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
    });
    
    // Should display error category filters when expanded
    expect(screen.getByText('Network (1)')).toBeInTheDocument();
    expect(screen.getByText('Authentication (1)')).toBeInTheDocument();
    expect(screen.getByText('Validation (1)')).toBeInTheDocument();
  });

  it('should call onErrorSelect when error is clicked', async () => {
    const mockOnErrorSelect = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123"
          autoExpand={true}
          onErrorSelect={mockOnErrorSelect}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Click on first error
    fireEvent.click(screen.getByText('Network timeout during operation'));
    
    // Should call onErrorSelect with the correct error ID
    expect(mockOnErrorSelect).toHaveBeenCalledWith('error-123');
    
    // Reset mock
    mockOnErrorSelect.mockClear();
    
    // Click on "Fix" button directly
    const fixButton = screen.getAllByText('Fix')[0];
    fireEvent.click(fixButton);
    
    // Should also call onErrorSelect with the correct error ID
    expect(mockOnErrorSelect).toHaveBeenCalledWith('error-123');
  });

  it('should filter errors by category when category is selected', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123"
          autoExpand={true}
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
      expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
      expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
    });

    // Find and click on the authentication filter
    fireEvent.click(screen.getByText('Authentication (1)'));

    // Should only show auth error
    expect(screen.queryByText('Network timeout during operation')).not.toBeInTheDocument();
    expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
    expect(screen.queryByText('Validation error in test case data')).not.toBeInTheDocument();
    
    // Click on filter again to clear it
    fireEvent.click(screen.getByText('Authentication (1)'));
    
    // All errors should be visible again
    expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
    expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
    
    // Filter by a different category
    fireEvent.click(screen.getByText('Validation (1)'));
    
    // Should only show validation error
    expect(screen.queryByText('Network timeout during operation')).not.toBeInTheDocument();
    expect(screen.queryByText('Authentication token expired')).not.toBeInTheDocument();
    expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
  });

  it('should show success message when no errors are found', async () => {
    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue([]);
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel 
          migrationId="migration-123"
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No errors detected in this migration.')).toBeInTheDocument();
    });
  });
  
  it('should limit the number of displayed errors based on maxErrors prop', async () => {
    // Create more mock errors
    const manyMockErrors = [
      ...mockErrors,
      {
        errorId: 'error-126',
        timestamp: new Date().toISOString(),
        errorType: 'system',
        component: 'API',
        operation: 'ServerRequest',
        message: 'System error during API request',
        details: { statusCode: 500 },
        context: {}
      },
      {
        errorId: 'error-127',
        timestamp: new Date().toISOString(),
        errorType: 'resource',
        component: 'Storage',
        operation: 'SaveAttachment',
        message: 'Resource limit exceeded',
        details: { limit: '50MB' },
        context: {}
      }
    ];

    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(manyMockErrors);

    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel
          migrationId="migration-123"
          onErrorSelect={() => {}}
          maxErrors={3} // Limit to 3 errors
          autoExpand={true} // Start expanded
        />
      </ThemeProvider>
    );

    // Wait for errors to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should show that there are 5 errors total
    expect(screen.getByText('5 errors')).toBeInTheDocument();

    // Should only display the first 3 errors
    expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
    expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();

    // The additional errors should not be visible
    expect(screen.queryByText('System error during API request')).not.toBeInTheDocument();
    expect(screen.queryByText('Resource limit exceeded')).not.toBeInTheDocument();

    // Should show a "Show more" button
    expect(screen.getByText('Show 2 more errors')).toBeInTheDocument();
  });

  it('should conditionally render features based on feature flags', async () => {
    // Mock feature flags to disable error remediation
    const useFeatureMock = require('../../context/FeatureFlagContext').useFeature;
    useFeatureMock.mockImplementation((feature) => {
      if (feature === Feature.ERROR_REMEDIATION) {
        return false;
      }
      if (feature === Feature.AI_ASSISTANCE) {
        return false;
      }
      return true;
    });

    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel
          migrationId="migration-123"
          onErrorSelect={() => {}}
          autoExpand={true} // Start expanded
        />
      </ThemeProvider>
    );

    // Wait for errors to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should show feature disabled notification
    expect(screen.getByText('Error Remediation feature is disabled. Enable it to access remediation tools.')).toBeInTheDocument();
    
    // Fix buttons should be disabled
    const fixButtons = screen.getAllByText('Fix');
    fixButtons.forEach(button => {
      expect(button.closest('[disabled]')).not.toBeNull();
    });
    
    // AI badge should not be visible
    expect(screen.queryByText('AI-Powered')).not.toBeInTheDocument();
  });

  it('should display color-coded error categories in filter', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel
          migrationId="migration-123"
          onErrorSelect={() => {}}
          autoExpand={true} // Start expanded
        />
      </ThemeProvider>
    );

    // Wait for errors to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Check filter chips are present with correct counts
    expect(screen.getByText('Network (1)')).toBeInTheDocument();
    expect(screen.getByText('Authentication (1)')).toBeInTheDocument();
    expect(screen.getByText('Validation (1)')).toBeInTheDocument();

    // Error cards should have colored left borders
    const errorCards = screen.getAllByRole('button')
      .filter(el => el.closest('.MuiCard-root'));
    
    expect(errorCards.length).toBe(3); // Should have 3 error cards
    
    // Should show formatted timestamps
    const timeElements = screen.getAllByText(/\d+:\d+/i);
    expect(timeElements.length).toBeGreaterThan(0);
  });
  
  it('should show AI badge when AI assistance is enabled', async () => {
    // Explicitly enable AI assistance
    const useFeatureMock = require('../../context/FeatureFlagContext').useFeature;
    useFeatureMock.mockImplementation((feature) => {
      if (feature === Feature.AI_ASSISTANCE) {
        return true;
      }
      return true;
    });

    render(
      <ThemeProvider theme={theme}>
        <ErrorSummaryPanel
          migrationId="migration-123"
          onErrorSelect={() => {}}
        />
      </ThemeProvider>
    );

    // Wait for errors to load and expand panel
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // AI badge should be visible
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
    
    // Fix buttons should show AI icon
    try {
      const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
      if (expandButton) {
        fireEvent.click(expandButton);
      }
    } catch (e) {
      // Panel might already be expanded
    }
    
    // Each error card should have a Fix button
    const fixButtons = screen.getAllByText('Fix');
    expect(fixButtons.length).toBe(mockErrors.length);
  });
});