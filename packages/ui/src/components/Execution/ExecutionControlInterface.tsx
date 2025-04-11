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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Collapse,
  Divider,
  Alert,
  useTheme,
  alpha,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PendingIcon from '@mui/icons-material/Pending';
import { ExecutionStatus, ExecutionState } from './ExecutionControlPanel';
import { migrationService } from '../../services/MigrationService';

export interface OperationState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
}

export interface MigrationPauseReason {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  resumable: boolean;
}

interface ExecutionControlInterfaceProps {
  status: ExecutionStatus;
  operations?: OperationState[];
  onPause: (reason?: string) => Promise<void>;
  onResume: () => Promise<void>;
  onCancel: (terminateResources?: boolean) => Promise<void>;
  onRestart?: () => void;
  onStatusChange?: (status: ExecutionStatus) => void;
  showOperationDetails?: boolean;
}

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

export const ExecutionControlInterface: React.FC<ExecutionControlInterfaceProps> = ({
  status,
  operations = [],
  onPause,
  onResume,
  onCancel,
  onRestart,
  onStatusChange,
  showOperationDetails = false
}) => {
  const theme = useTheme();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | undefined>();
  const [cancelOptions, setCancelOptions] = useState({
    terminateResources: true
  });
  const [pauseInProgress, setPauseInProgress] = useState(false);
  const [resumeInProgress, setResumeInProgress] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [operationDetailsOpen, setOperationDetailsOpen] = useState(showOperationDetails);
  
  const pauseReasons: MigrationPauseReason[] = [
    {
      id: 'temporary',
      label: 'Temporary Pause',
      description: 'Pause the migration temporarily. You can resume it later.',
      icon: <PauseIcon />,
      resumable: true
    },
    {
      id: 'review',
      label: 'Review Progress',
      description: 'Pause to review the current progress before continuing.',
      icon: <InfoIcon />,
      resumable: true
    },
    {
      id: 'resources',
      label: 'Resource Constraints',
      description: 'System resources are constrained. Pause until more resources are available.',
      icon: <SpeedIcon />,
      resumable: true
    },
    {
      id: 'rate-limit',
      label: 'API Rate Limit',
      description: 'API rate limits have been reached. Pause to avoid further throttling.',
      icon: <TimerOffIcon />,
      resumable: true
    }
  ];
  
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
  
  // Handle pause button click - open confirmation dialog
  const handlePauseClick = () => {
    setPauseDialogOpen(true);
  };
  
  // Handle pause confirmation
  const handlePauseConfirm = async () => {
    setPauseDialogOpen(false);
    setPauseInProgress(true);
    
    try {
      await onPause(pauseReason);
    } catch (error) {
      console.error('Error pausing migration:', error);
    } finally {
      setPauseInProgress(false);
      setPauseReason(undefined);
    }
  };
  
  // Handle pause dialog close
  const handlePauseDialogClose = () => {
    setPauseDialogOpen(false);
    setPauseReason(undefined);
  };
  
  // Handle pause reason selection
  const handlePauseReasonSelect = (reason: string) => {
    setPauseReason(reason);
  };
  
  // Handle resume button click
  const handleResumeClick = async () => {
    setResumeInProgress(true);
    
    try {
      await onResume();
    } catch (error) {
      console.error('Error resuming migration:', error);
    } finally {
      setResumeInProgress(false);
    }
  };
  
  // Handle cancel button click - open confirmation dialog
  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };
  
  // Handle cancel confirmation
  const handleCancelConfirm = async () => {
    setCancelDialogOpen(false);
    setCancelInProgress(true);
    
    try {
      await onCancel(cancelOptions.terminateResources);
    } catch (error) {
      console.error('Error cancelling migration:', error);
    } finally {
      setCancelInProgress(false);
    }
  };
  
  // Handle cancel dialog close
  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
  };
  
  // Handle cancel options change
  const handleCancelOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCancelOptions({
      ...cancelOptions,
      [event.target.name]: event.target.checked
    });
  };
  
  // Handle restart button click
  const handleRestartClick = () => {
    if (onRestart) {
      onRestart();
    }
  };
  
  // Toggle operation details
  const toggleOperationDetails = () => {
    setOperationDetailsOpen(!operationDetailsOpen);
  };
  
  // Only show control panel when not in idle state
  if (status.state === 'idle') {
    return null;
  }
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mt: 3, 
        position: 'relative', 
        overflow: 'hidden',
        border: '1px solid',
        borderColor: theme.palette[getProgressColor()].main,
        transition: 'all 0.3s ease'
      }}
    >
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
        }),
        ...(pauseInProgress && {
          animation: 'pulse 1.5s ease-in-out infinite',
        }),
        ...(resumeInProgress && {
          animation: 'pulse 1.5s ease-in-out infinite',
        }),
        ...(cancelInProgress && {
          animation: 'pulse 1.5s ease-in-out infinite',
          backgroundColor: theme.palette.error.main,
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
                icon={<ScheduleIcon />} 
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
              <LinearProgress 
                variant="determinate" 
                value={status.progress} 
                color={getProgressColor()} 
                sx={{
                  height: 10,
                  borderRadius: 5,
                  '.MuiLinearProgress-bar': {
                    borderRadius: 5,
                    ...(status.state === 'paused' && {
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }),
                  },
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                    '100%': { opacity: 1 },
                  },
                }}
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
        
        {/* Operation Details (collapsible) */}
        {operations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1, 
                cursor: 'pointer',
                color: 'primary.main'
              }}
              onClick={toggleOperationDetails}
            >
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                Operation Details
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  {operationDetailsOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
              </Typography>
            </Box>
            
            <Collapse in={operationDetailsOpen}>
              <Stepper orientation="vertical" nonLinear sx={{ mt: 2 }}>
                {operations.map((operation) => (
                  <Step key={operation.id} active={operation.status === 'running'} completed={operation.status === 'completed'}>
                    <StepLabel
                      error={operation.status === 'failed'}
                      icon={
                        operation.status === 'running' ? <CircularProgress size={24} /> :
                        operation.status === 'completed' ? <CheckCircleIcon /> :
                        operation.status === 'failed' ? <ErrorIcon /> :
                        operation.status === 'paused' ? <PauseIcon /> :
                        operation.status === 'skipped' ? <SkipNextIcon /> :
                        <PendingIcon />
                      }
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography variant="body2">{operation.name}</Typography>
                        <Chip 
                          size="small" 
                          label={`${operation.progress}%`} 
                          color={
                            operation.status === 'completed' ? 'success' :
                            operation.status === 'failed' ? 'error' :
                            operation.status === 'running' ? 'primary' :
                            operation.status === 'paused' ? 'warning' :
                            'default'
                          }
                          variant="outlined"
                        />
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={operation.progress} 
                          color={
                            operation.status === 'completed' ? 'success' :
                            operation.status === 'failed' ? 'error' :
                            operation.status === 'running' ? 'primary' :
                            operation.status === 'paused' ? 'warning' :
                            'primary'
                          }
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {operation.startTime && `Started: ${operation.startTime.toLocaleTimeString()}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {operation.estimatedTimeRemaining !== undefined && 
                              `ETA: ${formatTime(operation.estimatedTimeRemaining)}`}
                          </Typography>
                        </Box>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Collapse>
          </Box>
        )}
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {status.state === 'running' && (
            <Button 
              variant="outlined" 
              color="warning" 
              startIcon={<PauseIcon />}
              onClick={handlePauseClick}
              disabled={pauseInProgress}
            >
              {pauseInProgress ? 'Pausing...' : 'Pause'}
            </Button>
          )}
          
          {status.state === 'paused' && (
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<PlayArrowIcon />}
              onClick={handleResumeClick}
              disabled={resumeInProgress}
            >
              {resumeInProgress ? 'Resuming...' : 'Resume'}
            </Button>
          )}
          
          {(status.state === 'running' || status.state === 'paused') && (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<StopIcon />}
              onClick={handleCancelClick}
              disabled={cancelInProgress}
            >
              {cancelInProgress ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
          
          {(status.state === 'completed' || status.state === 'failed' || status.state === 'cancelled') && onRestart && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RestartAltIcon />}
              onClick={handleRestartClick}
            >
              New Migration
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Pause Confirmation Dialog */}
      <Dialog
        open={pauseDialogOpen}
        onClose={handlePauseDialogClose}
        aria-labelledby="pause-dialog-title"
        aria-describedby="pause-dialog-description"
      >
        <DialogTitle id="pause-dialog-title">
          Pause Migration?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="pause-dialog-description">
            Do you want to pause the current migration? You can resume it later.
          </DialogContentText>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select a reason for pausing:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {pauseReasons.map((reason) => (
                <Chip
                  key={reason.id}
                  icon={reason.icon}
                  label={reason.label}
                  onClick={() => handlePauseReasonSelect(reason.id)}
                  variant={pauseReason === reason.id ? 'filled' : 'outlined'}
                  color={pauseReason === reason.id ? 'primary' : 'default'}
                  sx={{ 
                    py: 2,
                    '& .MuiChip-label': { fontSize: '0.875rem' }
                  }}
                />
              ))}
            </Box>
            
            {pauseReason && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  {pauseReasons.find(r => r.id === pauseReason)?.description}
                </Alert>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePauseDialogClose} autoFocus>
            Cancel
          </Button>
          <Button 
            onClick={handlePauseConfirm} 
            color="warning"
            disabled={!pauseReason}
          >
            Pause Migration
          </Button>
        </DialogActions>
      </Dialog>
      
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
          
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Cancelling a migration has the following consequences:
              </Typography>
              <ul style={{ marginTop: 4, marginBottom: 4 }}>
                <li>All in-progress operations will be stopped</li>
                <li>Partial data may remain in the target system</li>
                <li>You will need to start a new migration for remaining items</li>
              </ul>
            </Alert>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={cancelOptions.terminateResources}
                  onChange={handleCancelOptionChange}
                  name="terminateResources"
                />
              }
              label="Release all resources (recommended)"
            />
          </Box>
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