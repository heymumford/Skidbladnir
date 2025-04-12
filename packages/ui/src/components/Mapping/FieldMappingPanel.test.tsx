/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldMappingPanel } from './FieldMappingPanel';
import { Field, FieldMapping } from '../../types';

// Mock source and target fields
const sourceFields: Field[] = [
  { id: 'summary', name: 'Summary', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'priority', name: 'Priority', type: 'string', required: false },
];

const targetFields: Field[] = [
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'severity', name: 'Severity', type: 'string', required: true },
];

describe('FieldMappingPanel', () => {
  it('renders both selector and list components', () => {
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onMappingsChange={jest.fn()}
      />
    );
    
    // Check that both components are rendered
    expect(screen.getByLabelText('Source Field')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Field')).toBeInTheDocument();
    expect(screen.getByText('Create Mapping')).toBeInTheDocument();
    expect(screen.getByText('No field mappings defined yet')).toBeInTheDocument();
  });
  
  it('adds a new mapping when created via selector', async () => {
    const handleMappingsChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onMappingsChange={handleMappingsChange}
      />
    );
    
    // In React 19, MUI select component behavior has changed
    // First select source field - open dropdown
    const sourceSelect = screen.getByLabelText('Source Field');
    await user.click(sourceSelect);
    
    // Find the source option by looking up in the dropdown (which is rendered at the document root)
    const summaryOption = document.querySelector('[data-value="summary"]');
    if (!summaryOption) {
      throw new Error('Source option with data-value="summary" not found');
    }
    await user.click(summaryOption);
    
    // Select target field - open dropdown
    const targetSelect = screen.getByLabelText('Target Field');
    await user.click(targetSelect);
    
    // Find the target option  
    const nameOption = document.querySelector('[data-value="name"]');
    if (!nameOption) {
      throw new Error('Target option with data-value="name" not found');
    }
    await user.click(nameOption);
    
    // Click create mapping button
    await user.click(screen.getByText('Create Mapping'));
    
    // Verify that onMappingsChange was called with the new mapping
    expect(handleMappingsChange).toHaveBeenCalledWith([
      { sourceId: 'summary', targetId: 'name', transformation: null }
    ]);
  });
  
  it('deletes a mapping when delete button is clicked', async () => {
    const initialMappings: FieldMapping[] = [
      { sourceId: 'summary', targetId: 'name', transformation: null },
      { sourceId: 'description', targetId: 'description', transformation: null }
    ];
    
    const handleMappingsChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        initialMappings={initialMappings}
        onMappingsChange={handleMappingsChange}
      />
    );
    
    // Find all delete buttons
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    
    // Click the first delete button
    await user.click(deleteButtons[0]);
    
    // Verify that onMappingsChange was called with the updated mappings
    expect(handleMappingsChange).toHaveBeenCalledWith([
      { sourceId: 'description', targetId: 'description', transformation: null }
    ]);
  });
  
  it('can auto-map fields with matching names', async () => {
    const handleMappingsChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onMappingsChange={handleMappingsChange}
        allowAutoMapping
      />
    );
    
    // Find the Auto-Map button by looking for its icon first
    const autoMapButton = screen.getByRole('button', { 
      name: /auto-map/i 
    });
    await user.click(autoMapButton);
    
    // Verify that onMappingsChange was called with the auto-mapped fields
    expect(handleMappingsChange).toHaveBeenCalledWith([
      { sourceId: 'description', targetId: 'description', transformation: null }
    ]);
  });
  
  it('can clear all mappings', async () => {
    const initialMappings: FieldMapping[] = [
      { sourceId: 'summary', targetId: 'name', transformation: null },
      { sourceId: 'description', targetId: 'description', transformation: null }
    ];
    
    const handleMappingsChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        initialMappings={initialMappings}
        onMappingsChange={handleMappingsChange}
      />
    );
    
    // Find the Clear All button by role and text
    const clearButton = screen.getByRole('button', {
      name: /clear all/i
    });
    await user.click(clearButton);
    
    // Verify that onMappingsChange was called with empty array
    expect(handleMappingsChange).toHaveBeenCalledWith([]);
  });
  
  it('validates mappings for required fields', async () => {
    const initialMappings: FieldMapping[] = [
      { sourceId: 'summary', targetId: 'name', transformation: null },
    ];
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        initialMappings={initialMappings}
        onMappingsChange={jest.fn()}
        validateMappings
      />
    );
    
    // Check for validation status
    await waitFor(() => {
      expect(screen.getByText('Missing mappings for required fields')).toBeInTheDocument();
      // Should list missing required fields
      expect(screen.getByText('Target: Description, Severity')).toBeInTheDocument();
    });
  });
  
  it('displays a success message when all required fields are mapped', async () => {
    const initialMappings: FieldMapping[] = [
      { sourceId: 'summary', targetId: 'name', transformation: null },
      { sourceId: 'description', targetId: 'description', transformation: null },
      { sourceId: 'priority', targetId: 'severity', transformation: null },
    ];
    
    render(
      <FieldMappingPanel 
        sourceFields={sourceFields}
        targetFields={targetFields}
        initialMappings={initialMappings}
        onMappingsChange={jest.fn()}
        validateMappings
      />
    );
    
    // Check for validation success message
    await waitFor(() => {
      expect(screen.getByText('All required fields are mapped')).toBeInTheDocument();
    });
  });
});