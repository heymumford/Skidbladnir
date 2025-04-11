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
  Box, Typography, Paper, Divider, Grid, Alert,
  CircularProgress, Button, Collapse, Chip, Card, CardContent,
  IconButton, Tooltip, Tab, Tabs, Badge
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BugReportIcon from '@mui/icons-material/BugReport';
import SearchIcon from '@mui/icons-material/Search';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import { 
  ErrorDetails, RemediationSuggestion,
  migrationService
} from '../../services/MigrationService';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { RemediationSuggestionCard } from './RemediationSuggestionCard';
import { useErrorAnalysis } from '../../hooks';

interface AiRemediationPanelProps {
  error: ErrorDetails;
  allErrors?: ErrorDetails[];
  onRemediate?: (errorId: string, remediationId: string) => Promise<void>;
  onSelectRelatedError?: (errorId: string) => void;
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
      id={`remediation-tabpanel-${index}`}
      aria-labelledby={`remediation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

export const AiRemediationPanel: React.FC<AiRemediationPanelProps> = ({ 
  error, 
  allErrors = [],
  onRemediate,
  onSelectRelatedError
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [remediationStatus, setRemediationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [activeRemediationId, setActiveRemediationId] = useState<string | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [relatedErrorsExpanded, setRelatedErrorsExpanded] = useState(true);
  
  // Get additional errors related to the current error
  const combinedErrors = [error, ...allErrors.filter(e => e.errorId !== error.errorId)];
  
  // Use our error analysis hook to get insights and AI suggestions
  const {
    loading: analysisLoading,
    errorAnalysis,
    aiSuggestions,
    getSuggestedRemediations,
    getBestRemediation,
    getRelatedErrors
  } = useErrorAnalysis(combinedErrors, suggestions);
  
  // Fetch remediation suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const result = await migrationService.getRemediationSuggestions(error);
        setSuggestions(result);
      } catch (err) {
        console.error('Error fetching remediation suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [error]);
  
  // Get related errors for this error
  const relatedErrors = getRelatedErrors(error);
  
  // Get all remediation suggestions including AI-generated ones
  const allSuggestions = [...suggestions, ...aiSuggestions.filter(s => s.errorType === error.errorType)];
  
  // Get the best remediation for this error
  const bestRemediation = getBestRemediation(error);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle remediation action
  const handleRemediationAction = async (suggestion: RemediationSuggestion) => {
    if (!suggestion.automated || !onRemediate) return;
    
    try {
      setActiveRemediationId(suggestion.id);
      setRemediationStatus('loading');
      await onRemediate(error.errorId, suggestion.id);
      setRemediationStatus('success');
      
      // Simulated delay to show success state
      setTimeout(() => {
        setRemediationStatus('idle');
      }, 1500);
    } catch (err) {
      console.error('Error applying remediation:', err);
      setRemediationStatus('error');
    }
  };
  
  // Handle related error selection
  const handleRelatedErrorClick = (relatedError: ErrorDetails) => {
    if (onSelectRelatedError) {
      onSelectRelatedError(relatedError.errorId);
    }
  };
  
  // Toggle sections
  const toggleAnalysisExpanded = () => {
    setAnalysisExpanded(!analysisExpanded);
  };
  
  const toggleRelatedErrorsExpanded = () => {
    setRelatedErrorsExpanded(!relatedErrorsExpanded);
  };
  
  return (
    <Paper sx={{ p: 0 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="remediation tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<TipsAndUpdatesIcon />} 
            iconPosition="start" 
            label={
              <Badge 
                badgeContent={allSuggestions.length} 
                color="primary"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    right: -15, 
                    top: 4
                  } 
                }}
              >
                <span>Remediation</span>
              </Badge>
            }
            id="remediation-tab-0" 
          />
          <Tab 
            icon={<SmartToyIcon />} 
            iconPosition="start" 
            label="AI Analysis" 
            id="remediation-tab-1" 
          />
          <Tab 
            icon={<ConnectWithoutContactIcon />} 
            iconPosition="start" 
            label={
              <Badge 
                badgeContent={relatedErrors.length} 
                color="primary"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    right: -15, 
                    top: 4
                  } 
                }}
              >
                <span>Related Errors</span>
              </Badge>
            }
            id="remediation-tab-2" 
          />
        </Tabs>
      </Box>
      
      {/* Remediation Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <ErrorDetailPanel error={error} expanded={true} />
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
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
                />
              </Box>
            )}
            
            <Typography variant="subtitle1" gutterBottom>
              {allSuggestions.length > 0 ? 
                `All Available Solutions (${allSuggestions.length})` : 
                'No Remediation Suggestions Available'
              }
            </Typography>
            
            {allSuggestions.length === 0 ? (
              <Alert severity="info">
                No specific remediation suggestions available for this error.
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                {allSuggestions.map(suggestion => (
                  <RemediationSuggestionCard 
                    key={suggestion.id} 
                    suggestion={suggestion}
                    onActionClick={handleRemediationAction}
                  />
                ))}
              </Box>
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
          </>
        )}
      </TabPanel>
      
      {/* AI Analysis Tab */}
      <TabPanel value={tabValue} index={1}>
        {analysisLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : !errorAnalysis ? (
          <Alert severity="info">
            Not enough error data available for meaningful analysis.
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Alert 
                icon={<SmartToyIcon fontSize="inherit" />} 
                severity="info"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">
                  AI-Powered Error Analysis
                </Typography>
                <Typography variant="body2">
                  Our AI has analyzed this error and related patterns to provide deeper insights and more effective remediation strategies.
                </Typography>
              </Alert>
            </Box>
            
            {/* Error Context Analysis */}
            <Box sx={{ mb: 3 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1,
                  cursor: 'pointer'
                }}
                onClick={toggleAnalysisExpanded}
              >
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                  <SearchIcon sx={{ mr: 1 }} />
                  Error Context Analysis
                </Typography>
                <IconButton size="small">
                  {analysisExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              <Collapse in={analysisExpanded}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Error Pattern
                      </Typography>
                      <Typography variant="body2">
                        This {error.errorType} error occurred in the <strong>{error.component}</strong> component 
                        during the <strong>{error.operation}</strong> operation.
                      </Typography>
                      
                      {errorAnalysis.patterns.some(p => p.affectedOperations.includes(error.operation)) && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Pattern Detected:</strong> This operation has experienced {error.errorType} errors 
                            {errorAnalysis.patterns.find(p => p.affectedOperations.includes(error.operation))?.frequency || 0} times.
                          </Typography>
                        </Alert>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Contributing Factors
                      </Typography>
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <InfoIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          Most affected component: <strong>{errorAnalysis.mostAffectedComponents[0]?.component}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <InfoIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          Most common error type: <strong>{errorAnalysis.mostCommonTypes[0]?.type}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                          <InfoIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          Average resolution time: <strong>{errorAnalysis.averageResolutionTime} minutes</strong>
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Root Cause Analysis
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(errorAnalysis.totalRootCauses)
                          .filter(([_, count]) => count > 0)
                          .map(([cause, count]) => (
                            <Chip 
                              key={cause}
                              label={`${cause}: ${count}`}
                              variant="outlined"
                              size="small"
                            />
                          ))
                        }
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Collapse>
            </Box>
            
            {/* AI-Generated Suggestions */}
            {aiSuggestions.filter(s => s.errorType === error.errorType).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <LightbulbIcon sx={{ mr: 1 }} color="warning" />
                  AI-Generated Solutions
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {aiSuggestions
                    .filter(s => s.errorType === error.errorType)
                    .map(suggestion => (
                      <RemediationSuggestionCard 
                        key={suggestion.id} 
                        suggestion={suggestion}
                        onActionClick={handleRemediationAction}
                      />
                    ))
                  }
                </Box>
              </Box>
            )}
            
            {/* Resolution Effectiveness */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Resolution Effectiveness
              </Typography>
              
              <Grid container spacing={2}>
                {suggestions.map(suggestion => (
                  <Grid item xs={12} sm={6} key={suggestion.id}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {suggestion.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          Success rate:
                        </Typography>
                        <Chip 
                          size="small"
                          label={`${errorAnalysis.resolutionEffectiveness[suggestion.id] || 0}%`}
                          color={
                            (errorAnalysis.resolutionEffectiveness[suggestion.id] || 0) > 80 ? 'success' :
                            (errorAnalysis.resolutionEffectiveness[suggestion.id] || 0) > 60 ? 'primary' :
                            'warning'
                          }
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}
      </TabPanel>
      
      {/* Related Errors Tab */}
      <TabPanel value={tabValue} index={2}>
        {relatedErrors.length === 0 ? (
          <Alert severity="info">
            No related errors found.
          </Alert>
        ) : (
          <>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                cursor: 'pointer'
              }}
              onClick={toggleRelatedErrorsExpanded}
            >
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                <BugReportIcon sx={{ mr: 1 }} />
                Related Errors ({relatedErrors.length})
              </Typography>
              <IconButton size="small">
                {relatedErrorsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={relatedErrorsExpanded}>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {relatedErrors.map(relatedError => (
                  <Card 
                    key={relatedError.errorId} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2, 
                      cursor: 'pointer',
                      borderLeft: '4px solid',
                      borderLeftColor: 
                        relatedError.errorType === 'auth' ? '#ffa726' :
                        relatedError.errorType === 'validation' ? '#7cb342' :
                        relatedError.errorType === 'network' ? '#42a5f5' :
                        relatedError.errorType === 'resource' ? '#9c27b0' :
                        relatedError.errorType === 'system' ? '#d32f2f' :
                        '#757575',
                      '&:hover': {
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleRelatedErrorClick(relatedError)}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2">
                            {relatedError.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {relatedError.component} • {relatedError.operation} • {new Date(relatedError.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        <Chip 
                          size="small" 
                          label={relatedError.errorType}
                          color={
                            relatedError.errorType === 'auth' ? 'warning' :
                            relatedError.errorType === 'validation' ? 'success' :
                            relatedError.errorType === 'network' ? 'info' :
                            relatedError.errorType === 'resource' ? 'secondary' :
                            relatedError.errorType === 'system' ? 'error' :
                            'default'
                          }
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Collapse>
            
            {relatedErrors.length > 5 && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Pattern Detected:</strong> There are {relatedErrors.length} related errors. 
                  Consider applying a bulk remediation strategy.
                </Typography>
              </Alert>
            )}
            
            {/* Bulk Remediation Button */}
            {relatedErrors.length > 1 && errorAnalysis && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<TipsAndUpdatesIcon />}
                >
                  Apply Bulk Remediation to {relatedErrors.length} Errors
                </Button>
              </Box>
            )}
          </>
        )}
      </TabPanel>
    </Paper>
  );
};