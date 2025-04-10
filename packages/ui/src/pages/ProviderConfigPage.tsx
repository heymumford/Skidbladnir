/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, CircularProgress } from '@mui/material';
import { ProviderConfigPanel } from '../components/Providers';
import { Provider, ConnectionParams, ConnectionStatus } from '../types';

import { providerService } from '../services';

export const ProviderConfigPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceConfig, setSourceConfig] = useState<any | null>(null);
  const [targetConfig, setTargetConfig] = useState<any | null>(null);
  
  useEffect(() => {
    // Load providers when the component mounts
    setLoading(true);
    providerService.getProviders()
      .then((data) => {
        setProviders(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Error loading providers: ${err.message}`);
        setLoading(false);
      });
  }, []);
  
  const handleSaveSourceConnection = (providerId: string, params: ConnectionParams) => {
    providerService.saveConnection(providerId, params)
      .then(() => {
        setSourceConfig({
          providerId,
          params
        });
      })
      .catch((err) => {
        console.error('Error saving source connection:', err);
      });
  };
  
  const handleSaveTargetConnection = (providerId: string, params: ConnectionParams) => {
    providerService.saveConnection(providerId, params)
      .then(() => {
        setTargetConfig({
          providerId,
          params
        });
      })
      .catch((err) => {
        console.error('Error saving target connection:', err);
      });
  };
  
  const handleNavigateToNext = () => {
    // In a real application, this would navigate to the next step
    // For now, just log the configurations
    console.log('Proceeding to next step with configurations:', {
      source: sourceConfig,
      target: targetConfig
    });
  };
  
  const isContinueEnabled = sourceConfig && targetConfig;
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Paper sx={{ p: 3, mt: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <Typography variant="h6">Error</Typography>
        <Typography>{error}</Typography>
      </Paper>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Provider Configuration
      </Typography>
      
      <Typography variant="body1" paragraph>
        Configure the source and target providers for your test asset migration.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ProviderConfigPanel
            title="Source Provider"
            providers={providers}
            getConnectionFields={providerService.getConnectionFields}
            testConnection={providerService.testConnection}
            saveConnection={handleSaveSourceConnection}
            existingConfig={sourceConfig}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <ProviderConfigPanel
            title="Target Provider"
            providers={providers}
            getConnectionFields={providerService.getConnectionFields}
            testConnection={providerService.testConnection}
            saveConnection={handleSaveTargetConnection}
            existingConfig={targetConfig}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={!isContinueEnabled}
          onClick={handleNavigateToNext}
        >
          Continue to Field Mapping
        </Button>
      </Box>
    </Box>
  );
};