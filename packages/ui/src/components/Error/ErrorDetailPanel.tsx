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
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Collapse,
  Button,
  Divider,
  Grid,
  useTheme,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import LanIcon from '@mui/icons-material/Lan';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { ErrorDetails } from '../../services/MigrationService';

interface ErrorDetailPanelProps {
  error: ErrorDetails;
  expanded?: boolean;
}

export const ErrorDetailPanel: React.FC<ErrorDetailPanelProps> = ({
  error,
  expanded: initialExpanded = false
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [stackTraceExpanded, setStackTraceExpanded] = useState(false);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Toggle stack trace expanded state
  const toggleStackTraceExpanded = () => {
    setStackTraceExpanded(!stackTraceExpanded);
  };
  
  // Format timestamp to readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get error type color
  const getErrorTypeColor = (errorType: string): string => {
    switch (errorType) {
      case 'auth': return theme.palette.warning.main; // orange
      case 'validation': return theme.palette.success.main; // green
      case 'network': return theme.palette.info.main; // blue
      case 'resource': return theme.palette.secondary.main; // purple
      case 'system': return theme.palette.error.main; // red
      default: return theme.palette.grey[500]; // grey
    }
  };
  
  // Get human-readable error type
  const getErrorTypeLabel = (errorType: string): string => {
    switch (errorType) {
      case 'auth': return 'Authentication';
      case 'validation': return 'Validation';
      case 'network': return 'Network';
      case 'resource': return 'Resource';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  };
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2, 
        borderLeft: '4px solid',
        borderLeftColor: getErrorTypeColor(error.errorType)
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <ErrorOutlineIcon sx={{ mr: 1, color: getErrorTypeColor(error.errorType) }} />
            {error.message}
          </Typography>
          <Chip 
            label={getErrorTypeLabel(error.errorType)}
            size="small"
            style={{ 
              backgroundColor: getErrorTypeColor(error.errorType),
              color: theme.palette.common.white
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Chip 
            icon={<MemoryIcon />} 
            label={`Component: ${error.component}`} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            icon={<LanIcon />} 
            label={`Operation: ${error.operation}`} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            icon={<AccessTimeIcon />} 
            label={`Time: ${formatTimestamp(error.timestamp)}`} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={toggleExpanded}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </Button>
          
          <Typography variant="caption" color="text.secondary">
            Error ID: {error.errorId}
          </Typography>
        </Box>
      </CardContent>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Divider sx={{ my: 1 }} />
          
          <Grid container spacing={2}>
            {/* Error Detail Section */}
            {error.details && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.text.secondary }}>
                  Error Details
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.background.default }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {typeof error.details === 'string' 
                      ? error.details 
                      : JSON.stringify(error.details, null, 2)}
                  </Typography>
                </Paper>
              </Grid>
            )}
            
            {/* Error Context Section */}
            {error.context && Object.keys(error.context).length > 0 && (
              <Grid item xs={12} md={error.details ? 6 : 12}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.text.secondary }}>
                  Error Context
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.background.default }}>
                  <Grid container spacing={1}>
                    {Object.entries(error.context).map(([key, value]) => (
                      <Grid item xs={12} key={key}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {key}:
                          </Typography>
                          <Typography variant="body2">
                            {value.toString()}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}
            
            {/* Stack Trace Section */}
            {error.stackTrace && (
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1
                }}>
                  <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>
                    Stack Trace
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={stackTraceExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={toggleStackTraceExpanded}
                  >
                    {stackTraceExpanded ? "Collapse" : "Expand"}
                  </Button>
                </Box>
                <Collapse in={stackTraceExpanded} timeout="auto">
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        m: 0
                      }}
                    >
                      {error.stackTrace}
                    </Typography>
                  </Paper>
                </Collapse>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};