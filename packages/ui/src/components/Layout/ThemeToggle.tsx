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
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  Typography, 
  styled, 
  useTheme as useMuiTheme,
  alpha
} from '@mui/material';
import { useThemeContext as useTheme } from '../../theme';
import { Palette as PaletteIcon, Check as CheckIcon } from '@mui/icons-material';

// Define available themes
const themes = [
  { id: 'lcars', name: 'LCARS', color: '#F1DF6F' },
  { id: 'dark', name: 'Dark', color: '#222244' },
  { id: 'light', name: 'Light', color: '#f5f5f5' },
];

const ColorSwatch = styled(Box)<{ color: string; isActive: boolean }>(({ color, isActive, theme }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: theme.spacing(1),
  position: 'relative',
  border: isActive ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  '&::before': isActive ? {
    content: '""',
    position: 'absolute',
    top: '-5px',
    left: '-5px',
    right: '-5px',
    bottom: '-5px',
    borderRadius: '50%',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
  } : {},
}));

interface ThemeToggleProps {
  /**
   * Callback when theme is changed
   */
  onThemeChange?: (themeId: string) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange }) => {
  const theme = useMuiTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentTheme, setTheme } = useTheme();
  
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId as 'lcars' | 'dark' | 'light');
    if (onThemeChange) onThemeChange(themeId);
    handleClose();
  };
  
  return (
    <>
      <Tooltip title="Change theme">
        <IconButton 
          color="inherit" 
          onClick={handleOpen}
          aria-label="change theme"
          data-testid="theme-toggle-button"
          sx={{ 
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              zIndex: 1,
            }
          }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        data-testid="theme-menu"
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            p: 1,
            minWidth: 180,
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ pl: 2, py: 1 }}>
          Select Theme
        </Typography>
        
        {themes.map((themeOption) => (
          <MenuItem 
            key={themeOption.id}
            onClick={() => handleThemeSelect(themeOption.id)}
            selected={currentTheme === themeOption.id}
            sx={{ 
              borderRadius: 1,
              my: 0.5,
            }}
            data-testid={`theme-option-${themeOption.id}`}
          >
            <ColorSwatch color={themeOption.color} isActive={currentTheme === themeOption.id} />
            <Typography variant="body2">
              {themeOption.name}
            </Typography>
            {currentTheme === themeOption.id && (
              <CheckIcon 
                fontSize="small" 
                color="primary" 
                sx={{ ml: 'auto' }} 
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};