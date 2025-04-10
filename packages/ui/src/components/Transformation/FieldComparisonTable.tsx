/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

interface FieldMapping {
  sourceField: string;
  canonicalField: string;
  targetField: string;
  sourceValue: any;
  canonicalValue: any;
  targetValue: any;
  hasTransformation: boolean;
  hasWarning: boolean;
}

interface FieldComparisonTableProps {
  fieldMappings: FieldMapping[];
  showEmptyFields?: boolean;
  showDataTypes?: boolean;
}

/**
 * Helper function to get a string representation of a value's type
 */
const getType = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

/**
 * Helper function to format a value for display
 */
const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map(item => typeof item === 'object' ? '{...}' : item).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

export const FieldComparisonTable: React.FC<FieldComparisonTableProps> = ({
  fieldMappings,
  showEmptyFields = false,
  showDataTypes = true
}) => {
  // Filter out empty fields if not showing them
  const visibleMappings = showEmptyFields
    ? fieldMappings
    : fieldMappings.filter(mapping => 
        mapping.sourceValue !== undefined || 
        mapping.canonicalValue !== undefined || 
        mapping.targetValue !== undefined
      );

  if (visibleMappings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 3 }}>
        <Typography variant="body1">No field mappings available</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ my: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.light' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Source Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Source Value</TableCell>
            <TableCell sx={{ width: 50 }}></TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Canonical Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Canonical Value</TableCell>
            <TableCell sx={{ width: 50 }}></TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Target Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Target Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleMappings.map((mapping, index) => (
            <TableRow 
              key={index}
              sx={{ 
                '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                ...(mapping.hasWarning ? { bgcolor: 'warning.light' } : {})
              }}
            >
              {/* Source Field */}
              <TableCell>
                <Typography variant="body2">{mapping.sourceField}</Typography>
                {showDataTypes && (
                  <Typography variant="caption" color="text.secondary">
                    {getType(mapping.sourceValue)}
                  </Typography>
                )}
              </TableCell>
              
              {/* Source Value */}
              <TableCell>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {formatValue(mapping.sourceValue)}
                </Typography>
              </TableCell>
              
              {/* Transformation Indicator */}
              <TableCell>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <SyncAltIcon 
                    color={mapping.hasTransformation ? "primary" : "disabled"} 
                    fontSize="small" 
                  />
                </Box>
              </TableCell>
              
              {/* Canonical Field */}
              <TableCell>
                <Typography variant="body2">{mapping.canonicalField}</Typography>
                {showDataTypes && (
                  <Typography variant="caption" color="text.secondary">
                    {getType(mapping.canonicalValue)}
                  </Typography>
                )}
              </TableCell>
              
              {/* Canonical Value */}
              <TableCell>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {formatValue(mapping.canonicalValue)}
                </Typography>
              </TableCell>
              
              {/* Transformation Indicator */}
              <TableCell>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  {mapping.hasWarning ? (
                    <WarningIcon color="warning" fontSize="small" />
                  ) : (
                    <CheckCircleIcon color="success" fontSize="small" />
                  )}
                </Box>
              </TableCell>
              
              {/* Target Field */}
              <TableCell>
                <Typography variant="body2">{mapping.targetField}</Typography>
                {showDataTypes && (
                  <Typography variant="caption" color="text.secondary">
                    {getType(mapping.targetValue)}
                  </Typography>
                )}
              </TableCell>
              
              {/* Target Value */}
              <TableCell>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {formatValue(mapping.targetValue)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};