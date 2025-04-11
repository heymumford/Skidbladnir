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

interface ALMConfigPanelProps {
  config: ProviderConfig | null;
  onConfigUpdate: (config: ProviderConfig) => void;
  connectionStatus?: 'pending' | 'valid' | 'invalid' | 'unknown';
}

export const ALMConfigPanel: React.FC<ALMConfigPanelProps> = ({
  config,
  onConfigUpdate,
  connectionStatus = 'unknown'
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // Form values
  const [url, setUrl] = useState<string>(config?.url || 'https://alm.mycompany.com');
  const [username, setUsername] = useState<string>(config?.username || '');
  const [password, setPassword] = useState<string>(config?.password || '');
  const [domain, setDomain] = useState<string>(config?.domain || 'DEFAULT');
  const [project, setProject] = useState<string>(config?.project || '');
  const [connectionTimeout, setConnectionTimeout] = useState<number>(config?.connectionTimeout || 30);
  const [maxRetries, setMaxRetries] = useState<number>(config?.maxRetries || 3);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(config?.includeAttachments || true);
  const [includeRequirements, setIncludeRequirements] = useState<boolean>(config?.includeRequirements || false);
  const [useClientCertificate, setUseClientCertificate] = useState<boolean>(config?.useClientCertificate || false);
  const [certificatePath, setCertificatePath] = useState<string>(config?.certificatePath || '');
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update internal form state when config changes
  useEffect(() => {
    if (config) {
      setUrl(config.url || 'https://alm.mycompany.com');
      setUsername(config.username || '');
      setPassword(config.password || '');
      setDomain(config.domain || 'DEFAULT');
      setProject(config.project || '');
      setConnectionTimeout(config.connectionTimeout || 30);
      setMaxRetries(config.maxRetries || 3);
      setIncludeAttachments(config.includeAttachments !== undefined ? config.includeAttachments : true);
      setIncludeRequirements(config.includeRequirements !== undefined ? config.includeRequirements : false);
      setUseClientCertificate(config.useClientCertificate || false);
      setCertificatePath(config.certificatePath || '');
    }
  }, [config]);
  
  // Validate form and update config
  const handleSubmit = () => {
    const validationErrors: Record<string, string> = {};
    
    if (!url) {
      validationErrors.url = 'ALM URL is required';
    }
    
    if (!username) {
      validationErrors.username = 'Username is required';
    }
    
    if (!password) {
      validationErrors.password = 'Password is required';
    }
    
    if (!domain) {
      validationErrors.domain = 'Domain is required';
    }
    
    if (!project) {
      validationErrors.project = 'Project is required';
    }
    
    if (connectionTimeout < 1 || connectionTimeout > 120) {
      validationErrors.connectionTimeout = 'Timeout must be between 1 and 120 seconds';
    }
    
    if (maxRetries < 0 || maxRetries > 10) {
      validationErrors.maxRetries = 'Max retries must be between 0 and 10';
    }
    
    if (useClientCertificate && !certificatePath) {
      validationErrors.certificatePath = 'Certificate path is required when using client certificate';
    }
    
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      const updatedConfig: ProviderConfig = {
        providerId: 'hp-alm',
        url,
        username,
        password,
        domain,
        project,
        connectionTimeout,
        maxRetries,
        includeAttachments,
        includeRequirements,
        useClientCertificate,
        certificatePath: useClientCertificate ? certificatePath : undefined
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
      case 'username':
        setUsername(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'domain':
        setDomain(value);
        break;
      case 'project':
        setProject(value);
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
      case 'includeRequirements':
        setIncludeRequirements(value);
        break;
      case 'useClientCertificate':
        setUseClientCertificate(value);
        break;
      case 'certificatePath':
        setCertificatePath(value);
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
    if (url && username && password && domain && project) {
      handleSubmit();
    }
  }, [
    url,
    username,
    password,
    domain,
    project,
    connectionTimeout,
    maxRetries,
    includeAttachments,
    includeRequirements,
    useClientCertificate,
    certificatePath
  ]);
  
  // Test connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      // Create a connection params object
      const params = {
        url,
        username,
        password,
        domain,
        project,
        connectionTimeout,
        maxRetries,
        includeAttachments,
        includeRequirements,
        useClientCertificate,
        certificatePath: useClientCertificate ? certificatePath : undefined
      };
      
      // Call the provider service to test the connection
      const result = await providerService.testConnection('hp-alm', params);
      
      if (result.success) {
        // If successful, update the config
        onConfigUpdate({
          providerId: 'hp-alm',
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
  
  // Toggle showing password
  const handleToggleShowPassword = () => {
    setShowPassword(!showPassword);
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
        <Grid item xs={12} md={12}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This panel configures the connection to Micro Focus ALM (formerly HP ALM/Quality Center).
            </Typography>
          </Alert>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ALM URL"
            variant="outlined"
            value={url}
            onChange={(e) => handleChange('url', e.target.value)}
            error={!!errors.url}
            helperText={errors.url}
            margin="normal"
            placeholder="https://alm.mycompany.com"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="The URL of your Micro Focus ALM instance">
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
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => handleChange('username', e.target.value)}
            error={!!errors.username}
            helperText={errors.username}
            margin="normal"
            placeholder="username"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Password"
            variant="outlined"
            value={password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleToggleShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Domain"
            variant="outlined"
            value={domain}
            onChange={(e) => handleChange('domain', e.target.value)}
            error={!!errors.domain}
            helperText={errors.domain || "The ALM domain (typically DEFAULT)"}
            margin="normal"
            placeholder="DEFAULT"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Project"
            variant="outlined"
            value={project}
            onChange={(e) => handleChange('project', e.target.value)}
            error={!!errors.project}
            helperText={errors.project || "The ALM project name"}
            margin="normal"
            placeholder="TestProject"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleTestConnection}
          disabled={isTestingConnection || !password || !url || !username || !domain || !project}
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
                    checked={includeRequirements}
                    onChange={(e) => handleChange('includeRequirements', e.target.checked)}
                  />
                }
                label="Include Requirements"
              />
            </Grid>
            
            <Grid item xs={12} md={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useClientCertificate}
                    onChange={(e) => handleChange('useClientCertificate', e.target.checked)}
                  />
                }
                label="Use Client Certificate"
              />
              
              {useClientCertificate && (
                <TextField
                  fullWidth
                  label="Certificate Path"
                  variant="outlined"
                  value={certificatePath}
                  onChange={(e) => handleChange('certificatePath', e.target.value)}
                  error={!!errors.certificatePath}
                  helperText={errors.certificatePath}
                  margin="normal"
                  placeholder="/path/to/certificate.p12"
                />
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ALMConfigPanel;