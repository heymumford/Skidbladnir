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
  Paper,
  Button,
  ButtonGroup,
  Container,
  FormControlLabel,
  Switch,
  Slider,
  Grid,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Snackbar,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ProgressIndicators, Operation, MigrationProgress } from '../components/Monitoring';

/**
 * Demo page for the ProgressIndicators component
 * This page allows manipulation of migration and operation progress to
 * demonstrate how the indicators react to different states
 */
export const ProgressIndicatorsDemo: React.FC = () => {
  // Sample migration
  const [migration, setMigration] = useState<MigrationProgress>({
    id: 'demo-migration-1',
    totalItems: 1000,
    processedItems: 450,
    failedItems: 20,
    status: 'running',
    progress: 45,
    estimatedTimeRemaining: 1800, // 30 minutes
    startTime: new Date(Date.now() - 1000 * 60 * 15) // started 15 min ago
  });
  
  // Sample operations
  const [operations, setOperations] = useState<Operation[]>([
    {
      id: 'op1',
      name: 'Initialize Migration',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 1000 * 60 * 15),
      endTime: new Date(Date.now() - 1000 * 60 * 14),
      description: 'Setting up migration environment'
    },
    {
      id: 'op2',
      name: 'Fetch Source Test Cases',
      status: 'completed',
      progress: 100,
      warnings: 2,
      startTime: new Date(Date.now() - 1000 * 60 * 14),
      endTime: new Date(Date.now() - 1000 * 60 * 10),
      description: 'Retrieving test cases from Zephyr Scale'
    },
    {
      id: 'op3',
      name: 'Transform Test Case Data',
      status: 'completed',
      progress: 100,
      warnings: 3,
      startTime: new Date(Date.now() - 1000 * 60 * 10),
      endTime: new Date(Date.now() - 1000 * 60 * 7),
      description: 'Converting Zephyr format to canonical format'
    },
    {
      id: 'op4',
      name: 'Create Test Cases in qTest',
      status: 'running',
      progress: 68,
      warnings: 4,
      estimatedTimeRemaining: 180,
      startTime: new Date(Date.now() - 1000 * 60 * 7),
      description: 'Creating transformed test cases in qTest Manager'
    },
    {
      id: 'op5',
      name: 'Upload Attachments to qTest',
      status: 'running',
      progress: 42,
      warnings: 2,
      estimatedTimeRemaining: 420,
      startTime: new Date(Date.now() - 1000 * 60 * 5),
      description: 'Uploading test attachments to qTest Manager'
    },
    {
      id: 'op6',
      name: 'Update Test Relationships',
      status: 'pending',
      progress: 0,
      description: 'Establishing relationships between test cases in qTest'
    },
    {
      id: 'op7',
      name: 'Generate Migration Report',
      status: 'pending',
      progress: 0,
      description: 'Creating detailed migration report with statistics'
    }
  ]);
  
  const [selectedOperationId, setSelectedOperationId] = useState<string | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Simulate progress updates
  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      updateProgress();
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval]);
  
  // Update progress for running operations and overall migration
  const updateProgress = () => {
    // Update operations
    const updatedOperations = operations.map(op => {
      if (op.status === 'running') {
        const newProgress = Math.min(op.progress + Math.floor(Math.random() * 5) + 1, 100);
        const newStatus = newProgress === 100 ? 'completed' : 'running';
        const newEstimatedTime = newProgress === 100 ? undefined : 
          Math.max(0, op.estimatedTimeRemaining ? op.estimatedTimeRemaining - Math.floor(refreshInterval / 1000) : 0);
        
        return {
          ...op,
          progress: newProgress,
          status: newStatus as any,
          estimatedTimeRemaining: newEstimatedTime,
          endTime: newProgress === 100 ? new Date() : undefined
        };
      }
      
      if (op.status === 'pending') {
        // Check if all dependencies are complete (for demo, just start the first pending op)
        const pendingOps = operations.filter(o => o.status === 'pending');
        if (pendingOps.length > 0 && pendingOps[0].id === op.id) {
          const allRunningCompleted = !operations.some(o => o.status === 'running');
          if (allRunningCompleted) {
            return {
              ...op,
              status: 'running' as any,
              startTime: new Date()
            };
          }
        }
      }
      
      return op;
    });
    
    // Update migration progress
    const completedOps = updatedOperations.filter(op => op.status === 'completed').length;
    const totalOps = updatedOperations.length;
    const newProgress = Math.round((completedOps / totalOps) * 100);
    
    const newProcessedItems = Math.min(
      migration.totalItems, 
      Math.floor(migration.totalItems * (newProgress / 100))
    );
    
    const newEstimatedTime = migration.status === 'completed' ? undefined : 
      Math.max(0, migration.estimatedTimeRemaining ? migration.estimatedTimeRemaining - Math.floor(refreshInterval / 1000) : 0);
    
    const newMigrationStatus = newProgress === 100 ? 'completed' : migration.status;
    
    setOperations(updatedOperations);
    setMigration({
      ...migration,
      processedItems: newProcessedItems,
      progress: newProgress,
      status: newMigrationStatus as any,
      estimatedTimeRemaining: newEstimatedTime,
      endTime: newProgress === 100 ? new Date() : undefined
    });
    
    setShowSnackbar(true);
    setSnackbarMessage('Progress updated successfully');
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    updateProgress();
  };
  
  // Handle operation selection
  const handleSelectOperation = (operationId: string) => {
    setSelectedOperationId(operationId);
    setShowSnackbar(true);
    setSnackbarMessage(`Operation ${operationId} selected`);
  };
  
  // Add a new operation
  const handleAddOperation = () => {
    const newId = `op${operations.length + 1}`;
    const newOperation: Operation = {
      id: newId,
      name: `New Operation ${operations.length + 1}`,
      status: 'pending',
      progress: 0,
      description: 'New operation added by user'
    };
    
    setOperations([...operations, newOperation]);
    setSelectedOperationId(newId);
    setShowSnackbar(true);
    setSnackbarMessage('New operation added');
  };
  
  // Delete the selected operation
  const handleDeleteOperation = () => {
    if (!selectedOperationId) return;
    
    const updatedOperations = operations.filter(op => op.id !== selectedOperationId);
    setOperations(updatedOperations);
    setSelectedOperationId(undefined);
    setShowSnackbar(true);
    setSnackbarMessage('Operation deleted');
  };
  
  // Update migration status
  const handleChangeMigrationStatus = (
    status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  ) => {
    setMigration({
      ...migration,
      status
    });
    setShowSnackbar(true);
    setSnackbarMessage(`Migration status updated to ${status}`);
  };
  
  // Update operation status
  const handleChangeOperationStatus = (
    status: 'pending' | 'running' | 'completed' | 'failed'
  ) => {
    if (!selectedOperationId) return;
    
    const updatedOperations = operations.map(op => {
      if (op.id === selectedOperationId) {
        const updates: Partial<Operation> = { status };
        
        // Add appropriate timestamps
        if (status === 'running' && !op.startTime) {
          updates.startTime = new Date();
        }
        if (status === 'completed' && !op.endTime) {
          updates.endTime = new Date();
          updates.progress = 100;
        }
        
        return { ...op, ...updates };
      }
      return op;
    });
    
    setOperations(updatedOperations);
    setShowSnackbar(true);
    setSnackbarMessage(`Operation status updated to ${status}`);
  };
  
  // Get selected operation
  const selectedOperation = operations.find(op => op.id === selectedOperationId);
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Progress Indicators Demo
      </Typography>
      
      <Typography variant="body1" paragraph>
        This demo shows how progress indicators accurately reflect operation status.
        You can manipulate the states to see how the indicators update.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            {/* The progress indicators component */}
            <ProgressIndicators
              migration={migration}
              operations={operations}
              onSelectOperation={handleSelectOperation}
              selectedOperationId={selectedOperationId}
              autoRefresh={autoRefresh}
              refreshInterval={refreshInterval}
              onRefresh={handleRefresh}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {/* Controls panel */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Refresh Settings
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />
                
                <Box sx={{ px: 2, mt: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Refresh Interval: {refreshInterval / 1000}s
                  </Typography>
                  <Slider
                    value={refreshInterval}
                    min={1000}
                    max={10000}
                    step={1000}
                    marks
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value / 1000}s`}
                    disabled={!autoRefresh}
                    onChange={(_, value) => setRefreshInterval(value as number)}
                  />
                </Box>
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                fullWidth
              >
                Manual Refresh
              </Button>
            </CardContent>
          </Card>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Migration Controls
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                Update migration status:
              </Typography>
              
              <ButtonGroup variant="outlined" fullWidth sx={{ mb: 2 }}>
                <Button
                  color="primary"
                  variant={migration.status === 'running' ? 'contained' : 'outlined'}
                  onClick={() => handleChangeMigrationStatus('running')}
                >
                  Running
                </Button>
                <Button
                  color="warning"
                  variant={migration.status === 'paused' ? 'contained' : 'outlined'}
                  onClick={() => handleChangeMigrationStatus('paused')}
                >
                  Paused
                </Button>
                <Button
                  color="success"
                  variant={migration.status === 'completed' ? 'contained' : 'outlined'}
                  onClick={() => handleChangeMigrationStatus('completed')}
                >
                  Completed
                </Button>
                <Button
                  color="error"
                  variant={migration.status === 'failed' ? 'contained' : 'outlined'}
                  onClick={() => handleChangeMigrationStatus('failed')}
                >
                  Failed
                </Button>
              </ButtonGroup>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Total Items"
                    type="number"
                    value={migration.totalItems}
                    onChange={(e) => setMigration({
                      ...migration,
                      totalItems: Number(e.target.value)
                    })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Processed Items"
                    type="number"
                    value={migration.processedItems}
                    onChange={(e) => {
                      const processedItems = Number(e.target.value);
                      setMigration({
                        ...migration,
                        processedItems,
                        progress: Math.round((processedItems / migration.totalItems) * 100)
                      });
                    }}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Failed Items"
                    type="number"
                    value={migration.failedItems}
                    onChange={(e) => setMigration({
                      ...migration,
                      failedItems: Number(e.target.value)
                    })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Time Remaining"
                    type="number"
                    value={migration.estimatedTimeRemaining || 0}
                    onChange={(e) => setMigration({
                      ...migration,
                      estimatedTimeRemaining: Number(e.target.value)
                    })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                    }}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Operation Controls
                </Typography>
                <Box>
                  <IconButton color="primary" onClick={handleAddOperation} title="Add operation">
                    <AddIcon />
                  </IconButton>
                  <IconButton 
                    color="error" 
                    onClick={handleDeleteOperation} 
                    disabled={!selectedOperationId}
                    title="Delete selected operation"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              
              {selectedOperation ? (
                <>
                  <Typography variant="subtitle1">
                    Selected: {selectedOperation.name}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" gutterBottom>
                    Update operation status:
                  </Typography>
                  
                  <ButtonGroup variant="outlined" fullWidth sx={{ mb: 2 }}>
                    <Button
                      color="secondary"
                      variant={selectedOperation.status === 'pending' ? 'contained' : 'outlined'}
                      onClick={() => handleChangeOperationStatus('pending')}
                    >
                      Pending
                    </Button>
                    <Button
                      color="primary"
                      variant={selectedOperation.status === 'running' ? 'contained' : 'outlined'}
                      onClick={() => handleChangeOperationStatus('running')}
                    >
                      Running
                    </Button>
                    <Button
                      color="success"
                      variant={selectedOperation.status === 'completed' ? 'contained' : 'outlined'}
                      onClick={() => handleChangeOperationStatus('completed')}
                    >
                      Done
                    </Button>
                    <Button
                      color="error"
                      variant={selectedOperation.status === 'failed' ? 'contained' : 'outlined'}
                      onClick={() => handleChangeOperationStatus('failed')}
                    >
                      Failed
                    </Button>
                  </ButtonGroup>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" gutterBottom>
                        Progress: {selectedOperation.progress}%
                      </Typography>
                      <Slider
                        value={selectedOperation.progress}
                        min={0}
                        max={100}
                        step={1}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 25, label: '25%' },
                          { value: 50, label: '50%' },
                          { value: 75, label: '75%' },
                          { value: 100, label: '100%' }
                        ]}
                        onChange={(_, value) => {
                          const updatedOperations = operations.map(op => {
                            if (op.id === selectedOperationId) {
                              return { ...op, progress: value as number };
                            }
                            return op;
                          });
                          setOperations(updatedOperations);
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Warnings"
                        type="number"
                        value={selectedOperation.warnings || 0}
                        onChange={(e) => {
                          const updatedOperations = operations.map(op => {
                            if (op.id === selectedOperationId) {
                              return { ...op, warnings: Number(e.target.value) };
                            }
                            return op;
                          });
                          setOperations(updatedOperations);
                        }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Errors"
                        type="number"
                        value={selectedOperation.errors || 0}
                        onChange={(e) => {
                          const updatedOperations = operations.map(op => {
                            if (op.id === selectedOperationId) {
                              return { ...op, errors: Number(e.target.value) };
                            }
                            return op;
                          });
                          setOperations(updatedOperations);
                        }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Estimated Time Remaining"
                        type="number"
                        value={selectedOperation.estimatedTimeRemaining || 0}
                        onChange={(e) => {
                          const updatedOperations = operations.map(op => {
                            if (op.id === selectedOperationId) {
                              return { ...op, estimatedTimeRemaining: Number(e.target.value) };
                            }
                            return op;
                          });
                          setOperations(updatedOperations);
                        }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                        }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select an operation to edit its properties.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity="success"
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProgressIndicatorsDemo;