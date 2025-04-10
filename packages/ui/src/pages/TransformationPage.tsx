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
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import GetAppIcon from '@mui/icons-material/GetApp';

import { TransformationInterface } from '../components/Transformation/TransformationInterface';
import { Provider, FieldMapping, MappingConfig } from '../types';

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
      id={`transformation-tabpanel-${index}`}
      aria-labelledby={`transformation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Mock providers for demonstration
const mockProviders: Provider[] = [
  { 
    id: 'zephyr', 
    name: 'Zephyr Scale', 
    version: '1.0', 
    icon: 'zephyr.png', 
    type: 'source',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  },
  { 
    id: 'qtest', 
    name: 'qTest Manager', 
    version: '2.0', 
    icon: 'qtest.png', 
    type: 'target',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  }
];

// Mock saved configurations
const mockSavedConfigs: MappingConfig[] = [
  {
    name: 'Zephyr to qTest - Basic Mapping',
    sourceProviderId: 'zephyr',
    targetProviderId: 'qtest',
    fieldMappings: [
      { sourceId: 'name', targetId: 'name', transformation: null },
      { sourceId: 'description', targetId: 'description', transformation: null },
      { sourceId: 'steps', targetId: 'testSteps', transformation: null },
      { sourceId: 'priority', targetId: 'priority', transformation: null },
      { sourceId: 'status', targetId: 'status', transformation: null }
    ]
  },
  {
    name: 'Zephyr to qTest - Complete Mapping',
    sourceProviderId: 'zephyr',
    targetProviderId: 'qtest',
    fieldMappings: [
      { sourceId: 'name', targetId: 'name', transformation: null },
      { sourceId: 'description', targetId: 'description', transformation: null },
      { sourceId: 'steps', targetId: 'testSteps', transformation: null },
      { sourceId: 'priority', targetId: 'priority', transformation: null },
      { sourceId: 'status', targetId: 'status', transformation: null },
      { sourceId: 'labels', targetId: 'tags', transformation: null },
      { sourceId: 'precondition', targetId: 'preconditions', transformation: null },
      { sourceId: 'component', targetId: 'module', transformation: null },
      { sourceId: 'owner', targetId: 'assignedTo', transformation: null }
    ]
  }
];

export const TransformationPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingConfigIndex, setEditingConfigIndex] = useState<number | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<MappingConfig[]>(mockSavedConfigs);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Start creating a new configuration
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingConfigIndex(null);
  };
  
  // Start editing an existing configuration
  const handleEditConfig = (index: number) => {
    setEditingConfigIndex(index);
    setIsCreatingNew(false);
  };
  
  // Delete a configuration
  const handleDeleteConfig = (index: number) => {
    const newConfigs = [...savedConfigs];
    newConfigs.splice(index, 1);
    setSavedConfigs(newConfigs);
  };
  
  // Save a configuration
  const handleSaveConfig = (mappings: FieldMapping[], config: MappingConfig) => {
    const newConfig = {
      ...config,
      fieldMappings: mappings
    };
    
    const newConfigs = [...savedConfigs];
    
    if (editingConfigIndex !== null) {
      // Update existing
      newConfigs[editingConfigIndex] = newConfig;
    } else {
      // Add new
      newConfigs.push(newConfig);
    }
    
    setSavedConfigs(newConfigs);
    setIsCreatingNew(false);
    setEditingConfigIndex(null);
  };
  
  // Cancel editing or creating
  const handleCancel = () => {
    setIsCreatingNew(false);
    setEditingConfigIndex(null);
  };
  
  // Import a configuration
  const handleImportConfig = () => {
    // In a real implementation, this would open a file dialog
    alert('Import functionality would be implemented here');
  };
  
  // If creating new or editing, show the transformation interface
  if (isCreatingNew) {
    return (
      <Container maxWidth="lg">
        <TransformationInterface
          sourceProvider={mockProviders.find(p => p.id === 'zephyr')!}
          targetProvider={mockProviders.find(p => p.id === 'qtest')!}
          onSave={handleSaveConfig}
          onClose={handleCancel}
        />
      </Container>
    );
  }
  
  if (editingConfigIndex !== null) {
    const config = savedConfigs[editingConfigIndex];
    return (
      <Container maxWidth="lg">
        <TransformationInterface
          sourceProvider={mockProviders.find(p => p.id === config.sourceProviderId)!}
          targetProvider={mockProviders.find(p => p.id === config.targetProviderId)!}
          initialMappings={config.fieldMappings}
          onSave={handleSaveConfig}
          onClose={handleCancel}
        />
      </Container>
    );
  }
  
  // Otherwise, show the saved configurations
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Data Transformation Interface
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Create and manage field-by-field transformations for test case migration
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Saved Configurations" />
          <Tab label="Templates" />
          <Tab label="Recent Transformations" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  Saved Transformation Configurations
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<SystemUpdateAltIcon />}
                    onClick={handleImportConfig}
                    sx={{ mr: 2 }}
                  >
                    Import
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateNew}
                  >
                    Create New
                  </Button>
                </Box>
              </Box>
            </Grid>
            
            {savedConfigs.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No saved configurations. Create your first one!
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              savedConfigs.map((config, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {config.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', mb: 2 }}>
                        <Chip 
                          label={mockProviders.find(p => p.id === config.sourceProviderId)?.name || config.sourceProviderId} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        <Typography sx={{ mx: 1 }}>→</Typography>
                        <Chip 
                          label={mockProviders.find(p => p.id === config.targetProviderId)?.name || config.targetProviderId} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {config.fieldMappings.length} field mappings
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">
                          Key Mappings:
                        </Typography>
                        <List dense>
                          {config.fieldMappings.slice(0, 3).map((mapping, idx) => (
                            <ListItem key={idx} disableGutters>
                              <ListItemText 
                                primary={`${mapping.sourceId} → ${mapping.targetId}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                              {mapping.transformation && (
                                <Chip 
                                  label="T" 
                                  size="small" 
                                  color="info" 
                                  sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                                  title="Has transformation"
                                />
                              )}
                            </ListItem>
                          ))}
                          {config.fieldMappings.length > 3 && (
                            <ListItem disableGutters>
                              <ListItemText 
                                primary={`... ${config.fieldMappings.length - 3} more`}
                                primaryTypographyProps={{ variant: 'body2', fontStyle: 'italic' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <IconButton size="small" title="Download">
                        <GetAppIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Share">
                        <ShareIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        title="Edit"
                        onClick={() => handleEditConfig(index)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        title="Delete" 
                        color="error"
                        onClick={() => handleDeleteConfig(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Template Configurations
          </Typography>
          <Typography variant="body1">
            Standard templates for common migration scenarios
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Zephyr → qTest: Basic
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Standard mapping for essential test case fields
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" startIcon={<EditIcon />}>
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Zephyr → qTest: Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comprehensive mapping with all standard fields
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" startIcon={<EditIcon />}>
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Zephyr → qTest: With Custom Fields
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Includes mappings for common custom fields
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" startIcon={<EditIcon />}>
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Recent Transformations
          </Typography>
          <Typography variant="body1">
            No recent transformations found
          </Typography>
        </TabPanel>
      </Paper>
    </Container>
  );
};
