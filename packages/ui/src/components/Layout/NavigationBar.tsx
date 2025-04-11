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
  Dashboard as DashboardIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { ThemeToggle } from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useLocation, Link } from 'react-router-dom';
import { useFeatureFlags } from '../../context/FeatureFlagContext';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // Determine the active tab based on the current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/workflow')) return 0;
    if (path.includes('/providers')) return 1;
    if (path.includes('/mapping')) return 2;
    if (path.includes('/execution')) return 3;
    if (path.includes('/monitoring')) return 4;
    if (path.includes('/wizard')) return 5;
    if (path.includes('/transformation-preview')) return 7;
    if (path.includes('/transformation')) return 6;
    if (path.includes('/settings')) return 8;
    if (path.includes('/zephyr-qtest-demo')) return 9;
    if (path.includes('/admin/features')) return -1; // Feature flags doesn't have a tab
    return 0; // Default to Workflow tab
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  // Use feature flags for conditional UI
  const { isEnabled } = useFeatureFlags();
  
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
          <Tab label={t('migration.title')} component={Link} to="/workflow" />
          <Tab label={t('providers.common.connectionDetails')} component={Link} to="/providers" />
          <Tab label={t('fieldMapping.title')} component={Link} to="/mapping" />
          <Tab label={t('migration.startMigration')} component={Link} to="/execution" />
          <Tab label={t('migration.migrationStatus')} component={Link} to="/monitoring" />
          <Tab label={t('migration.title')} component={Link} to="/wizard" />
          <Tab label={t('fieldMapping.transform')} component={Link} to="/transformation" />
          <Tab label={t('fieldMapping.preview')} component={Link} to="/transformation-preview" />
          <Tab label={t('ui.theme')} component={Link} to="/settings" />
          <Tab label="Z→Q Demo" component={Link} to="/zephyr-qtest-demo" />
        </Tabs>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StatusIndicator
            overlap="circular"
            variant="dot"
            data-testid="status-indicator"
          >
            <CircleIcon color="action" fontSize="small" />
          </StatusIndicator>

          <Box sx={{ mx: 1 }}>
            <LanguageSelector />
          </Box>
          
          <ThemeToggle />
          
          <IconButton 
            component={Link} 
            to="/admin/features"
            color="inherit"
            sx={{ ml: 1 }}
            title="Feature Flags"
          >
            <FlagIcon />
          </IconButton>
          
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
            <MenuItem onClick={handleSettingsClose}>{t('common.actions.edit')} {t('ui.profile')}</MenuItem>
            <MenuItem onClick={handleSettingsClose}>{t('ui.preferences')}</MenuItem>
            <MenuItem onClick={handleSettingsClose} component={Link} to="/design-system">{t('ui.designSystem')}</MenuItem>
            <MenuItem onClick={handleSettingsClose} component={Link} to="/admin/features">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlagIcon fontSize="small" />
                {t('ui.featureFlags')}
              </Box>
            </MenuItem>
            <MenuItem onClick={handleSettingsClose}>{t('ui.about')}</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};