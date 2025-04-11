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

interface QTestConfigPanelProps {
  config: ProviderConfig | null;
  onConfigUpdate: (config: ProviderConfig) => void;
  connectionStatus?: 'pending' | 'valid' | 'invalid' | 'unknown';
}

export const QTestConfigPanel: React.FC<QTestConfigPanelProps> = ({
  config,
  onConfigUpdate,
  connectionStatus = 'unknown'
}) => {
  const [showApiToken, setShowApiToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // Form values
  const [instanceUrl, setInstanceUrl] = useState<string>(config?.instanceUrl || 'https://{instance}.qtestnet.com');
  const [apiToken, setApiToken] = useState<string>(config?.apiToken || '');
  const [projectId, setProjectId] = useState<string>(config?.projectId || '');
  const [useAutomationToken, setUseAutomationToken] = useState<boolean>(config?.useAutomationToken || false);
  const [automationToken, setAutomationToken] = useState<string>(config?.automationToken || '');
  const [useImpersonation, setUseImpersonation] = useState<boolean>(config?.useImpersonation || false);
  const [impersonationUser, setImpersonationUser] = useState<string>(config?.impersonationUser || '');
  const [connectionTimeout, setConnectionTimeout] = useState<number>(config?.connectionTimeout || 30);
  const [maxRetries, setMaxRetries] = useState<number>(config?.maxRetries || 3);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(config?.includeAttachments || true);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update internal form state when config changes
  useEffect(() => {
    if (config) {
      setInstanceUrl(config.instanceUrl || 'https://{instance}.qtestnet.com');
      setApiToken(config.apiToken || '');
      setProjectId(config.projectId || '');
      setUseAutomationToken(config.useAutomationToken || false);
      setAutomationToken(config.automationToken || '');
      setUseImpersonation(config.useImpersonation || false);
      setImpersonationUser(config.impersonationUser || '');
      setConnectionTimeout(config.connectionTimeout || 30);
      setMaxRetries(config.maxRetries || 3);
      setIncludeAttachments(config.includeAttachments !== undefined ? config.includeAttachments : true);
    }
  }, [config]);
  
  // Validate form and update config
  const handleSubmit = () => {
    const validationErrors: Record<string, string> = {};
    
    if (!instanceUrl) {
      validationErrors.instanceUrl = 'Instance URL is required';
    } else if (instanceUrl.includes('{instance}')) {
      validationErrors.instanceUrl = 'Please replace {instance} with your qTest instance name';
    }
    
    if (!apiToken) {
      validationErrors.apiToken = 'API Token is required';
    }
    
    if (!projectId) {
      validationErrors.projectId = 'Project ID is required';
    } else if (isNaN(Number(projectId))) {
      validationErrors.projectId = 'Project ID must be a number';
    }
    
    if (useAutomationToken && !automationToken) {
      validationErrors.automationToken = 'Automation Token is required when enabled';
    }
    
    if (useImpersonation && !impersonationUser) {
      validationErrors.impersonationUser = 'Impersonation user is required when enabled';
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
        providerId: 'qtest',
        instanceUrl,
        apiToken,
        projectId,
        useAutomationToken,
        automationToken,
        useImpersonation,
        impersonationUser,
        connectionTimeout,
        maxRetries,
        includeAttachments
      };
      
      onConfigUpdate(updatedConfig);
    }
  };
  
  // Handle form change and update automatically
  const handleChange = (field: string, value: any) => {
    // Update local state
    switch (field) {
      case 'instanceUrl':
        setInstanceUrl(value);
        break;
      case 'apiToken':
        setApiToken(value);
        break;
      case 'projectId':
        setProjectId(value);
        break;
      case 'useAutomationToken':
        setUseAutomationToken(value);
        break;
      case 'automationToken':
        setAutomationToken(value);
        break;
      case 'useImpersonation':
        setUseImpersonation(value);
        break;
      case 'impersonationUser':
        setImpersonationUser(value);
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
    if (instanceUrl && apiToken && projectId && !instanceUrl.includes('{instance}')) {
      handleSubmit();
    }
  }, [
    instanceUrl, 
    apiToken, 
    projectId, 
    useAutomationToken, 
    automationToken, 
    useImpersonation, 
    impersonationUser, 
    connectionTimeout, 
    maxRetries, 
    includeAttachments
  ]);
  
  // Test connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      // Create a connection params object with all the necessary fields
      const params = {
        instanceUrl,
        apiToken,
        projectId,
        useAutomationToken,
        automationToken: useAutomationToken ? automationToken : undefined,
        useImpersonation,
        impersonationUser: useImpersonation ? impersonationUser : undefined,
        connectionTimeout,
        maxRetries,
        includeAttachments
      };
      
      // Call the provider service to test the connection
      const result = await providerService.testConnection('qtest', params);
      
      if (result.success) {
        // If successful, update the config
        onConfigUpdate({
          providerId: 'qtest',
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
  
  // Toggle showing API token
  const handleToggleShowApiToken = () => {
    setShowApiToken(!showApiToken);
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
      <Box 
        sx={{ display: 'flex', alignItems: 'center', mt: 2 }}
        role="status"
        aria-live="polite"
      >
        <BlinkingLight status={connectionStatus} aria-hidden="true" />
        <Chip
          label={statusText}
          color={color as any}
          size="small"
          icon={icon}
          role="status"
        />
      </Box>
    );
  };
  
  const { t } = useTranslation();
  
  // Generate unique IDs for form elements to ensure proper labeling
  const instanceUrlId = React.useId();
  const projectIdId = React.useId();
  const apiTokenId = React.useId();
  const automationTokenId = React.useId();
  const impersonationUserId = React.useId();
  const connectionTimeoutId = React.useId();
  const maxRetriesId = React.useId();
  
  return (
    <Box component="form" role="form" aria-label="qTest Configuration Form">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id={instanceUrlId}
            label="qTest Instance URL"
            variant="outlined"
            value={instanceUrl}
            onChange={(e) => handleChange('instanceUrl', e.target.value)}
            error={!!errors.instanceUrl}
            helperText={errors.instanceUrl || "Replace {instance} with your qTest instance name"}
            margin="normal"
            placeholder="https://mycompany.qtestnet.com"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="The URL of your qTest instance. Replace {instance} with your instance name, e.g., 'mycompany'">
                    <IconButton 
                      edge="end" 
                      size="small"
                      aria-label="Help information for qTest URL"
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            aria-describedby={`${instanceUrlId}-helper-text`}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id={projectIdId}
            label="Project ID"
            variant="outlined"
            value={projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            error={!!errors.projectId}
            helperText={errors.projectId || "The numeric ID of your qTest project"}
            margin="normal"
            placeholder="12345"
            type="number"
            required
            aria-describedby={`${projectIdId}-helper-text`}
            inputProps={{
              'aria-required': 'true',
              min: 1
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id={apiTokenId}
            label="API Token"
            variant="outlined"
            value={apiToken}
            onChange={(e) => handleChange('apiToken', e.target.value)}
            error={!!errors.apiToken}
            helperText={errors.apiToken || "API token from qTest"}
            margin="normal"
            type={showApiToken ? 'text' : 'password'}
            required
            aria-describedby={`${apiTokenId}-helper-text`}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleToggleShowApiToken}
                    edge="end"
                    aria-label={showApiToken ? "Hide API token" : "Show API token"}
                    aria-pressed={showApiToken}
                  >
                    {showApiToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={useAutomationToken}
                onChange={(e) => handleChange('useAutomationToken', e.target.checked)}
                id="use-automation-token-switch"
                aria-describedby="automation-token-description"
              />
            }
            label="Use Automation Token"
            sx={{ mt: 3 }}
          />
          <Typography 
            id="automation-token-description" 
            variant="caption" 
            color="text.secondary"
            sx={{ display: 'block', mt: -1, mb: 1 }}
          >
            Enable to use a separate token for automated testing
          </Typography>
          
          {useAutomationToken && (
            <TextField
              fullWidth
              id={automationTokenId}
              label="Automation Token"
              variant="outlined"
              value={automationToken}
              onChange={(e) => handleChange('automationToken', e.target.value)}
              error={!!errors.automationToken}
              helperText={errors.automationToken}
              margin="normal"
              type={showApiToken ? 'text' : 'password'}
              required={useAutomationToken}
              aria-describedby={`${automationTokenId}-helper-text`}
            />
          )}
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleTestConnection}
          disabled={isTestingConnection || !apiToken || !instanceUrl || !projectId || instanceUrl.includes('{instance}')}
          startIcon={isTestingConnection ? <CircularProgress size={14} /> : null}
          aria-busy={isTestingConnection}
        >
          {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
        </Button>
        
        {renderConnectionStatus()}
      </Box>
      
      {errors.connectionTest && (
        <Box sx={{ mt: 2 }}>
          <Alert 
            severity="error" 
            onClose={() => {
              const newErrors = {...errors};
              delete newErrors.connectionTest;
              setErrors(newErrors);
            }}
            aria-live="assertive"
          >
            {errors.connectionTest}
          </Alert>
        </Box>
      )}
      
      <Accordion
        sx={{ mt: 3 }}
        expanded={advancedSettingsOpen}
        onChange={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          aria-controls="advanced-settings-content"
          id="advanced-settings-header"
        >
          <Typography>Advanced Settings</Typography>
        </AccordionSummary>
        <AccordionDetails id="advanced-settings-content">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useImpersonation}
                    onChange={(e) => handleChange('useImpersonation', e.target.checked)}
                    id="use-impersonation-switch"
                    aria-describedby="impersonation-description"
                  />
                }
                label="Use Impersonation"
              />
              <Typography 
                id="impersonation-description" 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', mt: -1, mb: 1 }}
              >
                Enable to perform actions as another user
              </Typography>
              
              {useImpersonation && (
                <TextField
                  fullWidth
                  id={impersonationUserId}
                  label="Impersonation User"
                  variant="outlined"
                  value={impersonationUser}
                  onChange={(e) => handleChange('impersonationUser', e.target.value)}
                  error={!!errors.impersonationUser}
                  helperText={errors.impersonationUser || "Email of user to impersonate"}
                  margin="normal"
                  placeholder="user@example.com"
                  required={useImpersonation}
                  aria-describedby={`${impersonationUserId}-helper-text`}
                  type="email"
                />
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id={connectionTimeoutId}
                label="Connection Timeout (seconds)"
                variant="outlined"
                type="number"
                value={connectionTimeout}
                onChange={(e) => handleChange('connectionTimeout', Number(e.target.value))}
                error={!!errors.connectionTimeout}
                helperText={errors.connectionTimeout || "Time to wait for server response (1-120 seconds)"}
                margin="normal"
                inputProps={{
                  min: 1,
                  max: 120,
                  'aria-valuemin': 1,
                  'aria-valuemax': 120
                }}
                aria-describedby={`${connectionTimeoutId}-helper-text`}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id={maxRetriesId}
                label="Max Retries"
                variant="outlined"
                type="number"
                value={maxRetries}
                onChange={(e) => handleChange('maxRetries', Number(e.target.value))}
                error={!!errors.maxRetries}
                helperText={errors.maxRetries || "Number of retry attempts (0-10)"}
                margin="normal"
                inputProps={{
                  min: 0,
                  max: 10,
                  'aria-valuemin': 0,
                  'aria-valuemax': 10
                }}
                aria-describedby={`${maxRetriesId}-helper-text`}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeAttachments}
                    onChange={(e) => handleChange('includeAttachments', e.target.checked)}
                    id="include-attachments-switch"
                    aria-describedby="attachments-description"
                  />
                }
                label="Include Attachments"
              />
              <Typography 
                id="attachments-description" 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', mt: -1, mb: 1 }}
              >
                Include test case attachments during migration
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default QTestConfigPanel;