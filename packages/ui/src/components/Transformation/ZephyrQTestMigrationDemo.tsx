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
  Card,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Divider,
  Chip,
  Button,
  Alert,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import JSONTree from 'react-json-tree';

// Sample Zephyr test case structure based on real API response
const sampleZephyrTestCase = {
  id: 'ZEP-123',
  key: 'ZEP-123',
  name: 'Login Authentication Test',
  objective: 'Verify user can log in with valid credentials',
  description: 'This test case validates the authentication flow for regular users.',
  component: 'Authentication',
  priority: 'HIGH',
  status: 'ACTIVE',
  labels: ['login', 'authentication', 'security'],
  owner: 'jsmith',
  createdBy: 'jdoe',
  createdOn: '2025-01-15T10:00:00Z',
  updatedOn: '2025-01-20T15:30:00Z',
  precondition: 'User account exists in the system.',
  steps: [
    {
      id: 'step-1',
      index: 1,
      description: 'Navigate to login page',
      expectedResult: 'Login page is displayed'
    },
    {
      id: 'step-2',
      index: 2,
      description: 'Enter valid username and password',
      expectedResult: 'Credentials are accepted'
    },
    {
      id: 'step-3',
      index: 3,
      description: 'Click login button',
      expectedResult: 'User is redirected to dashboard'
    }
  ],
  testData: 'username=testuser; password=Password123'
};

// Sample qTest test case structure (transformed from Zephyr)
const sampleQTestTestCase = {
  id: 'QT-456',
  name: 'Login Authentication Test',
  pid: '456',
  description: 'This test case validates the authentication flow for regular users.',
  precondition: 'User account exists in the system.',
  parent_id: 'QT-123',
  module_id: 'QT-MOD-123',
  properties: [
    {
      field_id: 'priority',
      field_name: 'Priority',
      field_value: 'P1'
    },
    {
      field_id: 'status',
      field_name: 'Status',
      field_value: 'Ready'
    }
  ],
  test_steps: [
    {
      description: 'Navigate to login page',
      expected: 'Login page is displayed',
      order: 1
    },
    {
      description: 'Enter valid username and password',
      expected: 'Credentials are accepted',
      order: 2
    },
    {
      description: 'Click login button',
      expected: 'User is redirected to dashboard',
      order: 3
    }
  ],
  tags: ['login', 'authentication', 'security'],
  created_date: '2025-01-22T12:00:00Z',
  created_by: {
    id: 'userid-123',
    username: 'migration-user',
    email: 'migration@example.com'
  }
};

// Sample connection status
const connectionStatuses = {
  zephyr: {
    connected: true,
    apiVersion: '8.3.0',
    details: {
      status: 200,
      serverName: 'zephyr-scale.example.com'
    }
  },
  qTest: {
    connected: true,
    apiVersion: '10.4.2',
    details: {
      status: 200,
      serverName: 'qtest.example.com'
    }
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preview-tabpanel-${index}`}
      aria-labelledby={`preview-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Connection status indicator component
const ConnectionStatus: React.FC<{ 
  provider: string, 
  status: { connected: boolean, apiVersion?: string, details?: any } 
}> = ({ provider, status }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      p: 1, 
      mb: 1, 
      border: '1px solid',
      borderColor: status.connected ? '#c8e6c9' : '#ffcdd2',
      borderRadius: 1,
      backgroundColor: status.connected ? '#f1f8e9' : '#ffebee'
    }}>
      {status.connected ? (
        <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
      ) : (
        <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />
      )}
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        <strong>{provider}:</strong> {status.connected ? 'Connected' : 'Disconnected'}
      </Typography>
      
      {status.apiVersion && (
        <Chip 
          label={`API v${status.apiVersion}`} 
          size="small" 
          variant="outlined" 
          color={status.connected ? "success" : "default"}
          sx={{ ml: 1 }}
        />
      )}
    </Box>
  );
};

// Migration step component
const MigrationStep: React.FC<{ 
  step: string, 
  status: 'pending' | 'loading' | 'success' | 'error',
  message?: string
}> = ({ step, status, message }) => {
  const getIcon = () => {
    switch (status) {
      case 'pending': return <InfoIcon color="disabled" />;
      case 'loading': return <AutorenewIcon color="primary" className="spinning" />;
      case 'success': return <CheckCircleIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="disabled" />;
    }
  };
  
  return (
    <ListItem>
      <ListItemIcon>{getIcon()}</ListItemIcon>
      <ListItemText 
        primary={step} 
        secondary={message} 
        primaryTypographyProps={{
          style: {
            fontWeight: status === 'loading' ? 'bold' : 'normal'
          }
        }}
      />
    </ListItem>
  );
};

