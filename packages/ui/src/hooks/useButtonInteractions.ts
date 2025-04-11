/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useCallback } from 'react';

export interface ButtonInteractionOptions {
  onClick?: () => Promise<void> | void;
  loadingText?: string;
  onDoubleClick?: () => void;
  preventDoubleClick?: boolean;
  doubleClickDelay?: number; // in milliseconds
}

/**
 * Custom hook for handling button interactions including loading states and double-click
 * 
 * @param options Configuration options
 * @returns Button state and handlers
 */
export function useButtonInteractions(options: ButtonInteractionOptions = {}) {
  const {
    onClick,
    loadingText = 'Loading...',
    onDoubleClick,
    preventDoubleClick = false,
    doubleClickDelay = 300
  } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  // Handle button click with loading state
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Skip if already loading
    if (isLoading) return;
    
    // Handle double-click logic
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    if (preventDoubleClick && timeSinceLastClick < doubleClickDelay) {
      return;
    }
    
    // Track clicks for double-click detection
    if (onDoubleClick) {
      const newClickCount = (timeSinceLastClick < doubleClickDelay) ? clickCount + 1 : 1;
      setClickCount(newClickCount);
      setLastClickTime(now);
      
      // Execute double-click handler if threshold reached
      if (newClickCount === 2) {
        onDoubleClick();
        setClickCount(0);
        return;
      }
      
      // Reset click count after delay
      if (newClickCount === 1) {
        setTimeout(() => {
          setClickCount(0);
        }, doubleClickDelay);
      }
    }
    
    // Execute click handler if provided
    if (onClick) {
      try {
        setIsLoading(true);
        await onClick();
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading, clickCount, lastClickTime, onClick, onDoubleClick, preventDoubleClick, doubleClickDelay]);
  
  // Reset loading state
  const resetLoading = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  // Set loading state manually
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);
  
  return {
    isLoading,
    loadingText,
    handleClick,
    resetLoading,
    setLoading
  };
}