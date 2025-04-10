/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldMappingPage } from './FieldMappingPage';

// Mock the TransformationPreviewPanel component
jest.mock('../components/Transformation', () => ({
  TransformationPreviewPanel: () => <div data-testid="transformation-preview">Preview Panel</div>
}));

// Mock Button component to avoid pointer events issue
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    Button: (props) => {
      const { onClick, children, disabled, ...rest } = props;
      return (
        <button 
          data-testid={`button-${children?.toString().replace(/\s+/g, '-').toLowerCase()}`} 
          onClick={onClick}
          disabled={disabled === true}
          {...rest}
        >
          {children}
        </button>
      );
    }
  };
});

// Mock the FieldMappingPanel component
jest.mock('../components/Mapping', () => {
  // Use mockName to avoid React reference error in jest.mock
  const mockUseEffect = jest.fn();
  
  return {
    FieldMappingPanel: ({ onMappingsChange }) => {
      // Simulate creating some mappings for testing the preview button
      if (onMappingsChange && !mockUseEffect.mock.calls.length) {
        mockUseEffect();
        setTimeout(() => {
          onMappingsChange([
            { sourceId: 'summary', targetId: 'name', transformation: null },
            { sourceId: 'description', targetId: 'description', transformation: null }
          ]);
        }, 0);
      }
      
      return <div data-testid="field-mapping-panel">Field Mapping Panel</div>;
    }
  };
});

describe('FieldMappingPage', () => {
  it('renders the field mapping page', async () => {
    render(<FieldMappingPage />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check that the page renders correctly
    expect(screen.getByText('Field Mapping Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('field-mapping-panel')).toBeInTheDocument();
    
    // Check for the preview button
    expect(screen.getByText('Preview Transformation')).toBeInTheDocument();
    expect(screen.getByText('Continue to Execution')).toBeInTheDocument();
  });
  
  it('opens the transformation preview dialog when the preview button is clicked', async () => {
    const user = userEvent.setup();
    render(<FieldMappingPage />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the preview button using the test-id
    await user.click(screen.getByTestId('button-preview-transformation'));
    
    // Check that the preview dialog opens
    expect(screen.getByTestId('transformation-preview')).toBeInTheDocument();
  });
  
  it('closes the transformation preview dialog when onClose is called', async () => {
    const user = userEvent.setup();
    render(<FieldMappingPage />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the preview button to open the dialog
    await user.click(screen.getByTestId('button-preview-transformation'));
    
    // Check that the preview dialog opens
    expect(screen.getByTestId('transformation-preview')).toBeInTheDocument();
    
    // Click the close button (we'll simulate this by clicking outside the dialog)
    await user.click(document.body);
    
    // Check that the preview dialog is closed
    await waitFor(() => {
      expect(screen.queryByTestId('transformation-preview')).not.toBeInTheDocument();
    });
  });
});