/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs,
  Tab,
  Button,
  Divider,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { MigrationDashboard } from '../components/Execution';
import { RealTimeMigrationDashboard } from '../components/Monitoring';
import { migrationService } from '../services/MigrationService';
import type { MigrationStatus } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tab-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface MigrationInfo {
  id: string;
  name: string;
  status: MigrationStatus;
}

const getMigrationName = (migrationId: string): string => {
  // In a real implementation, this would fetch the migration name from the backend
  // or a more descriptive name from metadata
  return `Migration ${migrationId}`;
};

export const MonitoringDashboardPage: React.FC = () => {
  const { migrationId } = useParams<{ migrationId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [activeMigrations, setActiveMigrations] = useState<MigrationInfo[]>([]);
  const [recentMigrations, setRecentMigrations] = useState<MigrationInfo[]>([]);
  const [selectedMigrationId, setSelectedMigrationId] = useState<string | null>(migrationId || null);
  const [loading, setLoading] = useState(true);

  // Fetch active and recent migrations
  useEffect(() => {
    const fetchMigrations = async () => {
      try {
        setLoading(true);

        // Get active migrations
        const active = await migrationService.getActiveMigrations();
        const activeInfo: MigrationInfo[] = active.map(status => ({
          id: status.id,
          name: getMigrationName(status.id),
          status
        }));

        // Get recent migrations
        const recent = await migrationService.getRecentMigrations();
        const recentInfo: MigrationInfo[] = recent.map(status => ({
          id: status.id,
          name: getMigrationName(status.id),
          status
        }));

        setActiveMigrations(activeInfo);
        setRecentMigrations(recentInfo);

        // If migrationId is not provided, select the first active migration
        if (!migrationId && activeInfo.length > 0) {
          setSelectedMigrationId(activeInfo[0].id);
          navigate(`/monitoring/${activeInfo[0].id}`);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching migrations:', error);
        setLoading(false);
      }
    };

    fetchMigrations();
  }, [migrationId, navigate]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle migration selection
  const handleMigrationSelect = (id: string) => {
    setSelectedMigrationId(id);
    navigate(`/monitoring/${id}`);
  };

  // Handle pause migration
  const handlePauseMigration = async () => {
    if (!selectedMigrationId) return;
    
    try {
      await migrationService.pauseMigration(selectedMigrationId);
      // In a real implementation, you would refetch the migration status
    } catch (error) {
      console.error('Error pausing migration:', error);
    }
  };

  // Handle resume migration
  const handleResumeMigration = async () => {
    if (!selectedMigrationId) return;
    
    try {
      await migrationService.resumeMigration(selectedMigrationId);
      // In a real implementation, you would refetch the migration status
    } catch (error) {
      console.error('Error resuming migration:', error);
    }
  };

  // Handle cancel migration
  const handleCancelMigration = async () => {
    if (!selectedMigrationId) return;
    
    try {
      await migrationService.cancelMigration(selectedMigrationId);
      // In a real implementation, you would refetch the migration status
    } catch (error) {
      console.error('Error cancelling migration:', error);
    }
  };

  // Handle restart (new migration)
  const handleRestartMigration = () => {
    // Navigate to migration configuration page
    navigate('/execution');
  };

  // Get status chip color
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      case 'running': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h4" gutterBottom>
          Migration Monitoring Dashboard
        </Typography>
        <Alert severity="info">Loading migration data...</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Migration Monitoring Dashboard
      </Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="migration tabs">
          <Tab label="Active Migrations" id="monitoring-tab-0" />
          <Tab label="Recent Migrations" id="monitoring-tab-1" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            {activeMigrations.length === 0 ? (
              <Alert severity="info">
                No active migrations found. Start a new migration to monitor its progress.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {activeMigrations.map(migration => (
                  <Paper
                    key={migration.id}
                    elevation={selectedMigrationId === migration.id ? 3 : 1}
                    sx={{
                      p: 2,
                      minWidth: 220,
                      cursor: 'pointer',
                      borderLeft: selectedMigrationId === migration.id ? 
                        `4px solid ${theme.palette.primary.main}` : 'none',
                      '&:hover': { boxShadow: 3 }
                    }}
                    onClick={() => handleMigrationSelect(migration.id)}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {migration.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={migration.status.status.toUpperCase()}
                        color={getStatusColor(migration.status.status)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {migration.status.progress.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            {recentMigrations.length === 0 ? (
              <Alert severity="info">
                No recent migrations found.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {recentMigrations.map(migration => (
                  <Paper
                    key={migration.id}
                    elevation={selectedMigrationId === migration.id ? 3 : 1}
                    sx={{
                      p: 2,
                      minWidth: 220,
                      cursor: 'pointer',
                      borderLeft: selectedMigrationId === migration.id ? 
                        `4px solid ${theme.palette.primary.main}` : 'none',
                      '&:hover': { boxShadow: 3 }
                    }}
                    onClick={() => handleMigrationSelect(migration.id)}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {migration.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={migration.status.status.toUpperCase()}
                        color={getStatusColor(migration.status.status)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {migration.status.progress.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {selectedMigrationId && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            {activeMigrations.find(m => m.id === selectedMigrationId)?.name || 
             recentMigrations.find(m => m.id === selectedMigrationId)?.name || 
             `Migration ${selectedMigrationId}`}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <RealTimeMigrationDashboard
            migrationId={selectedMigrationId}
            onPause={handlePauseMigration}
            onResume={handleResumeMigration}
            onCancel={handleCancelMigration}
            autoRefresh={true}
            refreshInterval={5000}
            simulationMode={true}
          />
        </Box>
      )}
    </Container>
  );
};