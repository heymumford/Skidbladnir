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
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RealTimeDashboardPage } from './RealTimeDashboardPage';

// Mock the components to avoid canvas errors
jest.mock('../components/Monitoring/RealTimeMigrationDashboard', () => ({
  RealTimeMigrationDashboard: ({ migrationId }: { migrationId: string }) => (
    <div data-testid="real-time-dashboard">
      Mock Dashboard for migration: {migrationId}
    </div>
  )
}));

describe('RealTimeDashboardPage', () => {
  it('renders the dashboard page', () => {
    render(
      <MemoryRouter initialEntries={['/monitoring/migration-test-123']}>
        <Routes>
          <Route path="/monitoring/:migrationId" element={<RealTimeDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Check that page heading is rendered
    expect(screen.getByText('Real-Time Migration Dashboard')).toBeInTheDocument();
    
    // Check that breadcrumbs are rendered
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Migrations')).toBeInTheDocument();
    expect(screen.getByText('Migration migration-test-123')).toBeInTheDocument();
    
    // Check that dashboard component is rendered with correct props
    expect(screen.getByTestId('real-time-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Mock Dashboard for migration: migration-test-123')).toBeInTheDocument();
  });
  
  it('uses default migration ID when none is provided', () => {
    render(
      <MemoryRouter initialEntries={['/monitoring']}>
        <RealTimeDashboardPage />
      </MemoryRouter>
    );
    
    // Check that default migration ID is used
    expect(screen.getByText('Mock Dashboard for migration: migration-1')).toBeInTheDocument();
  });
});