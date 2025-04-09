/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Structured logging utility for application-wide logging
 * 
 * Provides a consistent logging interface with support for
 * log levels, context-aware logging, and structured metadata.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerOptions {
  /**
   * Minimum log level to display
   */
  level: LogLevel;

  /**
   * Context identifier for the logger
   */
  context?: string;

  /**
   * Include timestamp in log output
   */
  timestamp?: boolean;
}

/**
 * Formats an Error object for logging
 */
function formatError(error: Error): Record<string, any> {
  const formattedError: Record<string, any> = {
    message: error.message,
    stack: error.stack
  };

  // Include any custom properties on the error
  Object.getOwnPropertyNames(error).forEach(prop => {
    if (prop !== 'message' && prop !== 'stack') {
      formattedError[prop] = (error as any)[prop];
    }
  });

  return formattedError;
}

export class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      timestamp: true,
      ...options
    };
  }
  
  /**
   * Change the log level at runtime
   */
  public setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Create a child logger with a sub-context
   */
  public child(subContext: string): Logger {
    const parentContext = this.options.context;
    const childContext = parentContext ? `${parentContext}:${subContext}` : subContext;
    
    return new Logger({
      ...this.options,
      context: childContext
    });
  }

  /**
   * Log a debug message
   */
  public debug(message: string, ...meta: any[]): void {
    this.log(LogLevel.DEBUG, message, ...meta);
  }

  /**
   * Log an info message
   */
  public info(message: string, ...meta: any[]): void {
    this.log(LogLevel.INFO, message, ...meta);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...meta: any[]): void {
    this.log(LogLevel.WARN, message, ...meta);
  }

  /**
   * Log an error message
   */
  public error(message: string, ...meta: any[]): void {
    // Format Error objects for better readability
    const formattedMeta = meta.map(item => {
      if (item instanceof Error) {
        return formatError(item);
      }
      return item;
    });
    
    this.log(LogLevel.ERROR, message, ...formattedMeta);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...meta: any[]): void {
    if (level < this.options.level) {
      return;
    }

    let prefix = '';
    
    if (this.options.timestamp) {
      prefix += `[${new Date().toISOString()}] `;
    }
    
    if (this.options.context) {
      prefix += `[${this.options.context}] `;
    }

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...meta);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, ...meta);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...meta);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, ...meta);
        break;
    }
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(options: Partial<LoggerOptions> = {}): Logger {
  return new Logger(options);
}

// Create a default logger for application-wide use
export const defaultLogger = createLogger();