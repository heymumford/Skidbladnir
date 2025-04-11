/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, CircularProgress, IconButton, 
  Card, CardContent, CardHeader, CardMedia, CardActions,
  Tooltip, Chip, Button, Divider, Alert, Link, Stack,
  Dialog, DialogContent, DialogTitle, DialogActions
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CodeIcon from '@mui/icons-material/Code';
import ArticleIcon from '@mui/icons-material/Article';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

import { TestCaseAttachment, TestExecutionAttachment, testExecutionService } from '../../services';

// File type groups for rendering different previews
const IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp', 
  'image/tiff', 'image/svg+xml'
];
const VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
  'video/x-ms-wmv', 'video/x-flv', 'video/3gpp'
];
const AUDIO_TYPES = [
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac',
  'audio/x-m4a', 'audio/flac'
];
const PDF_TYPES = ['application/pdf'];
const TEXT_TYPES = [
  'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown',
  'text/csv', 'text/xml', 'text/x-log'
];
const CODE_TYPES = [
  'application/json', 'application/xml', 'application/javascript',
  'application/typescript', 'application/x-httpd-php', 'application/x-sh',
  'application/x-python', 'application/x-ruby'
];
const DOCUMENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
  'application/vnd.ms-powerpoint', // ppt
  'application/rtf',
  'application/vnd.oasis.opendocument.text', // odt
  'application/vnd.oasis.opendocument.spreadsheet', // ods
  'application/vnd.oasis.opendocument.presentation' // odp
];
const ARCHIVE_TYPES = [
  'application/zip', 'application/x-zip-compressed', 'application/x-tar',
  'application/x-gzip', 'application/x-7z-compressed', 'application/x-rar-compressed'
];

// File extensions mapped to proper MIME types for better detection
const FILE_EXTENSION_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.3gp': 'video/3gpp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/x-m4a',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.log': 'text/x-log',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.php': 'application/x-httpd-php',
  '.sh': 'application/x-sh',
  '.py': 'application/x-python',
  '.rb': 'application/x-ruby',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.xls': 'application/vnd.ms-excel',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.rtf': 'application/rtf',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/x-gzip',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/x-rar-compressed'
};

