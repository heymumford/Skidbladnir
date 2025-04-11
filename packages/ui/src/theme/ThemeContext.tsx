/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { createContext, useState, useContext, useMemo } from 'react';
import { createTheme, Theme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lcarsThemeExtended } from './lcarsTheme';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';

// Theme types
type ThemeMode = 'lcars' | 'dark' | 'light';

// Context type
interface ThemeContextType {
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

// Create context
export const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'lcars',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Custom hook to use the theme context
export const useThemeContext = () => useContext(ThemeContext);

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('lcars');
  
  // Get the appropriate theme object
  const theme = useMemo(() => {
    switch (currentTheme) {
      case 'lcars':
        return lcarsThemeExtended;
      case 'dark':
        return darkTheme;
      case 'light':
        return lightTheme;
      default:
        return lcarsThemeExtended;
    }
  }, [currentTheme]);
  
  // Function to set theme
  const setTheme = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    // Save preference to localStorage
    localStorage.setItem('skidbladnir-theme', theme);
  };
  
  // Function to toggle between themes
  const toggleTheme = () => {
    const nextTheme = currentTheme === 'lcars' 
      ? 'dark'
      : currentTheme === 'dark' 
        ? 'light' 
        : 'lcars';
    setTheme(nextTheme);
  };
  
  // Context value
  const contextValue = useMemo(() => ({
    currentTheme,
    setTheme,
    toggleTheme,
  }), [currentTheme]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};