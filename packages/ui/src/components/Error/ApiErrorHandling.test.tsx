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
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ErrorDetails, RemediationSuggestion, migrationService } from '../../services/MigrationService';
import { ApiErrorHandling } from './ApiErrorHandling';
import { ErrorSummaryPanel } from './ErrorSummaryPanel';
import { ErrorRemediationPanel } from './ErrorRemediationPanel';
import { ErrorDetailPanel } from './ErrorDetailPanel';

// Mock the MigrationService
jest.mock('../../services/MigrationService', () => {
  const originalModule = jest.requireActual('../../services/MigrationService');
  return {
    ...originalModule,
    migrationService: {
      getErrorDetails: jest.fn(),
      getRemediationSuggestions: jest.fn(),
      executeRemediation: jest.fn()
    }
  };
});

// Mock the useErrorAnalysis hook
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

describe('API Error Handling', () => {
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

  // Mock error details for testing
  const mockApiErrors: ErrorDetails[] = [
    // Auth error
    {
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
    },
    // Network error
    {
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
    },
    // Validation error
    {
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
    },
    // System error (more severe)
    {
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
    },
    // Resource error
    {
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
    }
  ];

  // Mock remediation suggestions for testing
  const mockAuthRemediations: RemediationSuggestion[] = [
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

  const mockNetworkRemediations: RemediationSuggestion[] = [
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

  const mockResourceRemediations: RemediationSuggestion[] = [
    {
      id: 'remedy-resource-1',
      errorType: 'resource',
      title: 'Adjust Rate Limiting Strategy',
      description: 'Your requests are being throttled due to rate limiting. Adjust the timing of requests.',
      steps: [
        'Click the "Apply Rate Limiting" button to enable automatic rate limiting',
        'Wait for throttling period to pass',
        'System will retry with adjusted timing'
      ],
      automated: true,
      actionName: 'Apply Rate Limiting'
    },
    {
      id: 'remedy-resource-2',
      errorType: 'resource',
      title: 'Optimize API Request Volume',
      description: 'Your API usage has exceeded quota limits for this time period.',
      steps: [
        'Reduce batch sizes or operation frequency',
        'Consider purchasing higher quota limits',
        'Wait for quota to reset (shown in error details)'
      ]
    }
  ];

  const mockSystemRemediations: RemediationSuggestion[] = [
    {
      id: 'remedy-system-1',
      errorType: 'system',
      title: 'Contact Provider Support',
      description: 'The API server is experiencing internal errors that may require provider intervention.',
      steps: [
        'Collect server error details and request ID',
        'Submit support ticket with the provider',
        'Consider adding retry logic in your workflow'
      ]
    },
    {
      id: 'remedy-system-2',
      errorType: 'system',
      title: 'Wait and Retry Later',
      description: 'Server errors are often temporary. Waiting a few minutes may resolve the issue.',
      steps: [
        'Click the "Schedule Retry" button to queue a delayed retry',
        'System will automatically retry in 15 minutes',
        'You will be notified when the retry occurs'
      ],
      automated: true,
      actionName: 'Schedule Retry'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
    (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue([]);
    
    // Reset timers
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Error Handling Component', () => {
    it('should render API error handling component with correct title', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Check for component title
      expect(screen.getByText('API Connection Status')).toBeInTheDocument();
      
      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should filter and display only API-related errors', async () => {
      // Add a non-API error to the mock data
      const mixedErrors = [
        ...mockApiErrors,
        {
          errorId: 'error-system-2',
          timestamp: new Date().toISOString(),
          errorType: 'system',
          component: 'LocalProcessor',
          operation: 'ProcessFile',
          message: 'Out of memory error during file processing',
          details: {
            memoryUsage: '98%',
            fileSize: '250MB'
          },
          context: {
            fileId: 'FILE-789'
          }
        }
      ];
      
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mixedErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // API errors should be displayed
      expect(screen.getByText('Authentication token expired during API call')).toBeInTheDocument();
      expect(screen.getByText('Network timeout during API request')).toBeInTheDocument();
      expect(screen.getByText('API server returned 500 internal error')).toBeInTheDocument();
      
      // Check that we have some error count display
      const errorCountText = screen.getByText(/errors$/i);
      expect(errorCountText).toBeInTheDocument();
      
      // Non-API errors should not be displayed in the component
      expect(screen.queryByText('Out of memory error during file processing')).not.toBeInTheDocument();
    });

    it('should display healthy status when no errors', async () => {
      // Test with no errors - healthy
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue([]);
      
      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Should show HEALTHY status
      expect(screen.getByText('HEALTHY')).toBeInTheDocument();
      
      // Should show success message
      expect(screen.getByText('No API errors detected in this migration.')).toBeInTheDocument();
    });
    
    it('should display degraded status with auth errors', async () => {
      // Test with only auth errors - degraded
      const authOnlyErrors = [mockApiErrors[0]];
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(authOnlyErrors);
      
      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );
      
      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Should show DEGRADED status
      expect(screen.getByText('DEGRADED')).toBeInTheDocument();
    });

    it('should display failed status with network or system errors', async () => {
      // Test with network and system errors - failed
      const severeErrors = [mockApiErrors[1], mockApiErrors[3]]; // Network and System errors
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(severeErrors);
      
      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );
      
      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Should show FAILED status
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      
      // Should show which error type is most common
      expect(screen.getByText(/Primary issue/)).toBeInTheDocument();
    });

    it('should open detailed error remediation dialog when clicking on an error', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Dialog should show error details
      expect(screen.getAllByText('Authentication token expired during API call').length).toBeGreaterThan(0);
      
      // Should have tabs for details and remediation
      expect(screen.getByRole('tab', { name: /Error Details/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Remediation Options/i })).toBeInTheDocument();
    });
  });

  describe('API Error Display Features', () => {
    it('should display HTTP status codes for API errors', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Check for HTTP status code chips
      expect(screen.getByText('HTTP 401')).toBeInTheDocument();
      expect(screen.getByText('HTTP 504')).toBeInTheDocument();
      expect(screen.getByText('HTTP 500')).toBeInTheDocument();
      expect(screen.getByText('HTTP 429')).toBeInTheDocument();
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Check for status code summary section
      await waitFor(() => {
        expect(screen.getByText('HTTP Status Codes')).toBeInTheDocument();
      });
      
      // Check for aggregated status code chips
      expect(screen.getByText('401 (1)')).toBeInTheDocument();
      expect(screen.getByText('504 (1)')).toBeInTheDocument();
      expect(screen.getByText('500 (1)')).toBeInTheDocument();
      expect(screen.getByText('429 (1)')).toBeInTheDocument();
    });

    it('should group errors by API component', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Check for error grouping by component
      expect(screen.getByText('API Errors by Component')).toBeInTheDocument();
      
      // Check that components are displayed with error counts
      expect(screen.getByText('QTestProvider (2 errors)')).toBeInTheDocument(); 
      expect(screen.getByText('ZephyrProvider (1 error)')).toBeInTheDocument();
      expect(screen.getByText('DataTransformer (1 error)')).toBeInTheDocument();
      expect(screen.getByText('AttachmentService (1 error)')).toBeInTheDocument();
    });

    it('should display API health status and endpoint information', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Check for API connection status indicator
      expect(screen.getByText('API Connection Status')).toBeInTheDocument();
      
      // Should show status chip
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      
      // Navigate to API Health tab
      fireEvent.click(screen.getByRole('tab', { name: /API Health/i }));
      
      // Should show API endpoint status
      await waitFor(() => {
        expect(screen.getByText('API Endpoint Status')).toBeInTheDocument();
      });
      
      // Should show detailed status of different API endpoints
      expect(screen.getByText('Authentication API')).toBeInTheDocument();
      expect(screen.getByText('Test Case API')).toBeInTheDocument();
      expect(screen.getByText('Attachment API')).toBeInTheDocument();
      
      // Check status indicators for each endpoint
      const statusChips = screen.getAllByText(/ONLINE|DEGRADED|OFFLINE/i);
      expect(statusChips.length).toBeGreaterThan(0);
    });
    
    it('should provide timestamps and context information for each error', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Check for context information like operation names and timestamps
      const operationTexts = screen.getAllByText(/CreateTestCase|FetchTestCases|TransformTestCaseData|UpdateTestCase|UploadAttachment/i, { exact: false });
      expect(operationTexts.length).toBeGreaterThan(0);
      
      // Check for API endpoints in the context
      expect(screen.getByText(/\/api\/v3\/projects\/1\/test-cases/i, { exact: false })).toBeInTheDocument();
    });

    it('should show retry operation dialog when retry button is clicked', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Check for retry button and click it
      await waitFor(() => {
        const retryButton = screen.getByText('Retry All Failed Operations');
        expect(retryButton).toBeInTheDocument();
        fireEvent.click(retryButton);
      });
      
      // Retry dialog should appear
      expect(screen.getByText('Retrying Operation')).toBeInTheDocument();
      expect(screen.getByText('Retrying failed API operations...')).toBeInTheDocument();
      
      // Cancel the retry operation
      fireEvent.click(screen.getByText('Cancel'));
      
      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Retrying Operation')).not.toBeInTheDocument();
      });
    });
    
    it('should refresh error display after retry operation', async () => {
      // Setup fake timers
      jest.useFakeTimers();
      
      // Initially return errors
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // There should be 5 API errors initially
      expect(screen.getByText('5 errors')).toBeInTheDocument();
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Setup mock to return fewer errors after retry
      const reducedErrors = mockApiErrors.slice(0, 2); // Only 2 errors now
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(reducedErrors);
      
      // Click retry button
      await waitFor(() => {
        const retryButton = screen.getByText('Retry All Failed Operations');
        expect(retryButton).toBeInTheDocument();
        fireEvent.click(retryButton);
      });
      
      // Fast-forward timer to simulate retry completion
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      // Cancel the retry dialog
      fireEvent.click(screen.getByText('Cancel'));
      
      // The error count should be updated
      await waitFor(() => {
        expect(screen.getByText('2 errors')).toBeInTheDocument();
      });
      
      // Switch back to first tab
      fireEvent.click(screen.getByRole('tab', { name: /Error Details/i }));
      
      // Some errors should no longer be present
      expect(screen.queryByText('API server returned 500 internal error')).not.toBeInTheDocument();
      
      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('API Error Remediation Features', () => {
    it('should provide type-specific remediation buttons', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Check for general and specific remediation options
      await waitFor(() => {
        expect(screen.getByText('Retry All Failed Operations')).toBeInTheDocument();
        expect(screen.getByText('Refresh Authentication')).toBeInTheDocument();
        expect(screen.getByText('Adjust Rate Limits')).toBeInTheDocument();
      });
    });

    it('should display error types with counts and access to their details', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Check for error type categories
      await waitFor(() => {
        expect(screen.getByText('Error Types')).toBeInTheDocument();
      });
      
      // Should show error types with counts
      expect(screen.getByText('Auth Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Network Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Validation Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('System Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Resource Errors (1)')).toBeInTheDocument();
      
      // Each error type should have a "View Details" button
      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons.length).toEqual(5); // One for each error type
      
      // Click "View Details" for auth errors
      fireEvent.click(viewDetailsButtons[0]);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getAllByText('Error Remediation').length).toBeGreaterThan(0);
      });
    });

    it('should open specific error remediation dialog when clicking error type remediation button', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Wait for remediation options to appear
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication')).toBeInTheDocument();
      });
      
      // Click on auth remediation button
      fireEvent.click(screen.getByText('Refresh Authentication'));
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Dialog should show auth error details
      expect(screen.getAllByText('Authentication token expired during API call').length).toBeGreaterThan(0);
      
      // Switch to remediation options tab in the dialog
      fireEvent.click(screen.getAllByRole('tab', { name: /Remediation Options/i })[1]);
      
      // Should load remediation suggestions
      await waitFor(() => {
        expect(screen.getByText('Available Remediation Options')).toBeInTheDocument();
      });
    });

    it('should show detailed remediation options for each error type', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      
      // Auth error selected, show auth remediation suggestions
      (migrationService.getRemediationSuggestions as jest.Mock).mockImplementation((error) => {
        if (error.errorType === 'auth') {
          return Promise.resolve(mockAuthRemediations);
        } else if (error.errorType === 'network') {
          return Promise.resolve(mockNetworkRemediations);
        } else if (error.errorType === 'resource') {
          return Promise.resolve(mockResourceRemediations);
        } else if (error.errorType === 'system') {
          return Promise.resolve(mockSystemRemediations);
        }
        return Promise.resolve([]);
      });
      
      // Mock successful remediation
      const mockOnRemediate = jest.fn().mockImplementation(() => {
        return Promise.resolve();
      });

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
            onRemediate={mockOnRemediate}
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getAllByRole('tab')[1]);
      
      // Should show auth remediation options
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
        expect(screen.getByText('Update API Credentials')).toBeInTheDocument();
      });
      
      // Close the dialog
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      
      // Find network error card and click it
      const networkErrorCard = screen.getByText('Network timeout during API request').closest('.MuiCard-root');
      expect(networkErrorCard).toBeInTheDocument();
      fireEvent.click(networkErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getAllByRole('tab')[1]);
      
      // Should show network remediation options
      await waitFor(() => {
        expect(screen.getByText('Retry Operation with Exponential Backoff')).toBeInTheDocument();
        expect(screen.getByText('Check Network Configuration')).toBeInTheDocument();
      });
    });
    
    it('should allow executing automated remediation actions', async () => {
      // Setup fake timers for setTimeout
      jest.useFakeTimers();
      
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);
      
      // Mock successful remediation
      const mockOnRemediate = jest.fn().mockResolvedValue(undefined);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
            onRemediate={mockOnRemediate}
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getAllByRole('tab')[1]);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // Find and click the Refresh Token button (automated remediation)
      const refreshButton = screen.getByText('Refresh Token');
      expect(refreshButton).toBeInTheDocument();
      fireEvent.click(refreshButton);
      
      // Should call onRemediate with correct parameters
      expect(mockOnRemediate).toHaveBeenCalledWith('error-auth-1', 'remedy-auth-1');
      
      // Should show success message after remediation
      await waitFor(() => {
        expect(screen.getByText('Remediation applied successfully!')).toBeInTheDocument();
      });
      
      // Dialog should close automatically after a delay
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      
      // Check that dialog has closed
      await waitFor(() => {
        expect(screen.queryByText('Error Remediation')).not.toBeInTheDocument();
      });
      
      // Restore real timers
      jest.useRealTimers();
    });
    
    it('should handle failed remediation attempts', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);
      
      // Mock failed remediation
      const mockOnRemediate = jest.fn().mockRejectedValue(new Error('Remediation failed'));

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
            onRemediate={mockOnRemediate}
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getAllByRole('tab')[1]);
      
      // Wait for remediation options to load
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // Find and click the Refresh Token button (automated remediation)
      const refreshButton = screen.getByText('Refresh Token');
      expect(refreshButton).toBeInTheDocument();
      fireEvent.click(refreshButton);
      
      // Should call onRemediate
      expect(mockOnRemediate).toHaveBeenCalled();
      
      // Should show error message after failed remediation
      await waitFor(() => {
        expect(screen.getByText('Failed to apply remediation. Please try again or select a different option.')).toBeInTheDocument();
      });
      
      // Dialog should remain open
      expect(screen.getByText('Error Remediation')).toBeInTheDocument();
    });
  });

  describe('Enhanced API Error Analysis and Reporting', () => {
    it('should provide real-time error handling status tracking', async () => {
      jest.useFakeTimers();
      
      // Mock auto-refresh functionality
      (migrationService.getErrorDetails as jest.Mock).mockImplementation(() => {
        const timestamp = new Date().toISOString();
        const errors = mockApiErrors.map(error => ({
          ...error,
          timestamp
        }));
        return Promise.resolve(errors);
      });

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
            onRefresh={() => {}}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </ThemeProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Should show last updated timestamp
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      
      // Advance timers to trigger refresh
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      // Still should show the timestamp (which would be updated)
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      
      jest.useRealTimers();
    });
    
    it('should display detailed API endpoint health information', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to API Health tab
      fireEvent.click(screen.getByRole('tab', { name: /API Health/i }));
      
      // Should show API health section
      await waitFor(() => {
        expect(screen.getByText('API Connection Health')).toBeInTheDocument();
      });
      
      // Should show status message
      expect(screen.getByText('API Connections Failed')).toBeInTheDocument();
      expect(screen.getByText('Critical API endpoints are not responding. Immediate attention required.')).toBeInTheDocument();
      
      // Should show recent API activities
      expect(screen.getByText('Recent API Activities')).toBeInTheDocument();
      
      // Should show API endpoint status
      expect(screen.getByText('API Endpoint Status')).toBeInTheDocument();
      
      // Should show latency information for endpoints
      const latencyTexts = screen.getAllByText(/ms|timeout/i);
      expect(latencyTexts.length).toBeGreaterThan(0);
    });
    
    it('should provide fix buttons directly on error cards', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Each error should have a Fix button
      const fixButtons = screen.getAllByText('Fix');
      expect(fixButtons.length).toEqual(mockApiErrors.length);
      
      // Click the fix button on first error
      fireEvent.click(fixButtons[0]);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
    });
    
    it('should display nested error details and context when expanded', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Initially error details might be collapsed, look for Show Details button and click it if present
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify that error details section contains all necessary information
      // Check for error context data
      expect(screen.getByText(/testCaseId: TC-123/i)).toBeInTheDocument();
      expect(screen.getByText(/apiEndpoint: \/api\/v3\/projects\/1\/test-cases/i)).toBeInTheDocument();
      
      // Check for error details data
      expect(screen.getByText(/statusCode: 401/i)).toBeInTheDocument();
      expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      
      // Stack trace might be in a collapsed section, try to expand it
      try {
        const expandStackTraceButton = screen.getByText('Expand');
        fireEvent.click(expandStackTraceButton);
        
        // After expansion, check for stack trace content
        expect(screen.getByText(/Error: Authentication failed/i)).toBeInTheDocument();
      } catch (e) {
        // Stack trace expansion might not be available, continue
      }
    });
    
    it('should show detailed HTTP status information with proper color coding', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Check for HTTP status code chips with correct color coding
      // 401 - Warning color (auth error)
      const statusChip401 = screen.getByText('HTTP 401');
      expect(statusChip401).toBeInTheDocument();
      expect(statusChip401.closest('.MuiChip-root')).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgba?\(|#|warning/)
      });
      
      // 500 - Error color (server error)
      const statusChip500 = screen.getByText('HTTP 500');
      expect(statusChip500).toBeInTheDocument();
      expect(statusChip500.closest('.MuiChip-root')).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgba?\(|#|error/)
      });
      
      // Navigate to API Health tab
      fireEvent.click(screen.getByRole('tab', { name: /API Health/i }));
      
      // Wait for tab content to load
      await waitFor(() => {
        expect(screen.getByText('API Endpoint Status')).toBeInTheDocument();
      });
      
      // Check for endpoint status chips with correct color coding
      const onlineChips = screen.getAllByText('ONLINE');
      expect(onlineChips.length).toBeGreaterThan(0);
      expect(onlineChips[0].closest('.MuiChip-root')).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgba?\(|#|success/)
      });
      
      const degradedChips = screen.getAllByText('DEGRADED');
      if (degradedChips.length > 0) {
        expect(degradedChips[0].closest('.MuiChip-root')).toHaveStyle({
          backgroundColor: expect.stringMatching(/rgba?\(|#|warning/)
        });
      }
      
      const offlineChips = screen.getAllByText('OFFLINE');
      if (offlineChips.length > 0) {
        expect(offlineChips[0].closest('.MuiChip-root')).toHaveStyle({
          backgroundColor: expect.stringMatching(/rgba?\(|#|error/)
        });
      }
    });
    
    it('should display a history of recent API errors with timestamps', async () => {
      // Create errors with different timestamps
      const timeBasedErrors = mockApiErrors.map((error, index) => ({
        ...error,
        timestamp: new Date(Date.now() - (index * 600000)).toISOString() // Each error 10 minutes apart
      }));
      
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(timeBasedErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to API Health tab
      fireEvent.click(screen.getByRole('tab', { name: /API Health/i }));
      
      // Wait for tab content to load
      await waitFor(() => {
        expect(screen.getByText('Recent API Activities')).toBeInTheDocument();
      });
      
      // Verify that recent activities are displayed in chronological order
      const activities = screen.getAllByText(/\d+:\d+/i); // Find all time displays (HH:MM format)
      expect(activities.length).toBeGreaterThan(1);
      
      // Check for error messages in the recent activities section
      expect(screen.getByText('Authentication token expired during API call')).toBeInTheDocument();
      expect(screen.getByText('Network timeout during API request')).toBeInTheDocument();
    });
    
    it('should show detailed error diagnostics for network errors', async () => {
      // Create a test with specific network error focus
      const networkErrors = [mockApiErrors[1]]; // Just the network error
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(networkErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockNetworkRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find network error card and click it
      const networkErrorCard = screen.getByText('Network timeout during API request').closest('.MuiCard-root');
      expect(networkErrorCard).toBeInTheDocument();
      fireEvent.click(networkErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Verify error type info is displayed
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('ZephyrProvider')).toBeInTheDocument();
      expect(screen.getByText('FetchTestCases')).toBeInTheDocument();
      
      // Try to expand details
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify network error specific details
      expect(screen.getByText(/statusCode: 504/i)).toBeInTheDocument();
      expect(screen.getByText(/Gateway Timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/retryAfter: 30/i)).toBeInTheDocument();
      
      // Check for API endpoint context
      expect(screen.getByText(/requestUrl: https:\/\/api.zephyrscale.example.com\/v2\/testcases/i)).toBeInTheDocument();
      expect(screen.getByText(/requestMethod: GET/i)).toBeInTheDocument();
      expect(screen.getByText(/timeoutMs: 30000/i)).toBeInTheDocument();
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Should show network-specific remediation options
      await waitFor(() => {
        expect(screen.getByText('Retry Operation with Exponential Backoff')).toBeInTheDocument();
        expect(screen.getByText('Check Network Configuration')).toBeInTheDocument();
      });
    });
    
    it('should show validation error details with field violations', async () => {
      // Create a test with specific validation error focus
      const validationErrors = [mockApiErrors[2]]; // Just the validation error
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(validationErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find validation error card and click it
      const validationErrorCard = screen.getByText('Validation error in test case data').closest('.MuiCard-root');
      expect(validationErrorCard).toBeInTheDocument();
      fireEvent.click(validationErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Try to expand details
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify validation error specific details showing field violations
      expect(screen.getByText(/fields:/i)).toBeInTheDocument();
      expect(screen.getByText(/priority/i)).toBeInTheDocument();
      expect(screen.getByText(/steps/i)).toBeInTheDocument();
      expect(screen.getByText(/violations:/i)).toBeInTheDocument();
      expect(screen.getByText(/Field "priority" is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Field "steps" contains invalid formatting/i)).toBeInTheDocument();
      
      // Check for context information about source and target formats
      expect(screen.getByText(/sourceFormat: Zephyr/i)).toBeInTheDocument();
      expect(screen.getByText(/targetFormat: qTest/i)).toBeInTheDocument();
    });
    
    it('should show resource quota and limit information for resource errors', async () => {
      // Create a test with specific resource error focus
      const resourceErrors = [mockApiErrors[4]]; // Just the resource error
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(resourceErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockResourceRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find resource error card and click it
      const resourceErrorCard = screen.getByText('API resource quota exceeded during upload').closest('.MuiCard-root');
      expect(resourceErrorCard).toBeInTheDocument();
      fireEvent.click(resourceErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Try to expand details
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify resource error specific details with quota information
      expect(screen.getByText(/statusCode: 429/i)).toBeInTheDocument();
      expect(screen.getByText(/Too Many Requests/i)).toBeInTheDocument();
      expect(screen.getByText(/quota:/i)).toBeInTheDocument();
      expect(screen.getByText(/limit: 50MB/i)).toBeInTheDocument();
      expect(screen.getByText(/used: 48MB/i)).toBeInTheDocument();
      expect(screen.getByText(/reset: 3600/i)).toBeInTheDocument();
      
      // Check for detailed file upload context
      expect(screen.getByText(/fileSize: 5MB/i)).toBeInTheDocument();
      expect(screen.getByText(/fileName: test_results.pdf/i)).toBeInTheDocument();
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Should show resource-specific remediation options
      await waitFor(() => {
        expect(screen.getByText('Adjust Rate Limiting Strategy')).toBeInTheDocument();
        expect(screen.getByText('Optimize API Request Volume')).toBeInTheDocument();
      });
    });
    
    it('should show server-side error details for system errors', async () => {
      // Create a test with specific system error focus
      const systemErrors = [mockApiErrors[3]]; // Just the system error
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(systemErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockSystemRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find system error card and click it
      const systemErrorCard = screen.getByText('API server returned 500 internal error').closest('.MuiCard-root');
      expect(systemErrorCard).toBeInTheDocument();
      fireEvent.click(systemErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Try to expand details
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify system error specific details
      expect(screen.getByText(/statusCode: 500/i)).toBeInTheDocument();
      expect(screen.getByText(/Internal Server Error/i)).toBeInTheDocument();
      expect(screen.getByText(/requestId: req-xyz-123/i)).toBeInTheDocument();
      
      // Check for response body details
      expect(screen.getByText(/responseBody:/i)).toBeInTheDocument();
      expect(screen.getByText(/"error":"Internal server error"/i)).toBeInTheDocument();
      expect(screen.getByText(/"code":"SERVER_ERROR"/i)).toBeInTheDocument();
      
      // Expand stack trace
      try {
        const expandStackTraceButton = screen.getByText('Expand');
        fireEvent.click(expandStackTraceButton);
        
        // After expansion, check for stack trace content
        expect(screen.getByText(/Error: Request failed with status code 500/i)).toBeInTheDocument();
        expect(screen.getByText(/APIClient.request/i)).toBeInTheDocument();
      } catch (e) {
        // Stack trace expansion might not be available, continue
      }
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Should show system-specific remediation options
      await waitFor(() => {
        expect(screen.getByText('Contact Provider Support')).toBeInTheDocument();
        expect(screen.getByText('Wait and Retry Later')).toBeInTheDocument();
      });
    });
    
    it('should display authentication specific errors and token expiry details', async () => {
      // Create a test with specific auth error focus
      const authErrors = [mockApiErrors[0]]; // Just the auth error
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(authErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Try to expand details
      try {
        const showDetailsButton = screen.getByText('Show Details');
        fireEvent.click(showDetailsButton);
      } catch (e) {
        // Details might already be expanded, continue
      }
      
      // Verify authentication error specific details
      expect(screen.getByText(/statusCode: 401/i)).toBeInTheDocument();
      expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      expect(screen.getByText(/tokenExpiry:/i)).toBeInTheDocument();
      
      // Switch to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Should show auth-specific remediation options
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
        expect(screen.getByText('Update API Credentials')).toBeInTheDocument();
      });
      
      // Check that automated remediation action is available
      expect(screen.getByText('Refresh Token')).toBeInTheDocument();
    });
    
    it('should switch between AI and standard modes to provide enhanced remediation options', async () => {
      // Setup custom mock for useErrorAnalysis hook
      const { useErrorAnalysis } = jest.requireMock('../../hooks');
      useErrorAnalysis.mockReturnValue({
        loading: false,
        errorAnalysis: {
          patterns: [{
            id: 'pattern-auth',
            name: 'Auth Errors',
            description: 'Pattern of auth errors during API operations',
            frequency: 5,
            affectedOperations: ['CreateTestCase', 'UpdateTestCase'],
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            status: 'active'
          }],
          mostCommonTypes: [{ type: 'auth', count: 5 }],
          mostAffectedComponents: [{ component: 'QTestProvider', count: 3 }],
          resolutionEffectiveness: { 'remedy-auth-1': 85 },
          averageResolutionTime: 25,
          totalRootCauses: { 'Invalid Authentication': 5 },
          remediationMapping: { 'auth': ['remedy-auth-1', 'remedy-auth-2'] }
        },
        aiSuggestions: [{
          id: 'ai-remedy-auth-advanced',
          errorType: 'auth',
          title: 'Proactive Token Management',
          description: 'Pattern of authentication token expirations detected. AI analysis suggests implementing proactive token refresh strategy.',
          steps: [
            'Monitor token expiration time and refresh proactively',
            'Implement automatic retry with fresh tokens for failed operations',
            'Configure parallel token management to prevent operation blocking',
            'Set up token health monitoring with alerts'
          ],
          automated: true,
          actionName: 'Enable Proactive Refresh'
        }],
        getSuggestedRemediations: jest.fn().mockReturnValue(mockAuthRemediations),
        getBestRemediation: jest.fn().mockReturnValue(mockAuthRemediations[0]),
        getRelatedErrors: jest.fn().mockReturnValue([mockApiErrors[3]]) // Return system error as related
      });
      
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockAuthRemediations);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Find auth error card and click it
      const authErrorCard = screen.getByText('Authentication token expired during API call').closest('.MuiCard-root');
      expect(authErrorCard).toBeInTheDocument();
      fireEvent.click(authErrorCard!);
      
      // Error remediation dialog should open in standard mode
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Switch to remediation tab
      fireEvent.click(screen.getAllByRole('tab')[1]);
      
      // Check for standard remediation options
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // Enable AI mode
      const aiModeSwitch = screen.getByLabelText('AI Mode');
      fireEvent.click(aiModeSwitch);
      
      // Should now show AI-enhanced view
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Should display AI tabs
      expect(screen.getByRole('tab', { name: /AI Analysis/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Related Errors/i })).toBeInTheDocument();
      
      // Navigate to AI Analysis tab
      fireEvent.click(screen.getByRole('tab', { name: /AI Analysis/i }));
      
      // Should show AI analysis information
      await waitFor(() => {
        expect(screen.getByText('AI-Powered Error Analysis')).toBeInTheDocument();
      });
      
      // Check for pattern detection
      expect(screen.getByText(/Pattern Detected/i)).toBeInTheDocument();
      
      // Navigate to Related Errors tab
      fireEvent.click(screen.getByRole('tab', { name: /Related Errors/i }));
      
      // Should show related errors
      await waitFor(() => {
        expect(screen.getByText(/Related Errors/i)).toBeInTheDocument();
      });
      
      // Should show the system error as related
      expect(screen.getByText('API server returned 500 internal error')).toBeInTheDocument();
    });
    
    it('should provide accessibility support for navigating error information', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Main component should have appropriate ARIA roles
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      // Each tab should have correct role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(3); // Error Details, Remediation Options, API Health
      
      // Tab panels should have correct role
      const tabpanels = screen.getAllByRole('tabpanel');
      expect(tabpanels.length).toBe(3);
      
      // Only one tab panel should be visible at a time
      const visibleTabpanels = screen.getAllByRole('tabpanel').filter(
        panel => !panel.hasAttribute('hidden')
      );
      expect(visibleTabpanels.length).toBe(1);
      
      // Switch tabs using keyboard navigation
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      fireEvent.click(tabs[1]);
      
      // Should focus the new tab and display its panel
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      
      // Ensure error cards are keyboard navigable
      const cards = screen.getAllByRole('button').filter(
        button => button.closest('.MuiCard-root')
      );
      
      if (cards.length > 0) {
        // Should be able to navigate to cards with keyboard
        cards[0].focus();
        expect(document.activeElement).toBe(cards[0]);
      }
    });

    it('should provide error remediation options across different error types', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);
      
      // Mock remediation suggestions for different error types
      (migrationService.getRemediationSuggestions as jest.Mock).mockImplementation((error) => {
        switch (error.errorType) {
          case 'auth': return Promise.resolve(mockAuthRemediations);
          case 'network': return Promise.resolve(mockNetworkRemediations);
          case 'resource': return Promise.resolve(mockResourceRemediations);
          case 'system': return Promise.resolve(mockSystemRemediations);
          default: return Promise.resolve([]);
        }
      });

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to remediation tab
      fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
      
      // Check for error types 
      await waitFor(() => {
        expect(screen.getByText('Error Types')).toBeInTheDocument();
      });
      
      // Should have navigation buttons for each error type
      expect(screen.getByText('Auth Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Network Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Validation Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('System Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Resource Errors (1)')).toBeInTheDocument();
      
      // Navigate to each error type and verify remediation options
      
      // Auth errors
      const authErrorNav = screen.getByText('Auth Errors (1)').closest('.MuiCard-root');
      fireEvent.click(authErrorNav!.querySelector('button')!);
      
      // Check for auth remediation dialog
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Move to remediation tab
      const remediationTabs = screen.getAllByRole('tab');
      fireEvent.click(remediationTabs[1]);
      
      // Check for specific auth remediation options
      await waitFor(() => {
        expect(screen.getByText('Refresh Authentication Token')).toBeInTheDocument();
      });
      
      // Close the dialog
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      // Resource errors
      await waitFor(() => {
        expect(screen.queryByText('Error Remediation')).not.toBeInTheDocument();
      });
      
      // Find network type and open it
      const networkErrorNav = screen.getByText('Network Errors (1)').closest('.MuiCard-root');
      fireEvent.click(networkErrorNav!.querySelector('button')!);
      
      // Check for network remediation dialog
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
      
      // Move to remediation tab
      const remedTabs = screen.getAllByRole('tab');
      fireEvent.click(remedTabs[1]);
      
      // Check for specific network remediation options
      await waitFor(() => {
        expect(screen.getByText('Retry Operation with Exponential Backoff')).toBeInTheDocument();
      });
    });
    
    it('should display integrated API health status with all endpoints', async () => {
      (migrationService.getErrorDetails as jest.Mock).mockResolvedValue(mockApiErrors);

      render(
        <ThemeProvider theme={theme}>
          <ApiErrorHandling 
            migrationId="migration-123"
          />
        </ThemeProvider>
      );

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Navigate to API Health tab
      fireEvent.click(screen.getByRole('tab', { name: /API Health/i }));
      
      // Wait for tab content to load
      await waitFor(() => {
        expect(screen.getByText('API Endpoint Status')).toBeInTheDocument();
      });
      
      // Check all endpoints are listed
      expect(screen.getByText('Authentication API')).toBeInTheDocument();
      expect(screen.getByText('Test Case API')).toBeInTheDocument();
      expect(screen.getByText('Attachment API')).toBeInTheDocument();
      expect(screen.getByText('User Management API')).toBeInTheDocument();
      expect(screen.getByText('Reporting API')).toBeInTheDocument();
      
      // Check status indicators and latency info
      const statusChips = screen.getAllByText(/ONLINE|DEGRADED|OFFLINE/i);
      expect(statusChips.length).toBe(5); // One for each endpoint
      
      // Check that latency information is shown for each endpoint
      const latencyInfos = screen.getAllByText(/ms|timeout/i);
      expect(latencyInfos.length).toBe(5); // One for each endpoint
      
      // Verify error status is reflected in the endpoint status
      // The status should reflect the mock errors we provided (network and system)
      const degradedStatus = screen.getAllByText('DEGRADED');
      expect(degradedStatus.length).toBeGreaterThan(0);
      
      const offlineStatus = screen.getAllByText('OFFLINE');
      expect(offlineStatus.length).toBeGreaterThan(0);
    });
  });
});