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
    
    // Select source field
    await user.click(screen.getByLabelText('Source Field'));
    await user.click(screen.getByText('Summary'));
    
    // Select target field
    await user.click(screen.getByLabelText('Target Field'));
    await user.click(screen.getByText('Name'));
    
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
    
    // Click auto-map button
    await user.click(screen.getByText('Auto-Map'));
    
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
    
    // Click clear button
    await user.click(screen.getByText('Clear All'));
    
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