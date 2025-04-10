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
  CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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

export const TransformationPreviewComponent: React.FC<TransformationPreviewComponentProps> = ({
  sourceField,
  targetField,
  transformationType,
  transformationParams,
  sourceFields
}) => {
  const [sourceValue, setSourceValue] = useState<string>('');
  const [sourceObject, setSourceObject] = useState<Record<string, any>>({});
  const [transformedValue, setTransformedValue] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
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
    const updatedObject = { ...sourceObject, [fieldId]: value };
    setSourceObject(updatedObject);
    
    if (fieldId === sourceField.id) {
      setSourceValue(value);
    }
    
    // Update preview when changing source values
    handlePreviewTransformation(
      fieldId === sourceField.id ? value : sourceObject[sourceField.id],
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
        
        setTransformedValue(String(result));
      } catch (error) {
        console.error('Error applying transformation in preview:', error);
        setTransformedValue('Error applying transformation');
      } finally {
        setIsProcessing(false);
      }
    }, 100);
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
  
  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Source Values
        </Typography>
        
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
            onClick={() => handlePreviewTransformation(sourceValue, sourceObject)}
          >
            Apply Transformation
          </Button>
        </Box>
      </Card>
      
      <Card variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="subtitle2" gutterBottom>
          Result Preview
        </Typography>
        
        {isProcessing ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ fontFamily: 'monospace', p: 2, bgcolor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 1 }}>
            {transformedValue}
          </Box>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Target Field:</strong> {targetField.name} ({targetField.id})
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};