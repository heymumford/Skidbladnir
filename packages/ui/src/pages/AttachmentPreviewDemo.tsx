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
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Tab,
  Tabs,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Divider,
  Alert
} from '@mui/material';
import { AttachmentPreview } from '../components/TestCase/AttachmentPreview';
import { TestCaseAttachment, TestExecutionAttachment } from '../services';

// Sample attachments representing different file types
const sampleAttachments: (TestCaseAttachment | TestExecutionAttachment)[] = [
  // Text file
  {
    id: 'att-1',
    name: 'requirements.txt',
    fileType: 'text/plain',
    size: 1024,
    description: 'Text file containing project requirements',
    uploadedBy: 'jane.doe@example.com',
    uploadedAt: '2025-01-15T08:30:00Z'
  },
  // Image file
  {
    id: 'att-2',
    name: 'screenshot.png',
    fileType: 'image/png',
    size: 153600,
    url: 'https://placehold.co/800x600/00CED1/FFF?text=Test+Screenshot',
    description: 'Screenshot of the login page'
  },
  // PDF file
  {
    id: 'att-3',
    name: 'test-report.pdf',
    fileType: 'application/pdf',
    size: 2457600,
    url: 'https://www.africau.edu/images/default/sample.pdf',
    description: 'PDF report of last test execution'
  },
  // Video file
  {
    id: 'att-4',
    name: 'demo-video.mp4',
    fileType: 'video/mp4',
    size: 5242880, // 5MB
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    description: 'Demo video showing the feature in action'
  },
  // Audio file
  {
    id: 'att-5',
    name: 'audio-recording.mp3',
    fileType: 'audio/mpeg',
    size: 1048576, // 1MB
    url: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav',
    description: 'Audio notes during testing'
  },
  // JSON file
  {
    id: 'att-6',
    name: 'api-response.json',
    fileType: 'application/json',
    size: 2048,
    description: 'Example API response for documentation',
    uploadedBy: 'john.smith@example.com',
    uploadedAt: '2025-01-16T14:45:00Z'
  },
  // Unsupported file type - ZIP
  {
    id: 'att-7',
    name: 'test-data.zip',
    fileType: 'application/zip',
    size: 10485760, // 10MB
    description: 'Compressed folder containing test data',
    uploadedBy: 'john.smith@example.com',
    uploadedAt: '2025-01-17T09:15:00Z'
  },
  // Word document
  {
    id: 'att-8',
    name: 'test-plan.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 5242880, // 5MB
    description: 'Test plan document with test cases and scenarios',
    uploadedBy: 'project.manager@example.com',
    uploadedAt: '2025-01-18T13:20:00Z'
  }
];

// Interface for the custom attachment form
interface CustomAttachmentForm {
  name: string;
  fileType: string;
  size: number;
  description: string;
  url?: string;
}

