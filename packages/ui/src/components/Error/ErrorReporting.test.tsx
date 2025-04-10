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
import '@testing-library/jest-dom';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { RemediationSuggestionCard } from './RemediationSuggestionCard';
import { ErrorCategoryFilter } from './ErrorCategoryFilter';
import { DetailedErrorReport } from './DetailedErrorReport';
import { ErrorDetails, RemediationSuggestion } from '../../services';

jest.mock('../../services', () => ({
  migrationService: {
    getErrorDetails: jest.fn().mockResolvedValue([
      {
        errorId: 'err-1',
        timestamp: '2025-04-10T10:30:00Z',
        errorType: 'validation',
        component: 'TestProcessor',
        operation: 'ValidateTestCase',
        message: 'Validation failed for test case fields',
        details: {
          fields: ['priority', 'description'],
          violations: ['Field "priority" is required']
        }
      }
    ]),
    getRemediationSuggestions: jest.fn().mockResolvedValue([
      {
        id: 'remedy-1',
        errorType: 'validation',
        title: 'Fix Field Mapping Issues',
        description: 'There are validation errors with the mapped fields',
        steps: ['Go to Field Mapping page', 'Correct the issues']
      }
    ])
  }
}));

describe('Error Reporting Components', () => {
  const mockError: ErrorDetails = {
    errorId: 'err-test-1',
    timestamp: '2025-04-10T10:00:00Z',
    errorType: 'validation',
    component: 'Processor',
    operation: 'ValidateSchema',
    message: 'Validation error in test case',
    details: {
      fields: ['priority', 'description'],
      violations: ['Field "priority" is required']
    }
  };

  const mockSuggestion: RemediationSuggestion = {
    id: 'remedy-1',
    errorType: 'validation',
    title: 'Fix Field Mapping',
    description: 'There are validation errors with the mapped fields',
    steps: ['Go to Field Mapping page', 'Correct the issues'],
    automated: true,
    actionName: 'Fix Mapping'
  };

  const mockCategories = [
    { id: 'validation', label: 'Validation', color: '#7cb342', count: 3 },
    { id: 'network', label: 'Network', color: '#42a5f5', count: 2 }
  ];

  describe('ErrorDetailPanel', () => {
    it('renders error details correctly', () => {
      render(<ErrorDetailPanel error={mockError} />);
      
      expect(screen.getByText('Validation error in test case')).toBeInTheDocument();
      expect(screen.getByText('Processor')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('expands to show more details when clicked', () => {
      render(<ErrorDetailPanel error={mockError} />);
      
      // Initially collapsed
      expect(screen.queryByText('Field "priority" is required')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(screen.getByLabelText('show more'));
      
      // Now details should be visible
      expect(screen.getByText('Field "priority" is required')).toBeInTheDocument();
    });
  });

  describe('RemediationSuggestionCard', () => {
    it('renders suggestion correctly', () => {
      render(<RemediationSuggestionCard suggestion={mockSuggestion} />);
      
      expect(screen.getByText('Fix Field Mapping')).toBeInTheDocument();
      expect(screen.getByText('There are validation errors with the mapped fields')).toBeInTheDocument();
      expect(screen.getByText('Go to Field Mapping page')).toBeInTheDocument();
      expect(screen.getByText('Correct the issues')).toBeInTheDocument();
    });

    it('calls action handler when action button is clicked', async () => {
      const mockActionHandler = jest.fn().mockResolvedValue(undefined);
      
      render(
        <RemediationSuggestionCard 
          suggestion={mockSuggestion} 
          onActionClick={mockActionHandler}
        />
      );
      
      fireEvent.click(screen.getByText('Fix Mapping'));
      
      await waitFor(() => {
        expect(mockActionHandler).toHaveBeenCalledWith(mockSuggestion);
      });
    });
  });

  describe('ErrorCategoryFilter', () => {
    it('renders category chips correctly', () => {
      const handleCategoryChange = jest.fn();
      
      render(
        <ErrorCategoryFilter
          categories={mockCategories}
          selectedCategory={null}
          onCategoryChange={handleCategoryChange}
        />
      );
      
      expect(screen.getByText('Validation (3)')).toBeInTheDocument();
      expect(screen.getByText('Network (2)')).toBeInTheDocument();
    });

    it('calls onCategoryChange when a category is selected', () => {
      const handleCategoryChange = jest.fn();
      
      render(
        <ErrorCategoryFilter
          categories={mockCategories}
          selectedCategory={null}
          onCategoryChange={handleCategoryChange}
        />
      );
      
      fireEvent.click(screen.getByText('Validation (3)'));
      
      expect(handleCategoryChange).toHaveBeenCalledWith('validation');
    });
  });

  describe('DetailedErrorReport', () => {
    it('loads errors from migrationService when not provided', async () => {
      render(<DetailedErrorReport migrationId="migration-1" />);
      
      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Validation failed for test case fields')).toBeInTheDocument();
      });
    });

    it('renders with provided errors without loading', () => {
      render(<DetailedErrorReport migrationId="migration-1" errors={[mockError]} />);
      
      // Should not show loading
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      
      // Should show the error
      expect(screen.getByText('Validation error in test case')).toBeInTheDocument();
    });
  });
});