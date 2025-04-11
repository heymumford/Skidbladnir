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
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { ThemeProvider as CustomThemeProvider } from '../theme/ThemeContext';
import { lcarsThemeExtended } from '../theme';
import { DesignSystemPage } from './DesignSystemPage';

// Mock the components to avoid rendering complexity in tests
jest.mock('../components/DesignSystem/DesignSystemVisualizer', () => ({
  DesignSystemVisualizer: () => <div data-testid="design-system-visualizer" />
}));

jest.mock('../components/DesignSystem/LcarsDashboard', () => ({
  LcarsDashboard: () => <div data-testid="lcars-dashboard" />
}));

jest.mock('../components/Layout/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>
}));

describe('DesignSystemPage', () => {
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <CustomThemeProvider>
          <DesignSystemPage />
        </CustomThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders the page title correctly', () => {
    renderPage();
    expect(screen.getByText(/Skíðblaðnir Design System/i)).toBeInTheDocument();
  });

  it('renders the breadcrumb navigation', () => {
    renderPage();
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Use getAllByText to handle multiple matches and find the one in the breadcrumb
    const designSystemLinks = screen.getAllByText(/Design System/i);
    const breadcrumbText = designSystemLinks.find(
      element => element.tagName === 'P' && element.closest('.MuiBreadcrumbs-li')
    );
    expect(breadcrumbText).toBeInTheDocument();
  });

  it('renders the documentation link', () => {
    renderPage();
    const docLink = screen.getByText(/Documentation/i);
    expect(docLink).toBeInTheDocument();
    expect(docLink.closest('a')).toHaveAttribute('href', '/docs/ui/design-system.md');
  });

  it('renders the theme toggle', () => {
    renderPage();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders the design principles cards', () => {
    renderPage();
    
    // Find card headers (they should be h6 elements)
    const consistencyHeader = screen.getAllByText('Consistency')
      .find(el => el.tagName === 'H6');
    const efficiencyHeader = screen.getAllByText('Efficiency')
      .find(el => el.tagName === 'H6');
    const beautyHeader = screen.getAllByText('Beauty')
      .find(el => el.tagName === 'H6');
    
    expect(consistencyHeader).toBeInTheDocument();
    expect(efficiencyHeader).toBeInTheDocument();
    expect(beautyHeader).toBeInTheDocument();
  });

  it('renders the introduction alert', () => {
    renderPage();
    expect(screen.getByText(/Design System Purpose/i)).toBeInTheDocument();
  });

  it('renders the explorer section header', () => {
    renderPage();
    expect(screen.getByText(/Design System Explorer/i)).toBeInTheDocument();
  });

  it('renders tabs for different design system views', () => {
    renderPage();
    expect(screen.getByText('Components & Styles')).toBeInTheDocument();
    expect(screen.getByText('LCARS Dashboard Example')).toBeInTheDocument();
  });

  it('shows the DesignSystemVisualizer by default', () => {
    renderPage();
    expect(screen.getByTestId('design-system-visualizer')).toBeInTheDocument();
    expect(screen.queryByTestId('lcars-dashboard')).not.toBeInTheDocument();
  });

  it('can switch to the LCARS Dashboard tab', () => {
    renderPage();
    
    // Click on the LCARS Dashboard tab
    fireEvent.click(screen.getByText('LCARS Dashboard Example'));
    
    // LCARS Dashboard should be visible and visualizer should be hidden
    expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('design-system-visualizer')).not.toBeInTheDocument();
    
    // Description should be visible
    expect(screen.getByText(/LCARS-inspired Dashboard Example/i)).toBeInTheDocument();
    expect(screen.getByText(/This example showcases how the design system principles/i)).toBeInTheDocument();
  });
});