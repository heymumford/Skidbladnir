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
  Container, 
  Typography, 
  Box, 
  Paper,
  Alert,
  Snackbar,
  Button,
  styled,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SyncIcon from '@mui/icons-material/Sync';
import BuildIcon from '@mui/icons-material/Build';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';

import MigrationWizard from '../components/Execution/MigrationWizard';
import { migrationService } from '../services/MigrationService';

// LCARS-inspired styling components
const LcarsHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.contrastText,
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: '8px',
    width: '70%',
    backgroundColor: theme.palette.primary.main,
  }
}));

const LcarsPanel = styled(Paper)(({ theme }) => ({
  overflow: 'hidden',
  borderRadius: '24px',
  marginBottom: theme.spacing(4),
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
}));

const LcarsContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const BlinkingLight = styled(Box)<{ active: boolean; color: string }>(
  ({ theme, active, color }) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: active ? theme.palette[color].main : theme.palette.grey[500],
    marginRight: theme.spacing(1),
    animation: active ? `$blink 1.2s infinite alternate` : 'none',
    '@keyframes blink': {
      '0%': {
        opacity: 0.4,
      },
      '100%': {
        opacity: 1,
      },
    },
  })
);

const StatusDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: '16px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
}));

const drawerWidth = 240;

const LcarsDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundImage: `
      linear-gradient(to right, 
        ${theme.palette.primary.dark} 12px, 
        ${theme.palette.background.paper} 12px
      )
    `,
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const ModernWorkflowPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [migrationStarted, setMigrationStarted] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  
  // Handle migration wizard completion
  const handleWizardComplete = (config: any) => {
    console.log('Migration config:', config);
    
    // Mark wizard as completed
    setWizardCompleted(true);
    
    // Show success notification
    setSnackbarMessage('Migration configuration completed. Ready to start migration.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Handle starting the migration
  const handleStartMigration = () => {
    // In a real app, this would call the migration service
    // migrationService.startMigration(config);
    
    // Navigate to execution page to monitor progress
    setMigrationStarted(true);
    navigate('/execution');
  };
  
  // Handle wizard cancellation
  const handleWizardCancel = () => {
    // Show notification
    setSnackbarMessage('Migration configuration cancelled.');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Toggle drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Navigation Drawer */}
      <LcarsDrawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
      >
        <DrawerHeader>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>Navigation</Typography>
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          <ListItem button onClick={() => navigate('/')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button onClick={() => navigate('/workflow')} selected>
            <ListItemIcon>
              <SyncIcon />
            </ListItemIcon>
            <ListItemText primary="Migration Workflow" />
          </ListItem>
          <ListItem button onClick={() => navigate('/config')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Provider Config" />
          </ListItem>
        </List>
        <Divider />
        <List>
          <ListItem button onClick={() => window.open('/docs', '_blank')}>
            <ListItemIcon>
              <HelpOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Documentation" />
          </ListItem>
          <ListItem button onClick={() => navigate('/about')}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="About" />
          </ListItem>
        </List>
      </LcarsDrawer>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ mr: 2, ...(drawerOpen && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h4" component="h1">
            Test Case Migration Workflow
          </Typography>
        </Box>
        
        <LcarsPanel elevation={3}>
          <LcarsHeader>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SyncIcon sx={{ mr: 2 }} />
              <Typography variant="h5">
                Zephyr Scale → qTest Migration
              </Typography>
            </Box>
            
            <StatusDisplay>
              <BlinkingLight active={true} color="primary" />
              <Typography variant="body2">
                System Ready
              </Typography>
            </StatusDisplay>
          </LcarsHeader>
          
          <LcarsContent>
            {wizardCompleted ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  Migration Configuration Complete
                </Typography>
                <Typography variant="body1" paragraph>
                  Your migration is configured and ready to start. Click the button below to begin the migration process.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartMigration}
                  sx={{ mt: 2, borderRadius: '24px', px: 4 }}
                >
                  Start Migration
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                  You will be redirected to the monitoring page once the migration starts.
                </Typography>
              </Box>
            ) : (
              <MigrationWizard
                onComplete={handleWizardComplete}
                onCancel={handleWizardCancel}
              />
            )}
          </LcarsContent>
        </LcarsPanel>
      </Box>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ModernWorkflowPage;