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
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme';

// Import error components
import { DetailedErrorReport } from '../../../packages/ui/src/components/Error/DetailedErrorReport';
import { ErrorCategoryFilter } from '../../../packages/ui/src/components/Error/ErrorCategoryFilter';
import { ErrorDetailPanel } from '../../../packages/ui/src/components/Error/ErrorDetailPanel';
import { ErrorRemediationPanel } from '../../../packages/ui/src/components/Error/ErrorRemediationPanel';
import { ErrorSummaryPanel } from '../../../packages/ui/src/components/Error/ErrorSummaryPanel';
import { AiRemediationPanel } from '../../../packages/ui/src/components/Error/AiRemediationPanel';

/**
 * Test suite to verify that error components render correctly.
 * Error handling UI is critical for the user experience during migrations.
 */
describe('Error Components Render Correctly', () => {
  // Sample error data for testing
  const sampleErrors = [
    {
      id: 'err-1',
      type: 'API_ERROR',
      category: 'ZEPHYR',
      message: 'Failed to connect to Zephyr API',
      details: 'Connection timeout after 30 seconds',
      timestamp: new Date().toISOString(),
      status: 'CRITICAL',
      operation: 'GET_TEST_CASES',
      source: {
        file: 'ZephyrProvider.ts',
        line: 123
      }
    },
    {
      id: 'err-2',
      type: 'VALIDATION_ERROR',
      category: 'TRANSFORMATION',
      message: 'Invalid test case format',
      details: 'Missing required field "steps"',
      timestamp: new Date().toISOString(),
      status: 'WARNING',
      operation: 'TRANSFORM_TEST_CASE',
      source: {
        file: 'TransformationService.ts',
        line: 45
      }
    }
  ];

  // Sample remediation suggestions
  const remediationSuggestions = [
    {
      id: 'rem-1',
      errorId: 'err-1',
      suggestion: 'Check your Zephyr API credentials',
      actionType: 'CONFIGURATION',
      steps: [
        'Navigate to Provider Configuration',
        'Verify Zephyr API token is correct',
        'Test connection using the "Test Connection" button'
      ]
    },
    {
      id: 'rem-2',
      errorId: 'err-1',
      suggestion: 'Verify Zephyr API endpoint is accessible',
      actionType: 'NETWORK',
      steps: [
        'Check if Zephyr server is running',
        'Verify network connectivity',
        'Check if firewall is blocking the connection'
      ]
    }
  ];

  // Helper to render with theme
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('DetailedErrorReport Component', () => {
    it('renders with error data', () => {
      renderWithTheme(
        <DetailedErrorReport 
          errors={sampleErrors}
          onErrorSelect={jest.fn()}
          data-testid="error-report"
        />
      );
      
      // Check component renders
      expect(screen.getByTestId('error-report')).toBeInTheDocument();
      
      // Check error data is displayed
      expect(screen.getByText('Failed to connect to Zephyr API')).toBeInTheDocument();
      expect(screen.getByText('Invalid test case format')).toBeInTheDocument();
    });
    
    it('renders empty state when no errors', () => {
      renderWithTheme(
        <DetailedErrorReport 
          errors={[]}
          onErrorSelect={jest.fn()}
          data-testid="error-report"
        />
      );
      
      // Empty state should be shown
      expect(screen.getByTestId('error-report')).toBeInTheDocument();
      expect(screen.getByText(/No errors to display/i)).toBeInTheDocument();
    });
  });
  
  describe('ErrorCategoryFilter Component', () => {
    const categories = ['ZEPHYR', 'QTEST', 'TRANSFORMATION', 'SYSTEM'];
    
    it('renders all categories', () => {
      renderWithTheme(
        <ErrorCategoryFilter 
          categories={categories}
          selectedCategories={['ZEPHYR']}
          onCategoryChange={jest.fn()}
          data-testid="category-filter"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('category-filter')).toBeInTheDocument();
      
      // All categories should be listed
      categories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });
  });
  
  describe('ErrorDetailPanel Component', () => {
    it('renders error details when error is selected', () => {
      renderWithTheme(
        <ErrorDetailPanel 
          error={sampleErrors[0]}
          data-testid="error-detail"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('error-detail')).toBeInTheDocument();
      
      // Error details should be displayed
      expect(screen.getByText('Failed to connect to Zephyr API')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout after 30 seconds')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('GET_TEST_CASES')).toBeInTheDocument();
    });
    
    it('renders empty state when no error is selected', () => {
      renderWithTheme(
        <ErrorDetailPanel 
          error={null}
          data-testid="error-detail"
        />
      );
      
      // Component should render with empty state
      expect(screen.getByTestId('error-detail')).toBeInTheDocument();
      expect(screen.getByText(/Select an error to view details/i)).toBeInTheDocument();
    });
  });
  
  describe('ErrorRemediationPanel Component', () => {
    it('renders remediation suggestions for selected error', () => {
      renderWithTheme(
        <ErrorRemediationPanel 
          error={sampleErrors[0]}
          suggestions={remediationSuggestions}
          onApplyRemediation={jest.fn()}
          data-testid="remediation-panel"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('remediation-panel')).toBeInTheDocument();
      
      // Suggestions should be displayed
      expect(screen.getByText('Check your Zephyr API credentials')).toBeInTheDocument();
      expect(screen.getByText('Verify Zephyr API endpoint is accessible')).toBeInTheDocument();
    });
    
    it('renders empty state when no suggestions available', () => {
      renderWithTheme(
        <ErrorRemediationPanel 
          error={sampleErrors[0]}
          suggestions={[]}
          onApplyRemediation={jest.fn()}
          data-testid="remediation-panel"
        />
      );
      
      // Component should render with empty state
      expect(screen.getByTestId('remediation-panel')).toBeInTheDocument();
      expect(screen.getByText(/No remediation suggestions available/i)).toBeInTheDocument();
    });
  });
  
  describe('ErrorSummaryPanel Component', () => {
    it('renders error summary with counts by category', () => {
      renderWithTheme(
        <ErrorSummaryPanel 
          errors={sampleErrors}
          onCategorySelect={jest.fn()}
          data-testid="summary-panel"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('summary-panel')).toBeInTheDocument();
      
      // Summary data should be displayed
      expect(screen.getByText(/Total Errors: 2/i)).toBeInTheDocument();
      expect(screen.getByText('ZEPHYR')).toBeInTheDocument();
      expect(screen.getByText('TRANSFORMATION')).toBeInTheDocument();
    });
  });
  
  describe('AiRemediationPanel Component', () => {
    it('renders AI remediation panel', () => {
      renderWithTheme(
        <AiRemediationPanel 
          error={sampleErrors[0]}
          isGenerating={false}
          aiSuggestion="Try resetting your API token and generating a new one from Zephyr Scale admin panel."
          onGenerateSuggestion={jest.fn()}
          data-testid="ai-remediation"
        />
      );
      
      // Component should render
      expect(screen.getByTestId('ai-remediation')).toBeInTheDocument();
      
      // AI suggestion should be displayed
      expect(screen.getByText(/Try resetting your API token/i)).toBeInTheDocument();
    });
    
    it('shows loading state when generating suggestion', () => {
      renderWithTheme(
        <AiRemediationPanel 
          error={sampleErrors[0]}
          isGenerating={true}
          aiSuggestion=""
          onGenerateSuggestion={jest.fn()}
          data-testid="ai-remediation"
        />
      );
      
      // Component should render with loading state
      expect(screen.getByTestId('ai-remediation')).toBeInTheDocument();
      expect(screen.getByText(/Generating suggestion/i)).toBeInTheDocument();
    });
  });
});