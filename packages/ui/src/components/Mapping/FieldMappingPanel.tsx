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
  Button, 
  Divider, 
  Typography, 
  Paper, 
  Stack,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { FieldMappingSelector } from './FieldMappingSelector';
import { MappingList } from './MappingList';
import { Field, FieldMapping } from '../../types';

interface FieldMappingPanelProps {
  /**
   * Source fields available for mapping
   */
  sourceFields: Field[];
  
  /**
   * Target fields available for mapping
   */
  targetFields: Field[];
  
  /**
   * Initial mappings (if any)
   */
  initialMappings?: FieldMapping[];
  
  /**
   * Callback when mappings change
   */
  onMappingsChange: (mappings: FieldMapping[]) => void;
  
  /**
   * Whether to show field types in the mapping list
   */
  showFieldTypes?: boolean;
  
  /**
   * Whether to allow auto-mapping fields with matching names
   */
  allowAutoMapping?: boolean;
  
  /**
   * Whether to validate mappings for required fields
   */
  validateMappings?: boolean;
  
  /**
   * Whether to show transformation options
   */
  showTransformations?: boolean;
  
  /**
   * Whether the panel is disabled
   */
  disabled?: boolean;
}

export const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  sourceFields,
  targetFields,
  initialMappings = [],
  onMappingsChange,
  showFieldTypes = false,
  allowAutoMapping = true,
  validateMappings = true,
  showTransformations = true,
  disabled = false
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [validationStatus, setValidationStatus] = useState<{ 
    valid: boolean;
    missingSourceFields: Field[];
    missingTargetFields: Field[];
  } | null>(null);
  
  // Update the parent when mappings change
  useEffect(() => {
    onMappingsChange(mappings);
  }, [mappings, onMappingsChange]);
  
  // Validate mappings whenever they change
  useEffect(() => {
    if (!validateMappings) return;
    
    const mappedSourceIds = mappings.map(m => m.sourceId);
    const mappedTargetIds = mappings.map(m => m.targetId);
    
    const missingSourceFields = sourceFields.filter(
      field => field.required && !mappedSourceIds.includes(field.id)
    );
    
    const missingTargetFields = targetFields.filter(
      field => field.required && !mappedTargetIds.includes(field.id)
    );
    
    setValidationStatus({
      valid: missingSourceFields.length === 0 && missingTargetFields.length === 0,
      missingSourceFields,
      missingTargetFields
    });
  }, [mappings, sourceFields, targetFields, validateMappings]);
  
  // Create a new mapping
  const handleCreateMapping = (mapping: FieldMapping) => {
    // Check if this mapping would create a duplicate
    const isDuplicate = mappings.some(
      m => m.sourceId === mapping.sourceId && m.targetId === mapping.targetId
    );
    
    if (isDuplicate) return;
    
    setMappings([...mappings, mapping]);
  };
  
  // Delete a mapping
  const handleDeleteMapping = (index: number) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };
  
  // Auto-map fields with matching names
  const handleAutoMap = () => {
    const autoMappings: FieldMapping[] = [];
    
    sourceFields.forEach(sourceField => {
      // Look for a target field with the same name
      const matchingTargetField = targetFields.find(targetField => 
        targetField.name.toLowerCase() === sourceField.name.toLowerCase()
      );
      
      if (matchingTargetField) {
        autoMappings.push({
          sourceId: sourceField.id,
          targetId: matchingTargetField.id,
          transformation: null
        });
      }
    });
    
    setMappings(autoMappings);
  };
  
  // Clear all mappings
  const handleClearAll = () => {
    setMappings([]);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Field Mapping
      </Typography>
      
      <Typography variant="body1" paragraph>
        Map fields from the source provider to the target provider.
      </Typography>
      
      {validateMappings && validationStatus && (
        <Alert 
          severity={validationStatus.valid ? 'success' : 'warning'}
          icon={validationStatus.valid ? <CheckCircleIcon /> : <WarningIcon />}
          sx={{ mb: 3 }}
        >
          {validationStatus.valid ? (
            'All required fields are mapped'
          ) : (
            <Box>
              <Typography variant="body1">
                Missing mappings for required fields
              </Typography>
              
              {validationStatus.missingSourceFields.length > 0 && (
                <Typography variant="body2">
                  Source: {validationStatus.missingSourceFields.map(f => f.name).join(', ')}
                </Typography>
              )}
              
              {validationStatus.missingTargetFields.length > 0 && (
                <Typography variant="body2">
                  Target: {validationStatus.missingTargetFields.map(f => f.name).join(', ')}
                </Typography>
              )}
            </Box>
          )}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<AutoFixHighIcon />}
            onClick={handleAutoMap}
            disabled={disabled || !allowAutoMapping}
          >
            Auto-Map
          </Button>
        </Grid>
        
        <Grid item>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ClearAllIcon />}
            onClick={handleClearAll}
            disabled={disabled || mappings.length === 0}
          >
            Clear All
          </Button>
        </Grid>
        
        <Grid item xs />
        
        <Grid item>
          <Chip 
            label={`${mappings.length} mappings created`} 
            color="primary" 
            variant="outlined" 
          />
        </Grid>
      </Grid>
      
      <FieldMappingSelector
        sourceFields={sourceFields}
        targetFields={targetFields}
        onCreateMapping={handleCreateMapping}
        showFieldDetails={true}
        showCompatibility={true}
        showTransformations={showTransformations}
        disabled={disabled}
      />
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Current Mappings
      </Typography>
      
      <MappingList
        mappings={mappings}
        sourceFields={sourceFields}
        targetFields={targetFields}
        onDeleteMapping={handleDeleteMapping}
        showFieldTypes={showFieldTypes}
        showRequiredFields={true}
        disabled={disabled}
      />
    </Paper>
  );
};