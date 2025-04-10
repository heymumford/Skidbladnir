/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerAdapter, createLoggerService } from './LoggerAdapter';
import { Logger } from '../../../../packages/common/src/utils/logger';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';

// Mock the Logger class
jest.mock('../../../../packages/common/src/utils/logger', () => {
  const mockChild = jest.fn().mockImplementation(() => mockLogger);
  const mockDebug = jest.fn();
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();
  
  const mockLogger = {
    debug: mockDebug,
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    child: mockChild
  };

  const mockCreateLogger = jest.fn().mockImplementation(() => mockLogger);

  return {
    Logger: jest.fn().mockImplementation(() => mockLogger),
    LogLevel: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      NONE: 4
    },
    createLogger: mockCreateLogger,
    defaultLogger: mockLogger
  };
});

describe('LoggerAdapter', () => {
  let loggerMock: Logger;
  let loggerAdapter: LoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock = new Logger();
    loggerAdapter = new LoggerAdapter(loggerMock);
  });

  it('should delegate debug method to the underlying logger', () => {
    const message = 'Debug message';
    const metaData = { key: 'value' };
    
    loggerAdapter.debug(message, metaData);
    
    expect(loggerMock.debug).toHaveBeenCalledWith(message, metaData);
  });

  it('should delegate info method to the underlying logger', () => {
    const message = 'Info message';
    const metaData = { key: 'value' };
    
    loggerAdapter.info(message, metaData);
    
    expect(loggerMock.info).toHaveBeenCalledWith(message, metaData);
  });

  it('should delegate warn method to the underlying logger', () => {
    const message = 'Warning message';
    const metaData = { key: 'value' };
    
    loggerAdapter.warn(message, metaData);
    
    expect(loggerMock.warn).toHaveBeenCalledWith(message, metaData);
  });

  it('should delegate error method to the underlying logger', () => {
    const message = 'Error message';
    const error = new Error('Test error');
    
    loggerAdapter.error(message, error);
    
    expect(loggerMock.error).toHaveBeenCalledWith(message, error);
  });

  it('should create a child logger adapter when child method is called', () => {
    const subContext = 'SubContext';
    const childLoggerAdapter = loggerAdapter.child(subContext);
    
    expect(loggerMock.child).toHaveBeenCalledWith(subContext);
    expect(childLoggerAdapter).toBeInstanceOf(LoggerAdapter);
  });

  it('should create a logger service with domain context', () => {
    // Use the mock created in the jest.mock call
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createLogger } = require('../../../../packages/common/src/utils/logger');
    const loggerService = createLoggerService();
    
    expect(createLogger).toHaveBeenCalledWith({ context: 'Domain' });
    expect(loggerService).toBeInstanceOf(LoggerAdapter);
  });
});