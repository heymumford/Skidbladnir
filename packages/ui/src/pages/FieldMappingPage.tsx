/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Dialog, DialogContent } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { FieldMappingPanel } from '../components/Mapping';
import { TransformationPreviewPanel } from '../components/Transformation';
import { Field, FieldMapping } from '../types';

// Mock services (would be replaced with actual API calls)
const mockFieldService = {
  getSourceFields: () => Promise.resolve<Field[]>([
    { id: 'summary', name: 'Summary', type: 'string', required: true },
    { id: 'description', name: 'Description', type: 'text', required: true },
    { id: 'priority', name: 'Priority', type: 'string', required: false },
    { id: 'status', name: 'Status', type: 'string', required: false },
    { id: 'steps', name: 'Test Steps', type: 'array', required: false },
    { id: 'created_date', name: 'Created Date', type: 'date', required: false },
    { id: 'updated_date', name: 'Updated Date', type: 'date', required: false },
    { id: 'estimated_time', name: 'Estimated Time', type: 'number', required: false },
    { id: 'is_active', name: 'Is Active', type: 'boolean', required: false },
  ]),
  
  getTargetFields: () => Promise.resolve<Field[]>([
    { id: 'name', name: 'Name', type: 'string', required: true },
    { id: 'description', name: 'Description', type: 'text', required: true },
    { id: 'severity', name: 'Severity', type: 'string', required: true },
    { id: 'state', name: 'State', type: 'string', required: false },
    { id: 'preconditions', name: 'Preconditions', type: 'text', required: false },
    { id: 'test_steps', name: 'Test Steps', type: 'array', required: true },
    { id: 'expected_results', name: 'Expected Results', type: 'text', required: false },
    { id: 'creation_date', name: 'Creation Date', type: 'date', required: false },
    { id: 'modified_date', name: 'Modified Date', type: 'date', required: false },
    { id: 'estimated_duration', name: 'Estimated Duration', type: 'number', required: false },
    { id: 'active', name: 'Active', type: 'boolean', required: false },
  ]),
  
  saveMappings: (mappings: FieldMapping[]) => Promise.resolve({ success: true }),
};

export const FieldMappingPage: React.FC = () => {
  const [sourceFields, setSourceFields] = useState<Field[]>([]);
  const [targetFields, setTargetFields] = useState<Field[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<string>('TC-123'); // Default for demo
  
  // Load fields when component mounts
  useEffect(() => {
    const loadFields = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [sourceFieldsData, targetFieldsData] = await Promise.all([
          mockFieldService.getSourceFields(),
          mockFieldService.getTargetFields(),
        ]);
        
        setSourceFields(sourceFieldsData);
        setTargetFields(targetFieldsData);
      } catch (err) {
        setError(`Error loading fields: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadFields();
  }, []);
  
  // Update mappings and validation status
  const handleMappingsChange = (newMappings: FieldMapping[]) => {
    setMappings(newMappings);
    
    // Check if all required target fields are mapped
    const mappedTargetIds = newMappings.map(m => m.targetId);
    const requiredTargetFields = targetFields.filter(field => field.required);
    const allRequiredMapped = requiredTargetFields.every(field => 
      mappedTargetIds.includes(field.id)
    );
    
    setIsValid(allRequiredMapped);
  };
  
  // Save mappings
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await mockFieldService.saveMappings(mappings);
      // In a real app, you might show a success message or navigate to the next step
    } catch (err) {
      setError(`Error saving mappings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle navigation to next step
  const handleNavigateToNext = () => {
    // In a real application, this would navigate to the next step
    // For now, just log the mappings
    console.log('Proceeding to next step with mappings:', mappings);
    handleSave();
  };
  
  // Open preview dialog
  const handleOpenPreview = () => {
    setPreviewOpen(true);
  };
  
  // Close preview dialog
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Paper sx={{ p: 3, mt: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <Typography variant="h6">Error</Typography>
        <Typography>{error}</Typography>
      </Paper>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Field Mapping Configuration
      </Typography>
      
      <Typography variant="body1" paragraph>
        Map fields from the source provider to the target provider. Required fields must be mapped to proceed.
      </Typography>
      
      <FieldMappingPanel
        sourceFields={sourceFields}
        targetFields={targetFields}
        onMappingsChange={handleMappingsChange}
        showFieldTypes={true}
        validateMappings={true}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<PreviewIcon />}
          onClick={handleOpenPreview}
          disabled={mappings.length === 0}
          sx={{ mr: 2 }}
        >
          Preview Transformation
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          disabled={!isValid || isSaving}
          onClick={handleNavigateToNext}
        >
          {isSaving ? 'Saving...' : 'Continue to Execution'}
        </Button>
      </Box>
      
      {/* Transformation Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="xl"
        fullWidth
        scroll="paper"
        aria-labelledby="preview-dialog-title"
      >
        <DialogContent sx={{ p: 0 }}>
          <TransformationPreviewPanel
            testCaseId={selectedTestCase}
            sourceProviderId="zephyr"
            targetProviderId="qtest"
            fieldMappings={mappings}
            onClose={handleClosePreview}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};