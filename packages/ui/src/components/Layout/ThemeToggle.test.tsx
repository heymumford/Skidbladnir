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
import { ThemeProvider } from '@mui/material/styles';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider as CustomThemeProvider } from '../../theme';
import { lcarsThemeExtended } from '../../theme';

describe('ThemeToggle', () => {
  const renderComponent = (onThemeChange = jest.fn()) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        <CustomThemeProvider>
          <ThemeToggle onThemeChange={onThemeChange} />
        </CustomThemeProvider>
      </ThemeProvider>
    );
  };

  it('renders the theme toggle button', () => {
    renderComponent();
    expect(screen.getByTestId('theme-toggle-button')).toBeInTheDocument();
  });

  it('opens the theme menu when clicked', () => {
    renderComponent();
    const button = screen.getByTestId('theme-toggle-button');
    
    fireEvent.click(button);
    
    expect(screen.getByText('Select Theme')).toBeInTheDocument();
    expect(screen.getByText('LCARS')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('calls onThemeChange when a theme is selected', () => {
    const onThemeChange = jest.fn();
    renderComponent(onThemeChange);
    
    // Open the menu
    const button = screen.getByTestId('theme-toggle-button');
    fireEvent.click(button);
    
    // Select dark theme
    fireEvent.click(screen.getByTestId('theme-option-dark'));
    
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('highlights the currently active theme', () => {
    renderComponent();
    
    // Open the menu
    const button = screen.getByTestId('theme-toggle-button');
    fireEvent.click(button);
    
    // LCARS theme should be active by default
    const lcarsOption = screen.getByTestId('theme-option-lcars');
    expect(lcarsOption).toHaveAttribute('aria-selected', 'true');
  });

  it('closes the menu when a theme is selected', () => {
    renderComponent();
    
    // Open the menu
    const button = screen.getByTestId('theme-toggle-button');
    fireEvent.click(button);
    
    // The menu should be open
    expect(screen.getByText('Select Theme')).toBeInTheDocument();
    
    // Select a theme
    fireEvent.click(screen.getByTestId('theme-option-dark'));
    
    // The menu should be closed
    expect(screen.queryByText('Select Theme')).not.toBeInTheDocument();
  });
});