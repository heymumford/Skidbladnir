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
import { 
  lcarsThemeExtended,
  darkTheme,
  lightTheme 
} from '../../../packages/ui/src/theme';
import { LcarsPanel, LcarsPanelGrid } from '../../../packages/ui/src/components/DesignSystem/LcarsPanel';
import { LcarsDashboard } from '../../../packages/ui/src/components/DesignSystem/LcarsDashboard';
import { validateColorContrast } from '../../../packages/ui/src/utils/designSystem';

/**
 * This test suite ensures that LCARS components adhere to design system principles
 * Ensuring a beautiful and elegant UI that's consistent across themes
 */
describe('LCARS Components Design System Compliance Tests', () => {
  const renderWithTheme = (ui: React.ReactElement, theme: any) => {
    return render(
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('LcarsPanel Design System Compliance', () => {
    it('maintains consistent UI structure across themes', () => {
      // Test with LCARS theme
      const { rerender } = renderWithTheme(
        <LcarsPanel 
          title="Test Panel"
          subtitle="Test Subtitle"
          status="Active"
          statusColor="success"
        >
          <div data-testid="panel-content">Content</div>
        </LcarsPanel>,
        lcarsThemeExtended
      );
      
      // Check basic structure with LCARS theme
      let panel = screen.getByTestId('lcars-panel');
      let header = screen.getByTestId('lcars-panel-header');
      let title = screen.getByTestId('lcars-panel-title');
      let subtitle = screen.getByTestId('lcars-panel-subtitle');
      let content = screen.getByTestId('lcars-panel-content');
      
      expect(panel).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Panel');
      expect(subtitle).toHaveTextContent('Test Subtitle');
      expect(content).toContainElement(screen.getByTestId('panel-content'));
      
      // Test with dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <LcarsPanel 
            title="Test Panel"
            subtitle="Test Subtitle"
            status="Active"
            statusColor="success"
          >
            <div data-testid="panel-content">Content</div>
          </LcarsPanel>
        </ThemeProvider>
      );
      
      // Check structure is maintained with dark theme
      panel = screen.getByTestId('lcars-panel');
      header = screen.getByTestId('lcars-panel-header');
      title = screen.getByTestId('lcars-panel-title');
      subtitle = screen.getByTestId('lcars-panel-subtitle');
      content = screen.getByTestId('lcars-panel-content');
      
      expect(panel).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Panel');
      expect(subtitle).toHaveTextContent('Test Subtitle');
      expect(content).toContainElement(screen.getByTestId('panel-content'));
      
      // Test with light theme
      rerender(
        <ThemeProvider theme={lightTheme}>
          <LcarsPanel 
            title="Test Panel"
            subtitle="Test Subtitle"
            status="Active"
            statusColor="success"
          >
            <div data-testid="panel-content">Content</div>
          </LcarsPanel>
        </ThemeProvider>
      );
      
      // Check structure is maintained with light theme
      panel = screen.getByTestId('lcars-panel');
      header = screen.getByTestId('lcars-panel-header');
      title = screen.getByTestId('lcars-panel-title');
      subtitle = screen.getByTestId('lcars-panel-subtitle');
      content = screen.getByTestId('lcars-panel-content');
      
      expect(panel).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Panel');
      expect(subtitle).toHaveTextContent('Test Subtitle');
      expect(content).toContainElement(screen.getByTestId('panel-content'));
    });
    
    it('handles all color variants correctly', () => {
      // Render panels with different colors
      renderWithTheme(
        <>
          <LcarsPanel title="Primary Panel" color="primary" data-testid="primary-panel">Content</LcarsPanel>
          <LcarsPanel title="Secondary Panel" color="secondary" data-testid="secondary-panel">Content</LcarsPanel>
          <LcarsPanel title="Info Panel" color="info" data-testid="info-panel">Content</LcarsPanel>
          <LcarsPanel title="Warning Panel" color="warning" data-testid="warning-panel">Content</LcarsPanel>
          <LcarsPanel title="Error Panel" color="error" data-testid="error-panel">Content</LcarsPanel>
          <LcarsPanel title="Success Panel" color="success" data-testid="success-panel">Content</LcarsPanel>
        </>,
        lcarsThemeExtended
      );
      
      // Verify all color variants are rendered correctly
      expect(screen.getByTestId('primary-panel')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-panel')).toBeInTheDocument();
      expect(screen.getByTestId('info-panel')).toBeInTheDocument();
      expect(screen.getByTestId('warning-panel')).toBeInTheDocument();
      expect(screen.getByTestId('error-panel')).toBeInTheDocument();
      expect(screen.getByTestId('success-panel')).toBeInTheDocument();
      
      // Check headers have unique styling
      const primaryHeader = screen.getByTestId('primary-panel-header');
      const secondaryHeader = screen.getByTestId('secondary-panel-header');
      const errorHeader = screen.getByTestId('error-panel-header');
      
      // Note: We can't check exact colors in Jest DOM, but we can verify elements exist
      expect(primaryHeader).toBeInTheDocument();
      expect(secondaryHeader).toBeInTheDocument();
      expect(errorHeader).toBeInTheDocument();
    });
    
    it('maintains layout when status indicators are present', () => {
      renderWithTheme(
        <LcarsPanel 
          title="Status Panel"
          status="Critical"
          statusColor="error"
          statusActive={true}
          data-testid="status-panel"
        >
          Content
        </LcarsPanel>,
        lcarsThemeExtended
      );
      
      // Verify status elements are present
      const panel = screen.getByTestId('status-panel');
      const statusContainer = screen.getByTestId('status-panel-status-container');
      const statusIndicator = screen.getByTestId('status-panel-status-indicator');
      const statusChip = screen.getByTestId('status-panel-status-chip');
      
      expect(panel).toBeInTheDocument();
      expect(statusContainer).toBeInTheDocument();
      expect(statusIndicator).toBeInTheDocument();
      expect(statusChip).toBeInTheDocument();
      expect(statusChip).toHaveTextContent('Critical');
    });
  });
  
  describe('LcarsPanelGrid Design System Compliance', () => {
    it('maintains grid layout across themes', () => {
      // Test with LCARS theme
      const { rerender } = renderWithTheme(
        <LcarsPanelGrid data-testid="panel-grid">
          <LcarsPanel title="Panel 1" data-testid="grid-panel-1">Content 1</LcarsPanel>
          <LcarsPanel title="Panel 2" data-testid="grid-panel-2">Content 2</LcarsPanel>
        </LcarsPanelGrid>,
        lcarsThemeExtended
      );
      
      // Check grid structure with LCARS theme
      let grid = screen.getByTestId('panel-grid');
      let gridItem0 = screen.getByTestId('panel-grid-item-0');
      let gridItem1 = screen.getByTestId('panel-grid-item-1');
      let panel1 = screen.getByTestId('grid-panel-1');
      let panel2 = screen.getByTestId('grid-panel-2');
      
      expect(grid).toBeInTheDocument();
      expect(gridItem0).toContainElement(panel1);
      expect(gridItem1).toContainElement(panel2);
      
      // Test with dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <LcarsPanelGrid data-testid="panel-grid">
            <LcarsPanel title="Panel 1" data-testid="grid-panel-1">Content 1</LcarsPanel>
            <LcarsPanel title="Panel 2" data-testid="grid-panel-2">Content 2</LcarsPanel>
          </LcarsPanelGrid>
        </ThemeProvider>
      );
      
      // Check grid structure is maintained with dark theme
      grid = screen.getByTestId('panel-grid');
      gridItem0 = screen.getByTestId('panel-grid-item-0');
      gridItem1 = screen.getByTestId('panel-grid-item-1');
      panel1 = screen.getByTestId('grid-panel-1');
      panel2 = screen.getByTestId('grid-panel-2');
      
      expect(grid).toBeInTheDocument();
      expect(gridItem0).toContainElement(panel1);
      expect(gridItem1).toContainElement(panel2);
    });
  });
  
  describe('LcarsDashboard Design System Compliance', () => {
    it('renders all required sections for a complete dashboard', () => {
      renderWithTheme(
        <LcarsDashboard />,
        lcarsThemeExtended
      );
      
      // Verify all main dashboard sections are present
      expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-status-section')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-summary-card')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-panels')).toBeInTheDocument();
      
      // Verify all panels are present
      expect(screen.getByTestId('lcars-dashboard-statistics-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-resources-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-error-panel')).toBeInTheDocument();
      expect(screen.getByTestId('lcars-dashboard-connection-panel')).toBeInTheDocument();
    });
    
    it('maintains structure across themes', () => {
      // Test with LCARS theme
      const { rerender } = renderWithTheme(
        <LcarsDashboard />,
        lcarsThemeExtended
      );
      
      // Check dashboard renders in LCARS theme
      expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
      
      // Test with dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <LcarsDashboard />
        </ThemeProvider>
      );
      
      // Check dashboard renders in dark theme
      expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
      
      // Test with light theme
      rerender(
        <ThemeProvider theme={lightTheme}>
          <LcarsDashboard />
        </ThemeProvider>
      );
      
      // Check dashboard renders in light theme
      expect(screen.getByTestId('lcars-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
    });
    
    it('uses consistent typography across dashboard', () => {
      renderWithTheme(
        <LcarsDashboard />,
        lcarsThemeExtended
      );
      
      // Check main heading typography
      const mainHeading = screen.getByText('Migration Dashboard');
      expect(mainHeading.tagName).toBe('H4');
      
      // Check panel headings
      expect(screen.getByText('Migration Statistics').tagName).toBe('H2');
      expect(screen.getByText('System Resources').tagName).toBe('H2');
      expect(screen.getByText('Error Log').tagName).toBe('H2');
      expect(screen.getByText('Connection Status').tagName).toBe('H2');
    });
  });
});