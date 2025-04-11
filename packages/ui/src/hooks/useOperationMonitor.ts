/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useEffect, useCallback } from 'react';

// Types for operation status
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';
export type ResourceMetric = 'cpu' | 'memory' | 'disk' | 'network';

export interface OperationMetrics {
  resourceUsage: {
    [key in ResourceMetric]?: number; // percentage usage 0-100
  };
  bytesProcessed: number;
  itemsProcessed: number;
  estimatedTimeRemaining?: number; // in seconds
  warnings: number;
  errors: number;
  startTime?: Date;
  endTime?: Date;
  lastUpdated: Date;
}

export interface OperationMonitorOptions {
  operationId: string;
  initialStatus?: OperationStatus;
  initialProgress?: number;
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
  onRefresh?: (operationId: string) => Promise<OperationMetrics | null>;
  simulateUpdates?: boolean;
}

/**
 * Custom hook for monitoring real-time operation status and metrics
 * 
 * @param options Configuration options for the operation monitor
 * @returns Operation status, metrics, and control functions
 */
export function useOperationMonitor(options: OperationMonitorOptions) {
  const {
    operationId,
    initialStatus = 'pending',
    initialProgress = 0,
    refreshInterval = 3000,
    autoRefresh = true,
    onRefresh,
    simulateUpdates = false
  } = options;
  
  const [status, setStatus] = useState<OperationStatus>(initialStatus);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [metrics, setMetrics] = useState<OperationMetrics>({
    resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
    bytesProcessed: 0,
    itemsProcessed: 0,
    warnings: 0,
    errors: 0,
    lastUpdated: new Date()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Function to refresh the operation status and metrics
  const refreshOperation = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      if (onRefresh) {
        // If a refresh callback is provided, use it
        const updatedMetrics = await onRefresh(operationId);
        
        if (updatedMetrics) {
          setMetrics(updatedMetrics);
        }
      } else if (simulateUpdates) {
        // Simulate updates for testing/demo purposes
        if (status === 'running') {
          // Update progress randomly between 0.5% and 2%
          const progressIncrement = 0.5 + Math.random() * 1.5;
          const newProgress = Math.min(progress + progressIncrement, 100);
          setProgress(newProgress);
          
          // If we reach 100%, mark as completed
          if (newProgress >= 100) {
            setStatus('completed');
          }
          
          // Update metrics with random changes
          setMetrics(prev => {
            const newMetrics = { ...prev };
            
            // Update resource usage
            newMetrics.resourceUsage = {
              cpu: Math.min(95, Math.max(5, (prev.resourceUsage.cpu || 0) + (Math.random() * 10 - 5))),
              memory: Math.min(95, Math.max(5, (prev.resourceUsage.memory || 0) + (Math.random() * 6 - 3))),
              disk: Math.min(95, Math.max(5, (prev.resourceUsage.disk || 0) + (Math.random() * 4 - 2))),
              network: Math.min(95, Math.max(5, (prev.resourceUsage.network || 0) + (Math.random() * 15 - 7.5)))
            };
            
            // Update bytes processed
            newMetrics.bytesProcessed = prev.bytesProcessed + Math.floor(Math.random() * 1024 * 1024);
            
            // Update items processed
            newMetrics.itemsProcessed = prev.itemsProcessed + Math.floor(Math.random() * 10);
            
            // Update estimated time remaining
            const currentEta = prev.estimatedTimeRemaining || 300;
            newMetrics.estimatedTimeRemaining = Math.max(0, currentEta - 3 - Math.floor(Math.random() * 5));
            
            // Occasionally add warnings or errors
            if (Math.random() > 0.9) {
              newMetrics.warnings = prev.warnings + 1;
            }
            
            if (Math.random() > 0.95) {
              newMetrics.errors = prev.errors + 1;
            }
            
            newMetrics.lastUpdated = new Date();
            
            return newMetrics;
          });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [operationId, onRefresh, simulateUpdates, isRefreshing, status, progress]);
  
  // Set up automatic refreshes
  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      refreshOperation();
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, refreshOperation]);
  
  // Start the operation
  const startOperation = useCallback(() => {
    if (status === 'pending' || status === 'paused') {
      setStatus('running');
      
      // Set start time if not already set
      setMetrics(prev => {
        if (!prev.startTime) {
          return {
            ...prev,
            startTime: new Date(),
            lastUpdated: new Date()
          };
        }
        return prev;
      });
    }
  }, [status]);
  
  // Pause the operation
  const pauseOperation = useCallback(() => {
    if (status === 'running') {
      setStatus('paused');
      setMetrics(prev => ({
        ...prev,
        lastUpdated: new Date()
      }));
    }
  }, [status]);
  
  // Resume the operation
  const resumeOperation = useCallback(() => {
    if (status === 'paused') {
      setStatus('running');
      setMetrics(prev => ({
        ...prev,
        lastUpdated: new Date()
      }));
    }
  }, [status]);
  
  // Complete the operation
  const completeOperation = useCallback(() => {
    setStatus('completed');
    setProgress(100);
    
    // Set end time
    setMetrics(prev => ({
      ...prev,
      endTime: new Date(),
      estimatedTimeRemaining: 0,
      lastUpdated: new Date()
    }));
  }, []);
  
  // Fail the operation
  const failOperation = useCallback(() => {
    setStatus('failed');
    
    // Set end time
    setMetrics(prev => ({
      ...prev,
      endTime: new Date(),
      lastUpdated: new Date()
    }));
  }, []);
  
  // Update progress manually
  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    setMetrics(prev => ({
      ...prev,
      lastUpdated: new Date()
    }));
  }, []);
  
  return {
    operationId,
    status,
    progress,
    metrics,
    isRefreshing,
    refreshOperation,
    startOperation,
    pauseOperation,
    resumeOperation,
    completeOperation,
    failOperation,
    updateProgress
  };
}