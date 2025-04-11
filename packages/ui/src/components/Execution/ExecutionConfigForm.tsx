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
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  RadioGroup,
  Radio,
  Switch,
  TextField,
  Alert,
  Chip,
  Divider,
  Grid,
  Slider,
  Tooltip,
  ListItem,
  ListItemText,
  List,
  Paper,
  IconButton,
  Button,
  styled
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ExecutionConfig, MigrationPreview } from '../../types';

// LCARS-styled components
const LcarsInfoCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: '1px solid',
  borderColor: theme.palette.primary.light,
  borderRadius: '16px',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '8px',
    backgroundColor: theme.palette.primary.main,
    borderTopLeftRadius: '16px',
    borderBottomLeftRadius: '16px',
  }
}));

interface ExecutionConfigFormProps {
  onSubmit: (config: ExecutionConfig) => void;
  migrationPreview: MigrationPreview;
  disabled?: boolean;
}

export interface ExecutionConfig {
  scope: 'test' | 'full';
  includeAttachments: boolean;
  includeHistory: boolean;
  batchSize: number;
  preferredTimeWindow?: {
    start: string;
    end: string;
  };
  maxConcurrentOperations?: number;
  retrySettings?: {
    maxRetries: number;
    retryDelayMs: number;
  };
}

export interface MigrationPreview {
  estimatedItems: number;
  estimatedDuration: number; // in minutes
  potentialIssues?: string[];
}

export const ExecutionConfigForm: React.FC<ExecutionConfigFormProps> = ({ 
  onSubmit, 
  migrationPreview,
  disabled = false
}) => {
  // Form state
  const [formValues, setFormValues] = useState<ExecutionConfig>({
    scope: 'test',
    includeAttachments: true,
    includeHistory: false,
    batchSize: 50,
    maxConcurrentOperations: 5,
    retrySettings: {
      maxRetries: 3,
      retryDelayMs: 5000,
    },
  });
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setFormValues(prev => {
      const newValues = { ...prev };
      
      // Handle nested fields
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        
        newValues[parent] = {
          ...newValues[parent],
          [child]: value
        };
      } else {
        newValues[field] = value;
      }
      
      return newValues;
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors: Record<string, string> = {};
    
    if (formValues.batchSize < 1 || formValues.batchSize > 1000) {
      validationErrors.batchSize = 'Batch size must be between 1 and 1000';
    }
    
    if (formValues.maxConcurrentOperations < 1 || formValues.maxConcurrentOperations > 20) {
      validationErrors.maxConcurrentOperations = 'Max concurrent operations must be between 1 and 20';
    }
    
    if (formValues.retrySettings.maxRetries < 0 || formValues.retrySettings.maxRetries > 10) {
      validationErrors['retrySettings.maxRetries'] = 'Max retries must be between 0 and 10';
    }
    
    if (formValues.retrySettings.retryDelayMs < 1000 || formValues.retrySettings.retryDelayMs > 60000) {
      validationErrors['retrySettings.retryDelayMs'] = 'Retry delay must be between 1,000 and 60,000 ms';
    }
    
    setErrors(validationErrors);
    
    // If form is valid, submit
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formValues);
    }
  };
  
  // Get estimated duration for display based on scope
  const getEstimatedDuration = (): number => {
    return formValues.scope === 'test' 
      ? Math.min(5, migrationPreview.estimatedDuration) 
      : migrationPreview.estimatedDuration;
  };
  
  // Get estimated items based on scope
  const getEstimatedItems = (): number => {
    return formValues.scope === 'test' 
      ? Math.min(10, migrationPreview.estimatedItems) 
      : migrationPreview.estimatedItems;
  };
  
  // Format time for display
  const formatTime = (minutes: number): string => {
    if (minutes < 1) {
      return 'Less than a minute';
    }
    if (minutes < 60) {
      return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Scope selection */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Migration Scope
        </Typography>
        
        <FormControl component="fieldset" disabled={disabled}>
          <RadioGroup
            name="scope"
            value={formValues.scope}
            onChange={(e) => handleChange('scope', e.target.value)}
          >
            <FormControlLabel
              value="test"
              control={<Radio />}
              label="Test Migration (Sample of 10 test cases)"
            />
            <FormControlLabel
              value="full"
              control={<Radio />}
              label="Full Migration"
            />
          </RadioGroup>
        </FormControl>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Migration summary */}
      <LcarsInfoCard>
        <Typography variant="subtitle1" gutterBottom>
          Migration Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <StorageIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Estimated Items:</strong> {getEstimatedItems().toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Estimated Duration:</strong> {formatTime(getEstimatedDuration())}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {migrationPreview.potentialIssues && migrationPreview.potentialIssues.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon fontSize="small" sx={{ mr: 1 }} />
              Potential Issues:
            </Typography>
            <List dense disablePadding>
              {migrationPreview.potentialIssues.map((issue, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={issue}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </LcarsInfoCard>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Include options */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Include Options
        </Typography>
        
        <FormGroup>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.includeAttachments}
                    onChange={(e) => handleChange('includeAttachments', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Include Attachments"
              />
              <FormHelperText>
                Transfer attachments associated with test cases
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.includeHistory}
                    onChange={(e) => handleChange('includeHistory', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Include History"
              />
              <FormHelperText>
                Transfer historical versions of test cases
              </FormHelperText>
            </Grid>
          </Grid>
        </FormGroup>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Advanced settings */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          Advanced Settings
          <Tooltip title="These settings affect performance and reliability">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Batch Size
              </Typography>
              <Slider
                value={formValues.batchSize}
                onChange={(_, value) => handleChange('batchSize', value)}
                min={10}
                max={200}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 200, label: '200' },
                ]}
                valueLabelDisplay="auto"
                disabled={disabled}
              />
              <FormHelperText>
                Number of items to process in a single batch
              </FormHelperText>
              {errors.batchSize && (
                <FormHelperText error>{errors.batchSize}</FormHelperText>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Concurrent Operations
              </Typography>
              <Slider
                value={formValues.maxConcurrentOperations}
                onChange={(_, value) => handleChange('maxConcurrentOperations', value)}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                ]}
                valueLabelDisplay="auto"
                disabled={disabled}
              />
              <FormHelperText>
                Maximum number of concurrent operations
              </FormHelperText>
              {errors.maxConcurrentOperations && (
                <FormHelperText error>{errors.maxConcurrentOperations}</FormHelperText>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Max Retries
            </Typography>
            <TextField
              type="number"
              value={formValues.retrySettings.maxRetries}
              onChange={(e) => handleChange('retrySettings.maxRetries', parseInt(e.target.value))}
              inputProps={{ min: 0, max: 10 }}
              fullWidth
              variant="outlined"
              disabled={disabled}
              size="small"
              error={!!errors['retrySettings.maxRetries']}
              helperText={errors['retrySettings.maxRetries']}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Retry Delay (ms)
            </Typography>
            <TextField
              type="number"
              value={formValues.retrySettings.retryDelayMs}
              onChange={(e) => handleChange('retrySettings.retryDelayMs', parseInt(e.target.value))}
              inputProps={{ min: 1000, max: 60000, step: 1000 }}
              fullWidth
              variant="outlined"
              disabled={disabled}
              size="small"
              error={!!errors['retrySettings.retryDelayMs']}
              helperText={errors['retrySettings.retryDelayMs']}
            />
          </Grid>
        </Grid>
      </Box>
      
      {/* Submit button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={disabled}
          sx={{ minWidth: 120 }}
        >
          Apply Settings
        </Button>
      </Box>
    </Box>
  );
};

export default ExecutionConfigForm;