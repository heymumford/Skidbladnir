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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Grid
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import JSONTree from 'react-json-tree';
import { Field } from '../../types';
import { TransformationType } from './FieldTransformation';
import { transformationEngine } from '../../services';

interface TransformationPreviewComponentProps {
  sourceField: Field;
  targetField: Field;
  transformationType: TransformationType;
  transformationParams: Record<string, any>;
  sourceFields: Field[];
}

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
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Helper function to get a string representation of a value's type
const getValueType = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

// Helper function to format value for display
const formatValueForDisplay = (value: any): React.ReactNode => {
  if (value === null) return <span style={{ color: '#999' }}>null</span>;
  if (value === undefined) return <span style={{ color: '#999' }}>undefined</span>;
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return (
      <span>
        [{value.length} items]
      </span>
    );
  }
  
  if (typeof value === 'object') {
    return (
      <span>
        {'{...}'}
      </span>
    );
  }
  
  if (typeof value === 'string') {
    return (
      <span style={{ color: '#4caf50' }}>
        "{value}"
      </span>
    );
  }
  
  if (typeof value === 'number') {
    return <span style={{ color: '#2196f3' }}>{value}</span>;
  }
  
  if (typeof value === 'boolean') {
    return <span style={{ color: '#ff9800' }}>{String(value)}</span>;
  }
  
  return String(value);
};

// Compare two values and highlight differences
const DiffHighlighter: React.FC<{ before: any; after: any }> = ({ before, after }) => {
  const isDifferent = JSON.stringify(before) !== JSON.stringify(after);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: isDifferent ? '#ffebee' : 'transparent',
          border: '1px solid',
          borderColor: isDifferent ? '#ffcdd2' : 'transparent',
          fontFamily: 'monospace',
          maxWidth: '45%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {formatValueForDisplay(before)}
      </Box>
      
      <CompareArrowsIcon color={isDifferent ? "primary" : "disabled"} />
      
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: isDifferent ? '#e8f5e9' : 'transparent',
          border: '1px solid',
          borderColor: isDifferent ? '#c8e6c9' : 'transparent',
          fontFamily: 'monospace',
          maxWidth: '45%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {formatValueForDisplay(after)}
      </Box>
    </Box>
  );
};

