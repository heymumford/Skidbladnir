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
  Paper, 
  Typography, 
  useTheme, 
  styled, 
  Grid,
  Chip,
  alpha
} from '@mui/material';
import { useDesignSystem } from '../../utils/designSystem';

// Constants for styling
const BORDER_RADIUS = 24;
const HEADER_HEIGHT = 48;

// Styled components for LCARS panel
const RootContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isLcarsTheme'
})<{ isLcarsTheme: boolean }>(({ theme, isLcarsTheme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: isLcarsTheme ? `${BORDER_RADIUS}px` : theme.shape.borderRadius,
  transition: 'all 0.3s ease-in-out',
  backgroundImage: 'none',
}));

const Header = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'isLcarsTheme'
})<{ color: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error'; isLcarsTheme: boolean }>(
  ({ theme, color, isLcarsTheme }) => ({
    height: HEADER_HEIGHT,
    backgroundColor: theme.palette[color].main,
    color: theme.palette[color].contrastText,
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 3),
    borderTopLeftRadius: isLcarsTheme ? `${BORDER_RADIUS}px` : theme.shape.borderRadius,
    borderTopRightRadius: isLcarsTheme ? `${BORDER_RADIUS}px` : theme.shape.borderRadius,
    position: 'relative',
    
    // LCARS-specific styling
    '&::before': isLcarsTheme ? {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: '20%',
      backgroundColor: theme.palette[color].dark,
      borderTopLeftRadius: `${BORDER_RADIUS}px`,
    } : {},
    
    '&::after': isLcarsTheme ? {
      content: '""',
      position: 'absolute',
      right: 0,
      bottom: 0,
      height: '30%',
      width: '10%',
      backgroundColor: alpha(theme.palette[color].light, 0.3),
      borderTopLeftRadius: `${BORDER_RADIUS / 2}px`,
    } : {},
  })
);

const Content = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  position: 'relative',
}));

const BlinkingLight = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'color' && prop !== 'isLcarsTheme'
})<{ isActive: boolean; color: string; isLcarsTheme: boolean }>(
  ({ theme, isActive, color, isLcarsTheme }) => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: isActive ? color : alpha(color, 0.3),
    marginRight: theme.spacing(1),
    boxShadow: isActive ? `0 0 10px ${color}` : 'none',
    transition: 'all 0.3s ease-in-out',
    animation: isActive && isLcarsTheme ? `$blink 1.2s infinite alternate` : 'none',
    
    '@keyframes blink': {
      '0%': {
        opacity: 0.5,
        boxShadow: `0 0 5px ${color}`,
      },
      '100%': {
        opacity: 1,
        boxShadow: `0 0 15px ${color}, 0 0 20px ${color}`,
      },
    },
  })
);

const StatusIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  position: 'absolute',
  right: theme.spacing(3),
  top: '50%',
  transform: 'translateY(-50%)',
}));

export interface LcarsPanelProps {
  /**
   * Panel title
   */
  title: string;
  
  /**
   * Panel color scheme
   */
  color?: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';
  
  /**
   * Status text to display in the header
   */
  status?: string;
  
  /**
   * Status indicator color
   */
  statusColor?: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';
  
  /**
   * Whether the status indicator is active/blinking
   */
  statusActive?: boolean;
  
  /**
   * Optional subtitle for the panel
   */
  subtitle?: string;
  
  /**
   * Panel content
   */
  children: React.ReactNode;
  
  /**
   * Optional additional class name
   */
  className?: string;
  
  /**
   * Data test ID for testing
   */
  'data-testid'?: string;
}

/**
 * LCARS-inspired panel component that follows the design system
 * This component showcases the design principles of the application
 */
export const LcarsPanel: React.FC<LcarsPanelProps> = ({
  title,
  color = 'primary',
  status,
  statusColor = 'success',
  statusActive = false,
  subtitle,
  children,
  className,
  'data-testid': dataTestId = 'lcars-panel',
}) => {
  const theme = useTheme();
  const ds = useDesignSystem();
  const isLcarsTheme = ds.isLcarsTheme();
  const [isBlinking, setIsBlinking] = useState(statusActive);
  
  // Status color mapping
  const statusColorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
  };
  
  // Control blinking effect
  useEffect(() => {
    setIsBlinking(statusActive);
  }, [statusActive]);
  
  return (
    <RootContainer 
      elevation={isLcarsTheme ? 4 : 2} 
      className={className}
      isLcarsTheme={isLcarsTheme}
      data-testid={dataTestId}
    >
      <Header color={color} isLcarsTheme={isLcarsTheme} data-testid={`${dataTestId}-header`}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            fontWeight: 600,
            ml: isLcarsTheme ? '25%' : 0,
            position: 'relative',
            zIndex: 1
          }}
          data-testid={`${dataTestId}-title`}
        >
          {title}
        </Typography>
        
        {status && (
          <StatusIndicator data-testid={`${dataTestId}-status-container`}>
            <BlinkingLight 
              isActive={isBlinking} 
              color={statusColorMap[statusColor]} 
              isLcarsTheme={isLcarsTheme}
              data-testid={`${dataTestId}-status-indicator`}
            />
            <Chip 
              label={status} 
              color={statusColor} 
              size="small" 
              variant={isLcarsTheme ? "filled" : "outlined"}
              data-testid={`${dataTestId}-status-chip`}
            />
          </StatusIndicator>
        )}
      </Header>
      
      <Content data-testid={`${dataTestId}-content`}>
        {subtitle && (
          <Typography 
            variant="subtitle1" 
            color="textSecondary" 
            gutterBottom
            data-testid={`${dataTestId}-subtitle`}
          >
            {subtitle}
          </Typography>
        )}
        {children}
      </Content>
    </RootContainer>
  );
};

/**
 * Grid layout for LCARS panels
 */
export const LcarsPanelGrid: React.FC<{
  children: React.ReactNode;
  spacing?: number;
  'data-testid'?: string;
}> = ({ 
  children, 
  spacing = 3,
  'data-testid': dataTestId = 'lcars-panel-grid' 
}) => {
  return (
    <Grid 
      container 
      spacing={spacing} 
      data-testid={dataTestId}
    >
      {React.Children.map(children, (child, index) => (
        <Grid item xs={12} md={6} key={index} data-testid={`${dataTestId}-item-${index}`}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
};