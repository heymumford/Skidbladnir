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
  Button,
  Paper,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  ButtonGroup,
  Slider,
  TextField,
  Stack,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { 
  ExecutionControlInterface, 
  ExecutionStatus,
  OperationState
} from '../components/Execution';

export const ExecutionControlDemo: React.FC = () => {
  const theme = useTheme();
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({
    state: 'idle',
    progress: 0,
    completedItems: 0,
    totalItems: 120,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    errors: 0,
    warnings: 0
  });
  
  const [operations, setOperations] = useState<OperationState[]>([
    {
      id: 'op-1',
      name: 'Fetch Test Cases from Source',
      status: 'pending',
      progress: 0
    },
    {
      id: 'op-2',
      name: 'Transform Data',
      status: 'pending',
      progress: 0
    },
    {
      id: 'op-3',
      name: 'Validate Transformed Data',
      status: 'pending',
      progress: 0
    },
    {
      id: 'op-4',
      name: 'Create Target Test Cases',
      status: 'pending',
      progress: 0
    },
    {
      id: 'op-5',
      name: 'Process Attachments',
      status: 'pending',
      progress: 0
    }
  ]);
  
  const [simulationTimer, setSimulationTimer] = useState<number | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState<number | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [showOperationDetails, setShowOperationDetails] = useState<boolean>(true);
  const [eventLog, setEventLog] = useState<string[]>([]);
  
  // Add to event log
  const logEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };
  
  // Start simulation
  const startSimulation = () => {
    // Already running
    if (simulationTimer) {
      return;
    }
    
    // Reset operations if completed or failed
    if (executionStatus.state === 'completed' || executionStatus.state === 'failed' || executionStatus.state === 'cancelled') {
      setOperations(operations.map(op => ({
        ...op,
        status: 'pending',
        progress: 0
      })));
    }
    
    logEvent('Starting migration');
    
    // Update status to running
    setExecutionStatus(prev => ({
      ...prev,
      state: 'running',
      progress: prev.state === 'paused' ? prev.progress : 0,
      completedItems: prev.state === 'paused' ? prev.completedItems : 0,
      errors: prev.state === 'paused' ? prev.errors : 0,
      warnings: prev.state === 'paused' ? prev.warnings : 0,
      startTime: new Date(),
      endTime: undefined,
      statusMessage: 'Migration in progress',
      currentOperation: 'Fetching test cases from source'
    }));
    
    // Start elapsed time counter
    if (!elapsedTimer) {
      const timer = window.setInterval(() => {
        setExecutionStatus(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1
        }));
      }, 1000);
      
      setElapsedTimer(timer);
    }
    
    // Start simulation timer
    const simTimer = window.setInterval(() => {
      updateSimulation();
    }, 1000 / simulationSpeed);
    
    setSimulationTimer(simTimer);
  };
  
  // Pause simulation
  const pauseSimulation = async (reason?: string) => {
    logEvent(`Pausing migration${reason ? ` - Reason: ${reason}` : ''}`);
    
    // Stop simulation timer
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    // Update status to paused
    setExecutionStatus(prev => ({
      ...prev,
      state: 'paused',
      statusMessage: `Migration paused${reason ? ` - ${reason}` : ''}`
    }));
    
    // Update operations
    setOperations(prev => 
      prev.map(op => 
        op.status === 'running' 
          ? { ...op, status: 'paused' } 
          : op
      )
    );
    
    return Promise.resolve();
  };
  
  // Resume simulation
  const resumeSimulation = async () => {
    logEvent('Resuming migration');
    
    // Update status to running
    setExecutionStatus(prev => ({
      ...prev,
      state: 'running',
      statusMessage: 'Migration resumed'
    }));
    
    // Update operations
    setOperations(prev => 
      prev.map(op => 
        op.status === 'paused' 
          ? { ...op, status: 'running' } 
          : op
      )
    );
    
    // Restart simulation timer
    const simTimer = window.setInterval(() => {
      updateSimulation();
    }, 1000 / simulationSpeed);
    
    setSimulationTimer(simTimer);
    
    return Promise.resolve();
  };
  
  // Cancel simulation
  const cancelSimulation = async (terminateResources?: boolean) => {
    logEvent(`Cancelling migration${terminateResources ? ' and releasing all resources' : ''}`);
    
    // Stop simulation timer
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    // Stop elapsed timer
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      setElapsedTimer(null);
    }
    
    // Update status to cancelled
    setExecutionStatus(prev => ({
      ...prev,
      state: 'cancelled',
      endTime: new Date(),
      statusMessage: 'Migration cancelled'
    }));
    
    return Promise.resolve();
  };
  
  // Reset simulation
  const resetSimulation = () => {
    logEvent('Resetting migration');
    
    // Stop all timers
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      setElapsedTimer(null);
    }
    
    // Reset status
    setExecutionStatus({
      state: 'idle',
      progress: 0,
      completedItems: 0,
      totalItems: 120,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      errors: 0,
      warnings: 0
    });
    
    // Reset operations
    setOperations(operations.map(op => ({
      ...op,
      status: 'pending',
      progress: 0,
      startTime: undefined,
      endTime: undefined
    })));
  };
  
  // Update simulation state
  const updateSimulation = () => {
    // Update operations first
    setOperations(prevOperations => {
      const newOperations = [...prevOperations];
      
      // Find the first pending or running operation
      const activeOpIndex = newOperations.findIndex(op => 
        op.status === 'pending' || op.status === 'running'
      );
      
      if (activeOpIndex === -1) {
        // All operations are completed or failed
        return newOperations;
      }
      
      const activeOp = newOperations[activeOpIndex];
      
      // Start the operation if it's pending
      if (activeOp.status === 'pending') {
        newOperations[activeOpIndex] = {
          ...activeOp,
          status: 'running',
          startTime: new Date()
        };
      } else {
        // Update progress of running operation
        const newProgress = Math.min(100, activeOp.progress + Math.random() * 10 * simulationSpeed);
        
        // Randomly introduce errors and warnings
        let hasNewError = false;
        let hasNewWarning = false;
        
        if (Math.random() < 0.02 * simulationSpeed) {
          hasNewError = true;
        }
        
        if (Math.random() < 0.05 * simulationSpeed) {
          hasNewWarning = true;
        }
        
        // If operation is complete, mark it as completed and calculate time
        if (newProgress >= 100) {
          newOperations[activeOpIndex] = {
            ...activeOp,
            status: hasNewError ? 'failed' : 'completed',
            progress: 100,
            endTime: new Date()
          };
          
          // Log completion or failure
          if (hasNewError) {
            logEvent(`Operation "${activeOp.name}" failed`);
          } else {
            logEvent(`Operation "${activeOp.name}" completed`);
          }
        } else {
          // Update progress
          newOperations[activeOpIndex] = {
            ...activeOp,
            progress: newProgress,
            estimatedTimeRemaining: Math.ceil((100 - newProgress) / (10 * simulationSpeed))
          };
          
          // Log errors and warnings
          if (hasNewError) {
            logEvent(`Error in operation "${activeOp.name}": API Connection Timeout`);
          }
          
          if (hasNewWarning) {
            logEvent(`Warning in operation "${activeOp.name}": Rate limit reached`);
          }
        }
      }
      
      return newOperations;
    });
    
    // Then update overall status based on operations
    setExecutionStatus(prevStatus => {
      // Calculate overall progress as average of operation progress
      const completedOps = operations.filter(op => op.status === 'completed' || op.status === 'failed');
      const runningOps = operations.filter(op => op.status === 'running');
      
      const completedProgress = completedOps.length * 100;
      const runningProgress = runningOps.reduce((sum, op) => sum + op.progress, 0);
      const totalProgress = (completedProgress + runningProgress) / operations.length;
      
      // Calculate completed items based on progress
      const newCompletedItems = Math.floor((totalProgress / 100) * prevStatus.totalItems);
      
      // Count errors and warnings
      const newErrors = prevStatus.errors + (Math.random() < 0.02 * simulationSpeed ? 1 : 0);
      const newWarnings = prevStatus.warnings + (Math.random() < 0.05 * simulationSpeed ? 1 : 0);
      
      // Calculate estimated time remaining
      const progressPercentage = totalProgress / 100;
      const remainingPercentage = 1 - progressPercentage;
      const estimatedTimeRemaining = progressPercentage > 0
        ? Math.max(1, Math.ceil(prevStatus.elapsedTime * (remainingPercentage / progressPercentage)))
        : 100;
      
      // Determine current operation
      const currentOpIndex = operations.findIndex(op => op.status === 'running');
      const currentOperation = currentOpIndex >= 0 
        ? operations[currentOpIndex].name 
        : prevStatus.currentOperation;
      
      // Check if migration is complete
      let newState = prevStatus.state;
      let newEndTime = prevStatus.endTime;
      let newStatusMessage = prevStatus.statusMessage;
      
      if (completedOps.length === operations.length) {
        // All operations are completed or failed
        const failedOps = operations.filter(op => op.status === 'failed');
        
        if (failedOps.length > 0) {
          newState = 'failed';
          newEndTime = new Date();
          newStatusMessage = 'Migration failed';
          
          // Stop simulation timer
          if (simulationTimer) {
            clearInterval(simulationTimer);
            setSimulationTimer(null);
          }
          
          // Stop elapsed timer
          if (elapsedTimer) {
            clearInterval(elapsedTimer);
            setElapsedTimer(null);
          }
          
          logEvent('Migration failed');
        } else {
          newState = 'completed';
          newEndTime = new Date();
          newStatusMessage = 'Migration completed successfully';
          
          // Stop simulation timer
          if (simulationTimer) {
            clearInterval(simulationTimer);
            setSimulationTimer(null);
          }
          
          // Stop elapsed timer
          if (elapsedTimer) {
            clearInterval(elapsedTimer);
            setElapsedTimer(null);
          }
          
          logEvent('Migration completed successfully');
        }
      }
      
      return {
        ...prevStatus,
        state: newState,
        progress: totalProgress,
        completedItems: newCompletedItems,
        estimatedTimeRemaining,
        errors: newErrors,
        warnings: newWarnings,
        endTime: newEndTime,
        statusMessage: newStatusMessage,
        currentOperation
      };
    });
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationTimer) {
        clearInterval(simulationTimer);
      }
      
      if (elapsedTimer) {
        clearInterval(elapsedTimer);
      }
    };
  }, [simulationTimer, elapsedTimer]);
  
  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom>
        Execution Control Interface
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page demonstrates the execution control interface for migration operations,
        with pause/resume/cancel functionality as required in the project kanban board.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Simulation Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Simulation Controls
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2, minWidth: 120 }}>
                Simulation Speed:
              </Typography>
              <Slider
                value={simulationSpeed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(_, value) => setSimulationSpeed(value as number)}
                valueLabelDisplay="auto"
                disabled={simulationTimer !== null}
                sx={{ flex: 1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={showOperationDetails}
                  onChange={(e) => setShowOperationDetails(e.target.checked)}
                />
              }
              label="Show Operation Details"
            />
          </Grid>
          
          <Grid item xs={12}>
            <ButtonGroup variant="contained">
              <Button
                startIcon={<PlayArrowIcon />}
                onClick={startSimulation}
                disabled={simulationTimer !== null}
                color="primary"
              >
                Start Simulation
              </Button>
              <Button
                startIcon={<PauseIcon />}
                onClick={() => pauseSimulation()}
                disabled={simulationTimer === null || executionStatus.state !== 'running'}
                color="warning"
              >
                Pause
              </Button>
              <Button
                startIcon={<StopIcon />}
                onClick={() => cancelSimulation()}
                disabled={executionStatus.state !== 'running' && executionStatus.state !== 'paused'}
                color="error"
              >
                Cancel
              </Button>
              <Button
                startIcon={<SettingsIcon />}
                onClick={resetSimulation}
                disabled={executionStatus.state === 'running'}
              >
                Reset
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Execution Control Interface */}
      <ExecutionControlInterface
        status={executionStatus}
        operations={operations}
        onPause={pauseSimulation}
        onResume={resumeSimulation}
        onCancel={cancelSimulation}
        onRestart={resetSimulation}
        showOperationDetails={showOperationDetails}
      />
      
      {/* Event Log */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoGraphIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6">
            Event Log
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            p: 2, 
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', 
            borderRadius: 1,
            fontFamily: 'monospace',
            height: 300,
            overflow: 'auto'
          }}
        >
          {eventLog.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No events yet. Start the simulation to see events.
            </Typography>
          ) : (
            eventLog.map((event, index) => (
              <Typography 
                key={index} 
                variant="body2" 
                sx={{ 
                  mb: 0.5,
                  color: event.includes('Error') ? theme.palette.error.main :
                         event.includes('Warning') ? theme.palette.warning.main :
                         event.includes('completed successfully') ? theme.palette.success.main :
                         'inherit'
                }}
              >
                {event}
              </Typography>
            ))
          )}
        </Box>
      </Paper>
    </Container>
  );
};