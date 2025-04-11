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
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  Divider,
  Alert,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Stack,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Link,
  Backdrop
} from '@mui/material';
import { 
  TransformationPreviewPanel, 
  TestCasePreviewComponent,
  BatchPreviewComponent,
  FieldTransformation,
  DataStructureComparison,
  TransformationPreviewComponent
} from '../components/Transformation';
import { TransformationService, transformationEngine } from '../services';
import { FieldMapping, Field, TransformationPreview } from '../types';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import EditIcon from '@mui/icons-material/Edit';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import PreviewIcon from '@mui/icons-material/Preview';
import DownloadIcon from '@mui/icons-material/Download';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CodeIcon from '@mui/icons-material/Code';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { TransformationType } from '../components/Transformation/FieldTransformation';

// Sample field mappings for demonstration
const sampleFieldMappings: FieldMapping[] = [
  { sourceId: 'id', targetId: 'key', transformation: null },
  { sourceId: 'name', targetId: 'summary', transformation: null },
  { sourceId: 'description', targetId: 'description', transformation: null },
  { sourceId: 'status', targetId: 'status', transformation: '{"type":"map_values","params":{"mappings":{"ACTIVE":"Active","INACTIVE":"Inactive","DRAFT":"Draft"}}}' },
  { sourceId: 'priority', targetId: 'priority', transformation: '{"type":"map_values","params":{"mappings":{"HIGH":"P1","MEDIUM":"P2","LOW":"P3"}}}' },
  { sourceId: 'steps', targetId: 'testSteps', transformation: null },
  { sourceId: 'owner', targetId: 'assignee', transformation: null },
  { sourceId: 'createdDate', targetId: 'created', transformation: null },
  { sourceId: 'labels', targetId: 'labels', transformation: null },
  { sourceId: 'attachments', targetId: 'files', transformation: null }
];

// Additional field mappings with different transformation types
const advancedFieldMappings: FieldMapping[] = [
  ...sampleFieldMappings,
  { sourceId: 'title', targetId: 'name', transformation: '{"type":"uppercase","params":{}}' },
  { sourceId: 'environment', targetId: 'testEnvironment', transformation: '{"type":"lowercase","params":{}}' },
  { sourceId: 'url', targetId: 'testUrl', transformation: '{"type":"substring","params":{"start":8,"end":50}}' },
  { 
    sourceId: 'component', 
    targetId: 'module', 
    transformation: '{"type":"concat","params":{"separator":"-","fields":["component","subComponent"]}}' 
  },
  { 
    sourceId: 'fullName', 
    targetId: 'author', 
    transformation: '{"type":"split","params":{"separator":" ","index":0}}' 
  }
];

// Sample test case IDs for batch preview
const sampleTestCaseIds = [
  'TC-123',
  'TC-124',
  'TC-125',
  'TC-126',
  'TC-127'
];

// Sample source fields for field transformation
const sourceFields: Field[] = [
  { id: 'id', name: 'ID', type: 'string', required: false },
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'title', name: 'Title', type: 'string', required: false },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'status', name: 'Status', type: 'string', required: true, allowedValues: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
  { id: 'priority', name: 'Priority', type: 'string', required: true, allowedValues: ['HIGH', 'MEDIUM', 'LOW'] },
  { id: 'steps', name: 'Steps', type: 'array', required: true },
  { id: 'owner', name: 'Owner', type: 'string', required: false },
  { id: 'environment', name: 'Environment', type: 'string', required: false },
  { id: 'url', name: 'URL', type: 'string', required: false },
  { id: 'component', name: 'Component', type: 'string', required: false },
  { id: 'subComponent', name: 'Sub Component', type: 'string', required: false },
  { id: 'fullName', name: 'Full Name', type: 'string', required: false },
  { id: 'createdDate', name: 'Created Date', type: 'date', required: false },
  { id: 'labels', name: 'Labels', type: 'array', required: false },
  { id: 'attachments', name: 'Attachments', type: 'array', required: false }
];