// JSON theme for syntax highlighting
const jsonTheme = {
  scheme: 'monokai',
  author: 'wimer hazenberg (http://www.monokai.nl)',
  base00: '#272822',
  base01: '#383830',
  base02: '#49483e',
  base03: '#75715e',
  base04: '#a59f85',
  base05: '#f8f8f2',
  base06: '#f5f4f1',
  base07: '#f9f8f5',
  base08: '#f92672',
  base09: '#fd971f',
  base0A: '#f4bf75',
  base0B: '#a6e22e',
  base0C: '#a1efe4',
  base0D: '#66d9ef',
  base0E: '#ae81ff',
  base0F: '#cc6633'
};

// Simple connection form component
const ConnectionForm: React.FC<{
  provider: string,
  isConnected: boolean,
  onConnect: () => void
}> = ({ provider, isConnected, onConnect }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {provider} Connection
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="API URL"
          variant="outlined"
          size="small"
          defaultValue={provider === 'Zephyr Scale' ? 'https://api.zephyrscale.example.com/v2' : 'https://api.qtest.example.com/api/v3'}
          disabled={isConnected}
          sx={{ mb: 1 }}
        />
        
        <TextField
          fullWidth
          label="API Token"
          type="password"
          variant="outlined"
          size="small"
          defaultValue="••••••••••••••••••••••••••••••"
          disabled={isConnected}
          sx={{ mb: 1 }}
        />
        
        {provider === 'qTest' && (
          <TextField
            fullWidth
            label="Project ID"
            variant="outlined"
            size="small"
            defaultValue="12345"
            disabled={isConnected}
            sx={{ mb: 1 }}
          />
        )}
        
        <Button
          variant="contained"
          color={isConnected ? "success" : "primary"}
          onClick={onConnect}
          disabled={isConnected}
          startIcon={isConnected ? <CheckCircleIcon /> : <PlayArrowIcon />}
          sx={{ mt: 1 }}
        >
          {isConnected ? 'Connected' : 'Connect'}
        </Button>
      </Box>
    </Box>
  );
};

