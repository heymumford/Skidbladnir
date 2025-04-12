/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock MigrationService

// Define error category enum
const ErrorCategory = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SYSTEM: 'system',
  RESOURCE: 'resource',
  UNKNOWN: 'unknown'
};

const MigrationService = function() {
  return {
    startMigration: jest.fn().mockResolvedValue({
      id: 'migration-123',
      status: 'IN_PROGRESS',
      sourceProviderId: 'zephyr',
      targetProviderId: 'qtest',
      startTime: new Date().toISOString()
    }),
    
    pauseMigration: jest.fn().mockResolvedValue(true),
    resumeMigration: jest.fn().mockResolvedValue(true),
    cancelMigration: jest.fn().mockResolvedValue(true),
    
    getMigrationStatus: jest.fn().mockResolvedValue({
      id: 'migration-123',
      status: 'IN_PROGRESS',
      sourceProviderId: 'zephyr',
      targetProviderId: 'qtest',
      startTime: new Date().toISOString(),
      progress: {
        total: 100,
        completed: 45,
        failed: 5,
        skipped: 0
      }
    }),
    
    getMigrationErrors: jest.fn().mockResolvedValue([
      {
        id: 'error-1',
        category: ErrorCategory.AUTH,
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
        providerId: 'zephyr',
        testCaseId: 'tc-123'
      },
      {
        id: 'error-2',
        category: ErrorCategory.NETWORK,
        message: 'Network error',
        timestamp: new Date().toISOString(),
        providerId: 'qtest',
        testCaseId: 'tc-124'
      }
    ]),
    
    getRecentMigrations: jest.fn().mockResolvedValue([
      {
        id: 'migration-123',
        status: 'IN_PROGRESS',
        sourceProviderId: 'zephyr',
        targetProviderId: 'qtest',
        startTime: new Date().toISOString(),
        progress: {
          total: 100,
          completed: 45,
          failed: 5,
          skipped: 0
        }
      },
      {
        id: 'migration-122',
        status: 'COMPLETED',
        sourceProviderId: 'zephyr',
        targetProviderId: 'qtest',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 86000000).toISOString(),
        progress: {
          total: 50,
          completed: 48,
          failed: 2,
          skipped: 0
        }
      }
    ])
  };
};

// Create a mock instance
const migrationService = MigrationService();

module.exports = {
  MigrationService,
  migrationService,
  ErrorCategory
};