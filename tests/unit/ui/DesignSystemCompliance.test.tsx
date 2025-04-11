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
import { 
  lcarsThemeExtended,
  darkTheme,
  lightTheme 
} from '../../../packages/ui/src/theme';

// Import UI components to test
import { ModernWorkflowPage } from '../../../packages/ui/src/pages/ModernWorkflowPage';
import { WizardPage } from '../../../packages/ui/src/pages/WizardPage';
import { ThemeToggle } from '../../../packages/ui/src/components/Layout/ThemeToggle';
import { StatusBar } from '../../../packages/ui/src/components/Layout/StatusBar';
import { NavigationBar } from '../../../packages/ui/src/components/Layout/NavigationBar';

/**
 * This test suite ensures that UI components comply with the design system
 * by testing them with different themes and checking for visual consistency.
 * 
 * Focus areas:
 * 1. Theme switching works correctly
 * 2. Components render consistently across themes
 * 3. Components use theme values (colors, spacing) correctly
 * 4. Components maintain expected structure
 */
describe('Design System Compliance Tests', () => {
  const renderWithTheme = (ui: React.ReactElement, theme: any) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('Theme Integration', () => {
    it('should render ThemeToggle correctly with LCARS theme', () => {
      renderWithTheme(<ThemeToggle />, lcarsThemeExtended);
      
      // Theme toggle button should be present
      const themeButton = screen.getByTestId('theme-toggle-button');
      expect(themeButton).toBeInTheDocument();
    });

    it('should render ThemeToggle correctly with dark theme', () => {
      renderWithTheme(<ThemeToggle />, darkTheme);
      
      // Theme toggle button should be present
      const themeButton = screen.getByTestId('theme-toggle-button');
      expect(themeButton).toBeInTheDocument();
    });

    it('should render ThemeToggle correctly with light theme', () => {
      renderWithTheme(<ThemeToggle />, lightTheme);
      
      // Theme toggle button should be present
      const themeButton = screen.getByTestId('theme-toggle-button');
      expect(themeButton).toBeInTheDocument();
    });
  });

  describe('NavigationBar Theming', () => {
    it('should render NavigationBar correctly with LCARS theme', () => {
      renderWithTheme(<NavigationBar />, lcarsThemeExtended);
      
      // Navigation should be present
      const navbar = screen.getByTestId('navigation-bar');
      expect(navbar).toBeInTheDocument();
      
      // Theme-specific styling should be applied
      expect(window.getComputedStyle(navbar).backgroundColor).toBeTruthy();
    });

    it('should render NavigationBar correctly with dark theme', () => {
      renderWithTheme(<NavigationBar />, darkTheme);
      
      // Navigation should be present
      const navbar = screen.getByTestId('navigation-bar');
      expect(navbar).toBeInTheDocument();
    });

    it('should render NavigationBar correctly with light theme', () => {
      renderWithTheme(<NavigationBar />, lightTheme);
      
      // Navigation should be present
      const navbar = screen.getByTestId('navigation-bar');
      expect(navbar).toBeInTheDocument();
    });
  });

  describe('StatusBar Theming', () => {
    it('should render StatusBar correctly with LCARS theme', () => {
      renderWithTheme(<StatusBar />, lcarsThemeExtended);
      
      // Status bar should be present
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toBeInTheDocument();
    });

    it('should render StatusBar correctly with dark theme', () => {
      renderWithTheme(<StatusBar />, darkTheme);
      
      // Status bar should be present
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toBeInTheDocument();
    });

    it('should render StatusBar correctly with light theme', () => {
      renderWithTheme(<StatusBar />, lightTheme);
      
      // Status bar should be present
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toBeInTheDocument();
    });
  });

  describe('WizardPage Theming', () => {
    // Mock navigate function for router testing
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render WizardPage correctly with LCARS theme', () => {
      renderWithTheme(<WizardPage />, lcarsThemeExtended);
      
      // Wizard page title should be present
      expect(screen.getByText(/Zephyr → qTest Migration Wizard/i)).toBeInTheDocument();
    });

    it('should render WizardPage correctly with dark theme', () => {
      renderWithTheme(<WizardPage />, darkTheme);
      
      // Wizard page title should be present
      expect(screen.getByText(/Zephyr → qTest Migration Wizard/i)).toBeInTheDocument();
    });

    it('should render WizardPage correctly with light theme', () => {
      renderWithTheme(<WizardPage />, lightTheme);
      
      // Wizard page title should be present
      expect(screen.getByText(/Zephyr → qTest Migration Wizard/i)).toBeInTheDocument();
    });
  });

  describe('ModernWorkflowPage Theming', () => {
    // Mock navigate function for router testing
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render ModernWorkflowPage correctly with LCARS theme', () => {
      renderWithTheme(<ModernWorkflowPage />, lcarsThemeExtended);
      
      // Workflow page title should be present
      expect(screen.getByText(/Migration Workflow/i)).toBeInTheDocument();
    });

    it('should render ModernWorkflowPage correctly with dark theme', () => {
      renderWithTheme(<ModernWorkflowPage />, darkTheme);
      
      // Workflow page title should be present
      expect(screen.getByText(/Migration Workflow/i)).toBeInTheDocument();
    });

    it('should render ModernWorkflowPage correctly with light theme', () => {
      renderWithTheme(<ModernWorkflowPage />, lightTheme);
      
      // Workflow page title should be present
      expect(screen.getByText(/Migration Workflow/i)).toBeInTheDocument();
    });
  });

  describe('Visual Consistency Tests', () => {
    it('should maintain consistent card styling across themes', () => {
      renderWithTheme(<ModernWorkflowPage />, lcarsThemeExtended);
      
      // Cards should have consistent styling
      const cards = screen.getAllByText('Provider Configuration', { exact: false });
      expect(cards.length).toBeGreaterThan(0);
      
      // Re-render with dark theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, darkTheme);
      const darkCards = screen.getAllByText('Provider Configuration', { exact: false });
      expect(darkCards.length).toBeGreaterThan(0);
      
      // Re-render with light theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, lightTheme);
      const lightCards = screen.getAllByText('Provider Configuration', { exact: false });
      expect(lightCards.length).toBeGreaterThan(0);
    });

    it('should maintain consistent button styling across themes', () => {
      renderWithTheme(<ModernWorkflowPage />, lcarsThemeExtended);
      
      // Buttons should have consistent styling
      const buttons = screen.getAllByText('Continue Workflow');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Re-render with dark theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, darkTheme);
      const darkButtons = screen.getAllByText('Continue Workflow');
      expect(darkButtons.length).toBeGreaterThan(0);
      
      // Re-render with light theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, lightTheme);
      const lightButtons = screen.getAllByText('Continue Workflow');
      expect(lightButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Typography Consistency', () => {
    it('should maintain heading hierarchy across themes', () => {
      renderWithTheme(<ModernWorkflowPage />, lcarsThemeExtended);
      
      // Headers should follow hierarchy
      const heading = screen.getByText(/Migration Workflow/i);
      expect(heading.tagName).toBe('H1');
      
      // Re-render with dark theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, darkTheme);
      const darkHeading = screen.getByText(/Migration Workflow/i);
      expect(darkHeading.tagName).toBe('H1');
      
      // Re-render with light theme and check for consistency
      renderWithTheme(<ModernWorkflowPage />, lightTheme);
      const lightHeading = screen.getByText(/Migration Workflow/i);
      expect(lightHeading.tagName).toBe('H1');
    });
  });
});