// Sample target fields for field transformation
const targetFields: Field[] = [
  { id: 'key', name: 'Key', type: 'string', required: true },
  { id: 'summary', name: 'Summary', type: 'string', required: true },
  { id: 'name', name: 'Name', type: 'string', required: false },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'status', name: 'Status', type: 'string', required: true, allowedValues: ['Active', 'Inactive', 'Draft'] },
  { id: 'priority', name: 'Priority', type: 'string', required: true, allowedValues: ['P1', 'P2', 'P3'] },
  { id: 'testSteps', name: 'Test Steps', type: 'array', required: true },
  { id: 'assignee', name: 'Assignee', type: 'string', required: false },
  { id: 'author', name: 'Author', type: 'string', required: false },
  { id: 'testEnvironment', name: 'Test Environment', type: 'string', required: false },
  { id: 'testUrl', name: 'Test URL', type: 'string', required: false },
  { id: 'module', name: 'Module', type: 'string', required: false },
  { id: 'created', name: 'Created', type: 'date', required: false },
  { id: 'labels', name: 'Labels', type: 'array', required: false },
  { id: 'files', name: 'Files', type: 'array', required: false },
  { id: 'testType', name: 'Test Type', type: 'string', required: true }
];

// Mock transformation preview for the data structure comparison demo
const mockPreview: TransformationPreview = {
  sourceData: {
    id: 'TC-123',
    name: 'Login Test',
    description: 'Verify user can log in with valid credentials',
    status: 'ACTIVE',
    priority: 'HIGH',
    steps: [
      {
        id: 'step-1',
        description: 'Navigate to login page',
        expectedResult: 'Login page is displayed'
      },
      {
        id: 'step-2',
        description: 'Enter valid username and password',
        expectedResult: 'Credentials are accepted'
      },
      {
        id: 'step-3',
        description: 'Click login button',
        expectedResult: 'User is redirected to dashboard'
      }
    ],
    owner: 'john.doe@example.com',
    createdDate: '2023-05-15T10:00:00Z',
    labels: ['login', 'authentication', 'smoke'],
    attachments: [
      {
        id: 'att-1',
        name: 'screenshot.png',
        fileType: 'image/png',
        size: 12345
      }
    ],
    environment: 'PRODUCTION',
    url: 'https://example.com/login',
    component: 'Authentication',
    subComponent: 'Login',
    fullName: 'John Doe'
  },
  canonicalData: {
    id: 'TC-123',
    name: 'Login Test',
    objective: 'Verify user can log in with valid credentials',
    status: 'READY',
    priority: 'HIGH',
    testSteps: [
      {
        id: 'step-1',
        order: 1,
        action: 'Navigate to login page',
        expectedResult: 'Login page is displayed'
      },
      {
        id: 'step-2',
        order: 2,
        action: 'Enter valid username and password',
        expectedResult: 'Credentials are accepted'
      },
      {
        id: 'step-3',
        order: 3,
        action: 'Click login button',
        expectedResult: 'User is redirected to dashboard'
      }
    ],
    owner: {
      id: 'user-123',
      email: 'john.doe@example.com'
    },
    createdAt: '2023-05-15T10:00:00Z',
    tags: [
      { name: 'login' },
      { name: 'authentication' },
      { name: 'smoke' }
    ],
    attachments: [
      {
        id: 'att-1',
        fileName: 'screenshot.png',
        mimeType: 'image/png',
        size: 12345
      }
    ],
    environment: 'production',
    url: 'example.com/login',
    module: 'Authentication-Login',
    author: 'John'
  },
  targetData: {
    key: 'TC123',
    summary: 'Login Test',
    name: 'LOGIN TEST',
    description: 'Verify user can log in with valid credentials',
    status: 'Active',
    priority: 'P1',
    testSteps: [
      {
        stepIndex: 1,
        action: 'Navigate to login page',
        expectedResult: 'Login page is displayed'
      },
      {
        stepIndex: 2,
        action: 'Enter valid username and password',
        expectedResult: 'Credentials are accepted'
      },
      {
        stepIndex: 3,
        action: 'Click login button',
        expectedResult: 'User is redirected to dashboard'
      }
    ],
    assignee: 'john.doe@example.com',
    author: 'John',
    created: '2023-05-15T10:00:00Z',
    labels: ['login', 'authentication', 'smoke'],
    files: [
      {
        id: 'file-1',
        name: 'screenshot.png',
        fileType: 'image/png',
        size: 12345
      }
    ],
    testEnvironment: 'production',
    testUrl: 'example.com',
    module: 'Authentication-Login'
  },
  validationMessages: [
    'Field "testType" required in target system but not provided',
    'Array field "attachments" mapped to "files" with possible structure differences',
    'Field "precondition" is missing in both source and target'
  ]
};

