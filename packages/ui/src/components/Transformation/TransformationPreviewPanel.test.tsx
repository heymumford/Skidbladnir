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
import { TransformationPreviewPanel } from './TransformationPreviewPanel';
import { TransformationService } from '../../services/TransformationService';

// We need to mock the components before importing TransformationPreviewPanel

// Mock react-json-tree before importing components that use it
jest.mock('react-json-tree', () => ({
  __esModule: true,
  default: () => <div data-testid="json-tree">JSON Tree</div>
}), { virtual: true });

// Also mock Material UI components
jest.mock('@mui/material', () => {
  return {
    Box: (props) => <div {...props} />,
    Typography: (props) => <div {...props}>{props.children}</div>,
    Paper: (props) => <div {...props}>{props.children}</div>,
    Alert: (props) => <div {...props}>{props.children}</div>,
    Tabs: (props) => <div {...props}>{props.children}</div>,
    Tab: (props) => <div {...props}>{props.children}</div>,
    CircularProgress: () => <div>Loading...</div>,
    Button: (props) => <button onClick={props.onClick}>{props.children}</button>,
    Stack: (props) => <div {...props}>{props.children}</div>,
    Divider: () => <hr />,
    Accordion: (props) => <div {...props}>{props.children}</div>,
    AccordionSummary: (props) => <div {...props}>{props.children}</div>,
    AccordionDetails: (props) => <div {...props}>{props.children}</div>,
    Chip: (props) => <div {...props}>{props.children}</div>,
    Dialog: (props) => props.open ? <div {...props}>{props.children}</div> : null,
    DialogContent: (props) => <div {...props}>{props.children}</div>
  };
});

// Mock Material UI icons
jest.mock('@mui/icons-material/ExpandMore', () => ({
  __esModule: true,
  default: () => <span>ExpandMore</span>
}), { virtual: true });

jest.mock('@mui/icons-material/CompareArrows', () => ({
  __esModule: true,
  default: () => <span>CompareArrows</span>
}), { virtual: true });

jest.mock('@mui/icons-material/SyncAlt', () => ({
  __esModule: true,
  default: () => <span>SyncAlt</span>
}), { virtual: true });

jest.mock('@mui/icons-material/CheckCircle', () => ({
  __esModule: true,
  default: () => <span>CheckCircle</span>
}), { virtual: true });

jest.mock('@mui/icons-material/Warning', () => ({
  __esModule: true,
  default: () => <span>Warning</span>
}), { virtual: true });

// Mock the TransformationService
jest.mock('../../services/TransformationService', () => {
  return {
    TransformationService: jest.fn().mockImplementation(() => {
      return {
        getTransformationPreview: jest.fn(),
        getMockTransformationPreview: jest.fn().mockReturnValue({
          sourceData: {
            id: 'TC-123',
            name: 'Test Case',
            status: 'ACTIVE'
          },
          canonicalData: {
            id: 'TC-123',
            name: 'Test Case',
            status: 'READY'
          },
          targetData: {
            key: 'TC123',
            summary: 'Test Case',
            status: 'Active'
          },
          validationMessages: [
            'Field "attachments" not mapped in target system'
          ]
        })
      };
    })
  };
});

describe('TransformationPreviewPanel', () => {
  it('renders the preview panel with tabs', async () => {
    render(
      <TransformationPreviewPanel
        testCaseId="TC-123"
        sourceProviderId="zephyr"
        targetProviderId="qtest"
        fieldMappings={[]}
      />
    );
    
    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Generating Transformation Preview...')).not.toBeInTheDocument();
    });
    
    // Check that the component renders correctly
    expect(screen.getByText('Transformation Preview')).toBeInTheDocument();
    expect(screen.getByText('zephyr → qtest')).toBeInTheDocument();
    
    // Check that the tabs are rendered
    expect(screen.getByText('Field Comparison')).toBeInTheDocument();
    expect(screen.getByText('JSON View')).toBeInTheDocument();
    
    // Check that the validation messages are displayed
    expect(screen.getByText('1 validation issues found:')).toBeInTheDocument();
    expect(screen.getByText('Field "attachments" not mapped in target system')).toBeInTheDocument();
  });
  
  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TransformationPreviewPanel
        testCaseId="TC-123"
        sourceProviderId="zephyr"
        targetProviderId="qtest"
        fieldMappings={[]}
      />
    );
    
    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Generating Transformation Preview...')).not.toBeInTheDocument();
    });
    
    // Switch to JSON View tab
    await user.click(screen.getByText('JSON View'));
    
    // Check that the JSON View tab content is displayed
    expect(screen.getByText('Source Data')).toBeInTheDocument();
    expect(screen.getByText('Canonical Data')).toBeInTheDocument();
    expect(screen.getByText('Target Data')).toBeInTheDocument();
    
    // Switch back to Field Comparison tab
    await user.click(screen.getByText('Field Comparison'));
    
    // The field comparison table should be displayed (we can't check the table content
    // easily due to the way we generate field mappings, but this is a reasonable proxy)
    expect(document.querySelectorAll('table').length).toBeGreaterThan(0);
  });
  
  it('calls the onClose callback when the close button is clicked', async () => {
    const onCloseMock = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TransformationPreviewPanel
        testCaseId="TC-123"
        sourceProviderId="zephyr"
        targetProviderId="qtest"
        fieldMappings={[]}
        onClose={onCloseMock}
      />
    );
    
    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Generating Transformation Preview...')).not.toBeInTheDocument();
    });
    
    // Click the close button
    await user.click(screen.getByText('Close'));
    
    // Check that the onClose callback was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});