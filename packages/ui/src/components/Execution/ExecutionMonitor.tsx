/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  Badge,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ExecutionStatus } from './ExecutionControlPanel';

// Define interfaces for detailed monitoring data
interface MigrationLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  component: string;
  details?: Record<string, any>;
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

export interface MigrationMonitoringData {
  status: ExecutionStatus;
  logs: MigrationLogEntry[];
  items: MigrationItem[];
  operations: OperationDetails[];
  statistics: MigrationStatistics;
}

interface ExecutionMonitorProps {
  data: MigrationMonitoringData;
  onViewItem?: (item: MigrationItem) => void;
  onRetryItem?: (item: MigrationItem) => void;
  onSkipItem?: (item: MigrationItem) => void;
  onViewOperation?: (operation: OperationDetails) => void;
  onRetryOperation?: (operation: OperationDetails) => void;
  onSkipOperation?: (operation: OperationDetails) => void;
}

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
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Format relative time (X seconds/minutes/hours ago)
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
};

// Get status icon based on level/status
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon fontSize="small" color="success" />;
    case 'error':
    case 'failed':
      return <ErrorIcon fontSize="small" color="error" />;
    case 'warning':
      return <WarningIcon fontSize="small" color="warning" />;
    case 'info':
    case 'pending':
    case 'processing':
      return <InfoIcon fontSize="small" color="info" />;
    case 'skipped':
      return <DoNotDisturbIcon fontSize="small" color="disabled" />;
    default:
      return <InfoIcon fontSize="small" color="info" />;
  }
};

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  data,
  onViewItem,
  onRetryItem,
  onSkipItem,
  onViewOperation,
  onRetryOperation,
  onSkipOperation
}) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Count errors and warnings in logs
  const errorCount = data.logs.filter(log => log.level === 'error').length;
  const warningCount = data.logs.filter(log => log.level === 'warning').length;
  
  // Get counts by status for items
  const itemCounts = {
    pending: data.items.filter(item => item.status === 'pending').length,
    processing: data.items.filter(item => item.status === 'processing').length,
    completed: data.items.filter(item => item.status === 'completed').length,
    failed: data.items.filter(item => item.status === 'failed').length,
    skipped: data.items.filter(item => item.status === 'skipped').length,
  };
  
  return (
    <Paper elevation={3} sx={{ mt: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="monitoring tabs">
          <Tab 
            label="Activity Log" 
            icon={<ListAltIcon />} 
            iconPosition="start" 
            id="monitoring-tab-0" 
          />
          <Tab 
            label="Items" 
            icon={(
              <Badge 
                badgeContent={itemCounts.failed} 
                color="error"
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <DoneAllIcon />
              </Badge>
            )} 
            iconPosition="start" 
            id="monitoring-tab-1" 
          />
          <Tab 
            label="Operations" 
            icon={<TimelineIcon />} 
            iconPosition="start" 
            id="monitoring-tab-2" 
          />
          <Tab 
            label="Statistics" 
            icon={<AutoGraphIcon />} 
            iconPosition="start" 
            id="monitoring-tab-3" 
          />
        </Tabs>
      </Box>
      
      {/* Activity Log Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Activity Log
            {errorCount > 0 && (
              <Chip 
                size="small" 
                color="error" 
                label={`${errorCount} error${errorCount !== 1 ? 's' : ''}`}
                sx={{ ml: 1 }}
              />
            )}
            {warningCount > 0 && (
              <Chip 
                size="small" 
                color="warning" 
                label={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {data.logs.length === 0 ? (
              <Alert severity="info">No log entries yet</Alert>
            ) : (
              <Box>
                {data.logs.map(log => (
                  <Accordion key={log.id} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ mr: 1 }}>
                          {getStatusIcon(log.level)}
                        </Box>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {log.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                          <Chip 
                            size="small" 
                            label={log.component} 
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(log.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    {log.details && (
                      <AccordionDetails>
                        <Box sx={{ 
                          p: 1, 
                          bgcolor: 'background.default', 
                          borderRadius: 1, 
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}>
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </Box>
                      </AccordionDetails>
                    )}
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </TabPanel>
      
      {/* Items Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Migration Items
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip 
              icon={<InfoIcon />} 
              label={`${itemCounts.pending} Pending`}
              variant="outlined"
            />
            <Chip 
              icon={<CircularProgress size={12} />} 
              label={`${itemCounts.processing} Processing`}
              variant="outlined"
              color="primary"
            />
            <Chip 
              icon={<CheckCircleIcon />} 
              label={`${itemCounts.completed} Completed`}
              variant="outlined"
              color="success"
            />
            <Chip 
              icon={<ErrorIcon />} 
              label={`${itemCounts.failed} Failed`}
              variant="outlined"
              color="error"
            />
            <Chip 
              icon={<DoNotDisturbIcon />} 
              label={`${itemCounts.skipped} Skipped`}
              variant="outlined"
              color="default"
            />
          </Box>
          
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source ID</TableCell>
                  <TableCell>Target ID</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map(item => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(item.status)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.name}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {item.name}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.sourceId}</TableCell>
                    <TableCell>{item.targetId || '-'}</TableCell>
                    <TableCell>
                      {item.startTime && (
                        <Tooltip title={item.startTime.toLocaleString()}>
                          <Typography variant="body2">
                            {formatRelativeTime(item.startTime)}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {onViewItem && (
                          <Tooltip title="View Item">
                            <IconButton 
                              size="small" 
                              onClick={() => onViewItem(item)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onRetryItem && item.status === 'failed' && (
                          <Tooltip title="Retry Item">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => onRetryItem(item)}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onSkipItem && (item.status === 'pending' || item.status === 'failed') && (
                          <Tooltip title="Skip Item">
                            <IconButton 
                              size="small"
                              color="warning"
                              onClick={() => onSkipItem(item)}
                            >
                              <DoNotDisturbIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </TabPanel>
      
      {/* Operations Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Operation Dependencies
          </Typography>
          
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Operation</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Depends On</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.operations.map(operation => (
                  <TableRow key={operation.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(operation.status)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {operation.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: 100 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={operation.progress}
                          color={
                            operation.status === 'failed' ? 'error' :
                            operation.status === 'completed' ? 'success' :
                            operation.status === 'running' ? 'primary' : 'inherit'
                          }
                        />
                        <Typography variant="caption">
                          {operation.progress.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {operation.dependsOn.length > 0 ? (
                        operation.dependsOn.map(dep => (
                          <Chip 
                            key={dep} 
                            label={dep} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {operation.startTime && (
                        <Tooltip title={operation.startTime.toLocaleString()}>
                          <Typography variant="body2">
                            {formatRelativeTime(operation.startTime)}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {onViewOperation && (
                          <Tooltip title="View Operation">
                            <IconButton 
                              size="small" 
                              onClick={() => onViewOperation(operation)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onRetryOperation && operation.status === 'failed' && (
                          <Tooltip title="Retry Operation">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => onRetryOperation(operation)}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onSkipOperation && (operation.status === 'pending' || operation.status === 'failed') && (
                          <Tooltip title="Skip Operation">
                            <IconButton 
                              size="small"
                              color="warning"
                              onClick={() => onSkipOperation(operation)}
                            >
                              <DoNotDisturbIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </TabPanel>
      
      {/* Statistics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Migration Statistics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Progress
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Operations:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.completedOperations} / {data.statistics.totalOperations}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Items:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.status.completedItems} / {data.status.totalItems}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Speed:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.averageItemSpeed.toFixed(1)} items/min
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Start Time:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.startTime.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        ETA:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.estimatedCompletion.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Resource Usage
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Network Requests:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.networkRequests.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        API Calls (Zephyr):
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.apiCalls.zephyr.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        API Calls (qTest):
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.apiCalls.qtest.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        CPU Usage:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.resourceUsage.cpu.toFixed(1)}%
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Memory Usage:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {data.statistics.resourceUsage.memory.toFixed(1)} MB
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>
    </Paper>
  );
};