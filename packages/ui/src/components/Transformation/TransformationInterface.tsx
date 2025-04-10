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
  Paper,
  Typography,
  Divider,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  styled,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PreviewIcon from '@mui/icons-material/Preview';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';

import { FieldMappingPanel } from '../Mapping/FieldMappingPanel';
import { TransformationPreviewPanel } from './TransformationPreviewPanel';
import { FieldTransformation } from './FieldTransformation';
import { Field, FieldMapping, Provider, TransformationPreview, MappingConfig } from '../../types';
import { transformationService } from '../../services';

// LCARS-inspired styling
const LcarsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  margin: theme.spacing(2, 0),
  borderRadius: theme.spacing(2),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: theme.spacing(4),
    height: '100%',
    backgroundColor: theme.palette.primary.main,
    borderTopLeftRadius: theme.spacing(2),
    borderBottomLeftRadius: theme.spacing(2),
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: theme.spacing(4),
    height: '100%',
    backgroundColor: theme.palette.secondary.main,
    borderTopRightRadius: theme.spacing(2),
    borderBottomRightRadius: theme.spacing(2),
  }
}));

const ContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 6),
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 6),
  marginTop: theme.spacing(2),
}));

// BlinkingLight component
const BlinkingLight = styled(Box)<{ isActive: boolean }>(({ theme, isActive }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  marginRight: theme.spacing(1),
  backgroundColor: isActive ? theme.palette.success.main : theme.palette.grey[400],
  animation: isActive ? 'blink 1s infinite' : 'none',
  display: 'inline-block',
  '@keyframes blink': {
    '0%': { opacity: 0.3 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.3 },
  }
}));

interface TransformationInterfaceProps {
  /**
   * The source provider
   */
  sourceProvider: Provider;
  
  /**
   * The target provider
   */
  targetProvider: Provider;
  
  /**
   * Initial mappings (if any)
   */
  initialMappings?: FieldMapping[];
  
  /**
   * Whether the interface is in read-only mode
   */
  readOnly?: boolean;
  
  /**
   * Callback when mappings are saved
   */
  onSave?: (mappings: FieldMapping[], config: MappingConfig) => void;
  
  /**
   * Callback when the interface is closed
   */
  onClose?: () => void;
  
  /**
   * Optional test case ID for preview
   */
  testCaseId?: string;
}

