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
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Chip,
  Grid,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  Alert,
  styled
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ProviderConfig } from '../../types';
import { providerService } from '../../services/ProviderService';

const BlinkingLight = styled('div')<{ status: string }>(({ theme, status }) => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  display: 'inline-block',
  marginRight: '8px',
  backgroundColor:
    status === 'valid'
      ? theme.palette.success.main
      : status === 'invalid'
      ? theme.palette.error.main
      : status === 'pending'
      ? theme.palette.warning.main
      : theme.palette.grey[500],
  animation:
    status === 'pending'
      ? 'blink 1.2s infinite alternate'
      : 'none',
  '@keyframes blink': {
    '0%': {
      opacity: 0.4,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

interface JamaConfigPanelProps {
  config: ProviderConfig | null;
  onConfigUpdate: (config: ProviderConfig) => void;
  connectionStatus?: 'pending' | 'valid' | 'invalid' | 'unknown';
}

export const JamaConfigPanel: React.FC<JamaConfigPanelProps> = ({
  config,
  onConfigUpdate,
  connectionStatus = 'unknown'
}) => {
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // Form values
  const [url, setUrl] = useState<string>(config?.url || 'https://mycompany.jamacloud.com');
  const [clientId, setClientId] = useState<string>(config?.clientId || '');
  const [clientSecret, setClientSecret] = useState<string>(config?.clientSecret || '');
  const [projectId, setProjectId] = useState<string>(config?.projectId || '');
  const [connectionTimeout, setConnectionTimeout] = useState<number>(config?.connectionTimeout || 30);
  const [maxRetries, setMaxRetries] = useState<number>(config?.maxRetries || 3);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(config?.includeAttachments || true);
  const [includeRelationships, setIncludeRelationships] = useState<boolean>(config?.includeRelationships || true);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update internal form state when config changes
  useEffect(() => {
    if (config) {
      setUrl(config.url || 'https://mycompany.jamacloud.com');
      setClientId(config.clientId || '');
      setClientSecret(config.clientSecret || '');
      setProjectId(config.projectId || '');
      setConnectionTimeout(config.connectionTimeout || 30);
      setMaxRetries(config.maxRetries || 3);
      setIncludeAttachments(config.includeAttachments !== undefined ? config.includeAttachments : true);
      setIncludeRelationships(config.includeRelationships !== undefined ? config.includeRelationships : true);
    }
  }, [config]);
  
  // Validate form and update config
  const handleSubmit = () => {
    const validationErrors: Record<string, string> = {};
    
    if (!url) {
      validationErrors.url = 'Jama URL is required';
    }
    
    if (!clientId) {
      validationErrors.clientId = 'Client ID is required';
    }
    
    if (!clientSecret) {
      validationErrors.clientSecret = 'Client Secret is required';
    }
    
    if (!projectId) {
      validationErrors.projectId = 'Project ID is required';
    } else if (isNaN(Number(projectId))) {
      validationErrors.projectId = 'Project ID must be a number';
    }
    
    if (connectionTimeout < 1 || connectionTimeout > 120) {
      validationErrors.connectionTimeout = 'Timeout must be between 1 and 120 seconds';
    }
    
    if (maxRetries < 0 || maxRetries > 10) {
      validationErrors.maxRetries = 'Max retries must be between 0 and 10';
    }
    
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      const updatedConfig: ProviderConfig = {
        providerId: 'jama',
        url,
        clientId,
        clientSecret,
        projectId,
        connectionTimeout,
        maxRetries,
        includeAttachments,
        includeRelationships
      };
      
      onConfigUpdate(updatedConfig);
    }
  };
  
  // Handle form change and update automatically
  const handleChange = (field: string, value: any) => {
    // Update local state
    switch (field) {
      case 'url':
        setUrl(value);
        break;
      case 'clientId':
        setClientId(value);
        break;
      case 'clientSecret':
        setClientSecret(value);
        break;
      case 'projectId':
        setProjectId(value);
        break;
      case 'connectionTimeout':
        setConnectionTimeout(value);
        break;
      case 'maxRetries':
        setMaxRetries(value);
        break;
      case 'includeAttachments':
        setIncludeAttachments(value);
        break;
      case 'includeRelationships':
        setIncludeRelationships(value);
        break;
    }
    
    // Clear error for this field if present
    if (errors[field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors[field];
      setErrors(updatedErrors);
    }
  };
  
  // After any form change, update config
  useEffect(() => {
    if (url && clientId && clientSecret && projectId) {
      handleSubmit();
    }
  }, [
    url,
    clientId,
    clientSecret,
    projectId,
    connectionTimeout,
    maxRetries,
    includeAttachments,
    includeRelationships
  ]);
  
  // Test connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      // Create a connection params object
      const params = {
        url,
        clientId,
        clientSecret,
        projectId,
        connectionTimeout,
        maxRetries,
        includeAttachments,
        includeRelationships
      };
      
      // Call the provider service to test the connection
      const result = await providerService.testConnection('jama', params);
      
      if (result.success) {
        // If successful, update the config
        onConfigUpdate({
          providerId: 'jama',
          ...params
        });
        
        // Show success notification (in a real app)
        console.log('Connection test successful:', result.message);
      } else {
        // Show error notification (in a real app)
        console.error('Connection test failed:', result.message);
        
        // Set error message
        setErrors({
          ...errors,
          connectionTest: result.message
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setErrors({
        ...errors,
        connectionTest: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Toggle showing client secret
  const handleToggleShowClientSecret = () => {
    setShowClientSecret(!showClientSecret);
  };
  
  // Render connection status
  const renderConnectionStatus = () => {
    if (connectionStatus === 'unknown') {
      return null;
    }
    
    let statusText = '';
    let color = '';
    let icon = null;
    
    switch (connectionStatus) {
      case 'valid':
        statusText = 'Connected';
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'invalid':
        statusText = 'Connection Failed';
        color = 'error';
        icon = <CancelIcon fontSize="small" />;
        break;
      case 'pending':
        statusText = 'Connecting...';
        color = 'warning';
        icon = <CircularProgress size={14} />;
        break;
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <BlinkingLight status={connectionStatus} />
        <Chip
          label={statusText}
          color={color as any}
          size="small"
          icon={icon}
        />
      </Box>
    );
  };
  
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Jama URL"
            variant="outlined"
            value={url}
            onChange={(e) => handleChange('url', e.target.value)}
            error={!!errors.url}
            helperText={errors.url}
            margin="normal"
            placeholder="https://mycompany.jamacloud.com"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="The URL of your Jama Connect instance">
                    <IconButton edge="end" size="small">
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Project ID"
            variant="outlined"
            value={projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            error={!!errors.projectId}
            helperText={errors.projectId || "The numeric ID of your Jama project"}
            margin="normal"
            placeholder="12345"
            type="number"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Client ID"
            variant="outlined"
            value={clientId}
            onChange={(e) => handleChange('clientId', e.target.value)}
            error={!!errors.clientId}
            helperText={errors.clientId || "OAuth Client ID from Jama Connect"}
            margin="normal"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Client Secret"
            variant="outlined"
            value={clientSecret}
            onChange={(e) => handleChange('clientSecret', e.target.value)}
            error={!!errors.clientSecret}
            helperText={errors.clientSecret || "OAuth Client Secret from Jama Connect"}
            margin="normal"
            type={showClientSecret ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleToggleShowClientSecret}
                    edge="end"
                  >
                    {showClientSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleTestConnection}
          disabled={isTestingConnection || !clientSecret || !url || !clientId || !projectId}
          startIcon={isTestingConnection ? <CircularProgress size={14} /> : null}
        >
          {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
        </Button>
        
        {renderConnectionStatus()}
      </Box>
      
      {errors.connectionTest && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error" onClose={() => {
            const newErrors = {...errors};
            delete newErrors.connectionTest;
            setErrors(newErrors);
          }}>
            {errors.connectionTest}
          </Alert>
        </Box>
      )}
      
      <Accordion
        sx={{ mt: 3 }}
        expanded={advancedSettingsOpen}
        onChange={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Advanced Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Connection Timeout (seconds)"
                variant="outlined"
                type="number"
                value={connectionTimeout}
                onChange={(e) => handleChange('connectionTimeout', Number(e.target.value))}
                error={!!errors.connectionTimeout}
                helperText={errors.connectionTimeout}
                InputProps={{ inputProps: { min: 1, max: 120 } }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Retries"
                variant="outlined"
                type="number"
                value={maxRetries}
                onChange={(e) => handleChange('maxRetries', Number(e.target.value))}
                error={!!errors.maxRetries}
                helperText={errors.maxRetries}
                InputProps={{ inputProps: { min: 0, max: 10 } }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeAttachments}
                    onChange={(e) => handleChange('includeAttachments', e.target.checked)}
                  />
                }
                label="Include Attachments"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeRelationships}
                    onChange={(e) => handleChange('includeRelationships', e.target.checked)}
                  />
                }
                label="Include Relationships"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default JamaConfigPanel;