/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Logging Standards Tests
 * 
 * These tests verify that all components adhere to the logging standards
 * defined for the project. This ensures consistent logging patterns across
 * the polyglot architecture.
 */

import { createLogger, LogLevel } from '../../packages/common/src/utils/logger';
import { defaultLogger } from '../../packages/common/src/utils/logger';

describe('Logging Standards', () => {
  let originalConsole: any;
  let mockConsole: any;

  beforeEach(() => {
    originalConsole = global.console;
    mockConsole = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    global.console = mockConsole;
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe('Timestamp Format', () => {
    it('should include ISO 8601 timestamp in logs', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      logger.info('Test message');

      const logLine = mockConsole.info.mock.calls[0][0];
      expect(logLine).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/);
    });
  });

  describe('Log Format', () => {
    it('should follow standard format: [timestamp] [context] message', () => {
      const logger = createLogger({ context: 'TestContext', level: LogLevel.DEBUG });
      logger.info('Test message');

      const logLine = mockConsole.info.mock.calls[0][0];
      // Matches [ISO timestamp] [Context] pattern
      expect(logLine).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[TestContext\]/);
    });
  });

  describe('Context Hierarchy', () => {
    it('should maintain context hierarchy with colon separator', () => {
      const parentLogger = createLogger({ context: 'Parent' });
      const childLogger = parentLogger.child('Child');
      const grandchildLogger = childLogger.child('GrandChild');

      grandchildLogger.info('Test message');

      const logLine = mockConsole.info.mock.calls[0][0];
      expect(logLine).toContain('[Parent:Child:GrandChild]');
    });
  });

  describe('Error Handling', () => {
    it('should extract standard properties from Error objects', () => {
      const logger = createLogger();
      const error = new Error('Test error');
      
      logger.error('An error occurred', error);
      
      const errorObj = mockConsole.error.mock.calls[0][2];
      expect(errorObj).toHaveProperty('message', 'Test error');
      expect(errorObj).toHaveProperty('stack');
    });

    it('should extract custom properties from Error objects', () => {
      const logger = createLogger();
      const customError = Object.assign(new Error('Custom error'), { 
        code: 'ERR_CUSTOM', 
        details: { field: 'name' } 
      });
      
      logger.error('A custom error occurred', customError);
      
      const errorObj = mockConsole.error.mock.calls[0][2];
      expect(errorObj).toHaveProperty('code', 'ERR_CUSTOM');
      expect(errorObj).toHaveProperty('details.field', 'name');
    });

    it('should handle non-Error objects in error logs', () => {
      const logger = createLogger();
      const errorLike = { 
        message: 'Not a real Error',
        status: 404
      };
      
      logger.error('Something went wrong', errorLike);
      
      const metadata = mockConsole.error.mock.calls[0][2];
      expect(metadata).toEqual(errorLike);
    });
  });

  describe('Metadata Handling', () => {
    it('should support structured metadata objects', () => {
      const logger = createLogger();
      const metadata = { 
        userId: 'user123', 
        requestId: 'req456',
        duration: 123 
      };
      
      logger.info('Operation completed', metadata);
      
      const loggedMetadata = mockConsole.info.mock.calls[0][2];
      expect(loggedMetadata).toEqual(metadata);
    });

    it('should support multiple metadata arguments', () => {
      const logger = createLogger();
      const metadata1 = { userId: 'user123' };
      const metadata2 = { requestId: 'req456' };
      
      logger.info('Operation completed', metadata1, metadata2);
      
      expect(mockConsole.info.mock.calls[0][2]).toEqual(metadata1);
      expect(mockConsole.info.mock.calls[0][3]).toEqual(metadata2);
    });
  });

  describe('Log Levels', () => {
    it('should respect configured log level', () => {
      const logger = createLogger({ level: LogLevel.WARN });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should allow changing log level at runtime', () => {
      const logger = createLogger({ level: LogLevel.INFO });
      
      logger.debug('Debug message'); // Should not log
      expect(mockConsole.debug).not.toHaveBeenCalled();
      
      // Change log level
      logger.setLevel(LogLevel.DEBUG);
      
      logger.debug('Debug message'); // Should log now
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('Default Logger', () => {
    it('should expose a default logger for quick access', () => {
      expect(defaultLogger).toBeDefined();
      
      defaultLogger.info('Test message');
      expect(mockConsole.info).toHaveBeenCalled();
    });
  });
});

// Test TypeScript implementation enforces standards
describe('TypeScript Logger Implementation', () => {
  it('should import correctly from common package', () => {
    expect(createLogger).toBeDefined();
    expect(LogLevel).toBeDefined();
    expect(defaultLogger).toBeDefined();
  });
});

// Cross-language consistency would be tested in language-specific tests