import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

// Mock child components
jest.mock('./NavigationBar', () => ({
  NavigationBar: () => <div data-testid="navigation-bar">Navigation Bar</div>
}));

jest.mock('./ActivityLog', () => ({
  ActivityLog: () => <div data-testid="activity-log">Activity Log</div>
}));

jest.mock('./StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>
}));

describe('AppLayout', () => {
  it('renders the main layout components', () => {
    render(
      <AppLayout>
        <div data-testid="main-content">Main Content</div>
      </AppLayout>
    );

    // Check that all layout components are rendered
    expect(screen.getByTestId('navigation-bar')).toBeInTheDocument();
    expect(screen.getByTestId('activity-log')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders the main content in the workspace area', () => {
    render(
      <AppLayout>
        <div data-testid="main-content">Main Content</div>
      </AppLayout>
    );

    // Check that main content is rendered within the main workspace
    const mainWorkspace = screen.getByTestId('main-workspace');
    expect(mainWorkspace).toContainElement(screen.getByTestId('main-content'));
  });

  it('applies the correct layout structure', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Check layout structure
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer.firstChild).toHaveAttribute('data-testid', 'navigation-bar');
    
    const contentContainer = screen.getByTestId('content-container');
    expect(contentContainer).toBeInTheDocument();
    
    expect(screen.getByTestId('main-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('activity-log')).toBeInTheDocument();
    
    expect(appContainer.lastChild).toHaveAttribute('data-testid', 'status-bar');
  });
});