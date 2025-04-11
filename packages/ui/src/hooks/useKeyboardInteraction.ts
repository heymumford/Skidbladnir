/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useCallback, useRef, useEffect, useState } from 'react';

export interface KeyboardInteractionOptions {
  enterKeyHandler?: () => void;
  escapeKeyHandler?: () => void;
  spaceKeyHandler?: () => void;
  arrowKeyHandlers?: {
    up?: () => void;
    down?: () => void;
    left?: () => void;
    right?: () => void;
  };
  tabTrapping?: boolean;
  autoFocus?: boolean;
}

/**
 * Custom hook for handling keyboard interactions and accessibility
 * 
 * @param options Configuration options
 * @returns Keyboard interaction handlers and refs
 */
export function useKeyboardInteraction(options: KeyboardInteractionOptions = {}) {
  const {
    enterKeyHandler,
    escapeKeyHandler,
    spaceKeyHandler,
    arrowKeyHandlers,
    tabTrapping = false,
    autoFocus = false
  } = options;
  
  const containerRef = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (enterKeyHandler) {
          e.preventDefault();
          enterKeyHandler();
        }
        break;
      case 'Escape':
        if (escapeKeyHandler) {
          e.preventDefault();
          escapeKeyHandler();
        }
        break;
      case ' ':
        if (spaceKeyHandler) {
          e.preventDefault();
          spaceKeyHandler();
        }
        break;
      case 'ArrowUp':
        if (arrowKeyHandlers?.up) {
          e.preventDefault();
          arrowKeyHandlers.up();
        }
        break;
      case 'ArrowDown':
        if (arrowKeyHandlers?.down) {
          e.preventDefault();
          arrowKeyHandlers.down();
        }
        break;
      case 'ArrowLeft':
        if (arrowKeyHandlers?.left) {
          e.preventDefault();
          arrowKeyHandlers.left();
        }
        break;
      case 'ArrowRight':
        if (arrowKeyHandlers?.right) {
          e.preventDefault();
          arrowKeyHandlers.right();
        }
        break;
      default:
        break;
    }
  }, [enterKeyHandler, escapeKeyHandler, spaceKeyHandler, arrowKeyHandlers]);
  
  // Handle tab trapping within a container
  useEffect(() => {
    if (!tabTrapping || !containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;
      
      // Get all focusable elements
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      // Handle tab and shift+tab to trap focus
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    // Add event listener for tab key
    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [tabTrapping]);
  
  // Auto-focus the first focusable element
  useEffect(() => {
    if (!autoFocus || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
      setIsFocused(true);
    }
  }, [autoFocus]);
  
  // Focus the container
  const focusContainer = useCallback(() => {
    if (containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
        setIsFocused(true);
      } else {
        containerRef.current.focus();
        setIsFocused(true);
      }
    }
  }, []);
  
  return {
    containerRef,
    isFocused,
    handleKeyDown,
    focusContainer,
    keyHandlers: {
      onKeyDown: handleKeyDown
    }
  };
}