/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../packages/ui/src/i18n';
import { LanguageProvider } from '../../../packages/ui/src/i18n/LanguageProvider';
import { lcarsThemeExtended } from '../../../packages/ui/src/theme/lcarsTheme';
import { BrowserRouter } from 'react-router-dom';
import { EnhancedProviderConfigPage } from '../../../packages/ui/src/pages/EnhancedProviderConfigPage';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the provider service
jest.mock('../../../packages/ui/src/services', () => ({
  providerService: {
    getProviders: jest.fn().mockResolvedValue([
      { id: 'zephyr', name: 'Zephyr Scale', version: '1.0.0', icon: 'zephyr.png' },
      { id: 'qtest', name: 'qTest Manager', version: '1.0.0', icon: 'qtest.png' }
    ]),
    getConnectionConfig: jest.fn((providerId) => {
      if (providerId === 'zephyr') {
        return Promise.resolve({
          providerId: 'zephyr',
          baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
          apiKey: 'sample-key',
          projectKey: 'TEST'
        });
      }
      if (providerId === 'qtest') {
        return Promise.resolve({
          providerId: 'qtest',
          instanceUrl: 'https://mycompany.qtestnet.com',
          apiToken: 'sample-token',
          projectId: '12345'
        });
      }
      return Promise.resolve(null);
    }),
    saveConnection: jest.fn().mockResolvedValue(true),
    testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Connection successful' })
  }
}));

// Mock router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

// Test wrapper component with all required providers
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <ThemeProvider theme={lcarsThemeExtended}>
          {children}
        </ThemeProvider>
      </LanguageProvider>
    </I18nextProvider>
  </BrowserRouter>
);

describe('Enhanced Provider Configuration Page Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible page structure with proper headings and landmarks', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1, name: /Provider Configuration/i });
    expect(mainHeading).toBeInTheDocument();
    
    // Check for secondary headings
    const subHeadings = screen.getAllByRole('heading', { level: 6 });
    expect(subHeadings.length).toBeGreaterThan(0);
    
    // Check for breadcrumb navigation
    const breadcrumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumbs).toBeInTheDocument();
    
    // Check for tab list
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    expect(tabList).toHaveAttribute('aria-label', 'provider configuration tabs');
  });

  it('should have accessible tab panels with correct ARIA attributes', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Get tab elements
    const zephyrTab = screen.getByRole('tab', { name: /Zephyr Scale/i });
    const qTestTab = screen.getByRole('tab', { name: /qTest Manager/i });
    
    // Check ARIA attributes on tabs
    expect(zephyrTab).toHaveAttribute('aria-selected', 'true');
    expect(qTestTab).toHaveAttribute('aria-selected', 'false');
    
    // Check tab panel attributes 
    const activeTabPanel = screen.getByRole('tabpanel');
    expect(activeTabPanel).toBeInTheDocument();
    expect(activeTabPanel).toHaveAttribute('aria-labelledby', zephyrTab.id);
    
    // Check tab navigation
    qTestTab.focus();
    userEvent.click(qTestTab);
    
    await waitFor(() => {
      expect(qTestTab).toHaveAttribute('aria-selected', 'true');
      expect(zephyrTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('should have accessible provider cards with proper interaction patterns', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check that provider cards are accessible
    const providerCards = screen.getAllByRole('heading', { level: 3 });
    expect(providerCards.length).toBeGreaterThan(0);
    
    // Check for accessible buttons within cards
    const configureButtons = screen.getAllByRole('button', { name: /(Configure|Edit Configuration)/i });
    expect(configureButtons.length).toBeGreaterThan(0);
    
    // Test keyboard navigation between cards
    configureButtons[0].focus();
    expect(document.activeElement).toBe(configureButtons[0]);
    userEvent.tab();
    expect(document.activeElement).toBe(configureButtons[1]);
  });

  it('should allow keyboard users to complete the entire configuration workflow', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Navigate to qTest tab using keyboard
    const qTestTab = screen.getByRole('tab', { name: /qTest Manager/i });
    qTestTab.focus();
    userEvent.keyboard('{enter}');
    
    // Verify tab switch worked
    await waitFor(() => {
      expect(qTestTab).toHaveAttribute('aria-selected', 'true');
    });
    
    // Verify the Continue button is accessible and has proper attributes
    const continueButton = screen.getByRole('button', { name: /Continue to Field Mapping/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toHaveAttribute('disabled'); 
    
    // Focus should be managed properly when tabs change
    const zephyrTab = screen.getByRole('tab', { name: /Zephyr Scale/i });
    zephyrTab.focus();
    userEvent.keyboard('{enter}');
    
    await waitFor(() => {
      expect(zephyrTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should handle focus management when showing loading and error states', async () => {
    // Mock loading state
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, jest.fn()]);
    
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Check loading indicator has appropriate ARIA attributes
    const loadingIndicator = screen.getByRole('progressbar');
    expect(loadingIndicator).toBeInTheDocument();
    
    // Unmount and remount with error state
    jest.clearAllMocks();
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => ["Error loading providers", jest.fn()]);
    
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Check error alert has appropriate role and attributes
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Error loading providers');
  });

  it('should have accessible form controls in the provider configuration panels', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check form controls in the Zephyr tab
    const baseUrlInput = screen.getByLabelText(/Base URL/i);
    expect(baseUrlInput).toBeInTheDocument();
    expect(baseUrlInput).toHaveAttribute('aria-invalid', 'false');
    
    // Switch to qTest tab
    const qTestTab = screen.getByRole('tab', { name: /qTest Manager/i });
    userEvent.click(qTestTab);
    
    // Check form controls in the qTest tab
    await waitFor(() => {
      const instanceUrlInput = screen.getByLabelText(/qTest Instance URL/i);
      expect(instanceUrlInput).toBeInTheDocument();
      expect(instanceUrlInput).toHaveAttribute('aria-invalid', 'false');
    });
  });

  it('should provide accessible status indicators for connection state', async () => {
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check that status chips have appropriate roles
    const statusChips = screen.getAllByText(/Configured/i);
    statusChips.forEach(chip => {
      const chipElement = chip.closest('[role]');
      expect(chipElement).toHaveAttribute('role', 'status');
    });
  });

  it('should provide helpful error messages that are accessible to screen readers', async () => {
    // Mock the service to return an error
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs
    
    // Create a custom mock just for this test
    const originalMock = jest.requireMock('../../../packages/ui/src/services');
    const mockProviderService = {
      ...originalMock.providerService,
      getProviders: jest.fn().mockRejectedValue(new Error('Failed to load providers'))
    };
    
    // Replace the mock for this test only
    originalMock.providerService = mockProviderService;
    
    render(
      <TestWrapper>
        <EnhancedProviderConfigPage />
      </TestWrapper>
    );
    
    // Wait for error to be displayed
    await waitFor(() => {
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Failed to load providers');
    });
    
    // Error alert should have appropriate role for screen readers
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'polite');
  });
});