import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Divider, Grid, Alert,
  CircularProgress, Pagination, Tab, Tabs, TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import {
  ErrorDetails, RemediationSuggestion,
  migrationService
} from '../../services';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { RemediationSuggestionCard } from './RemediationSuggestionCard';
import { ErrorCategoryFilter, ErrorCategory } from './ErrorCategoryFilter';

interface DetailedErrorReportProps {
  migrationId: string;
  errors?: ErrorDetails[];
  showFilter?: boolean;
  maxHeight?: string | number;
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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

export const DetailedErrorReport: React.FC<DetailedErrorReportProps> = ({
  migrationId,
  errors: initialErrors,
  showFilter = true,
  maxHeight
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [errors, setErrors] = useState<ErrorDetails[]>(initialErrors || []);
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
  const [loading, setLoading] = useState(initialErrors ? false : true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Load errors if not provided
  useEffect(() => {
    if (initialErrors) {
      setErrors(initialErrors);
      return;
    }

    const fetchErrors = async () => {
      try {
        setLoading(true);
        const fetchedErrors = await migrationService.getErrorDetails(migrationId);
        setErrors(fetchedErrors);
        if (fetchedErrors.length > 0) {
          setSelectedError(fetchedErrors[0]);
        }
      } catch (error) {
        console.error('Error fetching error details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, [migrationId, initialErrors]);

  // Load remediation suggestions for selected error
  useEffect(() => {
    if (!selectedError) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const fetchedSuggestions = await migrationService.getRemediationSuggestions(selectedError);
        setSuggestions(fetchedSuggestions);
      } catch (error) {
        console.error('Error fetching remediation suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [selectedError]);

  // Handle error selection
  const handleErrorSelect = (error: ErrorDetails) => {
    setSelectedError(error);
    setTabValue(1); // Switch to remediation tab
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle remediation action
  const handleRemediationAction = async (suggestion: RemediationSuggestion) => {
    // In a real implementation, this would call the appropriate service method
    console.log('Applying remediation action:', suggestion.id);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    return Promise.resolve();
  };

  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  // Handle category filter
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page when filtering
  };

  // Handle pagination
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Filter errors based on search and category
  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchTerm === '' || 
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.operation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === null || error.errorType === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate pagination
  const pageCount = Math.ceil(filteredErrors.length / itemsPerPage);
  const displayedErrors = filteredErrors.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

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

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <ErrorOutlineIcon color="error" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          Error Report {migrationId && `- Migration ${migrationId}`}
        </Typography>
      </Box>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="error report tabs"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<BugReportIcon />} 
          iconPosition="start" 
          label="Errors" 
          id="error-tab-0" 
          aria-controls="error-tabpanel-0" 
        />
        <Tab 
          icon={<TipsAndUpdatesIcon />} 
          iconPosition="start" 
          label="Remediation" 
          id="error-tab-1" 
          aria-controls="error-tabpanel-1" 
          disabled={!selectedError}
        />
      </Tabs>

      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        ...(maxHeight ? { maxHeight } : {}) 
      }}>
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" py={4}>
              <CircularProgress />
            </Box>
          ) : errors.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No errors found for this migration.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  placeholder="Search errors..."
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {showFilter && activeCategories.length > 0 && (
                <ErrorCategoryFilter
                  categories={activeCategories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                />
              )}

              {filteredErrors.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No errors match your search criteria.
                </Alert>
              ) : (
                <>
                  {displayedErrors.map(error => (
                    <ErrorDetailPanel 
                      key={error.errorId} 
                      error={error} 
                      expanded={errors.length === 1}
                    />
                  ))}
                  
                  {pageCount > 1 && (
                    <Box display="flex" justifyContent="center" mt={2}>
                      <Pagination 
                        count={pageCount} 
                        page={page} 
                        onChange={handlePageChange} 
                        color="primary" 
                      />
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {!selectedError ? (
            <Alert severity="info">
              Select an error to view remediation suggestions.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Suggested remediation for: {selectedError.message}
              </Typography>
              
              <Box sx={{ mt: 2, mb: 3 }}>
                <ErrorDetailPanel error={selectedError} expanded={true} />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Remediation Suggestions
              </Typography>
              
              {suggestions.length > 0 ? (
                suggestions.map(suggestion => (
                  <RemediationSuggestionCard 
                    key={suggestion.id} 
                    suggestion={suggestion} 
                    onActionClick={handleRemediationAction}
                  />
                ))
              ) : (
                <Alert severity="info">
                  No remediation suggestions available for this error.
                </Alert>
              )}
            </>
          )}
        </TabPanel>
      </Box>
    </Paper>
  );
};
