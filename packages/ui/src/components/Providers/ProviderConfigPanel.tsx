/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, Skeleton } from '@mui/material';
import { ProviderSelector } from './ProviderSelector';
import { ConnectionForm } from './ConnectionForm';
import { Provider, ConnectionParams, ConnectionStatus } from '../../types';

// Connection field for a provider
interface ConnectionField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

// Existing configuration
interface ConnectionConfig {
  providerId: string;
  params: ConnectionParams;
}

interface ProviderConfigPanelProps {
  /**
   * Title of the provider configuration panel
   */
  title: string;
  
  /**
   * List of available providers
   */
  providers: Provider[];
  
  /**
   * Function to get connection fields for a provider
   */
  getConnectionFields: (providerId: string) => Promise<ConnectionField[]>;
  
  /**
   * Function to test a connection
   */
  testConnection: (providerId: string, params: ConnectionParams) => Promise<ConnectionStatus>;
  
  /**
   * Function to save a connection
   */
  saveConnection: (providerId: string, params: ConnectionParams) => void;
  
  /**
   * Existing provider configuration
   */
  existingConfig?: ConnectionConfig;
  
  /**
   * Whether the panel is disabled
   */
  disabled?: boolean;
  
  /**
   * Optional callback when provider is selected
   */
  onProviderSelect?: (provider: Provider) => void;
}

export const ProviderConfigPanel: React.FC<ProviderConfigPanelProps> = ({
  title,
  providers,
  getConnectionFields,
  testConnection,
  saveConnection,
  existingConfig,
  disabled = false,
  onProviderSelect
}) => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>(
    existingConfig ? providers.find(p => p.id === existingConfig.providerId) : undefined
  );
  
  const [connectionFields, setConnectionFields] = useState<ConnectionField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load connection fields when provider is selected
  useEffect(() => {
    if (selectedProvider) {
      setLoading(true);
      setError(null);
      setConnectionFields([]);
      
      getConnectionFields(selectedProvider.id)
        .then((fields) => {
          setConnectionFields(fields);
          setLoading(false);
        })
        .catch((err) => {
          setError(`Error loading connection fields: ${err.message}`);
          setLoading(false);
        });
    }
  }, [selectedProvider, getConnectionFields]);
  
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    if (onProviderSelect) {
      onProviderSelect(provider);
    }
  };
  
  const handleTestConnection = async (params: ConnectionParams): Promise<ConnectionStatus> => {
    if (!selectedProvider) {
      return { success: false, message: 'No provider selected' };
    }
    
    try {
      return await testConnection(selectedProvider.id, params);
    } catch (err) {
      return { 
        success: false, 
        message: `Error testing connection: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  };
  
  const handleSaveConnection = (params: ConnectionParams) => {
    if (selectedProvider) {
      saveConnection(selectedProvider.id, params);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <ProviderSelector
          providers={providers}
          label="Provider"
          placeholder="Select a provider"
          onSelect={handleProviderSelect}
          value={selectedProvider}
          disabled={disabled}
          showVersion
        />
      </Box>
      
      {selectedProvider && (
        <>
          <Divider sx={{ mb: 3 }} />
          
          {loading ? (
            <Box sx={{ mb: 3 }}>
              <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={60} />
            </Box>
          ) : error ? (
            <Typography color="error">
              {error}
            </Typography>
          ) : (
            <ConnectionForm
              provider={selectedProvider}
              connectionFields={connectionFields}
              onSubmit={handleSaveConnection}
              onTest={handleTestConnection}
              existingParams={existingConfig?.params}
              disabled={disabled}
            />
          )}
        </>
      )}
    </Paper>
  );
};