// Interface for tab panel
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`attachment-tabpanel-${index}`}
      aria-labelledby={`attachment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * Demo page for showcasing the AttachmentPreview component with different file types
 */
const AttachmentPreviewDemo: React.FC = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number>(0);
  const [customAttachment, setCustomAttachment] = useState<CustomAttachmentForm>({
    name: 'custom-file.txt',
    fileType: 'text/plain',
    size: 1024,
    description: 'Custom test attachment',
    url: ''
  });
  const [includeExecutionId, setIncludeExecutionId] = useState<boolean>(false);
  const [includeTestCaseId, setIncludeTestCaseId] = useState<boolean>(false);
  const [downloadCount, setDownloadCount] = useState<number>(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTabIndex(newValue);
  };

  // Handle sample attachment selection
  const handleAttachmentChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedAttachmentIndex(event.target.value as number);
  };

  // Handle custom attachment form change
  const handleCustomAttachmentChange = (field: keyof CustomAttachmentForm) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    let value = event.target.value;
    
    // Convert size to number
    if (field === 'size') {
      value = Number(value);
    }
    
    setCustomAttachment({
      ...customAttachment,
      [field]: value
    });
  };

  // Handle download callback
  const handleDownload = (attachment: TestCaseAttachment | TestExecutionAttachment) => {
    setDownloadCount(prev => prev + 1);
    console.log(`Downloading attachment: ${attachment.name}`);
  };

  // Get the currently selected attachment
  const selectedAttachment = selectedTabIndex === 0 
    ? sampleAttachments[selectedAttachmentIndex]
    : {
        id: 'custom-att',
        name: customAttachment.name,
        fileType: customAttachment.fileType,
        size: customAttachment.size,
        description: customAttachment.description,
        url: customAttachment.url || undefined
      };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Attachment Previewer Demo
      </Typography>
      
      <Typography variant="body1" paragraph>
        This demo showcases the enhanced attachment previewer component that handles different file types, 
        providing appropriate previews based on the file's MIME type.
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        The component detects and properly handles various file types including images, videos, audio, PDFs, 
        text files, code files, and more. For unsupported formats, a download option is provided.
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Attachment Settings
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={selectedTabIndex} onChange={handleTabChange}>
                <Tab label="Sample Attachments" />
                <Tab label="Custom Attachment" />
              </Tabs>
            </Box>
            
            <TabPanel value={selectedTabIndex} index={0}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="attachment-select-label">Select Attachment</InputLabel>
                <Select
                  labelId="attachment-select-label"
                  value={selectedAttachmentIndex}
                  onChange={handleAttachmentChange}
                  label="Select Attachment"
                >
                  {sampleAttachments.map((att, index) => (
                    <MenuItem key={att.id} value={index}>
                      {att.name} ({att.fileType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Current Selection:
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="body2">
                    <strong>Name:</strong> {sampleAttachments[selectedAttachmentIndex].name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {sampleAttachments[selectedAttachmentIndex].fileType}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Size:</strong> {sampleAttachments[selectedAttachmentIndex].size} bytes
                  </Typography>
                  {sampleAttachments[selectedAttachmentIndex].description && (
                    <Typography variant="body2">
                      <strong>Description:</strong> {sampleAttachments[selectedAttachmentIndex].description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </TabPanel>
            
            <TabPanel value={selectedTabIndex} index={1}>
              <Box component="form" noValidate autoComplete="off">
                <TextField
                  fullWidth
                  margin="normal"
                  label="File Name"
                  value={customAttachment.name}
                  onChange={handleCustomAttachmentChange('name')}
                  helperText="Name with extension (e.g., image.png)"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel id="filetype-select-label">File Type</InputLabel>
                  <Select
                    labelId="filetype-select-label"
                    value={customAttachment.fileType}
                    onChange={handleCustomAttachmentChange('fileType')}
                    label="File Type"
                  >
                    <MenuItem value="text/plain">Text File (text/plain)</MenuItem>
                    <MenuItem value="image/png">PNG Image (image/png)</MenuItem>
                    <MenuItem value="image/jpeg">JPEG Image (image/jpeg)</MenuItem>
                    <MenuItem value="application/pdf">PDF Document (application/pdf)</MenuItem>
                    <MenuItem value="video/mp4">MP4 Video (video/mp4)</MenuItem>
                    <MenuItem value="audio/mpeg">MP3 Audio (audio/mpeg)</MenuItem>
                    <MenuItem value="application/json">JSON File (application/json)</MenuItem>
                    <MenuItem value="application/xml">XML File (application/xml)</MenuItem>
                    <MenuItem value="application/zip">ZIP Archive (application/zip)</MenuItem>
                    <MenuItem value="application/msword">Word Document (application/msword)</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="File Size (bytes)"
                  type="number"
                  value={customAttachment.size}
                  onChange={handleCustomAttachmentChange('size')}
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Description"
                  value={customAttachment.description}
                  onChange={handleCustomAttachmentChange('description')}
                  multiline
                  rows={2}
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="URL (optional)"
                  value={customAttachment.url}
                  onChange={handleCustomAttachmentChange('url')}
                  helperText="Public URL for the file (leave empty for mock file)"
                />
              </Box>
            </TabPanel>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Test Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={includeExecutionId}
                  onChange={(e) => setIncludeExecutionId(e.target.checked)}
                />
              }
              label="Include Execution ID"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={includeTestCaseId}
                  onChange={(e) => setIncludeTestCaseId(e.target.checked)}
                />
              }
              label="Include Test Case ID"
            />
            
            {downloadCount > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Download clicked {downloadCount} time{downloadCount !== 1 ? 's' : ''}
              </Alert>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Attachment Preview
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <AttachmentPreview
                attachment={selectedAttachment}
                executionId={includeExecutionId ? 'exec-123' : undefined}
                testCaseId={includeTestCaseId ? 'tc-456' : undefined}
                onDownload={handleDownload}
              />
            </Box>
          </Paper>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Key Features:
            </Typography>
            <ul>
              <li>Reliable file type detection with extension-based fallback</li>
              <li>Rich previews for images, videos, audio, PDF, and text files</li>
              <li>User-friendly fallback for unsupported formats</li>
              <li>Zoom and fullscreen options for visual content</li>
              <li>Download functionality with callback support</li>
              <li>Responsive design with appropriate layout for each file type</li>
              <li>Handles broken/missing files with helpful error suggestions</li>
              <li>Clear metadata display with human-readable file types</li>
            </ul>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AttachmentPreviewDemo;