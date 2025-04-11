/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme';
import { useDesignSystem } from '../../../packages/ui/src/utils/designSystem';
import { LcarsPanel } from '../../../packages/ui/src/components/DesignSystem/LcarsPanel';
import { LcarsDashboard } from '../../../packages/ui/src/components/DesignSystem/LcarsDashboard';
import { LcarsStatusHeader } from '../../../packages/ui/src/components/StatusDisplay/LcarsStatusHeader';
import { LcarsDataIndicators } from '../../../packages/ui/src/components/StatusDisplay/LcarsDataIndicators';
import { LcarsStatusLight } from '../../../packages/ui/src/components/StatusDisplay/LcarsStatusLight';

/**
 * This test suite verifies that the LCARS-inspired design implementation
 * correctly follows the requirements specified in ADR 0014.
 * 
 * Key aspects being tested:
 * 1. Asymmetric panel design
 * 2. Rounded UI elements
 * 3. Status indicators with blinking lights
 * 4. Distinctive color palette
 * 5. Modular component structure
 */
describe('LCARS Design Implementation Tests', () => {
  const renderWithLcarsTheme = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={lcarsThemeExtended}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  /**
   * Test for Requirement 1: Asymmetric Panel Design
   * Verifies that panels have color blocks along one side to create visual hierarchy
   */
  describe('Asymmetric Panel Design', () => {
    it('renders panels with asymmetric styling', () => {
      renderWithLcarsTheme(
        <LcarsPanel 
          title="Asymmetric Test Panel" 
          status="Active"
          data-testid="asymmetric-panel"
        >
          Content
        </LcarsPanel>
      );

      const panel = screen.getByTestId('asymmetric-panel');
      expect(panel).toBeInTheDocument();

      // Header should be present with the title
      const header = screen.getByTestId('asymmetric-panel-header');
      expect(header).toBeInTheDocument();
      expect(header).toContainElement(screen.getByText('Asymmetric Test Panel'));

      // Panel should have the title positioned correctly for LCARS style
      const title = screen.getByTestId('asymmetric-panel-title');
      const titleStyle = window.getComputedStyle(title);
      expect(titleStyle.marginLeft).not.toBe('0px'); // Should have margin left offset

      // Panel header should have a distinct design
      const headerStyle = window.getComputedStyle(header);
      expect(headerStyle.borderTopLeftRadius).toBeTruthy();
      expect(headerStyle.borderTopRightRadius).toBeTruthy();
    });

    it('maintains asymmetric design with different color schemes', () => {
      renderWithLcarsTheme(
        <>
          <LcarsPanel 
            title="Primary Panel" 
            color="primary"
            data-testid="primary-asymmetric-panel"
          >
            Primary Content
          </LcarsPanel>
          <LcarsPanel 
            title="Secondary Panel" 
            color="secondary"
            data-testid="secondary-asymmetric-panel"
          >
            Secondary Content
          </LcarsPanel>
          <LcarsPanel 
            title="Warning Panel" 
            color="warning"
            data-testid="warning-asymmetric-panel"
          >
            Warning Content
          </LcarsPanel>
        </>
      );

      // Each panel should maintain the asymmetric design regardless of color
      const primaryPanel = screen.getByTestId('primary-asymmetric-panel');
      const secondaryPanel = screen.getByTestId('secondary-asymmetric-panel');
      const warningPanel = screen.getByTestId('warning-asymmetric-panel');

      expect(primaryPanel).toBeInTheDocument();
      expect(secondaryPanel).toBeInTheDocument();
      expect(warningPanel).toBeInTheDocument();

      // Each panel title should have proper positioning
      const primaryTitle = screen.getByTestId('primary-asymmetric-panel-title');
      const secondaryTitle = screen.getByTestId('secondary-asymmetric-panel-title');
      const warningTitle = screen.getByTestId('warning-asymmetric-panel-title');

      // Verify text content
      expect(primaryTitle).toHaveTextContent('Primary Panel');
      expect(secondaryTitle).toHaveTextContent('Secondary Panel');
      expect(warningTitle).toHaveTextContent('Warning Panel');
    });
  });

  /**
   * Test for Requirement 2: Rounded UI Elements
   * Verifies that containers, buttons, and interactive elements have generous border radii
   */
  describe('Rounded UI Elements', () => {
    it('applies rounded corners to panels', () => {
      renderWithLcarsTheme(
        <LcarsPanel 
          title="Rounded Panel" 
          data-testid="rounded-panel"
        >
          Content
        </LcarsPanel>
      );

      const panel = screen.getByTestId('rounded-panel');
      const panelStyle = window.getComputedStyle(panel);
      expect(panelStyle.borderRadius).not.toBe('0px');
      
      // Check for non-zero border radius
      const borderRadius = parseInt(panelStyle.borderRadius, 10);
      expect(borderRadius).toBeGreaterThan(0);
    });

    it('applies rounded corners to status chips', () => {
      renderWithLcarsTheme(
        <LcarsPanel 
          title="Panel with Status" 
          status="Active"
          data-testid="status-rounded-panel"
        >
          Content
        </LcarsPanel>
      );

      const statusChip = screen.getByTestId('status-rounded-panel-status-chip');
      const chipStyle = window.getComputedStyle(statusChip);
      
      // Check for non-zero border radius
      expect(chipStyle.borderRadius).not.toBe('0px');
    });

    it('applies consistent rounding to dashboard elements', () => {
      renderWithLcarsTheme(<LcarsDashboard />);

      // Find various elements in the dashboard
      const dashboard = screen.getByTestId('lcars-dashboard');
      const summaryCard = screen.getByTestId('lcars-dashboard-summary-card');
      
      // Check for rounded elements
      const dashboardStyle = window.getComputedStyle(dashboard);
      const summaryCardStyle = window.getComputedStyle(summaryCard);
      
      expect(dashboardStyle.borderRadius).not.toBe('0px');
      expect(summaryCardStyle.borderRadius).not.toBe('0px');
    });
  });

  /**
   * Test for Requirement 3: Status Indicators
   * Verifies that components include blinking lights and color-coded status elements
   */
  describe('Status Indicators', () => {
    it('renders blinking status indicators', () => {
      renderWithLcarsTheme(
        <LcarsPanel 
          title="Panel with Blinking Status" 
          status="Active"
          statusActive={true}
          data-testid="blinking-panel"
        >
          Content
        </LcarsPanel>
      );

      const statusIndicator = screen.getByTestId('blinking-panel-status-indicator');
      const indicatorStyle = window.getComputedStyle(statusIndicator);
      
      // The animation should be set for active indicators
      expect(indicatorStyle.animation).not.toBe('none');
    });
    
    it('renders LcarsStatusLight with proper blinking effects', () => {
      renderWithLcarsTheme(
        <div data-testid="status-lights-container">
          <LcarsStatusLight state="active" data-testid="active-light" />
          <LcarsStatusLight state="idle" data-testid="idle-light" />
          <LcarsStatusLight state="error" data-testid="error-light" />
          <LcarsStatusLight state="running" data-testid="running-light" />
        </div>
      );
      
      // Active and running lights should have animations
      const activeLight = screen.getByTestId('active-light');
      const runningLight = screen.getByTestId('running-light');
      const idleLight = screen.getByTestId('idle-light');
      
      const activeLightStyle = window.getComputedStyle(activeLight);
      const runningLightStyle = window.getComputedStyle(runningLight);
      const idleLightStyle = window.getComputedStyle(idleLight);
      
      // Active and running states should blink by default
      expect(activeLightStyle.animation).not.toBe('none');
      expect(runningLightStyle.animation).not.toBe('none');
      
      // Idle should not blink by default
      expect(idleLightStyle.animation).toBe('none');
    });

    it('applies different styles to active vs inactive indicators', () => {
      renderWithLcarsTheme(
        <>
          <LcarsPanel 
            title="Active Panel" 
            status="Active"
            statusActive={true}
            data-testid="active-panel"
          >
            Active Content
          </LcarsPanel>
          <LcarsPanel 
            title="Inactive Panel" 
            status="Inactive"
            statusActive={false}
            data-testid="inactive-panel"
          >
            Inactive Content
          </LcarsPanel>
        </>
      );

      const activeIndicator = screen.getByTestId('active-panel-status-indicator');
      const inactiveIndicator = screen.getByTestId('inactive-panel-status-indicator');
      
      const activeStyle = window.getComputedStyle(activeIndicator);
      const inactiveStyle = window.getComputedStyle(inactiveIndicator);
      
      // Should have different animation states
      expect(activeStyle.animation).not.toBe(inactiveStyle.animation);
      
      // Active indicator should have a box shadow
      expect(activeStyle.boxShadow).not.toBe('none');
    });

    it('renders status indicators with proper color coding', () => {
      renderWithLcarsTheme(
        <>
          <LcarsPanel 
            title="Success Panel" 
            status="Success"
            statusColor="success"
            statusActive={true}
            data-testid="success-panel"
          >
            Success Content
          </LcarsPanel>
          <LcarsPanel 
            title="Error Panel" 
            status="Error"
            statusColor="error"
            statusActive={true}
            data-testid="error-panel"
          >
            Error Content
          </LcarsPanel>
          <LcarsPanel 
            title="Warning Panel" 
            status="Warning"
            statusColor="warning"
            statusActive={true}
            data-testid="warning-panel"
          >
            Warning Content
          </LcarsPanel>
        </>
      );

      // Check that each status chip has the correct text
      const successChip = screen.getByTestId('success-panel-status-chip');
      const errorChip = screen.getByTestId('error-panel-status-chip');
      const warningChip = screen.getByTestId('warning-panel-status-chip');
      
      expect(successChip).toHaveTextContent('Success');
      expect(errorChip).toHaveTextContent('Error');
      expect(warningChip).toHaveTextContent('Warning');
    });
  });

  /**
   * Test for Requirement 4: Distinctive Color Palette
   * Verifies that the UI uses the LCARS-specific color scheme
   */
  describe('Distinctive Color Palette', () => {
    it('uses LCARS-specific colors in the UI', () => {
      // Create a component that uses the design system to display theme colors
      const ColorTester = () => {
        const ds = useDesignSystem();
        const isLcars = ds.isLcarsTheme();
        
        return (
          <div data-testid="color-tester">
            <div data-testid="is-lcars">{isLcars ? 'true' : 'false'}</div>
          </div>
        );
      };
      
      renderWithLcarsTheme(<ColorTester />);
      
      // Verify that the LCARS theme is active
      const isLcarsElement = screen.getByTestId('is-lcars');
      expect(isLcarsElement).toHaveTextContent('true');
    });
    
    it('applies LCARS-specific colors to panels', () => {
      renderWithLcarsTheme(
        <>
          <LcarsPanel 
            title="Primary Panel" 
            color="primary"
            data-testid="primary-color-panel"
          >
            Primary Content
          </LcarsPanel>
          <LcarsPanel 
            title="Secondary Panel" 
            color="secondary"
            data-testid="secondary-color-panel"
          >
            Secondary Content
          </LcarsPanel>
        </>
      );
      
      // Check that panels have different header colors
      const primaryHeader = screen.getByTestId('primary-color-panel-header');
      const secondaryHeader = screen.getByTestId('secondary-color-panel-header');
      
      const primaryHeaderStyle = window.getComputedStyle(primaryHeader);
      const secondaryHeaderStyle = window.getComputedStyle(secondaryHeader);
      
      // Colors should be different between panels
      expect(primaryHeaderStyle.backgroundColor).not.toBe(secondaryHeaderStyle.backgroundColor);
    });
  });

  /**
   * Test for Requirement 5: Modular Component Structure
   * Verifies that the UI components are composed together to create complex interfaces
   */
  describe('Modular Component Structure', () => {
    it('composes LcarsStatusHeader within LcarsDashboard', () => {
      renderWithLcarsTheme(<LcarsDashboard />);
      
      // Dashboard should contain the header component
      const dashboard = screen.getByTestId('lcars-dashboard');
      const header = screen.getByTestId('lcars-dashboard-header');
      
      expect(dashboard).toContainElement(header);
    });
    
    it('composes LcarsStatusLight with other components', () => {
      renderWithLcarsTheme(
        <div data-testid="status-composition">
          <div data-testid="status-row">
            <LcarsStatusLight state="active" size="small" />
            <span>Active System</span>
          </div>
          <div data-testid="status-group">
            {['success', 'warning', 'error', 'info'].map((state) => (
              <div key={state} data-testid={`${state}-container`}>
                <LcarsStatusLight 
                  state={state as any} 
                  size="small" 
                  data-testid={`${state}-light`}
                />
                <span>{state}</span>
              </div>
            ))}
          </div>
        </div>
      );
      
      // Verify the components render properly
      const container = screen.getByTestId('status-composition');
      expect(container).toBeInTheDocument();
      
      // Check different status lights
      const successLight = screen.getByTestId('success-light');
      const warningLight = screen.getByTestId('warning-light');
      const errorLight = screen.getByTestId('error-light');
      
      expect(successLight).toBeInTheDocument();
      expect(warningLight).toBeInTheDocument();
      expect(errorLight).toBeInTheDocument();
    });
    
    it('composes multiple panels within a dashboard', () => {
      renderWithLcarsTheme(<LcarsDashboard />);
      
      // Dashboard should contain multiple panels
      const dashboard = screen.getByTestId('lcars-dashboard');
      const panels = screen.getByTestId('lcars-dashboard-panels');
      const statisticsPanel = screen.getByTestId('lcars-dashboard-statistics-panel');
      const resourcesPanel = screen.getByTestId('lcars-dashboard-resources-panel');
      
      expect(dashboard).toContainElement(panels);
      expect(panels).toContainElement(statisticsPanel);
      expect(panels).toContainElement(resourcesPanel);
    });
    
    it('creates complex interfaces from smaller components', () => {
      renderWithLcarsTheme(
        <>
          <LcarsStatusHeader 
            operationName="Migration Process"
            operationState="running"
            percentComplete={45}
            estimatedTimeRemaining={360}
            data-testid="status-header"
          />
          <LcarsDataIndicators 
            bytesIn={1024 * 1024} // 1MB
            bytesOut={512 * 1024} // 512KB
            hasIncomingData={true}
            hasOutgoingData={false}
            data-testid="data-indicators"
          />
        </>
      );
      
      // Check for operation state and name in the status header
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('Migration Process')).toBeInTheDocument();
      
      // Check for completion percentage and ETA in the status header
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('6:00')).toBeInTheDocument();
      
      // Verify data indicators are present
      expect(screen.getByText('RX:')).toBeInTheDocument();
      expect(screen.getByText('TX:')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('512 KB')).toBeInTheDocument();
    });
  });

  /**
   * Additional tests for UI interactions with LCARS components
   */
  describe('LCARS Component Interactions', () => {
    it('handles status changes in LCARS panels', () => {
      const StatusChangeDemo = () => {
        const [isActive, setIsActive] = React.useState(false);
        const [status, setStatus] = React.useState('Inactive');
        const [statusColor, setStatusColor] = React.useState<'error' | 'success'>('error');
        
        const toggleStatus = () => {
          setIsActive(!isActive);
          setStatus(isActive ? 'Inactive' : 'Active');
          setStatusColor(isActive ? 'error' : 'success');
        };
        
        return (
          <div>
            <button 
              onClick={toggleStatus}
              data-testid="toggle-status-button"
            >
              Toggle Status
            </button>
            <LcarsPanel 
              title="Interactive Panel"
              status={status}
              statusColor={statusColor}
              statusActive={isActive}
              data-testid="interactive-panel"
            >
              This panel changes status when clicked
            </LcarsPanel>
          </div>
        );
      };
      
      renderWithLcarsTheme(<StatusChangeDemo />);
      
      // Initial state: inactive
      let statusChip = screen.getByTestId('interactive-panel-status-chip');
      expect(statusChip).toHaveTextContent('Inactive');
      
      // Click the toggle button
      const toggleButton = screen.getByTestId('toggle-status-button');
      fireEvent.click(toggleButton);
      
      // Should now be active
      statusChip = screen.getByTestId('interactive-panel-status-chip');
      expect(statusChip).toHaveTextContent('Active');
      
      // Indicator should now be active
      const statusIndicator = screen.getByTestId('interactive-panel-status-indicator');
      const indicatorStyle = window.getComputedStyle(statusIndicator);
      expect(indicatorStyle.animation).not.toBe('none');
    });
  });
});