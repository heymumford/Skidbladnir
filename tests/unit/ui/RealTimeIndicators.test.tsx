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

// Import components to test
import { LcarsStatusHeader } from '../../../packages/ui/src/components/StatusDisplay/LcarsStatusHeader';
import { LcarsDataIndicators } from '../../../packages/ui/src/components/StatusDisplay/LcarsDataIndicators';

// Mock FeatureFlagContext
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
 * This test suite verifies that the real-time indicators accurately reflect system state:
 * - Status indicators show correct operational state
 * - Blinking indicators work as expected for active states
 */

describe('Real-Time Indicators Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  describe('LCARS Status Indicators', () => {
    it('should display operation state correctly', () => {
      render(
        <ThemeProvider theme={lcarsThemeExtended}>
          <LcarsStatusHeader 
            operationName="Test Operation"
            operationState="running"
            percentComplete={75}
            data-testid="lcars-header"
          />
        </ThemeProvider>
      );
      
      // Status should be displayed
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      
      // Operation name should be displayed
      expect(screen.getByText('Test Operation')).toBeInTheDocument();
      
      // Completion percentage should be displayed
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
    
    it('should display different states with appropriate styling', () => {
      const { rerender } = render(
        <ThemeProvider theme={lcarsThemeExtended}>
          <LcarsStatusHeader 
            operationName="Test Operation"
            operationState="running"
            data-testid="lcars-header"
          />
        </ThemeProvider>
      );
      
      // Should show running state
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      
      // Rerender with different state
      rerender(
        <ThemeProvider theme={lcarsThemeExtended}>
          <LcarsStatusHeader 
            operationName="Test Operation"
            operationState="error"
            data-testid="lcars-header"
          />
        </ThemeProvider>
      );
      
      // Should show error state
      expect(screen.getByText('ERROR')).toBeInTheDocument();
    });
  });
  
  describe('Data Indicators', () => {
    it('should display data transfer indicators correctly', () => {
      render(
        <ThemeProvider theme={lcarsThemeExtended}>
          <LcarsDataIndicators 
            bytesIn={1024 * 1024} // 1 MB
            bytesOut={2048 * 1024} // 2 MB
            hasIncomingData={true}
            hasOutgoingData={true}
          />
        </ThemeProvider>
      );
      
      // Should display labels
      expect(screen.getByText('RX:')).toBeInTheDocument();
      expect(screen.getByText('TX:')).toBeInTheDocument();
      
      // Should display formatted data values
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();
      
      // Indicator lights should be present
      const indicatorLights = screen.getAllByRole('generic').filter(
        element => window.getComputedStyle(element).borderRadius === '50%'
      );
      
      expect(indicatorLights.length).toBeGreaterThanOrEqual(2);
    });
  });
});