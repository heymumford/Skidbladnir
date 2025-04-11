/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material/styles';

/**
 * Type for spacing sizes available in the design system
 */
export type SpacingSize = 'tiny' | 'small' | 'medium' | 'large' | 'xl' | 'huge';

/**
 * Type for component sizing options
 */
export type ComponentSize = 'small' | 'medium' | 'large';

/**
 * Type for elevation levels in the design system
 */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 8 | 16 | 24;

/**
 * Gets spacing value based on design system naming conventions
 * @param theme The current theme
 * @param size The named size from the design system
 * @returns Spacing value in pixels (as a string with 'px' suffix)
 */
export const getSpacing = (theme: Theme, size: SpacingSize): string => {
  const spacingValues: Record<SpacingSize, number> = {
    tiny: 0.5,     // 4px
    small: 1,      // 8px
    medium: 2,     // 16px
    large: 3,      // 24px
    xl: 4,         // 32px
    huge: 6        // 48px
  };
  
  return `${theme.spacing(spacingValues[size])}`;
};

/**
 * Hook for accessing design system spacing
 * @returns Object with spacing functions
 */
export const useDesignSystem = () => {
  const theme = useTheme();
  
  return {
    /**
     * Get spacing value for a named size
     */
    spacing: (size: SpacingSize): string => getSpacing(theme, size),
    
    /**
     * Get font weight based on typography variant
     */
    getFontWeight: (variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'button'): number => {
      return theme.typography[variant].fontWeight as number;
    },
    
    /**
     * Get component width based on size
     */
    getComponentWidth: (size: ComponentSize): string => {
      switch (size) {
        case 'small': return '240px';
        case 'medium': return '360px';
        case 'large': return '480px';
        default: return '360px';
      }
    },
    
    /**
     * Get border radius based on component type
     */
    getBorderRadius: (componentType: 'button' | 'card' | 'chip' | 'panel' | 'input'): string => {
      switch (componentType) {
        case 'button': 
          // LCARS theme has more rounded buttons
          return theme.palette.mode === 'light' || theme.palette.mode === 'dark' ? '8px' : '24px';
        case 'card': return '16px';
        case 'chip': return '16px';
        case 'panel': return '16px';
        case 'input': return '4px';
        default: return '8px';
      }
    },
    
    /**
     * Get shadow for an elevation level
     */
    getShadow: (elevation: ElevationLevel): string => {
      return theme.shadows[elevation];
    },
    
    /**
     * Check if LCARS theme is active
     */
    isLcarsTheme: (): boolean => {
      return Boolean(theme.lcars);
    },
    
    /**
     * Get animation duration for elements
     */
    getAnimationDuration: (element: 'transition' | 'blinkingLight' | 'fadeIn' | 'fadeOut'): string => {
      switch (element) {
        case 'transition': return '300ms';
        case 'blinkingLight': 
          return theme.lcars ? theme.lcars.blinkingLight.animationDuration : '1.2s';
        case 'fadeIn': return '500ms';
        case 'fadeOut': return '300ms';
        default: return '300ms';
      }
    },
    
    /**
     * Create transition CSS for elements
     */
    createTransition: (properties: string[], duration: number = 300): string => {
      return properties.map(prop => `${prop} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`).join(', ');
    }
  };
};

/**
 * Validates color contrast meets accessibility standards
 * @param background Background color in hex format
 * @param foreground Foreground color in hex format
 * @returns Whether the contrast ratio meets WCAG AA standards (4.5:1 for normal text)
 */
export const validateColorContrast = (background: string, foreground: string): boolean => {
  // Convert hex colors to RGB
  const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
  // Calculate relative luminance
  const getLuminance = (color: { r: number, g: number, b: number }): number => {
    const rgb = [color.r, color.g, color.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  
  // Calculate contrast ratio
  const bgRgb = hexToRgb(background);
  const fgRgb = hexToRgb(foreground);
  const bgLuminance = getLuminance(bgRgb);
  const fgLuminance = getLuminance(fgRgb);
  
  const ratio = (Math.max(bgLuminance, fgLuminance) + 0.05) / (Math.min(bgLuminance, fgLuminance) + 0.05);
  
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  return ratio >= 4.5;
};

/**
 * Convenience function to get a design system class name
 * Useful for applying consistent styling based on design system rules
 * @param componentType The type of component
 * @param size Optional size variant
 * @param variant Optional style variant
 * @returns Class name string
 */
export const getDesignSystemClass = (
  componentType: 'button' | 'card' | 'panel' | 'input' | 'text',
  size?: 'small' | 'medium' | 'large',
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
): string => {
  const baseClass = `ds-${componentType}`;
  const sizeClass = size ? `ds-${componentType}--${size}` : '';
  const variantClass = variant ? `ds-${componentType}--${variant}` : '';
  
  return [baseClass, sizeClass, variantClass].filter(Boolean).join(' ');
};