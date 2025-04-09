/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Logger, LogLevel, createLogger } from '../../src/utils/logger';

describe('Logger', () => {
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

  describe('createLogger', () => {
    it('should create a logger with default options', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create a logger with custom options', () => {
      const logger = createLogger({
        level: LogLevel.DEBUG,
        context: 'TestContext'
      });
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create a logger with child context', () => {
      const parentLogger = createLogger({ context: 'Parent' });
      const childLogger = parentLogger.child('Child');
      
      childLogger.info('Test message');
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Parent:Child'),
        expect.anything()
      );
    });
  });

  describe('log methods', () => {
    it('should log messages at appropriate levels', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      expect(mockConsole.debug).toHaveBeenCalledWith(expect.any(String), 'Debug message');
      expect(mockConsole.info).toHaveBeenCalledWith(expect.any(String), 'Info message');
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.any(String), 'Warning message');
      expect(mockConsole.error).toHaveBeenCalledWith(expect.any(String), 'Error message');
    });

    it('should not log messages below configured level', () => {
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

    it('should include context in log messages', () => {
      const logger = createLogger({ context: 'TestContext' });
      
      logger.info('Info message');
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('TestContext'),
        'Info message'
      );
    });

    it('should include metadata in log messages', () => {
      const logger = createLogger();
      const metadata = { userId: 'user123', requestId: 'req456' };
      
      logger.info('Info message', metadata);
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.any(String),
        'Info message',
        metadata
      );
    });
  });

  describe('error handling', () => {
    it('should properly log Error objects', () => {
      const logger = createLogger();
      const error = new Error('Test error');
      
      logger.error('An error occurred', error);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.any(String),
        'An error occurred',
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String)
        })
      );
    });

    it('should log error with custom properties', () => {
      const logger = createLogger();
      const customError = Object.assign(new Error('Custom error'), { 
        code: 'ERR_CUSTOM', 
        details: { field: 'name' } 
      });
      
      logger.error('A custom error occurred', customError);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.any(String),
        'A custom error occurred',
        expect.objectContaining({
          message: 'Custom error',
          code: 'ERR_CUSTOM',
          details: { field: 'name' }
        })
      );
    });
  });
});