export const TransformationInterface: React.FC<TransformationInterfaceProps> = ({
  sourceProvider,
  targetProvider,
  initialMappings = [],
  readOnly = false,
  onSave,
  onClose,
  testCaseId = 'sample-test-case'
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialMappings);
  const [sourceFields, setSourceFields] = useState<Field[]>([]);
  const [targetFields, setTargetFields] = useState<Field[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<FieldMapping | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [transformationPreview, setTransformationPreview] = useState<TransformationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch fields when providers change
  useEffect(() => {
    // In a real implementation, these would be fetched from an API
    // For now, we'll use mock data
    setSourceFields([
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: true },
      { id: 'steps', name: 'Test Steps', type: 'array', required: true },
      { id: 'labels', name: 'Labels', type: 'array', required: false },
      { id: 'priority', name: 'Priority', type: 'string', required: false },
      { id: 'status', name: 'Status', type: 'string', required: true },
      { id: 'precondition', name: 'Precondition', type: 'text', required: false },
      { id: 'component', name: 'Component', type: 'string', required: false },
      { id: 'owner', name: 'Owner', type: 'string', required: false },
      { id: 'createdBy', name: 'Created By', type: 'string', required: false },
      { id: 'createdOn', name: 'Created On', type: 'date', required: false },
      { id: 'updatedOn', name: 'Updated On', type: 'date', required: false },
    ]);
    
    setTargetFields([
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: true },
      { id: 'testSteps', name: 'Test Steps', type: 'array', required: true },
      { id: 'tags', name: 'Tags', type: 'array', required: false },
      { id: 'priority', name: 'Priority', type: 'string', required: true },
      { id: 'status', name: 'Status', type: 'string', required: true },
      { id: 'preconditions', name: 'Preconditions', type: 'text', required: false },
      { id: 'module', name: 'Module', type: 'string', required: true },
      { id: 'assignedTo', name: 'Assigned To', type: 'string', required: false },
      { id: 'automationStatus', name: 'Automation Status', type: 'string', required: false },
      { id: 'testType', name: 'Test Type', type: 'string', required: true, allowedValues: ['Functional', 'Integration', 'Regression', 'Security', 'Performance'] },
      { id: 'properties.customField1', name: 'Custom Field 1', type: 'string', required: false },
      { id: 'properties.customField2', name: 'Custom Field 2', type: 'string', required: false },
    ]);
  }, [sourceProvider, targetProvider]);
  
  // Handle field mappings change
  const handleFieldMappingsChange = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
  };
  
  // Handle mapping selection for detailed transformation
  const handleSelectMapping = (mapping: FieldMapping) => {
    setSelectedMapping(mapping);
    setActiveStep(1);
  };
  
  // Update a specific mapping
  const handleUpdateMapping = (updatedMapping: FieldMapping) => {
    const index = fieldMappings.findIndex(
      m => m.sourceId === updatedMapping.sourceId && m.targetId === updatedMapping.targetId
    );
    
    if (index !== -1) {
      const newMappings = [...fieldMappings];
      newMappings[index] = updatedMapping;
      setFieldMappings(newMappings);
    }
  };
  
  // Generate transformation preview
  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    setError(null);
    
    try {
      // In a real implementation, this would call an API
      // For now, we'll use a mock service
      const preview = await transformationService.getTransformationPreview(
        testCaseId,
        {
          sourceProviderId: sourceProvider.id,
          targetProviderId: targetProvider.id,
          fieldMappings: fieldMappings,
          defaultValues: {}
        }
      );
      
      setTransformationPreview(preview);
      setActiveStep(2);
    } catch (error) {
      console.error('Error generating preview:', error);
      setError('Failed to generate transformation preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (onSave) {
      onSave(fieldMappings, {
        sourceProviderId: sourceProvider.id,
        targetProviderId: targetProvider.id,
        fieldMappings: fieldMappings,
        name: `${sourceProvider.name} to ${targetProvider.name} Mapping`
      });
    }
  };
  
  // Render the transformation editor
  const renderTransformationEditor = () => {
    if (!selectedMapping) {
      return (
        <Alert severity="info">
          Select a mapping from the list to configure its transformation.
        </Alert>
      );
    }
    
    const sourceField = sourceFields.find(f => f.id === selectedMapping.sourceId);
    const targetField = targetFields.find(f => f.id === selectedMapping.targetId);
    
    if (!sourceField || !targetField) {
      return (
        <Alert severity="error">
          Could not find the source or target field for this mapping.
        </Alert>
      );
    }
    
    return (
      <FieldTransformation
        sourceField={sourceField}
        targetField={targetField}
        mapping={selectedMapping}
        onUpdateMapping={handleUpdateMapping}
        sourceFields={sourceFields}
        disabled={readOnly}
      />
    );
  };
  
  // Define wizard steps
  const steps = [
    'Field Mapping',
    'Transformation Configuration',
    'Preview & Validation'
  ];
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {sourceProvider.name} → {targetProvider.name} Data Transformation
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BlinkingLight isActive={index === activeStep} />
                {label}
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <LcarsContainer elevation={3}>
        <ContentBox>
          {activeStep === 0 && (
            <FieldMappingPanel
              sourceFields={sourceFields}
              targetFields={targetFields}
              initialMappings={fieldMappings}
              onMappingsChange={handleFieldMappingsChange}
              showFieldTypes={true}
              allowAutoMapping={true}
              validateMappings={true}
              showTransformations={true}
              disabled={readOnly}
            />
          )}
          
          {activeStep === 1 && renderTransformationEditor()}
          
          {activeStep === 2 && isGeneratingPreview && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Generating Transformation Preview...
              </Typography>
            </Box>
          )}
          
          {activeStep === 2 && !isGeneratingPreview && transformationPreview && (
            <TransformationPreviewPanel
              testCaseId={testCaseId}
              sourceProviderId={sourceProvider.id}
              targetProviderId={targetProvider.id}
              fieldMappings={fieldMappings}
              onClose={() => setActiveStep(0)}
            />
          )}
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </ContentBox>
        
        <ActionButtons>
          <Box>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ mr: 1 }}
              disabled={isGeneratingPreview}
            >
              Close
            </Button>
            
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={() => setActiveStep(activeStep - 1)}
                disabled={isGeneratingPreview}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
            )}
          </Box>
          
          <Box>
            {activeStep === 0 && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setActiveStep(1)}
                disabled={fieldMappings.length === 0 || readOnly}
                startIcon={<SettingsIcon />}
                sx={{ mr: 1 }}
              >
                Configure Transformations
              </Button>
            )}
            
            {activeStep === 1 && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleGeneratePreview}
                disabled={readOnly}
                startIcon={<PreviewIcon />}
                sx={{ mr: 1 }}
              >
                Generate Preview
              </Button>
            )}
            
            {activeStep === 2 && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  // In a real implementation, this would download the mapping configuration
                  alert('Mapping configuration would be downloaded');
                }}
                startIcon={<DownloadIcon />}
                sx={{ mr: 1 }}
              >
                Export Configuration
              </Button>
            )}
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={fieldMappings.length === 0 || readOnly || isGeneratingPreview}
              startIcon={<SaveIcon />}
            >
              Save Transformation
            </Button>
          </Box>
        </ActionButtons>
      </LcarsContainer>
    </Box>
  );
};