// Gets correct MIME type based on file name and provided type
const getReliableMimeType = (fileName: string, providedType: string): string => {
  // Extract file extension
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  
  // Check if we have a mapping for this extension
  if (extension && FILE_EXTENSION_MAP[extension]) {
    return FILE_EXTENSION_MAP[extension];
  }
  
  // Fall back to the provided MIME type
  return providedType;
};

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
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [unsupportedFormat, setUnsupportedFormat] = useState<boolean>(false);
  const [detectedFileType, setDetectedFileType] = useState<string | null>(null);
  
  // References for elements
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get corrected MIME type
  const reliableMimeType = getReliableMimeType(attachment.name, attachment.fileType);

  // Load attachment data on component mount
  useEffect(() => {
    loadAttachment();
    
    // Update detected file type
    setDetectedFileType(reliableMimeType);
    
    // Check if format is supported for preview
    const isSupported = (
      IMAGE_TYPES.includes(reliableMimeType) ||
      VIDEO_TYPES.includes(reliableMimeType) ||
      AUDIO_TYPES.includes(reliableMimeType) ||
      PDF_TYPES.includes(reliableMimeType) ||
      TEXT_TYPES.includes(reliableMimeType) ||
      CODE_TYPES.includes(reliableMimeType)
    );
    
    setUnsupportedFormat(!isSupported);
    
    // Clean up URLs on unmount
    return () => {
      if (attachmentUrl) {
        URL.revokeObjectURL(attachmentUrl);
      }
    };
  }, [attachment.id, attachment.fileType, reliableMimeType, executionId, testCaseId]);

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
      } else if (testCaseId) {
        // If implementing test case attachment fetching, add here
        // For now, fallback to placeholder
        fallbackToPlaceholder();
      } else {
        // Fallback to a placeholder for development
        fallbackToPlaceholder();
      }
    } catch (err: any) {
      setError(`Error loading attachment: ${err.message}`);
      setLoading(false);
    }
  };

  // Use placeholder data for development purposes
  const fallbackToPlaceholder = () => {
    setAttachmentUrl(null);
    
    // Generate different placeholder content based on file type
    if (TEXT_TYPES.includes(reliableMimeType) || CODE_TYPES.includes(reliableMimeType)) {
      setAttachmentData(`
# Mock ${reliableMimeType} content for "${attachment.name}"

This is a placeholder for demonstration purposes. In a real application, 
this would contain the actual content of your ${attachment.name} file.

File size: ${formatFileSize(attachment.size)}
MIME type: ${reliableMimeType}

Sample content would appear here based on the file type.`);
    } else {
      // For non-text types, just set a simple message
      setAttachmentData(`Mock attachment data for ${attachment.name}`);
    }
    
    setLoading(false);
  };

  // Process attachment blob based on file type
  const handleAttachmentBlob = (blob: Blob) => {
    // Create object URL for binary types
    const url = URL.createObjectURL(blob);
    setAttachmentUrl(url);
    
    // For text files, also create a text representation
    const isTextOrCode = TEXT_TYPES.includes(reliableMimeType) || CODE_TYPES.includes(reliableMimeType);
    if (isTextOrCode) {
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

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Get file type icon based on MIME type
  const getFileTypeIcon = () => {
    if (IMAGE_TYPES.includes(reliableMimeType)) {
      return <ImageIcon />;
    } else if (VIDEO_TYPES.includes(reliableMimeType)) {
      return <VideoLibraryIcon />;
    } else if (AUDIO_TYPES.includes(reliableMimeType)) {
      return <FilePresentIcon />;
    } else if (PDF_TYPES.includes(reliableMimeType)) {
      return <PictureAsPdfIcon />;
    } else if (TEXT_TYPES.includes(reliableMimeType)) {
      return <DescriptionIcon />;
    } else if (CODE_TYPES.includes(reliableMimeType)) {
      return <CodeIcon />;
    } else if (DOCUMENT_TYPES.includes(reliableMimeType)) {
      return <ArticleIcon />;
    } else if (ARCHIVE_TYPES.includes(reliableMimeType)) {
      return <FilePresentIcon />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };

  // Get a human-readable file type description
  const getFileTypeDescription = (): string => {
    if (IMAGE_TYPES.includes(reliableMimeType)) {
      return 'Image';
    } else if (VIDEO_TYPES.includes(reliableMimeType)) {
      return 'Video';
    } else if (AUDIO_TYPES.includes(reliableMimeType)) {
      return 'Audio';
    } else if (PDF_TYPES.includes(reliableMimeType)) {
      return 'PDF Document';
    } else if (reliableMimeType === 'text/plain') {
      return 'Text File';
    } else if (reliableMimeType === 'text/html') {
      return 'HTML Document';
    } else if (reliableMimeType === 'text/csv') {
      return 'CSV File';
    } else if (reliableMimeType === 'text/markdown') {
      return 'Markdown Document';
    } else if (reliableMimeType === 'application/json') {
      return 'JSON File';
    } else if (reliableMimeType === 'application/xml' || reliableMimeType === 'text/xml') {
      return 'XML Document';
    } else if (reliableMimeType.includes('javascript') || reliableMimeType.includes('typescript')) {
      return 'Source Code';
    } else if (DOCUMENT_TYPES.includes(reliableMimeType)) {
      if (reliableMimeType.includes('word')) return 'Word Document';
      if (reliableMimeType.includes('excel') || reliableMimeType.includes('spreadsheet')) return 'Spreadsheet';
      if (reliableMimeType.includes('presentation') || reliableMimeType.includes('powerpoint')) return 'Presentation';
      return 'Office Document';
    } else if (ARCHIVE_TYPES.includes(reliableMimeType)) {
      return 'Archive File';
    }
    
    return 'File';
  };

  // Format code with syntax highlighting (basic version)
  const formatCode = (code: string): React.ReactNode => {
    if (!code) return null;
    
    // Basic syntax highlighting for demonstration
    // In a real app, you'd use a library like highlight.js or prism
    return (
      <Box
        component="pre"
        sx={{
          p: 2,
          maxHeight: 500,
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace'
        }}
      >
        {code}
      </Box>
    );
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
          <Alert 
            severity="error" 
            icon={<ErrorIcon />}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" paragraph>
            The attachment could not be loaded. You can try the following:
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                Download the file and open it with an appropriate application
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Check if you have the necessary permissions to view this attachment
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Ensure the attachment hasn't been deleted or moved
              </Typography>
            </li>
          </ul>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ mt: 2 }}
          >
            Download File
          </Button>
        </Box>
      );
    }
    
    // If format is not supported for preview
    if (unsupportedFormat) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 3 }}
          >
            Preview not available for this file format: {reliableMimeType}
          </Alert>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mb: 3
          }}>
            <Box sx={{ fontSize: 80, color: 'action.active', mb: 2 }}>
              {getFileTypeIcon()}
            </Box>
            <Typography variant="h6" gutterBottom>
              {getFileTypeDescription()}: {attachment.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formatFileSize(attachment.size)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            fullWidth
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download File
          </Button>
        </Box>
      );
    }
    
    // Image preview
    if (IMAGE_TYPES.includes(reliableMimeType) && attachmentUrl) {
      const imageContent = (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          <CardMedia
            component="img"
            image={attachmentUrl}
            alt={attachment.name}
            ref={imageRef}
            sx={{ 
              objectFit: 'contain',
              maxHeight: fullscreen ? '80vh' : 500,
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.2s ease-in-out'
            }}
          />
          
          {/* Zoom controls */}
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              borderRadius: 1,
              p: 0.5
            }}
          >
            <IconButton 
              size="small" 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              sx={{ color: 'white' }}
            >
              <ZoomOutIcon />
            </IconButton>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white', 
                alignSelf: 'center',
                minWidth: 40,
                textAlign: 'center'
              }}
            >
              {Math.round(zoomLevel * 100)}%
            </Typography>
            <IconButton 
              size="small" 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              sx={{ color: 'white' }}
            >
              <ZoomInIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={toggleFullscreen}
              sx={{ color: 'white' }}
            >
              <FullscreenIcon />
            </IconButton>
          </Stack>
        </Box>
      );
      
      // Return either fullscreen dialog or normal view
      return fullscreen ? (
        <Dialog
          open={fullscreen}
          onClose={toggleFullscreen}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            {attachment.name}
          </DialogTitle>
          <DialogContent>
            {imageContent}
          </DialogContent>
          <DialogActions>
            <Button onClick={toggleFullscreen}>Close</Button>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download
            </Button>
          </DialogActions>
        </Dialog>
      ) : imageContent;
    }
    
    // Video preview
    if (VIDEO_TYPES.includes(reliableMimeType) && attachmentUrl) {
      return (
        <Box sx={{ p: 2 }}>
          <video
            controls
            ref={videoRef}
            style={{ 
              width: '100%', 
              maxHeight: 500 
            }}
          >
            <source src={attachmentUrl} type={reliableMimeType} />
            Your browser does not support the video tag.
          </video>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Note: If the video doesn't play, your browser may not support the format. Try downloading the file.
          </Typography>
        </Box>
      );
    }
    
    // Audio preview
    if (AUDIO_TYPES.includes(reliableMimeType) && attachmentUrl) {
      return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ fontSize: 60, color: 'primary.main', mb: 3 }}>
            <FilePresentIcon fontSize="inherit" />
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Audio File: {attachment.name}
          </Typography>
          
          <Box sx={{ width: '100%', mb: 2 }}>
            <audio
              controls
              ref={audioRef}
              style={{ width: '100%' }}
            >
              <source src={attachmentUrl} type={reliableMimeType} />
              Your browser does not support the audio element.
            </audio>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Note: If the audio doesn't play, your browser may not support the format. Try downloading the file.
          </Typography>
        </Box>
      );
    }
    
    // PDF preview
    if (PDF_TYPES.includes(reliableMimeType) && attachmentUrl) {
      return (
        <Box sx={{ p: 2, height: 500 }}>
          <iframe
            src={`${attachmentUrl}#view=FitH`}
            title={attachment.name}
            width="100%"
            height="100%"
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            If the PDF doesn't display correctly, you can {' '}
            <Link 
              href={attachmentUrl} 
              target="_blank"
              rel="noopener noreferrer"
            >
              open it in a new tab
            </Link>
            {' '} or download it.
          </Typography>
        </Box>
      );
    }
    
    // Text preview - plain text files
    if (TEXT_TYPES.includes(reliableMimeType)) {
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
            wordBreak: 'break-word',
            fontFamily: 'monospace'
          }}
        >
          {attachmentData || 'No preview available'}
        </Box>
      );
    }
    
    // Code preview - JSON, XML, source code, etc.
    if (CODE_TYPES.includes(reliableMimeType)) {
      return formatCode(attachmentData || '');
    }
    
    // Generic file preview (fallback for unsupported types)
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
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {getFileTypeDescription()} - {formatFileSize(attachment.size)}
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
    
    parts.push(getFileTypeDescription());
    parts.push(formatFileSize(attachment.size));
    
    if ('uploadedBy' in attachment && attachment.uploadedBy) {
      parts.push(`Uploaded by: ${attachment.uploadedBy}`);
    }
    
    if ('uploadedAt' in attachment && attachment.uploadedAt) {
      const date = new Date(attachment.uploadedAt);
      parts.push(`on ${date.toLocaleDateString()}`);
    }
    
    return parts.join(' • ');
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
              <>
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
                <Tooltip title="View fullscreen">
                  <IconButton onClick={toggleFullscreen}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </>
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={detectedFileType || reliableMimeType}
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
          
          {unsupportedFormat && (
            <Chip
              label="Preview not available"
              size="small"
              color="warning"
              variant="outlined"
              icon={<VisibilityIcon fontSize="small" />}
            />
          )}
        </Box>
        
        {/* Zoom controls for the card view */}
        {(IMAGE_TYPES.includes(reliableMimeType) || PDF_TYPES.includes(reliableMimeType)) && !fullscreen && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ mx: 1 }}>
              {Math.round(zoomLevel * 100)}%
            </Typography>
            <IconButton 
              size="small" 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </CardActions>
    </Card>
  );
};