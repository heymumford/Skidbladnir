/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MappingList } from './MappingList';
import { FieldMapping, Field } from '../../types';

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

// Mock mappings
const mockMappings: FieldMapping[] = [
  { sourceId: 'summary', targetId: 'name', transformation: null },
  { sourceId: 'description', targetId: 'description', transformation: null },
  { sourceId: 'priority', targetId: 'severity', transformation: 'uppercase' },
];

describe('MappingList', () => {
  it('renders all mappings', () => {
    render(
      <MappingList 
        mappings={mockMappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={jest.fn()}
      />
    );
    
    // Check that all mappings are displayed
    expect(screen.getByText('Summary → Name')).toBeInTheDocument();
    expect(screen.getByText('Description → Description')).toBeInTheDocument();
    expect(screen.getByText('Priority → Severity')).toBeInTheDocument();
  });
  
  it('displays transformation information when present', () => {
    render(
      <MappingList 
        mappings={mockMappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={jest.fn()}
      />
    );
    
    // Check that transformations are displayed
    expect(screen.getByText('Transform: Uppercase')).toBeInTheDocument();
  });
  
  it('calls delete handler with correct mapping index', async () => {
    const handleDelete = jest.fn();
    const user = userEvent.setup();
    
    render(
      <MappingList 
        mappings={mockMappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={handleDelete}
      />
    );
    
    // Find all delete buttons
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    
    // Click the second delete button
    await user.click(deleteButtons[1]);
    
    // Verify that the delete handler was called with the correct index
    expect(handleDelete).toHaveBeenCalledWith(1);
  });
  
  it('displays empty state when no mappings exist', () => {
    render(
      <MappingList 
        mappings={[]}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={jest.fn()}
      />
    );
    
    // Check that empty state message is displayed
    expect(screen.getByText('No field mappings defined yet')).toBeInTheDocument();
  });
  
  it('displays field types when showFieldTypes is true', () => {
    render(
      <MappingList 
        mappings={mockMappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={jest.fn()}
        showFieldTypes
      />
    );
    
    // Check that field types are displayed
    expect(screen.getByText('Summary (string) → Name (string)')).toBeInTheDocument();
    expect(screen.getByText('Description (text) → Description (text)')).toBeInTheDocument();
    expect(screen.getByText('Priority (string) → Severity (string)')).toBeInTheDocument();
  });
  
  it('correctly handles required field indicators', () => {
    render(
      <MappingList 
        mappings={mockMappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={jest.fn()}
        showRequiredFields
      />
    );
    
    // Check for required field indicators
    expect(screen.getAllByText('(required)')).toHaveLength(5); // 2 source + 3 target fields
  });
});