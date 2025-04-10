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
  Paper, Typography, Box, Card, CardContent, CardHeader, 
  TextField, Tab, Tabs, Button, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Grid, Divider,
  Alert, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Tooltip
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import { testCaseService, TestCase, ProviderFormat } from '../../services';

interface TestCaseStructureVisualizationProps {
  testCaseId: string;
  sourceProviderId?: string;
  targetProviderId?: string;
}

export const TestCaseStructureVisualization: React.FC<TestCaseStructureVisualizationProps> = ({
  testCaseId,
  sourceProviderId,
  targetProviderId
}) => {
  // State for test case and formats
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [sourceFormat, setSourceFormat] = useState<string>(sourceProviderId || '');
  const [targetFormat, setTargetFormat] = useState<string>(targetProviderId || '');
  const [sourceFormatData, setSourceFormatData] = useState<ProviderFormat | null>(null);
  const [targetFormatData, setTargetFormatData] = useState<ProviderFormat | null>(null);
  const [comparison, setComparison] = useState<{ source: any; target: any } | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('visual');
  
  // Available provider formats
  const availableFormats = [
    { id: 'generic', name: 'Generic' },
    { id: 'zephyr', name: 'Zephyr Scale' },
    { id: 'qtest', name: 'qTest' },
    { id: 'rally', name: 'Rally' },
    { id: 'alm', name: 'HP ALM' },
    { id: 'azuredevops', name: 'Azure DevOps' }
  ];

  // Load test case on component mount
  useEffect(() => {
    loadTestCase();
  }, [testCaseId]);

  // Load provider format when selected
  useEffect(() => {
    if (sourceFormat) {
      loadProviderFormat(sourceFormat, 'source');
    } else {
      setSourceFormatData(null);
    }
  }, [sourceFormat]);

  useEffect(() => {
    if (targetFormat) {
      loadProviderFormat(targetFormat, 'target');
    } else {
      setTargetFormatData(null);
    }
  }, [targetFormat]);

  // Load test case data
  const loadTestCase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await testCaseService.getTestCase(testCaseId);
      setTestCase(data);
    } catch (err: any) {
      setError(`Error loading test case: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load provider format data
  const loadProviderFormat = async (providerId: string, type: 'source' | 'target') => {
    try {
      const format = await testCaseService.getProviderFormat(providerId);
      
      if (type === 'source') {
        setSourceFormatData(format);
      } else {
        setTargetFormatData(format);
      }
    } catch (err: any) {
      setError(`Error loading ${type} provider format: ${err.message}`);
    }
  };

  // Compare test case formats
  const compareFormats = async () => {
    if (!sourceFormat || !targetFormat) {
      setError('Please select both source and target formats to compare');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const comparisonData = await testCaseService.compareTestCaseFormats(
        testCaseId,
        sourceFormat,
        targetFormat
      );
      
      setComparison(comparisonData);
    } catch (err: any) {
      setError(`Error comparing formats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle source format change
  const handleSourceFormatChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSourceFormat(event.target.value as string);
    setComparison(null); // Reset comparison when format changes
  };

  // Handle target format change
  const handleTargetFormatChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTargetFormat(event.target.value as string);
    setComparison(null); // Reset comparison when format changes
  };

  // Handle view mode change
  const handleViewModeChange = (_event: React.ChangeEvent<{}>, newValue: string) => {
    setViewMode(newValue);
  };

  // Check if two values are different for highlighting
  const isDifferent = (source: any, target: any): boolean => {
    if (source === target) return false;
    return true;
  };

  // Render test case visualization
  const renderTestCaseVisual = (tc: TestCase) => {
    return (
      <Card variant="outlined">
        <CardHeader 
          title={tc.title} 
          subheader={`ID: ${tc.id}`}
        />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Description
            </Typography>
            <Typography variant="body1">
              {tc.description || 'No description provided'}
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="textSecondary">
                Status
              </Typography>
              <Typography variant="body1">
                {tc.status || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="textSecondary">
                Priority
              </Typography>
              <Typography variant="body1">
                {tc.priority || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="textSecondary">
                Platform
              </Typography>
              <Typography variant="body1">
                {tc.platform || 'Generic'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="textSecondary">
                Automation
              </Typography>
              <Typography variant="body1">
                {tc.automationStatus || 'Not specified'}
              </Typography>
            </Grid>
          </Grid>
          
          {tc.tags && tc.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {tc.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
              </Box>
            </Box>
          )}
          
          {tc.steps && tc.steps.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Test Steps
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50}>#</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Expected Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tc.steps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell>{step.order}</TableCell>
                        <TableCell>{step.description}</TableCell>
                        <TableCell>{step.expectedResult || 'Not specified'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {tc.customFields && Object.keys(tc.customFields).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Custom Fields
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(tc.customFields).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell>{key}</TableCell>
                        <TableCell>
                          {Array.isArray(value) 
                            ? value.join(', ') 
                            : (typeof value === 'object' ? JSON.stringify(value) : value.toString())}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render test case as formatted JSON
  const renderTestCaseJson = (tc: TestCase) => {
    return (
      <TextField
        fullWidth
        multiline
        variant="outlined"
        InputProps={{
          readOnly: true,
        }}
        rows={20}
        value={JSON.stringify(tc, null, 2)}
      />
    );
  };

  // Render provider format structure
  const renderFormatStructure = (format: ProviderFormat) => {
    if (!format) return null;
    
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardHeader 
          title={`${format.name} Format Structure`}
          subheader="Field definitions and data types"
        />
        <CardContent>
          <Box component="pre" sx={{ 
            overflowX: 'auto', 
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            p: 1,
            borderRadius: 1,
            bgcolor: 'action.hover'
          }}>
            {Object.entries(format.structure).map(([key, value]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {key}:
                </Box> {' '}
                <Box component="span">
                  {typeof value === 'object' 
                    ? JSON.stringify(value, null, 2) 
                    : value.toString()}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render comparison of test case formats
  const renderComparison = () => {
    if (!comparison) return null;
    
    const { source, target } = comparison;
    
    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardHeader 
              title={`${availableFormats.find(f => f.id === sourceFormat)?.name} Format`}
              subheader={`ID: ${source.id}`}
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Title
                </Typography>
                <Typography variant="body1">
                  {source.title}
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Typography 
                    variant="body1"
                    data-testid="status-difference-source"
                    sx={isDifferent(source.status, target.status) ? {
                      bgcolor: 'warning.light',
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block'
                    } : {}}
                  >
                    {source.status || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Typography 
                    variant="body1"
                    data-testid={isDifferent(source.priority, target.priority) ? 'highlighted-difference' : undefined}
                    sx={isDifferent(source.priority, target.priority) ? {
                      bgcolor: 'warning.light',
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block'
                    } : {}}
                  >
                    {source.priority || 'Not specified'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Custom Fields
                </Typography>
                {source.customFields && Object.keys(source.customFields).length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(source.customFields).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key}</TableCell>
                            <TableCell>
                              {Array.isArray(value) 
                                ? value.join(', ') 
                                : (typeof value === 'object' ? JSON.stringify(value) : value.toString())}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No custom fields
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardHeader 
              title={`${availableFormats.find(f => f.id === targetFormat)?.name} Format`}
              subheader={`ID: ${target.id}`}
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Title
                </Typography>
                <Typography variant="body1">
                  {target.title}
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Typography 
                    variant="body1"
                    data-testid="status-difference-target"
                    sx={isDifferent(source.status, target.status) ? {
                      bgcolor: 'warning.light',
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block'
                    } : {}}
                  >
                    {target.status || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Typography 
                    variant="body1"
                    data-testid={isDifferent(source.priority, target.priority) ? 'highlighted-difference' : undefined}
                    sx={isDifferent(source.priority, target.priority) ? {
                      bgcolor: 'warning.light',
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block'
                    } : {}}
                  >
                    {target.priority || 'Not specified'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Custom Fields
                </Typography>
                {target.customFields && Object.keys(target.customFields).length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(target.customFields).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key}</TableCell>
                            <TableCell>
                              {Array.isArray(value) 
                                ? value.join(', ') 
                                : (typeof value === 'object' ? JSON.stringify(value) : value.toString())}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No custom fields
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Comparison of test steps */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader title="Test Steps Comparison" />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Step</TableCell>
                      <TableCell>{availableFormats.find(f => f.id === sourceFormat)?.name} Description</TableCell>
                      <TableCell>{availableFormats.find(f => f.id === targetFormat)?.name} Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {source.steps && source.steps.map((step: any, index: number) => {
                      const targetStep = target.steps && target.steps[index];
                      const isDiff = targetStep && isDifferent(step.description, targetStep.description);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{step.order}</TableCell>
                          <TableCell 
                            data-testid={isDiff ? 'highlighted-difference' : undefined}
                            sx={isDiff ? { bgcolor: 'warning.light' } : {}}
                          >
                            {step.description}
                          </TableCell>
                          <TableCell 
                            data-testid={isDiff ? 'highlighted-difference' : undefined}
                            sx={isDiff ? { bgcolor: 'warning.light' } : {}}
                          >
                            {targetStep ? targetStep.description : '(Missing in target)'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Show steps that only exist in target */}
                    {target.steps && source.steps && target.steps.slice(source.steps.length).map((step: any, index: number) => (
                      <TableRow key={`target-${index}`}>
                        <TableCell>{step.order}</TableCell>
                        <TableCell data-testid="highlighted-difference" sx={{ bgcolor: 'warning.light' }}>
                          (Missing in source)
                        </TableCell>
                        <TableCell data-testid="highlighted-difference" sx={{ bgcolor: 'warning.light' }}>
                          {step.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render the main structure visualization based on selected formats
  const renderVisualization = () => {
    // If no test case is loaded yet
    if (!testCase) {
      return loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Alert severity="info">No test case data available</Alert>
      );
    }
    
    // If comparison is active, show side-by-side comparison
    if (comparison) {
      return renderComparison();
    }
    
    // Show test case in selected view mode
    return viewMode === 'visual' ? renderTestCaseVisual(testCase) : renderTestCaseJson(testCase);
  };

  // Render format structure information
  const renderFormatInfo = () => {
    // No format selected
    if (!sourceFormat && !targetFormat) {
      return null;
    }
    
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Format Structure Information
        </Typography>
        
        <Grid container spacing={2}>
          {sourceFormat && sourceFormatData && (
            <Grid item xs={12} md={targetFormat ? 6 : 12}>
              {renderFormatStructure(sourceFormatData)}
            </Grid>
          )}
          
          {targetFormat && targetFormatData && (
            <Grid item xs={12} md={sourceFormat ? 6 : 12}>
              {renderFormatStructure(targetFormatData)}
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Test Case Structure: {testCase?.title || 'Loading...'}
        </Typography>
        <Divider />
      </Box>
      
      {/* Error message if any */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Format selection controls */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="source-format-label">Source Format:</InputLabel>
          <Select
            labelId="source-format-label"
            id="source-format"
            value={sourceFormat}
            label="Source Format:"
            onChange={handleSourceFormatChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {availableFormats.map(format => (
              <MenuItem key={format.id} value={format.id}>{format.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="target-format-label">Target Format:</InputLabel>
          <Select
            labelId="target-format-label"
            id="target-format"
            value={targetFormat}
            label="Target Format:"
            onChange={handleTargetFormatChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {availableFormats.map(format => (
              <MenuItem key={format.id} value={format.id}>{format.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {sourceFormat && targetFormat && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CompareArrowsIcon />}
            onClick={compareFormats}
            disabled={loading}
          >
            Compare Formats
          </Button>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* View mode toggle */}
        <Tabs 
          value={viewMode} 
          onChange={handleViewModeChange}
          aria-label="view mode"
        >
          <Tab 
            label="Visual View" 
            value="visual" 
            icon={<VisibilityIcon fontSize="small" />}
            iconPosition="start" 
          />
          <Tab 
            label="JSON View" 
            value="json" 
            icon={<CodeIcon fontSize="small" />}
            iconPosition="start" 
          />
        </Tabs>
      </Box>
      
      {/* Main visualization */}
      {renderVisualization()}
      
      {/* Format structure information */}
      {renderFormatInfo()}
      
      {/* ID explanation */}
      <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoOutlinedIcon color="info" fontSize="small" />
        <Typography variant="body2" color="textSecondary">
          {testCaseId ? (
            <>Test Case ID: <strong>{testCaseId}</strong></>
          ) : (
            'No test case ID provided'
          )}
        </Typography>
      </Box>
    </Paper>
  );
};