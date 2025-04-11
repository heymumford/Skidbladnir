/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { LcarsDashboard } from './LcarsDashboard';
import { lcarsThemeExtended } from '../../theme/lcarsTheme';
import { darkTheme } from '../../theme/darkTheme';
import { lightTheme } from '../../theme/lightTheme';

describe('LcarsDashboard', () => {
  const renderWithTheme = (theme = lcarsThemeExtended) => {
    return render(
      <ThemeProvider theme={theme}>
        <LcarsDashboard />
      </ThemeProvider>
    );
  };

  it('renders the dashboard title', () => {
    renderWithTheme();
    
    const header = screen.getByTestId('lcars-dashboard-header');
    expect(header).toBeInTheDocument();
    expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-time monitoring for Zephyr → qTest migration')).toBeInTheDocument();
  });

  it('renders the action button', () => {
    renderWithTheme();
    
    const actionButton = screen.getByTestId('lcars-dashboard-action-button');
    expect(actionButton).toBeInTheDocument();
    expect(actionButton).toHaveTextContent('Monitor Progress');
  });

  it('renders the status section', () => {
    renderWithTheme();
    
    const statusSection = screen.getByTestId('lcars-dashboard-status-section');
    expect(statusSection).toBeInTheDocument();
    expect(screen.getByText('Migration Status')).toBeInTheDocument();
    
    const statusBox = screen.getByTestId('lcars-dashboard-status-box');
    expect(statusBox).toBeInTheDocument();
    
    const progressBar = screen.getByTestId('lcars-dashboard-progress-bar');
    expect(progressBar).toBeInTheDocument();
    
    const summaryCard = screen.getByTestId('lcars-dashboard-summary-card');
    expect(summaryCard).toBeInTheDocument();
    expect(screen.getByText('Current Migration')).toBeInTheDocument();
    expect(screen.getByText('Zephyr Scale → qTest Manager')).toBeInTheDocument();
  });

  it('renders all LCARS panels', () => {
    renderWithTheme();
    
    const panels = screen.getByTestId('lcars-dashboard-panels');
    expect(panels).toBeInTheDocument();
    
    const statisticsPanel = screen.getByTestId('lcars-dashboard-statistics-panel');
    expect(statisticsPanel).toBeInTheDocument();
    expect(screen.getByText('Migration Statistics')).toBeInTheDocument();
    
    const resourcesPanel = screen.getByTestId('lcars-dashboard-resources-panel');
    expect(resourcesPanel).toBeInTheDocument();
    expect(screen.getByText('System Resources')).toBeInTheDocument();
    
    const errorPanel = screen.getByTestId('lcars-dashboard-error-panel');
    expect(errorPanel).toBeInTheDocument();
    expect(screen.getByText('Error Log')).toBeInTheDocument();
    
    const connectionPanel = screen.getByTestId('lcars-dashboard-connection-panel');
    expect(connectionPanel).toBeInTheDocument();
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
  });

  it('renders with all the numeric statistics', () => {
    renderWithTheme();
    
    // Check for migration stats
    const statisticsPanel = screen.getByTestId('lcars-dashboard-statistics-panel');
    const migratedValue = within(statisticsPanel).getAllByText('328')[0];
    const pendingValue = within(statisticsPanel).getAllByText('72')[0];
    const failedValue = within(statisticsPanel).getAllByText('12')[0];
    
    expect(migratedValue).toBeInTheDocument();
    expect(pendingValue).toBeInTheDocument();
    expect(failedValue).toBeInTheDocument();
    
    // Check for progress percentage
    expect(screen.getByText('80%')).toBeInTheDocument();
    
    // Check for resource usage stats
    const resourcesPanel = screen.getByTestId('lcars-dashboard-resources-panel');
    expect(within(resourcesPanel).getByText('38%')).toBeInTheDocument(); // CPU
    expect(within(resourcesPanel).getByText('62%')).toBeInTheDocument(); // Memory
    expect(within(resourcesPanel).getByText('45%')).toBeInTheDocument(); // Storage
  });

  it('renders with darkTheme', () => {
    renderWithTheme(darkTheme);
    
    // Verify the dashboard renders correctly in dark theme
    expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
  });

  it('renders with lightTheme', () => {
    renderWithTheme(lightTheme);
    
    // Verify the dashboard renders correctly in light theme
    expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
  });

  it('renders error messages', () => {
    renderWithTheme();
    
    // Check that error messages are displayed
    expect(screen.getByText('Failed to extract test data from Zephyr API')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout during attachment upload')).toBeInTheDocument();
    expect(screen.getByText('Invalid test format received from provider')).toBeInTheDocument();
  });

  it('renders connection status items', () => {
    renderWithTheme();
    
    // Check that connection status items are displayed
    expect(screen.getByText('Zephyr Scale API')).toBeInTheDocument();
    expect(screen.getByText('qTest Manager API')).toBeInTheDocument();
    expect(screen.getByText('Binary Processor')).toBeInTheDocument();
    expect(screen.getByText('Orchestrator Service')).toBeInTheDocument();
  });
});