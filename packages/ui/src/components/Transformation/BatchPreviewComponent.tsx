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
  Card,
  CardContent,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { TransformationService } from '../../services/TransformationService';
import { TransformationPreview, FieldMapping } from '../../types';
import { TestCasePreviewComponent } from './TestCasePreviewComponent';

interface BatchPreviewProps {
  testCaseIds: string[];
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: FieldMapping[];
  onEditMapping?: (fieldMapping: FieldMapping) => void;
  onClose?: () => void;
}

interface TestCasePreviewData {
  testCaseId: string;
  preview: TransformationPreview | null;
  loading: boolean;
  error: string | null;
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
      id={`batch-preview-tabpanel-${index}`}
      aria-labelledby={`batch-preview-tab-${index}`}
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

export const BatchPreviewComponent: React.FC<BatchPreviewProps> = ({
  testCaseIds,
  sourceProviderId,
  targetProviderId,
  fieldMappings,
  onEditMapping,
  onClose
}) => {
  const [previews, setPreviews] = useState<Record<string, TestCasePreviewData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalIssues, setTotalIssues] = useState<number>(0);
  
  const pageSize = 10;
  const transformationService = new TransformationService();
  
  // Initialize preview data for all test cases
  useEffect(() => {
    const initialPreviews: Record<string, TestCasePreviewData> = {};
    
    // Create initial state for each test case
    testCaseIds.forEach(id => {
      initialPreviews[id] = {
        testCaseId: id,
        preview: null,
        loading: true,
        error: null
      };
    });
    
    setPreviews(initialPreviews);
    setLoading(true);
    
    // If there are test cases, set the first one as selected
    if (testCaseIds.length > 0) {
      setSelectedTestCaseId(testCaseIds[0]);
    }
    
    // Fetch the first batch of previews
    fetchPreviewsBatch(testCaseIds.slice(0, pageSize * 2), initialPreviews);
  }, [testCaseIds, sourceProviderId, targetProviderId, fieldMappings]);
  
  // Fetch preview data for a batch of test cases
  const fetchPreviewsBatch = async (
    ids: string[],
    currentPreviews: Record<string, TestCasePreviewData>
  ) => {
    // Create a copy of the current previews
    const updatedPreviews = { ...currentPreviews };
    
    // Track if any previews are still loading
    let stillLoading = false;
    
    // Create an array of promises to fetch each test case preview
    const fetchPromises = ids.map(async (id) => {
      try {
        const preview = await transformationService.getTransformationPreview(id, {
          sourceProviderId,
          targetProviderId,
          fieldMappings
        });
        
        updatedPreviews[id] = {
          testCaseId: id,
          preview,
          loading: false,
          error: null
        };
      } catch (err) {
        updatedPreviews[id] = {
          testCaseId: id,
          preview: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load preview'
        };
      }
    });
    
    // Wait for all previews to be fetched
    await Promise.all(fetchPromises);
    
    // Update the state with the fetched previews
    setPreviews(updatedPreviews);
    
    // Check if any previews are still loading
    Object.values(updatedPreviews).forEach(data => {
      if (data.loading) {
        stillLoading = true;
      }
    });
    
    // Update loading state
    setLoading(stillLoading);
    
    // Count total validation issues
    let issueCount = 0;
    Object.values(updatedPreviews).forEach(data => {
      if (data.preview?.validationMessages) {
        issueCount += data.preview.validationMessages.length;
      }
    });
    setTotalIssues(issueCount);
  };
  
