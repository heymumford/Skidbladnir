/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Provider definitions
export interface Provider {
  id: string;
  name: string;
  version: string;
  icon?: string;
  type?: 'source' | 'target';
  capabilities: {
    supportsTestCases: boolean;
    supportsTestCycles: boolean;
    supportsTestExecutions: boolean;
    supportsAttachments: boolean;
    supportsCustomFields: boolean;
  };
}

// Field definitions for mapping UI
export interface Field {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
  allowedValues?: string[];
}

// Field mapping for transformation interface
export interface FieldMapping {
  sourceId: string;
  targetId: string;
  transformation: string | null;
}

// Connection parameters for providers
export interface ConnectionParams {
  [key: string]: any;
}

// Transformation preview data structure
export interface TransformationPreview {
  sourceData: Record<string, any>;
  canonicalData: Record<string, any>;
  targetData: Record<string, any>;
  validationMessages?: string[];
}

// Mapping configuration for transformations
export interface MappingConfig {
  name?: string;
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: FieldMapping[];
  defaultValues?: Record<string, any>;
}

// Connection status response
export interface ConnectionStatus {
  success: boolean;
  message: string;
  details?: any;
}

// Standard connection field definition
export interface ConnectionField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validationPattern?: string;
  validationMessage?: string;
  showCopyButton?: boolean;
  showGenerateButton?: boolean;
}

// Migration monitoring types
export type MigrationState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface MigrationStatus {
  id: string;
  status: MigrationState;
  progress: number;
  startTime?: string;
  endTime?: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  estimatedRemainingTime?: number;
}

export type LogLevel = 'info' | 'debug' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  details?: any;
}

// Provider-specific connection parameters

// Zephyr Scale connection parameters
export interface ZephyrConnectionParams {
  baseUrl: string;
  apiKey: string;
  projectKey: string;
  cloudInstance?: boolean;
  advancedSettings?: {
    timeout: number;
    maxRetries: number;
    concurrentRequests: number;
  };
}

// qTest connection parameters
export interface QTestConnectionParams {
  baseUrl: string;
  apiToken: string;
  projectId: string;
  automationTokenEnabled?: boolean;
  impersonationUser?: string;
  advancedSettings?: {
    timeout: number;
    maxRetries: number;
    concurrentRequests: number;
    apiVersion?: string;
  };
}

// Connection status with provider-specific details
export interface ZephyrConnectionStatus extends ConnectionStatus {
  details?: {
    version?: string;
    authenticatedUser?: string;
    projectName?: string;
    projectId?: string;
    timestamp?: string;
    errorCode?: string;
    testCaseCount?: number;
  };
}

export interface QTestConnectionStatus extends ConnectionStatus {
  details?: {
    version?: string;
    authenticatedUser?: string;
    projectName?: string;
    projectId?: number;
    timestamp?: string;
    errorCode?: string;
    modules?: number;
    testCaseCount?: number;
  };
}

// Token generation options
export interface TokenGenerationOptions {
  expiresIn?: string;
  permissions?: string[];
  username?: string;
}

// OAuth configuration
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scope: string;
}

// Authentication types
export enum AuthType {
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  BASIC = 'basic',
  JWT = 'jwt',
  CUSTOM = 'custom'
}

// Authentication configuration
export interface AuthConfig {
  type: AuthType;
  credentials?: any;
  oauth?: OAuthConfig;
  tokenRefreshEnabled?: boolean;
  tokenStorage: 'memory' | 'session' | 'local' | 'secure';
}