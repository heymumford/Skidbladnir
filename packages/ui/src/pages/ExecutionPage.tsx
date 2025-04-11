/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Paper,
  Alert,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link
} from '@mui/material';
import { ImportExportToolbar } from '../components/Common/ImportExportToolbar';
import { 
  ExecutionConfigForm, 
  ExecutionConfig, 
  MigrationPreview,
  ExecutionControlPanel,
  ExecutionControlInterface,
  ExecutionStatus as PanelExecutionStatus,
  ExecutionState,
  ExecutionMonitor,
  MigrationMonitoringData,
  OperationState
} from '../components/Execution';
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  SkipNext as SkipNextIcon,
  Pending as PendingIcon,
  AccessTime as AccessTimeIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  ErrorSummaryPanel,
  ErrorRemediationPanel
} from '../components/Error';
import { migrationService } from '../services/MigrationService';

const mockMigrationPreview: MigrationPreview = {
  estimatedItems: 1243,
  estimatedDuration: 45,
  potentialIssues: [
    'Some attachments may exceed size limits',
    'Custom fields may require manual review',
    'Some test steps might be truncated due to length limitations',
    'Test cases with heavy formatting may lose some formatting during migration'
  ]
};

// Sample data for the detailed execution monitoring view
const generateMockMonitoringData = (status: PanelExecutionStatus): MigrationMonitoringData => {
  // Generate mock logs
  const logs = [];
  const components = ['API Bridge', 'Transformation', 'Zephyr Provider', 'qTest Provider', 'Orchestrator'];
  const levels = ['info', 'warning', 'error', 'debug'] as const;
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
  const startTime = new Date();
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

export const ExecutionPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(2); // Assuming this is the third step after provider config and field mapping
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig | null>(null);
  
  // State for execution control
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [executionStatus, setExecutionStatus] = useState<PanelExecutionStatus>({
    state: 'idle',
    progress: 0,
    completedItems: 0,
    totalItems: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    errors: 0,
    warnings: 0
  });
  
  // State for tracking progress simulation
  const [simulationTimer, setSimulationTimer] = useState<number | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState<number | null>(null);
  const [monitoringData, setMonitoringData] = useState<MigrationMonitoringData | null>(null);
  
  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  
  // Effects for updating status
  useEffect(() => {
    if (executionState === 'running') {
      // Start elapsed time counter
      const timer = window.setInterval(() => {
        setExecutionStatus(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1
        }));
      }, 1000);
      
      setElapsedTimer(timer);
      
      // Clear on cleanup
      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    } else if (elapsedTimer) {
      clearInterval(elapsedTimer);
      setElapsedTimer(null);
    }
  }, [executionState]);
  
  // Generate monitoring data when status changes
  useEffect(() => {
    if (executionState !== 'idle') {
      setMonitoringData(generateMockMonitoringData(executionStatus));
    } else {
      setMonitoringData(null);
    }
  }, [executionStatus, executionState]);
  
  const steps = ['Provider Configuration', 'Field Mapping', 'Migration Execution'];
  
  // Start simulation when config is submitted
  const handleConfigSubmit = (config: ExecutionConfig) => {
    setExecutionConfig(config);
    startMigration(config);
  };
  
  // Start migration simulation
  const startMigration = (config: ExecutionConfig) => {
    // Clear any existing timers
    if (simulationTimer) {
      clearInterval(simulationTimer);
    }
    
    const totalItems = config.scope === 'test' ? 10 : mockMigrationPreview.estimatedItems;
    const simulationDuration = config.scope === 'test' ? 10 : 60; // seconds
    const updateInterval = 1000; // ms
    const totalUpdates = (simulationDuration * 1000) / updateInterval;
    const progressIncrement = 100 / totalUpdates;
    
    // Initialize state
    setExecutionState('running');
    setExecutionStatus({
      state: 'running',
      progress: 0,
      completedItems: 0,
      totalItems,
      elapsedTime: 0,
      estimatedTimeRemaining: simulationDuration,
      errors: 0,
      warnings: 0,
      statusMessage: 'Migration in progress...',
      currentOperation: 'Fetching test cases from Zephyr'
    });
    
    // Set up simulation timer
    let currentProgress = 0;
    let currentItems = 0;
    let errors = 0;
    let warnings = 0;
    
    const timer = window.setInterval(() => {
      // Increment progress
      currentProgress += progressIncrement;
      
      // Calculate completed items based on progress
      const newItems = Math.floor((currentProgress / 100) * totalItems);
      const itemsCompleted = newItems - currentItems;
      currentItems = newItems;
      
      // Randomly generate errors and warnings
      if (Math.random() < 0.1) {
        errors += 1;
      }
      
      if (Math.random() < 0.2) {
        warnings += Math.floor(Math.random() * 3) + 1;
      }
      
      // Update remaining time
      const progressPercentage = currentProgress / 100;
      const remainingPercentage = 1 - progressPercentage;
      const estimatedTimeRemaining = Math.max(
        1,
        Math.ceil(executionStatus.elapsedTime * (remainingPercentage / progressPercentage))
      );
      
      // Update current operation periodically
      let currentOperation = executionStatus.currentOperation;
      if (currentProgress < 20) {
        currentOperation = 'Fetching test cases from Zephyr';
      } else if (currentProgress < 40) {
        currentOperation = 'Transforming test case data';
      } else if (currentProgress < 60) {
        currentOperation = 'Creating test cases in qTest';
      } else if (currentProgress < 80) {
        currentOperation = 'Processing test steps and attachments';
      } else {
        currentOperation = 'Validating migration results';
      }
      
      // Update current batch info
      const currentBatch = Math.ceil((currentProgress / 100) * 5);
      const totalBatches = 5;
      
      if (currentProgress >= 100) {
        // Simulation complete
        clearInterval(timer);
        setSimulationTimer(null);
        
        // Set final state
        setExecutionState('completed');
        setExecutionStatus(prev => ({
          ...prev,
          state: 'completed',
          progress: 100,
          completedItems: totalItems,
          estimatedTimeRemaining: 0,
          errors,
          warnings,
          statusMessage: 'Migration completed successfully',
          endTime: new Date()
        }));
      } else {
        // Update state during simulation
        setExecutionStatus(prev => ({
          ...prev,
          progress: currentProgress,
          completedItems: currentItems,
          estimatedTimeRemaining,
          errors,
          warnings,
          statusMessage: 'Migration in progress...',
          currentOperation,
          currentBatch,
          totalBatches
        }));
      }
    }, updateInterval);
    
    setSimulationTimer(timer);
  };
  
  // Handle pause with reason
  const handlePause = async (reason?: string) => {
    // Pause the simulation
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    setExecutionState('paused');
    setExecutionStatus(prev => ({
      ...prev,
      state: 'paused',
      statusMessage: `Migration paused${reason ? ` - ${reason}` : ''}`
    }));
    
    // In a real implementation, this would call the migrationService
    // await migrationService.pauseMigration(migrationId, reason);
    
    return Promise.resolve();
  };
  
  // Handle resume
  const handleResume = async () => {
    setExecutionState('running');
    setExecutionStatus(prev => ({
      ...prev,
      state: 'running',
      statusMessage: 'Migration resumed'
    }));
    
    // Restart the simulation from current progress
    const totalItems = executionStatus.totalItems;
    const currentProgress = executionStatus.progress;
    const remainingProgress = 100 - currentProgress;
    
    // Estimate remaining duration based on progress and elapsed time
    const elapsedTime = executionStatus.elapsedTime;
    const estimatedTotalTime = elapsedTime / (currentProgress / 100);
    const remainingTime = estimatedTotalTime - elapsedTime;
    const updateInterval = 1000; // ms
    const totalUpdates = (remainingTime * 1000) / updateInterval;
    const progressIncrement = remainingProgress / totalUpdates;
    
    // Set up simulation timer
    let simulatedProgress = currentProgress;
    let currentItems = executionStatus.completedItems;
    let errors = executionStatus.errors;
    let warnings = executionStatus.warnings;
    
    const timer = window.setInterval(() => {
      // Increment progress
      simulatedProgress += progressIncrement;
      
      // Calculate completed items based on progress
      const newItems = Math.floor((simulatedProgress / 100) * totalItems);
      const itemsCompleted = newItems - currentItems;
      currentItems = newItems;
      
      // Randomly generate errors and warnings
      if (Math.random() < 0.1) {
        errors += 1;
      }
      
      if (Math.random() < 0.2) {
        warnings += Math.floor(Math.random() * 3) + 1;
      }
      
      // Update remaining time
      const progressPercentage = simulatedProgress / 100;
      const remainingPercentage = 1 - progressPercentage;
      const estimatedTimeRemaining = Math.max(
        1,
        Math.ceil(executionStatus.elapsedTime * (remainingPercentage / progressPercentage))
      );
      
      // Update current operation periodically
      let currentOperation = executionStatus.currentOperation;
      if (simulatedProgress < 20) {
        currentOperation = 'Fetching test cases from Zephyr';
      } else if (simulatedProgress < 40) {
        currentOperation = 'Transforming test case data';
      } else if (simulatedProgress < 60) {
        currentOperation = 'Creating test cases in qTest';
      } else if (simulatedProgress < 80) {
        currentOperation = 'Processing test steps and attachments';
      } else {
        currentOperation = 'Validating migration results';
      }
      
      // Update current batch info
      const currentBatch = Math.ceil((simulatedProgress / 100) * 5);
      const totalBatches = 5;
      
      if (simulatedProgress >= 100) {
        // Simulation complete
        clearInterval(timer);
        setSimulationTimer(null);
        
        // Set final state
        setExecutionState('completed');
        setExecutionStatus(prev => ({
          ...prev,
          state: 'completed',
          progress: 100,
          completedItems: totalItems,
          estimatedTimeRemaining: 0,
          errors,
          warnings,
          statusMessage: 'Migration completed successfully',
          endTime: new Date()
        }));
      } else {
        // Update state during simulation
        setExecutionStatus(prev => ({
          ...prev,
          progress: simulatedProgress,
          completedItems: currentItems,
          estimatedTimeRemaining,
          errors,
          warnings,
          statusMessage: 'Migration in progress...',
          currentOperation,
          currentBatch,
          totalBatches
        }));
      }
    }, updateInterval);
    
    setSimulationTimer(timer);
    
    // In a real implementation, this would call the migrationService
    // await migrationService.resumeMigration(migrationId);
    
    return Promise.resolve();
  };
  
  // Handle cancel with resource termination option
  const handleCancel = async (terminateResources: boolean = true) => {
    // Stop the simulation
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    setExecutionState('cancelled');
    setExecutionStatus(prev => ({
      ...prev,
      state: 'cancelled',
      statusMessage: 'Migration cancelled',
      endTime: new Date()
    }));
    
    // In a real implementation, this would call the migrationService
    // await migrationService.cancelMigration(migrationId, terminateResources);
    
    return Promise.resolve();
  };
  
  // Handle restart
  const handleRestart = () => {
    // Reset to idle state
    setExecutionState('idle');
    setExecutionStatus({
      state: 'idle',
      progress: 0,
      completedItems: 0,
      totalItems: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      errors: 0,
      warnings: 0
    });
    
    setExecutionConfig(null);
  };
  
  // Open monitoring details dialog
  const handleOpenDetailsDialog = () => {
    setDetailsDialogOpen(true);
  };
  
  // Close monitoring details dialog
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
  };
  
  // Open remediation dialog for an error
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
      
      // Refresh error status
      if (executionState === 'paused' || executionState === 'failed') {
        // Update status to reflect the remediation
        setExecutionStatus(prev => ({
          ...prev,
          errors: Math.max(0, prev.errors - 1)
        }));
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error applying remediation:', error);
      return Promise.reject(error);
    }
  };
  
  // Handle item actions
  const handleViewItem = (item: any) => {
    console.log('View item:', item);
    // In a real implementation, this would open a dialog to view the item
  };
  
  const handleRetryItem = (item: any) => {
    console.log('Retry item:', item);
    // In a real implementation, this would retry the item migration
  };
  
  const handleSkipItem = (item: any) => {
    console.log('Skip item:', item);
    // In a real implementation, this would mark the item to be skipped
  };
  
  // Handle operation actions
  const handleViewOperation = (operation: any) => {
    console.log('View operation:', operation);
    // In a real implementation, this would open a dialog to view operation details
  };
  
  const handleRetryOperation = (operation: any) => {
    console.log('Retry operation:', operation);
    // In a real implementation, this would retry the operation
  };
  
  const handleSkipOperation = (operation: any) => {
    console.log('Skip operation:', operation);
    // In a real implementation, this would mark the operation to be skipped
  };
  
  // Mock data for import/export
  const handleImportData = (data: any[]) => {
    console.log('Imported data:', data);
    // In a real implementation, we would process the imported data
  };
  
  const handleExportData = () => {
    // In a real implementation, we would return actual data to export
    return [
      { id: 'TC-1001', name: 'Login Test', status: 'Active', priority: 1 },
      { id: 'TC-1002', name: 'User Registration', status: 'Draft', priority: 2 },
      { id: 'TC-1003', name: 'Password Reset', status: 'Active', priority: 1 },
      { id: 'TC-1004', name: 'Account Settings', status: 'Draft', priority: 3 },
      { id: 'TC-1005', name: 'Payment Processing', status: 'Active', priority: 1 }
    ];
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Test Case Migration
        </Typography>
        
        {/* Import/Export toolbar */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ImportExportToolbar
            onImport={handleImportData}
            onExport={handleExportData}
            exportFileName="migration-data"
            importLabel="Import Test Cases"
            exportLabel="Export Results"
          />
        </Box>
      </Box>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box>
        {/* Hide the form when migration is active */}
        {executionState === 'idle' && (
          <>
            <Typography variant="h5" gutterBottom>
              Configure Migration Execution
            </Typography>
            <Typography variant="body1" paragraph>
              Set up the parameters for your test case migration.
            </Typography>
            
            <ExecutionConfigForm 
              onSubmit={handleConfigSubmit}
              migrationPreview={mockMigrationPreview}
              disabled={executionState === 'running'}
            />
          </>
        )}
        
        {/* Migration Dashboard with Execution Control */}
        {executionState !== 'idle' && (
          <>
            {/* Advanced execution control interface */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mb: 3, 
                border: '1px solid',
                borderColor: theme => {
                  switch(executionStatus.state) {
                    case 'running': return theme.palette.primary.main;
                    case 'completed': return theme.palette.success.main;
                    case 'paused': return theme.palette.warning.main;
                    case 'failed': 
                    case 'cancelled': return theme.palette.error.main;
                    default: return theme.palette.divider;
                  }
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  Migration Control Center
                </Typography>
                
                <Box>
                  <Chip 
                    label={executionStatus.state.toUpperCase()}
                    color={
                      executionStatus.state === 'running' ? 'primary' :
                      executionStatus.state === 'completed' ? 'success' :
                      executionStatus.state === 'paused' ? 'warning' :
                      'error'
                    }
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Main control panel and stats grid */}
              <Grid container spacing={3}>
                {/* Left column - Progress and controls */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Migration Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {executionStatus.completedItems} of {executionStatus.totalItems} items
                      </Typography>
                    </Box>
                    
                    <Box sx={{ position: 'relative' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={executionStatus.progress} 
                        color={
                          executionStatus.state === 'running' ? 'primary' :
                          executionStatus.state === 'completed' ? 'success' :
                          executionStatus.state === 'paused' ? 'warning' :
                          'error'
                        }
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          ...(executionStatus.state === 'paused' && {
                            '& .MuiLinearProgress-bar': {
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }
                          })
                        }}
                      />
                      <Typography 
                        variant="body2"
                        sx={{ 
                          position: 'absolute', 
                          right: 0, 
                          top: '100%', 
                          fontSize: '0.75rem' 
                        }}
                      >
                        {executionStatus.progress.toFixed(1)}%
                      </Typography>
                    </Box>
                    
                    {executionStatus.currentOperation && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Current operation: <b>{executionStatus.currentOperation}</b>
                        {executionStatus.currentBatch && executionStatus.totalBatches && (
                          <span> (Batch {executionStatus.currentBatch} of {executionStatus.totalBatches})</span>
                        )}
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Control buttons */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    {executionStatus.state === 'running' && (
                      <Button 
                        variant="contained" 
                        color="warning" 
                        startIcon={<PauseIcon />}
                        onClick={() => handlePause()}
                      >
                        Pause Migration
                      </Button>
                    )}
                    
                    {executionStatus.state === 'paused' && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<PlayArrowIcon />}
                        onClick={handleResume}
                      >
                        Resume Migration
                      </Button>
                    )}
                    
                    {(executionStatus.state === 'running' || executionStatus.state === 'paused') && (
                      <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<StopIcon />}
                        onClick={() => handleCancel()}
                      >
                        Cancel Migration
                      </Button>
                    )}
                    
                    {(executionStatus.state === 'completed' || executionStatus.state === 'failed' || executionStatus.state === 'cancelled') && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<RefreshIcon />}
                        onClick={handleRestart}
                      >
                        Start New Migration
                      </Button>
                    )}
                    
                    <Button 
                      variant="outlined" 
                      startIcon={<VisibilityIcon />}
                      onClick={handleOpenDetailsDialog}
                    >
                      View Detailed Status
                    </Button>
                  </Box>
                  
                  {/* Operation list */}
                  {monitoringData?.operations && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Operation Status
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 0 }}>
                        {monitoringData.operations.slice(0, 5).map((operation, index) => (
                          <Box 
                            key={operation.id}
                            sx={{ 
                              p: 1.5, 
                              borderBottom: index < 4 ? '1px solid' : 'none',
                              borderColor: 'divider',
                              display: 'flex', 
                              alignItems: 'center', 
                              flexWrap: 'wrap',
                              bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: '50%' } }}>
                              {operation.status === 'running' ? (
                                <CircularProgress size={18} sx={{ mr: 1.5 }} />
                              ) : operation.status === 'completed' ? (
                                <CheckCircleIcon color="success" sx={{ mr: 1.5 }} />
                              ) : operation.status === 'failed' ? (
                                <ErrorIcon color="error" sx={{ mr: 1.5 }} />
                              ) : operation.status === 'paused' ? (
                                <PauseIcon color="warning" sx={{ mr: 1.5 }} />
                              ) : operation.status === 'skipped' ? (
                                <SkipNextIcon color="disabled" sx={{ mr: 1.5 }} />
                              ) : (
                                <PendingIcon color="disabled" sx={{ mr: 1.5 }} />
                              )}
                              <Typography variant="body2">
                                {operation.name}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: { xs: '100%', sm: '50%' }, mt: { xs: 1, sm: 0 } }}>
                              <Box sx={{ width: 100, mr: 2 }}>
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
                              
                              <Chip 
                                label={operation.status.toUpperCase()}
                                size="small"
                                color={
                                  operation.status === 'running' ? 'primary' :
                                  operation.status === 'completed' ? 'success' :
                                  operation.status === 'failed' ? 'error' :
                                  operation.status === 'paused' ? 'warning' :
                                  'default'
                                }
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        ))}
                      </Paper>
                    </Box>
                  )}
                </Grid>
                
                {/* Right column - Statistics and metrics */}
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Migration Metrics
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ mb: 3 }}>
                    <List dense disablePadding>
                      <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <ListItemIcon>
                          <AccessTimeIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Elapsed Time" 
                          secondary={formatTime(executionStatus.elapsedTime)}
                        />
                      </ListItem>
                      {executionStatus.state === 'running' && (
                        <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <ListItemIcon>
                            <ScheduleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Estimated Completion" 
                            secondary={formatTime(executionStatus.estimatedTimeRemaining)}
                          />
                        </ListItem>
                      )}
                      <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <ListItemIcon>
                          <SpeedIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Processing Rate" 
                          secondary={monitoringData ? `${monitoringData.statistics.averageItemSpeed.toFixed(1)} items/min` : 'Calculating...'}
                        />
                      </ListItem>
                      <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Errors" 
                          secondary={executionStatus.errors > 0 ? 
                            <Link 
                              component="button" 
                              variant="body2" 
                              color="error"
                              onClick={() => setDetailsDialogOpen(true)}
                            >
                              {executionStatus.errors} error{executionStatus.errors !== 1 ? 's' : ''} detected
                            </Link> :
                            'No errors detected'
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Warnings" 
                          secondary={executionStatus.warnings > 0 ? 
                            `${executionStatus.warnings} warning${executionStatus.warnings !== 1 ? 's' : ''} detected` : 
                            'No warnings detected'
                          }
                        />
                      </ListItem>
                    </List>
                  </Paper>
                  
                  {/* System resources (if available) */}
                  {monitoringData?.statistics?.resourceUsage && (
                    <>
                      <Typography variant="subtitle1" gutterBottom>
                        System Resources
                      </Typography>
                      <Paper variant="outlined">
                        <List dense disablePadding>
                          <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                            <ListItemText 
                              primary="CPU Usage" 
                              secondary={`${monitoringData.statistics.resourceUsage.cpu.toFixed(1)}%`}
                            />
                            <LinearProgress 
                              variant="determinate" 
                              value={monitoringData.statistics.resourceUsage.cpu}
                              color={monitoringData.statistics.resourceUsage.cpu > 80 ? 'error' : 'primary'}
                              sx={{ width: 100 }}
                            />
                          </ListItem>
                          <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                            <ListItemText 
                              primary="Memory Usage" 
                              secondary={`${monitoringData.statistics.resourceUsage.memory.toFixed(1)} MB`}
                            />
                            <LinearProgress 
                              variant="determinate" 
                              value={monitoringData.statistics.resourceUsage.memory / 10}
                              color={monitoringData.statistics.resourceUsage.memory > 800 ? 'error' : 'primary'}
                              sx={{ width: 100 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Network Usage" 
                              secondary={`${monitoringData.statistics.resourceUsage.network.toFixed(1)} MB/s`}
                            />
                            <LinearProgress 
                              variant="determinate" 
                              value={monitoringData.statistics.resourceUsage.network * 50}
                              color="primary"
                              sx={{ width: 100 }}
                            />
                          </ListItem>
                        </List>
                      </Paper>
                    </>
                  )}
                </Grid>
              </Grid>
              
              {/* Recent activity log */}
              {monitoringData?.logs && monitoringData.logs.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <List dense disablePadding>
                      {monitoringData.logs.slice(0, 5).map((log, index) => (
                        <ListItem 
                          key={log.id}
                          sx={{ 
                            borderBottom: index < 4 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
                          }}
                        >
                          <ListItemIcon>
                            {log.level === 'error' ? (
                              <ErrorIcon color="error" fontSize="small" />
                            ) : log.level === 'warn' ? (
                              <WarningIcon color="warning" fontSize="small" />
                            ) : (
                              <InfoIcon color="info" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={log.message}
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Chip 
                                  label={log.component} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {log.timestamp.toLocaleTimeString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}
              
              {/* Error summary - Show when there are errors */}
              {executionStatus.errors > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}>
                    <ErrorIcon sx={{ mr: 1 }} />
                    Error Summary
                  </Typography>
                  <ErrorSummaryPanel 
                    migrationId={executionConfig?.mappingId || 'current-migration'}
                    autoExpand={executionState === 'failed' || executionState === 'paused'}
                    onErrorSelect={handleErrorSelect}
                    maxHeight={250}
                  />
                </Box>
              )}
            </Paper>
            
            {/* Details Dialog */}
            <Dialog 
              open={detailsDialogOpen} 
              onClose={handleCloseDetailsDialog}
              fullWidth
              maxWidth="xl"
            >
              <DialogTitle>
                Migration Status Details
              </DialogTitle>
              <DialogContent>
                {monitoringData && (
                  <ExecutionMonitor
                    data={monitoringData}
                    onViewItem={handleViewItem}
                    onRetryItem={handleRetryItem}
                    onSkipItem={handleSkipItem}
                    onViewOperation={handleViewOperation}
                    onRetryOperation={handleRetryOperation}
                    onSkipOperation={handleSkipOperation}
                  />
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDetailsDialog}>Close</Button>
              </DialogActions>
            </Dialog>
            
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
                    migrationId={executionConfig?.mappingId || 'current-migration'}
                    errorId={selectedErrorId}
                    onRemediate={handleApplyRemediation}
                    onClose={handleCloseRemediationDialog}
                  />
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </Box>
    </Container>
  );
};