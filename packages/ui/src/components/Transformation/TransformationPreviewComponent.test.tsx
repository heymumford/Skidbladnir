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
import { TransformationPreviewComponent } from './TransformationPreviewComponent';
import { transformationEngine } from '../../services';
import { TransformationType } from './FieldTransformation';
import { Field } from '../../types';

// Mock the transformation engine service
jest.mock('../../services', () => ({
  transformationEngine: {
    applyTransformation: jest.fn()
  }
}));

// Using the global mock for react-json-tree from __mocks__/react-json-tree.js

describe('TransformationPreviewComponent', () => {
  // Mock field data
  const mockSourceField: Field = {
    id: 'name',
    name: 'Name',
    type: 'string',
    required: true,
    description: 'User full name'
  };

  const mockTargetField: Field = {
    id: 'fullName',
    name: 'Full Name',
    type: 'string',
    required: true,
    description: 'User complete name'
  };

  const mockSourceFields: Field[] = [
    mockSourceField,
    {
      id: 'firstName',
      name: 'First Name',
      type: 'string',
      required: true
    },
    {
      id: 'lastName',
      name: 'Last Name',
      type: 'string',
      required: true
    },
    {
      id: 'age',
      name: 'Age',
      type: 'number',
      required: false
    },
    {
      id: 'isActive',
      name: 'Is Active',
      type: 'boolean',
      required: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations for transformationEngine
    (transformationEngine.applyTransformation as jest.Mock).mockImplementation((value, type, params) => {
      switch (type) {
        case TransformationType.UPPERCASE:
          return String(value).toUpperCase();
        case TransformationType.LOWERCASE:
          return String(value).toLowerCase();
        case TransformationType.CONCAT:
          return `${value}${params.separator || ''}Additional`;
        case TransformationType.SUBSTRING:
          return String(value).substring(params.start || 0, params.end || value.length);
        default:
          return value;
      }
    });
  });

  it('renders with basic props and displays sample data', () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.NONE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Check if the component renders the main sections
    expect(screen.getByText('Source Values')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name \(name\)/)).toBeInTheDocument();
  });

  it('initializes with sample values based on source fields', async () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.NONE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Check if sample data is initialized
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Name \(name\)/) as HTMLInputElement;
      expect(nameInput.value).toContain('Sample Name');
    });
  });

  it('applies transformation when editing source values', async () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.UPPERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Find and change the input field
    const nameInput = screen.getByLabelText(/Name \(name\)/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'test value' } });

    // Wait for transformation to be applied and check that it was called
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        'test value',
        TransformationType.UPPERCASE,
        {},
        expect.any(Object)
      );
    });

    // Switch to the simple view tab to see the result
    const simpleViewTab = screen.getByText('Simple View');
    fireEvent.click(simpleViewTab);

    // Check if the transformed value is displayed
    await waitFor(() => {
      expect(screen.getByText(/Result Preview/)).toBeInTheDocument();
    });
  });

  it('applies transformation when clicking "Apply Transformation" button', async () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.UPPERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Find and click the apply transformation button
    const applyButton = screen.getByText('Apply Transformation');
    fireEvent.click(applyButton);

    // Check if transformation was applied
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalled();
    });
  });

  it('switches between tabs to show different views', async () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.UPPERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Should start on Simple View tab
    expect(screen.getByText('Result Preview')).toBeInTheDocument();

    // Switch to JSON View
    const jsonViewTab = screen.getByText('JSON View');
    fireEvent.click(jsonViewTab);
    
    // Check if JSON view is displayed
    await waitFor(() => {
      expect(screen.getByText(/Source Value/)).toBeInTheDocument();
      expect(screen.getByText(/Transformed Value/)).toBeInTheDocument();
      expect(screen.getByTestId('json-tree')).toBeInTheDocument();
    });

    // Switch to Visual Diff
    const visualDiffTab = screen.getByText('Visual Diff');
    fireEvent.click(visualDiffTab);
    
    // Check if Visual Diff view is displayed
    await waitFor(() => {
      expect(screen.getByText(/Visual Comparison/)).toBeInTheDocument();
      expect(screen.getByText(/Source: Name \(name\)/)).toBeInTheDocument();
      expect(screen.getByText(/Target: Full Name \(fullName\)/)).toBeInTheDocument();
    });

    // Switch to History tab
    const historyTab = screen.getByText('History');
    fireEvent.click(historyTab);
    
    // Check if History tab is displayed
    await waitFor(() => {
      expect(screen.getByText(/Transformation History/)).toBeInTheDocument();
    });
  });

  it('displays different transformation types correctly', async () => {
    // Test with substring transformation
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.SUBSTRING}
        transformationParams={{ start: 0, end: 5 }}
        sourceFields={mockSourceFields}
      />
    );

    // Wait for transformation to be applied
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        expect.any(String),
        TransformationType.SUBSTRING,
        { start: 0, end: 5 },
        expect.any(Object)
      );
    });
    
    // Reset and test with concatenation
    jest.clearAllMocks();
    
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.CONCAT}
        transformationParams={{ separator: ' ', fields: ['firstName', 'lastName'] }}
        sourceFields={mockSourceFields}
      />
    );

    // Wait for transformation to be applied
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        expect.any(String),
        TransformationType.CONCAT,
        { separator: ' ', fields: ['firstName', 'lastName'] },
        expect.any(Object)
      );
    });
  });

  it('shows transformation errors gracefully', async () => {
    // Mock a transformation error
    (transformationEngine.applyTransformation as jest.Mock).mockImplementation(() => {
      throw new Error('Transformation error');
    });

    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.CUSTOM}
        transformationParams={{ formula: 'invalid syntax)' }}
        sourceFields={mockSourceFields}
      />
    );

    // Find and click the apply transformation button to trigger the error
    const applyButton = screen.getByText('Apply Transformation');
    fireEvent.click(applyButton);

    // Check console.error was called with the error
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalled();
      // Should show the error in the console, but continue running
    });
  });

  it('tracks transformation history', async () => {
    render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.UPPERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Apply multiple transformations
    const nameInput = screen.getByLabelText(/Name \(name\)/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'first value' } });
    
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        'first value',
        TransformationType.UPPERCASE,
        {},
        expect.any(Object)
      );
    });
    
    fireEvent.change(nameInput, { target: { value: 'second value' } });
    
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        'second value',
        TransformationType.UPPERCASE,
        {},
        expect.any(Object)
      );
    });

    // Switch to History tab
    const historyTab = screen.getByText('History');
    fireEvent.click(historyTab);
    
    // Should show the transformation history (most recent first)
    await waitFor(() => {
      expect(screen.getByText('Most recent')).toBeInTheDocument();
    });
  });

  it('re-applies transformation when parameters change', async () => {
    const { rerender } = render(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.UPPERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Wait for initial transformation
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        expect.any(String),
        TransformationType.UPPERCASE,
        {},
        expect.any(Object)
      );
    });

    // Clear mocks and re-render with different transformation type
    jest.clearAllMocks();
    
    rerender(
      <TransformationPreviewComponent
        sourceField={mockSourceField}
        targetField={mockTargetField}
        transformationType={TransformationType.LOWERCASE}
        transformationParams={{}}
        sourceFields={mockSourceFields}
      />
    );

    // Should apply the new transformation
    await waitFor(() => {
      expect(transformationEngine.applyTransformation).toHaveBeenCalledWith(
        expect.any(String),
        TransformationType.LOWERCASE,
        {},
        expect.any(Object)
      );
    });
  });
});