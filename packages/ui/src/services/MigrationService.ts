/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MigrationStatus, MigrationState, LogEntry, LogLevel } from '../types';

/**
 * Error details interface for detailed error reporting
 */
export interface ErrorDetails {
  errorId: string;
  timestamp: string;
  errorType: 'auth' | 'network' | 'validation' | 'resource' | 'system' | 'unknown';
  component: string;
  operation: string;
  message: string;
  details?: any;
  context?: Record<string, any>;
  stackTrace?: string;
}

/**
 * Remediation suggestion interface for error resolution
 */
export interface RemediationSuggestion {
  id: string;
  errorType: 'auth' | 'network' | 'validation' | 'resource' | 'system' | 'unknown';
  title: string;
  description: string;
  steps: string[];
  automated?: boolean;
  actionName?: string;
  actionHandler?: () => Promise<void>;
}

/**
 * Extended migration status with detailed error information
 */
export interface DetailedMigrationStatus extends MigrationStatus {
  source: string;
  target: string;
  errorCount: number;
  warningCount: number;
  errors?: ErrorDetails[];
}

/**
 * Service for handling migration operations.
 */
export class MigrationService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Get the status of a migration.
   * 
   * @param migrationId The ID of the migration
   * @returns A promise that resolves to the migration status
   */
  async getMigrationStatus(migrationId: string): Promise<MigrationStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/${migrationId}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get migration status: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }
  
  /**
   * Get all active migrations.
   * 
   * @returns A promise that resolves to an array of migration statuses
   */
  async getActiveMigrations(): Promise<MigrationStatus[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/active`);
      if (!response.ok) {
        throw new Error(`Failed to get active migrations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting active migrations:', error);
      throw error;
    }
  }
  
  /**
   * Get recent migrations.
   * 
   * @param limit The maximum number of migrations to return
   * @returns A promise that resolves to an array of migration statuses
   */
  async getRecentMigrations(limit: number = 10): Promise<MigrationStatus[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/recent?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to get recent migrations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting recent migrations:', error);
      throw error;
    }
  }
  
  /**
   * Get migration logs.
   * 
   * @param migrationId The ID of the migration
   * @param limit The maximum number of log entries to return
   * @param offset The offset to start from
   * @returns A promise that resolves to an array of log entries
   */
  async getMigrationLogs(migrationId: string, limit: number = 50, offset: number = 0): Promise<LogEntry[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/migrations/${migrationId}/logs?limit=${limit}&offset=${offset}`
      );
      if (!response.ok) {
        throw new Error(`Failed to get migration logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting migration logs:', error);
      throw error;
    }
  }
  
  /**
   * Pause a migration.
   * 
   * @param migrationId The ID of the migration to pause
   * @returns A promise that resolves to the updated migration status
   */
  async pauseMigration(migrationId: string): Promise<MigrationStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/${migrationId}/pause`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Failed to pause migration: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error pausing migration:', error);
      throw error;
    }
  }
  
  /**
   * Resume a migration.
   * 
   * @param migrationId The ID of the migration to resume
   * @returns A promise that resolves to the updated migration status
   */
  async resumeMigration(migrationId: string): Promise<MigrationStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/${migrationId}/resume`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Failed to resume migration: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error resuming migration:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a migration.
   * 
   * @param migrationId The ID of the migration to cancel
   * @returns A promise that resolves to the updated migration status
   */
  async cancelMigration(migrationId: string): Promise<MigrationStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/${migrationId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Failed to cancel migration: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error cancelling migration:', error);
      throw error;
    }
  }
  
  /**
   * For development/demo purposes - generates mock migration statuses
   */
  getMockMigrationStatuses(count: number = 5): MigrationStatus[] {
    const statuses: MigrationStatus[] = [];
    const states: MigrationState[] = ['pending', 'running', 'paused', 'completed', 'failed'];
    
    for (let i = 0; i < count; i++) {
      // Generate a random progress between 0 and 100
      const progress = i === 0 ? 
        Math.floor(Math.random() * 100) : // Random for first item (active migration)
        100; // Completed for the rest (historical migrations)
      
      // Generate a random status based on progress
      const statusIndex = i === 0 ? 
        (progress < 100 ? Math.floor(Math.random() * 3) : 3) : // For active migration
        (i % states.length); // For historical migrations
      
      const status = states[statusIndex];
      
      // Generate a random start time in the past few hours
      const startTime = new Date(Date.now() - (i * 3600000) - (Math.random() * 3600000));
      
      // If completed or failed, add an end time
      let endTime;
      if (status === 'completed' || status === 'failed') {
        endTime = new Date(startTime.getTime() + (Math.random() * 3600000));
      }
      
      const totalItems = 100 + Math.floor(Math.random() * 900);
      const processedItems = Math.floor(totalItems * (progress / 100));
      const failedItems = status === 'failed' ? 
        Math.floor(processedItems * 0.2) : 
        Math.floor(processedItems * 0.05);
      
      statuses.push({
        id: `migration-${i + 1}`,
        status,
        progress,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString(),
        totalItems,
        processedItems,
        failedItems,
        estimatedRemainingTime: status === 'running' ? 
          Math.floor((totalItems - processedItems) / (processedItems / ((Date.now() - startTime.getTime()) / 1000))) : 
          undefined
      });
    }
    
    return statuses;
  }
  
  /**
   * For development/demo purposes - generates mock migration logs
   */
  getMockMigrationLogs(migrationId: string, count: number = 50): LogEntry[] {
    const logs: LogEntry[] = [];
    const components = ['MigrationController', 'ZephyrProvider', 'QTestProvider', 'Transformer', 'BinaryProcessor'];
    const levels: Array<'info' | 'warn' | 'error' | 'debug'> = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Starting migration',
      'Fetching test cases from source',
      'Transforming test case',
      'Uploading test case to target',
      'Processing attachments',
      'Rate limit exceeded, retrying',
      'Connection error, retrying',
      'Validation error in test case',
      'Successfully migrated test case',
      'Migration completed'
    ];
    
    // Generate random logs
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(Date.now() - (i * 60000) - (Math.random() * 60000));
      const component = components[Math.floor(Math.random() * components.length)];
      const level = i % 10 === 0 ? 'error' : (i % 5 === 0 ? 'warn' : 'info');
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      logs.push({
        id: `log-${migrationId}-${i}`,
        timestamp: timestamp.toISOString(),
        level,
        component,
        message,
        details: { testCaseId: `TC-${1000 + i}` }
      });
    }
    
    // Sort logs by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return logs;
  }
  
  /**
   * Get detailed error information for a migration
   * 
   * @param migrationId The ID of the migration
   * @returns A promise that resolves to an array of error details
   */
  async getErrorDetails(migrationId: string): Promise<ErrorDetails[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migrations/${migrationId}/errors`);
      if (!response.ok) {
        throw new Error(`Failed to get error details: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting error details:', error);
      
      // For development/demo, return mock error details
      return this.getMockErrorDetails(migrationId);
    }
  }
  
  /**
   * Get remediation suggestions for a specific error
   * 
   * @param errorDetails The error details to get remediation suggestions for
   * @returns A promise that resolves to an array of remediation suggestions
   */
  async getRemediationSuggestions(errorDetails: ErrorDetails): Promise<RemediationSuggestion[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/errors/${errorDetails.errorId}/remediation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorDetails)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get remediation suggestions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting remediation suggestions:', error);
      
      // For development/demo, return mock remediation suggestions
      return this.getMockRemediationSuggestions(errorDetails);
    }
  }
  
  /**
   * Execute a remediation action for an error
   * 
   * @param migrationId The ID of the migration
   * @param errorId The ID of the error
   * @param remediationId The ID of the remediation suggestion
   * @returns A promise that resolves to the updated migration status
   */
  async executeRemediation(
    migrationId: string,
    errorId: string,
    remediationId: string
  ): Promise<DetailedMigrationStatus> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/migrations/${migrationId}/errors/${errorId}/remediate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ remediationId })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to execute remediation: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error executing remediation:', error);
      throw error;
    }
  }
  
  /**
   * For development/demo purposes - generates mock error details
   */
  private getMockErrorDetails(migrationId: string): ErrorDetails[] {
    const errorCount = Math.floor(Math.random() * 5) + 1;
    const errors: ErrorDetails[] = [];
    const components = ['ZephyrProvider', 'QTestProvider', 'Transformer', 'BinaryProcessor'];
    const operations = ['FetchTestCase', 'TransformData', 'ValidateSchema', 'UploadTestCase'];
    const errorTypes: Array<'auth' | 'network' | 'validation' | 'resource' | 'system' | 'unknown'> = [
      'auth', 'network', 'validation', 'resource', 'system', 'unknown'
    ];
    
    for (let i = 0; i < errorCount; i++) {
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const component = components[Math.floor(Math.random() * components.length)];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      errors.push({
        errorId: `err-${migrationId}-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        errorType,
        component,
        operation,
        message: this.generateErrorMessage(errorType, operation),
        details: this.generateErrorDetails(errorType),
        context: {
          testCaseId: `TC-${Math.floor(Math.random() * 1000)}`,
          sourceId: `SRC-${Math.floor(Math.random() * 1000)}`,
          targetId: `TRG-${Math.floor(Math.random() * 1000)}`
        },
        stackTrace: errorType === 'system' ? 'Error: Failed to process test case\n    at TestCaseProcessor.process (/app/processor.js:42:23)\n    at async MigrationWorker.execute (/app/worker.js:87:12)' : undefined
      });
    }
    
    return errors;
  }
  
  /**
   * For development/demo purposes - generates mock remediation suggestions
   */
  private getMockRemediationSuggestions(errorDetails: ErrorDetails): RemediationSuggestion[] {
    const suggestions: RemediationSuggestion[] = [];
    
    switch (errorDetails.errorType) {
      case 'auth':
        suggestions.push({
          id: `remedy-auth-1`,
          errorType: 'auth',
          title: 'Refresh Authentication Token',
          description: 'Your authentication token may have expired. Refreshing the token might resolve this issue.',
          steps: [
            'Click the "Refresh Token" button below',
            'Verify your credentials if prompted',
            'Retry the operation'
          ],
          automated: true,
          actionName: 'Refresh Token'
        });
        suggestions.push({
          id: `remedy-auth-2`,
          errorType: 'auth',
          title: 'Check Permission Settings',
          description: 'Your account may not have sufficient permissions for this operation.',
          steps: [
            'Contact your administrator to verify your access level',
            'Request the specific permission: ' + errorDetails.operation,
            'Update your provider connection with the new credentials'
          ]
        });
        break;
        
      case 'network':
        suggestions.push({
          id: `remedy-network-1`,
          errorType: 'network',
          title: 'Retry Operation',
          description: 'This appears to be a temporary network issue. Retrying the operation may resolve it.',
          steps: [
            'Check your network connection',
            'Verify the provider service is accessible',
            'Click "Retry Operation" below'
          ],
          automated: true,
          actionName: 'Retry Operation'
        });
        suggestions.push({
          id: `remedy-network-2`,
          errorType: 'network',
          title: 'Verify Provider Endpoint Configuration',
          description: 'The endpoint configuration for the provider may be incorrect.',
          steps: [
            'Check the provider configuration settings',
            'Verify the API URL is correct',
            'Run the connection test to validate the configuration'
          ]
        });
        break;
        
      case 'validation':
        const fieldIssues = errorDetails.details?.fields || ['Unknown field'];
        suggestions.push({
          id: `remedy-validation-1`,
          errorType: 'validation',
          title: 'Fix Field Mapping Issues',
          description: `There are validation errors with the mapped fields: ${fieldIssues.join(', ')}`,
          steps: [
            'Go to the Field Mapping page',
            'Correct the issues with the specified fields',
            'Verify the mappings with the preview function',
            'Retry the migration'
          ]
        });
        break;
        
      case 'resource':
        suggestions.push({
          id: `remedy-resource-1`,
          errorType: 'resource',
          title: 'Resolve Resource Conflict',
          description: 'A resource with the same identifier already exists in the target system.',
          steps: [
            'Review the conflicting resource in the target system',
            'Choose a conflict resolution strategy: Overwrite, Merge, or Skip',
            'Update your migration configuration',
            'Retry the migration with the new settings'
          ]
        });
        break;
        
      case 'system':
        suggestions.push({
          id: `remedy-system-1`,
          errorType: 'system',
          title: 'Check System Logs',
          description: 'This appears to be a system error. Additional information may be available in the logs.',
          steps: [
            'Check the detailed error logs',
            'Verify your system meets the requirements',
            'Contact support with the error details if the issue persists'
          ]
        });
        break;
        
      default:
        suggestions.push({
          id: `remedy-unknown-1`,
          errorType: 'unknown',
          title: 'General Troubleshooting',
          description: 'This is an unexpected error. Try these general troubleshooting steps.',
          steps: [
            'Restart the migration process',
            'Check for recent system updates or changes',
            'Verify all configurations are correct',
            'Contact support if the issue persists'
          ]
        });
    }
    
    return suggestions;
  }
  
  /**
   * For development/demo purposes - generates error details based on type
   */
  private generateErrorDetails(errorType: string): any {
    switch (errorType) {
      case 'validation':
        return {
          fields: [
            'priority',
            'description',
            'steps'
          ],
          violations: [
            'Field "priority" is required',
            'Field "description" exceeds maximum length (5000 characters)',
            'Field "steps" contains invalid formatting'
          ]
        };
      case 'network':
        return {
          statusCode: [408, 503, 504][Math.floor(Math.random() * 3)],
          message: 'Service temporarily unavailable',
          retryAfter: Math.floor(Math.random() * 10) + 5
        };
      case 'auth':
        return {
          statusCode: 401,
          message: 'Authentication token expired',
          tokenExpiry: new Date(Date.now() - 3600000).toISOString()
        };
      case 'resource':
        return {
          resourceId: `RES-${Math.floor(Math.random() * 1000)}`,
          conflictType: 'duplicate',
          existingResource: `TRG-${Math.floor(Math.random() * 1000)}`
        };
      case 'system':
        return {
          component: 'DataProcessor',
          message: 'Out of memory error',
          resourceUsage: {
            memory: '98%',
            cpu: '92%'
          }
        };
      default:
        return {};
    }
  }
  
  /**
   * For development/demo purposes - generates error messages
   */
  private generateErrorMessage(errorType: string, operation: string): string {
    const messages: Record<string, string[]> = {
      auth: [
        `Authentication failed during ${operation}`,
        `Token expired while executing ${operation}`,
        `Insufficient permissions for ${operation}`
      ],
      network: [
        `Network timeout during ${operation}`,
        `Connection refused while performing ${operation}`,
        `Service unavailable when calling ${operation}`
      ],
      validation: [
        `Input validation failed for ${operation}`,
        `Invalid field values in ${operation}`,
        `Required fields missing for ${operation}`
      ],
      resource: [
        `Resource conflict detected in ${operation}`,
        `Resource not found during ${operation}`,
        `Duplicate resource found in ${operation}`
      ],
      system: [
        `System error occurred during ${operation}`,
        `Internal processing error in ${operation}`,
        `Out of resources while executing ${operation}`
      ],
      unknown: [
        `Unexpected error in ${operation}`,
        `Unknown failure during ${operation}`,
        `Unhandled exception in ${operation}`
      ]
    };
    
    const messagesForType = messages[errorType] || messages.unknown;
    return messagesForType[Math.floor(Math.random() * messagesForType.length)];
  }
}