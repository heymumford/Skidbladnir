/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { createTheme } from '@mui/material/styles';

// Modern dark theme with blue accents
const darkColors = {
  primary: {
    main: '#4dabf5',
    light: '#80d8ff',
    dark: '#0077c2',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#7e57c2',
    light: '#b085f5',
    dark: '#4d2c91',
    contrastText: '#ffffff',
  },
  info: {
    main: '#29b6f6',
    light: '#73e8ff',
    dark: '#0086c3',
    contrastText: '#000000',
  },
  success: {
    main: '#66bb6a',
    light: '#98ee99',
    dark: '#338a3e',
    contrastText: '#000000',
  },
  warning: {
    main: '#ffa726',
    light: '#ffd95b',
    dark: '#c77800',
    contrastText: '#000000',
  },
  error: {
    main: '#ef5350',
    light: '#ff867c',
    dark: '#b61827',
    contrastText: '#ffffff',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0bec5',
    disabled: '#6e6e6e',
  },
};

// Create dark theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...darkColors,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 300,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontWeight: 300,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 400,
      letterSpacing: '0',
    },
    h4: {
      fontWeight: 400,
      letterSpacing: '0.01em',
    },
    h5: {
      fontWeight: 400,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      letterSpacing: '0.02em',
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
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '6px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
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
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
        },
      },
    },
  },
});