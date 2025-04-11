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
  Box, Typography, Paper, Divider, Card, CardContent, Alert,
  LinearProgress, Chip, Collapse, IconButton, Tooltip, Button, Grid
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { ErrorDetails, migrationService } from '../../services/MigrationService';
import { ErrorCategoryFilter, ErrorCategory } from './ErrorCategoryFilter';
import { useFeature } from '../../context/FeatureFlagContext';
import { Feature } from '../../../../packages/common/src/utils/feature-flags';

interface ErrorSummaryPanelProps {
  migrationId: string;
  maxErrors?: number;
  autoExpand?: boolean;
  onErrorSelect: (errorId: string) => void;
}

export const ErrorSummaryPanel: React.FC<ErrorSummaryPanelProps> = ({
  migrationId,
  maxErrors = 5,
  autoExpand = false,
  onErrorSelect
}) => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [expanded, setExpanded] = useState(autoExpand);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Use feature flags to conditionally enable features
  const isErrorRemediationEnabled = useFeature(Feature.ERROR_REMEDIATION);
  const isAiAssistanceEnabled = useFeature(Feature.AI_ASSISTANCE);

  // Fetch errors when component mounts
  useEffect(() => {
    const fetchErrors = async () => {
      try {
        setLoading(true);
        const fetchedErrors = await migrationService.getErrorDetails(migrationId);
        setErrors(fetchedErrors);
      } catch (err) {
        console.error('Error fetching error details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, [migrationId]);

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle error selection
  const handleErrorClick = (errorId: string) => {
    onErrorSelect(errorId);
  };

  // Handle category filter change
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter errors by category
  const filteredErrors = selectedCategory
    ? errors.filter(error => error.errorType === selectedCategory)
    : errors;

  // Get display errors (limited by maxErrors)
  const displayErrors = filteredErrors.slice(0, maxErrors);

  // Prepare category data for filter
  const categoryData: ErrorCategory[] = [
    { id: 'auth', label: 'Authentication', color: '#ffa726', count: 0 },
    { id: 'validation', label: 'Validation', color: '#7cb342', count: 0 },
    { id: 'network', label: 'Network', color: '#42a5f5', count: 0 },
    { id: 'resource', label: 'Resource', color: '#9c27b0', count: 0 },
    { id: 'system', label: 'System', color: '#d32f2f', count: 0 },
    { id: 'unknown', label: 'Unknown', color: '#757575', count: 0 },
  ];

  // Count errors by category
  errors.forEach(error => {
    const category = categoryData.find(c => c.id === error.errorType);
    if (category) {
      category.count++;
    }
  });

  // Filter out categories with no errors
  const activeCategories = categoryData.filter(c => c.count > 0);

  // Get error type color
  const getErrorTypeColor = (errorType: string): string => {
    switch (errorType) {
      case 'auth': return '#ffa726'; // orange
      case 'validation': return '#7cb342'; // light green
      case 'network': return '#42a5f5'; // blue
      case 'resource': return '#9c27b0'; // purple
      case 'system': return '#d32f2f'; // red
      default: return '#757575'; // grey
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center">
          <ErrorOutlineIcon color="error" sx={{ mr: 1 }} />
          <Typography variant="h6">
            Error Summary
          </Typography>
          
          {/* Show AI badge when AI assistance is enabled */}
          {isAiAssistanceEnabled && (
            <Chip 
              icon={<SmartToyIcon />} 
              label="AI-Powered" 
              size="small" 
              color="secondary"
              sx={{ ml: 1 }}
            />
          )}
          
          <Tooltip title="Errors that occurred during migration with remediation suggestions">
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {errors.length} {errors.length === 1 ? 'error' : 'errors'}
          </Typography>
          
          {/* Link to feature flags admin */}
          <Tooltip title="Feature Flag Settings">
            <IconButton 
              size="small" 
              component="a" 
              href="/admin/features"
              sx={{ mr: 1 }}
            >
              <AutoFixHighIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <IconButton size="small" onClick={toggleExpanded}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {/* Show feature flag notification when error remediation is disabled */}
      {!isErrorRemediationEnabled && (
        <Alert 
          severity="info" 
          sx={{ mt: 2, mb: 1 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              component="a" 
              href="/admin/features"
            >
              Enable
            </Button>
          }
        >
          Error Remediation feature is disabled. Enable it to access remediation tools.
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      ) : errors.length === 0 ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          No errors detected in this migration.
        </Alert>
      ) : (
        <Collapse in={expanded}>
          <Box mt={2}>
            {activeCategories.length > 0 && (
              <ErrorCategoryFilter
                categories={activeCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
              />
            )}
            
            <Grid container spacing={2}>
              {displayErrors.map(error => (
                <Grid item xs={12} key={error.errorId}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderLeft: `4px solid ${getErrorTypeColor(error.errorType)}`,
                      '&:hover': { boxShadow: 1 },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleErrorClick(error.errorId)}
                  >
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{error.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {error.component} • {error.operation} • {formatTime(error.timestamp)}
                          </Typography>
                        </Box>
                        
                        {/* Conditionally render fix button based on feature flag */}
                        {isErrorRemediationEnabled ? (
                          <Tooltip title="View remediation options">
                            <Chip 
                              icon={isAiAssistanceEnabled ? <SmartToyIcon /> : <TipsAndUpdatesIcon />}
                              label="Fix" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleErrorClick(error.errorId);
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Enable Error Remediation feature to access this functionality">
                            <Chip 
                              icon={<TipsAndUpdatesIcon />}
                              label="Fix" 
                              size="small"
                              color="default"
                              variant="outlined"
                              disabled
                              sx={{ opacity: 0.6 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {filteredErrors.length > maxErrors && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button 
                  variant="text" 
                  size="small"
                  endIcon={<ExpandMoreIcon />}
                >
                  Show {filteredErrors.length - maxErrors} more errors
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Paper>
  );
};