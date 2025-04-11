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
  Button, 
  Divider, 
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  LinearProgress,
  styled
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { FieldMapping, Field } from '../../types';
import { transformationService } from '../../services';

// LCARS-inspired styled components
const LcarsPanel = styled(Paper)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '12px',
    backgroundColor: theme.palette.primary.dark,
    borderTopLeftRadius: '4px',
    borderBottomLeftRadius: '4px',
  }
}));

const LcarsPanelContent = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
}));

// Field Card for displaying fields with status indicators
const FieldCard = styled(Paper)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(1, 2),
  marginBottom: theme.spacing(1),
  backgroundColor: selected ? theme.palette.primary.light : theme.palette.background.paper,
  borderLeft: `4px solid ${selected ? theme.palette.primary.main : theme.palette.grey[300]}`,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.light : theme.palette.action.hover,
  }
}));

// Mapping line to visualize the connection
const MappingLine = styled(Box)(({ theme }) => ({
  height: '2px',
  backgroundColor: theme.palette.primary.main,
  margin: theme.spacing(1, 0),
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    right: '-8px',
    top: '-4px',
    border: `5px solid ${theme.palette.primary.main}`,
    borderTop: '5px solid transparent',
    borderBottom: '5px solid transparent',
    borderRight: 'none',
  }
}));

interface FieldMappingPanelProps {
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: FieldMapping[];
  onMappingsUpdate: (mappings: FieldMapping[]) => void;
}

