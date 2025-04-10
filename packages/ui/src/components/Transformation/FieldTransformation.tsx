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
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  Grid,
  Button,
  Divider,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
  IconButton,
  Card,
  CardContent,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import MergeIcon from '@mui/icons-material/Merge';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Field, FieldMapping } from '../../types';
import { TransformationPreviewComponent } from './TransformationPreviewComponent';

// Available transformation types
export enum TransformationType {
  NONE = 'none',
  CONCAT = 'concat',
  SUBSTRING = 'substring',
  REPLACE = 'replace',
  MAP_VALUES = 'map_values',
  SPLIT = 'split',
  JOIN = 'join',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  CUSTOM = 'custom'
}

// Configuration interface for transformations
export interface TransformationConfig {
  type: TransformationType;
  params?: Record<string, any>;
}

interface FieldTransformationProps {
  sourceField: Field;
  targetField: Field;
  mapping: FieldMapping;
  onUpdateMapping: (mapping: FieldMapping) => void;
  sourceFields: Field[];
  disabled?: boolean;
}

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
      id={`transformation-tabpanel-${index}`}
      aria-labelledby={`transformation-tab-${index}`}
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

export const FieldTransformation: React.FC<FieldTransformationProps> = ({
  sourceField,
  targetField,
  mapping,
  onUpdateMapping,
  sourceFields,
  disabled = false
}) => {
  const [transformationType, setTransformationType] = useState<TransformationType>(
    TransformationType.NONE
  );
  const [transformationParams, setTransformationParams] = useState<Record<string, any>>({});
  const [tabValue, setTabValue] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Parse existing transformation if present
  useEffect(() => {
    if (mapping.transformation) {
      try {
        const config = JSON.parse(mapping.transformation) as TransformationConfig;
        setTransformationType(config.type);
        setTransformationParams(config.params || {});
        setValidationError(null);
      } catch (error) {
        console.error('Error parsing transformation:', error);
        setValidationError('Invalid transformation configuration');
      }
    } else {
      setTransformationType(TransformationType.NONE);
      setTransformationParams({});
      setValidationError(null);
    }
  }, [mapping.transformation]);
  
  // Update the mapping when transformation changes
  const handleUpdateTransformation = () => {
    if (transformationType === TransformationType.NONE) {
      onUpdateMapping({
        ...mapping,
        transformation: null
      });
      return;
    }
    
    const config: TransformationConfig = {
      type: transformationType,
      params: transformationParams
    };
    
    onUpdateMapping({
      ...mapping,
      transformation: JSON.stringify(config)
    });
  };
  
  // Change transformation type
  const handleTransformationTypeChange = (type: TransformationType) => {
    setTransformationType(type);
    
    // Reset parameters when changing type
    setTransformationParams({});
    
    // Update with default parameters based on type
    switch (type) {
      case TransformationType.CONCAT:
        setTransformationParams({
          separator: ' ',
          fields: [sourceField.id]
        });
        break;
      case TransformationType.SUBSTRING:
        setTransformationParams({
          start: 0,
          end: 10
        });
        break;
      case TransformationType.REPLACE:
        setTransformationParams({
          pattern: '',
          replacement: ''
        });
        break;
      case TransformationType.MAP_VALUES:
        setTransformationParams({
          mappings: {}
        });
        break;
      case TransformationType.SPLIT:
        setTransformationParams({
          separator: ',',
          index: 0
        });
        break;
      case TransformationType.JOIN:
        setTransformationParams({
          separator: ', ',
          fields: [sourceField.id]
        });
        break;
      case TransformationType.CUSTOM:
        setTransformationParams({
          formula: `return sourceValue;`
        });
        break;
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Update transformation params
  const handleParamChange = (param: string, value: any) => {
    setTransformationParams(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  // Add a field to a list of fields (for concat, join, etc.)
  const handleAddField = (paramName: string) => {
    const fields = [...(transformationParams[paramName] || [])];
    fields.push('');
    handleParamChange(paramName, fields);
  };
  
  // Change a field in a list
  const handleFieldChange = (paramName: string, index: number, value: string) => {
    const fields = [...(transformationParams[paramName] || [])];
    fields[index] = value;
    handleParamChange(paramName, fields);
  };
  
  // Remove a field from a list
  const handleRemoveField = (paramName: string, index: number) => {
    const fields = [...(transformationParams[paramName] || [])];
    fields.splice(index, 1);
    handleParamChange(paramName, fields);
  };
  
  // Add a mapping in map_values transformation
  const handleAddMapping = () => {
    const mappings = { ...(transformationParams.mappings || {}) };
    mappings[''] = '';
    handleParamChange('mappings', mappings);
  };
  
  // Update a mapping key in map_values transformation
  const handleMappingKeyChange = (oldKey: string, newKey: string) => {
    const mappings = { ...(transformationParams.mappings || {}) };
    const value = mappings[oldKey];
    delete mappings[oldKey];
    mappings[newKey] = value;
    handleParamChange('mappings', mappings);
  };
  
  // Update a mapping value in map_values transformation
  const handleMappingValueChange = (key: string, value: string) => {
    const mappings = { ...(transformationParams.mappings || {}) };
    mappings[key] = value;
    handleParamChange('mappings', mappings);
  };
  
  // Remove a mapping in map_values transformation
  const handleRemoveMapping = (key: string) => {
    const mappings = { ...(transformationParams.mappings || {}) };
    delete mappings[key];
    handleParamChange('mappings', mappings);
  };
  
  // Render parameters based on transformation type
  const renderTransformationParams = () => {
    switch (transformationType) {
      case TransformationType.NONE:
        return (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            No transformation selected. Field values will be mapped directly.
          </Typography>
        );
        
      case TransformationType.CONCAT:
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Separator"
                value={transformationParams.separator || ''}
                onChange={(e) => handleParamChange('separator', e.target.value)}
                helperText="Character(s) to use between values"
                disabled={disabled}
              />
            </FormControl>
            
            <Typography variant="subtitle2" gutterBottom>
              Fields to Concatenate:
            </Typography>
            
            {(transformationParams.fields || []).map((fieldId: string, index: number) => (
              <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                <Grid item xs={10}>
                  <FormControl fullWidth>
                    <InputLabel id={`field-label-${index}`}>Field {index + 1}</InputLabel>
                    <Select
                      labelId={`field-label-${index}`}
                      value={fieldId}
                      label={`Field ${index + 1}`}
                      onChange={(e) => handleFieldChange('fields', index, e.target.value)}
                      disabled={disabled}
                    >
                      {sourceFields.map(field => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.name} ({field.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    onClick={() => handleRemoveField('fields', index)}
                    disabled={disabled}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleAddField('fields')}
              variant="outlined"
              size="small"
              disabled={disabled}
              sx={{ mt: 1 }}
            >
              Add Field
            </Button>
          </Box>
        );
        
      case TransformationType.SUBSTRING:
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Start Index"
                type="number"
                value={transformationParams.start || 0}
                onChange={(e) => handleParamChange('start', parseInt(e.target.value))}
                fullWidth
                helperText="Starting position (0-based)"
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Index"
                type="number"
                value={transformationParams.end || 0}
                onChange={(e) => handleParamChange('end', parseInt(e.target.value))}
                fullWidth
                helperText="Ending position (exclusive)"
                disabled={disabled}
              />
            </Grid>
          </Grid>
        );
        
      case TransformationType.REPLACE:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Pattern"
                value={transformationParams.pattern || ''}
                onChange={(e) => handleParamChange('pattern', e.target.value)}
                fullWidth
                helperText="Text or regex pattern to replace"
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Replacement"
                value={transformationParams.replacement || ''}
                onChange={(e) => handleParamChange('replacement', e.target.value)}
                fullWidth
                helperText="Text to replace with"
                disabled={disabled}
              />
            </Grid>
          </Grid>
        );
        
      case TransformationType.MAP_VALUES:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Value Mappings:
            </Typography>
            
            {Object.entries(transformationParams.mappings || {}).map(([key, value], index) => (
              <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                <Grid item xs={5}>
                  <TextField
                    label="Source Value"
                    value={key}
                    onChange={(e) => handleMappingKeyChange(key, e.target.value)}
                    fullWidth
                    disabled={disabled}
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    label="Target Value"
                    value={value as string}
                    onChange={(e) => handleMappingValueChange(key, e.target.value)}
                    fullWidth
                    disabled={disabled}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    onClick={() => handleRemoveMapping(key)}
                    disabled={disabled}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMapping}
              variant="outlined"
              size="small"
              disabled={disabled}
              sx={{ mt: 1 }}
            >
              Add Mapping
            </Button>
            
            <FormHelperText>
              Map specific source values to target values. Values not in the mapping will pass through unchanged.
            </FormHelperText>
          </Box>
        );
        
      case TransformationType.SPLIT:
        return (
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                label="Separator"
                value={transformationParams.separator || ','}
                onChange={(e) => handleParamChange('separator', e.target.value)}
                fullWidth
                helperText="Character(s) to split on"
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Index"
                type="number"
                value={transformationParams.index || 0}
                onChange={(e) => handleParamChange('index', parseInt(e.target.value))}
                fullWidth
                helperText="Which part to keep"
                disabled={disabled}
              />
            </Grid>
          </Grid>
        );
        
      case TransformationType.JOIN:
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Separator"
                value={transformationParams.separator || ', '}
                onChange={(e) => handleParamChange('separator', e.target.value)}
                helperText="Character(s) to use between values"
                disabled={disabled}
              />
            </FormControl>
            
            <Typography variant="subtitle2" gutterBottom>
              Fields to Join:
            </Typography>
            
            {(transformationParams.fields || []).map((fieldId: string, index: number) => (
              <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                <Grid item xs={10}>
                  <FormControl fullWidth>
                    <InputLabel id={`field-label-${index}`}>Field {index + 1}</InputLabel>
                    <Select
                      labelId={`field-label-${index}`}
                      value={fieldId}
                      label={`Field ${index + 1}`}
                      onChange={(e) => handleFieldChange('fields', index, e.target.value)}
                      disabled={disabled}
                    >
                      {sourceFields.map(field => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.name} ({field.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    onClick={() => handleRemoveField('fields', index)}
                    disabled={disabled}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleAddField('fields')}
              variant="outlined"
              size="small"
              disabled={disabled}
              sx={{ mt: 1 }}
            >
              Add Field
            </Button>
          </Box>
        );
        
      case TransformationType.CUSTOM:
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 1 }}>
              <TextField
                label="Custom Transformation"
                value={transformationParams.formula || ''}
                onChange={(e) => handleParamChange('formula', e.target.value)}
                multiline
                minRows={4}
                maxRows={8}
                disabled={disabled}
                inputProps={{
                  style: { fontFamily: 'monospace' }
                }}
              />
            </FormControl>
            <FormHelperText>
              Create a custom JavaScript transformation. Use 'sourceValue' to reference the field value and 'return' to set the result.
            </FormHelperText>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Example:</strong> <code>return sourceValue.toLowerCase();</code>
              </Typography>
              <Typography variant="body2">
                <strong>Example:</strong> <code>return sourceValue ? sourceValue.replace(/\s+/g, '') : '';</code>
              </Typography>
            </Alert>
          </Box>
        );
        
      case TransformationType.UPPERCASE:
      case TransformationType.LOWERCASE:
        return (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            This transformation does not require additional parameters.
          </Typography>
        );
        
      default:
        return null;
    }
  };
  
  // Determine transformation description
  const getTransformationDescription = () => {
    switch (transformationType) {
      case TransformationType.NONE:
        return 'Direct mapping without transformation';
      case TransformationType.CONCAT:
        return 'Combine multiple field values into one';
      case TransformationType.SUBSTRING:
        return 'Extract a portion of the text';
      case TransformationType.REPLACE:
        return 'Replace text patterns in the field value';
      case TransformationType.MAP_VALUES:
        return 'Map specific values to different values';
      case TransformationType.SPLIT:
        return 'Split text and take a specific part';
      case TransformationType.JOIN:
        return 'Join multiple field values with a separator';
      case TransformationType.UPPERCASE:
        return 'Convert text to UPPERCASE';
      case TransformationType.LOWERCASE:
        return 'Convert text to lowercase';
      case TransformationType.CUSTOM:
        return 'Create a custom JavaScript transformation';
      default:
        return '';
    }
  };
  
  // Render transformation icon based on type
  const renderTransformationIcon = () => {
    switch (transformationType) {
      case TransformationType.CONCAT:
      case TransformationType.JOIN:
        return <MergeIcon />;
      case TransformationType.SUBSTRING:
      case TransformationType.SPLIT:
        return <CallSplitIcon />;
      case TransformationType.REPLACE:
      case TransformationType.MAP_VALUES:
        return <EditIcon />;
      case TransformationType.CUSTOM:
        return <CodeIcon />;
      case TransformationType.UPPERCASE:
      case TransformationType.LOWERCASE:
        return <FormatListBulletedIcon />;
      default:
        return null;
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Field Transformation
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={5}>
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Source Field
                </Typography>
                <Typography variant="body1">
                  {sourceField.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Type: {sourceField.type}
                  {sourceField.required && <Chip size="small" label="Required" color="primary" sx={{ ml: 1 }} />}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={2} sx={{ textAlign: 'center' }}>
            {renderTransformationIcon() || '→'}
          </Grid>
          
          <Grid item xs={5}>
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Target Field
                </Typography>
                <Typography variant="body1">
                  {targetField.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Type: {targetField.type}
                  {targetField.required && <Chip size="small" label="Required" color="primary" sx={{ ml: 1 }} />}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Transformation Type
        </Typography>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="transformation-type-label">Transformation Type</InputLabel>
          <Select
            labelId="transformation-type-label"
            value={transformationType}
            label="Transformation Type"
            onChange={(e) => handleTransformationTypeChange(e.target.value as TransformationType)}
            disabled={disabled}
          >
            <MenuItem value={TransformationType.NONE}>No Transformation</MenuItem>
            <MenuItem value={TransformationType.CONCAT}>Concatenate Fields</MenuItem>
            <MenuItem value={TransformationType.SUBSTRING}>Substring</MenuItem>
            <MenuItem value={TransformationType.REPLACE}>Replace</MenuItem>
            <MenuItem value={TransformationType.MAP_VALUES}>Map Values</MenuItem>
            <MenuItem value={TransformationType.SPLIT}>Split</MenuItem>
            <MenuItem value={TransformationType.JOIN}>Join Fields</MenuItem>
            <MenuItem value={TransformationType.UPPERCASE}>Convert to UPPERCASE</MenuItem>
            <MenuItem value={TransformationType.LOWERCASE}>Convert to lowercase</MenuItem>
            <MenuItem value={TransformationType.CUSTOM}>Custom Transformation</MenuItem>
          </Select>
          <FormHelperText>{getTransformationDescription()}</FormHelperText>
        </FormControl>
        
        {validationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="transformation tabs">
            <Tab label="Parameters" id="transformation-tab-0" />
            <Tab label="Preview" id="transformation-tab-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {renderTransformationParams()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="subtitle2" gutterBottom>
            Transformation Preview
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is a live preview of the transformation. Edit source values to see how the transformation behaves.
          </Alert>
          <TransformationPreviewComponent
            sourceField={sourceField}
            targetField={targetField}
            transformationType={transformationType}
            transformationParams={transformationParams}
            sourceFields={sourceFields}
          />
        </TabPanel>
      </Box>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleUpdateTransformation}
          disabled={disabled}
        >
          Apply Transformation
        </Button>
      </Box>
    </Paper>
  );
};
