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
  TextField, 
  Button, 
  Typography, 
  Paper, 
  FormHelperText,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { Provider, ConnectionParams, ConnectionStatus } from '../../types';

interface ConnectionField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

interface ConnectionFormProps {
  /**
   * The provider to configure connection for
   */
  provider: Provider;
  
  /**
   * The connection fields for the provider
   */
  connectionFields: ConnectionField[];
  
  /**
   * Callback for form submission
   */
  onSubmit: (params: ConnectionParams) => void;
  
  /**
   * Callback for testing connection
   */
  onTest: (params: ConnectionParams) => Promise<ConnectionStatus>;
  
  /**
   * Existing connection parameters to pre-populate the form
   */
  existingParams?: ConnectionParams;
  
  /**
   * Whether the form is disabled
   */
  disabled?: boolean;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  provider,
  connectionFields,
  onSubmit,
  onTest,
  existingParams = {},
  disabled = false
}) => {
  // Initialize form values from existing params or empty strings
  const initialValues = connectionFields.reduce((values, field) => {
    values[field.name] = existingParams[field.name] || '';
    return values;
  }, {} as ConnectionParams);
  
  const [formValues, setFormValues] = useState<ConnectionParams>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<ConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  // Update form values when existingParams changes
  useEffect(() => {
    const newValues = { ...formValues };
    Object.keys(existingParams).forEach(key => {
      newValues[key] = existingParams[key];
    });
    setFormValues(newValues);
  }, [existingParams]);
  
  const handleInputChange = (field: ConnectionField) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormValues(prev => ({ ...prev, [field.name]: value }));
    
    // Clear error for this field if it exists
    if (errors[field.name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.name];
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    connectionFields.forEach(field => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (validateForm()) {
      onSubmit(formValues);
    }
  };
  
  const handleTestConnection = async () => {
    // Clear previous test status
    setTestStatus(null);
    setIsTesting(true);
    
    try {
      const status = await onTest(formValues);
      setTestStatus(status);
    } catch (error) {
      setTestStatus({
        success: false,
        message: `Error testing connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {provider.name} Connection Configuration
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ mb: 3 }}>
          {connectionFields.map((field) => (
            <Box key={field.name}>
              <TextField
                fullWidth
                id={field.name}
                name={field.name}
                label={field.label}
                type={field.type}
                value={formValues[field.name] || ''}
                onChange={handleInputChange(field)}
                error={Boolean(errors[field.name])}
                helperText={errors[field.name]}
                placeholder={field.placeholder}
                required={field.required}
                disabled={disabled}
              />
              {field.helpText && !errors[field.name] && (
                <FormHelperText>{field.helpText}</FormHelperText>
              )}
            </Box>
          ))}
        </Stack>
        
        {testStatus && (
          <Alert 
            severity={testStatus.success ? 'success' : 'error'} 
            sx={{ mb: 2 }}
          >
            {testStatus.message}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={disabled || isTesting}
            startIcon={isTesting ? <CircularProgress size={20} /> : undefined}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={disabled}
          >
            Save
          </Button>
        </Box>
      </form>
    </Paper>
  );
};