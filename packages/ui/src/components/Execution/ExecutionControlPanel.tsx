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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Stack,
  LinearProgress,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { styled } from '@mui/material/styles';

// Define execution status types
export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionStatus {
  state: ExecutionState;
  progress: number;
  completedItems: number;
  totalItems: number;
  elapsedTime: number; // in seconds
  estimatedTimeRemaining: number; // in seconds
  errors: number;
  warnings: number;
  startTime?: Date;
  endTime?: Date;
  currentOperation?: string;
  currentBatch?: number;
  totalBatches?: number;
  statusMessage?: string;
}

interface ExecutionControlPanelProps {
  status: ExecutionStatus;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRestart?: () => void;
}

// Styled progress bar with pulsing animation for paused state
const StyledLinearProgress = styled(LinearProgress)(({ theme, variant, value, color }) => ({
  height: 10,
  borderRadius: 5,
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    ...(variant === 'determinate' && color === 'warning' && {
      animation: 'pulse 1.5s ease-in-out infinite',
    }),
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.6,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

// Format time display function (converts seconds to HH:MM:SS)
const formatTime = (seconds: number): string => {
  if (seconds < 0 || !isFinite(seconds)) return '--:--:--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [hours, minutes, secs]
    .map(v => v < 10 ? `0${v}` : v)
    .join(':');
};

export const ExecutionControlPanel: React.FC<ExecutionControlPanelProps> = ({
  status,
  onPause,
  onResume,
  onCancel,
  onRestart
}) => {
  const theme = useTheme();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Determine progress color based on state
  const getProgressColor = (): 'primary' | 'success' | 'warning' | 'error' => {
    switch(status.state) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'failed': return 'error';
      case 'cancelled': return 'error';
      default: return 'primary';
    }
  };
  
  // Handle cancel button click - open confirmation dialog
  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };
  
  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    setCancelDialogOpen(false);
    onCancel();
  };
  
  // Handle cancel dialog close
  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
  };
  
  // Only show control panel when not in idle state
  if (status.state === 'idle') {
    return null;
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3, position: 'relative', overflow: 'hidden' }}>
      {/* Status indicator strip along top edge */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: 4, 
        bgcolor: theme.palette[getProgressColor()].main,
        ...(status.state === 'paused' && {
          background: `repeating-linear-gradient(
            45deg,
            ${theme.palette.warning.main},
            ${theme.palette.warning.main} 10px,
            ${theme.palette.warning.light} 10px,
            ${theme.palette.warning.light} 20px
          )`
        })
      }} />
      
      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Migration Control Panel
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Chip 
              size="small" 
              icon={<AccessTimeIcon />} 
              label={`Elapsed: ${formatTime(status.elapsedTime)}`} 
              variant="outlined"
            />
            {status.state === 'running' && (
              <Chip 
                size="small" 
                icon={<AccessTimeIcon />} 
                label={`ETA: ${formatTime(status.estimatedTimeRemaining)}`} 
                variant="outlined"
              />
            )}
            {status.errors > 0 && (
              <Chip 
                size="small" 
                icon={<ErrorIcon />} 
                label={`${status.errors} error${status.errors !== 1 ? 's' : ''}`} 
                color="error"
              />
            )}
            {status.warnings > 0 && (
              <Chip 
                size="small" 
                icon={<WarningAmberIcon />} 
                label={`${status.warnings} warning${status.warnings !== 1 ? 's' : ''}`} 
                color="warning"
              />
            )}
            <Chip 
              size="small" 
              label={status.state.toUpperCase()} 
              color={getProgressColor()}
            />
          </Stack>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {status.statusMessage || `Migration ${status.state}`}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ flexGrow: 1, mr: 1 }}>
              <StyledLinearProgress 
                variant="determinate" 
                value={status.progress} 
                color={getProgressColor()} 
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {status.progress.toFixed(1)}%
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            {status.completedItems} of {status.totalItems} items processed
            {status.currentBatch && status.totalBatches && 
              ` (Batch ${status.currentBatch} of ${status.totalBatches})`}
          </Typography>
          
          {status.currentOperation && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current operation: {status.currentOperation}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {status.state === 'running' && (
            <Button 
              variant="outlined" 
              color="warning" 
              startIcon={<PauseIcon />}
              onClick={onPause}
            >
              Pause
            </Button>
          )}
          
          {status.state === 'paused' && (
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<PlayArrowIcon />}
              onClick={onResume}
            >
              Resume
            </Button>
          )}
          
          {(status.state === 'running' || status.state === 'paused') && (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<StopIcon />}
              onClick={handleCancelClick}
            >
              Cancel
            </Button>
          )}
          
          {(status.state === 'completed' || status.state === 'failed' || status.state === 'cancelled') && onRestart && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RefreshIcon />}
              onClick={onRestart}
            >
              New Migration
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">
          Cancel Migration?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Are you sure you want to cancel the current migration? This operation cannot be undone.
            {status.completedItems > 0 && (
              <>
                <br/><br/>
                {status.completedItems} of {status.totalItems} items have already been processed.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} autoFocus>
            No, Continue
          </Button>
          <Button onClick={handleCancelConfirm} color="error">
            Yes, Cancel Migration
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};