export const TransformationPreviewComponent: React.FC<TransformationPreviewComponentProps> = ({
  sourceField,
  targetField,
  transformationType,
  transformationParams,
  sourceFields
}) => {
  const [sourceValue, setSourceValue] = useState<string>('');
  const [sourceObject, setSourceObject] = useState<Record<string, any>>({});
  const [transformedValue, setTransformedValue] = useState<any>('');
  const [transformationHistory, setTransformationHistory] = useState<Array<{sourceValue: any, transformedValue: any}>>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  
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
  
  // Initialize source object with sample values
  useEffect(() => {
    const sampleObject: Record<string, any> = {};
    
    // Set up sample values for each field
    for (const field of sourceFields) {
      switch (field.type) {
        case 'string':
          sampleObject[field.id] = `Sample ${field.name}`;
          break;
        case 'text':
          sampleObject[field.id] = `This is a sample ${field.name.toLowerCase()} with multiple sentences. It demonstrates how text fields are handled.`;
          break;
        case 'array':
          sampleObject[field.id] = [`Item 1 for ${field.name}`, `Item 2 for ${field.name}`, `Item 3 for ${field.name}`];
          break;
        case 'number':
          sampleObject[field.id] = 42;
          break;
        case 'boolean':
          sampleObject[field.id] = true;
          break;
        case 'date':
          sampleObject[field.id] = new Date().toISOString();
          break;
        default:
          sampleObject[field.id] = `Sample ${field.name}`;
      }
    }
    
    // Set source value for the current source field
    setSourceValue(String(sampleObject[sourceField.id] || ''));
    setSourceObject(sampleObject);
    
    // Run transformation with initial values
    handlePreviewTransformation(sampleObject[sourceField.id], sampleObject);
  }, [sourceField, sourceFields, transformationType, transformationParams]);
  
  // Handle field value changes
  const handleFieldValueChange = (fieldId: string, value: string) => {
    let parsedValue = value;
    
    // Try to parse arrays and objects
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // If not valid JSON, keep as string
        parsedValue = value;
      }
    }
    
    // Try to convert numbers and booleans if the field type matches
    const field = sourceFields.find(f => f.id === fieldId);
    if (field) {
      if (field.type === 'number' && !isNaN(Number(value))) {
        parsedValue = Number(value);
      } else if (field.type === 'boolean' && (value === 'true' || value === 'false')) {
        parsedValue = value === 'true';
      }
    }
    
    const updatedObject = { ...sourceObject, [fieldId]: parsedValue };
    setSourceObject(updatedObject);
    
    if (fieldId === sourceField.id) {
      setSourceValue(String(parsedValue));
    }
    
    // Update preview when changing source values
    handlePreviewTransformation(
      fieldId === sourceField.id ? parsedValue : sourceObject[sourceField.id],
      updatedObject
    );
  };
  
  // Apply transformation and update the preview
  const handlePreviewTransformation = (value: any, object: Record<string, any>) => {
    setIsProcessing(true);
    
    // Use setTimeout to show the processing state
    setTimeout(() => {
      try {
        const result = transformationEngine.applyTransformation(
          value,
          transformationType,
          transformationParams,
          object
        );
        
        setTransformedValue(result);
        
        // Add to transformation history
        setTransformationHistory(prev => {
          // Limit history to the last 10 entries
          const newHistory = [{ sourceValue: value, transformedValue: result }, ...prev];
          return newHistory.slice(0, 10);
        });
      } catch (error) {
        console.error('Error applying transformation in preview:', error);
        setTransformedValue('Error applying transformation');
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Get fields that are relevant to the current transformation
  const getRelevantFields = (): Field[] => {
    const relevantFields: Field[] = [sourceField];
    
    if (transformationType === TransformationType.CONCAT || 
        transformationType === TransformationType.JOIN) {
      // Include all fields referenced in the transformation
      const fieldIds = transformationParams.fields || [];
      for (const fieldId of fieldIds) {
        const field = sourceFields.find(f => f.id === fieldId);
        if (field && !relevantFields.some(f => f.id === field.id)) {
          relevantFields.push(field);
        }
      }
    }
    
    return relevantFields;
  };
  
  // Get transformation explanation based on type
  const getTransformationExplanation = (): string => {
    switch (transformationType) {
      case TransformationType.NONE:
        return 'No transformation is applied. The source value is passed directly to the target field.';
      case TransformationType.CONCAT:
        return 'Concatenates multiple field values into a single string, with an optional separator between them.';
      case TransformationType.SUBSTRING:
        return 'Extracts a portion of text from the source value, based on start and end positions.';
      case TransformationType.REPLACE:
        return 'Replaces all occurrences of a pattern (plain text or regex) with a replacement value.';
      case TransformationType.MAP_VALUES:
        return 'Maps specific source values to different target values using a lookup table.';
      case TransformationType.SPLIT:
        return 'Splits a string by a separator and takes a specific part based on index.';
      case TransformationType.JOIN:
        return 'Combines values from multiple fields into a single string, with a separator between them.';
      case TransformationType.UPPERCASE:
        return 'Converts text to UPPERCASE.';
      case TransformationType.LOWERCASE:
        return 'Converts text to lowercase.';
      case TransformationType.CUSTOM:
        return 'Applies a custom JavaScript function to transform the source value. The function has access to the sourceValue parameter.';
      default:
        return 'Unknown transformation type.';
    }
  };
  
  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2">
            Source Values
          </Typography>
          <Tooltip title={getTransformationExplanation()}>
            <IconButton size="small">
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        {getRelevantFields().map(field => (
          <Box key={field.id} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label={`${field.name} (${field.id})`}
              value={typeof sourceObject[field.id] === 'object' 
                ? JSON.stringify(sourceObject[field.id]) 
                : String(sourceObject[field.id] || '')}
              onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <Chip 
                    label={field.type} 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )
              }}
            />
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<PlayArrowIcon />}
            onClick={() => handlePreviewTransformation(sourceObject[sourceField.id], sourceObject)}
          >
            Apply Transformation
          </Button>
        </Box>
      </Card>
      
      <Paper variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="preview tabs">
            <Tab label="Simple View" id="preview-tab-0" />
            <Tab label="JSON View" id="preview-tab-1" />
            <Tab label="Visual Diff" id="preview-tab-2" />
            <Tab label="History" id="preview-tab-3" />
          </Tabs>
        </Box>
        
        {/* Simple View Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom>
              Result Preview
            </Typography>
            
            {isProcessing ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box sx={{ 
                fontFamily: 'monospace', 
                p: 2, 
                bgcolor: '#ffffff', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {typeof transformedValue === 'object' 
                  ? JSON.stringify(transformedValue, null, 2) 
                  : String(transformedValue)}
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Target Field:</strong> {targetField.name} ({targetField.id})
              </Typography>
              <Chip 
                label={getValueType(transformedValue)} 
                size="small" 
                variant="outlined"
                color="primary" 
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          </Card>
        </TabPanel>
        
        {/* JSON View Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Source Value
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '300px' }}>
                <JSONTree
                  data={sourceObject[sourceField.id]}
                  theme={jsonTheme}
                  invertTheme={true}
                  shouldExpandNode={() => true}
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Transformed Value
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '300px' }}>
                {isProcessing ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <JSONTree
                    data={transformedValue}
                    theme={jsonTheme}
                    invertTheme={true}
                    shouldExpandNode={() => true}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Visual Diff Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="subtitle2" gutterBottom>
            Visual Comparison
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Source: {sourceField.name} ({sourceField.id})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Target: {targetField.name} ({targetField.id})
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <DiffHighlighter 
              before={sourceObject[sourceField.id]} 
              after={transformedValue} 
            />
            
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Transformation:</strong> {TransformationType[transformationType]}
              </Typography>
              {Object.keys(transformationParams).length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Parameters:</strong> {JSON.stringify(transformationParams)}
                </Typography>
              )}
            </Box>
          </Paper>
        </TabPanel>
        
        {/* History Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="subtitle2" gutterBottom>
            Transformation History
          </Typography>
          {transformationHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No transformations have been applied yet.
            </Typography>
          ) : (
            transformationHistory.map((entry, index) => (
              <Paper 
                key={index} 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: index === 0 ? '#f3f8ff' : 'white',
                  border: index === 0 ? '1px solid #bbdefb' : '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {index === 0 ? 'Most recent' : `Transformation #${transformationHistory.length - index}`}
                  </Typography>
                  <Chip
                    size="small"
                    label={index === 0 ? 'Current' : 'Historical'}
                    color={index === 0 ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <DiffHighlighter 
                  before={entry.sourceValue} 
                  after={entry.transformedValue} 
                />
              </Paper>
            ))
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};