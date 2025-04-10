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
  Container, 
  Typography, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Paper,
  Alert,
  Button
} from '@mui/material';
import { ExecutionConfigForm, ExecutionConfig, MigrationPreview } from '../components/Execution/ExecutionConfigForm';

const mockMigrationPreview: MigrationPreview = {
  estimatedItems: 1243,
  estimatedDuration: 45,
  potentialIssues: [
    'Some attachments may exceed size limits',
    'Custom fields may require manual review'
  ]
};

interface ExecutionStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  progress?: number;
  completedItems?: number;
  totalItems?: number;
}

export const ExecutionPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(2); // Assuming this is the third step after provider config and field mapping
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({ status: 'idle' });

  const steps = ['Provider Configuration', 'Field Mapping', 'Migration Execution'];

  const handleConfigSubmit = (config: ExecutionConfig) => {
    setExecutionConfig(config);
    
    // Simulate starting the migration
    setExecutionStatus({
      status: 'running',
      message: 'Migration in progress...',
      progress: 0,
      completedItems: 0,
      totalItems: config.scope === 'test' ? 10 : mockMigrationPreview.estimatedItems
    });

    // Simulate migration progress
    if (config.scope === 'test') {
      // Simulate a test run that completes quickly
      setTimeout(() => {
        setExecutionStatus({
          status: 'success',
          message: 'Test migration completed successfully.',
          progress: 100,
          completedItems: 10,
          totalItems: 10
        });
      }, 3000);
    } else {
      // Simulate a real migration with progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        const completedItems = Math.floor((progress / 100) * mockMigrationPreview.estimatedItems);
        
        if (progress >= 100) {
          clearInterval(interval);
          setExecutionStatus({
            status: 'success',
            message: 'Migration completed successfully.',
            progress: 100,
            completedItems: mockMigrationPreview.estimatedItems,
            totalItems: mockMigrationPreview.estimatedItems
          });
        } else {
          setExecutionStatus({
            status: 'running',
            message: 'Migration in progress...',
            progress,
            completedItems,
            totalItems: mockMigrationPreview.estimatedItems
          });
        }
      }, 1500);
    }
  };

  // Function to render the current execution status
  const renderExecutionStatus = () => {
    if (executionStatus.status === 'idle') {
      return null;
    }

    const progressPercentage = executionStatus.progress || 0;
    const completedItems = executionStatus.completedItems || 0;
    const totalItems = executionStatus.totalItems || 0;

    let alertSeverity: 'info' | 'success' | 'error' = 'info';
    if (executionStatus.status === 'success') alertSeverity = 'success';
    if (executionStatus.status === 'error') alertSeverity = 'error';

    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity={alertSeverity} sx={{ mb: 2 }}>
          {executionStatus.message}
        </Alert>
        
        {executionStatus.status === 'running' && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6">Migration Progress</Typography>
            <Box sx={{ 
              height: 20, 
              width: '100%', 
              bgcolor: 'grey.300', 
              borderRadius: 1, 
              mt: 2, 
              mb: 1,
              position: 'relative' 
            }}>
              <Box sx={{ 
                height: '100%', 
                width: `${progressPercentage}%`, 
                bgcolor: 'primary.main', 
                borderRadius: 1,
                transition: 'width 0.5s ease-in-out'
              }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {completedItems} of {totalItems} items processed ({progressPercentage}%)
            </Typography>
          </Paper>
        )}

        {executionStatus.status === 'success' && (
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={() => setExecutionStatus({ status: 'idle' })}
            >
              Start New Migration
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Test Case Migration
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box>
        <Typography variant="h5" gutterBottom>
          Configure Migration Execution
        </Typography>
        <Typography variant="body1" paragraph>
          Set up the parameters for your test case migration.
        </Typography>
        
        <ExecutionConfigForm 
          onSubmit={handleConfigSubmit}
          migrationPreview={mockMigrationPreview}
          disabled={executionStatus.status === 'running'}
        />

        {renderExecutionStatus()}
      </Box>
    </Container>
  );
};