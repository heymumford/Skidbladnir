/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  Tooltip, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  TableChart as TableChartIcon,
  Description as DescriptionIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { excelCsvHandler, ImportResult } from '../../../packages/common/src/utils/excel-csv-handler';

interface ImportExportToolbarProps<T> {
  onImport?: (data: T[]) => void;
  onExport?: () => T[];
  exportFileName?: string;
  importLabel?: string;
  exportLabel?: string;
  dataMapping?: (rawRow: Record<string, any>, index: number) => T;
  showIcons?: boolean;
  compact?: boolean;
}

/**
 * Reusable toolbar component for import/export functionality
 * Supports Excel and CSV formats
 */
export function ImportExportToolbar<T>({
  onImport,
  onExport,
  exportFileName = 'export',
  importLabel = 'Import',
  exportLabel = 'Export',
  dataMapping,
  showIcons = true,
  compact = false
}: ImportExportToolbarProps<T>) {
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle import menu open
  const handleImportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setImportAnchorEl(event.currentTarget);
  };
  
  // Handle export menu open
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setImportAnchorEl(null);
    setExportAnchorEl(null);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setShowImportDialog(false);
    setImportResult(null);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Handle file selection via hidden input
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleMenuClose();
    
    // Check file type
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');
    
    if (!isExcel && !isCsv) {
      setSnackbarMessage('Unsupported file format. Please use Excel (.xlsx, .xls) or CSV (.csv) files.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Import file using the handler
      const result = await excelCsvHandler.importData<T>(
        file,
        dataMapping
      );
      
      setImportResult(result);
      setShowImportDialog(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setSnackbarMessage(`Error importing file: ${error instanceof Error ? error.message : String(error)}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger file selection for Excel import
  const handleImportExcel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = '.xlsx,.xls';
      fileInputRef.current.click();
    }
    handleMenuClose();
  };
  
  // Trigger file selection for CSV import
  const handleImportCsv = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = '.csv';
      fileInputRef.current.click();
    }
    handleMenuClose();
  };
  
  // Handle export to Excel
  const handleExportExcel = async () => {
    if (!onExport) return;
    
    try {
      setLoading(true);
      const data = onExport();
      
      // Export data using the handler
      await excelCsvHandler.exportData(
        data,
        `${exportFileName}.xlsx`
      );
      
      setSnackbarMessage('Data exported successfully to Excel');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Export error:', error);
      setSnackbarMessage(`Error exporting to Excel: ${error instanceof Error ? error.message : String(error)}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };
  
  // Handle export to CSV
  const handleExportCsv = async () => {
    if (!onExport) return;
    
    try {
      setLoading(true);
      const data = onExport();
      
      // Export data using the handler
      await excelCsvHandler.exportData(
        data,
        `${exportFileName}.csv`,
        // In a real implementation, we'd add CSV-specific formatting here
      );
      
      setSnackbarMessage('Data exported successfully to CSV');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Export error:', error);
      setSnackbarMessage(`Error exporting to CSV: ${error instanceof Error ? error.message : String(error)}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };
  
  // Handle final import confirmation
  const handleConfirmImport = () => {
    if (importResult && onImport) {
      onImport(importResult.data);
      setSnackbarMessage(`Successfully imported ${importResult.successfulRows} records`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowImportDialog(false);
      setImportResult(null);
    }
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Import Button */}
        {onImport && (
          <>
            {compact ? (
              <Tooltip title={`${importLabel} (Excel, CSV)`}>
                <IconButton 
                  color="primary"
                  onClick={handleImportMenuOpen}
                  disabled={loading}
                  size="small"
                >
                  <UploadIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="outlined"
                startIcon={showIcons ? <UploadIcon /> : undefined}
                endIcon={<ExpandMoreIcon />}
                onClick={handleImportMenuOpen}
                disabled={loading}
                size="small"
              >
                {importLabel}
              </Button>
            )}
            
            <Menu
              anchorEl={importAnchorEl}
              open={Boolean(importAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleImportExcel}>
                <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
                Import from Excel
              </MenuItem>
              <MenuItem onClick={handleImportCsv}>
                <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
                Import from CSV
              </MenuItem>
            </Menu>
          </>
        )}
        
        {/* Export Button */}
        {onExport && (
          <>
            {compact ? (
              <Tooltip title={`${exportLabel} (Excel, CSV)`}>
                <IconButton 
                  color="primary"
                  onClick={handleExportMenuOpen}
                  disabled={loading}
                  size="small"
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="outlined"
                startIcon={showIcons ? <DownloadIcon /> : undefined}
                endIcon={<ExpandMoreIcon />}
                onClick={handleExportMenuOpen}
                disabled={loading}
                size="small"
              >
                {exportLabel}
              </Button>
            )}
            
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleExportExcel}>
                <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
                Export to Excel
              </MenuItem>
              <MenuItem onClick={handleExportCsv}>
                <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
                Export to CSV
              </MenuItem>
            </Menu>
          </>
        )}
        
        {/* Loading indicator */}
        {loading && <CircularProgress size={24} />}
      </Box>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      {/* Import Preview Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Preview</DialogTitle>
        <DialogContent>
          {importResult && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Import Summary
                </Typography>
                <Typography variant="body2">
                  Successfully processed {importResult.successfulRows} of {importResult.totalRows} rows.
                </Typography>
              </Box>
              
              {importResult.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Warnings</Typography>
                  <ul>
                    {importResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {importResult.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Errors</Typography>
                  <ul>
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Data Preview (First 5 rows)
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, p: 1 }}>
                <pre>{JSON.stringify(importResult.data.slice(0, 5), null, 2)}</pre>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleConfirmImport}
            startIcon={<CheckIcon />}
          >
            Confirm Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}