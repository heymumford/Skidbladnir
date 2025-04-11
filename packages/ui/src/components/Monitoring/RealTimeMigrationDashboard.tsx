/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Tab,
  Tabs,
  Alert,
  FormControlLabel,
  Switch,
  Stack,
  useTheme
} from '@mui/material';
import { ProgressIndicators } from './ProgressIndicators';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SpeedIcon from '@mui/icons-material/Speed';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import MemoryIcon from '@mui/icons-material/Memory';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CodeIcon from '@mui/icons-material/Code';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import TimelineIcon from '@mui/icons-material/Timeline';

import { MigrationStatus, LogEntry, ExecutionStatus } from '../../types';
import { migrationService, ErrorDetails } from '../../services';
import { OperationDependencyGraph } from './OperationDependencyGraph';
import { OperationTimelineView } from './OperationTimelineView';
import { ResourceUsageMonitor } from './ResourceUsageMonitor';
import { PerformanceMetricsPanel } from './PerformanceMetricsPanel';

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
      id={`real-time-tabpanel-${index}`}
      aria-labelledby={`real-time-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2, pb: 2 }}>{children}</Box>}
    </div>
  );
};

export interface OperationDetail {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
  dependsOn: string[];
  resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
  metadata?: Record<string, any>;
  errors?: ErrorDetails[];
  warnings?: number;
}

export interface MigrationMetrics {
  throughput: number; // items per minute
  responseTime: number; // average API response time in ms
  errorRate: number; // percentage of operations with errors
  successRate: number; // percentage of successful operations
  itemsPerSecond: number;
  apiCallsPerMinute: number;
  networkTraffic: number; // KB/s
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  trend: {
    throughput: 'up' | 'down' | 'stable';
    responseTime: 'up' | 'down' | 'stable';
    errorRate: 'up' | 'down' | 'stable';
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  trendLabel,
  tooltip
}) => {
  const theme = useTheme();
  
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Tooltip title={tooltip || ''} arrow placement="top">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Box sx={{ color: `${color}.main`, display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          </Box>
        </Tooltip>
        
        <Typography variant="h5" component="div">
          {value}
        </Typography>
        
        {trend && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1, 
              color: trend === 'up' ? 
                theme.palette.success.main : 
                trend === 'down' ? 
                  theme.palette.error.main : 
                  theme.palette.text.secondary 
            }}
          >
            {trend === 'up' ? <TrendingUpIcon fontSize="small" /> : 
             trend === 'down' ? <TrendingDownIcon fontSize="small" /> : 
             <TrendingFlatIcon fontSize="small" />}
            
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {trendLabel || (trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export interface RealTimeMigrationDashboardProps {
  migrationId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  simulationMode?: boolean;
}

export const RealTimeMigrationDashboard: React.FC<RealTimeMigrationDashboardProps> = ({
  migrationId,
  autoRefresh = true,
  refreshInterval = 5000,
  onPause,
  onResume,
  onCancel,
  simulationMode = false
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [operations, setOperations] = useState<OperationDetail[]>([]);
  const [metrics, setMetrics] = useState<MigrationMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'detailed'>('standard');
  
  // Fetch migration data
  const fetchMigrationData = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) setLoading(true);
    setManualRefreshing(true);
    
    try {
      // Fetch migration status
      const status = await migrationService.getMigrationStatus(migrationId);
      setMigrationStatus(status);
      
      // Fetch operation details
      const operationDetails = await fetchOperationDetails(migrationId);
      setOperations(operationDetails);
      
      // Fetch logs
      const logEntries = await migrationService.getMigrationLogs(migrationId, 50);
      setLogs(logEntries);
      
      // Calculate metrics
      const calculatedMetrics = calculateMetrics(status, operationDetails, logEntries);
      setMetrics(calculatedMetrics);
      
      // Update last refreshed timestamp
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching migration data:', err);
      setError(`Failed to fetch migration data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (showLoading) setLoading(false);
      setManualRefreshing(false);
    }
  }, [migrationId]);
  
  // Initialize data and setup refresh timer
  useEffect(() => {
    // Initial data fetch
    fetchMigrationData(true);
    
    // Setup refresh timer if enabled
    if (autoRefreshEnabled) {
      const timer = window.setInterval(() => {
        // Only refresh if migration is active
        if (migrationStatus?.status === 'running' || migrationStatus?.status === 'paused') {
          fetchMigrationData();
        }
      }, refreshInterval);
      
      setRefreshTimer(timer);
      
      // Cleanup on unmount
      return () => {
        if (timer) clearInterval(timer);
      };
    }
    
    return undefined;
  }, [autoRefreshEnabled, migrationStatus?.status, refreshInterval, fetchMigrationData]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [refreshTimer]);
  
  // Toggle auto-refresh
  const handleAutoRefreshToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setAutoRefreshEnabled(enabled);
    
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
      setRefreshTimer(null);
    }
    
    // Set up new timer if enabled
    if (enabled) {
      const timer = window.setInterval(() => {
        // Only refresh if migration is active
        if (migrationStatus?.status === 'running' || migrationStatus?.status === 'paused') {
          fetchMigrationData();
        }
      }, refreshInterval);
      
      setRefreshTimer(timer);
    }
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchMigrationData();
  };
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle operation selection
  const handleOperationSelect = (operationId: string) => {
    setSelectedOperationId(operationId);
    setTabValue(1); // Switch to operation details tab
  };
  
  // Fetch operation details (in a real implementation, this would call the API)
  const fetchOperationDetails = async (migrationId: string): Promise<OperationDetail[]> => {
    // If in simulation mode, generate mock data
    if (simulationMode) {
      return generateMockOperationDetails();
    }
    
    try {
      // In a real implementation, this would fetch from the API
      // const response = await fetch(`/api/migrations/${migrationId}/operations`);
      // return await response.json();
      
      // For now, return mock data
      return generateMockOperationDetails();
    } catch (error) {
      console.error('Error fetching operation details:', error);
      return [];
    }
  };
  
  // Generate mock operation details for development/testing
  const generateMockOperationDetails = (): OperationDetail[] => {
    const ops: OperationDetail[] = [
      {
        id: 'op-1',
        name: 'Initialize Migration',
        description: 'Setting up migration environment and validating configuration',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        endTime: new Date(Date.now() - 1000 * 60 * 14), // 14 minutes ago
        dependsOn: [],
        resourceUsage: {
          cpu: 15,
          memory: 120,
          network: 0.5
        },
        warnings: 0
      },
      {
        id: 'op-2',
        name: 'Fetch Source Test Cases',
        description: 'Retrieving test cases from Zephyr Scale',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 1000 * 60 * 14), // 14 minutes ago
        endTime: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        dependsOn: ['op-1'],
        resourceUsage: {
          cpu: 45,
          memory: 280,
          network: 3.2
        },
        metadata: {
          itemsProcessed: 532,
          apiCalls: 48,
          dataVolume: '2.4MB'
        },
        warnings: 2
      },
      {
        id: 'op-3',
        name: 'Transform Test Case Data',
        description: 'Converting Zephyr format to canonical format and applying transformations',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        endTime: new Date(Date.now() - 1000 * 60 * 7), // 7 minutes ago
        dependsOn: ['op-2'],
        resourceUsage: {
          cpu: 75,
          memory: 450,
          network: 0.1
        },
        metadata: {
          transformationsApplied: 1245,
          fieldsProcessed: 8512
        },
        warnings: 3
      },
      {
        id: 'op-4',
        name: 'Fetch Test Attachments',
        description: 'Retrieving test attachments from Zephyr Scale',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        endTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        dependsOn: ['op-2'],
        resourceUsage: {
          cpu: 30,
          memory: 320,
          network: 8.7
        },
        metadata: {
          attachmentsProcessed: 128,
          totalSize: '45.2MB'
        },
        warnings: 1
      },
      {
        id: 'op-5',
        name: 'Create Test Cases in qTest',
        description: 'Creating transformed test cases in qTest Manager',
        status: 'running',
        progress: 68,
        startTime: new Date(Date.now() - 1000 * 60 * 7), // 7 minutes ago
        estimatedTimeRemaining: 1000 * 60 * 3, // 3 minutes remaining
        dependsOn: ['op-3'],
        resourceUsage: {
          cpu: 55,
          memory: 340,
          network: 4.2
        },
        metadata: {
          itemsCreated: 362,
          itemsRemaining: 170,
          batchSize: 20
        },
        warnings: 4
      },
      {
        id: 'op-6',
        name: 'Upload Attachments to qTest',
        description: 'Uploading test attachments to qTest Manager',
        status: 'running',
        progress: 42,
        startTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        estimatedTimeRemaining: 1000 * 60 * 7, // 7 minutes remaining
        dependsOn: ['op-4', 'op-5'],
        resourceUsage: {
          cpu: 35,
          memory: 290,
          network: 6.8
        },
        metadata: {
          attachmentsUploaded: 54,
          attachmentsRemaining: 74,
          totalSize: '28.5MB'
        },
        warnings: 2
      },
      {
        id: 'op-7',
        name: 'Update Test Relationships',
        description: 'Establishing relationships between test cases in qTest',
        status: 'pending',
        progress: 0,
        dependsOn: ['op-5'],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0
        }
      },
      {
        id: 'op-8',
        name: 'Validate Migration Results',
        description: 'Verifying migrated data integrity and completeness',
        status: 'pending',
        progress: 0,
        dependsOn: ['op-5', 'op-6', 'op-7'],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0
        }
      },
      {
        id: 'op-9',
        name: 'Generate Migration Report',
        description: 'Creating detailed migration report with statistics and issues',
        status: 'pending',
        progress: 0,
        dependsOn: ['op-8'],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0
        }
      }
    ];
    
    return ops;
  };
  
  // Calculate metrics based on migration status and operations
  const calculateMetrics = (
    status: MigrationStatus,
    operations: OperationDetail[], 
    logs: LogEntry[]
  ): MigrationMetrics => {
    // Calculate throughput (items per minute)
    const elapsedMinutes = status.startTime ? 
      (Date.now() - new Date(status.startTime).getTime()) / (1000 * 60) : 
      1;
    const throughput = status.processedItems / Math.max(elapsedMinutes, 1);
    
    // Calculate error rate
    const errorRate = (status.failedItems / Math.max(status.processedItems, 1)) * 100;
    
    // Calculate success rate
    const successRate = 100 - errorRate;
    
    // Calculate API calls per minute (from operations metadata)
    const totalApiCalls = operations.reduce((total, op) => {
      return total + (op.metadata?.apiCalls || 0);
    }, 0);
    const apiCallsPerMinute = totalApiCalls / Math.max(elapsedMinutes, 1);
    
    // Calculate resource usage averages
    const activeOps = operations.filter(op => op.status === 'running' || op.status === 'completed');
    const avgCpuUsage = activeOps.reduce((sum, op) => sum + (op.resourceUsage?.cpu || 0), 0) / 
      Math.max(activeOps.length, 1);
    const avgMemoryUsage = activeOps.reduce((sum, op) => sum + (op.resourceUsage?.memory || 0), 0) / 
      Math.max(activeOps.length, 1);
    const avgNetworkTraffic = activeOps.reduce((sum, op) => sum + (op.resourceUsage?.network || 0), 0) / 
      Math.max(activeOps.length, 1);
    
    // Calculate response time (mocked for demo)
    const responseTime = 350 + Math.random() * 200;
    
    // Calculate items per second
    const itemsPerSecond = throughput / 60;
    
    // Determine metric trends (mocked for demo)
    const trends = {
      throughput: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
      responseTime: Math.random() > 0.7 ? 'down' : Math.random() > 0.4 ? 'stable' : 'up',
      errorRate: Math.random() > 0.8 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down'
    } as const;
    
    return {
      throughput,
      responseTime,
      errorRate,
      successRate,
      itemsPerSecond,
      apiCallsPerMinute,
      networkTraffic: avgNetworkTraffic,
      cpuUsage: avgCpuUsage,
      memoryUsage: avgMemoryUsage,
      trend: trends
    };
  };
  
  // Get operation status counts
  const operationCounts = useMemo(() => {
    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      running: operations.filter(op => op.status === 'running').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      skipped: operations.filter(op => op.status === 'skipped').length
    };
  }, [operations]);
  
  // Get migration duration
  const getDurationString = (status: MigrationStatus): string => {
    if (!status.startTime) return '0s';
    
    const start = new Date(status.startTime);
    const end = status.endTime ? new Date(status.endTime) : new Date();
    const durationSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (durationSecs < 60) return `${durationSecs}s`;
    if (durationSecs < 3600) {
      const mins = Math.floor(durationSecs / 60);
      const secs = durationSecs % 60;
      return `${mins}m ${secs}s`;
    }
    
    const hours = Math.floor(durationSecs / 3600);
    const mins = Math.floor((durationSecs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };
  
  // Get remaining time
  const getRemainingTimeString = (status: MigrationStatus): string => {
    if (!status.estimatedRemainingTime || status.status !== 'running') return 'N/A';
    
    const remainingSecs = status.estimatedRemainingTime;
    
    if (remainingSecs < 60) return `${remainingSecs}s`;
    if (remainingSecs < 3600) {
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      return `${mins}m ${secs}s`;
    }
    
    const hours = Math.floor(remainingSecs / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };
  
  // Get selected operation
  const selectedOperation = useMemo(() => {
    if (!selectedOperationId) return null;
    return operations.find(op => op.id === selectedOperationId) || null;
  }, [selectedOperationId, operations]);
  
  // Get primary metric cards
  const getPrimaryMetricCards = (): MetricCardProps[] => {
    if (!migrationStatus || !metrics) return [];
    
    return [
      {
        title: 'Progress',
        value: `${migrationStatus.progress.toFixed(1)}%`,
        icon: <TaskAltIcon />,
        color: 'primary',
        tooltip: `${migrationStatus.processedItems} of ${migrationStatus.totalItems} items processed`
      },
      {
        title: 'Throughput',
        value: `${metrics.throughput.toFixed(1)}/min`,
        icon: <SpeedIcon />,
        color: 'success',
        trend: metrics.trend.throughput as 'up' | 'down' | 'stable',
        trendLabel: metrics.trend.throughput === 'up' ? 
          `${(metrics.throughput * 0.1).toFixed(1)}/min faster` : 
          metrics.trend.throughput === 'down' ? 
            `${(metrics.throughput * 0.1).toFixed(1)}/min slower` : 
            'Stable rate',
        tooltip: 'Test cases processed per minute'
      },
      {
        title: 'Success Rate',
        value: `${metrics.successRate.toFixed(1)}%`,
        icon: <TaskAltIcon />,
        color: metrics.successRate > 95 ? 'success' : metrics.successRate > 80 ? 'warning' : 'error',
        tooltip: `${migrationStatus.failedItems} failed items out of ${migrationStatus.processedItems} processed`
      },
      {
        title: 'Duration',
        value: getDurationString(migrationStatus),
        icon: <AccessTimeIcon />,
        color: 'info',
        tooltip: `Started at ${new Date(migrationStatus.startTime || '').toLocaleTimeString()}`
      },
      {
        title: 'Remaining Time',
        value: getRemainingTimeString(migrationStatus),
        icon: <AccessTimeIcon />,
        color: 'secondary',
        tooltip: 'Estimated time to complete the migration'
      },
      {
        title: 'Operations',
        value: `${operationCounts.completed + operationCounts.running}/${operationCounts.total}`,
        icon: <ToggleOnIcon />,
        color: 'primary',
        tooltip: `${operationCounts.completed} completed, ${operationCounts.running} running, ${operationCounts.pending} pending`
      }
    ];
  };
  
  // Get secondary metric cards (performance metrics)
  const getPerformanceMetricCards = (): MetricCardProps[] => {
    if (!metrics) return [];
    
    return [
      {
        title: 'API Response Time',
        value: `${metrics.responseTime.toFixed(0)} ms`,
        icon: <QueryStatsIcon />,
        color: metrics.responseTime < 300 ? 'success' : metrics.responseTime < 600 ? 'warning' : 'error',
        trend: metrics.trend.responseTime as 'up' | 'down' | 'stable',
        trendLabel: metrics.trend.responseTime === 'down' ? 'Improving' : 
                    metrics.trend.responseTime === 'up' ? 'Degrading' : 'Stable',
        tooltip: 'Average API response time in milliseconds'
      },
      {
        title: 'CPU Usage',
        value: `${metrics.cpuUsage.toFixed(1)}%`,
        icon: <MemoryIcon />,
        color: metrics.cpuUsage < 50 ? 'success' : metrics.cpuUsage < 80 ? 'warning' : 'error',
        tooltip: 'Average CPU usage across all operations'
      },
      {
        title: 'Memory Usage',
        value: `${metrics.memoryUsage.toFixed(0)} MB`,
        icon: <StorageIcon />,
        color: metrics.memoryUsage < 500 ? 'success' : metrics.memoryUsage < 800 ? 'warning' : 'error',
        tooltip: 'Average memory usage across all operations'
      },
      {
        title: 'Network Traffic',
        value: `${metrics.networkTraffic.toFixed(1)} MB/s`,
        icon: <SettingsEthernetIcon />,
        color: 'primary',
        tooltip: 'Average network traffic rate'
      },
      {
        title: 'API Calls',
        value: `${metrics.apiCallsPerMinute.toFixed(0)}/min`,
        icon: <DnsIcon />,
        color: 'secondary',
        tooltip: 'API calls per minute'
      },
      {
        title: 'Error Rate',
        value: `${metrics.errorRate.toFixed(1)}%`,
        icon: <ErrorOutlineIcon />,
        color: metrics.errorRate < 5 ? 'success' : metrics.errorRate < 15 ? 'warning' : 'error',
        trend: metrics.trend.errorRate as 'up' | 'down' | 'stable',
        trendLabel: metrics.trend.errorRate === 'down' ? 'Improving' : 
                    metrics.trend.errorRate === 'up' ? 'Worsening' : 'Stable',
        tooltip: 'Percentage of operations resulting in errors'
      }
    ];
  };
  
  // Prepare metric cards
  const primaryMetricCards = useMemo(() => getPrimaryMetricCards(), [migrationStatus, metrics, operationCounts]);
  const performanceMetricCards = useMemo(() => getPerformanceMetricCards(), [metrics]);
  
  // If still loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading migration monitoring data...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header section with auto-refresh toggle and refresh button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="div">
          Real-Time Migration Monitoring
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {lastRefreshed && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </Typography>
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefreshEnabled}
                onChange={handleAutoRefreshToggle}
                color="primary"
                size="small"
              />
            }
            label="Auto refresh"
            sx={{ mr: 1 }}
          />
          
          <Tooltip title="Refresh now">
            <span>
              <IconButton 
                onClick={handleRefresh} 
                disabled={manualRefreshing}
                size="small"
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={viewMode === 'standard' ? 'Switch to detailed view' : 'Switch to standard view'}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setViewMode(viewMode === 'standard' ? 'detailed' : 'standard')}
              startIcon={viewMode === 'standard' ? <CodeIcon /> : <AutoGraphIcon />}
              sx={{ ml: 1 }}
            >
              {viewMode === 'standard' ? 'Detailed' : 'Standard'}
            </Button>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Migration status summary */}
      {migrationStatus && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Migration: {migrationId}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={migrationStatus.status.toUpperCase()} 
                  color={
                    migrationStatus.status === 'completed' ? 'success' :
                    migrationStatus.status === 'running' ? 'primary' :
                    migrationStatus.status === 'paused' ? 'warning' :
                    migrationStatus.status === 'failed' ? 'error' :
                    'default'
                  }
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {migrationStatus.processedItems} of {migrationStatus.totalItems} items processed
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {migrationStatus.status === 'running' && onPause && (
                <Button 
                  variant="outlined" 
                  color="warning" 
                  size="small"
                  onClick={onPause}
                >
                  Pause
                </Button>
              )}
              
              {migrationStatus.status === 'paused' && onResume && (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  onClick={onResume}
                >
                  Resume
                </Button>
              )}
              
              {(migrationStatus.status === 'running' || migrationStatus.status === 'paused') && onCancel && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={migrationStatus.progress} 
            sx={{ height: 10, borderRadius: 5, mb: 3 }}
          />
          
          {/* Primary metrics */}
          <Grid container spacing={2}>
            {primaryMetricCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                <MetricCard {...card} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* View mode: Standard */}
      {viewMode === 'standard' && (
        <>
          {/* Tabs for different views */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="monitoring tabs">
              <Tab label="Operations" id="operations-tab" />
              
              {selectedOperation && (
                <Tab 
                  label={`Operation Details: ${selectedOperation.name}`} 
                  id="operation-details-tab" 
                />
              )}
              
              <Tab label="Performance" id="performance-tab" />
              <Tab label="Timeline" id="timeline-tab" />
            </Tabs>
            
            {/* Operations Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Operations are executed according to their dependencies. Click on an operation for details.
                </Typography>
                
                {/* Use the ProgressIndicators component for better status tracking */}
                {migrationStatus && (
                  <ProgressIndicators
                    migration={migrationStatus}
                    operations={operations.map(op => ({
                      id: op.id,
                      name: op.name,
                      status: op.status as any,
                      progress: op.progress,
                      warnings: op.warnings,
                      errors: op.errors?.length,
                      estimatedTimeRemaining: op.estimatedTimeRemaining ? op.estimatedTimeRemaining / 1000 : undefined,
                      startTime: op.startTime,
                      endTime: op.endTime,
                      description: op.description
                    }))}
                    onSelectOperation={handleOperationSelect}
                    selectedOperationId={selectedOperationId}
                    autoRefresh={autoRefreshEnabled}
                    refreshInterval={refreshInterval}
                    onRefresh={handleRefresh}
                  />
                )}
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>
                  Operation Dependencies
                </Typography>
                
                <OperationDependencyGraph 
                  operations={operations}
                  onSelectOperation={handleOperationSelect}
                  selectedOperationId={selectedOperationId}
                />
              </Box>
            </TabPanel>
            
            {/* Operation Details Tab */}
            <TabPanel value={tabValue} index={1}>
              {selectedOperation ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {selectedOperation.name}
                  </Typography>
                  
                  <Typography variant="body1" paragraph>
                    {selectedOperation.description}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Operation Details
                        </Typography>
                        
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Status:</Typography>
                            <Chip 
                              size="small" 
                              label={selectedOperation.status.toUpperCase()} 
                              color={
                                selectedOperation.status === 'completed' ? 'success' :
                                selectedOperation.status === 'running' ? 'primary' :
                                selectedOperation.status === 'failed' ? 'error' :
                                selectedOperation.status === 'skipped' ? 'default' :
                                'secondary'
                              }
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Progress:</Typography>
                            <Typography variant="body2">{selectedOperation.progress}%</Typography>
                          </Box>
                          
                          {selectedOperation.startTime && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Started:</Typography>
                              <Typography variant="body2">
                                {selectedOperation.startTime.toLocaleTimeString()}
                              </Typography>
                            </Box>
                          )}
                          
                          {selectedOperation.endTime && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Completed:</Typography>
                              <Typography variant="body2">
                                {selectedOperation.endTime.toLocaleTimeString()}
                              </Typography>
                            </Box>
                          )}
                          
                          {selectedOperation.estimatedTimeRemaining && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Est. Remaining:</Typography>
                              <Typography variant="body2">
                                {Math.floor(selectedOperation.estimatedTimeRemaining / 60000)}m 
                                {Math.floor((selectedOperation.estimatedTimeRemaining % 60000) / 1000)}s
                              </Typography>
                            </Box>
                          )}
                          
                          {selectedOperation.dependsOn.length > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Dependencies:</Typography>
                              <Box>
                                {selectedOperation.dependsOn.map(depId => {
                                  const dep = operations.find(o => o.id === depId);
                                  return (
                                    <Chip 
                                      key={depId}
                                      label={dep?.name || depId}
                                      size="small"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                      onClick={() => handleOperationSelect(depId)}
                                    />
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          
                          {selectedOperation.warnings && selectedOperation.warnings > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Warnings:</Typography>
                              <Typography variant="body2" color="warning.main">
                                {selectedOperation.warnings} warnings detected
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Resource Usage
                        </Typography>
                        
                        {selectedOperation.resourceUsage ? (
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                CPU Usage
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={selectedOperation.resourceUsage.cpu} 
                                color={selectedOperation.resourceUsage.cpu > 80 ? 'error' : 
                                      selectedOperation.resourceUsage.cpu > 50 ? 'warning' : 'success'}
                                sx={{ height: 8, borderRadius: 4, mb: 1 }}
                              />
                              <Typography variant="caption" align="right" display="block">
                                {selectedOperation.resourceUsage.cpu}%
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Memory Usage
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={(selectedOperation.resourceUsage.memory / 10)} 
                                color={selectedOperation.resourceUsage.memory > 800 ? 'error' : 
                                      selectedOperation.resourceUsage.memory > 500 ? 'warning' : 'success'}
                                sx={{ height: 8, borderRadius: 4, mb: 1 }}
                              />
                              <Typography variant="caption" align="right" display="block">
                                {selectedOperation.resourceUsage.memory} MB
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Network Usage
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={(selectedOperation.resourceUsage.network / 0.1) > 100 ? 100 : (selectedOperation.resourceUsage.network / 0.1)} 
                                color={'primary'}
                                sx={{ height: 8, borderRadius: 4, mb: 1 }}
                              />
                              <Typography variant="caption" align="right" display="block">
                                {selectedOperation.resourceUsage.network} MB/s
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No resource usage data available
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                    
                    {selectedOperation.metadata && (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Operation Metadata
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {Object.entries(selectedOperation.metadata).map(([key, value]) => (
                              <Grid item xs={12} sm={6} md={4} key={key}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {key.split(/(?=[A-Z])/).join(' ').replace(/^./, str => str.toUpperCase())}:
                                  </Typography>
                                  <Typography variant="body2">{value}</Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Select an operation to view details
                  </Typography>
                </Box>
              )}
            </TabPanel>
            
            {/* Performance Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {performanceMetricCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <MetricCard {...card} />
                    </Grid>
                  ))}
                </Grid>
                
                <PerformanceMetricsPanel 
                  metrics={metrics}
                  operations={operations}
                  logs={logs}
                />
              </Box>
            </TabPanel>
            
            {/* Timeline Tab */}
            <TabPanel value={tabValue} index={3}>
              <OperationTimelineView 
                operations={operations}
                onSelectOperation={handleOperationSelect}
                selectedOperationId={selectedOperationId}
              />
            </TabPanel>
          </Paper>
        </>
      )}
      
      {/* View mode: Detailed */}
      {viewMode === 'detailed' && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Operation Dependency Graph
                </Typography>
                
                <OperationDependencyGraph 
                  operations={operations}
                  onSelectOperation={handleOperationSelect}
                  selectedOperationId={selectedOperationId}
                  showDetails
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Resource Usage Monitor
                </Typography>
                
                <ResourceUsageMonitor 
                  operations={operations}
                  refreshInterval={refreshInterval / 1000}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Operation Timeline
                </Typography>
                
                <OperationTimelineView 
                  operations={operations}
                  onSelectOperation={handleOperationSelect}
                  selectedOperationId={selectedOperationId}
                  detailed
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};