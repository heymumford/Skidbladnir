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
  Box, Typography, Paper, CircularProgress, Grid, IconButton,
  Card, CardContent, CardHeader, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Divider, Chip, Accordion,
  AccordionSummary, AccordionDetails, Tabs, Tab, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ComputerIcon from '@mui/icons-material/Computer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { TestExecution, ExecutionStatus, testExecutionService } from '../../services';
import { AttachmentPreview } from './AttachmentPreview';

/**
 * Props for the TestExecutionPreview component
 */
export interface TestExecutionPreviewProps {
  /**
   * The ID of the test execution to preview
   */
  executionId: string;
  
  /**
   * Optional callback for when the user navigates to a different execution
   */
  onNavigate?: (executionId: string) => void;
}

/**
 * Component for previewing test execution details and attachments
 */
export const TestExecutionPreview: React.FC<TestExecutionPreviewProps> = ({
  executionId,
  onNavigate
}) => {
  const [execution, setExecution] = useState<TestExecution | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<TestExecution[]>([]);
  const [tabValue, setTabValue] = useState<string>('details');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState<boolean>(false);

  // Load execution data on component mount or executionId change
  useEffect(() => {
    loadTestExecution();
  }, [executionId]);

  // Load the test execution from the API
  const loadTestExecution = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the test execution
      const data = await testExecutionService.getTestExecution(executionId);
      setExecution(data);
      
      // Get recent executions of the same test case
      if (data.testCaseId) {
        const executions = await testExecutionService.getExecutionsForTestCase(data.testCaseId, 5);
        setRecentExecutions(executions);
      }
    } catch (err: any) {
      setError(`Error loading test execution: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  // Open attachment preview dialog
  const handleAttachmentClick = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
    setAttachmentDialogOpen(true);
  };

  // Close attachment preview dialog
  const handleCloseAttachmentDialog = () => {
    setAttachmentDialogOpen(false);
  };

  // Navigate to a different execution
  const handleNavigate = (navigateExecutionId: string) => {
    if (onNavigate) {
      onNavigate(navigateExecutionId);
    }
  };

  // Get status icon and color for a given status
  const getStatusInfo = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.PASSED:
        return { 
          icon: <CheckCircleIcon />, 
          color: 'success.main',
          label: 'Passed' 
        };
      case ExecutionStatus.FAILED:
        return { 
          icon: <CancelIcon />, 
          color: 'error.main',
          label: 'Failed' 
        };
      case ExecutionStatus.BLOCKED:
        return { 
          icon: <BlockIcon />, 
          color: 'warning.main',
          label: 'Blocked' 
        };
      case ExecutionStatus.NOT_EXECUTED:
        return { 
          icon: <HourglassEmptyIcon />, 
          color: 'text.secondary',
          label: 'Not Executed' 
        };
      case ExecutionStatus.IN_PROGRESS:
        return { 
          icon: <CircularProgress size={16} />, 
          color: 'info.main',
          label: 'In Progress' 
        };
      default:
        return { 
          icon: <InfoOutlinedIcon />, 
          color: 'text.secondary',
          label: status 
        };
    }
  };

  // Format duration in seconds to a readable string
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate pass rate as percentage
  const calculatePassRate = (): number => {
    if (!execution || !execution.stepResults || execution.stepResults.length === 0) {
      return 0;
    }
    
    const passedSteps = execution.stepResults.filter(
      step => step.status === ExecutionStatus.PASSED
    ).length;
    
    return Math.round((passedSteps / execution.stepResults.length) * 100);
  };

  // Get the selected attachment
  const getSelectedAttachment = () => {
    if (!execution || !selectedAttachmentId) return null;
    
    return execution.attachments?.find(att => att.id === selectedAttachmentId) || null;
  };

  // Render execution summary information
  const renderExecutionSummary = () => {
    if (!execution) return null;
    
    const statusInfo = getStatusInfo(execution.status);
    const executionDate = new Date(execution.executionDate);
    const passRate = calculatePassRate();
    
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          title="Execution Summary"
          subheader={executionDate.toLocaleString()}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            {/* Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ color: statusInfo.color, mr: 1 }}>
                  {statusInfo.icon}
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Status
                </Typography>
              </Box>
              <Typography variant="body1">
                {statusInfo.label}
              </Typography>
            </Grid>
            
            {/* Duration */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Duration
                </Typography>
              </Box>
              <Typography variant="body1">
                {formatDuration(execution.duration)}
              </Typography>
            </Grid>
            
            {/* Executed By */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Executed By
                </Typography>
              </Box>
              <Typography variant="body1">
                {execution.executedBy}
              </Typography>
            </Grid>
            
            {/* Environment */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ComputerIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Environment
                </Typography>
              </Box>
              <Typography variant="body1">
                {execution.environment}
              </Typography>
            </Grid>
            
            {/* Build Version */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BuildIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Build Version
                </Typography>
              </Box>
              <Typography variant="body1">
                {execution.buildVersion}
              </Typography>
            </Grid>
            
            {/* Pass Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Pass Rate
                </Typography>
              </Box>
              <Typography variant="body1">
                {passRate}%
              </Typography>
            </Grid>
            
            {/* Attachments Count */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachFileIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Attachments
                </Typography>
              </Box>
              <Typography variant="body1">
                {execution.attachments?.length || 0}
              </Typography>
            </Grid>
          </Grid>
          
          {/* Notes (if any) */}
          {execution.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Notes
              </Typography>
              <Typography variant="body1">
                {execution.notes}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render step results table
  const renderStepResults = () => {
    if (!execution || !execution.stepResults || execution.stepResults.length === 0) {
      return (
        <Alert severity="info">
          No step results available for this execution.
        </Alert>
      );
    }
    
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell width={80}>Step</TableCell>
              <TableCell width={120}>Status</TableCell>
              <TableCell>Actual Result</TableCell>
              <TableCell width={100}>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {execution.stepResults.map((step) => {
              const statusInfo = getStatusInfo(step.status);
              
              return (
                <TableRow key={step.stepOrder}>
                  <TableCell>{step.stepOrder}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Box sx={{ color: statusInfo.color }}>{statusInfo.icon}</Box>}
                      label={statusInfo.label}
                      size="small"
                      sx={{ 
                        bgcolor: `${statusInfo.color}10`,
                        borderColor: statusInfo.color,
                        '& .MuiChip-label': {
                          px: 1
                        }
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{step.actualResult}</TableCell>
                  <TableCell>
                    {step.notes ? (
                      <Accordion sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`step-${step.stepOrder}-notes-content`}
                          id={`step-${step.stepOrder}-notes-header`}
                          sx={{ minHeight: 36, p: 0 }}
                        >
                          <Typography variant="body2">Notes</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0 }}>
                          <Typography variant="body2">{step.notes}</Typography>
                        </AccordionDetails>
                      </Accordion>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render attachments gallery
  const renderAttachments = () => {
    if (!execution || !execution.attachments || execution.attachments.length === 0) {
      return (
        <Alert severity="info">
          No attachments available for this execution.
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={2}>
        {execution.attachments.map((attachment) => (
          <Grid item xs={12} sm={6} md={4} key={attachment.id}>
            <Card
              variant="outlined"
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 1
                }
              }}
              onClick={() => handleAttachmentClick(attachment.id)}
            >
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2
                }}>
                  {/* File type icon */}
                  <Box sx={{ 
                    fontSize: 40, 
                    color: 'primary.main',
                    mb: 1
                  }}>
                    {attachment.fileType.includes('image') ? (
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        style={{ 
                          width: 100, 
                          height: 100, 
                          objectFit: 'cover',
                          objectPosition: 'center',
                          borderRadius: 4
                        }}
                      />
                    ) : (
                      <AttachFileIcon fontSize="inherit" />
                    )}
                  </Box>
                  
                  {/* File name */}
                  <Typography 
                    variant="body2" 
                    align="center"
                    sx={{
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {attachment.name}
                  </Typography>
                  
                  {/* File size */}
                  <Chip
                    label={attachment.fileType.split('/')[1]?.toUpperCase() || attachment.fileType}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Render recent executions comparison
  const renderRecentExecutions = () => {
    if (!recentExecutions || recentExecutions.length === 0) {
      return (
        <Alert severity="info">
          No recent executions available for this test case.
        </Alert>
      );
    }
    
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Execution ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Executed By</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentExecutions.map((exec) => {
              const statusInfo = getStatusInfo(exec.status);
              const isCurrent = exec.id === executionId;
              
              return (
                <TableRow 
                  key={exec.id}
                  sx={{
                    bgcolor: isCurrent ? 'action.selected' : 'inherit'
                  }}
                >
                  <TableCell>{exec.id}</TableCell>
                  <TableCell>{new Date(exec.executionDate).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Box sx={{ color: statusInfo.color }}>{statusInfo.icon}</Box>}
                      label={statusInfo.label}
                      size="small"
                      sx={{ bgcolor: `${statusInfo.color}10` }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDuration(exec.duration)}</TableCell>
                  <TableCell>{exec.executedBy}</TableCell>
                  <TableCell>{exec.environment}</TableCell>
                  <TableCell>
                    {!isCurrent && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleNavigate(exec.id)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render navigation buttons for cycling through executions
  const renderNavigation = () => {
    if (!execution || !recentExecutions || recentExecutions.length <= 1) {
      return null;
    }
    
    const currentIndex = recentExecutions.findIndex(exec => exec.id === executionId);
    const hasPrevious = currentIndex < recentExecutions.length - 1;
    const hasNext = currentIndex > 0;
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          disabled={!hasPrevious}
          onClick={() => handleNavigate(recentExecutions[currentIndex + 1].id)}
          variant="outlined"
        >
          Previous Execution
        </Button>
        
        <Button
          endIcon={<ArrowForwardIcon />}
          disabled={!hasNext}
          onClick={() => handleNavigate(recentExecutions[currentIndex - 1].id)}
          variant="outlined"
        >
          Next Execution
        </Button>
      </Box>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Render empty state
  if (!execution) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No execution data available for ID: {executionId}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header with title and execution ID */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Test Execution Details
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Execution ID: {executionId} | Test Case ID: {execution.testCaseId}
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>
      
      {/* Navigation between executions */}
      {renderNavigation()}
      
      {/* Execution summary */}
      {renderExecutionSummary()}
      
      {/* Tabs for different sections */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="execution details tabs"
        >
          <Tab label="Step Results" value="details" />
          <Tab 
            label={`Attachments (${execution.attachments?.length || 0})`} 
            value="attachments" 
          />
          <Tab label="Recent Executions" value="history" />
        </Tabs>
      </Box>
      
      {/* Tab content */}
      <Box sx={{ mb: 3 }}>
        {tabValue === 'details' && renderStepResults()}
        {tabValue === 'attachments' && renderAttachments()}
        {tabValue === 'history' && renderRecentExecutions()}
      </Box>
      
      {/* Attachment preview dialog */}
      <Dialog
        open={attachmentDialogOpen}
        onClose={handleCloseAttachmentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {getSelectedAttachment() && (
            <AttachmentPreview
              attachment={getSelectedAttachment()!}
              executionId={executionId}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};