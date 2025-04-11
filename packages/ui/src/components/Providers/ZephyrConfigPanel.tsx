/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  ToggleButtonGroup,
  ToggleButton,
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
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

interface ZephyrConfigPanelProps {
  config: ProviderConfig | null;
  onConfigUpdate: (config: ProviderConfig) => void;
  connectionStatus?: 'pending' | 'valid' | 'invalid' | 'unknown';
}

export const ZephyrConfigPanel: React.FC<ZephyrConfigPanelProps> = ({
  config,
  onConfigUpdate,
  connectionStatus = 'unknown'
}) => {
  const { t } = useTranslation();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // Form values
  const [baseUrl, setBaseUrl] = useState<string>(config?.baseUrl || 'https://api.zephyrscale.smartbear.com/v2');
  const [apiKey, setApiKey] = useState<string>(config?.apiKey || '');
  const [projectKey, setProjectKey] = useState<string>(config?.projectKey || '');
  const [instanceType, setInstanceType] = useState<'cloud' | 'server'>(config?.instanceType || 'cloud');
  const [connectionTimeout, setConnectionTimeout] = useState<number>(config?.connectionTimeout || 30);
  const [maxRetries, setMaxRetries] = useState<number>(config?.maxRetries || 3);
  const [includeTags, setIncludeTags] = useState<boolean>(config?.includeTags || true);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(config?.includeAttachments || true);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update internal form state when config changes
  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.zephyrscale.smartbear.com/v2');
      setApiKey(config.apiKey || '');
      setProjectKey(config.projectKey || '');
      setInstanceType(config.instanceType || 'cloud');
      setConnectionTimeout(config.connectionTimeout || 30);
      setMaxRetries(config.maxRetries || 3);
      setIncludeTags(config.includeTags !== undefined ? config.includeTags : true);
      setIncludeAttachments(config.includeAttachments !== undefined ? config.includeAttachments : true);
    }
  }, [config]);
  
  // Validate form and update config
  const handleSubmit = () => {
    const validationErrors: Record<string, string> = {};
    
    if (!baseUrl) {
      validationErrors.baseUrl = 'Base URL is required';
    }
    
    if (!apiKey) {
      validationErrors.apiKey = 'API Key is required';
    }
    
    if (!projectKey) {
      validationErrors.projectKey = 'Project Key is required';
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
        providerId: 'zephyr',
        baseUrl,
        apiKey,
        projectKey,
        instanceType,
        connectionTimeout,
        maxRetries,
        includeTags,
        includeAttachments
      };
      
      onConfigUpdate(updatedConfig);
    }
  };
  
  // Handle form change and update automatically
  const handleChange = (field: string, value: any) => {
    // Update local state
    switch (field) {
      case 'baseUrl':
        setBaseUrl(value);
        break;
      case 'apiKey':
        setApiKey(value);
        break;
      case 'projectKey':
        setProjectKey(value);
        break;
      case 'instanceType':
        setInstanceType(value);
        break;
      case 'connectionTimeout':
        setConnectionTimeout(value);
        break;
      case 'maxRetries':
        setMaxRetries(value);
        break;
      case 'includeTags':
        setIncludeTags(value);
        break;
      case 'includeAttachments':
        setIncludeAttachments(value);
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
    if (baseUrl && apiKey && projectKey) {
      handleSubmit();
    }
  }, [baseUrl, apiKey, projectKey, instanceType, connectionTimeout, maxRetries, includeTags, includeAttachments]);
  
  // Test connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      // Create a connection params object
      const params = {
        baseUrl,
        apiKey,
        projectKey,
        instanceType,
        connectionTimeout,
        maxRetries,
        includeTags,
        includeAttachments
      };
      
      // Call the provider service to test the connection
      const result = await providerService.testConnection('zephyr', params);
      
      if (result.success) {
        // If successful, update the config
        onConfigUpdate({
          providerId: 'zephyr',
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
  
  // Toggle showing API key
  const handleToggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
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
        statusText = t('common.connection.success');
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'invalid':
        statusText = t('common.connection.failure');
        color = 'error';
        icon = <CancelIcon fontSize="small" />;
        break;
      case 'pending':
        statusText = t('providers.common.testingConnection');
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
            label={t('providers.zephyr.baseUrl')}
            variant="outlined"
            value={baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            error={!!errors.baseUrl}
            helperText={errors.baseUrl}
            margin="normal"
            placeholder="https://api.zephyrscale.smartbear.com/v2"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={t('providers.zephyr.baseUrlTooltip', 'The base URL for the Zephyr Scale API. For Cloud instances, use the default value. For Server instances, use your server URL.')}>
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="instance-type-label">Instance Type</InputLabel>
            <Select
              labelId="instance-type-label"
              value={instanceType}
              label="Instance Type"
              onChange={(e) => handleChange('instanceType', e.target.value)}
            >
              <MenuItem value="cloud">Zephyr Scale Cloud</MenuItem>
              <MenuItem value="server">Zephyr Scale Server</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="API Key"
            variant="outlined"
            value={apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            error={!!errors.apiKey}
            helperText={errors.apiKey || "API key from Zephyr Scale"}
            margin="normal"
            type={showApiKey ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleToggleShowApiKey}
                    edge="end"
                  >
                    {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Project Key"
            variant="outlined"
            value={projectKey}
            onChange={(e) => handleChange('projectKey', e.target.value)}
            error={!!errors.projectKey}
            helperText={errors.projectKey || "The Jira project key (e.g., 'TEST')"}
            margin="normal"
            placeholder="TEST"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleTestConnection}
          disabled={isTestingConnection || !apiKey || !baseUrl || !projectKey}
          startIcon={isTestingConnection ? <CircularProgress size={14} /> : null}
        >
          {isTestingConnection ? t('providers.common.testingConnection') : t('common.connection.test')}
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
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeTags}
                    onChange={(e) => handleChange('includeTags', e.target.checked)}
                  />
                }
                label="Include Tags"
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
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ZephyrConfigPanel;