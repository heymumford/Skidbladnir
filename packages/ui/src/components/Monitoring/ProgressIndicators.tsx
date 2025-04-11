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
  LinearProgress,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Badge,
  Tooltip,
  Card,
  CardContent,
  styled,
  useTheme,
  alpha
} from '@mui/material';
import { LcarsStatusLight } from '../StatusDisplay/LcarsStatusLight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PendingIcon from '@mui/icons-material/Pending';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';

// Types for operation status
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Operation {
  id: string;
  name: string;
  status: OperationStatus;
  progress: number;
  warnings?: number;
  errors?: number;
  estimatedTimeRemaining?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  description?: string;
}

export interface MigrationProgress {
  id: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedTimeRemaining?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
}

interface ProgressIndicatorsProps {
  migration: MigrationProgress;
  operations: Operation[];
  onSelectOperation?: (operationId: string) => void;
  selectedOperationId?: string;
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
  onRefresh?: () => void;
}

// Styled components
const StatusChip = styled(Chip)(({ theme, status }: { theme: any, status: OperationStatus }) => {
  const colorMap = {
    pending: theme.palette.grey[500],
    running: theme.palette.primary.main,
    completed: theme.palette.success.main,
    failed: theme.palette.error.main
  };

  return {
    backgroundColor: alpha(colorMap[status], 0.1),
    color: colorMap[status],
    borderColor: alpha(colorMap[status], 0.3),
    fontWeight: 'bold'
  };
});

const OperationCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s',
  height: '100%',
  ...(selected && {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
    boxShadow: theme.shadows[3]
  }),
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

// Replace the BlinkingDot with LcarsStatusLight

/**
 * Format time remaining (in seconds) to a human-readable string
 */
const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Estimate completion time based on current time and estimated time remaining
 */
const estimateCompletionTime = (estimatedTimeRemaining?: number): string => {
  if (!estimatedTimeRemaining) return 'Unknown';
  
  const completionDate = new Date(Date.now() + estimatedTimeRemaining * 1000);
  return completionDate.toLocaleTimeString();
};

/**
 * Progress Indicators component for displaying operation status
 */
export const ProgressIndicators: React.FC<ProgressIndicatorsProps> = ({
  migration,
  operations,
  onSelectOperation,
  selectedOperationId,
  refreshInterval = 5000,
  autoRefresh = false,
  onRefresh
}) => {
  const theme = useTheme();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Setup auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      if (onRefresh) {
        onRefresh();
        setLastRefreshed(new Date());
      }
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, onRefresh]);
  
  // Get status breakdown
  const statusBreakdown = {
    total: operations.length,
    completed: operations.filter(op => op.status === 'completed').length,
    running: operations.filter(op => op.status === 'running').length,
    pending: operations.filter(op => op.status === 'pending').length,
    failed: operations.filter(op => op.status === 'failed').length
  };
  
  // Get status icon
  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon fontSize="small" />;
      case 'running': return <PlayArrowIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'pending': return <PendingIcon fontSize="small" />;
    }
  };
  
  return (
    <Box>
      {/* Overall Progress */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Migration Progress
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">
                  {migration.processedItems} of {migration.totalItems} items processed
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {migration.progress.toFixed(1)}%
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={migration.progress}
                sx={{ height: 8, borderRadius: 4 }}
                color={migration.status === 'failed' ? 'error' : 'primary'}
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Box sx={{ mr: 1 }}>
                  <LcarsStatusLight 
                    state={migration.status === 'running' ? 'running' :
                           migration.status === 'completed' ? 'completed' :
                           migration.status === 'failed' ? 'failed' :
                           migration.status === 'paused' ? 'paused' : 'idle'}
                    size="small" 
                    data-testid="migration-status-light"
                  />
                </Box>
                <Chip
                  icon={
                    migration.status === 'running' ? <PlayArrowIcon /> :
                    migration.status === 'completed' ? <CheckCircleIcon /> :
                    migration.status === 'failed' ? <ErrorIcon /> :
                    migration.status === 'paused' ? <PendingIcon /> :
                    <InfoIcon />
                  }
                  label={migration.status.toUpperCase()}
                  color={
                    migration.status === 'running' ? 'primary' :
                    migration.status === 'completed' ? 'success' :
                    migration.status === 'failed' ? 'error' :
                    migration.status === 'paused' ? 'warning' :
                    'default'
                  }
                  variant="outlined"
                  size="small"
                />
              </Box>
              
              {migration.failedItems > 0 && (
                <Tooltip title={`${migration.failedItems} items failed`}>
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${migration.failedItems} Failed`}
                    color="error"
                    variant="outlined"
                    size="small"
                    sx={{ mr: 2 }}
                  />
                </Tooltip>
              )}
              
              {migration.estimatedTimeRemaining && (
                <Tooltip title={`Estimated completion time: ${estimateCompletionTime(migration.estimatedTimeRemaining)}`}>
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`${formatTimeRemaining(migration.estimatedTimeRemaining)} remaining`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Operations</Typography>
                    <Typography variant="h6">{statusBreakdown.total}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Completed</Typography>
                    <Typography variant="h6">{statusBreakdown.completed}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Running</Typography>
                    <Typography variant="h6">{statusBreakdown.running}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                    <Typography variant="h6">{statusBreakdown.pending}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {lastRefreshed && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </Typography>
        )}
      </Paper>
      
      {/* Operations Progress Grid */}
      <Typography variant="h6" gutterBottom>
        Operation Status
      </Typography>
      
      <Grid container spacing={2}>
        {operations.map((operation) => (
          <Grid item xs={12} sm={6} md={4} key={operation.id}>
            <OperationCard 
              variant="outlined"
              selected={selectedOperationId === operation.id}
              onClick={() => onSelectOperation && onSelectOperation(operation.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ mr: 1 }}>
                      <LcarsStatusLight 
                        state={operation.status} 
                        size="small" 
                        data-testid={`operation-status-light-${operation.id}`}
                      />
                    </Box>
                    <Typography variant="subtitle1" component="div" noWrap>
                      {operation.name}
                    </Typography>
                  </Box>
                  
                  <StatusChip
                    label={operation.status.toUpperCase()}
                    status={operation.status}
                    size="small"
                    icon={getStatusIcon(operation.status)}
                  />
                </Box>
                
                {operation.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} noWrap>
                    {operation.description}
                  </Typography>
                )}
                
                <Box sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress: {operation.progress}%
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {operation.warnings && operation.warnings > 0 && (
                        <Tooltip title={`${operation.warnings} warnings`}>
                          <Badge badgeContent={operation.warnings} color="warning" sx={{ mr: 1 }}>
                            <WarningIcon fontSize="small" color="warning" />
                          </Badge>
                        </Tooltip>
                      )}
                      
                      {operation.errors && operation.errors > 0 && (
                        <Tooltip title={`${operation.errors} errors`}>
                          <Badge badgeContent={operation.errors} color="error">
                            <ErrorIcon fontSize="small" color="error" />
                          </Badge>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={operation.progress}
                    color={operation.status === 'failed' ? 'error' : 'primary'}
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.grey[300], 0.5)
                    }}
                  />
                </Box>
                
                {operation.estimatedTimeRemaining && operation.status === 'running' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ETA: {formatTimeRemaining(operation.estimatedTimeRemaining)}
                  </Typography>
                )}
              </CardContent>
            </OperationCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProgressIndicators;