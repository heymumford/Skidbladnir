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
import { ProviderSelector } from './ProviderSelector';
import { Provider } from '../../types';

const mockProviders: Provider[] = [
  {
    id: 'jira',
    name: 'Jira/Zephyr',
    version: '1.0.0',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  },
  {
    id: 'qtest',
    name: 'qTest',
    version: '1.0.0',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  }
];

describe('ProviderSelector', () => {
  it('displays list of available providers', () => {
    const handleSelect = jest.fn();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        onSelect={handleSelect}
        label="Provider"
      />
    );
    
    // Open the dropdown
    const selector = screen.getByLabelText('Provider');
    fireEvent.mouseDown(selector);
    
    // Check that providers are displayed
    expect(screen.getByText('Jira/Zephyr')).toBeInTheDocument();
    expect(screen.getByText('qTest')).toBeInTheDocument();
  });
  
  it('selects a provider when clicked', async () => {
    const handleSelect = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        onSelect={handleSelect}
        label="Provider"
      />
    );
    
    // Open the dropdown
    const selector = screen.getByLabelText('Provider');
    await user.click(selector);
    
    // Select a provider
    const option = screen.getByText('Jira/Zephyr');
    await user.click(option);
    
    // Check that the callback was called with the correct provider
    expect(handleSelect).toHaveBeenCalledWith(mockProviders[0]);
  });
  
  it('shows selected provider when value is provided', () => {
    const handleSelect = jest.fn();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        value={mockProviders[1]}
        onSelect={handleSelect}
        label="Provider"
      />
    );
    
    // Check that the selected provider is displayed
    expect(screen.getByLabelText('Provider')).toHaveTextContent('qTest');
  });
  
  it('displays placeholder when no provider is selected', () => {
    const handleSelect = jest.fn();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        onSelect={handleSelect}
        label="Provider"
        placeholder="Select a provider"
      />
    );
    
    // Open the dropdown
    const selector = screen.getByLabelText('Provider');
    
    // Check that the placeholder is displayed
    expect(selector).toHaveTextContent('Select a provider');
  });
  
  it('displays provider version when showVersion is true', async () => {
    const handleSelect = jest.fn();
    const user = userEvent.setup();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        onSelect={handleSelect}
        label="Provider"
        showVersion
      />
    );
    
    // Open the dropdown
    const selector = screen.getByLabelText('Provider');
    await user.click(selector);
    
    // Check that version is displayed
    expect(screen.getByText('Jira/Zephyr (v1.0.0)')).toBeInTheDocument();
    expect(screen.getByText('qTest (v1.0.0)')).toBeInTheDocument();
  });
  
  it('is disabled when disabled prop is true', () => {
    const handleSelect = jest.fn();
    
    render(
      <ProviderSelector 
        providers={mockProviders} 
        onSelect={handleSelect}
        label="Provider"
        disabled
      />
    );
    
    // Check that the component is disabled
    expect(screen.getByLabelText('Provider')).toBeDisabled();
  });
});