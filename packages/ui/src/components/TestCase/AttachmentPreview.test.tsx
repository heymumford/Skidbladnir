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

describe('AttachmentPreview', () => {
  // Mock image URL creation
  const originalCreateObjectURL = global.URL.createObjectURL;
  const mockCreateObjectURL = jest.fn().mockReturnValue('mock-url');
  
  beforeAll(() => {
    global.URL.createObjectURL = mockCreateObjectURL;
  });
  
  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
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
  
  it('renders attachment information correctly', async () => {
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
    
    // Check that attachment info is displayed
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    expect(screen.getByText(/1.0 KB/)).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded by: user@example.com/)).toBeInTheDocument();
  });
  
  it('handles text file preview', async () => {
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
    
    // Text attachments should display as text
    expect(screen.getByText('Mock attachment data for test-file.txt')).toBeInTheDocument();
  });
  
  it('handles image file preview with URL', () => {
    render(
      <AttachmentPreview
        attachment={mockImageAttachment}
      />
    );
    
    // Image should be displayed
    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
  });
  
  it('handles custom title', async () => {
    render(
      <AttachmentPreview
        attachment={mockTextAttachment}
        executionId="exec-123"
        title="Custom Attachment Title"
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Custom title should be displayed
    expect(screen.getByText('Custom Attachment Title')).toBeInTheDocument();
  });
  
  it('calls download callback when download button is clicked', async () => {
    const handleDownload = jest.fn();
    
    render(
      <AttachmentPreview
        attachment={mockTextAttachment}
        executionId="exec-123"
        onDownload={handleDownload}
      />
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the download button
    fireEvent.click(screen.getByTitle('Download'));
    
    // Check that the callback was called
    expect(handleDownload).toHaveBeenCalledWith(mockTextAttachment);
  });
  
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
    
    // Check that the service was called
    expect(testExecutionService.getAttachment).toHaveBeenCalledWith('exec-123', 'att-1');
  });
  
  it('handles loading state', () => {
    // Mock the service to delay resolution
    jest.spyOn(testExecutionService, 'getAttachment').mockImplementation(
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
  
  it('handles error state', async () => {
    // Mock the service to reject
    jest.spyOn(testExecutionService, 'getAttachment').mockRejectedValue(new Error('Test error'));
    
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
    
    // Error message should be displayed
    expect(screen.getByText(/Error loading attachment/)).toBeInTheDocument();
  });
});