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
import { FieldMappingSelector } from './FieldMappingSelector';
import { Field } from '../../types';

// Mock source and target fields
const sourceFields: Field[] = [
  { id: 'summary', name: 'Summary', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'priority', name: 'Priority', type: 'string', required: false },
  { id: 'status', name: 'Status', type: 'string', required: false },
];

const targetFields: Field[] = [
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'severity', name: 'Severity', type: 'string', required: true },
  { id: 'state', name: 'State', type: 'string', required: false },
];

describe('FieldMappingSelector', () => {
  it('renders source and target field selectors', () => {
    const handleMapping = jest.fn();
    
    render(
      <FieldMappingSelector 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
      />
    );
    
    // Check that field labels are rendered
    expect(screen.getByLabelText('Source Field')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Field')).toBeInTheDocument();
    
    // Check that create mapping button is rendered
    expect(screen.getByText('Create Mapping')).toBeInTheDocument();
  });
  
  it('creates mapping when fields are selected and button is clicked', async () => {
    const handleMapping = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingSelector 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
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
    
    // Verify that the mapping function was called with correct params
    expect(handleMapping).toHaveBeenCalledWith({
      sourceId: 'summary',
      targetId: 'name',
      transformation: null
    });
  });
  
  it('disables the create button when no fields are selected', () => {
    const handleMapping = jest.fn();
    
    render(
      <FieldMappingSelector 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
      />
    );
    
    // Check that the button is disabled
    expect(screen.getByText('Create Mapping')).toBeDisabled();
  });
  
  it('displays field types and required status in options', async () => {
    const handleMapping = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingSelector 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
        showFieldDetails
      />
    );
    
    // Open source field dropdown
    await user.click(screen.getByLabelText('Source Field'));
    
    // Check that field types and required status are displayed
    expect(screen.getByText('Summary (string, required)')).toBeInTheDocument();
    expect(screen.getByText('Description (text, required)')).toBeInTheDocument();
    expect(screen.getByText('Priority (string)')).toBeInTheDocument();
  });
  
  it('visually indicates type incompatibility', async () => {
    const customSourceFields: Field[] = [
      { id: 'number_field', name: 'Number Field', type: 'number', required: true },
      ...sourceFields
    ];
    
    const handleMapping = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingSelector 
        sourceFields={customSourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
        showCompatibility
      />
    );
    
    // Select number field as source
    await user.click(screen.getByLabelText('Source Field'));
    await user.click(screen.getByText('Number Field'));
    
    // Open target field dropdown
    await user.click(screen.getByLabelText('Target Field'));
    
    // String fields should be marked as incompatible with number type
    expect(screen.getByText('Name (incompatible type)')).toBeInTheDocument();
  });
  
  it('shows field transformation options when selected', async () => {
    const handleMapping = jest.fn();
    const user = userEvent.setup();
    
    render(
      <FieldMappingSelector 
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleMapping}
        showTransformations
      />
    );
    
    // Select source field
    await user.click(screen.getByLabelText('Source Field'));
    await user.click(screen.getByText('Summary'));
    
    // Select target field
    await user.click(screen.getByLabelText('Target Field'));
    await user.click(screen.getByText('Name'));
    
    // Check if transformation options appear
    expect(screen.getByText('Transformation')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    
    // Select a transformation
    await user.click(screen.getByLabelText('Transformation'));
    await user.click(screen.getByText('Uppercase'));
    
    // Click create mapping button
    await user.click(screen.getByText('Create Mapping'));
    
    // Verify that the mapping function was called with correct transformation
    expect(handleMapping).toHaveBeenCalledWith({
      sourceId: 'summary',
      targetId: 'name',
      transformation: 'uppercase'
    });
  });
});