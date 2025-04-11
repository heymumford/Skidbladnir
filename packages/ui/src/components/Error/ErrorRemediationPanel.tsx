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
  Box, Typography, Paper, Divider, Grid, Alert, Switch, FormControlLabel,
  CircularProgress, Button, Collapse, Badge, Tooltip, Tab, Tabs, Dialog,
  Chip, IconButton, useTheme
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import { ErrorDetails, RemediationSuggestion, migrationService } from '../../services/MigrationService';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { RemediationSuggestionCard } from './RemediationSuggestionCard';
import { AiRemediationPanel } from './AiRemediationPanel';
import { useErrorAnalysis } from '../../hooks';

interface ErrorRemediationPanelProps {
  migrationId: string;
  errorId?: string;
  onRemediate?: (errorId: string, remediationId: string) => Promise<void>;
  onClose?: () => void;
  enhancedMode?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`error-tabpanel-${index}`}
      aria-labelledby={`error-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

export const ErrorRemediationPanel: React.FC<ErrorRemediationPanelProps> = ({
  migrationId,
  errorId,
  onRemediate,
  onClose,
  enhancedMode: initialEnhancedMode = false
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [allErrors, setAllErrors] = useState<ErrorDetails[]>([]);
  const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
  const [remediationStatus, setRemediationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [tabValue, setTabValue] = useState(0);
  const [activeRemediationId, setActiveRemediationId] = useState<string | null>(null);
  const [enhancedMode, setEnhancedMode] = useState(initialEnhancedMode);
  const [showSimilarErrorsDialog, setShowSimilarErrorsDialog] = useState(false);
  const [selectedSimilarError, setSelectedSimilarError] = useState<ErrorDetails | null>(null);

  // Fetch error details when component mounts
  useEffect(() => {
    const fetchErrorDetails = async () => {
      if (!errorId) return;
      
      try {
        setLoading(true);
        const errors = await migrationService.getErrorDetails(migrationId);
        setAllErrors(errors);
        
        const foundError = errors.find(e => e.errorId === errorId);
        
        if (foundError) {
          setError(foundError);
          fetchRemediationSuggestions(foundError);
        }
      } catch (err) {
        console.error('Error fetching error details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchErrorDetails();
  }, [migrationId, errorId]);

  // Fetch remediation suggestions for the error
  const fetchRemediationSuggestions = async (errorDetails: ErrorDetails) => {
    try {
      setLoadingSuggestions(true);
      const result = await migrationService.getRemediationSuggestions(errorDetails);
      setSuggestions(result);
    } catch (err) {
      console.error('Error fetching remediation suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Initialize error analysis hook
  const {
    loading: analysisLoading,
    errorAnalysis,
    aiSuggestions,
    getSuggestedRemediations,
    getBestRemediation,
    getRelatedErrors
  } = useErrorAnalysis(allErrors, suggestions);

  // Get related errors
  const relatedErrors = error ? getRelatedErrors(error) : [];

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle remediation action
  const handleRemediationAction = async (suggestion: RemediationSuggestion) => {
    if (!suggestion.automated || !onRemediate || !error) return;
    
    try {
      setActiveRemediationId(suggestion.id);
      setRemediationStatus('loading');
      await onRemediate(error.errorId, suggestion.id);
      setRemediationStatus('success');
      
      // Simulated delay to show success state
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      console.error('Error applying remediation:', err);
      setRemediationStatus('error');
    }
  };

  // Handle manual close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Toggle enhanced mode
  const toggleEnhancedMode = () => {
    setEnhancedMode(!enhancedMode);
  };

  // Handle related error selection
  const handleRelatedErrorClick = (selectedError: ErrorDetails) => {
    setSelectedSimilarError(selectedError);
    setShowSimilarErrorsDialog(true);
  };

  // Filter suggested remediations based on error type
  const suggestedRemediations = error ? 
    [...suggestions, ...aiSuggestions.filter(s => s.errorType === error.errorType)] : 
    [];

  // Get best remediation for this error
  const bestRemediation = error ? getBestRemediation(error) : null;

  if (loading) {
    return (
      <Paper sx={{ p: 3, minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!error) {
    return (
      <Paper sx={{ p: 3, minHeight: 200 }}>
        <Alert severity="warning">Error details not found.</Alert>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button onClick={handleClose}>Close</Button>
        </Box>
      </Paper>
    );
  }

  // If enhanced mode is enabled, render the AI remediation panel
  if (enhancedMode) {
    return (
      <>
        <Paper sx={{ p: 0, minHeight: 400 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: 1, 
            borderColor: 'divider',
            px: 2, 
            py: 1 
          }}>
            <Typography variant="h6" component="div" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.primary.main
            }}>
              <SmartToyIcon sx={{ mr: 1 }} />
              AI-Enhanced Error Remediation
            </Typography>
            <Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={enhancedMode} 
                    onChange={toggleEnhancedMode} 
                    color="primary"
                  />
                }
                label="AI Mode"
              />
              <IconButton onClick={handleClose} aria-label="close">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          
          <AiRemediationPanel 
            error={error}
            allErrors={allErrors}
            onRemediate={onRemediate}
            onSelectRelatedError={handleRelatedErrorClick}
          />
        </Paper>
        
        {/* Similar Error Details Dialog */}
        <Dialog 
          open={showSimilarErrorsDialog} 
          onClose={() => setShowSimilarErrorsDialog(false)}
          fullWidth
          maxWidth="md"
        >
          <Box sx={{ p: 0 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: 1, 
              borderColor: 'divider',
              px: 2, 
              py: 1 
            }}>
              <Typography variant="h6" component="div">
                Related Error Details
              </Typography>
              <IconButton onClick={() => setShowSimilarErrorsDialog(false)} aria-label="close">
                <CloseIcon />
              </IconButton>
            </Box>
            
            {selectedSimilarError && (
              <Box sx={{ p: 2 }}>
                <ErrorDetailPanel error={selectedSimilarError} expanded={true} />
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Remediation Suggestions
                  </Typography>
                  
                  {aiSuggestions
                    .filter(s => s.errorType === selectedSimilarError.errorType)
                    .map(suggestion => (
                      <RemediationSuggestionCard 
                        key={suggestion.id} 
                        suggestion={suggestion}
                        onActionClick={(sug) => {
                          handleRemediationAction(sug);
                          setShowSimilarErrorsDialog(false);
                        }}
                      />
                    ))
                  }
                </Box>
              </Box>
            )}
          </Box>
        </Dialog>
      </>
    );
  }

  // Standard remediation panel
  return (
    <Paper sx={{ p: 0, minHeight: 400 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1, 
        borderColor: 'divider',
        px: 2, 
        py: 1 
      }}>
        <Typography variant="h6" component="div">
          Error Remediation
        </Typography>
        <Box>
          <Tooltip title="Enable AI-enhanced remediation suggestions">
            <FormControlLabel
              control={
                <Switch 
                  checked={enhancedMode} 
                  onChange={toggleEnhancedMode} 
                  color="primary"
                />
              }
              label="AI Mode"
            />
          </Tooltip>
          <IconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="error remediation tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<ErrorOutlineIcon />} 
            iconPosition="start" 
            label="Error Details" 
            id="error-tab-0" 
          />
          <Tab 
            icon={<TipsAndUpdatesIcon />} 
            iconPosition="start" 
            label={
              <Badge 
                badgeContent={suggestions.length} 
                color="primary"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    right: -15, 
                    top: 4
                  } 
                }}
              >
                <span>Remediation Options</span>
              </Badge>
            } 
            id="error-tab-1" 
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ErrorDetailPanel error={error} expanded={true} />
        
        {/* Show related errors count if available */}
        {relatedErrors.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Alert 
              severity="info"
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="body2">
                  <strong>{relatedErrors.length} related errors</strong> found with similar patterns. 
                  Enable AI mode for advanced analysis.
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={toggleEnhancedMode}
                startIcon={<SmartToyIcon />}
              >
                Enable AI Mode
              </Button>
            </Alert>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {loadingSuggestions ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : suggestions.length === 0 ? (
          <Alert 
            severity="info" 
            icon={<LightbulbIcon />}
            sx={{ mb: 2 }}
          >
            No specific remediation suggestions available for this error.
            Try enabling AI mode for advanced analysis and suggestions.
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SmartToyIcon />}
                onClick={toggleEnhancedMode}
              >
                Enable AI Mode
              </Button>
            </Box>
          </Alert>
        ) : (
          <>
            {/* Best Suggestion (if available) */}
            {bestRemediation && (
              <Box sx={{ mb: 3 }}>
                <Alert 
                  icon={<CheckCircleIcon fontSize="inherit" />} 
                  severity="success"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1">
                    Recommended Solution
                  </Typography>
                  <Typography variant="body2">
                    Based on our analysis, this is the most effective solution for this error.
                  </Typography>
                </Alert>
                
                <RemediationSuggestionCard 
                  suggestion={bestRemediation}
                  onActionClick={handleRemediationAction}
                  highlight
                />
              </Box>
            )}
          
            <Typography variant="subtitle1" gutterBottom>
              Available Remediation Options
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              {suggestions.map(suggestion => (
                <RemediationSuggestionCard 
                  key={suggestion.id} 
                  suggestion={suggestion}
                  onActionClick={handleRemediationAction}
                />
              ))}
            </Box>
            
            {/* AI Enhancement Prompt */}
            <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.background.default, borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">
                  Want more intelligent remediation options?
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                Enable AI mode to get advanced pattern analysis, related error detection, 
                and intelligent remediation suggestions.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={toggleEnhancedMode}
                >
                  Enable AI-Enhanced Remediation
                </Button>
              </Box>
            </Box>
          </>
        )}
        
        {remediationStatus === 'success' && (
          <Alert 
            icon={<CheckCircleIcon fontSize="inherit" />} 
            severity="success"
            sx={{ mt: 2 }}
          >
            Remediation applied successfully! The system will attempt to continue the migration.
          </Alert>
        )}
        
        {remediationStatus === 'error' && (
          <Alert 
            icon={<WarningIcon fontSize="inherit" />} 
            severity="error"
            sx={{ mt: 2 }}
          >
            Failed to apply remediation. Please try again or select a different option.
          </Alert>
        )}
      </TabPanel>
    </Paper>
  );
};