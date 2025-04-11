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
import { lcarsThemeExtended } from '../../theme/lcarsTheme';
import { LcarsStatusLight } from './LcarsStatusLight';

describe('LcarsStatusLight Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  it('renders with default props', () => {
    renderWithTheme(<LcarsStatusLight />);
    const light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with custom testid', () => {
    renderWithTheme(<LcarsStatusLight data-testid="custom-light" />);
    const light = screen.getByTestId('custom-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with different states', () => {
    const { rerender } = renderWithTheme(<LcarsStatusLight state="active" />);
    let light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight state="warning" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight state="error" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(<LcarsStatusLight size="small" />);
    let light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight size="medium" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight size="large" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    const { rerender } = renderWithTheme(<LcarsStatusLight color="primary" />);
    let light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight color="amber" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
    
    rerender(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsStatusLight color="red" />
      </ThemeProvider>
    );
    light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    renderWithTheme(<LcarsStatusLight customColor="#FF00FF" />);
    const light = screen.getByTestId('lcars-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with blinking animation when state is active', () => {
    renderWithTheme(<LcarsStatusLight state="active" />);
    const light = screen.getByTestId('lcars-status-light');
    const styles = window.getComputedStyle(light);
    
    // Animation should be applied
    expect(styles.animation).not.toBe('none');
  });

  it('renders without blinking when explicitly disabled', () => {
    renderWithTheme(<LcarsStatusLight state="active" blinking={false} />);
    const light = screen.getByTestId('lcars-status-light');
    const styles = window.getComputedStyle(light);
    
    // Animation should be disabled
    expect(styles.animation).toBe('none');
  });

  it('renders with pulse effect when enabled', () => {
    renderWithTheme(<LcarsStatusLight pulseEffect={true} blinking={false} />);
    const light = screen.getByTestId('lcars-status-light');
    const styles = window.getComputedStyle(light);
    
    // Animation should be applied for pulse
    expect(styles.animation).not.toBe('none');
  });
});