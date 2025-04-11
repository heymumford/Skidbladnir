/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProviderConfigFactory } from './ProviderConfigFactory';

describe('ProviderConfigFactory', () => {
  const mockConfigUpdate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders ZephyrConfigPanel for zephyr provider', () => {
    render(
      <ProviderConfigFactory
        providerId="zephyr"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    // Zephyr has a specific placeholder text we can look for
    expect(screen.getByPlaceholderText('https://api.zephyrscale.smartbear.com/v2')).toBeInTheDocument();
  });
  
  it('renders QTestConfigPanel for qtest provider', () => {
    render(
      <ProviderConfigFactory
        providerId="qtest"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    // qTest has a specific placeholder we can look for
    expect(screen.getByText(/Replace {instance} with your qTest instance name/i)).toBeInTheDocument();
  });
  
  it('renders TestRailConfigPanel for testrail provider', () => {
    render(
      <ProviderConfigFactory
        providerId="testrail"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    // TestRail has a specific label we can look for
    expect(screen.getByLabelText(/Username\/Email/i)).toBeInTheDocument();
  });
  
  it('renders ALMConfigPanel for hp-alm provider', () => {
    render(
      <ProviderConfigFactory
        providerId="hp-alm"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    // ALM has a specific info message we can look for
    expect(screen.getByText(/Micro Focus ALM/i)).toBeInTheDocument();
  });
  
  it('renders JamaConfigPanel for jama provider', () => {
    render(
      <ProviderConfigFactory
        providerId="jama"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    // Jama has unique text about client id/secret
    expect(screen.getByText(/OAuth Client ID from Jama Connect/i)).toBeInTheDocument();
  });
  
  it('renders warning for unsupported provider', () => {
    render(
      <ProviderConfigFactory
        providerId="unsupported-provider"
        config={null}
        onConfigUpdate={mockConfigUpdate}
      />
    );
    
    expect(screen.getByText(/Configuration panel for provider "unsupported-provider" is not implemented yet/i)).toBeInTheDocument();
  });
});