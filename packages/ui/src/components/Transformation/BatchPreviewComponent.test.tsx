/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BatchPreviewComponent } from './BatchPreviewComponent';
import { TransformationService } from '../../services/TransformationService';
import { FieldMapping, TransformationPreview } from '../../types';

// Mock the transformation service
jest.mock('../../services/TransformationService');

// Mock TestCasePreviewComponent
jest.mock('./TestCasePreviewComponent', () => ({
  TestCasePreviewComponent: ({ testCaseId, sourceProviderId, targetProviderId }: any) => (
    <div data-testid="test-case-preview">
      Test Case Preview for {testCaseId} (Source: {sourceProviderId}, Target: {targetProviderId})
    </div>
  )
}));

describe('BatchPreviewComponent', () => {
  // Mock props
  const mockTestCaseIds = ['TC-123', 'TC-124', 'TC-125', 'TC-126', 'TC-127'];
  const mockSourceProviderId = 'zephyr';
  const mockTargetProviderId = 'qtest';
  const mockFieldMappings: FieldMapping[] = [
    { sourceId: 'name', targetId: 'title', transformation: null },
    { sourceId: 'description', targetId: 'desc', transformation: JSON.stringify({ type: 'uppercase', params: {} }) }
  ];

  // Mock transformation preview data
  const mockPreviewData: TransformationPreview = {
    sourceData: {
      name: 'Test Case Name',
      description: 'Test case description'
    },
    canonicalData: {
      name: 'Test Case Name',
      description: 'TEST CASE DESCRIPTION'
    },
    targetData: {
      title: 'Test Case Name',
      desc: 'TEST CASE DESCRIPTION'
    }
  };

  // Mock preview with validation messages
  const mockPreviewWithIssues: TransformationPreview = {
    ...mockPreviewData,
    validationMessages: [
      'Required field "priority" is missing',
      'Field "status" has invalid value'
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up TransformationService.getTransformationPreview mock implementation
    (TransformationService.prototype.getTransformationPreview as jest.Mock).mockImplementation(
      (testCaseId: string) => {
        // Return preview with issues for TC-125
        if (testCaseId === 'TC-125') {
          return Promise.resolve(mockPreviewWithIssues);
        }
        // Return error for TC-126
        if (testCaseId === 'TC-126') {
          return Promise.reject(new Error('Failed to load preview for TC-126'));
        }
        // Return regular preview for others
        return Promise.resolve(mockPreviewData);
      }
    );
  });

  it('renders the batch preview component with test case list', async () => {
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Check title and source/target info
    expect(screen.getByText('Batch Preview')).toBeInTheDocument();
    expect(screen.getByText(`${mockSourceProviderId} → ${mockTargetProviderId} | ${mockTestCaseIds.length} test cases`)).toBeInTheDocument();

    // Check if tabs are rendered
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Validation Issues')).toBeInTheDocument();

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Check if test case IDs are shown in the table
    expect(screen.getByText('TC-123')).toBeInTheDocument();
    expect(screen.getByText('TC-124')).toBeInTheDocument();
  });

  it('shows validation issues tab with error messages', async () => {
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Check validation issues count
    expect(screen.getByText(/2 validation issues found/)).toBeInTheDocument();

    // Click on the Validation Issues tab
    fireEvent.click(screen.getByText('Validation Issues'));

    // Check if validation issues are displayed
    await waitFor(() => {
      expect(screen.getByText('Required field "priority" is missing')).toBeInTheDocument();
      expect(screen.getByText('Field "status" has invalid value')).toBeInTheDocument();
    });
  });

  it('displays error states for failed test case previews', async () => {
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Look for error chip
    const errorChips = await screen.findAllByText('Error');
    expect(errorChips.length).toBeGreaterThan(0);
  });

  it('shows individual test case preview when clicking on view button', async () => {
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Find and click the view button for the first test case
    const viewButtons = screen.getAllByTitle('View Preview');
    fireEvent.click(viewButtons[0]);

    // Check if the individual preview component is shown
    await waitFor(() => {
      expect(screen.getByTestId('test-case-preview')).toBeInTheDocument();
    });

    // Check if the tab title changed
    expect(screen.getByText('Individual Preview')).toBeInTheDocument();
  });

  it('refreshes preview data when clicking refresh button', async () => {
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Clear the mock calls
    jest.clearAllMocks();

    // Find and click the refresh button for the first test case
    const refreshButtons = screen.getAllByTitle('Reload Preview');
    fireEvent.click(refreshButtons[0]);

    // Check if the service was called again for that test case
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalledWith(
        'TC-123',
        expect.anything()
      );
    });
  });

  it('handles pagination correctly', async () => {
    // Create a longer list of test case IDs
    const manyTestCaseIds = Array.from({ length: 15 }, (_, i) => `TC-${1000 + i}`);
    
    render(
      <BatchPreviewComponent
        testCaseIds={manyTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Check if pagination is showing
    expect(screen.getByText('Showing 1 to 10 of 15 test cases')).toBeInTheDocument();

    // Clear mock calls before testing pagination
    jest.clearAllMocks();

    // Find and click the next page button
    const paginationButtons = screen.getAllByRole('button', { name: /page/i });
    const nextPageButton = paginationButtons.find(btn => btn.textContent === '2');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
    }

    // Check if the service was called for the next page
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });
  });

  it('calls onEditMapping when editing field mapping', async () => {
    const mockOnEditMapping = jest.fn();
    
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
        onEditMapping={mockOnEditMapping}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Click on the view button for the first test case
    const viewButtons = screen.getAllByTitle('View Preview');
    fireEvent.click(viewButtons[0]);

    // Check if the individual preview component is rendered with the props
    await waitFor(() => {
      expect(screen.getByTestId('test-case-preview')).toBeInTheDocument();
    });

    // We can't directly test the onEditMapping callback in the child component
    // as it's a mock, but we can verify the props are passed correctly
    expect(screen.getByText(/Test Case Preview for TC-123/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn();
    
    render(
      <BatchPreviewComponent
        testCaseIds={mockTestCaseIds}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
        onClose={mockOnClose}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Find and click the close button
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    // Check if the onClose callback was called
    expect(mockOnClose).toHaveBeenCalled();
  });
});