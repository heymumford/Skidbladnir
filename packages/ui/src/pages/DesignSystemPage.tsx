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
  Paper, 
  Breadcrumbs,
  Link,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { DesignSystemVisualizer } from '../components/DesignSystem/DesignSystemVisualizer';
import { LcarsDashboard } from '../components/DesignSystem/LcarsDashboard';
import { ThemeToggle } from '../components/Layout/ThemeToggle';

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
      id={`design-system-tabpanel-${index}`}
      aria-labelledby={`design-system-tab-${index}`}
      {...other}
      style={{ paddingTop: 16 }}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
};

/**
 * Design System page that showcases the UI components and design principles
 */
export const DesignSystemPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Page header with breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Home
          </Link>
          <Typography color="primary">Design System</Typography>
        </Breadcrumbs>
        
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Skíðblaðnir Design System
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ThemeToggle />
            <Button 
              variant="outlined" 
              color="primary" 
              component="a" 
              href="/docs/ui/design-system.md" 
              target="_blank"
            >
              Documentation
            </Button>
          </Box>
        </Box>
        
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Visual language, components, and UI patterns that ensure consistency across the application.
        </Typography>
      </Box>
      
      {/* Introduction */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>Design System Purpose</AlertTitle>
        <Typography variant="body2">
          This design system defines the visual language, UI components, and patterns used throughout
          the Skíðblaðnir application. It ensures a consistent, beautiful, and usable experience for
          all users while speeding up development by providing reusable components and patterns.
        </Typography>
      </Alert>
      
      {/* Design Principles */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Consistency</Typography>
              <Typography variant="body2">
                All UI elements maintain consistent appearance and behavior across the application,
                creating a predictable experience for users. This includes consistent spacing, colors,
                typography, and interaction patterns.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Efficiency</Typography>
              <Typography variant="body2">
                The UI is designed to maximize user productivity with minimal clicks and intuitive
                workflows. Components are organized to support common tasks and guide users through
                complex processes with clear visual cues.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Beauty</Typography>
              <Typography variant="body2">
                Visual appeal is balanced with functionality, creating an interface that is both
                beautiful and usable. The LCARS-inspired theme provides a distinctive and engaging
                visual identity while maintaining usability.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabbed Design System Content */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 3, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h5">Design System Explorer</Typography>
          <Typography variant="body2" color="textSecondary">
            Explore the components, colors, typography, and spacing system
          </Typography>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="design system tabs">
            <Tab label="Components & Styles" />
            <Tab label="LCARS Dashboard Example" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <DesignSystemVisualizer />
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              LCARS-inspired Dashboard Example
            </Typography>
            <Typography variant="body2" paragraph color="textSecondary">
              This example showcases how the design system principles are applied to create a beautiful and 
              functional dashboard that follows LCARS (Library Computer Access/Retrieval System) design patterns.
              Try switching themes with the theme toggle in the header to see how the design adapts.
            </Typography>
            <Divider sx={{ my: 3 }} />
            <LcarsDashboard />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default DesignSystemPage;