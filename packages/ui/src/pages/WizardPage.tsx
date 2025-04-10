/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import { Box, Typography, Alert, AlertTitle, Snackbar } from '@mui/material';
import { MigrationWizard } from '../components/Workflow';
import { useNavigate } from 'react-router-dom';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const handleWizardComplete = () => {
    // Show success notification
    setNotification({
      open: true,
      message: 'Migration started successfully! Redirecting to monitoring page...',
      severity: 'success'
    });
    
    // Redirect to monitoring page after a delay
    setTimeout(() => {
      navigate('/monitoring');
    }, 2000);
  };
  
  const handleWizardCancel = () => {
    // Show info notification
    setNotification({
      open: true,
      message: 'Migration wizard cancelled',
      severity: 'info'
    });
    
    // Redirect to providers page
    navigate('/providers');
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Zephyr → qTest Migration Wizard
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>Information</AlertTitle>
        This wizard will guide you through the process of configuring and executing a Zephyr Scale to qTest migration.
        Follow the steps to set up your providers, map fields, and start the migration.
      </Alert>
      
      <MigrationWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};