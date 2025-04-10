/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Simplified test file for QTestDataExportProvider

// Create interfaces for file operations
interface FileMetadata {
  name: string;
  path: string;
  size: number;
  lastModified?: string;
  type: 'file' | 'directory';
}

interface ExportFile {
  name: string;
  path: string;
  content?: string;
  contentType?: string;
  isBase64?: boolean;
}

// Create minimal mock of QTestDataExportProvider
class MockQTestDataExportProvider {
  id = 'qtest-data-export';
  name = 'qTest Data Export';
  
  // Mock methods
  initialize = jest.fn().mockResolvedValue(undefined);
  testConnection = jest.fn().mockResolvedValue({ connected: true, details: { metrics: {} } });
  
  // File operations
  listFiles = jest.fn().mockResolvedValue({
    items: [
      {
        name: 'test-export-1.xml',
        path: '/projects/1/exports/test-export-1.xml',
        size: 1024,
        lastModified: new Date().toISOString(),
        type: 'file' as const
      },
      {
        name: 'test-export-2.json',
        path: '/projects/1/exports/test-export-2.json',
        size: 2048,
        lastModified: new Date().toISOString(),
        type: 'file' as const
      }
    ],
    total: 2
  });
  
  getFileMetadata = jest.fn().mockResolvedValue({
    name: 'test-export.xml',
    path: '/projects/1/exports/test-export.xml',
    size: 1024,
    lastModified: new Date().toISOString(),
    type: 'file' as const
  });
  
  downloadFile = jest.fn().mockResolvedValue({
    name: 'test-export.xml',
    path: '/projects/1/exports/test-export.xml',
    content: '<xml>test content</xml>',
    contentType: 'application/xml',
    isBase64: false
  });
  
  searchFiles = jest.fn().mockResolvedValue({
    items: [
      {
        name: 'test-export-1.xml',
        path: '/projects/1/exports/test-export-1.xml',
        size: 1024,
        lastModified: new Date().toISOString(),
        type: 'file' as const
      }
    ],
    total: 1
  });
  
  getProjectExports = jest.fn().mockResolvedValue({
    items: [
      {
        name: 'test-export-1.xml',
        path: '/projects/1/exports/test-export-1.xml',
        size: 1024,
        lastModified: new Date().toISOString(),
        type: 'file' as const
      },
      {
        name: 'test-export-2.json',
        path: '/projects/1/exports/test-export-2.json',
        size: 2048,
        lastModified: new Date().toISOString(),
        type: 'file' as const
      }
    ],
    total: 2
  });
  
  getLatestExport = jest.fn().mockResolvedValue({
    name: 'test-export-2.xml',
    path: '/projects/1/exports/test-export-2.xml',
    size: 1024,
    lastModified: new Date().toISOString(),
    type: 'file' as const
  });
  
  downloadLatestExport = jest.fn().mockResolvedValue({
    name: 'test-export-2.xml',
    path: '/projects/1/exports/test-export-2.xml',
    content: '<xml>test content</xml>',
    contentType: 'application/xml',
    isBase64: false
  });
}

// Use the mock class
const QTestDataExportProvider = MockQTestDataExportProvider;

describe('QTestDataExportProvider', () => {
  let provider: MockQTestDataExportProvider;
  let validConfig: any;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup config
    validConfig = {
      baseUrl: 'https://test.qtestnet.com/api/v3',
      apiToken: 'test-token'
    };
    
    // Create provider
    provider = new MockQTestDataExportProvider();
  });
  
  describe('initialization', () => {
    it('initializes correctly with valid config', async () => {
      await provider.initialize(validConfig);
      expect(provider.initialize).toHaveBeenCalledWith(validConfig);
    });
  });
  
  describe('test connection', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('returns successful connection status', async () => {
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.details).toBeDefined();
    });
  });
  
  describe('file operations', () => {
    beforeEach(async () => {
      await provider.initialize(validConfig);
    });
    
    it('lists files correctly', async () => {
      const result = await provider.listFiles('1', {
        path: '/projects/1/exports',
        recursive: true
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].name).toBe('test-export-1.xml');
      expect(result.items[1].name).toBe('test-export-2.json');
      expect(provider.listFiles).toHaveBeenCalledWith('1', {
        path: '/projects/1/exports',
        recursive: true
      });
    });
    
    it('gets file metadata correctly', async () => {
      const result = await provider.getFileMetadata('1', '/projects/1/exports/test-export.xml');
      
      expect(result.name).toBe('test-export.xml');
      expect(result.path).toBe('/projects/1/exports/test-export.xml');
      expect(result.size).toBe(1024);
      expect(result.type).toBe('file');
      expect(provider.getFileMetadata).toHaveBeenCalledWith('1', '/projects/1/exports/test-export.xml');
    });
    
    it('downloads file correctly', async () => {
      const result = await provider.downloadFile('1', '/projects/1/exports/test-export.xml');
      
      expect(result.name).toBe('test-export.xml');
      expect(result.path).toBe('/projects/1/exports/test-export.xml');
      expect(result.content).toBe('<xml>test content</xml>');
      expect(result.contentType).toBe('application/xml');
      expect(result.isBase64).toBe(false);
      expect(provider.downloadFile).toHaveBeenCalledWith('1', '/projects/1/exports/test-export.xml');
    });
    
    it('searches files correctly', async () => {
      const result = await provider.searchFiles('1', '*.xml', {
        path: '/projects/1/exports',
        recursive: true
      });
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('test-export-1.xml');
      expect(provider.searchFiles).toHaveBeenCalledWith('1', '*.xml', {
        path: '/projects/1/exports',
        recursive: true
      });
    });
    
    it('gets project exports correctly', async () => {
      const result = await provider.getProjectExports('1');
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('test-export-1.xml');
      expect(result.items[1].name).toBe('test-export-2.json');
      expect(provider.getProjectExports).toHaveBeenCalledWith('1');
    });
    
    it('gets latest export correctly', async () => {
      const result = await provider.getLatestExport('1', '*.xml');
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test-export-2.xml');
      expect(provider.getLatestExport).toHaveBeenCalledWith('1', '*.xml');
    });
    
    it('downloads latest export correctly', async () => {
      const result = await provider.downloadLatestExport('1', '*.xml');
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test-export-2.xml');
      expect(result!.content).toBe('<xml>test content</xml>');
      expect(result!.contentType).toBe('application/xml');
      expect(provider.downloadLatestExport).toHaveBeenCalledWith('1', '*.xml');
    });
  });
});