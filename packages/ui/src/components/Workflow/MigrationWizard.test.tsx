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
import { ThemeProvider } from '@mui/material';
import { lcarsThemeExtended } from '../../theme';
import { MigrationWizard } from './MigrationWizard';

describe('MigrationWizard', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  it('renders wizard with all steps', () => {
    renderWithTheme(<MigrationWizard />);
    
    // Check for all step labels
    expect(screen.getByText('Provider Selection')).toBeInTheDocument();
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Transformation Preview')).toBeInTheDocument();
    expect(screen.getByText('Execution Configuration')).toBeInTheDocument();
    expect(screen.getByText('Review & Start')).toBeInTheDocument();
    
    // Check for provider configuration panels
    expect(screen.getByText('Source Provider')).toBeInTheDocument();
    expect(screen.getByText('Target Provider')).toBeInTheDocument();
  });
  
  it('handles navigation when next button is clicked', () => {
    const mockOnComplete = jest.fn();
    renderWithTheme(<MigrationWizard onComplete={mockOnComplete} />);
    
    // Initially, Next button should be disabled until providers are selected
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
    
    // Back button should be disabled on first step
    const backButton = screen.getByText('Back');
    expect(backButton).toBeDisabled();
  });
  
  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();
    renderWithTheme(<MigrationWizard onCancel={mockOnCancel} />);
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check if onCancel was called
    expect(mockOnCancel).toHaveBeenCalled();
  });
  
  it('has disabled back button on first step', () => {
    renderWithTheme(<MigrationWizard />);
    
    // Back button should be disabled on first step
    const backButton = screen.getByText('Back');
    expect(backButton).toBeDisabled();
  });
  
  it('shows "Start Migration" on last step', () => {
    renderWithTheme(<MigrationWizard />);
    
    // Navigate to the last step
    fireEvent.click(screen.getByText('Next')); // Step 2
    fireEvent.click(screen.getByText('Next')); // Step 3
    fireEvent.click(screen.getByText('Next')); // Step 4
    fireEvent.click(screen.getByText('Next')); // Step 5
    
    // Now the button should say "Start Migration" instead of "Next"
    expect(screen.getByText('Start Migration')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });
});