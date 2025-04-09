import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationBar } from './NavigationBar';
import { MemoryRouter } from 'react-router-dom';

// Mock useLocation hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/providers'
  })
}));

describe('NavigationBar', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    );
  };

  it('renders the app logo and title', () => {
    renderWithRouter(<NavigationBar />);
    expect(screen.getByAltText('Skíðblaðnir Logo')).toBeInTheDocument();
    expect(screen.getByText('Skíðblaðnir')).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    renderWithRouter(<NavigationBar />);
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Mapping')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights the current active tab', () => {
    renderWithRouter(<NavigationBar />);
    
    // Providers tab should be active based on the mocked path
    const providersTab = screen.getByText('Providers').closest('[role="tab"]');
    expect(providersTab).toHaveAttribute('aria-selected', 'true');
    
    // Other tabs should not be active
    const mappingTab = screen.getByText('Mapping').closest('[role="tab"]');
    expect(mappingTab).toHaveAttribute('aria-selected', 'false');
  });

  it('displays status indicators', () => {
    renderWithRouter(<NavigationBar />);
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
  });

  it('opens settings menu when settings button is clicked', () => {
    renderWithRouter(<NavigationBar />);
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-menu')).toBeInTheDocument();
  });
});