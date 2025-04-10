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
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Box,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import BugReportIcon from '@mui/icons-material/BugReport';

import { LogEntry, LogLevel } from '../../types';

interface MigrationOperationLogProps {
  logs: LogEntry[];
  title?: string;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  totalLogs?: number;
  pageSize?: number;
  currentPage?: number;
}

/**
 * Helper function to get the color for a log level
 */
const getLevelColor = (level: LogLevel): string => {
  switch (level) {
    case 'debug': return 'info';
    case 'info': return 'primary';
    case 'warn': return 'warning';
    case 'error': return 'error';
    case 'fatal': return 'error';
    default: return 'default';
  }
};

/**
 * Helper function to get an icon for a log level
 */
const getLevelIcon = (level: LogLevel) => {
  switch (level) {
    case 'debug': return <BugReportIcon fontSize="small" />;
    case 'info': return <InfoIcon fontSize="small" />;
    case 'warn': return <WarningIcon fontSize="small" />;
    case 'error': return <ErrorIcon fontSize="small" />;
    case 'fatal': return <ErrorIcon fontSize="small" />;
    default: return <InfoIcon fontSize="small" />;
  }
};

export const MigrationOperationLog: React.FC<MigrationOperationLogProps> = ({
  logs,
  title = 'Operation Log',
  loading = false,
  onPageChange,
  totalLogs = 0,
  pageSize = 10,
  currentPage = 1
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Toggle row expansion
  const toggleRowExpansion = (logId: string) => {
    setExpandedRows(prev => ({ ...prev, [logId]: !prev[logId] }));
  };
  
  // Handle search term change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle level filter change
  const handleLevelFilterChange = (event: SelectChangeEvent) => {
    setLevelFilter(event.target.value);
  };
  
  // Handle component filter change
  const handleComponentFilterChange = (event: SelectChangeEvent) => {
    setComponentFilter(event.target.value);
  };
  
  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  // Get unique components for the filter dropdown
  const components = [...new Set(logs.map(log => log.component))];
  
  // Apply filters
  const filteredLogs = logs.filter(log => {
    // Apply search term filter
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.component.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply level filter
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    
    // Apply component filter
    const matchesComponent = componentFilter === 'all' || log.component === componentFilter;
    
    return matchesSearch && matchesLevel && matchesComponent;
  });
  
  const totalPages = Math.ceil(totalLogs / pageSize);
  
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ mr: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          
          <Tooltip title="Toggle Filters">
            <IconButton onClick={toggleFilters} color={showFilters ? 'primary' : 'default'}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Collapse in={showFilters}>
        <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="level-filter-label">Level</InputLabel>
            <Select
              labelId="level-filter-label"
              id="level-filter"
              value={levelFilter}
              label="Level"
              onChange={handleLevelFilterChange}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warn">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="fatal">Fatal</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="component-filter-label">Component</InputLabel>
            <Select
              labelId="component-filter-label"
              id="component-filter"
              value={componentFilter}
              label="Component"
              onChange={handleComponentFilterChange}
            >
              <MenuItem value="all">All Components</MenuItem>
              {components.map(component => (
                <MenuItem key={component} value={component}>{component}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Collapse>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="migration log table">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell width={180}>Timestamp</TableCell>
              <TableCell width={100}>Level</TableCell>
              <TableCell width={150}>Component</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map(log => (
              <React.Fragment key={log.id}>
                <TableRow 
                  hover
                  onClick={() => toggleRowExpansion(log.id)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                    ...(log.level === 'error' || log.level === 'fatal' ? { bgcolor: 'error.light' } : {}),
                    ...(log.level === 'warn' ? { bgcolor: 'warning.light' } : {})
                  }}
                >
                  <TableCell>
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(log.id);
                      }}
                    >
                      {expandedRows[log.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={getLevelIcon(log.level)} 
                      label={log.level.toUpperCase()} 
                      color={getLevelColor(log.level) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{log.component}</TableCell>
                  <TableCell>{log.message}</TableCell>
                </TableRow>
                
                {/* Expanded details row */}
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={expandedRows[log.id]} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1, py: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Details:</Typography>
                        {log.details ? (
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '8px', 
                            borderRadius: '4px',
                            overflowX: 'auto'
                          }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No additional details available
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">
                    No log entries found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {onPageChange && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination 
            count={totalPages} 
            page={currentPage} 
            onChange={(_, page) => onPageChange(page)}
          />
        </Box>
      )}
    </Paper>
  );
};