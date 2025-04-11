/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Divider,
  Chip,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CompareArrows as CompareArrowsIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  TableChart as TableChartIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import JSONTree from 'react-json-tree';
import { TransformationPreview } from '../../types';

/**
 * Props for the DataStructureComparison component
 */
interface DataStructureComparisonProps {
  /**
   * The transformation preview data containing source, canonical, and target
   */
  preview: TransformationPreview;
  
  /**
   * Optional source provider ID for display
   */
  sourceProviderId?: string;
  
  /**
   * Optional target provider ID for display
   */
  targetProviderId?: string;
  
  /**
   * Optional callback when an issue is selected
   */
  onSelectIssue?: (fieldName: string) => void;
}

/**
 * Interface for tab panel props
 */
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
      id={`data-structure-tabpanel-${index}`}
      aria-labelledby={`data-structure-tab-${index}`}
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

/**
 * Component for visually comparing data structures (source, canonical, target)
 * with interactive views and highlighting of differences and issues
 */
export const DataStructureComparison: React.FC<DataStructureComparisonProps> = ({
  preview,
  sourceProviderId = 'Source',
  targetProviderId = 'Target',
  onSelectIssue
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // JSON theme for syntax highlighting
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
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Toggle expansion of an item
  const handleToggleExpand = (field: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  // Get all fields from all three data structures
  const getAllFields = (): string[] => {
    const fields = new Set<string>();
    
    // Add fields from each data structure
    Object.keys(preview.sourceData || {}).forEach(key => fields.add(key));
    Object.keys(preview.canonicalData || {}).forEach(key => fields.add(key));
    Object.keys(preview.targetData || {}).forEach(key => fields.add(key));
    
    // Convert to array and sort alphabetically
    return Array.from(fields).sort();
  };
  
  // Filter fields based on search term
  const getFilteredFields = (): string[] => {
    if (!searchTerm) return getAllFields();
    
    return getAllFields().filter(field => 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  // Check if a field has a validation issue
  const hasFieldIssue = (field: string): boolean => {
    if (!preview.validationMessages) return false;
    
    return preview.validationMessages.some(message => 
      message.toLowerCase().includes(field.toLowerCase())
    );
  };
  
  // Determine if a field is missing in any data structure
  const isFieldMissing = (field: string, dataType: 'source' | 'canonical' | 'target'): boolean => {
    switch (dataType) {
      case 'source':
        return preview.sourceData[field] === undefined;
      case 'canonical':
        return preview.canonicalData[field] === undefined;
      case 'target':
        return preview.targetData[field] === undefined;
      default:
        return false;
    }
  };
  
  // Check if values are different
  const areValuesDifferent = (field: string): boolean => {
    const sourceValue = preview.sourceData[field];
    const canonicalValue = preview.canonicalData[field];
    const targetValue = preview.targetData[field];
    
    return JSON.stringify(sourceValue) !== JSON.stringify(canonicalValue) || 
           JSON.stringify(canonicalValue) !== JSON.stringify(targetValue);
  };
  
  // Render hierarchical view tab
  const renderHierarchicalView = () => {
    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            placeholder="Search fields..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ width: 300 }}
          />
          <Box sx={{ ml: 'auto' }}>
            <Button 
              size="small" 
              onClick={() => setExpandedItems({})}
              variant="outlined"
            >
              Collapse All
            </Button>
          </Box>
        </Box>
        
        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {getFilteredFields().map(field => {
            const hasIssue = hasFieldIssue(field);
            const isExpanded = expandedItems[field] || false;
            const isDifferent = areValuesDifferent(field);
            const isMissingInSource = isFieldMissing(field, 'source');
            const isMissingInCanonical = isFieldMissing(field, 'canonical');
            const isMissingInTarget = isFieldMissing(field, 'target');
            
            return (
              <React.Fragment key={field}>
                <ListItem 
                  button 
                  onClick={() => handleToggleExpand(field)}
                  sx={{ 
                    bgcolor: hasIssue ? '#fff8e1' : (isDifferent ? '#f3f8ff' : 'transparent'),
                    borderLeft: '3px solid',
                    borderColor: hasIssue ? '#ffc107' : (isDifferent ? '#2196f3' : 'transparent')
                  }}
                >
                  <ListItemIcon>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemIcon>
                  <ListItemText 
                    primary={field} 
                    secondary={
                      hasIssue ? 'Has validation issues' : 
                      (isDifferent ? 'Values differ between systems' : '')
                    }
                  />
                  {hasIssue && (
                    <Chip 
                      label="Issue" 
                      size="small" 
                      color="warning"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectIssue) onSelectIssue(field);
                      }}
                    />
                  )}
                  {isMissingInSource && (
                    <Chip 
                      label="Missing in Source" 
                      size="small" 
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                  {isMissingInCanonical && (
                    <Chip 
                      label="Missing in Canonical" 
                      size="small" 
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                  {isMissingInTarget && (
                    <Chip 
                      label="Missing in Target" 
                      size="small" 
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItem>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Source ({sourceProviderId})
                          </Typography>
                          <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, minHeight: 40 }}>
                            {isMissingInSource ? (
                              <Typography variant="body2" color="error">Field not present</Typography>
                            ) : (
                              <JSONTree
                                data={preview.sourceData[field]}
                                theme={jsonTheme}
                                invertTheme={true}
                                shouldExpandNode={() => true}
                              />
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Canonical
                          </Typography>
                          <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, minHeight: 40 }}>
                            {isMissingInCanonical ? (
                              <Typography variant="body2" color="error">Field not present</Typography>
                            ) : (
                              <JSONTree
                                data={preview.canonicalData[field]}
                                theme={jsonTheme}
                                invertTheme={true}
                                shouldExpandNode={() => true}
                              />
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Target ({targetProviderId})
                          </Typography>
                          <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, minHeight: 40 }}>
                            {isMissingInTarget ? (
                              <Typography variant="body2" color="error">Field not present</Typography>
                            ) : (
                              <JSONTree
                                data={preview.targetData[field]}
                                theme={jsonTheme}
                                invertTheme={true}
                                shouldExpandNode={() => true}
                              />
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    {hasIssue && preview.validationMessages && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: '#fff8e1', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Validation Issues:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {preview.validationMessages
                            .filter(msg => msg.toLowerCase().includes(field.toLowerCase()))
                            .map((msg, idx) => (
                              <li key={idx}>
                                <Typography variant="body2">{msg}</Typography>
                              </li>
                            ))}
                        </ul>
                      </Box>
                    )}
                  </Box>
                </Collapse>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    );
  };
  
  // Render full JSON view tab
  const renderFullJsonView = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Typography variant="subtitle1" gutterBottom>
            Source: {sourceProviderId}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ bgcolor: '#f5f5f5', p: 2, maxHeight: 500, overflow: 'auto' }}
          >
            <JSONTree
              data={preview.sourceData}
              theme={jsonTheme}
              invertTheme={true}
              shouldExpandNode={(keyPath, data, level) => level < 2}
            />
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle1" gutterBottom>
            Canonical Format
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ bgcolor: '#f5f5f5', p: 2, maxHeight: 500, overflow: 'auto' }}
          >
            <JSONTree
              data={preview.canonicalData}
              theme={jsonTheme}
              invertTheme={true}
              shouldExpandNode={(keyPath, data, level) => level < 2}
            />
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle1" gutterBottom>
            Target: {targetProviderId}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ bgcolor: '#f5f5f5', p: 2, maxHeight: 500, overflow: 'auto' }}
          >
            <JSONTree
              data={preview.targetData}
              theme={jsonTheme}
              invertTheme={true}
              shouldExpandNode={(keyPath, data, level) => level < 2}
            />
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  // Render table view tab
  const renderTableView = () => {
    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            placeholder="Search fields..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ width: 300 }}
          />
        </Box>
        
        <Paper variant="outlined">
          <Box sx={{ width: '100%', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Field</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Source ({sourceProviderId})</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: 40 }}></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Canonical</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: 40 }}></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Target ({targetProviderId})</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredFields().map((field, index) => {
                  const hasIssue = hasFieldIssue(field);
                  const sourceValue = preview.sourceData[field];
                  const canonicalValue = preview.canonicalData[field];
                  const targetValue = preview.targetData[field];
                  const isMissingInSource = isFieldMissing(field, 'source');
                  const isMissingInCanonical = isFieldMissing(field, 'canonical');
                  const isMissingInTarget = isFieldMissing(field, 'target');
                  const sourceToCanonicalDiff = JSON.stringify(sourceValue) !== JSON.stringify(canonicalValue);
                  const canonicalToTargetDiff = JSON.stringify(canonicalValue) !== JSON.stringify(targetValue);
                  
                  return (
                    <tr 
                      key={field}
                      style={{ 
                        backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                        ...(hasIssue ? { backgroundColor: '#fff8e1' } : {})
                      }}
                    >
                      <td style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid #e0e0e0',
                        fontWeight: hasIssue ? 'bold' : 'normal',
                        borderLeft: '3px solid',
                        borderLeftColor: hasIssue ? '#ffc107' : 'transparent'
                      }}>
                        {field}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontFamily: 'monospace' }}>
                        {isMissingInSource ? (
                          <span style={{ color: '#f44336' }}>Not present</span>
                        ) : (
                          <span>{JSON.stringify(sourceValue)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <ArrowForwardIcon color={sourceToCanonicalDiff ? "primary" : "disabled"} fontSize="small" />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontFamily: 'monospace' }}>
                        {isMissingInCanonical ? (
                          <span style={{ color: '#f44336' }}>Not present</span>
                        ) : (
                          <span>{JSON.stringify(canonicalValue)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <ArrowForwardIcon color={canonicalToTargetDiff ? "primary" : "disabled"} fontSize="small" />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontFamily: 'monospace' }}>
                        {isMissingInTarget ? (
                          <span style={{ color: '#f44336' }}>Not present</span>
                        ) : (
                          <span>{JSON.stringify(targetValue)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>
                        {hasIssue ? (
                          <Chip 
                            label="Issue" 
                            size="small" 
                            color="warning"
                            onClick={() => onSelectIssue && onSelectIssue(field)}
                          />
                        ) : (sourceToCanonicalDiff || canonicalToTargetDiff) ? (
                          <Chip 
                            label="Transformed" 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip 
                            label="Identical" 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Paper>
      </Box>
    );
  };
  
  // Render validation issues tab
  const renderValidationIssuesView = () => {
    if (!preview.validationMessages || preview.validationMessages.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No validation issues found.
          </Typography>
        </Box>
      );
    }
    
    return (
      <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        {preview.validationMessages.map((message, index) => (
          <React.Fragment key={index}>
            <ListItem sx={{ bgcolor: '#fff8e1' }}>
              <ListItemText 
                primary={message}
                secondary={
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => {
                      // Try to extract field name from message
                      const fieldMatch = message.match(/field ["']([^"']+)["']/i);
                      if (fieldMatch && fieldMatch[1] && onSelectIssue) {
                        onSelectIssue(fieldMatch[1]);
                      }
                    }}
                    sx={{ mt: 1 }}
                  >
                    Inspect Fields
                  </Button>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    );
  };
  
  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="data structure comparison tabs">
          <Tab 
            icon={<ExpandMoreIcon />} 
            iconPosition="start" 
            label="Hierarchical View" 
            id="data-structure-tab-0"
          />
          <Tab 
            icon={<CodeIcon />} 
            iconPosition="start" 
            label="Full JSON View" 
            id="data-structure-tab-1" 
          />
          <Tab 
            icon={<TableChartIcon />} 
            iconPosition="start" 
            label="Table View" 
            id="data-structure-tab-2" 
          />
          <Tab 
            icon={<PdfIcon />} 
            iconPosition="start" 
            label={`Validation Issues (${preview.validationMessages?.length || 0})`}
            id="data-structure-tab-3"
            sx={preview.validationMessages?.length ? { color: '#f57c00' } : {}}
          />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {renderHierarchicalView()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {renderFullJsonView()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {renderTableView()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        {renderValidationIssuesView()}
      </TabPanel>
    </Box>
  );
};