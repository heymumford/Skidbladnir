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
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Divider,
  Alert,
  Tab,
  Tabs,
  Chip,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  useTheme
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

import { 
  DetailedErrorReport, 
  ErrorSummaryPanel, 
  ErrorRemediationPanel,
  ApiErrorHandling
} from '../components/Error';

import { 
  ErrorDetails, 
  RemediationSuggestion,
  migrationService
} from '../services/MigrationService';

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
      id={`error-reporting-tabpanel-${index}`}
      aria-labelledby={`error-reporting-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const ErrorReportingPage: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('realtime');
  const [simulatedMigrationId, setSimulatedMigrationId] = useState<string>('migration-1');
  const [errorStats, setErrorStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    byType: {} as Record<string, number>,
    successRate: 0,
    trend: 'stable' as 'up' | 'down' | 'stable',
    trendValue: '0%'
  });
  
  const errorTypes = [
    { id: 'auth', label: 'Authentication', color: theme.palette.warning.main },
    { id: 'network', label: 'Network', color: theme.palette.info.main },
    { id: 'validation', label: 'Validation', color: theme.palette.success.main },
    { id: 'resource', label: 'Resource', color: theme.palette.secondary.main },
    { id: 'system', label: 'System', color: theme.palette.error.main },
    { id: 'unknown', label: 'Unknown', color: theme.palette.grey[500] }
  ];
  
  // Generate fake error statistics
  useEffect(() => {
    // Count errors by type
    const byType: Record<string, number> = {};
    errors.forEach(error => {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1;
    });
    
    // Calculate resolved count (random for demo)
    const resolved = Math.floor(errors.length * 0.7);
    const total = errors.length;
    const pending = total - resolved;
    
    // Calculate success rate
    const successRate = total > 0 ? (resolved / total) * 100 : 0;
    
    // Generate random trend
    const trendOptions = ['up', 'down', 'stable'] as const;
    const trend = trendOptions[Math.floor(Math.random() * trendOptions.length)];
    const trendValue = trend === 'up' ? `+${(Math.random() * 5).toFixed(1)}%` : 
                      trend === 'down' ? `-${(Math.random() * 5).toFixed(1)}%` : 
                      '0%';
    
    setErrorStats({
      total,
      resolved,
      pending,
      byType,
      successRate,
      trend,
      trendValue
    });
  }, [errors]);
  
  // Load errors based on the selected migration
  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const errors = await migrationService.getErrorDetails(simulatedMigrationId);
        setErrors(errors);
        if (errors.length > 0) {
          setSelectedError(errors[0]);
        }
      } catch (error) {
        console.error('Error fetching error details:', error);
      }
    };
    
    fetchErrors();
  }, [simulatedMigrationId]);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle report type change
  const handleReportTypeChange = (event: SelectChangeEvent) => {
    setReportType(event.target.value);
  };
  
  // Handle error selection
  const handleErrorSelect = (errorId: string) => {
    const error = errors.find(e => e.errorId === errorId);
    if (error) {
      setSelectedError(error);
      setRemediationDialogOpen(true);
    }
  };
  
  // Close remediation dialog
  const handleCloseRemediationDialog = () => {
    setRemediationDialogOpen(false);
  };
  
  // Apply remediation action
  const handleApplyRemediation = async (errorId: string, remediationId: string) => {
    try {
      console.log(`Applying remediation ${remediationId} for error ${errorId}`);
      
      // Simulate remediation application
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remove the error from the list to simulate resolution
      setErrors(prevErrors => 
        prevErrors.filter(e => e.errorId !== errorId)
      );
      
      // Close the dialog
      setRemediationDialogOpen(false);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error applying remediation:', error);
      return Promise.reject(error);
    }
  };
  
  // Generate a new error
  const handleGenerateError = async () => {
    // Generate a random error
    const errorTypes: Array<'auth' | 'network' | 'validation' | 'resource' | 'system' | 'unknown'> = [
      'auth', 'network', 'validation', 'resource', 'system', 'unknown'
    ];
    const components = ['ZephyrProvider', 'QTestProvider', 'Transformer', 'BinaryProcessor'];
    const operations = ['FetchTestCase', 'TransformData', 'ValidateSchema', 'UploadTestCase'];
    
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const component = components[Math.floor(Math.random() * components.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    const newError: ErrorDetails = {
      errorId: `err-demo-${Date.now()}`,
      timestamp: new Date().toISOString(),
      errorType,
      component,
      operation,
      message: migrationService.generateErrorMessage(errorType, operation),
      details: migrationService.generateErrorDetails(errorType),
      context: {
        testCaseId: `TC-${Math.floor(Math.random() * 1000)}`,
        sourceId: `SRC-${Math.floor(Math.random() * 1000)}`,
        targetId: `TRG-${Math.floor(Math.random() * 1000)}`
      },
      stackTrace: errorType === 'system' ? 'Error: Failed to process test case\n    at TestCaseProcessor.process (/app/processor.js:42:23)\n    at async MigrationWorker.execute (/app/worker.js:87:12)' : undefined
    };
    
    // Add the new error to the list
    setErrors(prev => [newError, ...prev]);
    
    // Automatically select the new error
    setSelectedError(newError);
  };
  
  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center">
        <ErrorOutlineIcon sx={{ mr: 1 }} />
        Detailed Error Reporting
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page demonstrates the detailed error reporting system with remediation suggestions
        as required in the project kanban board.
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
          <InputLabel id="report-type-label">Report Type</InputLabel>
          <Select
            labelId="report-type-label"
            id="report-type"
            value={reportType}
            onChange={handleReportTypeChange}
            label="Report Type"
          >
            <MenuItem value="realtime">Real-time Monitoring</MenuItem>
            <MenuItem value="historical">Historical Analysis</MenuItem>
            <MenuItem value="trends">Error Trends</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddCircleIcon />}
          onClick={handleGenerateError}
        >
          Simulate New Error
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Error Statistics Dashboard */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Error Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {/* Total Errors Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ErrorOutlineIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Errors
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {errorStats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Resolved Errors Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Resolved
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {errorStats.resolved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Pending Errors Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {errorStats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Success Rate Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InfoIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Resolution Rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                  <Typography variant="h4">
                    {errorStats.successRate.toFixed(1)}%
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    ml: 1,
                    color: errorStats.trend === 'up' ? 'success.main' : 
                          errorStats.trend === 'down' ? 'error.main' : 
                          'text.secondary'
                  }}>
                    {errorStats.trend === 'up' && <TrendingUpIcon fontSize="small" />}
                    {errorStats.trend === 'down' && <TrendingDownIcon fontSize="small" />}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {errorStats.trendValue}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Error Types Distribution */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Error Types Distribution
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {errorTypes.map(type => {
              const count = errorStats.byType[type.id] || 0;
              return (
                <Chip 
                  key={type.id}
                  label={`${type.label}: ${count}`}
                  sx={{ 
                    bgcolor: count > 0 ? type.color : undefined,
                    color: count > 0 ? 'white' : undefined,
                    opacity: count > 0 ? 1 : 0.5
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Paper>
      
      {/* Error Reporting Tabs */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="error reporting tabs"
          >
            <Tab label="Error List" id="error-reporting-tab-0" />
            <Tab label="Detailed Analysis" id="error-reporting-tab-1" />
            <Tab label="Remediation Metrics" id="error-reporting-tab-2" />
          </Tabs>
        </Box>
        
        {/* Error List Tab */}
        <TabPanel value={tabValue} index={0}>
          <ErrorSummaryPanel 
            migrationId={simulatedMigrationId}
            autoExpand={true}
            onErrorSelect={handleErrorSelect}
          />
        </TabPanel>
        
        {/* Detailed Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 4 }}>
            <ApiErrorHandling 
              migrationId={simulatedMigrationId}
              onRemediate={handleApplyRemediation}
            />
          </Box>
          
          <DetailedErrorReport 
            migrationId={simulatedMigrationId}
            errors={errors}
            maxHeight={600}
            showFilter={true}
          />
        </TabPanel>
        
        {/* Remediation Metrics Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Remediation Success Metrics
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              This dashboard shows the success rate of different remediation strategies
              and tracks the history of remediation attempts.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Top Successful Remediations
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Refresh Authentication Token</Typography>
                        <Chip size="small" label="98% success" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Retry Operation</Typography>
                        <Chip size="small" label="92% success" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Adjust Rate Limit Settings</Typography>
                        <Chip size="small" label="85% success" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Fix Field Mapping</Typography>
                        <Chip size="small" label="78% success" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Resolve Resource Conflict</Typography>
                        <Chip size="small" label="65% success" color="warning" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Remediation Success by Error Type
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {errorTypes.map(type => (
                        <Box 
                          key={type.id} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box 
                              sx={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%', 
                                bgcolor: type.color,
                                mr: 1
                              }} 
                            />
                            <Typography variant="body2">{type.label}</Typography>
                          </Box>
                          <Typography variant="body2">
                            {(() => {
                              switch(type.id) {
                                case 'auth': return '95%';
                                case 'network': return '87%';
                                case 'validation': return '82%';
                                case 'resource': return '68%';
                                case 'system': return '45%';
                                default: return '50%';
                              }
                            })()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Recent Remediation Actions
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                          <Typography variant="body2">Refresh Authentication Token</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">2 minutes ago</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                          <Typography variant="body2">Retry Network Operation</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">5 minutes ago</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ErrorIcon fontSize="small" color="error" sx={{ mr: 1 }} />
                          <Typography variant="body2">Fix System Resource Allocation</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">15 minutes ago</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                          <Typography variant="body2">Update Field Mappings</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">25 minutes ago</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                          <Typography variant="body2">Resolve Resource Conflict</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">35 minutes ago</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>
      </Box>
      
      {/* Error Remediation Dialog */}
      <Dialog
        open={remediationDialogOpen}
        onClose={handleCloseRemediationDialog}
        fullWidth
        maxWidth="md"
      >
        <Box sx={{ position: 'relative' }}>
          {selectedError && (
            <ErrorRemediationPanel
              migrationId={simulatedMigrationId}
              errorId={selectedError.errorId}
              onRemediate={handleApplyRemediation}
              onClose={handleCloseRemediationDialog}
              enhancedMode={true}
            />
          )}
        </Box>
      </Dialog>
    </Container>
  );
};