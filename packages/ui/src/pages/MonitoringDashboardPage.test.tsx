/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { MonitoringDashboardPage } from './MonitoringDashboardPage';
import { migrationService } from '../services/MigrationService';

// Mock the services
jest.mock('../services/MigrationService', () => {
  return {
    migrationService: {
      getActiveMigrations: jest.fn(),
      getRecentMigrations: jest.fn(),
      getMigrationStatus: jest.fn(),
      pauseMigration: jest.fn(),
      resumeMigration: jest.fn(),
      cancelMigration: jest.fn()
    }
  };
});

// Mock the MigrationDashboard component
jest.mock('../components/Execution', () => {
  return {
    MigrationDashboard: () => <div data-testid="migration-dashboard">Migration Dashboard Mock</div>
  };
});

// Mock useParams to simulate route parameters
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ migrationId: 'migration-1' }),
  useNavigate: () => jest.fn()
}));

describe('MonitoringDashboardPage', () => {
  const mockActiveMigrations = [
    {
      id: 'migration-1',
      status: 'running',
      progress: 45,
      startTime: new Date().toISOString(),
      totalItems: 1000,
      processedItems: 450,
      failedItems: 5,
      estimatedRemainingTime: 1800 // 30 minutes in seconds
    }
  ];

  const mockRecentMigrations = [
    {
      id: 'migration-2',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      endTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      totalItems: 500,
      processedItems: 500,
      failedItems: 0
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (migrationService.getActiveMigrations as jest.Mock).mockResolvedValue(mockActiveMigrations);
    (migrationService.getRecentMigrations as jest.Mock).mockResolvedValue(mockRecentMigrations);
  });

  it('should render loading state initially', () => {
    render(
      <BrowserRouter>
        <MonitoringDashboardPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading migration data...')).toBeInTheDocument();
  });

  it('should fetch active and recent migrations on load', async () => {
    render(
      <BrowserRouter>
        <MonitoringDashboardPage />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(migrationService.getActiveMigrations).toHaveBeenCalled();
      expect(migrationService.getRecentMigrations).toHaveBeenCalled();
    });
    
    expect(screen.getByText('Migration Monitoring Dashboard')).toBeInTheDocument();
  });

  it('should display tabs for active and recent migrations', async () => {
    render(
      <BrowserRouter>
        <MonitoringDashboardPage />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Active Migrations')).toBeInTheDocument();
      expect(screen.getByText('Recent Migrations')).toBeInTheDocument();
    });
  });

  it('should render the MigrationDashboard component when a migration is selected', async () => {
    render(
      <BrowserRouter>
        <MonitoringDashboardPage />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('migration-dashboard')).toBeInTheDocument();
    });
  });
});