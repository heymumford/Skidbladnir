/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import JSONTree from 'react-json-tree';
import { TransformationService } from '../../services/TransformationService';
import { TransformationPreview, FieldMapping } from '../../types';
import { DataStructureComparison } from './DataStructureComparison';
import { AttachmentPreview } from '../TestCase/AttachmentPreview';

interface TestCasePreviewComponentProps {
  testCaseId: string;
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: FieldMapping[];
  onEditMapping?: (fieldMapping: FieldMapping) => void;
  onClose?: () => void;
}

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
      id={`testcase-preview-tabpanel-${index}`}
      aria-labelledby={`testcase-preview-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Helper function to get a string representation of a value's type
const getType = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

// Helper function to format a value for display
const formatValue = (value: any): React.ReactNode => {
  if (value === null) return <span className="type-null">null</span>;
  if (value === undefined) return <span className="type-undefined">undefined</span>;
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return (
      <span className="array-value">
        [{value.length} items]
      </span>
    );
  }
  
  if (typeof value === 'object') {
    return (
      <span className="object-value">
        {'{...}'}
      </span>
    );
  }
  
  if (typeof value === 'string') {
    return (
      <span className="string-value">
        "{value}"
      </span>
    );
  }
  
  return String(value);
};

// Component to display differences between values
const DiffHighlighter: React.FC<{ sourceValue: any; targetValue: any }> = ({
  sourceValue,
  targetValue
}) => {
  // Check if values are different
  const isDifferent = JSON.stringify(sourceValue) !== JSON.stringify(targetValue);
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}
    >
      <Box
        sx={{
          fontFamily: 'monospace',
          p: 1,
          borderRadius: 1,
          maxWidth: '45%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...(isDifferent ? { bgcolor: '#ffeaea' } : {})
        }}
      >
        {formatValue(sourceValue)}
      </Box>
      
      <ArrowForwardIcon color={isDifferent ? "primary" : "disabled"} />
      
      <Box
        sx={{
          fontFamily: 'monospace',
          p: 1,
          borderRadius: 1,
          maxWidth: '45%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...(isDifferent ? { bgcolor: '#e6ffe6' } : {})
        }}
      >
        {formatValue(targetValue)}
      </Box>
    </Box>
  );
};

/**
 * Enhanced component for previewing test case transformations with advanced visualization
 * and interactive comparison features
 */
export const TestCasePreviewComponent: React.FC<TestCasePreviewComponentProps> = ({
  testCaseId,
  sourceProviderId,
  targetProviderId,
  fieldMappings,
  onEditMapping,
  onClose
}) => {
  const [preview, setPreview] = useState<TransformationPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFields, setFilteredFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [transformationMappings, setTransformationMappings] = useState<Record<string, { sourceField: string, targetField: string, hasTransformation: boolean }>>({});
  
  // Ref for scrolling to selected field
  const selectedFieldRef = useRef<HTMLDivElement>(null);
  
  const transformationService = new TransformationService();
  
  // Fetch preview data when component mounts
  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const previewData = await transformationService.getTransformationPreview(testCaseId, {
          sourceProviderId,
          targetProviderId,
          fieldMappings
        });
        
        setPreview(previewData);
        
        // Create mapping lookup for field transformations
        const mappingLookup: Record<string, { sourceField: string, targetField: string, hasTransformation: boolean }> = {};
        
        for (const mapping of fieldMappings) {
          mappingLookup[mapping.targetId] = {
            sourceField: mapping.sourceId,
            targetField: mapping.targetId,
            hasTransformation: !!mapping.transformation
          };
        }
        
        setTransformationMappings(mappingLookup);
        
        // Initialize filtered fields with all source fields
        if (previewData.sourceData) {
          setFilteredFields(Object.keys(previewData.sourceData));
        }
      } catch (err) {
        console.error('Error fetching transformation preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreview();
  }, [testCaseId, sourceProviderId, targetProviderId, fieldMappings]);
  
  // Filter fields when search term changes
  useEffect(() => {
    if (!preview || !preview.sourceData) return;
    
    if (!searchTerm) {
      setFilteredFields(Object.keys(preview.sourceData));
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = Object.keys(preview.sourceData).filter(
      key => key.toLowerCase().includes(lowerSearchTerm)
    );
    
    setFilteredFields(filtered);
  }, [searchTerm, preview]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle edit mapping
  const handleEditMapping = (sourceId: string, targetId: string) => {
    if (onEditMapping) {
      const mapping = fieldMappings.find(
        mapping => mapping.sourceId === sourceId && mapping.targetId === targetId
      );
      
      if (mapping) {
        onEditMapping(mapping);
      }
    }
  };
  
  // Handle field selection
  const handleSelectField = (field: string) => {
    setSelectedField(field);
    
    // Scroll to the selected field
    setTimeout(() => {
      if (selectedFieldRef.current) {
        selectedFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  
  // Handle issue selection from data structure comparison
  const handleSelectIssue = (fieldName: string) => {
    setTabValue(0); // Switch to Field Comparison tab
    handleSelectField(fieldName);
  };
  
  // Get if a field has an attachment based on field type and name patterns
  const isAttachmentField = (fieldName: string, value: any): boolean => {
    // Check if this might be an attachment field
    const attachmentPatterns = ['attachment', 'file', 'document', 'image', 'screenshot'];
    const isNameMatch = attachmentPatterns.some(pattern => fieldName.toLowerCase().includes(pattern));
    
    // Look for common attachment structure
    if (typeof value === 'object' && value !== null) {
      const hasAttachmentProps = 
        'name' in value && 
        ('url' in value || 'id' in value) &&
        ('fileType' in value || 'contentType' in value || 'type' in value);
      
      if (hasAttachmentProps) return true;
    }
    
    // Check for array of attachments
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      const firstItem = value[0];
      const hasAttachmentProps = 
        'name' in firstItem && 
        ('url' in firstItem || 'id' in firstItem) &&
        ('fileType' in firstItem || 'contentType' in firstItem || 'type' in firstItem);
      
      if (hasAttachmentProps) return true;
    }
    
    return isNameMatch;
  };
  
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
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading test case preview...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!preview) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        No preview data available
      </Alert>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Test Case Preview
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {sourceProviderId} → {targetProviderId}
        </Typography>
        
        {preview.validationMessages && preview.validationMessages.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Issues:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {preview.validationMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="test case preview tabs">
          <Tab 
            icon={<CompareArrowsIcon fontSize="small" />} 
            iconPosition="start" 
            label="Field Comparison" 
            id="testcase-preview-tab-0" 
          />
          <Tab 
            icon={<CodeIcon fontSize="small" />} 
            iconPosition="start" 
            label="JSON View" 
            id="testcase-preview-tab-1" 
          />
          <Tab 
            icon={<VisibilityIcon fontSize="small" />} 
            iconPosition="start" 
            label="Visual Diff" 
            id="testcase-preview-tab-2" 
          />
          <Tab 
            icon={<TableChartIcon fontSize="small" />} 
            iconPosition="start" 
            label="Advanced Comparison" 
            id="testcase-preview-tab-3" 
          />
          <Tab 
            icon={<InsertDriveFileIcon fontSize="small" />} 
            iconPosition="start" 
            label="Attachments" 
            id="testcase-preview-tab-4" 
          />
        </Tabs>
      </Box>
      
      {/* Field Comparison Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search fields..."
            fullWidth
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom>
              Source Test Case
              <Chip
                label={sourceProviderId}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            </Typography>
            
            {filteredFields.map(key => {
              const value = preview.sourceData[key];
              const isHighlighted = key === selectedField;
              
              return (
                <div ref={isHighlighted ? selectedFieldRef : null} key={key}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mb: 1,
                      ...(isHighlighted ? { 
                        borderColor: 'primary.main', 
                        boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}` 
                      } : {})
                    }}
                  >
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {key}
                        <Chip
                          label={getType(value)}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                        />
                        {isAttachmentField(key, value) && (
                          <Chip
                            label="Attachment"
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxHeight: '80px'
                        }}
                      >
                        {formatValue(value)}
                      </Box>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom>
              Target Test Case
              <Chip
                label={targetProviderId}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            </Typography>
            
            {filteredFields.map(key => {
              // Look for corresponding field in target data
              const mapping = fieldMappings.find(mapping => 
                mapping.sourceId === key
              );
              
              const targetField = mapping?.targetId;
              const value = targetField ? preview.targetData[targetField] : undefined;
              const hasTransformation = mapping?.transformation ? true : false;
              const isHighlighted = key === selectedField;
              
              return (
                <Card 
                  key={key} 
                  variant="outlined" 
                  sx={{ 
                    mb: 1,
                    ...(isHighlighted ? { 
                      borderColor: 'primary.main', 
                      boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}` 
                    } : {})
                  }}
                >
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {targetField || 'Not mapped'}
                        {value !== undefined && (
                          <Chip
                            label={getType(value)}
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                        {hasTransformation && (
                          <Chip
                            label="Transformed"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                        {value !== undefined && isAttachmentField(targetField!, value) && (
                          <Chip
                            label="Attachment"
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                      </Typography>
                      
                      {mapping && onEditMapping && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditMapping(mapping.sourceId, mapping.targetId)}
                          title="Edit Transformation"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    
                    <Box
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '80px'
                      }}
                    >
                      {value !== undefined ? formatValue(value) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Not mapped
                        </Typography>
                      )}
                    </Box>
                    
                    {mapping && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Source:</strong> {mapping.sourceId}
                        </Typography>
                        {mapping.transformation && (
                          <Tooltip title="This field has a transformation applied" arrow>
                            <IconButton size="small">
                              <CompareArrowsIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* JSON View Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom>
              Source Data ({sourceProviderId})
            </Typography>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '500px' }}>
              <JSONTree
                data={preview.sourceData}
                theme={jsonTheme}
                invertTheme={true}
                shouldExpandNode={(keyPath, data, level) => level < 2}
              />
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom>
              Target Data ({targetProviderId})
            </Typography>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '500px' }}>
              <JSONTree
                data={preview.targetData}
                theme={jsonTheme}
                invertTheme={true}
                shouldExpandNode={(keyPath, data, level) => level < 2}
              />
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            Canonical Format
          </Typography>
          <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: '300px' }}>
            <JSONTree
              data={preview.canonicalData}
              theme={jsonTheme}
              invertTheme={true}
              shouldExpandNode={(keyPath, data, level) => level < 2}
            />
          </Box>
        </Box>
      </TabPanel>
      
      {/* Visual Diff Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Visual Field Diff
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 2 }}>
          {fieldMappings.map((mapping, index) => {
            const sourceValue = preview.sourceData[mapping.sourceId];
            const targetValue = preview.targetData[mapping.targetId];
            const isDifferent = JSON.stringify(sourceValue) !== JSON.stringify(targetValue);
            
            return (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">
                    {mapping.sourceId} → {mapping.targetId}
                    {mapping.transformation && (
                      <Chip
                        label="Transformed"
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                      />
                    )}
                    {isDifferent && !mapping.transformation && (
                      <Chip
                        label="Values Differ"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                      />
                    )}
                  </Typography>
                  
                  {onEditMapping && (
                    <IconButton
                      size="small"
                      onClick={() => onEditMapping(mapping)}
                      title="Edit Transformation"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                
                <DiffHighlighter sourceValue={sourceValue} targetValue={targetValue} />
                
                {index < fieldMappings.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            );
          })}
        </Paper>
      </TabPanel>
      
      {/* Advanced Comparison Tab */}
      <TabPanel value={tabValue} index={3}>
        <DataStructureComparison 
          preview={preview}
          sourceProviderId={sourceProviderId}
          targetProviderId={targetProviderId}
          onSelectIssue={handleSelectIssue}
        />
      </TabPanel>
      
      {/* Attachments Tab */}
      <TabPanel value={tabValue} index={4}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Attachment Preview
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This tab shows attachment fields detected in the test case. 
            Attachments will be properly transferred during the migration process.
          </Alert>
        </Box>
        
        <Grid container spacing={3}>
          {/* Source Attachments */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Source Attachments ({sourceProviderId})
            </Typography>
            
            {Object.entries(preview.sourceData)
              .filter(([key, value]) => isAttachmentField(key, value))
              .map(([key, value]) => {
                // Format attachment data for preview
                const attachmentData = Array.isArray(value) ? value[0] : value;
                const formattedAttachment = {
                  id: attachmentData.id || 'sample-attachment',
                  name: attachmentData.name || 'Attachment',
                  fileType: attachmentData.fileType || attachmentData.contentType || 'application/octet-stream',
                  size: attachmentData.size || 12345,
                  description: attachmentData.description || `Attachment from ${key}`
                };
                
                return (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{key}</Typography>
                        <Chip 
                          label="Source" 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                          sx={{ ml: 1 }} 
                        />
                      </AccordionSummary>
                      <AccordionDetails>
                        <AttachmentPreview 
                          attachment={formattedAttachment}
                          testCaseId={testCaseId}
                          title={`Source Attachment: ${key}`}
                        />
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                );
              })}
            
            {Object.entries(preview.sourceData)
              .filter(([key, value]) => isAttachmentField(key, value))
              .length === 0 && (
              <Alert severity="info">
                No attachments detected in source test case
              </Alert>
            )}
          </Grid>
          
          {/* Target Attachments */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Target Attachments ({targetProviderId})
            </Typography>
            
            {Object.entries(preview.targetData)
              .filter(([key, value]) => isAttachmentField(key, value))
              .map(([key, value]) => {
                // Format attachment data for preview
                const attachmentData = Array.isArray(value) ? value[0] : value;
                const formattedAttachment = {
                  id: attachmentData.id || 'sample-attachment',
                  name: attachmentData.name || 'Attachment',
                  fileType: attachmentData.fileType || attachmentData.contentType || 'application/octet-stream',
                  size: attachmentData.size || 12345,
                  description: attachmentData.description || `Attachment from ${key}`
                };
                
                return (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{key}</Typography>
                        <Chip 
                          label="Target" 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                          sx={{ ml: 1 }} 
                        />
                      </AccordionSummary>
                      <AccordionDetails>
                        <AttachmentPreview 
                          attachment={formattedAttachment}
                          testCaseId={testCaseId}
                          title={`Target Attachment: ${key}`}
                        />
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                );
              })}
            
            {Object.entries(preview.targetData)
              .filter(([key, value]) => isAttachmentField(key, value))
              .length === 0 && (
              <Alert severity="info">
                No attachments detected in target test case
              </Alert>
            )}
          </Grid>
        </Grid>
      </TabPanel>
      
      {onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            color="primary"
            sx={{ mr: 1 }}
            onClick={() => {
              // Create downloadable JSON file
              const jsonData = JSON.stringify(preview, null, 2);
              const blob = new Blob([jsonData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = `test-case-preview-${testCaseId}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export Preview
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      )}
    </Paper>
  );
};