/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../../../pkg/domain/services/LoggerService';

// Mock implementation for tests
class MockLoggerService implements LoggerService {
  public debugLogs: any[] = [];
  public infoLogs: any[] = [];
  public warnLogs: any[] = [];
  public errorLogs: any[] = [];

  debug(message: string, ...meta: any[]): void {
    this.debugLogs.push({ message, meta });
  }

  info(message: string, ...meta: any[]): void {
    this.infoLogs.push({ message, meta });
  }

  warn(message: string, ...meta: any[]): void {
    this.warnLogs.push({ message, meta });
  }

  error(message: string, ...meta: any[]): void {
    this.errorLogs.push({ message, meta });
  }

  child(_subContext: string): LoggerService {
    const childLogger = new MockLoggerService();
    return childLogger;
  }
}

describe('LoggerService Interface', () => {
  let loggerService: MockLoggerService;

  beforeEach(() => {
    loggerService = new MockLoggerService();
  });

  it('should record debug messages', () => {
    const message = 'Debug message';
    const meta = { key: 'value' };
    
    loggerService.debug(message, meta);
    
    expect(loggerService.debugLogs.length).toBe(1);
    expect(loggerService.debugLogs[0].message).toBe(message);
    expect(loggerService.debugLogs[0].meta[0]).toBe(meta);
  });

  it('should record info messages', () => {
    const message = 'Info message';
    const meta = { key: 'value' };
    
    loggerService.info(message, meta);
    
    expect(loggerService.infoLogs.length).toBe(1);
    expect(loggerService.infoLogs[0].message).toBe(message);
    expect(loggerService.infoLogs[0].meta[0]).toBe(meta);
  });

  it('should record warn messages', () => {
    const message = 'Warning message';
    const meta = { key: 'value' };
    
    loggerService.warn(message, meta);
    
    expect(loggerService.warnLogs.length).toBe(1);
    expect(loggerService.warnLogs[0].message).toBe(message);
    expect(loggerService.warnLogs[0].meta[0]).toBe(meta);
  });

  it('should record error messages', () => {
    const message = 'Error message';
    const error = new Error('Test error');
    
    loggerService.error(message, error);
    
    expect(loggerService.errorLogs.length).toBe(1);
    expect(loggerService.errorLogs[0].message).toBe(message);
    expect(loggerService.errorLogs[0].meta[0]).toBe(error);
  });

  it('should create child logger instances', () => {
    const childLogger = loggerService.child('ChildContext');
    
    expect(childLogger).toBeInstanceOf(MockLoggerService);
  });
  
  it('should be usable in domain services that require logging', () => {
    // Mock domain service that uses LoggerService
    class TestDomainService {
      constructor(private logger: LoggerService) {}
      
      performOperation(): void {
        this.logger.info('Operation started');
        try {
          // Simulate operation
          this.logger.debug('Operation details', { detail: 'value' });
          // Operation successful
          this.logger.info('Operation completed successfully');
        } catch (error) {
          this.logger.error('Operation failed', error);
          throw error;
        }
      }
    }
    
    // Create service with mock logger
    const service = new TestDomainService(loggerService);
    
    // Execute service method
    service.performOperation();
    
    // Verify logging behavior
    expect(loggerService.infoLogs.length).toBe(2);
    expect(loggerService.infoLogs[0].message).toBe('Operation started');
    expect(loggerService.infoLogs[1].message).toBe('Operation completed successfully');
    
    expect(loggerService.debugLogs.length).toBe(1);
    expect(loggerService.debugLogs[0].message).toBe('Operation details');
    expect(loggerService.debugLogs[0].meta[0]).toEqual({ detail: 'value' });
  });
});