/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type IndicatorStatus = 'idle' | 'active' | 'warning' | 'error' | 'success';

export interface RealTimeIndicatorOptions {
  initialStatus?: IndicatorStatus;
  initialValue?: number;
  updateInterval?: number; // in milliseconds
  simulateActivity?: boolean;
  activityProbability?: number; // 0-1, probability of activity in simulation
  onUpdate?: (value: number, status: IndicatorStatus) => void;
}

export interface RealTimeIndicatorState {
  status: IndicatorStatus;
  value: number;
  isActive: boolean;
  lastUpdated: Date;
}

/**
 * Custom hook for managing real-time indicators with blinking effects
 * 
 * @param options Configuration options for the indicator
 * @returns Real-time indicator state and control functions
 */
export function useRealTimeIndicator(options: RealTimeIndicatorOptions = {}) {
  const {
    initialStatus = 'idle',
    initialValue = 0,
    updateInterval = 1000,
    simulateActivity = false,
    activityProbability = 0.3,
    onUpdate
  } = options;
  
  const [state, setState] = useState<RealTimeIndicatorState>({
    status: initialStatus,
    value: initialValue,
    isActive: initialStatus === 'active',
    lastUpdated: new Date()
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update the indicator state
  const updateIndicator = useCallback((value: number, status: IndicatorStatus) => {
    setState({
      status,
      value,
      isActive: status === 'active',
      lastUpdated: new Date()
    });
    
    if (onUpdate) {
      onUpdate(value, status);
    }
  }, [onUpdate]);
  
  // Setup simulator for demo/testing purposes
  useEffect(() => {
    if (!simulateActivity) return;
    
    // Clear any existing simulator
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }
    
    // Set up simulator to periodically update the status
    simulationRef.current = setInterval(() => {
      // Randomly decide whether to show activity based on probability
      const isActive = Math.random() < activityProbability;
      
      // Randomly select a status
      let newStatus: IndicatorStatus;
      const statusRoll = Math.random();
      
      if (statusRoll > 0.95) {
        newStatus = 'error';
      } else if (statusRoll > 0.85) {
        newStatus = 'warning';
      } else if (statusRoll > 0.7) {
        newStatus = 'success';
      } else {
        newStatus = isActive ? 'active' : 'idle';
      }
      
      // Generate a new random value (0-100)
      const newValue = Math.floor(Math.random() * 100);
      
      updateIndicator(newValue, newStatus);
    }, updateInterval);
    
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, [simulateActivity, activityProbability, updateInterval, updateIndicator]);
  
  // Setup periodic update check
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (!simulateActivity) {
      // For non-simulated mode, we can still check for updates
      intervalRef.current = setInterval(() => {
        // We don't modify state here, but we could check for external updates
        // and update state accordingly in a real application
      }, updateInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, simulateActivity]);
  
  // Manually set value and status
  const setValue = useCallback((value: number) => {
    setState(prev => ({
      ...prev,
      value,
      lastUpdated: new Date()
    }));
  }, []);
  
  // Set the status
  const setStatus = useCallback((status: IndicatorStatus) => {
    setState(prev => ({
      ...prev,
      status,
      isActive: status === 'active',
      lastUpdated: new Date()
    }));
  }, []);
  
  // Start blinking effect
  const startActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'active',
      isActive: true,
      lastUpdated: new Date()
    }));
  }, []);
  
  // Stop blinking effect
  const stopActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      status: prev.status === 'active' ? 'idle' : prev.status,
      lastUpdated: new Date()
    }));
  }, []);
  
  return {
    ...state,
    setValue,
    setStatus,
    startActivity,
    stopActivity,
    updateIndicator
  };
}