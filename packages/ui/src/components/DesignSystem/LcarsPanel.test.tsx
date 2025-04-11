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
import { ThemeProvider } from '@mui/material/styles';
import { LcarsPanel, LcarsPanelGrid } from './LcarsPanel';
import { Typography } from '@mui/material';
import { ThemeProvider as CustomThemeProvider } from '../../theme/ThemeContext';
import { lcarsThemeExtended } from '../../theme/lcarsTheme';
import { darkTheme } from '../../theme/darkTheme';
import { lightTheme } from '../../theme/lightTheme';

describe('LcarsPanel', () => {
  const renderWithTheme = (component: React.ReactElement, theme = lcarsThemeExtended) => {
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  const renderWithMultipleThemes = (component: React.ReactElement) => {
    return (
      <CustomThemeProvider>
        {component}
      </CustomThemeProvider>
    );
  };

  const defaultProps = {
    title: 'Test Panel',
    children: <div>Panel content</div>
  };

  it('renders with required props', () => {
    renderWithTheme(<LcarsPanel {...defaultProps} />);
    
    expect(screen.getByTestId('lcars-panel')).toBeInTheDocument();
    expect(screen.getByTestId('lcars-panel-title')).toHaveTextContent('Test Panel');
    expect(screen.getByTestId('lcars-panel-content')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders with all optional props', () => {
    renderWithTheme(
      <LcarsPanel
        {...defaultProps}
        subtitle="Test Subtitle"
        status="Active"
        statusColor="success"
        statusActive={true}
        color="secondary"
        data-testid="custom-panel"
      />
    );
    
    expect(screen.getByTestId('custom-panel')).toBeInTheDocument();
    expect(screen.getByTestId('custom-panel-title')).toHaveTextContent('Test Panel');
    expect(screen.getByTestId('custom-panel-subtitle')).toHaveTextContent('Test Subtitle');
    expect(screen.getByTestId('custom-panel-status-chip')).toHaveTextContent('Active');
    expect(screen.getByTestId('custom-panel-status-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('custom-panel-header')).toBeInTheDocument();
  });

  it('renders correctly with different colors', () => {
    const { rerender } = renderWithTheme(
      <LcarsPanel {...defaultProps} color="primary" />
    );
    
    expect(screen.getByTestId('lcars-panel-header')).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsPanel {...defaultProps} color="secondary" />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('lcars-panel-header')).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsPanel {...defaultProps} color="error" />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('lcars-panel-header')).toBeInTheDocument();
  });

  it('renders correctly with lcars theme', () => {
    renderWithTheme(
      <LcarsPanel {...defaultProps} />,
      lcarsThemeExtended
    );
    
    const panel = screen.getByTestId('lcars-panel');
    const header = screen.getByTestId('lcars-panel-header');
    
    expect(panel).toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });

  it('renders correctly with dark theme', () => {
    renderWithTheme(
      <LcarsPanel {...defaultProps} />,
      darkTheme
    );
    
    const panel = screen.getByTestId('lcars-panel');
    const header = screen.getByTestId('lcars-panel-header');
    
    expect(panel).toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });

  it('renders correctly with light theme', () => {
    renderWithTheme(
      <LcarsPanel {...defaultProps} />,
      lightTheme
    );
    
    const panel = screen.getByTestId('lcars-panel');
    const header = screen.getByTestId('lcars-panel-header');
    
    expect(panel).toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });
});

describe('LcarsPanelGrid', () => {
  it('renders multiple panels in a grid', () => {
    render(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsPanelGrid>
          <LcarsPanel title="Panel 1" data-testid="panel-1">
            <div>Content 1</div>
          </LcarsPanel>
          <LcarsPanel title="Panel 2" data-testid="panel-2">
            <div>Content 2</div>
          </LcarsPanel>
        </LcarsPanelGrid>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('lcars-panel-grid')).toBeInTheDocument();
    expect(screen.getByTestId('lcars-panel-grid-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('lcars-panel-grid-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('panel-1')).toBeInTheDocument();
    expect(screen.getByTestId('panel-2')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('renders with custom spacing', () => {
    render(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsPanelGrid spacing={5} data-testid="custom-grid">
          <LcarsPanel title="Panel 1">
            <div>Content 1</div>
          </LcarsPanel>
        </LcarsPanelGrid>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('custom-grid')).toBeInTheDocument();
    expect(screen.getByTestId('custom-grid-item-0')).toBeInTheDocument();
  });
});