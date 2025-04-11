/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Feature Flags System
 * 
 * This module provides a flexible feature flag system that can be used to enable/disable
 * features across the application. Flags can be controlled based on:
 * - Simple on/off toggles
 * - Environment-specific enablement
 * - User role-based access
 * - Percentage-based rollout
 */

import { createConfig, Config, Schema } from './config';
import { createLogger, LogLevel } from './logger';

// Feature flag schema
export const featureFlagSchema: Schema = {
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    enabled: { type: 'boolean' },
    environments: { 
      type: 'array',
      items: { type: 'string' } 
    },
    userRoles: { 
      type: 'array', 
      items: { type: 'string' } 
    },
    rolloutPercentage: { 
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    meta: { type: 'object' }
  },
  required: ['id', 'name', 'enabled']
};

// Feature flag definition
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  environments?: string[];
  userRoles?: string[];
  rolloutPercentage?: number;
  meta?: Record<string, any>;
}

// Enum for feature flags
export enum Feature {
  WIZARD_INTERFACE = 'wizardInterface',
  ENHANCED_PROVIDERS = 'enhancedProviders',
  PERFORMANCE_MONITORING = 'performanceMonitoring',
  ADVANCED_TRANSFORMATIONS = 'advancedTransformations',
  DARK_MODE = 'darkMode',
  OPERATION_DEPENDENCY_GRAPH = 'operationDependencyGraph',
  ATTACHMENT_PREVIEW = 'attachmentPreview',
  AI_ASSISTANCE = 'aiAssistance',
  REAL_TIME_UPDATES = 'realTimeUpdates',
  ERROR_REMEDIATION = 'errorRemediation',
}

// Default feature flags configuration
export const DEFAULT_FEATURE_FLAGS: Record<Feature, FeatureFlag> = {
  [Feature.WIZARD_INTERFACE]: {
    id: Feature.WIZARD_INTERFACE,
    name: 'Migration Wizard Interface',
    description: 'Step-by-step wizard interface for configuring migrations',
    enabled: true,
    environments: ['development', 'staging', 'production'],
  },
  [Feature.ENHANCED_PROVIDERS]: {
    id: Feature.ENHANCED_PROVIDERS,
    name: 'Enhanced Provider Configuration',
    description: 'Advanced provider configuration with connection testing',
    enabled: true,
    environments: ['development', 'staging', 'production'],
  },
  [Feature.PERFORMANCE_MONITORING]: {
    id: Feature.PERFORMANCE_MONITORING,
    name: 'Performance Monitoring',
    description: 'Advanced performance monitoring for migrations',
    enabled: true,
    environments: ['development', 'staging'],
    rolloutPercentage: 50,
  },
  [Feature.ADVANCED_TRANSFORMATIONS]: {
    id: Feature.ADVANCED_TRANSFORMATIONS,
    name: 'Advanced Transformations',
    description: 'Advanced data transformation capabilities',
    enabled: false,
    environments: ['development'],
    userRoles: ['admin', 'power-user'],
  },
  [Feature.DARK_MODE]: {
    id: Feature.DARK_MODE,
    name: 'Dark Mode',
    description: 'Dark theme for the application',
    enabled: true,
    environments: ['development', 'staging', 'production'],
  },
  [Feature.OPERATION_DEPENDENCY_GRAPH]: {
    id: Feature.OPERATION_DEPENDENCY_GRAPH,
    name: 'Operation Dependency Graph',
    description: 'Visual graph of operation dependencies',
    enabled: true,
    environments: ['development', 'staging'],
    rolloutPercentage: 25,
  },
  [Feature.ATTACHMENT_PREVIEW]: {
    id: Feature.ATTACHMENT_PREVIEW,
    name: 'Attachment Preview',
    description: 'Preview attachments directly in the UI',
    enabled: false,
    environments: ['development'],
    userRoles: ['admin'],
  },
  [Feature.AI_ASSISTANCE]: {
    id: Feature.AI_ASSISTANCE,
    name: 'AI Assistance',
    description: 'AI-powered assistance for error remediation and data transformation',
    enabled: false,
    environments: ['development'],
    userRoles: ['admin'],
  },
  [Feature.REAL_TIME_UPDATES]: {
    id: Feature.REAL_TIME_UPDATES,
    name: 'Real-time Updates',
    description: 'Real-time updates for migration progress',
    enabled: true,
    environments: ['development', 'staging', 'production'],
  },
  [Feature.ERROR_REMEDIATION]: {
    id: Feature.ERROR_REMEDIATION,
    name: 'Error Remediation',
    description: 'Automated error remediation suggestions',
    enabled: false,
    environments: ['development'],
    userRoles: ['admin'],
  },
};

