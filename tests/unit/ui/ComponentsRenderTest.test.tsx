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
import { BrowserRouter } from 'react-router-dom';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme';

// Import all the UI components we want to test
import { LcarsPanel, LcarsPanelGrid } from '../../../packages/ui/src/components/DesignSystem/LcarsPanel';
import { LcarsDashboard } from '../../../packages/ui/src/components/DesignSystem/LcarsDashboard';
import { ThemeToggle } from '../../../packages/ui/src/components/Layout/ThemeToggle';
import { DesignSystemPage } from '../../../packages/ui/src/pages/DesignSystemPage';

/**
 * This test suite validates that all UI components render correctly
 * without errors and with the expected elements.
 * 
 * Each test checks specific rendering requirements for different components.
 */
describe('UI Components Render Correctly', () => {
  // Utility function to render components with theme
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  // Utility function to render components with router and theme
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={lcarsThemeExtended}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('DesignSystem Components', () => {
    it('renders LcarsPanel with all required elements', () => {
      renderWithTheme(
        <LcarsPanel 
          title="Test Panel" 
          subtitle="Panel Subtitle"
          status="Active"
          statusColor="success"
          data-testid="test-panel"
        >
          <div data-testid="panel-content">Panel Content</div>
        </LcarsPanel>
      );
      
      // Check that all parts of the panel are rendered
      expect(screen.getByTestId('test-panel')).toBeInTheDocument();
      expect(screen.getByTestId('test-panel-header')).toBeInTheDocument();
      expect(screen.getByTestId('test-panel-title')).toHaveTextContent('Test Panel');
      expect(screen.getByTestId('test-panel-subtitle')).toHaveTextContent('Panel Subtitle');
      expect(screen.getByTestId('test-panel-status-chip')).toHaveTextContent('Active');
      expect(screen.getByTestId('test-panel-content')).toBeInTheDocument();
      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });

    it('renders LcarsPanelGrid with correct layout', () => {
      renderWithTheme(
        <LcarsPanelGrid data-testid="test-grid">
          <LcarsPanel title="Panel 1" data-testid="grid-panel-1">Panel 1 Content</LcarsPanel>
          <LcarsPanel title="Panel 2" data-testid="grid-panel-2">Panel 2 Content</LcarsPanel>
        </LcarsPanelGrid>
      );
      
      // Check that grid layout is correct
      expect(screen.getByTestId('test-grid')).toBeInTheDocument();
      expect(screen.getByTestId('test-grid-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('test-grid-item-1')).toBeInTheDocument();
      
      // Check that panels are rendered inside grid
      expect(screen.getByTestId('grid-panel-1')).toBeInTheDocument();
      expect(screen.getByTestId('grid-panel-2')).toBeInTheDocument();
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
      expect(screen.getByText('Panel 2 Content')).toBeInTheDocument();
    });

    it('renders LcarsDashboard with all sections', () => {
      renderWithTheme(<LcarsDashboard />);
      
      // Check that all dashboard sections are present
      expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-status-section')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-summary-card')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-panels')).toBeInTheDocument();
      
      // Check that specific panels are present
      expect(screen.getByTestId('lcars-dashboard-statistics-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-resources-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-error-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-connection-panel')).toBeInTheDocument();
      
      // Check important text content
      expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Real-time monitoring/i)).toBeInTheDocument();
      expect(screen.getByText('Migration Statistics')).toBeInTheDocument();
      expect(screen.getByText('Error Log')).toBeInTheDocument();
    });
  });

  describe('Layout Components', () => {
    it('renders ThemeToggle with button and menu', () => {
      renderWithTheme(<ThemeToggle />);
      
      // Check that theme toggle button is present
      const toggleButton = screen.getByTestId('theme-toggle-button');
      expect(toggleButton).toBeInTheDocument();
      
      // Menu should not be visible until clicked
      expect(screen.queryByTestId('theme-menu')).not.toBeInTheDocument();
    });
  });

  describe('Page Components', () => {
    it('renders DesignSystemPage with all sections', () => {
      // Mock components used in the DesignSystemPage
      jest.mock('../../../packages/ui/src/components/DesignSystem/DesignSystemVisualizer', () => ({
        DesignSystemVisualizer: () => <div data-testid="design-system-visualizer" />
      }));
      
      jest.mock('../../../packages/ui/src/components/DesignSystem/LcarsDashboard', () => ({
        LcarsDashboard: () => <div data-testid="lcars-dashboard-mock" />
      }));
      
      renderWithRouter(<DesignSystemPage />);
      
      // Check that page structure is correct
      expect(screen.getByText(/Skíðblaðnir Design System/i)).toBeInTheDocument();
      expect(screen.getByText(/Design System Purpose/i)).toBeInTheDocument();
      
      // Check principle cards
      const consistencyHeader = screen.getAllByText('Consistency')
        .find(el => el.tagName === 'H6');
      const efficiencyHeader = screen.getAllByText('Efficiency')
        .find(el => el.tagName === 'H6');
      const beautyHeader = screen.getAllByText('Beauty')
        .find(el => el.tagName === 'H6');
      
      expect(consistencyHeader).toBeInTheDocument();
      expect(efficiencyHeader).toBeInTheDocument();
      expect(beautyHeader).toBeInTheDocument();
      
      // Check tabs
      expect(screen.getByText('Components & Styles')).toBeInTheDocument();
      expect(screen.getByText('LCARS Dashboard Example')).toBeInTheDocument();
    });
  });
});