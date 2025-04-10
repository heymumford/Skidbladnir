/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { 
  List, 
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Typography,
  Divider,
  Chip,
  Box,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import TransformIcon from '@mui/icons-material/Transform';
import InfoIcon from '@mui/icons-material/Info';
import { FieldMapping, Field } from '../../types';

// Transformation labels for display
const TRANSFORMATION_LABELS: Record<string, string> = {
  'uppercase': 'Uppercase',
  'lowercase': 'Lowercase',
  'trim': 'Trim',
  'substring': 'Substring',
  'concat': 'Concatenate',
  'replace': 'Replace',
  'split': 'Split',
  'join': 'Join'
};

interface MappingListProps {
  /**
   * List of field mappings to display
   */
  mappings: FieldMapping[];
  
  /**
   * Source fields for reference
   */
  sourceFields: Field[];
  
  /**
   * Target fields for reference
   */
  targetFields: Field[];
  
  /**
   * Callback when a mapping is deleted
   */
  onDeleteMapping: (index: number) => void;
  
  /**
   * Whether to show field types
   */
  showFieldTypes?: boolean;
  
  /**
   * Whether to show required field indicators
   */
  showRequiredFields?: boolean;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
}

export const MappingList: React.FC<MappingListProps> = ({
  mappings,
  sourceFields,
  targetFields,
  onDeleteMapping,
  showFieldTypes = false,
  showRequiredFields = false,
  disabled = false
}) => {
  // Helper to find field by ID
  const findField = (fieldId: string, fields: Field[]): Field | undefined => {
    return fields.find(field => field.id === fieldId);
  };
  
  // Format mapping display text
  const formatMappingText = (mapping: FieldMapping): string => {
    const sourceField = findField(mapping.sourceId, sourceFields);
    const targetField = findField(mapping.targetId, targetFields);
    
    if (!sourceField || !targetField) {
      return `Unknown mapping: ${mapping.sourceId} → ${mapping.targetId}`;
    }
    
    let sourceText = sourceField.name;
    let targetText = targetField.name;
    
    if (showFieldTypes) {
      sourceText += ` (${sourceField.type})`;
      targetText += ` (${targetField.type})`;
    }
    
    return `${sourceText} → ${targetText}`;
  };
  
  // Render transformation badge if needed
  const renderTransformation = (transformation: string | null) => {
    if (!transformation) return null;
    
    const label = TRANSFORMATION_LABELS[transformation] || transformation;
    
    return (
      <Chip
        icon={<TransformIcon />}
        label={`Transform: ${label}`}
        size="small"
        color="secondary"
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  };
  
  // Render required field indicator
  const renderRequiredIndicator = (fieldId: string, isSource: boolean) => {
    if (!showRequiredFields) return null;
    
    const field = findField(fieldId, isSource ? sourceFields : targetFields);
    
    if (!field?.required) return null;
    
    return (
      <Tooltip title={`${isSource ? 'Source' : 'Target'} field is required`}>
        <Chip
          label="(required)"
          size="small"
          color={isSource ? "primary" : "secondary"}
          variant="outlined"
          sx={{ ml: 1, height: 20 }}
        />
      </Tooltip>
    );
  };
  
  // If no mappings, show empty state
  if (mappings.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No field mappings defined yet
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={0}>
      <List>
        {mappings.map((mapping, index) => {
          const sourceField = findField(mapping.sourceId, sourceFields);
          const targetField = findField(mapping.targetId, targetFields);
          
          return (
            <React.Fragment key={`${mapping.sourceId}-${mapping.targetId}`}>
              {index > 0 && <Divider />}
              <ListItem
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => onDeleteMapping(index)}
                    disabled={disabled}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body1" component="span">
                        {formatMappingText(mapping)}
                      </Typography>
                      {renderTransformation(mapping.transformation)}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      {renderRequiredIndicator(mapping.sourceId, true)}
                      <ArrowRightAltIcon sx={{ mx: 1, fontSize: 16 }} />
                      {renderRequiredIndicator(mapping.targetId, false)}
                      
                      {sourceField && targetField && sourceField.type !== targetField.type && (
                        <Tooltip title="Field types are different. A transformation may be needed.">
                          <InfoIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                        </Tooltip>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
};