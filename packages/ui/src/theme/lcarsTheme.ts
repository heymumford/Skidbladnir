/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { createTheme, Theme } from '@mui/material/styles';

// LCARS-inspired color palette
// Based on Star Trek LCARS (Library Computer Access/Retrieval System) interface
const lcarsColors = {
  primary: {
    main: '#F1DF6F',      // Main yellow/gold color
    light: '#FFF4B8',
    dark: '#D0B32C',
    contrastText: '#000000',
  },
  secondary: {
    main: '#CC6666',      // Reddish orange
    light: '#FF9999',
    dark: '#993333',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#9999CC',      // Blue/purple
    light: '#CCCCFF',
    dark: '#666699',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#99CC99',      // Green
    light: '#CCFFCC',
    dark: '#669966',
    contrastText: '#000000',
  },
  warning: {
    main: '#FFCC66',      // Amber
    light: '#FFEE99',
    dark: '#CC9933',
    contrastText: '#000000',
  },
  error: {
    main: '#FF6666',      // Red
    light: '#FF9999',
    dark: '#CC3333',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#111133',   // Dark blue background
    paper: '#222244',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCDD',
    disabled: '#777788',
  },
};

// Create the LCARS theme
export const lcarsTheme = createTheme({
  palette: {
    mode: 'dark',
    ...lcarsColors,
  },
  typography: {
    fontFamily: '"Quicksand", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: 'hidden',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          paddingBottom: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          paddingTop: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          marginRight: 0,
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontWeight: 600,
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': {
            color: lcarsColors.primary.main,
          },
          '&.Mui-completed': {
            color: lcarsColors.success.main,
          },
        },
      },
    },
  },
});

// Extend the theme with custom properties if needed
declare module '@mui/material/styles' {
  interface Theme {
    lcars?: {
      blinkingLight: {
        animationDuration: string;
      };
    };
  }
  
  interface ThemeOptions {
    lcars?: {
      blinkingLight: {
        animationDuration: string;
      };
    };
  }
}

// Add custom LCARS properties
export const lcarsThemeExtended = createTheme({
  ...lcarsTheme,
  lcars: {
    blinkingLight: {
      animationDuration: '1.2s',
    },
  },
});