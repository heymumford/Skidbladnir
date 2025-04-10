/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Box, 
  Chip, 
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PendingIcon from '@mui/icons-material/Pending';

import { MigrationStatus, MigrationState } from '../../types';

interface MigrationStatusCardProps {
  migration: MigrationStatus;
  onPause?: (migrationId: string) => void;
  onResume?: (migrationId: string) => void;
  onCancel?: (migrationId: string) => void;
  onViewDetails?: (migrationId: string) => void;
  showControls?: boolean;
}

/**
 * Format a duration in seconds to a human-readable format (e.g., "2h 30m")
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Get a color for a migration state
 */
const getStateColor = (state: MigrationState): string => {
  switch (state) {
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'paused': return 'warning';
    case 'pending': return 'default';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

/**
 * Get an icon for a migration state
 */
const getStateIcon = (state: MigrationState) => {
  switch (state) {
    case 'running': return <PlayArrowIcon fontSize="small" />;
    case 'completed': return <CheckCircleIcon fontSize="small" />;
    case 'failed': return <ErrorIcon fontSize="small" />;
    case 'paused': return <PauseIcon fontSize="small" />;
    case 'pending': return <PendingIcon fontSize="small" />;
    case 'cancelled': return <StopIcon fontSize="small" />;
    default: return <HourglassEmptyIcon fontSize="small" />;
  }
};

export const MigrationStatusCard: React.FC<MigrationStatusCardProps> = ({
  migration,
  onPause,
  onResume,
  onCancel,
  onViewDetails,
  showControls = true
}) => {
  const isActive = migration.status === 'running' || migration.status === 'paused';
  const startTime = new Date(migration.startTime);
  const endTime = migration.endTime ? new Date(migration.endTime) : null;
  
  // Calculate duration
  let duration: string;
  if (endTime) {
    // Completed migration: use actual duration
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    duration = formatDuration(durationSeconds);
  } else if (migration.estimatedRemainingTime !== undefined) {
    // Running migration: use estimated remaining time
    duration = `~${formatDuration(migration.estimatedRemainingTime)} remaining`;
  } else {
    // Running migration without estimate: show elapsed time
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    duration = `${formatDuration(elapsedSeconds)} elapsed`;
  }
  
  return (
    <Card 
      sx={{ 
        mb: 2,
        borderLeft: 4,
        borderColor: `${getStateColor(migration.status)}.main`
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div">
            Migration {migration.id}
          </Typography>
          
          <Chip 
            icon={getStateIcon(migration.status)} 
            label={migration.status.toUpperCase()} 
            color={getStateColor(migration.status) as any}
            size="small"
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" component="div">
              Progress: {migration.progress}%
            </Typography>
            <Typography variant="body2" component="div">
              {migration.processedItems} / {migration.totalItems} items
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={migration.progress} 
            color={migration.status === 'failed' ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Started
            </Typography>
            <Typography variant="body2">
              {startTime.toLocaleString()}
            </Typography>
          </Box>
          
          {endTime && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="body2">
                {endTime.toLocaleString()}
              </Typography>
            </Box>
          )}
          
          <Box>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body2">
              {duration}
            </Typography>
          </Box>
          
          {migration.failedItems > 0 && (
            <Box>
              <Typography variant="caption" color="error">
                Failed Items
              </Typography>
              <Typography variant="body2" color="error">
                {migration.failedItems}
              </Typography>
            </Box>
          )}
        </Stack>
        
        {showControls && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            {migration.status === 'running' && onPause && (
              <Tooltip title="Pause Migration">
                <IconButton 
                  size="small" 
                  color="warning" 
                  onClick={() => onPause(migration.id)}
                  sx={{ mr: 1 }}
                >
                  <PauseIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {migration.status === 'paused' && onResume && (
              <Tooltip title="Resume Migration">
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={() => onResume(migration.id)}
                  sx={{ mr: 1 }}
                >
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {isActive && onCancel && (
              <Tooltip title="Cancel Migration">
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => onCancel(migration.id)}
                  sx={{ mr: 1 }}
                >
                  <StopIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onViewDetails && (
              <Tooltip title="View Details">
                <IconButton 
                  size="small" 
                  color="info" 
                  onClick={() => onViewDetails(migration.id)}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};