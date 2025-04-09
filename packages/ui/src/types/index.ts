// Provider Types
export interface Provider {
  id: string;
  name: string;
  version: string;
  capabilities: ProviderCapabilities;
}

export interface ProviderCapabilities {
  supportsTestCases: boolean;
  supportsTestCycles: boolean;
  supportsTestExecutions: boolean;
  supportsAttachments: boolean;
  supportsCustomFields: boolean;
}

export interface ConnectionParams {
  [key: string]: string;
}

export interface ConnectionConfig {
  providerId: string;
  params: ConnectionParams;
}

export interface ConnectionStatus {
  success: boolean;
  message: string;
  details?: string;
}

// Field Mapping Types
export interface Field {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  allowedValues?: string[];
}

export interface FieldMapping {
  sourceId: string;
  targetId: string;
  transformation?: string | null;
}

export interface MappingConfig {
  sourceProviderId: string;
  targetProviderId: string;
  fieldMappings: FieldMapping[];
  defaultValues?: Record<string, any>;
  name?: string;
}

// Migration Types
export interface MigrationConfig {
  mappingId: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  scope: MigrationScope;
  batchSize: number;
  concurrentOperations: number;
  retryAttempts: number;
  errorHandling: ErrorHandlingStrategy;
}

export type MigrationScope = 'all' | 'selected' | 'test';
export type ErrorHandlingStrategy = 'stop' | 'continue' | 'prompt';

export interface MigrationStatus {
  id: string;
  status: MigrationState;
  progress: number;
  startTime: string;
  endTime?: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  estimatedRemainingTime?: number;
}

export type MigrationState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Logging Types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  details?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Statistics Types
export interface MigrationStatistics {
  testCases: EntityStatistics;
  testCycles: EntityStatistics;
  testExecutions: EntityStatistics;
  attachments: EntityStatistics;
}

export interface EntityStatistics {
  total: number;
  migrated: number;
  failed: number;
  pending: number;
}

// Settings Types
export interface SystemSettings {
  logLevel: LogLevel;
  maxConcurrentOperations: number;
  defaultBatchSize: number;
  defaultRetryAttempts: number;
  tempStoragePath: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  timestamp: string;
}