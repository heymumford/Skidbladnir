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
  Paper, 
  Typography, 
  Box, 
  Alert, 
  Tabs, 
  Tab, 
  CircularProgress,
  Button,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import JSONTree from 'react-json-tree';

import { TransformationPreview } from '../../types';
import { TransformationService } from '../../services/TransformationService';
import { FieldComparisonTable } from './FieldComparisonTable';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transformation-tabpanel-${index}`}
      aria-labelledby={`transformation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface TransformationPreviewPanelProps {
  testCaseId: string;
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: any[];
  onClose?: () => void;
}

// Create a function to extract flat field mappings from preview data for the comparison table
const extractFieldMappings = (preview: TransformationPreview) => {
  const mappings = [];
  const processedFields = new Set<string>();
  
  // First pass: direct field mappings where all three systems have similar field names
  // Process source fields first
  for (const [sourceField, sourceValue] of Object.entries(preview.sourceData)) {
    const canonicalField = findMatchingField(sourceField, preview.canonicalData);
    const targetField = findMatchingField(sourceField, preview.targetData);
    
    const canonicalValue = canonicalField ? preview.canonicalData[canonicalField] : undefined;
    const targetValue = targetField ? preview.targetData[targetField] : undefined;
    
    const hasWarning = 
      canonicalField === null || 
      targetField === null || 
      typeof sourceValue !== typeof canonicalValue ||
      typeof canonicalValue !== typeof targetValue;
    
    mappings.push({
      sourceField,
      canonicalField: canonicalField || '',
      targetField: targetField || '',
      sourceValue,
      canonicalValue,
      targetValue,
      hasTransformation: sourceField !== canonicalField || canonicalField !== targetField,
      hasWarning
    });
    
    processedFields.add(sourceField);
    if (canonicalField) processedFields.add(canonicalField);
    if (targetField) processedFields.add(targetField);
  }
  
  // Second pass: add remaining canonical fields
  for (const [canonicalField, canonicalValue] of Object.entries(preview.canonicalData)) {
    if (processedFields.has(canonicalField)) continue;
    
    const targetField = findMatchingField(canonicalField, preview.targetData);
    const targetValue = targetField ? preview.targetData[targetField] : undefined;
    
    mappings.push({
      sourceField: '',
      canonicalField,
      targetField: targetField || '',
      sourceValue: undefined,
      canonicalValue,
      targetValue,
      hasTransformation: true,
      hasWarning: targetField === null || typeof canonicalValue !== typeof targetValue
    });
    
    processedFields.add(canonicalField);
    if (targetField) processedFields.add(targetField);
  }
  
  // Third pass: add remaining target fields
  for (const [targetField, targetValue] of Object.entries(preview.targetData)) {
    if (processedFields.has(targetField)) continue;
    
    mappings.push({
      sourceField: '',
      canonicalField: '',
      targetField,
      sourceValue: undefined,
      canonicalValue: undefined,
      targetValue,
      hasTransformation: true,
      hasWarning: true
    });
  }
  
  return mappings;
};

// Helper function to find matching field in another object
const findMatchingField = (fieldName: string, data: Record<string, any>): string | null => {
  // Try exact match first
  if (data[fieldName] !== undefined) {
    return fieldName;
  }
  
  // Try case-insensitive match
  const lowerField = fieldName.toLowerCase();
  for (const key of Object.keys(data)) {
    if (key.toLowerCase() === lowerField) {
      return key;
    }
  }
  
  // Try prefix/suffix variations
  const variations = [
    lowerField.replace(/^id_/, ''),
    lowerField.replace(/_id$/, ''),
    lowerField.replace(/[^a-z0-9]/g, ''),
    lowerField.replace(/s$/, '')
  ];
  
  for (const variant of variations) {
    for (const key of Object.keys(data)) {
      if (key.toLowerCase() === variant) {
        return key;
      }
    }
  }
  
  return null;
};

export const TransformationPreviewPanel: React.FC<TransformationPreviewPanelProps> = ({
  testCaseId,
  sourceProviderId,
  targetProviderId,
  fieldMappings,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransformationPreview | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [extractedMappings, setExtractedMappings] = useState<any[]>([]);

  const transformationService = new TransformationService();

  // Function to handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // When the component mounts, fetch the transformation preview
  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // For development/testing purposes, let's use the mock preview
        const preview = transformationService.getMockTransformationPreview();
        setPreview(preview);
        
        // Extract field mappings for the comparison table
        const mappings = extractFieldMappings(preview);
        setExtractedMappings(mappings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the preview');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreview();
  }, [testCaseId, sourceProviderId, targetProviderId, fieldMappings]);

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Generating Transformation Preview...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Paper>
    );
  }

  if (!preview) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1">
          No preview data available.
        </Typography>
      </Paper>
    );
  }

  // JSON Theme for syntax highlighting
  const jsonTheme = {
    scheme: 'monokai',
    author: 'wimer hazenberg (http://www.monokai.nl)',
    base00: '#272822',
    base01: '#383830',
    base02: '#49483e',
    base03: '#75715e',
    base04: '#a59f85',
    base05: '#f8f8f2',
    base06: '#f5f4f1',
    base07: '#f9f8f5',
    base08: '#f92672',
    base09: '#fd971f',
    base0A: '#f4bf75',
    base0B: '#a6e22e',
    base0C: '#a1efe4',
    base0D: '#66d9ef',
    base0E: '#ae81ff',
    base0F: '#cc6633'
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Transformation Preview
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Chip 
            icon={<CompareArrowsIcon />}
            label={`${sourceProviderId} → ${targetProviderId}`}
            color="primary" 
            variant="outlined"
          />
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Box>
      
      {preview.validationMessages && preview.validationMessages.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {preview.validationMessages.length} validation issues found:
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {preview.validationMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="transformation preview tabs">
          <Tab label="Field Comparison" id="transformation-tab-0" />
          <Tab label="JSON View" id="transformation-tab-1" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <FieldComparisonTable 
          fieldMappings={extractedMappings}
          showEmptyFields={false}
          showDataTypes={true}
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Source Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <JSONTree
                data={preview.sourceData}
                theme={jsonTheme}
                invertTheme={true}
                shouldExpandNode={() => true}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Canonical Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <JSONTree
                data={preview.canonicalData}
                theme={jsonTheme}
                invertTheme={true}
                shouldExpandNode={() => true}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Target Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <JSONTree
                data={preview.targetData}
                theme={jsonTheme}
                invertTheme={true}
                shouldExpandNode={() => true}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </TabPanel>
    </Paper>
  );
};