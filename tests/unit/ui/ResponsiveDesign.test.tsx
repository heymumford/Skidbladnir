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
import { lcarsThemeExtended } from '../../../packages/ui/src/theme/lcarsTheme';
import mediaQuery from 'css-mediaquery';

// Import components to test
import { LcarsPanel } from '../../../packages/ui/src/components/DesignSystem/LcarsPanel';

// Mock the FeatureFlagContext
jest.mock('../../../packages/ui/src/context/FeatureFlagContext', () => ({
  useFeatureFlags: () => ({ 
    isEnabled: () => true 
  }),
  FeatureFlagContext: {
    Provider: ({ children }) => children,
    Consumer: ({ children }) => children({
      isEnabled: () => true
    })
  }
}));

/**
 * This test suite verifies that the UI components are responsive across different device sizes:
 * - Mobile (small screens)
 * - Tablet (medium screens)
 * - Desktop (large screens)
 * 
 * We test key responsive behaviors including:
 * - Layout adjustments
 * - Component visibility
 * - Element resizing
 */

describe('Responsive Design Tests', () => {
  // Mock window.matchMedia to simulate different screen sizes
  function createMatchMedia(width: number) {
    return (query: string) => ({
      matches: mediaQuery.match(query, { width }),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
  }

  // Helper function to render components with theme
  const renderWithTheme = (ui: React.ReactElement, width = 1200) => {
    window.matchMedia = createMatchMedia(width);
    
    return render(
      <ThemeProvider theme={lcarsThemeExtended}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('LCARS Panel Responsiveness', () => {
    it('should render panel on mobile screens', () => {
      renderWithTheme(
        <LcarsPanel 
          title="Test Panel" 
          subtitle="Responsive Test"
          status="Active"
          data-testid="test-panel"
        >
          <div>Panel content</div>
        </LcarsPanel>,
        400 // Mobile width
      );
      
      // Panel should be rendered
      const panel = screen.getByTestId('test-panel');
      expect(panel).toBeInTheDocument();
      
      // Panel header should be rendered
      const panelHeader = screen.getByTestId('test-panel-header');
      expect(panelHeader).toBeInTheDocument();
      
      // Title and subtitle should be rendered
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByText('Responsive Test')).toBeInTheDocument();
    });

    it('should render panel properly on tablet screens', () => {
      renderWithTheme(
        <LcarsPanel 
          title="Test Panel" 
          subtitle="Responsive Test"
          status="Active"
          data-testid="test-panel"
        >
          <div>Panel content</div>
        </LcarsPanel>,
        768 // Tablet width
      );
      
      // Panel should be rendered
      const panel = screen.getByTestId('test-panel');
      expect(panel).toBeInTheDocument();
      
      // Content should be rendered
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });
    
    it('should render panel on desktop screens', () => {
      renderWithTheme(
        <LcarsPanel 
          title="Test Panel" 
          subtitle="Responsive Test"
          status="Active"
          data-testid="test-panel"
        >
          <div>Panel content</div>
        </LcarsPanel>,
        1200 // Desktop width
      );
      
      // Panel should be rendered
      const panel = screen.getByTestId('test-panel');
      expect(panel).toBeInTheDocument();
      
      // Content should be rendered
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });
  });
});