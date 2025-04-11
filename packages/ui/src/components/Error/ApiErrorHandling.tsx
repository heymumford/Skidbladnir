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
  Box, Typography, Paper, Divider, Card, CardContent, 
  LinearProgress, Chip, Collapse, IconButton, Tooltip, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, CircularProgress, useTheme, Badge, Alert
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CloseIcon from '@mui/icons-material/Close';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TimerIcon from '@mui/icons-material/Timer';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import { ErrorDetails, RemediationSuggestion, migrationService } from '../../services/MigrationService';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { ErrorRemediationPanel } from './ErrorRemediationPanel';
import { useErrorAnalysis } from '../../hooks';

interface ApiErrorHandlingProps {
  migrationId: string;
  providerId?: string;
  onRemediate?: (errorId: string, remediationId: string) => Promise<void>;
  onClose?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`error-tabpanel-${index}`}
      aria-labelledby={`error-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

export const ApiErrorHandling: React.FC<ApiErrorHandlingProps> = ({
  migrationId,
  providerId,
  onRemediate,
  onClose
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [apiErrors, setApiErrors] = useState<ErrorDetails[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [apiHealthStatus, setApiHealthStatus] = useState<'healthy' | 'degraded' | 'failed'>('healthy');
  const [retryingOperation, setRetryingOperation] = useState(false);

  // Fetch errors when component mounts
  useEffect(() => {
    const fetchErrors = async () => {
      try {
        setLoading(true);
        const fetchedErrors = await migrationService.getErrorDetails(migrationId);
        setErrors(fetchedErrors);
        
        // Filter for API-related errors
        const apiRelatedErrors = fetchedErrors.filter(error => 
          // Network errors are API-related
          error.errorType === 'network' || 
          // Auth errors related to API calls
          (error.errorType === 'auth' && error.context?.apiEndpoint) ||
          // Validation errors with API context
          (error.errorType === 'validation' && error.context?.apiEndpoint) ||
          // Resource errors from API operations
          (error.errorType === 'resource' && error.context?.apiEndpoint) ||
          // System errors in API components
          (error.component.toLowerCase().includes('provider') || 
           error.operation.toLowerCase().includes('api') ||
           error.message.toLowerCase().includes('api'))
        );
        
        setApiErrors(apiRelatedErrors);
        
        // Determine API health status based on errors
        if (apiRelatedErrors.length === 0) {
          setApiHealthStatus('healthy');
        } else if (apiRelatedErrors.some(e => e.errorType === 'system' || e.errorType === 'network')) {
          setApiHealthStatus('failed');
        } else {
          setApiHealthStatus('degraded');
        }
      } catch (err) {
        console.error('Error fetching error details:', err);
        setApiHealthStatus('failed');
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, [migrationId]);

  // Initialize error analysis hook
  const {
    loading: analysisLoading,
    errorAnalysis,
    getSuggestedRemediations,
    getBestRemediation
  } = useErrorAnalysis(errors);

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Open remediation dialog for an error
  const handleOpenRemediationDialog = (error: ErrorDetails) => {
    setSelectedError(error);
    setRemediationDialogOpen(true);
  };

  // Close remediation dialog
  const handleCloseRemediationDialog = () => {
    setRemediationDialogOpen(false);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get color for API health status
  const getHealthStatusColor = () => {
    switch (apiHealthStatus) {
      case 'healthy': return theme.palette.success.main;
      case 'degraded': return theme.palette.warning.main;
      case 'failed': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  // Get message for API health status
  const getHealthStatusMessage = () => {
    switch (apiHealthStatus) {
      case 'healthy': return 'API connections are functioning normally';
      case 'degraded': return 'API connections are experiencing issues';
      case 'failed': return 'API connections are unavailable';
      default: return 'Unknown API status';
    }
  };

  // Get icon for error type
  const getErrorTypeIcon = (errorType: string) => {
    switch (errorType) {
      case 'auth': return <SecurityIcon />;
      case 'network': return <NetworkCheckIcon />;
      case 'validation': return <CodeIcon />;
      case 'resource': return <SettingsIcon />;
      case 'system': return <WarningIcon />;
      default: return <ErrorOutlineIcon />;
    }
  };

  // Handle retry operation
  const handleRetryOperation = async () => {
    if (!selectedError) return;
    
    setRetryingOperation(true);
    
    try {
      // Simulate retry operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh error list (would connect to a real retry API in production)
      const fetchedErrors = await migrationService.getErrorDetails(migrationId);
      setErrors(fetchedErrors);
      
      // Filter for API-related errors
      const apiRelatedErrors = fetchedErrors.filter(error => 
        error.errorType === 'network' || 
        (error.errorType === 'auth' && error.context?.apiEndpoint) ||
        (error.errorType === 'validation' && error.context?.apiEndpoint) ||
        (error.errorType === 'resource' && error.context?.apiEndpoint) ||
        (error.component.toLowerCase().includes('provider') || 
         error.operation.toLowerCase().includes('api') ||
         error.message.toLowerCase().includes('api'))
      );
      
      setApiErrors(apiRelatedErrors);
      
      // Close the dialog
      setRemediationDialogOpen(false);
    } catch (err) {
      console.error('Error retrying operation:', err);
    } finally {
      setRetryingOperation(false);
    }
  };

  // Group errors by API component
  const errorsByComponent: Record<string, ErrorDetails[]> = {};
  apiErrors.forEach(error => {
    const component = error.component;
    errorsByComponent[component] = errorsByComponent[component] || [];
    errorsByComponent[component].push(error);
  });

  // Group errors by error type
  const errorsByType: Record<string, ErrorDetails[]> = {};
  apiErrors.forEach(error => {
    const errorType = error.errorType;
    errorsByType[errorType] = errorsByType[errorType] || [];
    errorsByType[errorType].push(error);
  });

  // Get most common error type
  const mostCommonErrorType = Object.entries(errorsByType)
    .sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null;

  // Get status code distribution
  const statusCodeCounts: Record<string, number> = {};
  apiErrors.forEach(error => {
    if (error.details?.statusCode) {
      const code = error.details.statusCode.toString();
      statusCodeCounts[code] = (statusCodeCounts[code] || 0) + 1;
    }
  });

  return (
    <Paper sx={{ p: 0, mb: 3, overflow: 'hidden' }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NetworkCheckIcon sx={{ mr: 1, color: getHealthStatusColor() }} />
          <Typography variant="h6">
            API Connection Status
          </Typography>
          <Tooltip title="Details about API connection health and errors">
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={apiHealthStatus.toUpperCase()}
            color={apiHealthStatus === 'healthy' ? 'success' : apiHealthStatus === 'degraded' ? 'warning' : 'error'}
            size="small"
            sx={{ mr: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {apiErrors.length} {apiErrors.length === 1 ? 'error' : 'errors'}
          </Typography>
          
          <IconButton size="small" onClick={toggleExpanded}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ width: '100%', p: 2 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Collapse in={expanded}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="api error tabs"
              variant="fullWidth"
            >
              <Tab 
                icon={<ErrorOutlineIcon />} 
                iconPosition="start" 
                label={
                  <Badge 
                    badgeContent={apiErrors.length} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': { 
                        right: -15, 
                        top: 4
                      } 
                    }}
                  >
                    <span>Error Details</span>
                  </Badge>
                } 
                id="error-tab-0" 
              />
              <Tab 
                icon={<TipsAndUpdatesIcon />} 
                iconPosition="start" 
                label="Remediation Options" 
                id="error-tab-1" 
              />
              <Tab 
                icon={<NetworkCheckIcon />} 
                iconPosition="start" 
                label="API Health" 
                id="error-tab-2" 
              />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            {apiErrors.length === 0 ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                No API errors detected in this migration.
              </Alert>
            ) : (
              <Box>
                <Alert 
                  severity={apiHealthStatus === 'healthy' ? 'success' : apiHealthStatus === 'degraded' ? 'warning' : 'error'} 
                  sx={{ mb: 2 }}
                >
                  {getHealthStatusMessage()}
                  {apiHealthStatus !== 'healthy' && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        Primary issue: {mostCommonErrorType && (
                          <strong>
                            {mostCommonErrorType.charAt(0).toUpperCase() + mostCommonErrorType.slice(1)} errors 
                            ({errorsByType[mostCommonErrorType].length})
                          </strong>
                        )}
                      </Typography>
                    </Box>
                  )}
                </Alert>
                
                <Typography variant="subtitle1" gutterBottom>
                  API Errors by Component
                </Typography>
                
                {Object.entries(errorsByComponent).map(([component, componentErrors]) => (
                  <Box key={component} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {component} ({componentErrors.length} {componentErrors.length === 1 ? 'error' : 'errors'})
                    </Typography>
                    
                    {componentErrors.map(error => (
                      <Card 
                        key={error.errorId} 
                        variant="outlined" 
                        sx={{ 
                          mb: 1,
                          borderLeft: `4px solid ${
                            error.errorType === 'auth' ? theme.palette.warning.main :
                            error.errorType === 'network' ? theme.palette.info.main :
                            error.errorType === 'validation' ? theme.palette.success.main :
                            error.errorType === 'resource' ? theme.palette.secondary.main :
                            error.errorType === 'system' ? theme.palette.error.main :
                            theme.palette.grey[500]
                          }`,
                          '&:hover': { boxShadow: 1 },
                          cursor: 'pointer'
                        }}
                        onClick={() => handleOpenRemediationDialog(error)}
                      >
                        <CardContent sx={{ py: 1.5, px: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2">{error.message}</Typography>
                                {error.details?.statusCode && (
                                  <Chip 
                                    label={`HTTP ${error.details.statusCode}`}
                                    size="small"
                                    color={
                                      error.details.statusCode >= 500 ? 'error' :
                                      error.details.statusCode >= 400 ? 'warning' :
                                      'default'
                                    }
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {error.operation} • {formatTime(error.timestamp)}
                                {error.context?.apiEndpoint && (
                                  <span> • {error.context.apiEndpoint}</span>
                                )}
                              </Typography>
                            </Box>
                            <Tooltip title="View remediation options">
                              <Chip 
                                icon={<TipsAndUpdatesIcon />} 
                                label="Fix" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRemediationDialog(error);
                                }}
                              />
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ))}
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            {apiErrors.length === 0 ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                No API errors to remediate.
              </Alert>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Available Remediation Options
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Alert 
                    severity="info" 
                    icon={<TimerIcon />}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="body2">
                      Many API errors can be resolved automatically. Select an error to see specific remediation options or 
                      use the general remediation options below.
                    </Typography>
                  </Alert>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Button 
                      variant="outlined"
                      startIcon={<AutorenewIcon />}
                      onClick={() => setRetryingOperation(true)}
                      disabled={retryingOperation}
                    >
                      {retryingOperation ? 'Retrying...' : 'Retry All Failed Operations'}
                    </Button>
                    
                    <Button 
                      variant="outlined"
                      startIcon={<SecurityIcon />}
                      onClick={() => {
                        // Find first auth error to remediate
                        const authError = apiErrors.find(e => e.errorType === 'auth');
                        if (authError) {
                          handleOpenRemediationDialog(authError);
                        }
                      }}
                      disabled={!errorsByType['auth']?.length}
                    >
                      Refresh Authentication
                    </Button>
                    
                    <Button 
                      variant="outlined"
                      startIcon={<NetworkCheckIcon />}
                      onClick={() => {
                        // Find first network error to remediate
                        const networkError = apiErrors.find(e => e.errorType === 'network');
                        if (networkError) {
                          handleOpenRemediationDialog(networkError);
                        }
                      }}
                      disabled={!errorsByType['network']?.length}
                    >
                      Adjust Rate Limits
                    </Button>
                  </Box>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Error Types
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  {Object.entries(errorsByType).map(([errorType, typeErrors]) => (
                    <Card key={errorType} variant="outlined" sx={{ mb: 1, p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getErrorTypeIcon(errorType)}
                          <Typography variant="subtitle2" sx={{ ml: 1 }}>
                            {errorType.charAt(0).toUpperCase() + errorType.slice(1)} Errors ({typeErrors.length})
                          </Typography>
                        </Box>
                        <Button 
                          size="small" 
                          variant="text"
                          onClick={() => {
                            // Open the first error of this type
                            if (typeErrors.length > 0) {
                              handleOpenRemediationDialog(typeErrors[0]);
                            }
                          }}
                        >
                          View Details
                        </Button>
                      </Box>
                    </Card>
                  ))}
                </Box>
                
                {Object.keys(statusCodeCounts).length > 0 && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      HTTP Status Codes
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {Object.entries(statusCodeCounts).map(([code, count]) => (
                        <Chip 
                          key={code}
                          label={`${code} (${count})`}
                          color={
                            parseInt(code) >= 500 ? 'error' :
                            parseInt(code) >= 400 ? 'warning' :
                            'default'
                          }
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                API Connection Health
              </Typography>
              
              <Box sx={{ 
                p: 2, 
                borderRadius: 1, 
                bgcolor: 
                  apiHealthStatus === 'healthy' ? 'success.main' :
                  apiHealthStatus === 'degraded' ? 'warning.main' :
                  'error.main',
                color: '#fff',
                mb: 3
              }}>
                <Typography variant="h6">
                  {apiHealthStatus === 'healthy' ? 'API Connections Healthy' :
                   apiHealthStatus === 'degraded' ? 'API Connections Degraded' :
                   'API Connections Failed'}
                </Typography>
                <Typography variant="body2">
                  {apiHealthStatus === 'healthy' ? 
                    'All API endpoints are responding normally.' :
                    apiHealthStatus === 'degraded' ?
                    'Some API endpoints are experiencing issues but are still accessible.' :
                    'Critical API endpoints are not responding. Immediate attention required.'}
                </Typography>
              </Box>
              
              {apiErrors.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Recent API Activities
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[...apiErrors]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 5)
                      .map(error => (
                        <Box 
                          key={error.errorId}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            p: 1,
                            borderLeft: `4px solid ${
                              error.errorType === 'auth' ? theme.palette.warning.main :
                              error.errorType === 'network' ? theme.palette.info.main :
                              error.errorType === 'validation' ? theme.palette.success.main :
                              error.errorType === 'resource' ? theme.palette.secondary.main :
                              error.errorType === 'system' ? theme.palette.error.main :
                              theme.palette.grey[500]
                            }`,
                            borderRadius: 1,
                            bgcolor: 'background.default'
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="body2">
                              {error.message}
                              {error.details?.statusCode && (
                                <Chip 
                                  label={`HTTP ${error.details.statusCode}`}
                                  size="small"
                                  color={
                                    error.details.statusCode >= 500 ? 'error' :
                                    error.details.statusCode >= 400 ? 'warning' :
                                    'default'
                                  }
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {error.component} • {error.operation} • {formatTime(error.timestamp)}
                            </Typography>
                          </Box>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => handleOpenRemediationDialog(error)}
                          >
                            Details
                          </Button>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  API Endpoint Status
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* This would be populated with actual API endpoints in a real application */}
                  {[
                    { name: 'Authentication API', status: 'online', latency: '42ms' },
                    { name: 'Test Case API', status: errorsByType['network']?.length ? 'degraded' : 'online', latency: errorsByType['network']?.length ? '2874ms' : '137ms' },
                    { name: 'Attachment API', status: errorsByType['resource']?.length ? 'degraded' : 'online', latency: '256ms' },
                    { name: 'User Management API', status: 'online', latency: '89ms' },
                    { name: 'Reporting API', status: errorsByType['system']?.length ? 'offline' : 'online', latency: errorsByType['system']?.length ? 'timeout' : '178ms' }
                  ].map(endpoint => (
                    <Box 
                      key={endpoint.name}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'background.default'
                      }}
                    >
                      <Typography variant="body2">
                        {endpoint.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          {endpoint.latency}
                        </Typography>
                        <Chip 
                          label={endpoint.status.toUpperCase()}
                          size="small"
                          color={
                            endpoint.status === 'online' ? 'success' :
                            endpoint.status === 'degraded' ? 'warning' :
                            'error'
                          }
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </TabPanel>
        </Collapse>
      )}
      
      {/* Error remediation dialog */}
      <Dialog
        open={remediationDialogOpen}
        onClose={handleCloseRemediationDialog}
        fullWidth
        maxWidth="md"
      >
        {selectedError && (
          <ErrorRemediationPanel 
            migrationId={migrationId}
            errorId={selectedError.errorId}
            onRemediate={onRemediate}
            onClose={handleCloseRemediationDialog}
          />
        )}
      </Dialog>
      
      {/* Retry operation dialog */}
      <Dialog
        open={retryingOperation}
        aria-labelledby="retry-dialog-title"
      >
        <DialogTitle id="retry-dialog-title">
          Retrying Operation
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2">
              Retrying failed API operations...
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryingOperation(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};