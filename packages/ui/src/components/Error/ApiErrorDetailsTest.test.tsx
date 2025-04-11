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
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ErrorDetails, RemediationSuggestion } from '../../services/MigrationService';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { ErrorRemediationPanel } from './ErrorRemediationPanel';

// Mock Migration Service
jest.mock('../../services/MigrationService', () => ({
  migrationService: {
    getErrorDetails: jest.fn().mockResolvedValue([]),
    getRemediationSuggestions: jest.fn().mockResolvedValue([]),
    executeRemediation: jest.fn().mockResolvedValue({})
  }
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useErrorAnalysis: jest.fn().mockReturnValue({
    loading: false,
    errorAnalysis: {},
    aiSuggestions: [],
    getSuggestedRemediations: jest.fn().mockReturnValue([]),
    getBestRemediation: jest.fn().mockReturnValue(null),
    getRelatedErrors: jest.fn().mockReturnValue([])
  })
}));

describe('API Error Details and Remediation Components', () => {
  // Create a theme for testing
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

  // Sample error objects for different error types
  const authError: ErrorDetails = {
    errorId: 'error-auth-1',
    timestamp: new Date().toISOString(),
    errorType: 'auth',
    component: 'QTestProvider',
    operation: 'CreateTestCase',
    message: 'Authentication token expired during API call',
    details: {
      statusCode: 401,
      message: 'Unauthorized',
      tokenExpiry: new Date(Date.now() - 3600000).toISOString()
    },
    context: {
      testCaseId: 'TC-123',
      apiEndpoint: '/api/v3/projects/1/test-cases'
    },
    stackTrace: 'Error: Authentication failed\n    at AuthClient.authenticate (/app/auth.js:42:23)\n    at APIClient.request (/app/api.js:87:12)'
  };

  const networkError: ErrorDetails = {
    errorId: 'error-network-1',
    timestamp: new Date().toISOString(),
    errorType: 'network',
    component: 'ZephyrProvider',
    operation: 'FetchTestCases',
    message: 'Network timeout during API request',
    details: {
      statusCode: 504,
      message: 'Gateway Timeout',
      retryAfter: 30
    },
    context: {
      requestUrl: 'https://api.zephyrscale.example.com/v2/testcases',
      requestMethod: 'GET',
      timeoutMs: 30000
    }
  };

  const validationError: ErrorDetails = {
    errorId: 'error-validation-1',
    timestamp: new Date().toISOString(),
    errorType: 'validation',
    component: 'DataTransformer',
    operation: 'TransformTestCaseData',
    message: 'Validation error in test case data',
    details: {
      fields: [
        'priority',
        'steps'
      ],
      violations: [
        'Field "priority" is required',
        'Field "steps" contains invalid formatting'
      ]
    },
    context: {
      testCaseId: 'TC-456',
      sourceFormat: 'Zephyr',
      targetFormat: 'qTest'
    }
  };

  const systemError: ErrorDetails = {
    errorId: 'error-system-1',
    timestamp: new Date().toISOString(),
    errorType: 'system',
    component: 'QTestProvider',
    operation: 'UpdateTestCase',
    message: 'API server returned 500 internal error',
    details: {
      statusCode: 500,
      message: 'Internal Server Error',
      requestId: 'req-xyz-123'
    },
    context: {
      apiEndpoint: '/api/v3/projects/1/test-cases/123',
      requestMethod: 'PUT',
      responseBody: '{"error":"Internal server error","code":"SERVER_ERROR"}'
    },
    stackTrace: 'Error: Request failed with status code 500\n    at APIClient.request (/app/api.js:112:23)'
  };

  const resourceError: ErrorDetails = {
    errorId: 'error-resource-1',
    timestamp: new Date().toISOString(),
    errorType: 'resource',
    component: 'AttachmentService',
    operation: 'UploadAttachment',
    message: 'API resource quota exceeded during upload',
    details: {
      statusCode: 429,
      message: 'Too Many Requests',
      quota: {
        limit: '50MB',
        used: '48MB',
        reset: '3600'
      }
    },
    context: {
      apiEndpoint: '/api/v3/projects/1/attachments',
      requestMethod: 'POST',
      fileSize: '5MB',
      fileName: 'test_results.pdf'
    }
  };

  // Remediation suggestions for different error types
  const authRemediations: RemediationSuggestion[] = [
    {
      id: 'remedy-auth-1',
      errorType: 'auth',
      title: 'Refresh Authentication Token',
      description: 'Your authentication token may have expired. Refreshing the token might resolve this issue.',
      steps: [
        'Click the "Refresh Token" button below',
        'Verify your credentials if prompted',
        'Retry the operation'
      ],
      automated: true,
      actionName: 'Refresh Token'
    },
    {
      id: 'remedy-auth-2',
      errorType: 'auth',
      title: 'Update API Credentials',
      description: 'Your API credentials may be incorrect or outdated.',
      steps: [
        'Go to Provider Configuration page',
        'Update your API token or credentials',
        'Test the connection',
        'Retry the operation'
      ]
    }
  ];

  const networkRemediations: RemediationSuggestion[] = [
    {
      id: 'remedy-network-1',
      errorType: 'network',
      title: 'Retry Operation with Exponential Backoff',
      description: 'The server may be temporarily overloaded. Retry with increasing wait times.',
      steps: [
        'Click the "Retry with Backoff" button below',
        'Wait for the system to attempt reconnection',
        'Check the status after retries complete'
      ],
      automated: true,
      actionName: 'Retry with Backoff'
    },
    {
      id: 'remedy-network-2',
      errorType: 'network',
      title: 'Check Network Configuration',
      description: 'Your network may be blocking requests to the API endpoint.',
      steps: [
        'Verify network connectivity to the API endpoint',
        'Check for firewall or proxy restrictions',
        'Contact your network administrator if needed'
      ]
    }
  ];

  describe('ErrorDetailPanel', () => {
    it('should display basic error information for authentication errors', () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorDetailPanel error={authError} />
        </ThemeProvider>
      );
      expect(screen.getByText('Authentication token expired during API call')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      cleanup();
    });
    
    it('should display basic error information for network errors', () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorDetailPanel error={networkError} />
        </ThemeProvider>
      );
      expect(screen.getByText('Network timeout during API request')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      cleanup();
    });
    
    it('should display basic error information for validation errors', () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorDetailPanel error={validationError} />
        </ThemeProvider>
      );
      expect(screen.getByText('Validation error in test case data')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
      cleanup();
    });
    
    it('should display basic error information for system errors', () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorDetailPanel error={systemError} />
        </ThemeProvider>
      );
      expect(screen.getByText('API server returned 500 internal error')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
      cleanup();
    });
    
    it('should display basic error information for resource errors', () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorDetailPanel error={resourceError} />
        </ThemeProvider>
      );
      expect(screen.getByText('API resource quota exceeded during upload')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      cleanup();
    });
  });

  describe('ErrorRemediationPanel', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup mock implementations
      const migrationService = require('../../services/MigrationService').migrationService;
      migrationService.getErrorDetails.mockImplementation((migrationId) => {
        return Promise.resolve([authError, networkError, validationError, systemError, resourceError]);
      });
      
      migrationService.getRemediationSuggestions.mockImplementation((error) => {
        if (error.errorType === 'auth') {
          return Promise.resolve(authRemediations);
        } else if (error.errorType === 'network') {
          return Promise.resolve(networkRemediations);
        }
        return Promise.resolve([]);
      });
    });

    it('should provide appropriate remediation options for authentication errors', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel
            migrationId="migration-123"
            errorId={authError.errorId}
          />
        </ThemeProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Should show error details
      expect(screen.getByText('Authentication token expired during API call')).toBeInTheDocument();
      
      // Navigate to remediation tab
      const remediationTab = screen.getByRole('tab', { name: /Remediation Options/i });
      fireEvent.click(remediationTab);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Available Remediation Options')).toBeInTheDocument();
      });
      
      // Check auth-specific remediation options
      expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      expect(screen.getByText('Update API Credentials')).toBeInTheDocument();
      
      // Check automated vs manual indicators
      expect(screen.getByText('Automated Fix')).toBeInTheDocument();
      expect(screen.getByText('Manual Fix Required')).toBeInTheDocument();
      
      // Check for action button availability
      expect(screen.getByRole('button', { name: 'Refresh Token' })).toBeInTheDocument();
    });

    it('should provide appropriate remediation options for network errors', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel
            migrationId="migration-123"
            errorId={networkError.errorId}
          />
        </ThemeProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Should show error details
      expect(screen.getByText('Network timeout during API request')).toBeInTheDocument();
      
      // Navigate to remediation tab
      const remediationTab = screen.getByRole('tab', { name: /Remediation Options/i });
      fireEvent.click(remediationTab);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Available Remediation Options')).toBeInTheDocument();
      });
      
      // Check network-specific remediation options
      expect(screen.getByText('Retry Operation with Exponential Backoff')).toBeInTheDocument();
      expect(screen.getByText('Check Network Configuration')).toBeInTheDocument();
      
      // Check for detailed steps
      const showDetailsButton = screen.getAllByText('Show Details')[0];
      fireEvent.click(showDetailsButton);
      
      expect(screen.getByText('Remediation Steps:')).toBeInTheDocument();
      expect(screen.getByText('Click the "Retry with Backoff" button below')).toBeInTheDocument();
      expect(screen.getByText('Wait for the system to attempt reconnection')).toBeInTheDocument();
      expect(screen.getByText('Check the status after retries complete')).toBeInTheDocument();
    });

    it('should call onRemediate when remediation action is clicked', async () => {
      const mockOnRemediate = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel
            migrationId="migration-123"
            errorId={authError.errorId}
            onRemediate={mockOnRemediate}
          />
        </ThemeProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to remediation tab
      const remediationTab = screen.getByRole('tab', { name: /Remediation Options/i });
      fireEvent.click(remediationTab);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // First expand the details to see the action button
      const showDetailsButton = screen.getAllByText('Show Details')[0];
      fireEvent.click(showDetailsButton);
      
      // Click remediation action button
      const actionButton = screen.getByRole('button', { name: 'Refresh Token' });
      fireEvent.click(actionButton);
      
      // Should call onRemediate with correct parameters
      expect(mockOnRemediate).toHaveBeenCalledWith('error-auth-1', 'remedy-auth-1');
    });

    it('should display error message when remediation fails', async () => {
      const mockOnRemediate = jest.fn().mockRejectedValue(new Error('Remediation failed'));
      
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel
            migrationId="migration-123"
            errorId={authError.errorId}
            onRemediate={mockOnRemediate}
          />
        </ThemeProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to remediation tab
      const remediationTab = screen.getByRole('tab', { name: /Remediation Options/i });
      fireEvent.click(remediationTab);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // Click remediation action button
      const actionButton = screen.getByRole('button', { name: 'Refresh Token' });
      fireEvent.click(actionButton);
      
      // Error message should be shown
      await waitFor(() => {
        expect(screen.getByText('Failed to apply remediation. Please try again or select a different option.')).toBeInTheDocument();
      });
    });
  });
});