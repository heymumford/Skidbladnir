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
  Button, 
  Paper, 
  Grid, 
  CircularProgress, 
  Alert, 
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
  useTheme,
  styled,
  alpha
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  ZephyrConfigPanel, 
  QTestConfigPanel
} from '../components/Providers';
import { 
  Provider, 
  ZephyrConnectionParams, 
  QTestConnectionParams
} from '../types';
import { providerService } from '../services';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Styled components
const ProviderCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const ProviderLogo = styled('img')(({ theme }) => ({
  width: 48,
  height: 48,
  objectFit: 'contain',
  margin: `${theme.spacing(1)} auto`,
}));

const ConnectionStatusChip = styled(Chip)(({ theme, status }: { theme?: any, status?: 'configured' | 'not-configured' | 'error' }) => {
  let color;
  switch (status) {
    case 'configured':
      color = theme.palette.success;
      break;
    case 'not-configured':
      color = theme.palette.warning;
      break;
    case 'error':
      color = theme.palette.error;
      break;
    default:
      color = theme.palette.grey;
  }
  
  return {
    backgroundColor: alpha(color.main, 0.1),
    color: color.main,
    borderColor: alpha(color.main, 0.3),
    fontWeight: 500,
    fontSize: '0.75rem',
  };
});

const BreadcrumbLink = styled(Link)({
  display: 'flex',
  alignItems: 'center',
});

/**
 * Enhanced Provider Configuration Page with specialized configuration panels
 * for different providers.
 */
export const EnhancedProviderConfigPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Provider-specific configurations
  const [zephyrConfig, setZephyrConfig] = useState<ZephyrConnectionParams | null>(null);
  const [qTestConfig, setQTestConfig] = useState<QTestConnectionParams | null>(null);
  
  // Fetch providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const providers = await providerService.getProviders();
        setProviders(providers);
        
        // Fetch existing configurations
        const zephyrConfig = await providerService.getConnectionConfig('zephyr');
        if (zephyrConfig) {
          setZephyrConfig(zephyrConfig as ZephyrConnectionParams);
        }
        
        const qTestConfig = await providerService.getConnectionConfig('qtest');
        if (qTestConfig) {
          setQTestConfig(qTestConfig as QTestConnectionParams);
        }
      } catch (error) {
        setError(`Error loading providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProviders();
  }, []);
  
  // Handle saving Zephyr configuration
  const handleSaveZephyrConfig = async (params: ZephyrConnectionParams) => {
    try {
      await providerService.saveConnection('zephyr', params);
      setZephyrConfig(params);
    } catch (error) {
      setError(`Error saving Zephyr configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle saving qTest configuration
  const handleSaveQTestConfig = async (params: QTestConnectionParams) => {
    try {
      await providerService.saveConnection('qtest', params);
      setQTestConfig(params);
    } catch (error) {
      setError(`Error saving qTest configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle continue button click
  const handleContinue = () => {
    navigate('/mapping');
  };
  
  // Check if configurations are complete to enable continue button
  const isContinueEnabled = zephyrConfig && qTestConfig;
  
  // Get provider detail cards
  const getProviderCards = () => {
    return providers.map((provider) => {
      // Determine configuration status
      let status: 'configured' | 'not-configured' | 'error' = 'not-configured';
      let statusText = 'Not Configured';
      
      if (provider.id === 'zephyr' && zephyrConfig) {
        status = 'configured';
        statusText = 'Configured';
      } else if (provider.id === 'qtest' && qTestConfig) {
        status = 'configured';
        statusText = 'Configured';
      }
      
      return (
        <Grid item xs={12} sm={6} md={3} key={provider.id}>
          <ProviderCard>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <ProviderLogo src={`/assets/providers/${provider.icon || `${provider.id}.png`}`} alt={provider.name} />
              <Typography variant="h6" component="h3" gutterBottom>
                {provider.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Version {provider.version}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <ConnectionStatusChip 
                  size="small" 
                  label={statusText} 
                  status={status}
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, flexGrow: 1 }}>
                {provider.id === 'zephyr' && 'Zephyr Scale test management platform for Jira.'}
                {provider.id === 'qtest' && 'qTest test management for enterprise teams.'}
                {provider.id !== 'zephyr' && provider.id !== 'qtest' && 'Test management platform.'}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                size="small" 
                onClick={() => setActiveTab(provider.id === 'zephyr' ? 0 : 1)}
                variant={status === 'configured' ? 'outlined' : 'contained'}
                color={status === 'configured' ? 'success' : 'primary'}
              >
                {status === 'configured' ? 'Edit Configuration' : 'Configure'}
              </Button>
            </CardActions>
          </ProviderCard>
        </Grid>
      );
    });
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  return (
    <Box>
      {/* Page header with breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <BreadcrumbLink component={RouterLink} to="/" color="inherit">
            Home
          </BreadcrumbLink>
          <Typography color="primary">Provider Configuration</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
          Provider Configuration
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Configure source and target providers for your test asset migration
        </Typography>
      </Box>
      
      {/* Provider overview */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Available Providers
        </Typography>
        <Typography variant="body2" paragraph color="text.secondary">
          Select and configure the providers you want to use for your migration. You need to configure both a source and a target provider.
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {getProviderCards()}
        </Grid>
      </Paper>
      
      {/* Configuration tabs */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="provider configuration tabs"
          >
            <Tab label="Zephyr Scale (Source)" id="provider-tab-0" />
            <Tab label="qTest Manager (Target)" id="provider-tab-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <ZephyrConfigPanel
            config={zephyrConfig}
            onConfigUpdate={handleSaveZephyrConfig}
            connectionStatus={loading ? 'pending' : zephyrConfig ? 'valid' : 'unknown'}
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <QTestConfigPanel
            config={qTestConfig}
            onConfigUpdate={handleSaveQTestConfig}
            connectionStatus={loading ? 'pending' : qTestConfig ? 'valid' : 'unknown'}
          />
        </TabPanel>
      </Paper>
      
      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          disabled={!isContinueEnabled}
          onClick={handleContinue}
        >
          Continue to Field Mapping
        </Button>
      </Box>
    </Box>
  );
};

export default EnhancedProviderConfigPage;