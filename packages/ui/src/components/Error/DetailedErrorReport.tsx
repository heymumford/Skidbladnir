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
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Button,
  Tooltip,
  Alert,
  Divider,
  Dialog,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TimelineIcon from '@mui/icons-material/Timeline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SortIcon from '@mui/icons-material/Sort';
import { ErrorDetails, RemediationSuggestion, migrationService } from '../../services/MigrationService';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { ErrorRemediationPanel } from './ErrorRemediationPanel';
import { ErrorCategoryFilter, ErrorCategory } from './ErrorCategoryFilter';
import { useErrorAnalysis } from '../../hooks';

interface DetailedErrorReportProps {
  migrationId: string;
  errors?: ErrorDetails[];
  maxHeight?: number;
  showFilter?: boolean;
  onErrorSelect?: (errorId: string) => void;
  onRemediate?: (errorId: string, remediationId: string) => Promise<void>;
  title?: string;
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
      id={`error-report-tabpanel-${index}`}
      aria-labelledby={`error-report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

const ITEMS_PER_PAGE = 5;

export const DetailedErrorReport: React.FC<DetailedErrorReportProps> = ({
  migrationId,
  errors: propErrors,
  maxHeight = 800,
  showFilter = true,
  onErrorSelect,
  onRemediate,
  title = 'Detailed Error Analysis'
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
  const [page, setPage] = useState(1);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  const [aiModeEnabled, setAiModeEnabled] = useState(false);
  
  // Initialize error analysis hook
  const {
    loading: analysisLoading,
    errorAnalysis,
    aiSuggestions,
    getSuggestedRemediations,
    getBestRemediation,
    getRelatedErrors
  } = useErrorAnalysis(errors, []);
  
  // Fetch errors on component mount or when migrationId changes
  useEffect(() => {
    const fetchErrors = async () => {
      if (propErrors) {
        setErrors(propErrors);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const fetchedErrors = await migrationService.getErrorDetails(migrationId);
        setErrors(fetchedErrors);
      } catch (error) {
        console.error('Error fetching errors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchErrors();
  }, [migrationId, propErrors]);
  
  // Prepare error categories for filtering
  const errorCategories: ErrorCategory[] = [
    { id: 'auth', label: 'Authentication', color: theme.palette.warning.main, count: 0 },
    { id: 'validation', label: 'Validation', color: theme.palette.success.main, count: 0 },
    { id: 'network', label: 'Network', color: theme.palette.info.main, count: 0 },
    { id: 'resource', label: 'Resource', color: theme.palette.secondary.main, count: 0 },
    { id: 'system', label: 'System', color: theme.palette.error.main, count: 0 },
    { id: 'unknown', label: 'Unknown', color: theme.palette.grey[500], count: 0 }
  ];
  
  // Count errors by category
  errors.forEach(error => {
    const category = errorCategories.find(c => c.id === error.errorType);
    if (category) {
      category.count++;
    }
  });
  
  // Filter and sort errors
  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchTerm === '' || 
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.operation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === null || error.errorType === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const sortedErrors = [...filteredErrors].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else {
      // Sort by severity (system > auth > network > resource > validation > unknown)
      const severityOrder: Record<string, number> = {
        system: 5,
        auth: 4,
        network: 3,
        resource: 2,
        validation: 1,
        unknown: 0
      };
      
      return (severityOrder[b.errorType] || 0) - (severityOrder[a.errorType] || 0);
    }
  });
  
  // Paginate errors
  const totalPages = Math.ceil(sortedErrors.length / ITEMS_PER_PAGE);
  const paginatedErrors = sortedErrors.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle search term change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page on search
  };
  
  // Handle category filter change
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page on filter change
  };
  
  // Handle sort change
  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as 'newest' | 'oldest' | 'severity');
  };
  
  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Handle error selection
  const handleErrorSelect = (error: ErrorDetails) => {
    setSelectedError(error);
    setRemediationDialogOpen(true);
    
    if (onErrorSelect) {
      onErrorSelect(error.errorId);
    }
  };
  
  // Handle remediation action
  const handleRemediate = async (errorId: string, remediationId: string) => {
    if (onRemediate) {
      await onRemediate(errorId, remediationId);
      
      // Remove the error from the list if remediation was successful
      setErrors(prevErrors => prevErrors.filter(e => e.errorId !== errorId));
      setRemediationDialogOpen(false);
    }
  };
  
  // Toggle AI mode
  const toggleAiMode = () => {
    setAiModeEnabled(!aiModeEnabled);
  };
  
  // Get error pattern analysis
  const getErrorPatternSummary = () => {
    if (!errorAnalysis) return null;
    
    const { patterns, mostCommonTypes, mostAffectedComponents } = errorAnalysis;
    
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Error Patterns
          </Typography>
          {patterns.length === 0 ? (
            <Typography variant="body2">No significant patterns detected</Typography>
          ) : (
            patterns.map((pattern, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {pattern.name} ({pattern.frequency} occurrences)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pattern.description}
                </Typography>
              </Box>
            ))
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Most Affected
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Error Types
              </Typography>
              {mostCommonTypes.slice(0, 3).map((type, index) => (
                <Typography key={index} variant="body2">
                  {type.type}: {type.count}
                </Typography>
              ))}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Components
              </Typography>
              {mostAffectedComponents.slice(0, 3).map((comp, index) => (
                <Typography key={index} variant="body2">
                  {comp.component}: {comp.count}
                </Typography>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  };
  
  return (
    <Paper 
      sx={{ 
        p: 3, 
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        overflow: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <ErrorOutlineIcon sx={{ mr: 1 }} />
          {title}
        </Typography>
        
        {/* AI Mode Toggle */}
        <Button
          variant="outlined"
          size="small"
          color="primary"
          startIcon={<SmartToyIcon />}
          onClick={toggleAiMode}
        >
          {aiModeEnabled ? "Disable AI Mode" : "Enable AI Analysis"}
        </Button>
      </Box>
      
      {/* AI Analysis Section */}
      {aiModeEnabled && (
        <Box sx={{ mb: 3 }}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(25, 118, 210, 0.08)'
                : 'rgba(25, 118, 210, 0.04)',
              borderColor: theme.palette.primary.main
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SmartToyIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" color="primary">
                AI-Powered Error Analysis
              </Typography>
            </Box>
            
            {analysisLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !errorAnalysis ? (
              <Typography variant="body2">
                Not enough error data available for AI analysis.
              </Typography>
            ) : (
              getErrorPatternSummary()
            )}
          </Paper>
        </Box>
      )}
      
      {/* Search and Filter Controls */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search errors by message, component, or operation"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={8} sm={9} md={4}>
          <FormControl size="small" fullWidth>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              displayEmpty
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="severity">By Severity</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={4} sm={3} md={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              {filteredErrors.length} {filteredErrors.length === 1 ? 'result' : 'results'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      {/* Category Filters */}
      {showFilter && (
        <Box sx={{ mb: 3 }}>
          <ErrorCategoryFilter
            categories={errorCategories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </Box>
      )}
      
      {/* Error Report Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="error report tabs"
        >
          <Tab 
            icon={<ErrorOutlineIcon />} 
            iconPosition="start" 
            label="Error Details" 
            id="error-report-tab-0" 
          />
          <Tab 
            icon={<TipsAndUpdatesIcon />} 
            iconPosition="start" 
            label="Remediation Options" 
            id="error-report-tab-1" 
          />
          <Tab 
            icon={<TimelineIcon />} 
            iconPosition="start" 
            label="Error Timeline" 
            id="error-report-tab-2" 
          />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : paginatedErrors.length === 0 ? (
          <Alert severity="info">
            No errors found matching the current filters.
          </Alert>
        ) : (
          <>
            {paginatedErrors.map(error => (
              <Box 
                key={error.errorId}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9 }
                }}
                onClick={() => handleErrorSelect(error)}
              >
                <ErrorDetailPanel error={error} />
              </Box>
            ))}
            
            {/* Pagination */}
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
          </>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : paginatedErrors.length === 0 ? (
          <Alert severity="info">
            No errors found matching the current filters.
          </Alert>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select an error to view remediation suggestions
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Click on any error to view detailed remediation options
            </Alert>
            
            <Grid container spacing={2}>
              {paginatedErrors.map(error => (
                <Grid item xs={12} md={6} key={error.errorId}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      borderLeft: '4px solid',
                      borderLeftColor: (() => {
                        switch (error.errorType) {
                          case 'auth': return theme.palette.warning.main;
                          case 'validation': return theme.palette.success.main;
                          case 'network': return theme.palette.info.main;
                          case 'resource': return theme.palette.secondary.main;
                          case 'system': return theme.palette.error.main;
                          default: return theme.palette.grey[500];
                        }
                      })(),
                      '&:hover': { boxShadow: 1 }
                    }}
                    onClick={() => handleErrorSelect(error)}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {error.message}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {error.component} • {error.operation}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={error.errorType}
                        color={(() => {
                          switch (error.errorType) {
                            case 'auth': return 'warning';
                            case 'validation': return 'success';
                            case 'network': return 'info';
                            case 'resource': return 'secondary';
                            case 'system': return 'error';
                            default: return 'default';
                          }
                        })()}
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredErrors.length === 0 ? (
          <Alert severity="info">
            No errors found matching the current filters.
          </Alert>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Error Occurrence Timeline
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              {sortedErrors
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((error, index) => (
                  <Box 
                    key={error.errorId}
                    sx={{ 
                      display: 'flex',
                      mb: 2,
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.9 }
                    }}
                    onClick={() => handleErrorSelect(error)}
                  >
                    <Box 
                      sx={{ 
                        width: 2, 
                        bgcolor: (() => {
                          switch (error.errorType) {
                            case 'auth': return theme.palette.warning.main;
                            case 'validation': return theme.palette.success.main;
                            case 'network': return theme.palette.info.main;
                            case 'resource': return theme.palette.secondary.main;
                            case 'system': return theme.palette.error.main;
                            default: return theme.palette.grey[500];
                          }
                        })(),
                        position: 'relative',
                        mr: 2
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: (() => {
                            switch (error.errorType) {
                              case 'auth': return theme.palette.warning.main;
                              case 'validation': return theme.palette.success.main;
                              case 'network': return theme.palette.info.main;
                              case 'resource': return theme.palette.secondary.main;
                              case 'system': return theme.palette.error.main;
                              default: return theme.palette.grey[500];
                            }
                          })(),
                          position: 'absolute',
                          top: 0,
                          left: -5
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle2">
                          {error.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(error.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {error.component} • {error.operation}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip 
                          size="small" 
                          label={error.errorType}
                          color={(() => {
                            switch (error.errorType) {
                              case 'auth': return 'warning';
                              case 'validation': return 'success';
                              case 'network': return 'info';
                              case 'resource': return 'secondary';
                              case 'system': return 'error';
                              default: return 'default';
                            }
                          })()}
                        />
                      </Box>
                      
                      {index < sortedErrors.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>
        )}
      </TabPanel>
      
      {/* Remediation Dialog */}
      <Dialog
        open={remediationDialogOpen}
        onClose={() => setRemediationDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        {selectedError && (
          <ErrorRemediationPanel
            migrationId={migrationId}
            errorId={selectedError.errorId}
            onRemediate={handleRemediate}
            onClose={() => setRemediationDialogOpen(false)}
            enhancedMode={aiModeEnabled}
          />
        )}
      </Dialog>
    </Paper>
  );
};