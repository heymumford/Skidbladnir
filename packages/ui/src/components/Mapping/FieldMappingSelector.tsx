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
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button,
  Typography,
  Grid,
  Chip,
  SelectChangeEvent,
  Paper
} from '@mui/material';
import { Field, FieldMapping } from '../../types';

// Available field transformations
const TRANSFORMATIONS = [
  { id: null, name: 'None' },
  { id: 'uppercase', name: 'Uppercase' },
  { id: 'lowercase', name: 'Lowercase' },
  { id: 'trim', name: 'Trim' },
  { id: 'substring', name: 'Substring' },
  { id: 'concat', name: 'Concatenate' },
  { id: 'replace', name: 'Replace' },
  { id: 'split', name: 'Split' },
  { id: 'join', name: 'Join' }
];

interface FieldMappingSelectorProps {
  /**
   * Source fields available for mapping
   */
  sourceFields: Field[];
  
  /**
   * Target fields available for mapping
   */
  targetFields: Field[];
  
  /**
   * Callback when a mapping is created
   */
  onCreateMapping: (mapping: FieldMapping) => void;
  
  /**
   * Whether to show field details (type, required)
   */
  showFieldDetails?: boolean;
  
  /**
   * Whether to highlight compatibility issues
   */
  showCompatibility?: boolean;
  
  /**
   * Whether to show transformation options
   */
  showTransformations?: boolean;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
}

export const FieldMappingSelector: React.FC<FieldMappingSelectorProps> = ({
  sourceFields,
  targetFields,
  onCreateMapping,
  showFieldDetails = false,
  showCompatibility = false,
  showTransformations = false,
  disabled = false
}) => {
  const [selectedSourceField, setSelectedSourceField] = useState<Field | null>(null);
  const [selectedTargetField, setSelectedTargetField] = useState<Field | null>(null);
  const [selectedTransformation, setSelectedTransformation] = useState<string | null>(null);
  
  // Handle source field selection
  const handleSourceFieldChange = (event: SelectChangeEvent<string>) => {
    const fieldId = event.target.value;
    const field = sourceFields.find(f => f.id === fieldId) || null;
    setSelectedSourceField(field);
  };
  
  // Handle target field selection
  const handleTargetFieldChange = (event: SelectChangeEvent<string>) => {
    const fieldId = event.target.value;
    const field = targetFields.find(f => f.id === fieldId) || null;
    setSelectedTargetField(field);
  };
  
  // Handle transformation selection
  const handleTransformationChange = (event: SelectChangeEvent<string>) => {
    const transformationId = event.target.value;
    setSelectedTransformation(transformationId === 'null' ? null : transformationId);
  };
  
  // Check if field types are compatible
  const areTypesCompatible = (sourceType: string, targetType: string): boolean => {
    // For simple cases, types should match
    if (sourceType === targetType) return true;
    
    // String can be converted to many types
    if (sourceType === 'string' && ['text', 'html', 'markdown'].includes(targetType)) return true;
    
    // Text can be converted to string
    if (sourceType === 'text' && targetType === 'string') return true;
    
    // Number can be converted to string
    if (sourceType === 'number' && targetType === 'string') return true;
    
    // Boolean can be converted to string or number
    if (sourceType === 'boolean' && ['string', 'number'].includes(targetType)) return true;
    
    // Otherwise, not compatible
    return false;
  };
  
  // Format field label based on options
  const formatFieldLabel = (field: Field, isCompatible: boolean = true): string => {
    let label = field.name;
    
    if (showFieldDetails) {
      label += ` (${field.type}${field.required ? ', required' : ''})`;
    }
    
    if (showCompatibility && !isCompatible) {
      label += ' (incompatible type)';
    }
    
    return label;
  };
  
  // Check if create mapping button should be enabled
  const isCreateEnabled = selectedSourceField !== null && selectedTargetField !== null;
  
  // Handler for create mapping button
  const handleCreateMapping = () => {
    if (selectedSourceField && selectedTargetField) {
      onCreateMapping({
        sourceId: selectedSourceField.id,
        targetId: selectedTargetField.id,
        transformation: selectedTransformation
      });
      
      // Reset selections after creating
      setSelectedSourceField(null);
      setSelectedTargetField(null);
      setSelectedTransformation(null);
    }
  };
  
  return (
    <Paper elevation={0} sx={{ padding: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id="source-field-label">Source Field</InputLabel>
            <Select
              labelId="source-field-label"
              id="source-field-select"
              label="Source Field"
              value={selectedSourceField?.id || ''}
              onChange={handleSourceFieldChange}
              data-testid="source-field-select"
            >
              {sourceFields.map((field) => (
                <MenuItem key={field.id} value={field.id}>
                  {formatFieldLabel(field)}
                  {field.required && (
                    <Chip
                      label="Required"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={disabled || !selectedSourceField}>
            <InputLabel id="target-field-label">Target Field</InputLabel>
            <Select
              labelId="target-field-label"
              id="target-field-select"
              label="Target Field"
              value={selectedTargetField?.id || ''}
              onChange={handleTargetFieldChange}
              data-testid="target-field-select"
            >
              {targetFields.map((field) => {
                const isCompatible = selectedSourceField ? 
                  areTypesCompatible(selectedSourceField.type, field.type) : true;
                
                return (
                  <MenuItem 
                    key={field.id} 
                    value={field.id}
                    sx={!isCompatible && showCompatibility ? { color: 'text.disabled' } : {}}
                  >
                    {formatFieldLabel(field, isCompatible)}
                    {field.required && (
                      <Chip
                        label="Required"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 1, height: 20 }}
                      />
                    )}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>
        
        {showTransformations && selectedSourceField && selectedTargetField && (
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel id="transformation-label">Transformation</InputLabel>
              <Select
                labelId="transformation-label"
                id="transformation-select"
                label="Transformation"
                value={selectedTransformation === null ? 'null' : selectedTransformation}
                onChange={handleTransformationChange}
                data-testid="transformation-select"
              >
                {TRANSFORMATIONS.map((transformation) => (
                  <MenuItem 
                    key={transformation.id === null ? 'null' : transformation.id} 
                    value={transformation.id === null ? 'null' : transformation.id}
                  >
                    {transformation.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        
        <Grid item xs={12} sm={showTransformations ? 12 : 4}>
          <Box display="flex" justifyContent={showTransformations ? 'flex-end' : 'center'} mt={showTransformations ? 2 : 0}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateMapping}
              disabled={disabled || !isCreateEnabled}
            >
              Create Mapping
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};