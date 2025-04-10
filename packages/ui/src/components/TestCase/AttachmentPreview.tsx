/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, CircularProgress, IconButton, 
  Card, CardContent, CardHeader, CardMedia, CardActions,
  Tooltip, Chip, Button, Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { TestCaseAttachment, TestExecutionAttachment, testExecutionService } from '../../services';

// File type groups for rendering different previews
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const PDF_TYPES = ['application/pdf'];
const TEXT_TYPES = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml'];

/**
 * Props for the AttachmentPreview component
 */
export interface AttachmentPreviewProps {
  /**
   * The attachment to preview
   */
  attachment: TestCaseAttachment | TestExecutionAttachment;
  
  /**
   * The ID of the test execution (required when the attachment is part of a test execution)
   */
  executionId?: string;
  
  /**
   * The ID of the test case (required when the attachment is part of a test case)
   */
  testCaseId?: string;
  
  /**
   * Optional title to display in the preview header
   */
  title?: string;
  
  /**
   * Optional callback for when the attachment is downloaded
   */
  onDownload?: (attachment: TestCaseAttachment | TestExecutionAttachment) => void;
}

/**
 * Component for previewing different types of attachments
 */
export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  executionId,
  testCaseId,
  title,
  onDownload
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);

  // Load attachment data on component mount
  useEffect(() => {
    loadAttachment();
  }, [attachment.id, executionId, testCaseId]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Load attachment from API
  const loadAttachment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // If attachment has a URL already, use that
      if (attachment.url) {
        setAttachmentUrl(attachment.url);
        setLoading(false);
        return;
      }
      
      // Otherwise fetch the attachment data
      if (executionId) {
        const blob = await testExecutionService.getAttachment(executionId, attachment.id);
        handleAttachmentBlob(blob);
      } else {
        // Fallback to a placeholder for development
        setAttachmentUrl(null);
        setAttachmentData(`Mock attachment data for ${attachment.name}`);
        setLoading(false);
      }
    } catch (err: any) {
      setError(`Error loading attachment: ${err.message}`);
      setLoading(false);
    }
  };

  // Process attachment blob based on file type
  const handleAttachmentBlob = (blob: Blob) => {
    // Create object URL for binary types
    const url = URL.createObjectURL(blob);
    setAttachmentUrl(url);
    
    // For text files, also create a text representation
    if (TEXT_TYPES.includes(attachment.fileType)) {
      blob.text().then(text => {
        setAttachmentData(text);
      });
    }
    
    setLoading(false);
  };

  // Handle download click
  const handleDownload = () => {
    // Create download link for attachment URL if available
    if (attachmentUrl) {
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Call the download callback if provided
    if (onDownload) {
      onDownload(attachment);
    }
  };

  // Get file type icon based on MIME type
  const getFileTypeIcon = () => {
    if (IMAGE_TYPES.includes(attachment.fileType)) {
      return <ImageIcon />;
    } else if (VIDEO_TYPES.includes(attachment.fileType)) {
      return <VideoLibraryIcon />;
    } else if (PDF_TYPES.includes(attachment.fileType)) {
      return <PictureAsPdfIcon />;
    } else if (TEXT_TYPES.includes(attachment.fileType)) {
      return <DescriptionIcon />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };

  // Render preview based on file type
  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    
    // Image preview
    if (IMAGE_TYPES.includes(attachment.fileType) && attachmentUrl) {
      return (
        <CardMedia
          component="img"
          image={attachmentUrl}
          alt={attachment.name}
          sx={{ 
            objectFit: 'contain',
            maxHeight: 500
          }}
        />
      );
    }
    
    // Video preview
    if (VIDEO_TYPES.includes(attachment.fileType) && attachmentUrl) {
      return (
        <Box sx={{ p: 2 }}>
          <video
            controls
            style={{ width: '100%', maxHeight: 500 }}
          >
            <source src={attachmentUrl} type={attachment.fileType} />
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    }
    
    // PDF preview
    if (PDF_TYPES.includes(attachment.fileType) && attachmentUrl) {
      return (
        <Box sx={{ p: 2, height: 500 }}>
          <iframe
            src={`${attachmentUrl}#view=FitH`}
            title={attachment.name}
            width="100%"
            height="100%"
          />
        </Box>
      );
    }
    
    // Text preview
    if (TEXT_TYPES.includes(attachment.fileType)) {
      return (
        <Box 
          component="pre"
          sx={{
            p: 2,
            maxHeight: 500,
            overflow: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 1,
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {attachmentData || 'No preview available'}
        </Box>
      );
    }
    
    // Generic file preview
    return (
      <Box sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Box sx={{ fontSize: 80, color: 'action.active', mb: 2 }}>
          {getFileTypeIcon()}
        </Box>
        <Typography variant="body1" gutterBottom>
          {attachment.name}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {attachment.fileType} - {formatFileSize(attachment.size)}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ mt: 2 }}
        >
          Download File
        </Button>
      </Box>
    );
  };

  // Determine subtitle for header
  const getSubtitle = () => {
    const parts = [];
    
    parts.push(formatFileSize(attachment.size));
    
    if ('uploadedBy' in attachment && attachment.uploadedBy) {
      parts.push(`Uploaded by: ${attachment.uploadedBy}`);
    }
    
    if ('uploadedAt' in attachment && attachment.uploadedAt) {
      const date = new Date(attachment.uploadedAt);
      parts.push(`on ${date.toLocaleDateString()}`);
    }
    
    return parts.join(' ');
  };

  // Get description if available
  const getDescription = () => {
    if ('description' in attachment && attachment.description) {
      return attachment.description;
    }
    return null;
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={title || attachment.name}
        subheader={getSubtitle()}
        avatar={getFileTypeIcon()}
        action={
          <Box>
            <Tooltip title="Download">
              <IconButton onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            {attachmentUrl && (
              <Tooltip title="Open in new tab">
                <IconButton 
                  component="a" 
                  href={attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
      />
      
      {/* Description if available */}
      {getDescription() && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {getDescription()}
            </Typography>
          </Box>
        </>
      )}
      
      <Divider />
      
      {/* File preview */}
      <CardContent sx={{ p: 0 }}>
        {renderPreview()}
      </CardContent>
      
      <Divider />
      
      {/* File info */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Chip
          label={attachment.fileType}
          size="small"
          variant="outlined"
        />
        {attachment.stepId && (
          <Chip
            label={`Step ${attachment.stepId}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </CardActions>
    </Card>
  );
};