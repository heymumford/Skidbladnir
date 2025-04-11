/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  FeatureFlagService, 
  DEFAULT_FEATURE_FLAGS, 
  FeatureFlag, 
  Feature
} from '../../../packages/common/src/utils/feature-flags';

// Context interface
interface FeatureFlagContextType {
  featureFlags: Record<string, FeatureFlag>;
  isEnabled: (feature: string) => boolean;
  updateFeatureFlag: (id: string, updates: Partial<FeatureFlag>) => void;
  setUserRoles: (roles: string[]) => void;
  setEnvironment: (environment: string) => void;
  getUserRoles: () => string[];
  getEnvironment: () => string;
  resetToDefaults: () => void;
}

// Create the context with default values
export const FeatureFlagContext = createContext<FeatureFlagContextType>({
  featureFlags: DEFAULT_FEATURE_FLAGS,
  isEnabled: () => false,
  updateFeatureFlag: () => {},
  setUserRoles: () => {},
  setEnvironment: () => {},
  getUserRoles: () => [],
  getEnvironment: () => 'development',
  resetToDefaults: () => {}
});

// Hook for accessing feature flags
export const useFeatureFlags = () => useContext(FeatureFlagContext);

// Simple hook to check if a feature is enabled
export const useFeature = (featureId: string): boolean => {
  const { isEnabled } = useContext(FeatureFlagContext);
  return isEnabled(featureId);
};

// Helper component to conditionally render based on feature flag
interface FeatureProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureFlag: React.FC<FeatureProps> = ({ 
  featureId, 
  children, 
  fallback = null 
}) => {
  const isEnabled = useFeature(featureId);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

// Provider component
interface FeatureFlagProviderProps {
  children: React.ReactNode;
  service?: FeatureFlagService;
  initialEnvironment?: string;
  initialUserRoles?: string[];
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  service = new FeatureFlagService(),
  initialEnvironment = 'development',
  initialUserRoles = []
}) => {
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>(
    service.getFeatureFlags()
  );
  
  // Initialize service with environment and roles
  useEffect(() => {
    service.setEnvironment(initialEnvironment);
    service.setUserRoles(initialUserRoles);
    setFeatureFlags(service.getFeatureFlags());
  }, [service, initialEnvironment, initialUserRoles]);
  
  // Check if a feature is enabled
  const isEnabled = (featureId: string): boolean => {
    return service.isEnabled(featureId);
  };
  
  // Update a feature flag
  const updateFeatureFlag = (id: string, updates: Partial<FeatureFlag>): void => {
    service.updateFeatureFlag(id, updates);
    setFeatureFlags(service.getFeatureFlags());
  };
  
  // Set user roles
  const setUserRoles = (roles: string[]): void => {
    service.setUserRoles(roles);
    setFeatureFlags({...service.getFeatureFlags()});
  };
  
  // Set environment
  const setEnvironment = (environment: string): void => {
    service.setEnvironment(environment);
    setFeatureFlags({...service.getFeatureFlags()});
  };
  
  // Get user roles
  const getUserRoles = (): string[] => {
    return service.getUserRoles();
  };
  
  // Get environment
  const getEnvironment = (): string => {
    return service.getEnvironment();
  };
  
  // Reset to defaults
  const resetToDefaults = (): void => {
    service.setFeatureFlags({...DEFAULT_FEATURE_FLAGS});
    setFeatureFlags(service.getFeatureFlags());
  };
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      featureFlags,
      isEnabled,
      updateFeatureFlag,
      setUserRoles,
      setEnvironment,
      getUserRoles,
      getEnvironment,
      resetToDefaults
    }),
    [featureFlags]
  );
  
  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};