/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  useTheme, 
  Chip, 
  Tooltip, 
  LinearProgress, 
  IconButton,
  Grid,
  Divider
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DoneIcon from '@mui/icons-material/Done';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import SyncIcon from '@mui/icons-material/Sync';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningIcon from '@mui/icons-material/Warning';

import { OperationDetail } from './RealTimeMigrationDashboard';

interface TimelineEntry {
  operation: OperationDetail;
  startTimeMillis: number;
  endTimeMillis: number | null;
  duration: number | null; // in milliseconds
  isRunning: boolean;
}

interface OperationTimelineViewProps {
  operations: OperationDetail[];
  onSelectOperation: (operationId: string) => void;
  selectedOperationId: string | null;
  detailed?: boolean;
}

export const OperationTimelineView: React.FC<OperationTimelineViewProps> = ({
  operations,
  onSelectOperation,
  selectedOperationId,
  detailed = false
}) => {
  const theme = useTheme();
  
  // Filter out operations with no start time
  const operationsWithTime = operations.filter(op => op.startTime);
  
  // Calculate timeline entries with start/end times
  const timelineEntries = useMemo(() => {
    return operationsWithTime.map(op => {
      const startTimeMillis = op.startTime ? op.startTime.getTime() : 0;
      const endTimeMillis = op.endTime ? op.endTime.getTime() : null;
      const duration = endTimeMillis ? endTimeMillis - startTimeMillis : null;
      
      return {
        operation: op,
        startTimeMillis,
        endTimeMillis,
        duration,
        isRunning: op.status === 'running'
      } as TimelineEntry;
    }).sort((a, b) => a.startTimeMillis - b.startTimeMillis);
  }, [operationsWithTime]);
  
  // Calculate timeline boundaries
  const { timelineStart, timelineEnd, timelineDuration } = useMemo(() => {
    if (timelineEntries.length === 0) {
      return { timelineStart: 0, timelineEnd: 0, timelineDuration: 0 };
    }
    
    const start = Math.min(...timelineEntries.map(e => e.startTimeMillis));
    const latestKnownTime = Math.max(
      ...timelineEntries.map(e => e.endTimeMillis || Date.now())
    );
    
    return {
      timelineStart: start,
      timelineEnd: latestKnownTime,
      timelineDuration: latestKnownTime - start
    };
  }, [timelineEntries]);
  
  // Format duration as string
  const formatDuration = (ms: number | null): string => {
    if (ms === null) return 'In progress';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // If no operations with timing data, show placeholder
  if (timelineEntries.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No operation timing data available
        </Typography>
      </Box>
    );
  }
  
  // Get status icon for operation
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <DoneIcon fontSize="small" color="success" />;
      case 'running':
        return <SyncIcon fontSize="small" color="primary" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'skipped':
        return <HourglassEmptyIcon fontSize="small" color="disabled" />;
      default: // pending
        return <PendingIcon fontSize="small" color="disabled" />;
    }
  };
  
  // Calculate percentage of timeline width
  const getTimePosition = (time: number): number => {
    return ((time - timelineStart) / timelineDuration) * 100;
  };
  
  // Get color for operation status
  const getOperationColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'running':
        return theme.palette.primary.main;
      case 'failed':
        return theme.palette.error.main;
      case 'skipped':
        return theme.palette.grey[400];
      default: // pending
        return theme.palette.grey[300];
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Detailed view with more information
  if (detailed) {
    return (
      <Box sx={{ p: 2 }}>
        {/* Timeline axis */}
        <Box sx={{ mb: 3, position: 'relative', height: 40, mt: 2 }}>
          {/* Start time */}
          <Box sx={{ position: 'absolute', left: 0, top: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(timelineStart)}
            </Typography>
          </Box>
          
          {/* End time */}
          <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(timelineEnd)}
            </Typography>
          </Box>
          
          {/* Current time indicator if there are running operations */}
          {timelineEntries.some(entry => entry.isRunning) && (
            <Box 
              sx={{ 
                position: 'absolute', 
                left: `${getTimePosition(Date.now())}%`, 
                top: 20, 
                height: 30,
                borderLeft: `2px dashed ${theme.palette.primary.main}`,
                transform: 'translateX(-1px)'
              }}
            >
              <Typography 
                variant="caption" 
                color="primary" 
                sx={{ 
                  position: 'absolute', 
                  top: -20, 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold'
                }}
              >
                Now
              </Typography>
            </Box>
          )}
          
          {/* Timeline axis */}
          <Box 
            sx={{ 
              position: 'absolute', 
              left: 0, 
              right: 0, 
              top: 20, 
              height: 2, 
              bgcolor: theme.palette.divider 
            }}
          />
          
          {/* Time intervals */}
          {Array.from({ length: 5 }).map((_, i) => {
            const position = (i + 1) * 20;
            const timeAtPosition = timelineStart + (timelineDuration * position / 100);
            
            return (
              <Box 
                key={i} 
                sx={{ 
                  position: 'absolute', 
                  left: `${position}%`, 
                  top: 15, 
                  height: 12, 
                  borderLeft: `1px solid ${theme.palette.divider}`,
                  transform: 'translateX(-0.5px)'
                }}
              >
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    position: 'absolute', 
                    top: 15, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatTimestamp(timeAtPosition)}
                </Typography>
              </Box>
            );
          })}
        </Box>
        
        {/* Operation timeline bars */}
        <Box sx={{ mt: 4 }}>
          {timelineEntries.map((entry) => {
            const startPosition = getTimePosition(entry.startTimeMillis);
            const endPosition = entry.endTimeMillis ? 
              getTimePosition(entry.endTimeMillis) : 
              getTimePosition(Date.now());
            const width = Math.max(0.5, endPosition - startPosition);
            
            return (
              <Box 
                key={entry.operation.id} 
                sx={{ 
                  mb: 3,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: theme.palette.action.hover }
                }}
                onClick={() => onSelectOperation(entry.operation.id)}
              >
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ mr: 1 }}>{getStatusIcon(entry.operation.status)}</Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: entry.operation.id === selectedOperationId ? 'bold' : 'regular',
                          color: entry.operation.id === selectedOperationId ? 
                            theme.palette.primary.main : 
                            'inherit'
                        }}
                      >
                        {entry.operation.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                      {formatDuration(entry.duration)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={9}>
                    <Box sx={{ position: 'relative', height: 30, width: '100%', mt: 1 }}>
                      {/* Timeline bar */}
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          left: `${startPosition}%`, 
                          width: `${width}%`, 
                          height: 20, 
                          borderRadius: 1,
                          bgcolor: getOperationColor(entry.operation.status),
                          opacity: entry.operation.id === selectedOperationId ? 1 : 0.7,
                          border: entry.operation.id === selectedOperationId ? 
                            `2px solid ${theme.palette.primary.dark}` : 
                            'none',
                          '&:hover': { opacity: 0.9 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {entry.operation.status === 'running' && (
                          <Box sx={{ width: '80%', position: 'absolute' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={entry.operation.progress}
                              sx={{ height: 4, borderRadius: 2 }}
                            />
                          </Box>
                        )}
                        
                        {/* Show progress percentage for wide enough bars */}
                        {width > 5 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'white',
                              fontWeight: 'bold',
                              textShadow: '0px 0px 2px rgba(0,0,0,0.5)',
                              zIndex: 1
                            }}
                          >
                            {entry.operation.status === 'running' ? 
                              `${entry.operation.progress}%` : 
                              entry.operation.status.toUpperCase()}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* Start time marker */}
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          position: 'absolute', 
                          left: `${startPosition}%`, 
                          top: 25,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {formatTimestamp(entry.startTimeMillis)}
                      </Typography>
                      
                      {/* End time marker for completed operations */}
                      {entry.endTimeMillis && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            position: 'absolute', 
                            left: `${endPosition}%`, 
                            top: 25,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          {formatTimestamp(entry.endTimeMillis)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  {/* Show warnings if any */}
                  {entry.operation.warnings && entry.operation.warnings > 0 && (
                    <Grid item xs={12}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          ml: 4, 
                          color: theme.palette.warning.main 
                        }}
                      >
                        <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption">
                          {entry.operation.warnings} warnings
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }
  
  // Standard view (simpler)
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Operation Timeline
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Timeline shows the execution sequence and duration of operations.
      </Typography>
      
      {/* Timeline */}
      <Box sx={{ position: 'relative', height: 50, mb: 3, mt: 4 }}>
        {/* Timeline axis */}
        <Box 
          sx={{ 
            position: 'absolute', 
            left: 0, 
            right: 0, 
            top: 30, 
            height: 2, 
            bgcolor: theme.palette.divider 
          }}
        />
        
        {/* Time markers */}
        <Box sx={{ position: 'absolute', left: 0, bottom: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(timelineStart)}
          </Typography>
        </Box>
        
        <Box sx={{ position: 'absolute', right: 0, bottom: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(timelineEnd)}
          </Typography>
        </Box>
        
        {/* Operation markers */}
        {timelineEntries.map((entry) => {
          const startPosition = getTimePosition(entry.startTimeMillis);
          const endPosition = entry.endTimeMillis ? 
            getTimePosition(entry.endTimeMillis) : 
            getTimePosition(Date.now());
          const width = Math.max(1, endPosition - startPosition);
          
          return (
            <Tooltip
              key={entry.operation.id}
              title={
                <>
                  <Typography variant="subtitle2">{entry.operation.name}</Typography>
                  <Typography variant="body2">{entry.operation.description}</Typography>
                  <Typography variant="caption">
                    Duration: {formatDuration(entry.duration)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block">
                      Start: {formatTimestamp(entry.startTimeMillis)}
                    </Typography>
                    {entry.endTimeMillis && (
                      <Typography variant="caption" display="block">
                        End: {formatTimestamp(entry.endTimeMillis)}
                      </Typography>
                    )}
                  </Box>
                </>
              }
              arrow
              placement="top"
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  left: `${startPosition}%`, 
                  width: `${width}%`, 
                  height: 25, 
                  top: 18,
                  borderRadius: 1,
                  bgcolor: getOperationColor(entry.operation.status),
                  cursor: 'pointer',
                  border: entry.operation.id === selectedOperationId ? 
                    `2px solid ${theme.palette.primary.dark}` : 
                    'none',
                  '&:hover': { 
                    opacity: 0.9,
                    boxShadow: 1
                  }
                }}
                onClick={() => onSelectOperation(entry.operation.id)}
              >
                {/* Show progress for running operations */}
                {entry.operation.status === 'running' && (
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={entry.operation.progress}
                      sx={{ height: '100%', borderRadius: 1, bgcolor: 'transparent' }}
                    />
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
        
        {/* Current time indicator */}
        {timelineEntries.some(entry => entry.isRunning) && (
          <Box 
            sx={{ 
              position: 'absolute', 
              left: `${getTimePosition(Date.now())}%`, 
              top: 10, 
              height: 40,
              borderLeft: `2px dashed ${theme.palette.primary.main}`,
              zIndex: 1
            }}
          >
            <Typography 
              variant="caption" 
              color="primary"
              sx={{ 
                position: 'absolute', 
                top: -15, 
                left: '50%', 
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontWeight: 'bold'
              }}
            >
              Now
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Operation list */}
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Grid container spacing={1}>
          {timelineEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.operation.id}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: entry.operation.id === selectedOperationId ? 
                    'action.selected' : 
                    'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  border: `1px solid ${theme.palette.divider}`
                }}
                onClick={() => onSelectOperation(entry.operation.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ mr: 1 }}>{getStatusIcon(entry.operation.status)}</Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: entry.operation.id === selectedOperationId ? 'bold' : 'regular' 
                    }}
                    noWrap
                  >
                    {entry.operation.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 4 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDuration(entry.duration)}
                  </Typography>
                  
                  {entry.operation.warnings && entry.operation.warnings > 0 && (
                    <Chip 
                      icon={<WarningIcon />}
                      label={entry.operation.warnings}
                      size="small"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};