export const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  sourceProviderId,
  targetProviderId,
  fieldMappings,
  onMappingsUpdate
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [sourceFields, setSourceFields] = useState<Field[]>([]);
  const [targetFields, setTargetFields] = useState<Field[]>([]);
  const [selectedSourceField, setSelectedSourceField] = useState<Field | null>(null);
  const [selectedTargetField, setSelectedTargetField] = useState<Field | null>(null);
  const [searchSourceQuery, setSearchSourceQuery] = useState<string>('');
  const [searchTargetQuery, setSearchTargetQuery] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Fetch fields on component mount
  useEffect(() => {
    const fetchFields = async () => {
      setLoading(true);
      try {
        // In a real implementation, these would be API calls
        // For development, we'll use mock data
        
        // Mock source fields (Zephyr)
        const mockSourceFields: Field[] = [
          { id: 'name', name: 'Name', type: 'string', required: true },
          { id: 'description', name: 'Description', type: 'text', required: false },
          { id: 'priority', name: 'Priority', type: 'string', required: false },
          { id: 'labels', name: 'Labels', type: 'array', required: false },
          { id: 'status', name: 'Status', type: 'string', required: true },
          { id: 'createdBy', name: 'Created By', type: 'string', required: false },
          { id: 'creationDate', name: 'Creation Date', type: 'date', required: false },
          { id: 'lastUpdated', name: 'Last Updated', type: 'date', required: false },
          { id: 'component', name: 'Component', type: 'string', required: false },
          { id: 'estimatedTime', name: 'Estimated Time', type: 'number', required: false },
          { id: 'automationStatus', name: 'Automation Status', type: 'string', required: false },
          { id: 'testSteps', name: 'Test Steps', type: 'array', required: true },
          { id: 'preconditions', name: 'Preconditions', type: 'text', required: false },
          { id: 'owner', name: 'Owner', type: 'string', required: false },
          { id: 'folder', name: 'Folder', type: 'string', required: false },
        ];
        
        // Mock target fields (qTest)
        const mockTargetFields: Field[] = [
          { id: 'name', name: 'Name', type: 'string', required: true },
          { id: 'description', name: 'Description', type: 'text', required: false },
          { id: 'priority', name: 'Priority', type: 'string', required: false },
          { id: 'testCaseStatus', name: 'Test Case Status', type: 'string', required: true },
          { id: 'creator', name: 'Creator', type: 'string', required: false },
          { id: 'createdDate', name: 'Created Date', type: 'date', required: false },
          { id: 'lastModifiedDate', name: 'Last Modified Date', type: 'date', required: false },
          { id: 'module', name: 'Module', type: 'string', required: false },
          { id: 'estimatedExecutionTime', name: 'Estimated Execution Time', type: 'number', required: false },
          { id: 'automationStatus', name: 'Automation Status', type: 'string', required: false },
          { id: 'testSteps', name: 'Test Steps', type: 'array', required: true },
          { id: 'precondition', name: 'Precondition', type: 'text', required: false },
          { id: 'assignedTo', name: 'Assigned To', type: 'string', required: false },
          { id: 'tag', name: 'Tag', type: 'array', required: false },
          { id: 'parentId', name: 'Parent ID', type: 'string', required: false },
        ];
        
        setSourceFields(mockSourceFields);
        setTargetFields(mockTargetFields);
      } catch (error) {
        console.error('Error fetching fields:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFields();
  }, [sourceProviderId, targetProviderId]);
  
  // Validate mappings whenever they change
  useEffect(() => {
    validateMappings();
  }, [fieldMappings, sourceFields, targetFields]);
  
  // Filter source fields based on search query
  const filteredSourceFields = sourceFields.filter(field => 
    field.name.toLowerCase().includes(searchSourceQuery.toLowerCase()) ||
    field.id.toLowerCase().includes(searchSourceQuery.toLowerCase())
  );
  
  // Filter target fields based on search query
  const filteredTargetFields = targetFields.filter(field => 
    field.name.toLowerCase().includes(searchTargetQuery.toLowerCase()) ||
    field.id.toLowerCase().includes(searchTargetQuery.toLowerCase())
  );
  
  // Check if a field is already mapped
  const isFieldMapped = (fieldId: string, isSource: boolean) => {
    return fieldMappings.some(mapping => 
      isSource ? mapping.sourceField === fieldId : mapping.targetField === fieldId
    );
  };
  
  // Handle field selection
  const handleSourceFieldSelect = (field: Field) => {
    setSelectedSourceField(field);
  };
  
  const handleTargetFieldSelect = (field: Field) => {
    setSelectedTargetField(field);
  };
  
  // Add a new mapping
  const handleAddMapping = () => {
    if (!selectedSourceField || !selectedTargetField) {
      return;
    }
    
    // Check if mapping already exists
    const existingMappingIndex = fieldMappings.findIndex(
      mapping => mapping.sourceField === selectedSourceField.id && mapping.targetField === selectedTargetField.id
    );
    
    if (existingMappingIndex !== -1) {
      // Already exists, no need to add again
      return;
    }
    
    const newMapping: FieldMapping = {
      sourceField: selectedSourceField.id,
      targetField: selectedTargetField.id,
      transformationType: 'NONE',
      transformationParams: {}
    };
    
    const updatedMappings = [...fieldMappings, newMapping];
    onMappingsUpdate(updatedMappings);
    
    // Clear selections
    setSelectedSourceField(null);
    setSelectedTargetField(null);
  };
  
  // Remove a mapping
  const handleRemoveMapping = (index: number) => {
    const updatedMappings = fieldMappings.filter((_, i) => i !== index);
    onMappingsUpdate(updatedMappings);
  };
  
  // Auto-map fields with matching names/IDs
  const handleAutoMap = () => {
    const newMappings: FieldMapping[] = [...fieldMappings];
    
    // Map fields with exact matching IDs
    sourceFields.forEach(sourceField => {
      const matchingTargetField = targetFields.find(targetField => 
        targetField.id === sourceField.id
      );
      
      if (matchingTargetField && !isFieldMapped(sourceField.id, true)) {
        newMappings.push({
          sourceField: sourceField.id,
          targetField: matchingTargetField.id,
          transformationType: 'NONE',
          transformationParams: {}
        });
      }
    });
    
    // If we don't have all required target fields mapped yet,
    // try a more fuzzy matching approach
    const requiredTargetFields = targetFields.filter(field => field.required);
    const mappedTargetFieldIds = newMappings.map(mapping => mapping.targetField);
    
    const unmappedRequiredTargetFields = requiredTargetFields.filter(
      field => !mappedTargetFieldIds.includes(field.id)
    );
    
    if (unmappedRequiredTargetFields.length > 0) {
      // For each unmapped required target field, try to find a similar source field
      unmappedRequiredTargetFields.forEach(targetField => {
        // Skip if already mapped by the earlier exact matching
        if (mappedTargetFieldIds.includes(targetField.id)) {
          return;
        }
        
        // Try to find a similar source field that's not already mapped
        const similarSourceFields = sourceFields.filter(sourceField => 
          !isFieldMapped(sourceField.id, true) &&
          (
            // Match by normalized name (remove spaces, lowercase)
            sourceField.name.toLowerCase().replace(/\s+/g, '') === 
              targetField.name.toLowerCase().replace(/\s+/g, '') ||
            // Or if the source field contains the target field name
            sourceField.name.toLowerCase().includes(targetField.name.toLowerCase()) ||
            // Or if the target field contains the source field name
            targetField.name.toLowerCase().includes(sourceField.name.toLowerCase())
          )
        );
        
        if (similarSourceFields.length > 0) {
          // Use the first match
          newMappings.push({
            sourceField: similarSourceFields[0].id,
            targetField: targetField.id,
            transformationType: 'NONE',
            transformationParams: {}
          });
        }
      });
    }
    
    onMappingsUpdate(newMappings);
  };
  
  // Clear all mappings
  const handleClearMappings = () => {
    onMappingsUpdate([]);
  };
  
  // Validate that all required target fields are mapped
  const validateMappings = () => {
    const errors: string[] = [];
    
    // Check that all required target fields are mapped
    const requiredTargetFields = targetFields.filter(field => field.required);
    const mappedTargetFieldIds = fieldMappings.map(mapping => mapping.targetField);
    
    const unmappedRequiredTargetFields = requiredTargetFields.filter(
      field => !mappedTargetFieldIds.includes(field.id)
    );
    
    if (unmappedRequiredTargetFields.length > 0) {
      const fieldNames = unmappedRequiredTargetFields.map(field => field.name).join(', ');
      errors.push(`Required target fields are not mapped: ${fieldNames}`);
    }
    
    // Check for type mismatches
    fieldMappings.forEach(mapping => {
      const sourceField = sourceFields.find(field => field.id === mapping.sourceField);
      const targetField = targetFields.find(field => field.id === mapping.targetField);
      
      if (sourceField && targetField && sourceField.type !== targetField.type) {
        // Some type combinations are acceptable (string → text, array → array)
        const isCompatible = 
          (sourceField.type === 'string' && targetField.type === 'text') ||
          (sourceField.type === 'text' && targetField.type === 'string');
        
        if (!isCompatible) {
          errors.push(`Type mismatch: ${sourceField.name} (${sourceField.type}) → ${targetField.name} (${targetField.type})`);
        }
      }
    });
    
    setValidationErrors(errors);
  };
  
  // Get field info by ID
  const getFieldById = (fieldId: string, isSource: boolean): Field | undefined => {
    return isSource 
      ? sourceFields.find(field => field.id === fieldId)
      : targetFields.find(field => field.id === fieldId);
  };
  
  // Render field mapping status summary
  const renderMappingStatus = () => {
    const totalRequiredTargetFields = targetFields.filter(field => field.required).length;
    const mappedRequiredTargetFields = targetFields
      .filter(field => field.required && fieldMappings.some(mapping => mapping.targetField === field.id))
      .length;
    
    const mappingPercentage = totalRequiredTargetFields > 0
      ? (mappedRequiredTargetFields / totalRequiredTargetFields) * 100
      : 0;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">
            Field Mapping Status
          </Typography>
          <Typography variant="body2">
            {mappedRequiredTargetFields} of {totalRequiredTargetFields} required fields mapped
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={mappingPercentage} 
          color={mappingPercentage === 100 ? "success" : "primary"}
          sx={{ height: 8, borderRadius: 4 }}
        />
        
        {validationErrors.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Validation Issues
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>
                  <Typography variant="body2">{error}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </Box>
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography variant="body1" align="center" sx={{ mt: 2 }}>
          Loading field definitions...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Field Mapping
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Map fields from {sourceProviderId} to {targetProviderId}. Required fields are marked with an asterisk (*).
        </Typography>
      </Box>
      
      {/* Mapping status and controls */}
      {renderMappingStatus()}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<AutoFixHighIcon />}
          onClick={handleAutoMap}
          sx={{ mr: 1 }}
        >
          Auto-Map Fields
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          startIcon={<DeleteSweepIcon />}
          onClick={handleClearMappings}
          disabled={fieldMappings.length === 0}
        >
          Clear All Mappings
        </Button>
      </Box>
      
      {/* Current mappings */}
      {fieldMappings.length > 0 && (
        <LcarsPanel elevation={1} sx={{ mb: 4, p: 0 }}>
          <LcarsPanelContent>
            <Typography variant="subtitle1" sx={{ p: 2, pb: 1 }}>
              Current Mappings
            </Typography>
            <List disablePadding>
              {fieldMappings.map((mapping, index) => {
                const sourceField = getFieldById(mapping.sourceField, true);
                const targetField = getFieldById(mapping.targetField, false);
                
                return (
                  <ListItem 
                    key={index}
                    divider={index < fieldMappings.length - 1}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleRemoveMapping(index)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={sourceField?.name || mapping.sourceField}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <ArrowRightAltIcon sx={{ mx: 1 }} />
                          <Chip 
                            label={targetField?.name || mapping.targetField}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          {targetField?.required && (
                            <Chip 
                              label="Required" 
                              size="small" 
                              color="error" 
                              sx={{ ml: 1 }}
                            />
                          )}
                          {mapping.transformationType !== 'NONE' && (
                            <Chip 
                              label={`Transformation: ${mapping.transformationType}`}
                              size="small"
                              color="info"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </LcarsPanelContent>
        </LcarsPanel>
      )}
      
      {/* Field selector */}
      <Grid container spacing={3}>
        {/* Source fields */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1" gutterBottom>
            Source Fields ({sourceProviderId})
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search source fields..."
            size="small"
            value={searchSourceQuery}
            onChange={(e) => setSearchSourceQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Paper variant="outlined" sx={{ height: 400, overflow: 'auto' }}>
            {filteredSourceFields.map(field => (
              <FieldCard
                key={field.id}
                selected={selectedSourceField?.id === field.id}
                onClick={() => handleSourceFieldSelect(field)}
                variant="outlined"
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">
                      {field.name} {field.required && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {field.id} • Type: {field.type}
                    </Typography>
                  </Box>
                  {isFieldMapped(field.id, true) && (
                    <Chip
                      label="Mapped"
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<CheckCircleIcon />}
                    />
                  )}
                </Box>
              </FieldCard>
            ))}
          </Paper>
        </Grid>
        
        {/* Mapping controls */}
        <Grid item xs={12} md={2} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            disabled={!selectedSourceField || !selectedTargetField}
            onClick={handleAddMapping}
            sx={{ mb: 2 }}
          >
            Map Fields
          </Button>
          <ArrowRightAltIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Select a source field and a target field, then click "Map Fields" to create a mapping.
          </Typography>
        </Grid>
        
        {/* Target fields */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1" gutterBottom>
            Target Fields ({targetProviderId})
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search target fields..."
            size="small"
            value={searchTargetQuery}
            onChange={(e) => setSearchTargetQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Paper variant="outlined" sx={{ height: 400, overflow: 'auto' }}>
            {filteredTargetFields.map(field => (
              <FieldCard
                key={field.id}
                selected={selectedTargetField?.id === field.id}
                onClick={() => handleTargetFieldSelect(field)}
                variant="outlined"
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">
                      {field.name} {field.required && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {field.id} • Type: {field.type}
                    </Typography>
                  </Box>
                  {isFieldMapped(field.id, false) ? (
                    <Chip
                      label="Mapped"
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<CheckCircleIcon />}
                    />
                  ) : (
                    field.required && (
                      <Chip
                        label="Required"
                        size="small"
                        color="error"
                        variant="outlined"
                        icon={<ErrorIcon />}
                      />
                    )
                  )}
                </Box>
              </FieldCard>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FieldMappingPanel;