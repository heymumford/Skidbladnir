/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import { Container, Typography, Box, Breadcrumbs, Link, Divider, Button, Paper } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';

import { RealTimeMigrationDashboard } from '../components/Monitoring/RealTimeMigrationDashboard';

export const RealTimeDashboardPage: React.FC = () => {
  const { migrationId = 'migration-1' } = useParams<{ migrationId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Handle pause function
  const handlePause = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Paused migration:', migrationId);
    } finally {
      setLoading(false);
    }
    
    return Promise.resolve();
  };
  
  // Handle resume function
  const handleResume = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Resumed migration:', migrationId);
    } finally {
      setLoading(false);
    }
    
    return Promise.resolve();
  };
  
  // Handle cancel function
  const handleCancel = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Cancelled migration:', migrationId);
    } finally {
      setLoading(false);
    }
    
    return Promise.resolve();
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 8 }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Real-Time Migration Dashboard
        </Typography>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link 
            color="inherit" 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
            Home
          </Link>
          <Link
            color="inherit"
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/migrations'); }}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <DashboardIcon sx={{ mr: 0.5 }} fontSize="small" />
            Migrations
          </Link>
          <Typography color="text.primary">
            Migration {migrationId}
          </Typography>
        </Breadcrumbs>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Monitor the real-time progress of your test case migration with detailed metrics, operation dependencies, and resource usage.
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Main content */}
      <Box sx={{ mb: 4 }}>
        <RealTimeMigrationDashboard 
          migrationId={migrationId}
          autoRefresh={true}
          refreshInterval={5000}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          simulationMode={true}
        />
      </Box>
    </Container>
  );
};