/**
 * Interface for tab panel props
 */
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
      id={`preview-demo-tabpanel-${index}`}
      aria-labelledby={`preview-demo-tab-${index}`}
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

/**
 * TransformationPreviewPage showcases the various transformation preview features
 * This page serves as a demo of the available components and also acts as the
 * full-featured preview functionality page
 */
const TransformationPreviewPage: React.FC = () => {
  const theme = useTheme();
  
  // Main view state
  const [tabValue, setTabValue] = useState(0);
  const [activeView, setActiveView] = useState<'main' | 'wizard'>('main');
  
  // Preview states
  const [showStandardPreview, setShowStandardPreview] = useState(false);
  const [showEnhancedPreview, setShowEnhancedPreview] = useState(false);
  const [showBatchPreview, setShowBatchPreview] = useState(false);
  const [showAdvancedPreview, setShowAdvancedPreview] = useState(false);
  
  // Configuration states
  const [selectedFieldMapping, setSelectedFieldMapping] = useState<FieldMapping | null>(null);
  const [currentTestCaseId, setCurrentTestCaseId] = useState('TC-123');
  const [sourceProviderId, setSourceProviderId] = useState('zephyr');
  const [targetProviderId, setTargetProviderId] = useState('qtest');
  
  // Wizard workflow states
  const [activeStep, setActiveStep] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(sampleFieldMappings);
  const [previewData, setPreviewData] = useState<TransformationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Full custom preview
  const [customPreviewOpen, setCustomPreviewOpen] = useState(false);
  const [customPreviewParams, setCustomPreviewParams] = useState({
    testCaseId: currentTestCaseId,
    sourceProviderId: sourceProviderId,
    targetProviderId: targetProviderId,
    fieldMappings: fieldMappings,
    isInProgress: false
  });
  
  // Load the preview data when component mounts
  useEffect(() => {
    if (activeView === 'wizard' && activeStep === 2) {
      loadPreviewData();
    }
  }, [activeView, activeStep, currentTestCaseId, sourceProviderId, targetProviderId, fieldMappings]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle field mapping update
  const handleFieldMappingUpdate = (mapping: FieldMapping) => {
    // Update the mapping in the fieldMappings array
    const updatedMappings = fieldMappings.map(m => {
      if (m.sourceId === mapping.sourceId && m.targetId === mapping.targetId) {
        return mapping;
      }
      return m;
    });
    
    setFieldMappings(updatedMappings);
    setSelectedFieldMapping(null);
  };
  
  // Handle edit mapping
  const handleEditMapping = (mapping: FieldMapping) => {
    setSelectedFieldMapping(mapping);
    
    // If on advanced demo tab, switch to field transformation tab
    if (tabValue === 3) {
      setTabValue(4);
    }
  };
  
  // Load preview data from service
  const loadPreviewData = async () => {
    setIsLoadingPreview(true);
    
    try {
      const transformationService = new TransformationService();
      const preview = await transformationService.getTransformationPreview(
        currentTestCaseId,
        {
          sourceProviderId,
          targetProviderId,
          fieldMappings
        }
      );
      
      setPreviewData(preview);
    } catch (error) {
      console.error('Error loading preview data:', error);
      // Use mock data as fallback
      setPreviewData(mockPreview);
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Start the wizard for full user workflow
  const startWizard = () => {
    setActiveView('wizard');
    setActiveStep(0);
  };
  
  // Handle next step in wizard
  const handleNextStep = () => {
    setActiveStep(prevStep => prevStep + 1);
  };
  
  // Handle previous step in wizard
  const handlePrevStep = () => {
    setActiveStep(prevStep => prevStep - 1);
  };
  
  // Handle exit from wizard
  const handleExitWizard = () => {
    setActiveView('main');
    setActiveStep(0);
  };
  
  // Handle open custom preview
  const handleOpenCustomPreview = () => {
    setCustomPreviewParams({
      testCaseId: currentTestCaseId,
      sourceProviderId,
      targetProviderId,
      fieldMappings,
      isInProgress: false
    });
    setCustomPreviewOpen(true);
  };
  
  // Handle start custom preview
  const handleStartCustomPreview = () => {
    setCustomPreviewParams({
      ...customPreviewParams,
      isInProgress: true
    });
    
    // Simulate loading delay
    setTimeout(() => {
      setCustomPreviewParams({
        ...customPreviewParams,
        isInProgress: false
      });
    }, 1500);
  };
  
  // Render wizard steps
  const renderWizardStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Configure Provider Settings
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="source-provider-label">Source Provider</InputLabel>
                  <Select
                    labelId="source-provider-label"
                    value={sourceProviderId}
                    label="Source Provider"
                    onChange={(e) => setSourceProviderId(e.target.value)}
                  >
                    <MenuItem value="zephyr">Zephyr Scale</MenuItem>
                    <MenuItem value="jira">Jira</MenuItem>
                    <MenuItem value="azure">Azure DevOps</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="target-provider-label">Target Provider</InputLabel>
                  <Select
                    labelId="target-provider-label"
                    value={targetProviderId}
                    label="Target Provider"
                    onChange={(e) => setTargetProviderId(e.target.value)}
                  >
                    <MenuItem value="qtest">qTest</MenuItem>
                    <MenuItem value="testRail">TestRail</MenuItem>
                    <MenuItem value="xray">Xray</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Test Case ID"
                  value={currentTestCaseId}
                  onChange={(e) => setCurrentTestCaseId(e.target.value)}
                  helperText="Enter the ID of a test case to preview the transformation"
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                Select the source and target providers for your test case transformation. 
                You can change these settings later if needed.
              </Typography>
            </Alert>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ p:.5 }}>
            <Typography variant="h5" gutterBottom>
              Configure Field Mappings
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Define how fields from {sourceProviderId} should map to {targetProviderId}. 
                Click on a mapping to edit its transformation.
              </Typography>
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ maxHeight: '500px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Source Field</th>
                        <th style={{ padding: '10px', textAlign: 'center', width: 40, borderBottom: '1px solid #e0e0e0' }}></th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Target Field</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Transformation</th>
                        <th style={{ padding: '10px', textAlign: 'center', width: 80, borderBottom: '1px solid #e0e0e0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldMappings.map((mapping, index) => {
                        const sourceField = sourceFields.find(f => f.id === mapping.sourceId);
                        const targetField = targetFields.find(f => f.id === mapping.targetId);
                        const hasTransformation = !!mapping.transformation;
                        
                        let transformationDescription = 'Direct mapping';
                        if (hasTransformation) {
                          try {
                            const config = JSON.parse(mapping.transformation!);
                            switch (config.type) {
                              case 'concat': transformationDescription = 'Concatenate';
                                break;
                              case 'substring': transformationDescription = 'Substring';
                                break;
                              case 'replace': transformationDescription = 'Replace';
                                break;
                              case 'map_values': transformationDescription = 'Map Values';
                                break;
                              case 'split': transformationDescription = 'Split';
                                break;
                              case 'join': transformationDescription = 'Join';
                                break;
                              case 'uppercase': transformationDescription = 'UPPERCASE';
                                break;
                              case 'lowercase': transformationDescription = 'lowercase';
                                break;
                              case 'custom': transformationDescription = 'Custom';
                                break;
                              default: transformationDescription = 'Custom';
                            }
                          } catch (e) {
                            transformationDescription = 'Invalid transformation';
                          }
                        }
                        
                        return (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                              {sourceField?.name || mapping.sourceId}
                              {sourceField?.required && (
                                <Chip
                                  label="Required"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                              <ArrowForwardIcon color={hasTransformation ? "primary" : "disabled"} fontSize="small" />
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                              {targetField?.name || mapping.targetId}
                              {targetField?.required && (
                                <Chip
                                  label="Required"
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                              {hasTransformation ? (
                                <Chip
                                  label={transformationDescription}
                                  size="small"
                                  color="primary"
                                  sx={{ height: 24 }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {transformationDescription}
                                </Typography>
                              )}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditMapping(mapping)}
                                color="primary"
                              >
                                <ModeEditIcon fontSize="small" />
                              </IconButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Paper>
              </Grid>
            </Grid>
            
            {selectedFieldMapping && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" gutterBottom>
                  Edit Transformation
                </Typography>
                
                <FieldTransformation
                  sourceField={sourceFields.find(f => f.id === selectedFieldMapping.sourceId)!}
                  targetField={targetFields.find(f => f.id === selectedFieldMapping.targetId)!}
                  mapping={selectedFieldMapping}
                  onUpdateMapping={handleFieldMappingUpdate}
                  sourceFields={sourceFields}
                />
              </Box>
            )}
            
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="subtitle2">
                Mapping Validation
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>There are {targetFields.filter(f => f.required).length} required fields in the target system</li>
                <li>{targetFields.filter(f => f.required && !fieldMappings.some(m => m.targetId === f.id)).length} required target fields are not mapped</li>
                <li>Consider adding transformations for status and priority fields</li>
              </ul>
            </Alert>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Preview Transformation
            </Typography>
            
            {isLoadingPreview ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : previewData ? (
              <DataStructureComparison
                preview={previewData}
                sourceProviderId={sourceProviderId}
                targetProviderId={targetProviderId}
                onSelectIssue={(field) => {
                  // Find the mapping for this field
                  const mapping = fieldMappings.find(m => m.sourceId === field || m.targetId === field);
                  if (mapping) {
                    setSelectedFieldMapping(mapping);
                    setActiveStep(1); // Go back to mapping step
                  }
                }}
              />
            ) : (
              <Alert severity="error" sx={{ my: 2 }}>
                Failed to load preview data. Please try again.
              </Alert>
            )}
            
            {previewData?.validationMessages && previewData.validationMessages.length > 0 && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="subtitle2">
                  {previewData.validationMessages.length} validation issues found:
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  {previewData.validationMessages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handleOpenCustomPreview}
              >
                Open Enhanced Preview
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPreviewData}
              >
                Refresh Preview
              </Button>
            </Box>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Save & Apply Transformation
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                Your transformation configuration is complete and ready to be saved or applied.
              </Typography>
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Configuration Summary
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Source Provider:</strong> {sourceProviderId}
                </Typography>
                <Typography variant="body2">
                  <strong>Target Provider:</strong> {targetProviderId}
                </Typography>
                <Typography variant="body2">
                  <strong>Field Mappings:</strong> {fieldMappings.length} fields mapped
                </Typography>
                <Typography variant="body2">
                  <strong>Transformations:</strong> {fieldMappings.filter(m => m.transformation).length} fields with transformations
                </Typography>
                <Typography variant="body2">
                  <strong>Validation Issues:</strong> {previewData?.validationMessages?.length || 0} issues
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Save Options
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Configuration Name"
                  variant="outlined"
                  size="small"
                  fullWidth
                  placeholder="My Zephyr to qTest Mapping"
                  defaultValue={`${sourceProviderId} to ${targetProviderId} - Custom Mapping`}
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  Save Configuration
                </Button>
              </Stack>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Apply Transformation
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  You can apply this transformation to:
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                  >
                    Single Test Case
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ListAltIcon />}
                  >
                    Batch of Test Cases
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CodeIcon />}
                  >
                    Generate API Script
                  </Button>
                </Stack>
              </Box>
            </Paper>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <LightbulbIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Tip:</strong> Saved configurations can be reused for similar migrations. 
                You can also export this configuration as JSON for version control or sharing.
              </Typography>
            </Alert>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Export Configuration
              </Button>
            </Box>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  // If in wizard mode, render the wizard UI
  if (activeView === 'wizard') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h4">
              Transformation Preview Wizard
            </Typography>
            <Button
              variant="outlined"
              onClick={handleExitWizard}
            >
              Exit Wizard
            </Button>
          </Box>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            <Step key="providers">
              <StepLabel>Provider Settings</StepLabel>
            </Step>
            <Step key="mappings">
              <StepLabel>Field Mappings</StepLabel>
            </Step>
            <Step key="preview">
              <StepLabel>Preview</StepLabel>
            </Step>
            <Step key="save">
              <StepLabel>Save & Apply</StepLabel>
            </Step>
          </Stepper>
          
          <Box sx={{ minHeight: '500px' }}>
            {renderWizardStep(activeStep)}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBeforeIcon />}
              disabled={activeStep === 0}
              onClick={handlePrevStep}
            >
              Back
            </Button>
            
            <Button
              variant="contained"
              endIcon={<NavigateNextIcon />}
              disabled={activeStep === 3}
              onClick={handleNextStep}
            >
              {activeStep === 2 ? 'Continue' : 'Next'}
            </Button>
          </Box>
        </Paper>
        
        {/* Custom preview dialog */}
        <Dialog
          open={customPreviewOpen}
          onClose={() => setCustomPreviewOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            Enhanced Preview
            <IconButton
              aria-label="close"
              onClick={() => setCustomPreviewOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              &times;
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
              open={customPreviewParams.isInProgress}
            >
              <CircularProgress color="inherit" />
            </Backdrop>
            
            <TestCasePreviewComponent
              testCaseId={customPreviewParams.testCaseId}
              sourceProviderId={customPreviewParams.sourceProviderId}
              targetProviderId={customPreviewParams.targetProviderId}
              fieldMappings={customPreviewParams.fieldMappings}
              onEditMapping={(mapping) => {
                setCustomPreviewOpen(false);
                setSelectedFieldMapping(mapping);
                setActiveStep(1);
              }}
              onClose={() => setCustomPreviewOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </Container>
    );
  }
  
  // Main demo/features view
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Transformation Preview Features
        </Typography>
        
        <Alert 
          severity="info" 
          icon={<NewReleasesIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1">New Advanced Preview Features</Typography>
          <Typography variant="body2">
            This page demonstrates the new transformation preview functionality with enhanced visualization,
            interactive data structure comparison, attachment previews, and more.
          </Typography>
        </Alert>
        
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={9}>
                <Typography variant="h6" gutterBottom>
                  Ready to try the complete transformation workflow?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The full transformation wizard guides you through configuring providers, mapping fields,
                  previewing transformations, and applying them to test cases.
                </Typography>
              </Grid>
              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  startIcon={<PlayArrowIcon />}
                  onClick={startWizard}
                >
                  Start Transformation Wizard
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="preview demos tabs">
          <Tab 
            icon={<VisibilityIcon />} 
            iconPosition="start" 
            label="Basic Preview" 
            id="preview-demo-tab-0" 
          />
          <Tab 
            icon={<CompareArrowsIcon />} 
            iconPosition="start" 
            label="Enhanced Preview" 
            id="preview-demo-tab-1" 
          />
          <Tab 
            icon={<ListAltIcon />} 
            iconPosition="start" 
            label="Batch Preview" 
            id="preview-demo-tab-2" 
          />
          <Tab 
            icon={<FormatListBulletedIcon />} 
            iconPosition="start" 
            label="Advanced Demo" 
            id="preview-demo-tab-3" 
          />
          <Tab 
            icon={<EditIcon />} 
            iconPosition="start" 
            label="Transformation Editor" 
            id="preview-demo-tab-4" 
          />
        </Tabs>
      </Box>
      
      {/* Basic Preview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Standard Transformation Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The standard transformation preview shows field mappings, source/target data in a compact format, and highlights validation issues.
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => setShowStandardPreview(!showStandardPreview)}
              >
                {showStandardPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Chip 
                icon={<InfoIcon />} 
                label="Basic Features" 
                variant="outlined" 
                color="primary" 
              />
            </Stack>
            
            {showStandardPreview && (
              <TransformationPreviewPanel
                testCaseId="TC-123"
                sourceProviderId="zephyr"
                targetProviderId="qtest"
                fieldMappings={sampleFieldMappings}
                onEditMapping={handleEditMapping}
                onClose={() => setShowStandardPreview(false)}
                additionalTestCaseIds={sampleTestCaseIds.slice(1)}
              />
            )}
          </CardContent>
        </Card>
      </TabPanel>
      
      {/* Enhanced Preview Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Enhanced Test Case Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The enhanced preview provides a more detailed view with visual diff highlighting, JSON view, and field comparison tabs.
              This version includes advanced features like attachment preview, hierarchical data comparison, and table views.
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => setShowEnhancedPreview(!showEnhancedPreview)}
              >
                {showEnhancedPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Chip 
                icon={<InfoIcon />} 
                label="Enhanced Visualization" 
                variant="outlined" 
                color="secondary" 
              />
            </Stack>
            
            {showEnhancedPreview && (
              <TestCasePreviewComponent
                testCaseId="TC-123"
                sourceProviderId="zephyr"
                targetProviderId="qtest"
                fieldMappings={advancedFieldMappings}
                onEditMapping={handleEditMapping}
                onClose={() => setShowEnhancedPreview(false)}
              />
            )}
          </CardContent>
        </Card>
      </TabPanel>
      
      {/* Batch Preview Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Batch Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The batch preview allows transforming and viewing multiple test cases simultaneously. 
              It provides a summary view of all test cases and validation issues, with the ability to drill down into individual test cases.
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => setShowBatchPreview(!showBatchPreview)}
              >
                {showBatchPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Chip 
                icon={<InfoIcon />} 
                label="Multiple Test Cases" 
                variant="outlined" 
                color="success" 
              />
            </Stack>
            
            {showBatchPreview && (
              <BatchPreviewComponent
                testCaseIds={sampleTestCaseIds}
                sourceProviderId="zephyr"
                targetProviderId="qtest"
                fieldMappings={sampleFieldMappings}
                onEditMapping={handleEditMapping}
                onClose={() => setShowBatchPreview(false)}
              />
            )}
          </CardContent>
        </Card>
      </TabPanel>
      
      {/* Advanced Demo Tab */}
      <TabPanel value={tabValue} index={3}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Advanced Data Structure Comparison
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This component provides a detailed, interactive view for comparing data structures between source, canonical, and target formats.
              It highlights differences, missing fields, and validation issues with search and filtering capabilities.
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button 
                variant="contained" 
                onClick={() => setShowAdvancedPreview(!showAdvancedPreview)}
              >
                {showAdvancedPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Chip 
                icon={<InfoIcon />} 
                label="Interactive Comparison" 
                variant="outlined" 
                color="primary" 
              />
            </Stack>
            
            {showAdvancedPreview && (
              <Paper sx={{ p: 2 }}>
                <DataStructureComparison
                  preview={mockPreview}
                  sourceProviderId="zephyr"
                  targetProviderId="qtest"
                  onSelectIssue={(field) => {
                    console.log(`Issue selected for field: ${field}`);
                  }}
                />
              </Paper>
            )}
          </CardContent>
        </Card>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            New Features in Data Structure Comparison:
          </Typography>
          <ul>
            <li>Interactive hierarchical view with expandable fields</li>
            <li>Table view for comparing all fields at once</li>
            <li>Full JSON view for comparing entire data structures</li>
            <li>Validation issues tab for quick identification of problems</li>
            <li>Search functionality to find specific fields</li>
            <li>Color coding of differences and issues</li>
            <li>Support for all data types including arrays and nested objects</li>
          </ul>
        </Alert>
      </TabPanel>
      
      {/* Transformation Editor Tab */}
      <TabPanel value={tabValue} index={4}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Field Transformation Editor
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The field transformation editor allows configuring and previewing transformations for individual fields.
              It supports various transformation types including concatenation, splitting, mapping, and custom JavaScript transformations.
            </Typography>
            
            {selectedFieldMapping ? (
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Editing transformation for {selectedFieldMapping.sourceId} → {selectedFieldMapping.targetId}
                </Alert>
                
                <FieldTransformation
                  sourceField={sourceFields.find(f => f.id === selectedFieldMapping.sourceId)!}
                  targetField={targetFields.find(f => f.id === selectedFieldMapping.targetId)!}
                  mapping={selectedFieldMapping}
                  onUpdateMapping={handleFieldMappingUpdate}
                  sourceFields={sourceFields}
                />
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setSelectedFieldMapping(null)}
                  >
                    Cancel Editing
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Select a field mapping from one of the previews above to edit its transformation.
                </Typography>
                
                <Button 
                  variant="outlined"
                  onClick={() => {
                    // Select a sample field mapping with transformation
                    const sampleMapping = advancedFieldMappings.find(m => m.transformation);
                    if (sampleMapping) {
                      setSelectedFieldMapping(sampleMapping);
                    }
                  }}
                  sx={{ mt: 2 }}
                >
                  Load Sample Transformation
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Live Transformation Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This component allows you to experiment with different transformations and see the results in real-time.
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <TransformationPreviewComponent
                sourceField={sourceFields[4]} // Status field
                targetField={targetFields[4]} // Status field
                transformationType={TransformationType.MAP_VALUES}
                transformationParams={{
                  mappings: {
                    "ACTIVE": "Active",
                    "INACTIVE": "Inactive", 
                    "DRAFT": "Draft"
                  }
                }}
                sourceFields={sourceFields}
              />
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
};

export default TransformationPreviewPage;