// Main component
export const ZephyrQTestMigrationDemo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [zephyrConnected, setZephyrConnected] = useState(false);
  const [qTestConnected, setQTestConnected] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    overall: 'idle' | 'in_progress' | 'completed' | 'error',
    steps: Array<{
      id: string,
      name: string,
      status: 'pending' | 'loading' | 'success' | 'error',
      message?: string
    }>
  }>({
    overall: 'idle',
    steps: [
      { id: 'fetch', name: 'Fetch test cases from Zephyr Scale', status: 'pending' },
      { id: 'transform', name: 'Transform test case data to qTest format', status: 'pending' },
      { id: 'create', name: 'Create test case in qTest', status: 'pending' },
      { id: 'attach', name: 'Transfer attachments', status: 'pending' },
      { id: 'verify', name: 'Verify migration result', status: 'pending' }
    ]
  });
  
  const [sourceTestCase, setSourceTestCase] = useState<any>(null);
  const [targetTestCase, setTargetTestCase] = useState<any>(null);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Add some CSS styles for spinning animation
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spinning {
        animation: spin 1.5s linear infinite;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  const connectToZephyr = () => {
    // Simulate connection process
    setTimeout(() => {
      setZephyrConnected(true);
      setSourceTestCase(sampleZephyrTestCase);
    }, 1000);
  };
  
  const connectToQTest = () => {
    // Simulate connection process
    setTimeout(() => {
      setQTestConnected(true);
    }, 1000);
  };
  
  const startMigration = () => {
    if (!zephyrConnected || !qTestConnected) {
      return;
    }
    
    setMigrationStatus({
      ...migrationStatus,
      overall: 'in_progress',
      steps: migrationStatus.steps.map(step => {
        if (step.id === 'fetch') {
          return { ...step, status: 'loading', message: 'Retrieving test case ZEP-123...' };
        }
        return step;
      })
    });
    
    // Step 1: Fetch from Zephyr
    setTimeout(() => {
      setMigrationStatus(prev => ({
        ...prev,
        steps: prev.steps.map(step => {
          if (step.id === 'fetch') {
            return { ...step, status: 'success', message: 'Successfully retrieved test case ZEP-123' };
          } else if (step.id === 'transform') {
            return { ...step, status: 'loading', message: 'Applying field transformations...' };
          }
          return step;
        })
      }));
      
      // Step 2: Transform
      setTimeout(() => {
        setMigrationStatus(prev => ({
          ...prev,
          steps: prev.steps.map(step => {
            if (step.id === 'transform') {
              return { ...step, status: 'success', message: 'All fields transformed successfully' };
            } else if (step.id === 'create') {
              return { ...step, status: 'loading', message: 'Creating test case in qTest...' };
            }
            return step;
          })
        }));
        
        // Step 3: Create in qTest
        setTimeout(() => {
          setTargetTestCase(sampleQTestTestCase);
          
          setMigrationStatus(prev => ({
            ...prev,
            steps: prev.steps.map(step => {
              if (step.id === 'create') {
                return { ...step, status: 'success', message: 'Test case QT-456 created in qTest' };
              } else if (step.id === 'attach') {
                return { ...step, status: 'loading', message: 'Transferring 2 attachments...' };
              }
              return step;
            })
          }));
          
          // Step 4: Transfer attachments
          setTimeout(() => {
            setMigrationStatus(prev => ({
              ...prev,
              steps: prev.steps.map(step => {
                if (step.id === 'attach') {
                  return { ...step, status: 'success', message: '2 attachments transferred successfully' };
                } else if (step.id === 'verify') {
                  return { ...step, status: 'loading', message: 'Verifying migration result...' };
                }
                return step;
              })
            }));
            
            // Step 5: Verify
            setTimeout(() => {
              setMigrationStatus(prev => ({
                ...prev,
                overall: 'completed',
                steps: prev.steps.map(step => {
                  if (step.id === 'verify') {
                    return { ...step, status: 'success', message: 'Migration verified successfully' };
                  }
                  return step;
                })
              }));
            }, 1500);
          }, 2000);
        }, 1500);
      }, 1500);
    }, 2000);
  };
  
  const resetDemo = () => {
    setZephyrConnected(false);
    setQTestConnected(false);
    setSourceTestCase(null);
    setTargetTestCase(null);
    setMigrationStatus({
      overall: 'idle',
      steps: [
        { id: 'fetch', name: 'Fetch test cases from Zephyr Scale', status: 'pending' },
        { id: 'transform', name: 'Transform test case data to qTest format', status: 'pending' },
        { id: 'create', name: 'Create test case in qTest', status: 'pending' },
        { id: 'attach', name: 'Transfer attachments', status: 'pending' },
        { id: 'verify', name: 'Verify migration result', status: 'pending' }
      ]
    });
  };
  
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Zephyr Scale to qTest Migration Demo
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          This demo shows a complete Zephyr Scale to qTest test case migration workflow, including 
          connecting to both systems, retrieving test case data, transforming it to the target format, 
          and creating it in the destination system.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={resetDemo}
          >
            Reset Demo
          </Button>
        </Box>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <ConnectionForm 
              provider="Zephyr Scale" 
              isConnected={zephyrConnected} 
              onConnect={connectToZephyr} 
            />
            
            {zephyrConnected && (
              <Box>
                <ConnectionStatus 
                  provider="Zephyr Scale" 
                  status={connectionStatuses.zephyr} 
                />
                
                {sourceTestCase && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Successfully retrieved test case: {sourceTestCase.name}
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <ConnectionForm 
              provider="qTest" 
              isConnected={qTestConnected} 
              onConnect={connectToQTest} 
            />
            
            {qTestConnected && (
              <Box>
                <ConnectionStatus 
                  provider="qTest" 
                  status={connectionStatuses.qTest} 
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Migration Process
        </Typography>
        
        <List>
          {migrationStatus.steps.map((step) => (
            <MigrationStep
              key={step.id}
              step={step.name}
              status={step.status}
              message={step.message}
            />
          ))}
        </List>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={startMigration}
            disabled={!zephyrConnected || !qTestConnected || migrationStatus.overall !== 'idle'}
            sx={{ px: 4 }}
          >
            Start Migration
          </Button>
        </Box>
        
        {migrationStatus.overall === 'completed' && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Migration completed successfully! Test case "{sourceTestCase?.name}" was migrated from Zephyr Scale to qTest with ID QT-456.
          </Alert>
        )}
      </Paper>
      
      {(sourceTestCase || targetTestCase) && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="test case preview tabs">
              <Tab label="Source (Zephyr)" id="preview-tab-0" disabled={!sourceTestCase} />
              <Tab label="Target (qTest)" id="preview-tab-1" disabled={!targetTestCase} />
              <Tab label="Comparison" id="preview-tab-2" disabled={!sourceTestCase || !targetTestCase} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            {sourceTestCase && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Zephyr Scale Test Case: {sourceTestCase.name}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>ID:</strong> {sourceTestCase.id}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Priority:</strong> {sourceTestCase.priority}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Status:</strong> {sourceTestCase.status}</Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">{sourceTestCase.description}</Typography>
                  </Paper>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Steps
                  </Typography>
                  
                  {sourceTestCase.steps.map((step: any, index: number) => (
                    <Paper key={step.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box sx={{ 
                          minWidth: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          {index + 1}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2">Action</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>{step.description}</Typography>
                          
                          <Typography variant="subtitle2">Expected Result</Typography>
                          <Typography variant="body2">{step.expectedResult}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Labels
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {sourceTestCase.labels.map((label: string) => (
                      <Chip key={label} label={label} size="small" />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            {targetTestCase && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  qTest Test Case: {targetTestCase.name}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>ID:</strong> {targetTestCase.id}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Priority:</strong> {
                        targetTestCase.properties.find((p: any) => p.field_id === 'priority')?.field_value
                      }</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Status:</strong> {
                        targetTestCase.properties.find((p: any) => p.field_id === 'status')?.field_value
                      }</Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">{targetTestCase.description}</Typography>
                  </Paper>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Steps
                  </Typography>
                  
                  {targetTestCase.test_steps.map((step: any, index: number) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box sx={{ 
                          minWidth: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          {step.order}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2">Action</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>{step.description}</Typography>
                          
                          <Typography variant="subtitle2">Expected Result</Typography>
                          <Typography variant="body2">{step.expected}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {targetTestCase.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            {sourceTestCase && targetTestCase && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Field Mapping Comparison
                </Typography>
                
                <Paper variant="outlined" sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <Typography variant="subtitle2">
                      Field Mapping Legend
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 16, height: 16, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', mr: 1 }} />
                          <Typography variant="caption">Direct Mapping</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 16, height: 16, bgcolor: '#fff3e0', border: '1px solid #ffe0b2', mr: 1 }} />
                          <Typography variant="caption">Value Transformation</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 16, height: 16, bgcolor: '#e3f2fd', border: '1px solid #bbdefb', mr: 1 }} />
                          <Typography variant="caption">Structure Change</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 16, height: 16, bgcolor: '#f3e5f5', border: '1px solid #e1bee7', mr: 1 }} />
                          <Typography variant="caption">Multiple Field Mapping</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                <Paper variant="outlined" sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderBottom: '1px solid #c8e6c9' }}>
                    <Typography variant="subtitle2">
                      Direct Mappings
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">Zephyr Field</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="subtitle2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">qTest Field</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Typography variant="body2">name</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">name</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Typography variant="body2">description</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">description</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Typography variant="body2">precondition</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">precondition</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                <Paper variant="outlined" sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: '#fff3e0', borderBottom: '1px solid #ffe0b2' }}>
                    <Typography variant="subtitle2">
                      Value Transformations
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">Zephyr Field</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="subtitle2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">qTest Field</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Typography variant="body2">status: ACTIVE</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">status: Ready</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Typography variant="body2">priority: HIGH</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">priority: P1</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                <Paper variant="outlined" sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderBottom: '1px solid #bbdefb' }}>
                    <Typography variant="subtitle2">
                      Structure Changes
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">Zephyr Structure</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="subtitle2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="subtitle2">qTest Structure</Typography>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
{`steps: [
  {
    id: "step-1",
    index: 1,
    description: "...",
    expectedResult: "..."
  }
]`}
                          </pre>
                        </Box>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
{`test_steps: [
  {
    description: "...",
    expected: "...",
    order: 1
  }
]`}
                          </pre>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={5}>
                        <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mt: 2 }}>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
{`labels: [
  "login",
  "authentication",
  "security"
]`}
                          </pre>
                        </Box>
                      </Grid>
                      <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Typography variant="body2">→</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mt: 2 }}>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
{`tags: [
  "login",
  "authentication",
  "security"
]`}
                          </pre>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                <Paper variant="outlined">
                  <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderBottom: '1px solid #e1bee7' }}>
                    <Typography variant="subtitle2">
                      Raw Data Comparison
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" gutterBottom>Zephyr Scale Format</Typography>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '400px' }}>
                          <JSONTree
                            data={sourceTestCase}
                            theme={jsonTheme}
                            invertTheme={true}
                            shouldExpandNode={(keyPath) => keyPath.length < 2}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" gutterBottom>qTest Format</Typography>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '400px' }}>
                          <JSONTree
                            data={targetTestCase}
                            theme={jsonTheme}
                            invertTheme={true}
                            shouldExpandNode={(keyPath) => keyPath.length < 2}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Box>
            )}
          </TabPanel>
        </Paper>
      )}
    </Box>
  );
};