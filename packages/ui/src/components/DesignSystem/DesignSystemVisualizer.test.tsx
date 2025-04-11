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
import { lcarsThemeExtended } from '../../theme';
import { DesignSystemVisualizer } from './DesignSystemVisualizer';

describe('DesignSystemVisualizer', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  it('renders with default tab (Colors)', () => {
    renderWithTheme(<DesignSystemVisualizer />);
    
    // Check tab is present
    expect(screen.getByText('Colors')).toBeInTheDocument();
    
    // Check color palette section is visible (default tab)
    expect(screen.getByText('Color Palette')).toBeInTheDocument();
  });

  it('allows switching between tabs', () => {
    renderWithTheme(<DesignSystemVisualizer />);
    
    // Switch to Typography tab
    fireEvent.click(screen.getByText('Typography'));
    expect(screen.getByText('Headings')).toBeInTheDocument();
    
    // Switch to Spacing tab
    fireEvent.click(screen.getByText('Spacing'));
    expect(screen.getByText('Spacing System')).toBeInTheDocument();
    
    // Switch to Components tab
    fireEvent.click(screen.getByText('Components'));
    expect(screen.getByText('UI Components')).toBeInTheDocument();
    
    // Switch to Forms tab
    fireEvent.click(screen.getByText('Forms'));
    expect(screen.getByText('Form Elements')).toBeInTheDocument();
    
    // Switch to Theme tab
    fireEvent.click(screen.getByText('Theme'));
    expect(screen.getByText('Theme System')).toBeInTheDocument();
  });

  it('renders with specified initial tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={1} />);
    
    // Typography tab (index 1) should be active
    expect(screen.getByText('Typography')).toBeInTheDocument();
    expect(screen.getByText('Headings')).toBeInTheDocument();
  });

  it('renders color swatches in the color tab', () => {
    renderWithTheme(<DesignSystemVisualizer />);
    
    // Colors tab is default, check that primary color swatch is rendered
    expect(screen.getByText('primary.main')).toBeInTheDocument();
  });

  it('renders typography examples in the typography tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={1} />);
    
    // Check typography examples are rendered
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Body 1 - Main body text used for most content. Should be easy to read at length and have good contrast.')).toBeInTheDocument();
  });

  it('renders spacing examples in the spacing tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={2} />);
    
    // Check spacing examples are rendered
    expect(screen.getByText('Base Unit: 8px')).toBeInTheDocument();
    expect(screen.getByText('32px - XL (4x)')).toBeInTheDocument();
  });

  it('renders component examples in the components tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={3} />);
    
    // Check component examples are rendered
    expect(screen.getByText('Buttons')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Status Indicators')).toBeInTheDocument();
  });

  it('renders form element examples in the forms tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={4} />);
    
    // Check form examples are rendered
    expect(screen.getByText('Text Inputs')).toBeInTheDocument();
    expect(screen.getByText('Select Inputs')).toBeInTheDocument();
    expect(screen.getByText('Toggles & Checkboxes')).toBeInTheDocument();
  });

  it('renders theme information in the theme tab', () => {
    renderWithTheme(<DesignSystemVisualizer initialTab={5} />);
    
    // Check theme information is rendered
    expect(screen.getByText('Theme System')).toBeInTheDocument();
    expect(screen.getByText('Border Radius')).toBeInTheDocument();
    expect(screen.getByText('Animations')).toBeInTheDocument();
    expect(screen.getByText('Font Weights')).toBeInTheDocument();
  });
});