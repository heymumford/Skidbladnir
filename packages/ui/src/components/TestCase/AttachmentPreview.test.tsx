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
import { AttachmentPreview } from './AttachmentPreview';
import { TestCaseAttachment, TestExecutionAttachment, testExecutionService } from '../../services';

// Mock the service
jest.mock('../../services', () => ({
  testExecutionService: {
    getAttachment: jest.fn().mockResolvedValue(new Blob(['mock content'], { type: 'text/plain' }))
  }
}));

// Mock the JSONTree component used for JSON previews
jest.mock('react-json-tree', () => ({
  __esModule: true,
  default: ({ data }) => <div data-testid="json-tree">Mock JSON Tree: {JSON.stringify(data)}</div>
}));

describe('AttachmentPreview Component', () => {
  // Mock URL methods
  beforeAll(() => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    // Restore globals
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test data
  const mockTextAttachment: TestExecutionAttachment = {
    id: 'att-1',
    name: 'test-file.txt',
    fileType: 'text/plain',
    size: 1024,
    description: 'Test description',
    uploadedBy: 'user@example.com',
    uploadedAt: '2025-01-01T12:00:00Z'
  };
  
  const mockImageAttachment: TestCaseAttachment = {
    id: 'att-2',
    name: 'test-image.png',
    fileType: 'image/png',
    size: 10240,
    url: 'https://example.com/image.png'
  };
  
  const mockPdfAttachment: TestCaseAttachment = {
    id: 'att-3',
    name: 'test-document.pdf',
    fileType: 'application/pdf',
    size: 52500,
    url: 'https://example.com/document.pdf'
  };
  
  const mockUnsupportedAttachment: TestCaseAttachment = {
    id: 'att-7',
    name: 'test-archive.zip',
    fileType: 'application/zip',
    size: 2097152, // 2 MB
    url: 'https://example.com/archive.zip'
  };

  it('fetches attachment data when executionId is provided', async () => {
    render(
      <AttachmentPreview
        attachment={mockTextAttachment}
        executionId="exec-123"
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check that the service was called with correct parameters
    expect(testExecutionService.getAttachment).toHaveBeenCalledWith('exec-123', 'att-1');
  });

  it('loads image attachments with direct URL', async () => {
    render(
      <AttachmentPreview
        attachment={mockImageAttachment}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Image should be rendered from direct URL without service call
    expect(testExecutionService.getAttachment).not.toHaveBeenCalled();
    
    // Image should be displayed
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    
    // At least one image should have the correct source
    const hasCorrectImage = images.some(img => 
      img.getAttribute('src') === 'https://example.com/image.png'
    );
    expect(hasCorrectImage).toBe(true);
  });

  it('renders PDF attachments in an iframe', async () => {
    render(
      <AttachmentPreview
        attachment={mockPdfAttachment}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // PDF should be displayed in an iframe
    const iframe = await screen.findByTitle('test-document.pdf');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName.toLowerCase()).toBe('iframe');
    expect(iframe.getAttribute('src')).toBe('https://example.com/document.pdf#view=FitH');
  });

  it('shows warning for unsupported file types', async () => {
    render(
      <AttachmentPreview
        attachment={mockUnsupportedAttachment}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Warning message should be displayed
    const warningElement = await screen.findByText(/Preview not available for this file format/);
    expect(warningElement).toBeInTheDocument();
    
    // Download button should be available
    const downloadButton = await screen.findByRole('button', { name: /Download File/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('handles error state when loading fails', async () => {
    // Mock the service to reject with an error
    jest.spyOn(testExecutionService, 'getAttachment').mockRejectedValueOnce(
      new Error('Failed to load attachment')
    );
    
    render(
      <AttachmentPreview
        attachment={mockTextAttachment}
        executionId="exec-123"
      />
    );
    
    // Wait for loading to complete and error to be displayed
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Error message should be displayed
    const errorElement = await screen.findByText(/Error loading attachment/);
    expect(errorElement).toBeInTheDocument();
    
    // Help text should be provided
    expect(screen.getByText(/Download the file and open it/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Mock the service to delay resolution
    jest.spyOn(testExecutionService, 'getAttachment').mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(new Blob()), 100))
    );
    
    render(
      <AttachmentPreview
        attachment={mockTextAttachment}
        executionId="exec-123"
      />
    );
    
    // Loading indicator should be displayed
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('uses attachment URL when available instead of fetching', async () => {
    const attachmentWithUrl: TestExecutionAttachment = {
      ...mockTextAttachment,
      url: 'https://example.com/direct-file.txt'
    };
    
    render(
      <AttachmentPreview
        attachment={attachmentWithUrl}
        executionId="exec-123"
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Service should not be called when URL is available
    expect(testExecutionService.getAttachment).not.toHaveBeenCalled();
  });

  it('uses reliable MIME type detection based on file extension', async () => {
    const ambiguousAttachment: TestCaseAttachment = {
      id: 'att-ambiguous',
      name: 'file.jpg', // JPG extension
      fileType: 'application/octet-stream', // Generic MIME type
      size: 5000,
      url: 'https://example.com/file.jpg'
    };
    
    render(
      <AttachmentPreview
        attachment={ambiguousAttachment}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Should detect as image based on extension
    const images = screen.getAllByRole('img');
    const hasImage = images.some(img => 
      img.getAttribute('src') === 'https://example.com/file.jpg'
    );
    expect(hasImage).toBe(true);
  });

  it('handles empty or missing MIME types gracefully', async () => {
    const missingMimeAttachment: TestCaseAttachment = {
      id: 'att-no-mime',
      name: 'data.txt',
      fileType: '', // Empty MIME type
      size: 1024,
      url: 'https://example.com/data.txt'
    };
    
    render(
      <AttachmentPreview
        attachment={missingMimeAttachment}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Should render without errors
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});