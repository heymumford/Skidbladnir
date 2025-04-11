/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useCallback, useRef } from 'react';

export interface DragAndDropOptions<T = unknown> {
  onDrop?: (data: T, event: React.DragEvent<HTMLElement>) => void;
  onDragStart?: (data: T, event: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLElement>) => void;
  acceptTypes?: string[];
}

/**
 * Custom hook for handling drag and drop interactions
 * 
 * @param options Configuration options
 * @returns Drag and drop handlers and state
 */
export function useDragAndDrop<T = unknown>(options: DragAndDropOptions<T> = {}) {
  const {
    onDrop,
    onDragStart,
    onDragOver,
    onDragEnd,
    acceptTypes
  } = options;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDataRef = useRef<T | null>(null);
  
  // Handle drag start
  const handleDragStart = useCallback((event: React.DragEvent<HTMLElement>, data: T) => {
    dragDataRef.current = data;
    setIsDragging(true);
    
    // Set the drag data in the event
    if (typeof data === 'string') {
      event.dataTransfer.setData('text/plain', data);
    } else if (data !== null && data !== undefined) {
      try {
        event.dataTransfer.setData('application/json', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to stringify drag data', e);
      }
    }
    
    // Call the onDragStart callback if provided
    if (onDragStart) {
      onDragStart(data, event);
    }
  }, [onDragStart]);
  
  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    
    // Check if the dragged item is of an accepted type
    if (acceptTypes && acceptTypes.length > 0) {
      const isAccepted = acceptTypes.some(type => event.dataTransfer.types.includes(type));
      if (!isAccepted) return;
    }
    
    setIsDragOver(true);
    
    // Call the onDragOver callback if provided
    if (onDragOver) {
      onDragOver(event);
    }
  }, [acceptTypes, onDragOver]);
  
  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback((event: React.DragEvent<HTMLElement>) => {
    setIsDragging(false);
    dragDataRef.current = null;
    
    // Call the onDragEnd callback if provided
    if (onDragEnd) {
      onDragEnd(event);
    }
  }, [onDragEnd]);
  
  // Handle drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    let data: T | null = null;
    
    // Try to extract the data from the event
    try {
      const jsonData = event.dataTransfer.getData('application/json');
      if (jsonData) {
        data = JSON.parse(jsonData) as T;
      } else {
        const textData = event.dataTransfer.getData('text/plain');
        if (textData) {
          data = textData as unknown as T;
        }
      }
    } catch (e) {
      console.error('Failed to parse drop data', e);
    }
    
    // Use the data from dragDataRef if we couldn't extract it from the event
    if (data === null && dragDataRef.current !== null) {
      data = dragDataRef.current;
    }
    
    // Call the onDrop callback if provided and we have data
    if (onDrop && data !== null) {
      onDrop(data, event);
    }
  }, [onDrop]);
  
  return {
    isDragging,
    isDragOver,
    dragHandlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDragEnd: handleDragEnd,
      onDrop: handleDrop
    },
    startDrag: (event: React.DragEvent<HTMLElement>, data: T) => handleDragStart(event, data)
  };
}