/**
 * Feature Flag Service
 * 
 * Manages feature flags across the application
 */
export class FeatureFlagService {
  private config: Config;
  private logger = createLogger({ context: 'FeatureFlagService', level: LogLevel.INFO });
  private currentEnvironment: string;
  private currentUserRoles: string[] = [];
  private idCache = new Map<string, boolean>();
  
  constructor(initialFlags = DEFAULT_FEATURE_FLAGS, environment = 'development') {
    // Create config with feature flag schema validation
    this.config = createConfig({
      defaults: { flags: initialFlags },
      schemas: {
        'flags': featureFlagSchema
      }
    });
    
    this.currentEnvironment = environment;
    
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedFlags = localStorage.getItem('skidbladnir-feature-flags');
        if (savedFlags) {
          const parsedFlags = JSON.parse(savedFlags);
          this.setFeatureFlags(parsedFlags);
        }
      } catch (error) {
        this.logger.error('Failed to load feature flags from localStorage', error);
      }
    }
  }
  
  /**
   * Get all feature flags
   */
  public getFeatureFlags(): Record<string, FeatureFlag> {
    return this.config.get<Record<string, FeatureFlag>>('flags');
  }
  
  /**
   * Set all feature flags
   */
  public setFeatureFlags(flags: Record<string, FeatureFlag>): void {
    this.config.set('flags', flags);
    this.saveToStorage();
    // Clear the cache when flags are updated
    this.idCache.clear();
  }
  
  /**
   * Update a specific feature flag
   */
  public updateFeatureFlag(id: string, flag: Partial<FeatureFlag>): void {
    const flags = this.getFeatureFlags();
    
    if (!flags[id]) {
      throw new Error(`Feature flag with id ${id} not found`);
    }
    
    flags[id] = { ...flags[id], ...flag };
    this.setFeatureFlags(flags);
  }
  
  /**
   * Set the current environment
   */
  public setEnvironment(environment: string): void {
    this.currentEnvironment = environment;
    // Clear the cache when environment changes
    this.idCache.clear();
  }
  
  /**
   * Get the current environment
   */
  public getEnvironment(): string {
    return this.currentEnvironment;
  }
  
  /**
   * Set current user roles
   */
  public setUserRoles(roles: string[]): void {
    this.currentUserRoles = [...roles];
    // Clear the cache when user roles change
    this.idCache.clear();
  }
  
  /**
   * Get current user roles
   */
  public getUserRoles(): string[] {
    return [...this.currentUserRoles];
  }
  
  /**
   * Check if a feature is enabled
   */
  public isEnabled(id: string): boolean {
    // Check cache first
    if (this.idCache.has(id)) {
      return this.idCache.get(id) as boolean;
    }
    
    const flags = this.getFeatureFlags();
    const flag = flags[id];
    
    if (!flag) {
      this.logger.warn(`Feature flag with id ${id} not found`);
      return false;
    }
    
    // Global disable check
    if (!flag.enabled) {
      this.idCache.set(id, false);
      return false;
    }
    
    // Environment check
    if (flag.environments && !flag.environments.includes(this.currentEnvironment)) {
      this.idCache.set(id, false);
      return false;
    }
    
    // User role check
    if (flag.userRoles && flag.userRoles.length > 0) {
      const hasAllowedRole = this.currentUserRoles.some(role => flag.userRoles?.includes(role));
      if (!hasAllowedRole) {
        this.idCache.set(id, false);
        return false;
      }
    }
    
    // Percentage rollout check
    if (typeof flag.rolloutPercentage === 'number') {
      // Simple deterministic hashing for consistency
      const hash = this.hashString(id + this.currentUserRoles.join(','));
      const percentage = hash % 100;
      
      if (percentage >= flag.rolloutPercentage) {
        this.idCache.set(id, false);
        return false;
      }
    }
    
    // If all checks pass, the feature is enabled
    this.idCache.set(id, true);
    return true;
  }
  
  /**
   * Save feature flags to localStorage (client-side only)
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const flags = this.getFeatureFlags();
        localStorage.setItem('skidbladnir-feature-flags', JSON.stringify(flags));
      } catch (error) {
        this.logger.error('Failed to save feature flags to localStorage', error);
      }
    }
  }
  
  /**
   * Simple string hashing function for deterministic percentage-based rollouts
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Create a default instance
export const defaultFeatureFlagService = new FeatureFlagService();