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
import { lcarsThemeExtended } from '../theme';
import { ModernWorkflowPage } from './ModernWorkflowPage';

// Mock navigate function for router testing
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ModernWorkflowPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={lcarsThemeExtended}>
          <ModernWorkflowPage />
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders the workflow page with correct title', () => {
    renderPage();
    expect(screen.getByText('Migration Workflow')).toBeInTheDocument();
  });

  it('renders feature cards with correct titles', () => {
    renderPage();
    expect(screen.getByText('Provider Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Migration Wizard')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Dashboard')).toBeInTheDocument();
  });

  it('navigates to Provider Configuration page when the card is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Provider Configuration'));
    expect(mockNavigate).toHaveBeenCalledWith('/providers');
  });

  it('renders the workflow progress stepper with steps', () => {
    renderPage();
    expect(screen.getByText('Migration Workflow Progress')).toBeInTheDocument();
    expect(screen.getByText('Source Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Review & Start')).toBeInTheDocument();
  });

  it('renders the system status panel with metrics', () => {
    renderPage();
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Active operations')).toBeInTheDocument();
    expect(screen.getByText('Success rate')).toBeInTheDocument();
    expect(screen.getByText('Items processed')).toBeInTheDocument();
  });

  it('renders recent activity with tabs', () => {
    renderPage();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('All Activity')).toBeInTheDocument();
    expect(screen.getByText('Migrations')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('switches tabs in recent activity section', () => {
    renderPage();
    
    // By default "All Activity" tab is selected
    expect(screen.getByText('Zephyr Scale connection established successfully')).toBeInTheDocument();
    
    // Switch to Migrations tab
    fireEvent.click(screen.getByText('Migrations'));
    expect(screen.getByText('Field mapping started for migration #12345')).toBeInTheDocument();
    expect(screen.getByText('Migration #12344 completed successfully')).toBeInTheDocument();
    
    // Switch to System tab
    fireEvent.click(screen.getByText('System'));
    expect(screen.getByText('Warning: 3 attachment files exceed size limit')).toBeInTheDocument();
  });

  it('navigates to wizard when continue workflow button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Continue Workflow'));
    expect(mockNavigate).toHaveBeenCalledWith('/wizard');
  });

  it('navigates to monitoring when view details button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('View Details'));
    expect(mockNavigate).toHaveBeenCalledWith('/monitoring');
  });
});