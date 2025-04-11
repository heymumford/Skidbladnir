/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportExportToolbar } from '../../../../packages/ui/src/components/Common/ImportExportToolbar';

// Mock the excelCsvHandler service
jest.mock('../../../../packages/common/src/utils/excel-csv-handler', () => ({
  excelCsvHandler: {
    importData: jest.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' }
      ],
      errors: [],
      warnings: [],
      totalRows: 2,
      successfulRows: 2
    }),
    exportData: jest.fn().mockResolvedValue('mock-url'),
    getRinnaIntegration: jest.fn().mockReturnValue({
      rinnaAppUrl: 'http://test.url',
      canImportToRinna: true,
      supportedFeatures: ['Feature 1', 'Feature 2']
    })
  }
}));

// Create a mock file
const createMockFile = (name: string, type: string) => {
  const file = new File(['test'], name, { type });
  return file;
};

describe('ImportExportToolbar', () => {
  const onImportMock = jest.fn();
  const onExportMock = jest.fn().mockReturnValue([{ id: 1, name: 'Test' }]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders import and export buttons', () => {
    render(
      <ImportExportToolbar
        onImport={onImportMock}
        onExport={onExportMock}
        importLabel="Import"
        exportLabel="Export"
      />
    );

    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders in compact mode with icons only', () => {
    render(
      <ImportExportToolbar
        onImport={onImportMock}
        onExport={onExportMock}
        compact={true}
      />
    );

    // Should have icons instead of text
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('opens import menu when import button is clicked', () => {
    render(
      <ImportExportToolbar
        onImport={onImportMock}
        onExport={onExportMock}
      />
    );

    fireEvent.click(screen.getByText('Import'));
    
    // Menu should be open
    expect(screen.getByText('Import from Excel')).toBeInTheDocument();
    expect(screen.getByText('Import from CSV')).toBeInTheDocument();
  });

  it('opens export menu when export button is clicked', () => {
    render(
      <ImportExportToolbar
        onImport={onImportMock}
        onExport={onExportMock}
      />
    );

    fireEvent.click(screen.getByText('Export'));
    
    // Menu should be open
    expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    expect(screen.getByText('Export to CSV')).toBeInTheDocument();
  });

  it('calls onExport when export option is selected', async () => {
    render(
      <ImportExportToolbar
        onImport={onImportMock}
        onExport={onExportMock}
        exportFileName="test-export"
      />
    );

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export to Excel'));
    
    await waitFor(() => {
      expect(onExportMock).toHaveBeenCalled();
    });
  });
});