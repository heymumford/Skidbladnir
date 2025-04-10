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
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Divider, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import { MigrationStatus, LogEntry } from '../../types';
import { MigrationService, ErrorDetails } from '../../services';
import { MigrationStatusCard } from './MigrationStatusCard';
import { MigrationOperationLog } from './MigrationOperationLog';
import { DetailedErrorReport } from '../Error/DetailedErrorReport';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`migration-tabpanel-${index}`}
      aria-labelledby={`migration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const MigrationMonitoringDashboard: React.FC = () => {
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Data state
  const [activeMigrations, setActiveMigrations] = useState<MigrationStatus[]>([]);
  const [recentMigrations, setRecentMigrations] = useState<MigrationStatus[]>([]);
  const [selectedMigrationId, setSelectedMigrationId] = useState<string | null>(null);
  const [migrationLogs, setMigrationLogs] = useState<LogEntry[]>([]);
  const [migrationErrors, setMigrationErrors] = useState<ErrorDetails[]>([]);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logPage, setLogPage] = useState<number>(1);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showErrorReport, setShowErrorReport] = useState<boolean>(false);
  
  // Create migration service
  const migrationService = new MigrationService();
  
  // Load initial data
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Auto-refresh data every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      fetchDashboardData(false);
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, selectedMigrationId]);
  
  // Fetch dashboard data
  const fetchDashboardData = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // For development/demo, use mock data
      const mockActiveMigrations = migrationService.getMockMigrationStatuses(1);
      const mockRecentMigrations = migrationService.getMockMigrationStatuses(5).slice(1);
      
      // Add failed migration for error reporting demo
      mockRecentMigrations[0].status = 'failed';
      mockRecentMigrations[0].failedItems = Math.floor(mockRecentMigrations[0].totalItems * 0.3);
      
      setActiveMigrations(mockActiveMigrations);
      setRecentMigrations(mockRecentMigrations);
      
      // If we have a selected migration, fetch its logs and errors
      if (selectedMigrationId) {
        await Promise.all([
          fetchMigrationLogs(selectedMigrationId),
          fetchMigrationErrors(selectedMigrationId)
        ]);
      } else if (mockActiveMigrations.length > 0) {
        // Select the first active migration by default
        setSelectedMigrationId(mockActiveMigrations[0].id);
        await Promise.all([
          fetchMigrationLogs(mockActiveMigrations[0].id),
          fetchMigrationErrors(mockActiveMigrations[0].id)
        ]);
      }
      
      setError(null);
    } catch (err) {
      setError(`Error fetching migration data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Fetch errors for a specific migration
  const fetchMigrationErrors = async (migrationId: string) => {
    try {
      const errors = await migrationService.getErrorDetails(migrationId);
      setMigrationErrors(errors);
      return errors;
    } catch (err) {
      console.error(`Error fetching errors for migration ${migrationId}:`, err);
      return [];
    }
  };
  
  // Fetch logs for a specific migration
  const fetchMigrationLogs = async (migrationId: string) => {
    try {
      // For development/demo, use mock data
      const logs = migrationService.getMockMigrationLogs(migrationId, 50);
      setMigrationLogs(logs);
    } catch (err) {
      console.error(`Error fetching logs for migration ${migrationId}:`, err);
    }
  };
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle view details click
  const handleViewDetails = (migrationId: string) => {
    setSelectedMigrationId(migrationId);
    Promise.all([
      fetchMigrationLogs(migrationId),
      fetchMigrationErrors(migrationId)
    ]);
    setTabValue(1); // Switch to details tab
  };
  
  // Handle view errors click
  const handleViewErrors = (migrationId: string) => {
    setSelectedMigrationId(migrationId);
    fetchMigrationErrors(migrationId);
    setShowErrorReport(true);
  };
  
  // Handle pause migration
  const handlePauseMigration = async (migrationId: string) => {
    try {
      await migrationService.pauseMigration(migrationId);
      await fetchDashboardData();
    } catch (err) {
      setError(`Error pausing migration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Handle resume migration
  const handleResumeMigration = async (migrationId: string) => {
    try {
      await migrationService.resumeMigration(migrationId);
      await fetchDashboardData();
    } catch (err) {
      setError(`Error resuming migration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Handle cancel migration
  const handleCancelMigration = async (migrationId: string) => {
    try {
      await migrationService.cancelMigration(migrationId);
      await fetchDashboardData();
    } catch (err) {
      setError(`Error cancelling migration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchDashboardData();
  };
  
  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoRefresh(event.target.checked);
  };
  
  // Calculate dashboard stats
  const totalMigrations = activeMigrations.length + recentMigrations.length;
  const completedMigrations = [...activeMigrations, ...recentMigrations].filter(
    m => m.status === 'completed'
  ).length;
  const failedMigrations = [...activeMigrations, ...recentMigrations].filter(
    m => m.status === 'failed'
  ).length;
  const inProgressMigrations = [...activeMigrations].filter(
    m => m.status === 'running' || m.status === 'paused'
  ).length;
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Migration Monitoring Dashboard</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={handleAutoRefreshToggle}
                color="primary"
              />
            }
            label="Auto Refresh"
          />
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Dashboard summary stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Total Migrations
              </Typography>
              <Typography variant="h4">
                {totalMigrations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                In Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mr: 1 }}>
                  {inProgressMigrations}
                </Typography>
                <Badge badgeContent={inProgressMigrations} color="primary" sx={{ ml: 1 }}>
                  <AccessTimeIcon color="action" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mr: 1 }}>
                  {completedMigrations}
                </Typography>
                <Badge badgeContent={completedMigrations} color="success" sx={{ ml: 1 }}>
                  <CheckCircleIcon color="success" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Failed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mr: 1 }}>
                  {failedMigrations}
                </Typography>
                <Badge badgeContent={failedMigrations} color="error" sx={{ ml: 1 }}>
                  <ErrorIcon color="error" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Active Migrations" id="migration-tab-0" />
          <Tab 
            label={selectedMigrationId ? `Migration Details (${selectedMigrationId})` : "Migration Details"} 
            id="migration-tab-1" 
            disabled={!selectedMigrationId}
          />
          <Tab label="Migration History" id="migration-tab-2" />
          {migrationErrors.length > 0 && (
            <Tab 
              icon={<ErrorIcon />}
              iconPosition="start"
              label={`Errors (${migrationErrors.length})`} 
              id="migration-tab-3" 
            />
          )}
        </Tabs>
      </Box>
      
      {/* Active Migrations Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          Active Migrations ({activeMigrations.length})
        </Typography>
        
        {activeMigrations.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No active migrations found
            </Typography>
          </Paper>
        ) : (
          activeMigrations.map(migration => (
            <MigrationStatusCard
              key={migration.id}
              migration={migration}
              onPause={handlePauseMigration}
              onResume={handleResumeMigration}
              onCancel={handleCancelMigration}
              onViewDetails={handleViewDetails}
              showControls={true}
            />
          ))
        )}
      </TabPanel>
      
      {/* Migration Details Tab */}
      <TabPanel value={tabValue} index={1}>
        {selectedMigrationId ? (
          <>
            <Typography variant="h6" gutterBottom>
              Migration Details: {selectedMigrationId}
            </Typography>
            
            {/* Display the selected migration's status */}
            {[...activeMigrations, ...recentMigrations]
              .filter(m => m.id === selectedMigrationId)
              .map(migration => (
                <MigrationStatusCard
                  key={migration.id}
                  migration={migration}
                  onPause={handlePauseMigration}
                  onResume={handleResumeMigration}
                  onCancel={handleCancelMigration}
                  showControls={migration.status === 'running' || migration.status === 'paused'}
                />
              ))}
            
            {/* Display the migration logs */}
            <Box sx={{ mb: 3 }}>
              <MigrationOperationLog
                logs={migrationLogs}
                title="Migration Operation Log"
                onPageChange={setLogPage}
                totalLogs={migrationLogs.length}
                currentPage={logPage}
                pageSize={10}
              />
            </Box>
            
            {/* Error summary if there are errors */}
            {migrationErrors.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="error" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ErrorIcon sx={{ mr: 1 }} />
                    Error Summary ({migrationErrors.length})
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setTabValue(3)} // Switch to error details tab
                  >
                    View Detailed Error Report
                  </Button>
                </Box>
                
                <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    This migration has encountered {migrationErrors.length} errors that require attention.
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {migrationErrors.slice(0, 3).map(err => (
                      <Box component="li" key={err.errorId} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{err.component}:</strong> {err.message}
                        </Typography>
                      </Box>
                    ))}
                    {migrationErrors.length > 3 && (
                      <Typography variant="body2">
                        ... and {migrationErrors.length - 3} more errors
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            )}
          </>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a migration to view details
            </Typography>
          </Paper>
        )}
      </TabPanel>
      
      {/* Migration History Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Recent Migrations ({recentMigrations.length})
        </Typography>
        
        {recentMigrations.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No recent migrations found
            </Typography>
          </Paper>
        ) : (
          recentMigrations.map(migration => (
            <Box key={migration.id} sx={{ mb: 3 }}>
              <MigrationStatusCard
                migration={migration}
                onViewDetails={handleViewDetails}
                showControls={false}
              />
              
              {migration.status === 'failed' && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<ReportProblemIcon />}
                    onClick={() => handleViewErrors(migration.id)}
                  >
                    View Error Details
                  </Button>
                </Box>
              )}
            </Box>
          ))
        )}
      </TabPanel>
      
      {/* Error Details Tab */}
      <TabPanel value={tabValue} index={3}>
        {selectedMigrationId && migrationErrors.length > 0 ? (
          <DetailedErrorReport
            migrationId={selectedMigrationId}
            errors={migrationErrors}
            maxHeight="70vh"
          />
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No errors to display
            </Typography>
          </Paper>
        )}
      </TabPanel>
    </Box>
  );
};