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
import { ErrorRemediationPanel } from './ErrorRemediationPanel';
import { migrationService } from '../../services/MigrationService';
import { useErrorAnalysis } from '../../hooks';

// Mock the MigrationService
jest.mock('../../services/MigrationService', () => {
  const originalModule = jest.requireActual('../../services/MigrationService');
  return {
    ...originalModule,
    migrationService: {
      getErrorDetails: jest.fn(),
      getRemediationSuggestions: jest.fn()
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

describe('ErrorRemediationPanel', () => {
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

  const mockError = {
    errorId: 'error-123',
    timestamp: new Date().toISOString(),
    errorType: 'network',
    component: 'ZephyrProvider',
    operation: 'FetchTestCase',
    message: 'Network timeout during operation',
    details: {
      statusCode: 408,
      message: 'Request timeout',
      retryAfter: 30
    },
    context: {
      testCaseId: 'TC-456',
      apiEndpoint: '/api/v3/testcases/456',
      requestMethod: 'GET'
    },
    stackTrace: 'Error: Request timeout\n    at ZephyrApiClient.request (/app/api-client.js:125:23)'
  };

  const mockSuggestions = [
    {
      id: 'remedy-1',
      errorType: 'network',
      title: 'Retry Operation',
      description: 'This appears to be a temporary network issue. Retrying the operation may resolve it.',
      steps: [
        'Check your network connection',
        'Verify the provider service is accessible',
        'Click "Retry Operation" below'
      ],
      automated: true,
      actionName: 'Retry Operation'
    },
    {
      id: 'remedy-2',
      errorType: 'network',
      title: 'Configure Longer Timeout',
      description: 'The operation consistently times out. Configure a longer timeout for this API endpoint.',
      steps: [
        'Navigate to Provider Configuration',
        'Update the timeout setting for the Zephyr provider',
        'Apply and save the changes',
        'Retry the operation'
      ],
      automated: false
    }
  ];

  // AI suggestions mock
  const mockAiSuggestions = [
    {
      id: 'ai-remedy-network',
      errorType: 'network',
      title: 'Adaptive Retry Strategy',
      description: 'AI analysis detected a pattern of intermittent timeouts. Implementing an adaptive retry strategy with exponential backoff might resolve this issue.',
      steps: [
        'Configure progressive retry intervals',
        'Implement automatic circuit breaking for persistent failures',
        'Apply intelligent request throttling based on server response times',
        'Monitor success rates to optimize retry parameters'
      ],
      automated: true,
      actionName: 'Apply Adaptive Strategy'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (migrationService.getErrorDetails as jest.Mock).mockResolvedValue([mockError]);
    (migrationService.getRemediationSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);
    
    // Reset the useErrorAnalysis mock to default values
    (useErrorAnalysis as jest.Mock).mockReturnValue({
      loading: false,
      errorAnalysis: {},
      aiSuggestions: [],
      getSuggestedRemediations: jest.fn().mockReturnValue([]),
      getBestRemediation: jest.fn().mockReturnValue(null),
      getRelatedErrors: jest.fn().mockReturnValue([])
    });
  });

  it('should render loading state initially', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123" 
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error details after loading', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123" 
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });
    
    // Verify that error type and component information is shown
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText(/ZephyrProvider/i)).toBeInTheDocument();
    
    // Verify timestamp is shown
    expect(screen.getByText(/Time:/i)).toBeInTheDocument();
  });

  it('should display detailed error information when expanded', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123" 
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });
    
    // Click "Show Details" to expand error details
    fireEvent.click(screen.getByText('Show Details'));
    
    // Check for detailed error information sections
    await waitFor(() => {
      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('Error Context')).toBeInTheDocument();
    });
    
    // Verify error details are shown
    expect(screen.getByText(/statusCode: 408/i)).toBeInTheDocument();
    expect(screen.getByText(/Request timeout/i)).toBeInTheDocument();
    expect(screen.getByText(/retryAfter: 30/i)).toBeInTheDocument();
    
    // Verify context information is shown
    expect(screen.getByText(/testCaseId: TC-456/i)).toBeInTheDocument();
    expect(screen.getByText(/apiEndpoint: \/api\/v3\/testcases\/456/i)).toBeInTheDocument();
    expect(screen.getByText(/requestMethod: GET/i)).toBeInTheDocument();
    
    // Check if stack trace section exists and can be expanded
    expect(screen.getByText('Stack Trace')).toBeInTheDocument();
    
    // Expand stack trace
    fireEvent.click(screen.getByText('Expand'));
    
    // Verify stack trace content is shown
    expect(screen.getByText(/Error: Request timeout/i)).toBeInTheDocument();
    expect(screen.getByText(/ZephyrApiClient.request/i)).toBeInTheDocument();
  });

  it('should switch to remediation tab when selected and display remediation options', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123" 
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Switch to remediation tab
    fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));

    // Verify remediation options are shown
    await waitFor(() => {
      expect(screen.getByText('Available Remediation Options')).toBeInTheDocument();
    });
    
    // Check both remediation suggestions are displayed
    expect(screen.getByText('Retry Operation')).toBeInTheDocument();
    expect(screen.getByText('This appears to be a temporary network issue. Retrying the operation may resolve it.')).toBeInTheDocument();
    
    expect(screen.getByText('Configure Longer Timeout')).toBeInTheDocument();
    expect(screen.getByText('The operation consistently times out. Configure a longer timeout for this API endpoint.')).toBeInTheDocument();
    
    // Verify automated vs manual remediation indicators
    expect(screen.getByText('Automated Fix')).toBeInTheDocument();
    expect(screen.getByText('Manual Fix Required')).toBeInTheDocument();
  });

  it('should show remediation steps when expanding a remediation suggestion', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123" 
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Switch to remediation tab
    fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
    
    // Wait for remediation options to load
    await waitFor(() => {
      expect(screen.getByText('Retry Operation')).toBeInTheDocument();
    });
    
    // Show details for the first remediation
    fireEvent.click(screen.getAllByText('Show Details')[0]);
    
    // Verify steps are displayed
    await waitFor(() => {
      expect(screen.getByText('Remediation Steps:')).toBeInTheDocument();
    });
    
    // Check each step is listed
    expect(screen.getByText('Check your network connection')).toBeInTheDocument();
    expect(screen.getByText('Verify the provider service is accessible')).toBeInTheDocument();
    expect(screen.getByText('Click "Retry Operation" below')).toBeInTheDocument();
  });

  it('should call onRemediate when remediation action is clicked for automated remediation', async () => {
    const mockOnRemediate = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123"
          onRemediate={mockOnRemediate}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Switch to remediation tab
    fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
    
    // Wait for remediation options to load
    await waitFor(() => {
      expect(screen.getByText('Retry Operation')).toBeInTheDocument();
    });
    
    // Click the remediation action button
    fireEvent.click(screen.getByRole('button', { name: 'Retry Operation' }));

    // Verify onRemediate callback was called with correct parameters
    await waitFor(() => {
      expect(mockOnRemediate).toHaveBeenCalledWith('error-123', 'remedy-1');
    });
  });

  it('should display success message after successful remediation', async () => {
    const mockOnRemediate = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123"
          onRemediate={mockOnRemediate}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Switch to remediation tab
    fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
    
    // Wait for remediation options to load
    await waitFor(() => {
      expect(screen.getByText('Retry Operation')).toBeInTheDocument();
    });
    
    // Click the remediation action button
    fireEvent.click(screen.getByRole('button', { name: 'Retry Operation' }));

    // Verify success message is shown
    await waitFor(() => {
      expect(screen.getByText('Remediation applied successfully!')).toBeInTheDocument();
    });
  });

  it('should display error message if remediation fails', async () => {
    const mockOnRemediate = jest.fn().mockRejectedValue(new Error('Remediation failed'));
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123"
          onRemediate={mockOnRemediate}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Switch to remediation tab
    fireEvent.click(screen.getByRole('tab', { name: /Remediation Options/i }));
    
    // Wait for remediation options to load
    await waitFor(() => {
      expect(screen.getByText('Retry Operation')).toBeInTheDocument();
    });
    
    // Click the remediation action button
    fireEvent.click(screen.getByRole('button', { name: 'Retry Operation' }));

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText('Failed to apply remediation. Please try again or select a different option.')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <ErrorRemediationPanel 
          migrationId="migration-123" 
          errorId="error-123"
          onClose={mockOnClose}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
    });

    // Click the close button
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    
    // Verify onClose callback was called
    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('AI-Enhanced Mode', () => {
    beforeEach(() => {
      // Setup the useErrorAnalysis mock to return AI suggestions
      (useErrorAnalysis as jest.Mock).mockReturnValue({
        loading: false,
        errorAnalysis: {
          patterns: [{
            id: 'pattern-network',
            name: 'Network Timeouts',
            description: 'Pattern of network timeouts during API operations',
            frequency: 5,
            affectedOperations: ['FetchTestCase', 'UpdateTestCase'],
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            status: 'active'
          }],
          mostCommonTypes: [{ type: 'network', count: 5 }],
          mostAffectedComponents: [{ component: 'ZephyrProvider', count: 3 }],
          resolutionEffectiveness: { 'remedy-1': 85 },
          averageResolutionTime: 25,
          totalRootCauses: { 'Network Timeout': 5 },
          remediationMapping: { 'network': ['remedy-1', 'remedy-2'] }
        },
        aiSuggestions: mockAiSuggestions,
        getSuggestedRemediations: jest.fn().mockReturnValue([...mockSuggestions, ...mockAiSuggestions]),
        getBestRemediation: jest.fn().mockReturnValue(mockSuggestions[0]),
        getRelatedErrors: jest.fn().mockReturnValue([{
          ...mockError,
          errorId: 'error-456',
          message: 'Similar network timeout in different operation'
        }])
      });
    });

    it('should switch between standard and AI modes', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel 
            migrationId="migration-123" 
            errorId="error-123"
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Network timeout during operation')).toBeInTheDocument();
      });

      // Check AI mode toggle is present
      const aiModeToggle = screen.getByRole('checkbox', { name: /AI Mode/i });
      expect(aiModeToggle).toBeInTheDocument();
      
      // Enable AI mode
      fireEvent.click(aiModeToggle);
      
      // Verify AI-enhanced view is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Disable AI mode
      fireEvent.click(aiModeToggle);
      
      // Verify standard view is shown again
      await waitFor(() => {
        expect(screen.getByText('Error Remediation')).toBeInTheDocument();
      });
    });

    it('should show AI-powered error analysis in AI mode', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel 
            migrationId="migration-123" 
            errorId="error-123"
            enhancedMode={true} // Start in AI mode
          />
        </ThemeProvider>
      );

      // Verify AI-enhanced view is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Should have AI-specific tabs
      expect(screen.getByRole('tab', { name: /Remediation/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /AI Analysis/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Related Errors/i })).toBeInTheDocument();
      
      // Navigate to AI Analysis tab
      fireEvent.click(screen.getByRole('tab', { name: /AI Analysis/i }));
      
      // Verify AI analysis information is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Powered Error Analysis')).toBeInTheDocument();
      });
      
      // Check for error pattern detection
      expect(screen.getByText(/This network error occurred in the/i)).toBeInTheDocument();
      expect(screen.getByText(/Pattern Detected/i)).toBeInTheDocument();
      
      // Check for root cause analysis
      expect(screen.getByText('Root Cause Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Network Timeout: 5/i)).toBeInTheDocument();
    });

    it('should show related errors in AI mode', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel 
            migrationId="migration-123" 
            errorId="error-123"
            enhancedMode={true} // Start in AI mode
          />
        </ThemeProvider>
      );

      // Verify AI-enhanced view is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Navigate to Related Errors tab
      fireEvent.click(screen.getByRole('tab', { name: /Related Errors/i }));
      
      // Verify related errors information is shown
      await waitFor(() => {
        expect(screen.getByText(/Related Errors \(1\)/i)).toBeInTheDocument();
      });
      
      // Check that the related error is displayed
      expect(screen.getByText('Similar network timeout in different operation')).toBeInTheDocument();
    });

    it('should show AI-generated remediation suggestions in remediation tab', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel 
            migrationId="migration-123" 
            errorId="error-123"
            enhancedMode={true} // Start in AI mode
          />
        </ThemeProvider>
      );

      // Verify AI-enhanced view is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Verify standard remediation options are shown
      expect(screen.getByText('Retry Operation')).toBeInTheDocument();
      expect(screen.getByText('Configure Longer Timeout')).toBeInTheDocument();
      
      // Verify AI-generated remediation suggestion is shown
      expect(screen.getByText('Adaptive Retry Strategy')).toBeInTheDocument();
      expect(screen.getByText('AI analysis detected a pattern of intermittent timeouts.')).toBeInTheDocument();
      
      // Verify AI suggestion is marked as AI-generated
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should display best remediation recommendation with highlighting', async () => {
      render(
        <ThemeProvider theme={theme}>
          <ErrorRemediationPanel 
            migrationId="migration-123" 
            errorId="error-123"
            enhancedMode={true} // Start in AI mode
          />
        </ThemeProvider>
      );

      // Verify AI-enhanced view is shown
      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Error Remediation')).toBeInTheDocument();
      });
      
      // Check for Recommended Solution section
      expect(screen.getByText('Recommended Solution')).toBeInTheDocument();
      expect(screen.getByText('Based on our analysis, this is the most effective solution for this error.')).toBeInTheDocument();
      
      // Verify the best remediation is displayed prominently
      const bestRemediationCard = screen.getAllByText('Retry Operation')[0].closest('.MuiCard-root');
      expect(bestRemediationCard).toBeInTheDocument();
      
      // Additional remediation options should also be shown
      expect(screen.getByText('All Available Solutions')).toBeInTheDocument();
    });
  });
});