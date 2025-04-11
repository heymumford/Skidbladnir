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
  Paper,
  Typography,
  Button,
  Grid,
  Divider,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SyncIcon from '@mui/icons-material/Sync';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PendingIcon from '@mui/icons-material/Pending';
import HistoryIcon from '@mui/icons-material/History';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { ExecutionControlPanel, ExecutionStatus, ExecutionMonitor } from './';
import { ErrorSummaryPanel, ErrorRemediationPanel } from '../Error';
import { migrationService } from '../../services/MigrationService';
import { MigrationStatus, LogEntry } from '../../types';

export interface MigrationMonitoringData {
  status: ExecutionStatus;
  logs: LogEntry[];
  items: MigrationItem[];
  operations: OperationDetails[];
  statistics: MigrationStatistics;
}

interface MigrationItem {
  id: string;
  name: string;
  sourceId: string;
  targetId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  warnings?: string[];
  type: string;
}

interface OperationDetails {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  progress: number;
  dependsOn: string[];
  error?: string;
}

interface MigrationStatistics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageItemSpeed: number; // items per minute
  startTime: Date;
  estimatedCompletion: Date;
  networkRequests: number;
  apiCalls: {
    zephyr: number;
    qtest: number;
    other: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface MigrationHistoryEntry {
  timestamp: Date;
  progress: number;
  itemsCompleted: number;
  speed: number; // items per minute
  errors: number;
  warnings: number;
}

interface MigrationMetric {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface MigrationDashboardProps {
  migrationId: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRestart?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const MigrationDashboard: React.FC<MigrationDashboardProps> = ({
  migrationId,
  onPause,
  onResume,
  onCancel,
  onRestart,
  autoRefresh = true,
  refreshInterval = 5000 // 5 seconds by default
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<ExecutionStatus | null>(null);
  const [monitoringData, setMonitoringData] = useState<MigrationMonitoringData | null>(null);
  const [historyData, setHistoryData] = useState<MigrationHistoryEntry[]>([]);
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [errorExpanded, setErrorExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'details'>('dashboard');
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Load migration data
  const loadMigrationData = async () => {
    try {
      setManualRefreshing(true);
      
      // Fetch migration status
      const status = await migrationService.getMigrationStatus(migrationId);
      
      // Create execution status object
      const executionStatus: ExecutionStatus = {
        state: status.status as any, // MigrationState and ExecutionState are compatible
        progress: status.progress,
        completedItems: status.processedItems,
        totalItems: status.totalItems,
        elapsedTime: getElapsedSeconds(status),
        estimatedTimeRemaining: status.estimatedRemainingTime || 0,
        errors: 0, // Will be updated with error count
        warnings: 0, // Will be updated with warning count
        startTime: status.startTime ? new Date(status.startTime) : undefined,
        endTime: status.endTime ? new Date(status.endTime) : undefined,
        statusMessage: `Migration ${status.status}`
      };
      
      // Fetch error details
      const errors = await migrationService.getErrorDetails(migrationId);
      executionStatus.errors = errors.length;

      // Fetch logs
      const logs = await migrationService.getMigrationLogs(migrationId);
      executionStatus.warnings = logs.filter(log => log.level === 'warn').length;
      
      // Update state
      setMigrationStatus(executionStatus);
      
      // Create monitoring data
      const mockData = generateMockMonitoringData(executionStatus);
      setMonitoringData(mockData);

      // Add current state to history
      const historyEntry: MigrationHistoryEntry = {
        timestamp: new Date(),
        progress: executionStatus.progress,
        itemsCompleted: executionStatus.completedItems,
        speed: mockData.statistics.averageItemSpeed,
        errors: executionStatus.errors,
        warnings: executionStatus.warnings
      };
      
      setHistoryData(prev => {
        // Keep last 20 history entries
        const newHistory = [...prev, historyEntry];
        if (newHistory.length > 20) {
          return newHistory.slice(newHistory.length - 20);
        }
        return newHistory;
      });
      
      setLastRefreshed(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading migration data:', error);
    } finally {
      setManualRefreshing(false);
    }
  };

  // Calculate elapsed time in seconds
  const getElapsedSeconds = (status: MigrationStatus): number => {
    if (!status.startTime) return 0;
    
    const startTime = new Date(status.startTime);
    const endTime = status.endTime ? new Date(status.endTime) : new Date();
    return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  };

  // Format time elapsed
  const formatTimeElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Handle manual refresh button
  const handleRefresh = () => {
    loadMigrationData();
  };

  // Handle error selection
  const handleErrorSelect = (errorId: string) => {
    setSelectedErrorId(errorId);
    setRemediationDialogOpen(true);
  };

  // Close remediation dialog
  const handleCloseRemediationDialog = () => {
    setRemediationDialogOpen(false);
    setSelectedErrorId(null);
  };

  // Apply remediation action
  const handleApplyRemediation = async (errorId: string, remediationId: string) => {
    try {
      // In a real implementation, this would call the migrationService
      console.log(`Applying remediation ${remediationId} for error ${errorId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Refresh data after remediation
      loadMigrationData();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error applying remediation:', error);
      return Promise.reject(error);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && !refreshTimer) {
      // Initial load
      loadMigrationData();
      
      // Set up interval for auto-refresh
      const timer = window.setInterval(() => {
        // Only auto-refresh if migration is active
        if (migrationStatus?.state === 'running' || migrationStatus?.state === 'paused') {
          loadMigrationData();
        }
      }, refreshInterval);
      
      setRefreshTimer(timer);
      
      // Clean up on unmount
      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }
  }, [autoRefresh, refreshInterval]);

  // Clean up refresh timer when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [refreshTimer]);

  // Generate mock monitoring data for development
  const generateMockMonitoringData = (
    status: ExecutionStatus
  ): MigrationMonitoringData => {
    // Generate mock logs
    const logs = [];
    const components = ['MigrationController', 'ZephyrProvider', 'QTestProvider', 'Transformer', 'BinaryProcessor'];
    const levels: Array<'info' | 'warn' | 'error' | 'debug'> = ['info', 'warn', 'error', 'debug'];
    const messageTemplates = [
      'Processing test case {id}',
      'Fetched data from {provider}',
      'Transformed test case {id}',
      'Created test case in target system',
      'Rate limit encountered, retrying after {seconds} seconds',
      'Failed to process test case {id}: {error}',
      'Attachment exceeds size limit: {size}',
      'Network timeout, retrying operation',
      'Authentication refreshed for {provider}'
    ];
    
    for (let i = 0; i < 20; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const component = components[Math.floor(Math.random() * components.length)];
      let message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
      
      // Replace placeholders
      message = message.replace('{id}', `TC-${Math.floor(Math.random() * 1000)}`);
      message = message.replace('{provider}', Math.random() > 0.5 ? 'Zephyr' : 'qTest');
      message = message.replace('{seconds}', Math.floor(Math.random() * 60).toString());
      message = message.replace('{error}', 'API Connection Timeout');
      message = message.replace('{size}', `${Math.floor(Math.random() * 20) + 5}MB`);
      
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60));
      
      logs.push({
        id: `log-${i}`,
        timestamp,
        level,
        message,
        component,
        details: level !== 'info' ? {
          requestId: `req-${Math.floor(Math.random() * 10000)}`,
          statusCode: level === 'error' ? 500 : 429,
          endpoint: '/api/testcases',
          responseBody: {
            error: level === 'error' ? 'Internal Server Error' : 'Rate Limit Exceeded',
            retryAfter: 30
          }
        } : undefined
      });
    }
    
    // Sort logs by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Generate mock items
    const items = [];
    const itemStatuses = ['pending', 'processing', 'completed', 'failed', 'skipped'] as const;
    const itemTypes = ['Test Case', 'Test Cycle', 'Test Execution', 'Attachment'];
    
    for (let i = 0; i < 50; i++) {
      const itemStatus = itemStatuses[Math.floor(Math.random() * itemStatuses.length)];
      const targetId = itemStatus === 'completed' ? `QT-${Math.floor(Math.random() * 1000)}` : undefined;
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - Math.floor(Math.random() * 60));
      
      let endTime;
      if (itemStatus === 'completed' || itemStatus === 'failed' || itemStatus === 'skipped') {
        endTime = new Date(startTime);
        endTime.setSeconds(endTime.getSeconds() + Math.floor(Math.random() * 60) + 10);
      }
      
      items.push({
        id: `item-${i}`,
        name: `${itemTypes[Math.floor(Math.random() * itemTypes.length)]} ${i + 1}`,
        sourceId: `ZE-${Math.floor(Math.random() * 1000)}`,
        targetId,
        status: itemStatus,
        startTime,
        endTime,
        error: itemStatus === 'failed' ? 'API Connection Timeout' : undefined,
        warnings: Math.random() > 0.7 ? ['Field truncated', 'Formatting lost'] : undefined,
        type: itemTypes[Math.floor(Math.random() * itemTypes.length)]
      });
    }
    
    // Generate mock operations
    const operations = [];
    const operationStatuses = ['pending', 'running', 'completed', 'failed', 'skipped'] as const;
    const operationNames = [
      'Fetch Test Cases from Zephyr',
      'Transform Test Cases',
      'Create Test Cases in qTest',
      'Fetch Attachments from Zephyr',
      'Create Attachments in qTest',
      'Map Test Relations',
      'Update Test References',
      'Validate Migrations',
      'Generate Migration Report'
    ];
    
    for (let i = 0; i < operationNames.length; i++) {
      const opStatus = operationStatuses[Math.floor(Math.random() * operationStatuses.length)];
      const progress = opStatus === 'completed' ? 100 : 
                       opStatus === 'pending' || opStatus === 'skipped' ? 0 :
                       Math.floor(Math.random() * 100);
      
      const startTime = opStatus !== 'pending' ? new Date() : undefined;
      if (startTime) {
        startTime.setMinutes(startTime.getMinutes() - Math.floor(Math.random() * 60));
      }
      
      let endTime;
      if (opStatus === 'completed' || opStatus === 'failed' || opStatus === 'skipped') {
        endTime = new Date(startTime!);
        endTime.setMinutes(endTime.getMinutes() + Math.floor(Math.random() * 30));
      }
      
      // Each operation might depend on previous operations
      const dependsOn = [];
      if (i > 0 && Math.random() > 0.3) {
        dependsOn.push(operationNames[i - 1]);
      }
      if (i > 1 && Math.random() > 0.7) {
        dependsOn.push(operationNames[i - 2]);
      }
      
      operations.push({
        id: `op-${i}`,
        name: operationNames[i],
        status: opStatus,
        startTime,
        endTime,
        progress,
        dependsOn,
        error: opStatus === 'failed' ? 'Operation timeout exceeded' : undefined
      });
    }
    
    // Generate mock statistics
    const startTime = status.startTime || new Date();
    startTime.setHours(startTime.getHours() - 1);
    
    const statistics = {
      totalOperations: operationNames.length,
      completedOperations: operations.filter(op => op.status === 'completed').length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      averageItemSpeed: 12.5, // items per minute
      startTime,
      estimatedCompletion: new Date(Date.now() + (status.estimatedTimeRemaining * 1000)),
      networkRequests: 1543,
      apiCalls: {
        zephyr: 895,
        qtest: 648,
        other: 0
      },
      resourceUsage: {
        cpu: 35.2,
        memory: 512.8,
        network: 1.2
      }
    };
    
    return {
      status,
      logs,
      items,
      operations,
      statistics
    };
  };

  // Calculate migration metrics
  const getMigrationMetrics = (): MigrationMetric[] => {
    if (!migrationStatus || !monitoringData) {
      return [];
    }

    // Get item processing speed trend
    const speedTrend = (): { trend: 'up' | 'down' | 'neutral', value: string } => {
      if (historyData.length < 2) {
        return { trend: 'neutral', value: 'N/A' };
      }
      
      const current = historyData[historyData.length - 1].speed;
      const previous = historyData[historyData.length - 2].speed;
      const diff = current - previous;
      
      if (Math.abs(diff) < 0.5) {
        return { trend: 'neutral', value: 'Stable' };
      }
      
      return { 
        trend: diff > 0 ? 'up' : 'down', 
        value: `${Math.abs(diff).toFixed(1)} items/min ${diff > 0 ? 'faster' : 'slower'}`
      };
    };

    const speed = monitoringData.statistics.averageItemSpeed;
    const speedTrendInfo = speedTrend();

    return [
      {
        label: 'Progress',
        value: `${migrationStatus.progress.toFixed(1)}%`,
        icon: <TaskAltIcon />,
        color: 'primary'
      },
      {
        label: 'Items Completed',
        value: `${migrationStatus.completedItems} / ${migrationStatus.totalItems}`,
        icon: <PendingIcon />,
        color: 'info'
      },
      {
        label: 'Processing Speed',
        value: `${speed.toFixed(1)} items/min`,
        icon: <SpeedIcon />,
        color: 'success',
        trend: speedTrendInfo.trend,
        trendValue: speedTrendInfo.value
      },
      {
        label: 'Elapsed Time',
        value: formatTimeElapsed(migrationStatus.elapsedTime),
        icon: <AccessTimeIcon />,
        color: 'primary'
      },
      {
        label: 'Estimated Completion',
        value: migrationStatus.state === 'running' ? 
               monitoringData.statistics.estimatedCompletion.toLocaleTimeString() : 
               'N/A',
        icon: <ScheduleIcon />,
        color: 'secondary'
      },
      {
        label: 'Errors',
        value: migrationStatus.errors,
        icon: <ErrorIcon />,
        color: 'error'
      }
    ];
  };

  // If still loading and no data yet
  if (loading && !migrationStatus) {
    return (
      <Box sx={{ width: '100%', my: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Loading migration data...
        </Typography>
        <LinearProgress sx={{ maxWidth: 600, mx: 'auto' }} />
      </Box>
    );
  }

  // If no migration data found
  if (!migrationStatus) {
    return (
      <Box sx={{ width: '100%', my: 4 }}>
        <Alert severity="warning">
          Migration data not found or could not be loaded.
        </Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  // Calculate metrics
  const metrics = getMigrationMetrics();

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Migration Control Panel */}
      <ExecutionControlPanel
        status={migrationStatus}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onRestart={onRestart}
      />

      {/* View Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant={viewMode === 'dashboard' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setViewMode('dashboard')}
          sx={{ mr: 1 }}
        >
          Dashboard
        </Button>
        <Button
          variant={viewMode === 'details' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setViewMode('details')}
        >
          Detailed View
        </Button>
      </Box>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <>
          {/* Metrics Panel */}
          <Paper sx={{ p: 2, mt: 2, position: 'relative' }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: metricsExpanded ? 2 : 0 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AutoGraphIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Migration Metrics
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {lastRefreshed && (
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                    Last updated: {lastRefreshed.toLocaleTimeString()}
                  </Typography>
                )}
                <IconButton 
                  size="small" 
                  onClick={handleRefresh}
                  disabled={manualRefreshing}
                  sx={{ mr: 1 }}
                >
                  <SyncIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setMetricsExpanded(!metricsExpanded)}
                >
                  {metricsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>
            
            {metricsExpanded && (
              <Grid container spacing={2}>
                {metrics.map(metric => (
                  <Grid item xs={12} sm={6} md={4} key={metric.label}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {metric.icon && (
                            <Box sx={{ 
                              mr: 1,
                              color: metric.color ? `${metric.color}.main` : 'primary.main'
                            }}>
                              {metric.icon}
                            </Box>
                          )}
                          <Typography variant="subtitle2" color="text.secondary">
                            {metric.label}
                          </Typography>
                        </Box>
                        <Typography variant="h5" component="div">
                          {metric.value}
                        </Typography>
                        {metric.trend && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mt: 1, 
                            color: metric.trend === 'up' ? 'success.main' : 
                                  metric.trend === 'down' ? 'error.main' : 'text.secondary'
                          }}>
                            {metric.trend === 'up' ? <TrendingUpIcon fontSize="small" /> : 
                             metric.trend === 'down' ? <TrendingDownIcon fontSize="small" /> : null}
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {metric.trendValue}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          {/* Error Summary - Show when there are errors */}
          {migrationStatus.errors > 0 && (
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2, position: 'relative' }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: errorExpanded ? 2 : 0 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="h6">
                      Error Summary
                    </Typography>
                  </Box>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => setErrorExpanded(!errorExpanded)}
                  >
                    {errorExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                {errorExpanded && (
                  <ErrorSummaryPanel 
                    migrationId={migrationId}
                    autoExpand={true}
                    onErrorSelect={handleErrorSelect}
                  />
                )}
              </Paper>
            </Box>
          )}

          {/* Activity Summary */}
          {monitoringData && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {monitoringData.logs.slice(0, 5).map(log => (
                  <Box
                    key={log.id}
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      borderLeft: `4px solid ${
                        log.level === 'error' ? theme.palette.error.main :
                        log.level === 'warn' ? theme.palette.warning.main :
                        log.level === 'info' ? theme.palette.primary.main :
                        theme.palette.text.secondary
                      }`,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      '&:hover': { boxShadow: 1 }
                    }}
                  >
                    <Typography variant="body2">
                      {log.message}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Chip 
                        size="small" 
                        label={log.component} 
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {log.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  endIcon={<VisibilityIcon />} 
                  onClick={() => setViewMode('details')}
                >
                  View All Activity
                </Button>
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* Detailed View */}
      {viewMode === 'details' && monitoringData && (
        <Box sx={{ mt: 2 }}>
          <ExecutionMonitor
            data={monitoringData}
            onViewItem={item => console.log('View item:', item)}
            onRetryItem={item => console.log('Retry item:', item)}
            onSkipItem={item => console.log('Skip item:', item)}
            onViewOperation={operation => console.log('View operation:', operation)}
            onRetryOperation={operation => console.log('Retry operation:', operation)}
            onSkipOperation={operation => console.log('Skip operation:', operation)}
          />
        </Box>
      )}

      {/* Error Remediation Dialog */}
      <Dialog
        open={remediationDialogOpen}
        onClose={handleCloseRemediationDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Error Remediation
        </DialogTitle>
        <DialogContent>
          {selectedErrorId && (
            <ErrorRemediationPanel
              migrationId={migrationId}
              errorId={selectedErrorId}
              onRemediate={handleApplyRemediation}
              onClose={handleCloseRemediationDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};