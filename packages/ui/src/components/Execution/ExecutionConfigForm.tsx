/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface ExecutionConfig {
  scope: 'test' | 'all';
  batchSize: number;
  concurrentOperations: number;
  retryAttempts: number;
  errorHandling: 'stop' | 'continue';
  includeAttachments: boolean;
  includeHistory: boolean;
}

export interface MigrationPreview {
  estimatedItems: number;
  estimatedDuration: number;
  potentialIssues: string[];
}

export interface ExecutionConfigFormProps {
  onSubmit: (config: ExecutionConfig) => void;
  migrationPreview?: MigrationPreview;
  disabled?: boolean;
}

export const ExecutionConfigForm: React.FC<ExecutionConfigFormProps> = ({
  onSubmit,
  migrationPreview,
  disabled = false
}) => {
  // Form state
  const [config, setConfig] = useState<ExecutionConfig>({
    scope: 'test',
    batchSize: 10,
    concurrentOperations: 5,
    retryAttempts: 3,
    errorHandling: 'stop',
    includeAttachments: true,
    includeHistory: false
  });

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof ExecutionConfig, string>>>({});

  // Handle input changes
  const handleChange = (field: keyof ExecutionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when field is changed
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    handleChange(name as keyof ExecutionConfig, value);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    handleChange(name as keyof ExecutionConfig, checked);
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleChange(name as keyof ExecutionConfig, parseInt(value, 10) || 0);
  };

  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExecutionConfig, string>> = {};

    if (config.batchSize <= 0) {
      newErrors.batchSize = 'Batch size must be a positive number';
    }

    if (config.concurrentOperations < 1) {
      newErrors.concurrentOperations = 'Concurrent operations must be at least 1';
    }

    if (config.retryAttempts < 0) {
      newErrors.retryAttempts = 'Retry attempts must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (scope: 'test' | 'all') => {
    // Set the scope
    const updatedConfig = { ...config, scope };
    
    // Validate the form
    if (!validateForm()) {
      return;
    }
    
    // Submit the form
    onSubmit(updatedConfig);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Migration Configuration */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Migration Configuration
          </Typography>
        </Grid>

        {/* Migration Scope */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id="scope-label">Migration Scope</InputLabel>
            <Select
              labelId="scope-label"
              id="scope"
              name="scope"
              value={config.scope}
              label="Migration Scope"
              onChange={handleSelectChange}
            >
              <MenuItem value="test">Test Run (Sample)</MenuItem>
              <MenuItem value="all">All Items</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Batch Size */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="batchSize"
            name="batchSize"
            label="Batch Size"
            type="number"
            value={config.batchSize}
            onChange={handleNumberChange}
            error={!!errors.batchSize}
            helperText={errors.batchSize}
            disabled={disabled}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>

        {/* Concurrent Operations */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="concurrentOperations"
            name="concurrentOperations"
            label="Max Concurrent Operations"
            type="number"
            value={config.concurrentOperations}
            onChange={handleNumberChange}
            error={!!errors.concurrentOperations}
            helperText={errors.concurrentOperations}
            disabled={disabled}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>

        {/* Retry Attempts */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="retryAttempts"
            name="retryAttempts"
            label="Retry Attempts"
            type="number"
            value={config.retryAttempts}
            onChange={handleNumberChange}
            error={!!errors.retryAttempts}
            helperText={errors.retryAttempts}
            disabled={disabled}
            InputProps={{ inputProps: { min: 0 } }}
          />
        </Grid>

        {/* Error Handling */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id="errorHandling-label">Error Handling</InputLabel>
            <Select
              labelId="errorHandling-label"
              id="errorHandling"
              name="errorHandling"
              value={config.errorHandling}
              label="Error Handling"
              onChange={handleSelectChange}
            >
              <MenuItem value="stop">Stop on First Error</MenuItem>
              <MenuItem value="continue">Continue on Error</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Include Attachments & History */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="includeAttachments"
                checked={config.includeAttachments}
                onChange={handleCheckboxChange}
                disabled={disabled}
              />
            }
            label="Include Attachments"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="includeHistory"
                checked={config.includeHistory}
                onChange={handleCheckboxChange}
                disabled={disabled}
              />
            }
            label="Include Test History"
          />
        </Grid>

        {/* Migration Preview */}
        {migrationPreview && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Alert severity="info">
                <Typography variant="subtitle1" gutterBottom>
                  Migration Preview
                </Typography>
                <Typography variant="body2">
                  Estimated Items: {migrationPreview.estimatedItems.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  Estimated Duration: ~{migrationPreview.estimatedDuration} minutes
                </Typography>
                <Typography variant="body2">
                  Potential Issues: {migrationPreview.potentialIssues.length} warnings
                </Typography>
                
                <Accordion sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>View Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="subtitle2">Potential Issues:</Typography>
                    <ul>
                      {migrationPreview.potentialIssues.map((issue, index) => (
                        <li key={index}>
                          <Typography variant="body2">{issue}</Typography>
                        </li>
                      ))}
                    </ul>
                  </AccordionDetails>
                </Accordion>
              </Alert>
            </Box>
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleSubmit('test')}
              disabled={disabled}
            >
              Start Test Run
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleSubmit('all')}
              disabled={disabled}
            >
              Start Full Migration
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};