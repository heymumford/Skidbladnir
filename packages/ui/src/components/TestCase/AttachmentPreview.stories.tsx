/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { AttachmentPreview } from './AttachmentPreview';
import { TestCaseAttachment, TestExecutionAttachment } from '../../services';

const meta: Meta<typeof AttachmentPreview> = {
  title: 'Components/TestCase/AttachmentPreview',
  component: AttachmentPreview,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onDownload: { action: 'downloaded' }
  }
};

export default meta;
type Story = StoryObj<typeof AttachmentPreview>;

// Example attachments for different file types
const imageAttachment: TestCaseAttachment = {
  id: 'image-1',
  name: 'screenshot.png',
  fileType: 'image/png',
  size: 245000,
  url: 'https://via.placeholder.com/800x600.png?text=Test+Screenshot',
};

const textAttachment: TestExecutionAttachment = {
  id: 'text-1',
  name: 'test-log.txt',
  fileType: 'text/plain',
  size: 15200,
  description: 'Console log from the test execution showing API responses',
  uploadedBy: 'jane.doe@example.com',
  uploadedAt: '2025-01-05T14:32:10Z',
};

const pdfAttachment: TestCaseAttachment = {
  id: 'pdf-1',
  name: 'test-requirements.pdf',
  fileType: 'application/pdf',
  size: 1024000,
};

const videoAttachment: TestExecutionAttachment = {
  id: 'video-1',
  name: 'test-recording.mp4',
  fileType: 'video/mp4',
  size: 5240000,
  description: 'Screen recording of the test execution',
  uploadedBy: 'john.smith@example.com',
  uploadedAt: '2025-01-05T14:35:22Z',
  stepId: '5',
};

export const ImagePreview: Story = {
  args: {
    attachment: imageAttachment,
    title: 'Test Screenshot'
  },
};

export const TextFilePreview: Story = {
  args: {
    attachment: textAttachment,
    executionId: 'exec-123',
  },
};

export const PDFPreview: Story = {
  args: {
    attachment: pdfAttachment,
    executionId: 'exec-123',
  },
};

export const VideoPreview: Story = {
  args: {
    attachment: videoAttachment,
    executionId: 'exec-123',
  },
};

export const WithCustomTitle: Story = {
  args: {
    attachment: imageAttachment,
    title: 'Custom Attachment Title',
  },
};

export const LoadingState: Story = {
  args: {
    attachment: pdfAttachment,
    executionId: 'loading-state-demo',
  },
  parameters: {
    mockData: {
      delay: 5000, // Simulate a 5-second loading delay
    },
  },
};

export const ErrorState: Story = {
  args: {
    attachment: {
      id: 'error-1',
      name: 'missing-file.xlsx',
      fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 32500,
    },
    executionId: 'error-exec',
  },
  parameters: {
    mockData: {
      error: true,
    },
  },
};