  // Fetch preview for a specific test case
  const fetchPreview = async (testCaseId: string) => {
    const updatedPreviews = { ...previews };
    
    // Mark the test case as loading
    updatedPreviews[testCaseId] = {
      ...updatedPreviews[testCaseId],
      loading: true,
      error: null
    };
    
    setPreviews(updatedPreviews);
    
    try {
      const preview = await transformationService.getTransformationPreview(testCaseId, {
        sourceProviderId,
        targetProviderId,
        fieldMappings
      });
      
      updatedPreviews[testCaseId] = {
        testCaseId,
        preview,
        loading: false,
        error: null
      };
    } catch (err) {
      updatedPreviews[testCaseId] = {
        testCaseId,
        preview: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load preview'
      };
    }
    
    setPreviews(updatedPreviews);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    
    // Calculate the indices for the new page
    const startIndex = (value - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Get the test case IDs for the new page
    const pageIds = testCaseIds.slice(startIndex, endIndex);
    
    // Fetch previews for any test cases on this page that don't have data yet
    const idsToFetch = pageIds.filter(id => !previews[id] || (!previews[id].preview && !previews[id].error));
    
    if (idsToFetch.length > 0) {
      fetchPreviewsBatch(idsToFetch, previews);
    }
  };
  
  // Handle view test case
  const handleViewTestCase = (testCaseId: string) => {
    setSelectedTestCaseId(testCaseId);
    setActiveTab(2); // Switch to the individual preview tab
    
    // If the preview isn't loaded yet, fetch it
    if (!previews[testCaseId]?.preview && !previews[testCaseId]?.loading) {
      fetchPreview(testCaseId);
    }
  };
  
  // Handle close individual preview
  const handleCloseIndividualPreview = () => {
    setSelectedTestCaseId(null);
    setActiveTab(0); // Go back to the summary tab
  };
  
  // Calculate page data
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, testCaseIds.length);
  const paginatedTestCaseIds = testCaseIds.slice(startIndex, endIndex);
  const totalPages = Math.ceil(testCaseIds.length / pageSize);
  
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Batch Preview
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {sourceProviderId} → {targetProviderId} | {testCaseIds.length} test cases
        </Typography>
        
        {totalIssues > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {totalIssues} validation issues found across all test cases
            </Typography>
          </Alert>
        )}
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="batch preview tabs">
          <Tab label="Summary" id="batch-preview-tab-0" />
          <Tab label="Validation Issues" id="batch-preview-tab-1" />
          {selectedTestCaseId && (
            <Tab label="Individual Preview" id="batch-preview-tab-2" />
          )}
        </Tabs>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Test Case ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Issues</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTestCaseIds.map(id => {
                const previewData = previews[id];
                const hasIssues = previewData?.preview?.validationMessages && 
                                  previewData.preview.validationMessages.length > 0;
                
                return (
                  <TableRow key={id}>
                    <TableCell>{id}</TableCell>
                    <TableCell>
                      {previewData?.loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          Loading...
                        </Box>
                      ) : previewData?.error ? (
                        <Chip
                          label="Error"
                          color="error"
                          size="small"
                          icon={<ErrorOutlineIcon />}
                        />
                      ) : previewData?.preview ? (
                        <Chip
                          label="Preview Ready"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Not Loaded"
                          color="default"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {hasIssues ? (
                        <Chip
                          label={`${previewData.preview.validationMessages.length} issues`}
                          color="warning"
                          size="small"
                        />
                      ) : previewData?.preview ? (
                        <Chip
                          label="No issues"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Preview">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTestCase(id)}
                            disabled={!previewData?.preview}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Reload Preview">
                          <IconButton
                            size="small"
                            onClick={() => fetchPreview(id)}
                            disabled={previewData?.loading}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {startIndex + 1} to {endIndex} of {testCaseIds.length} test cases
          </Typography>
        </Box>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Validation Issues
        </Typography>
        
        {Object.values(previews).filter(data => 
          data.preview?.validationMessages && 
          data.preview.validationMessages.length > 0
        ).length === 0 ? (
          <Alert severity="info">
            No validation issues found
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test Case ID</TableCell>
                  <TableCell>Issues</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(previews)
                  .filter(data => 
                    data.preview?.validationMessages && 
                    data.preview.validationMessages.length > 0
                  )
                  .map(data => (
                    <TableRow key={data.testCaseId}>
                      <TableCell>{data.testCaseId}</TableCell>
                      <TableCell>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {data.preview?.validationMessages?.map((message, index) => (
                            <li key={index}>{message}</li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Preview">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTestCase(data.testCaseId)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        {selectedTestCaseId && (
          previews[selectedTestCaseId]?.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : previews[selectedTestCaseId]?.error ? (
            <Alert severity="error">
              {previews[selectedTestCaseId].error}
            </Alert>
          ) : previews[selectedTestCaseId]?.preview ? (
            <TestCasePreviewComponent
              testCaseId={selectedTestCaseId}
              sourceProviderId={sourceProviderId}
              targetProviderId={targetProviderId}
              fieldMappings={fieldMappings}
              onEditMapping={onEditMapping}
              onClose={handleCloseIndividualPreview}
            />
          ) : (
            <Alert severity="warning">
              No preview data available for this test case
            </Alert>
          )
        )}
      </TabPanel>
      
      {onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      )}
    </Paper>
  );
};