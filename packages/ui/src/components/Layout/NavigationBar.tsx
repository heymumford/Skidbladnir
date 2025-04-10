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
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  IconButton, 
  Menu, 
  MenuItem, 
  Badge,
  styled
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useLocation, Link } from 'react-router-dom';

const Logo = styled('img')({
  height: 36,
  marginRight: 12,
});

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
}));

const StatusIndicator = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.success.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

export const NavigationBar: React.FC = () => {
  const location = useLocation();
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);

  // Determine the active tab based on the current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/providers')) return 0;
    if (path.includes('/mapping')) return 1;
    if (path.includes('/execution')) return 2;
    if (path.includes('/monitoring')) return 3;
    if (path.includes('/wizard')) return 4;
    if (path.includes('/transformation')) return 5;
    if (path.includes('/settings')) return 6;
    return 0; // Default to Providers tab
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  return (
    <StyledAppBar position="static" data-testid="navigation-bar">
      <Toolbar>
        <Logo src="/logo.png" alt="Skíðblaðnir Logo" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, marginRight: 4 }}>
          Skíðblaðnir
        </Typography>
        
        <Tabs 
          value={getActiveTab()} 
          aria-label="navigation tabs"
          sx={{ flexGrow: 1 }}
        >
          <Tab label="Providers" component={Link} to="/providers" />
          <Tab label="Mapping" component={Link} to="/mapping" />
          <Tab label="Execution" component={Link} to="/execution" />
          <Tab label="Monitoring" component={Link} to="/monitoring" />
          <Tab label="Migration Wizard" component={Link} to="/wizard" />
          <Tab label="Transformation" component={Link} to="/transformation" />
          <Tab label="Settings" component={Link} to="/settings" />
        </Tabs>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StatusIndicator
            overlap="circular"
            variant="dot"
            data-testid="status-indicator"
          >
            <CircleIcon color="action" fontSize="small" />
          </StatusIndicator>
          
          <IconButton 
            color="inherit" 
            onClick={handleSettingsClick}
            data-testid="settings-button"
            sx={{ ml: 2 }}
          >
            <SettingsIcon />
          </IconButton>
          
          <Menu
            anchorEl={settingsAnchorEl}
            open={Boolean(settingsAnchorEl)}
            onClose={handleSettingsClose}
            data-testid="settings-menu"
          >
            <MenuItem onClick={handleSettingsClose}>Profile</MenuItem>
            <MenuItem onClick={handleSettingsClose}>Preferences</MenuItem>
            <MenuItem onClick={handleSettingsClose}>About</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};