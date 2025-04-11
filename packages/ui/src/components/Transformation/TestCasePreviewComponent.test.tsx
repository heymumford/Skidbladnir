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
import { TestCasePreviewComponent } from './TestCasePreviewComponent';
import { TransformationService } from '../../services/TransformationService';
import { FieldMapping, TransformationPreview } from '../../types';

// Mock the transformation service
jest.mock('../../services/TransformationService');

// Using the global mock for react-json-tree from __mocks__/react-json-tree.js

// Mock DataStructureComparison component
jest.mock('./DataStructureComparison', () => ({
  DataStructureComparison: ({ preview, sourceProviderId, targetProviderId }: any) => (
    <div data-testid="data-structure-comparison">
      Data Structure Comparison (Source: {sourceProviderId}, Target: {targetProviderId})
    </div>
  )
}));

// Mock AttachmentPreview component
jest.mock('../TestCase/AttachmentPreview', () => ({
  AttachmentPreview: ({ attachment, testCaseId }: any) => (
    <div data-testid="attachment-preview">
      Attachment Preview for {testCaseId}: {attachment.name}
    </div>
  )
}));

describe('TestCasePreviewComponent', () => {
  // Mock props
  const mockTestCaseId = 'TC-123';
  const mockSourceProviderId = 'zephyr';
  const mockTargetProviderId = 'qtest';
  const mockFieldMappings: FieldMapping[] = [
    { sourceId: 'name', targetId: 'title', transformation: null },
    { sourceId: 'description', targetId: 'desc', transformation: JSON.stringify({ type: 'uppercase', params: {} }) },
    { sourceId: 'attachment', targetId: 'file', transformation: null }
  ];

  // Mock transformation preview data
  const mockPreviewData: TransformationPreview = {
    sourceData: {
      name: 'Test Case Name',
      description: 'Test case description',
      attachment: {
        id: 'att-123',
        name: 'screenshot.png',
        contentType: 'image/png',
        size: 12345
      }
    },
    canonicalData: {
      name: 'Test Case Name',
      description: 'TEST CASE DESCRIPTION',
      attachment: {
        id: 'att-123',
        name: 'screenshot.png',
        contentType: 'image/png',
        size: 12345
      }
    },
    targetData: {
      title: 'Test Case Name',
      desc: 'TEST CASE DESCRIPTION',
      file: {
        id: 'qtest-att-123',
        name: 'screenshot.png',
        fileType: 'image/png',
        size: 12345
      }
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
    (TransformationService.prototype.getTransformationPreview as jest.Mock).mockImplementation(() => {
      return Promise.resolve(mockPreviewData);
    });
  });

  it('renders the test case preview component with field comparison view', async () => {
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Check loading indicator initially
    expect(screen.getByText('Loading test case preview...')).toBeInTheDocument();

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Check title and source/target info
    expect(screen.getByText('Test Case Preview')).toBeInTheDocument();
    expect(screen.getByText(`${mockSourceProviderId} → ${mockTargetProviderId}`)).toBeInTheDocument();

    // Check if tabs are rendered
    expect(screen.getByText('Field Comparison')).toBeInTheDocument();
    expect(screen.getByText('JSON View')).toBeInTheDocument();
    expect(screen.getByText('Visual Diff')).toBeInTheDocument();
    expect(screen.getByText('Advanced Comparison')).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();

    // Check if source and target sections are rendered
    expect(screen.getByText('Source Test Case')).toBeInTheDocument();
    expect(screen.getByText('Target Test Case')).toBeInTheDocument();

    // Check if field data is displayed
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByText('attachment')).toBeInTheDocument();
  });

  it('shows validation issues when present', async () => {
    // Mock the transformation service to return preview with issues
    (TransformationService.prototype.getTransformationPreview as jest.Mock).mockResolvedValue(mockPreviewWithIssues);

    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Check if validation issues are displayed
    expect(screen.getByText('Validation Issues:')).toBeInTheDocument();
    expect(screen.getByText('Required field "priority" is missing')).toBeInTheDocument();
    expect(screen.getByText('Field "status" has invalid value')).toBeInTheDocument();
  });

  it('switches between different view tabs', async () => {
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Should start on Field Comparison tab
    expect(screen.getByText('Source Test Case')).toBeInTheDocument();

    // Switch to JSON View
    fireEvent.click(screen.getByText('JSON View'));
    
    // Check if JSON view is displayed
    await waitFor(() => {
      expect(screen.getByText('Source Data (zephyr)')).toBeInTheDocument();
      expect(screen.getByText('Target Data (qtest)')).toBeInTheDocument();
      expect(screen.getAllByTestId('json-tree').length).toBeGreaterThan(0);
    });

    // Switch to Visual Diff
    fireEvent.click(screen.getByText('Visual Diff'));
    
    // Check if Visual Diff view is displayed
    await waitFor(() => {
      expect(screen.getByText('Visual Field Diff')).toBeInTheDocument();
    });

    // Switch to Advanced Comparison
    fireEvent.click(screen.getByText('Advanced Comparison'));
    
    // Check if Advanced Comparison view is displayed
    await waitFor(() => {
      expect(screen.getByTestId('data-structure-comparison')).toBeInTheDocument();
    });

    // Switch to Attachments
    fireEvent.click(screen.getByText('Attachments'));
    
    // Check if Attachments view is displayed
    await waitFor(() => {
      expect(screen.getByText('Attachment Preview')).toBeInTheDocument();
    });
  });

  it('filters fields when using search', async () => {
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Get search input
    const searchInput = screen.getByPlaceholderText('Search fields...');
    
    // Search for 'name'
    fireEvent.change(searchInput, { target: { value: 'name' } });

    // Should show name field but not description
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.queryByText('description')).not.toBeInTheDocument();
  });

  it('displays attachment fields in the attachments tab', async () => {
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the preview data to load
    await waitFor(() => {
      expect(TransformationService.prototype.getTransformationPreview).toHaveBeenCalled();
    });

    // Switch to Attachments tab
    fireEvent.click(screen.getByText('Attachments'));
    
    // Check if source and target attachment sections are displayed
    await waitFor(() => {
      expect(screen.getByText('Source Attachments (zephyr)')).toBeInTheDocument();
      expect(screen.getByText('Target Attachments (qtest)')).toBeInTheDocument();
    });

    // Check if attachment details are shown
    expect(screen.getByText('attachment')).toBeInTheDocument();
    expect(screen.getByText('file')).toBeInTheDocument();
  });

  it('calls onEditMapping when edit button is clicked', async () => {
    const mockOnEditMapping = jest.fn();
    
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
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

    // Find and click the edit button
    const editButtons = screen.getAllByTitle('Edit Transformation');
    fireEvent.click(editButtons[0]);

    // Check if the onEditMapping callback was called with the correct mapping
    expect(mockOnEditMapping).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: expect.any(String),
      targetId: expect.any(String)
    }));
  });

  it('shows download button when onClose is provided', async () => {
    const mockOnClose = jest.fn();
    
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
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

    // Check if export and close buttons are displayed
    expect(screen.getByText('Export Preview')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();

    // Click close button
    fireEvent.click(screen.getByText('Close'));
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error state when preview loading fails', async () => {
    // Mock error response
    (TransformationService.prototype.getTransformationPreview as jest.Mock).mockRejectedValue(
      new Error('Failed to load preview data')
    );
    
    render(
      <TestCasePreviewComponent
        testCaseId={mockTestCaseId}
        sourceProviderId={mockSourceProviderId}
        targetProviderId={mockTargetProviderId}
        fieldMappings={mockFieldMappings}
      />
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load preview data')).toBeInTheDocument();
    });
  });
});