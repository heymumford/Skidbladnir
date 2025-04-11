/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Box, keyframes, styled, useTheme } from '@mui/material';

// Define the operation states
export type StatusLightState = 
  | 'idle'
  | 'active' 
  | 'warning' 
  | 'error' 
  | 'success' 
  | 'pending'
  | 'paused'
  | 'completed'
  | 'running'
  | 'failed'
  | 'cancelled';

// Define color variants
export type StatusLightColor = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'amber'
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'cyan'
  | 'orange';

// Define size options
export type StatusLightSize = 'small' | 'medium' | 'large';

// Component props
export interface LcarsStatusLightProps {
  state?: StatusLightState;
  color?: StatusLightColor;
  size?: StatusLightSize;
  blinking?: boolean;
  pulseEffect?: boolean;
  customColor?: string;
  className?: string;
  'data-testid'?: string;
}

// Define keyframes animations for different effects
const blink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 3px 1px currentColor; }
  50% { box-shadow: 0 0 8px 2px currentColor; }
  100% { box-shadow: 0 0 3px 1px currentColor; }
`;

// Map state to default color if none provided
const getColorForState = (state: StatusLightState): StatusLightColor => {
  switch (state) {
    case 'idle': return 'info';
    case 'active':
    case 'running': return 'green';
    case 'warning':
    case 'paused': return 'amber';
    case 'error':
    case 'failed': return 'red';
    case 'success':
    case 'completed': return 'blue';
    case 'pending': return 'cyan';
    case 'cancelled': return 'default';
    default: return 'info';
  }
};

// The actual color values (matches with theme when possible)
const getColorValue = (color: StatusLightColor, theme: any): string => {
  switch (color) {
    case 'primary': return theme.palette.primary.main;
    case 'secondary': return theme.palette.secondary.main;
    case 'success': return theme.palette.success.main;
    case 'warning': return theme.palette.warning.main;
    case 'error': return theme.palette.error.main;
    case 'info': return theme.palette.info.main;
    case 'amber': return '#F1DF6F'; // LCARS signature amber
    case 'blue': return '#9999FF'; // LCARS blue
    case 'green': return '#2DFF2D'; // LCARS green
    case 'red': return '#FF2D2D';   // LCARS red
    case 'purple': return '#CC99CC'; // LCARS purple
    case 'cyan': return '#99CCFF';  // LCARS cyan
    case 'orange': return '#FFCC99'; // LCARS orange
    default: return theme.palette.grey[400];
  }
};

// Map size to actual dimensions
const getSizeValues = (size: StatusLightSize): { width: number; height: number; borderRadius: number } => {
  switch (size) {
    case 'small': return { width: 8, height: 8, borderRadius: 4 };
    case 'large': return { width: 16, height: 16, borderRadius: 8 };
    case 'medium':
    default: return { width: 12, height: 12, borderRadius: 6 };
  }
};

// Create the styled component
const StatusIndicator = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'state' && 
    prop !== 'colorValue' && 
    prop !== 'isBlinking' && 
    prop !== 'hasPulse' &&
    prop !== 'lightSize'
})<{ 
  state: StatusLightState; 
  colorValue: string; 
  isBlinking: boolean; 
  hasPulse: boolean;
  lightSize: { width: number; height: number; borderRadius: number }
}>(({ theme, state, colorValue, isBlinking, hasPulse, lightSize }) => {
  // Determine if this state should blink by default
  // Active states blink by default unless overridden
  const shouldBlink = isBlinking !== false && 
    (isBlinking || state === 'active' || state === 'running' || state === 'warning');
  
  // Get animation properties based on state and props
  const getAnimation = () => {
    if (shouldBlink) {
      return `${blink} ${theme.lcars?.blinkingLight.animationDuration || '1.2s'} infinite`;
    }
    if (hasPulse) {
      return `${pulse} 2s infinite ease-in-out`;
    }
    return 'none';
  };

  return {
    width: lightSize.width,
    height: lightSize.height,
    borderRadius: lightSize.borderRadius,
    backgroundColor: colorValue,
    display: 'inline-block',
    transition: 'background-color 0.3s ease',
    boxShadow: `0 0 5px 1px ${colorValue}`,
    animation: getAnimation(),
    // Additional glow effect for active states
    ...(state === 'active' || state === 'running' ? {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: lightSize.borderRadius,
        boxShadow: `0 0 8px 2px ${colorValue}`,
        animation: `${glow} 2s infinite ease-in-out`,
        opacity: 0.7,
      }
    } : {})
  };
});

/**
 * LCARS Status Light Component
 * 
 * A reusable component that displays a status indicator with LCARS styling.
 * Supports different states, colors, sizes, and animation effects.
 */
export const LcarsStatusLight: React.FC<LcarsStatusLightProps> = ({
  state = 'idle',
  color,
  size = 'medium',
  blinking,
  pulseEffect = false,
  customColor,
  className,
  'data-testid': testId = 'lcars-status-light',
}) => {
  const theme = useTheme();
  
  // Determine the color to use
  const resolvedColor = color || getColorForState(state);
  const colorValue = customColor || getColorValue(resolvedColor, theme);
  
  // Determine the size dimensions
  const lightSize = getSizeValues(size);
  
  return (
    <StatusIndicator
      state={state}
      colorValue={colorValue}
      isBlinking={blinking}
      hasPulse={pulseEffect}
      lightSize={lightSize}
      className={className}
      data-testid={testId}
    />
  );
};

export default LcarsStatusLight;