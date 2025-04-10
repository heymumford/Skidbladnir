/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
}

/**
 * Logging configuration
 */
interface LoggingConfig {
  level: LogLevel;
  format: 'simple' | 'json';
  includeTimestamp: boolean;
  colorize: boolean;
  outputToConsole: boolean;
  outputToFile: boolean;
  logFilePath?: string;
}

/**
 * Default logging configuration
 */
const defaultConfig: LoggingConfig = {
  level: LogLevel.INFO,
  format: 'simple',
  includeTimestamp: true,
  colorize: true,
  outputToConsole: true,
  outputToFile: false
};

/**
 * Simple implementation of the Logger interface
 */
class SimpleLogger implements Logger {
  private name: string;
  private config: LoggingConfig;

  constructor(name: string, config: LoggingConfig) {
    this.name = name;
    this.config = config;
  }

  debug(message: string, ...meta: any[]): void {
    this.log(LogLevel.DEBUG, message, ...meta);
  }

  info(message: string, ...meta: any[]): void {
    this.log(LogLevel.INFO, message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.log(LogLevel.WARN, message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.log(LogLevel.ERROR, message, ...meta);
  }

  private log(level: LogLevel, message: string, ...meta: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = this.config.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
    const prefix = `${timestamp}${level} [${this.name}]: `;
    
    if (this.config.outputToConsole) {
      if (this.config.format === 'json') {
        const logObject = {
          timestamp: new Date().toISOString(),
          level,
          module: this.name,
          message,
          ...(meta.length > 0 ? { meta } : {})
        };
        console.log(JSON.stringify(logObject));
      } else {
        const colorize = this.config.colorize ? this.getColorFunction(level) : (x: string) => x;
        console.log(colorize(`${prefix}${message}`), ...meta);
      }
    }

    // File logging would be implemented here in a real app
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= configLevelIndex;
  }

  private getColorFunction(level: LogLevel): (text: string) => string {
    const colors = {
      [LogLevel.DEBUG]: (text: string) => `\x1b[36m${text}\x1b[0m`, // Cyan
      [LogLevel.INFO]: (text: string) => `\x1b[32m${text}\x1b[0m`,  // Green
      [LogLevel.WARN]: (text: string) => `\x1b[33m${text}\x1b[0m`,  // Yellow
      [LogLevel.ERROR]: (text: string) => `\x1b[31m${text}\x1b[0m`, // Red
    };
    
    return colors[level] || ((text: string) => text);
  }
}

/**
 * Logging service for the LLM Advisor
 */
export class LoggingService {
  private static instance: LoggingService;
  private config: LoggingConfig;
  private loggers: Map<string, Logger>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = this.loadConfig();
    this.loggers = new Map<string, Logger>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Get a logger instance for a specific module
   */
  public getLogger(name: string): Logger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, new SimpleLogger(name, this.config));
    }
    
    return this.loggers.get(name)!;
  }

  /**
   * Set the log level
   */
  public setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Configure logging options
   */
  public configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Load logging configuration from environment
   */
  private loadConfig(): LoggingConfig {
    const config = { ...defaultConfig };
    
    // Apply environment variable overrides
    if (process.env.LOG_LEVEL) {
      switch (process.env.LOG_LEVEL.toUpperCase()) {
        case 'DEBUG': config.level = LogLevel.DEBUG; break;
        case 'INFO': config.level = LogLevel.INFO; break;
        case 'WARN': config.level = LogLevel.WARN; break;
        case 'ERROR': config.level = LogLevel.ERROR; break;
      }
    }
    
    if (process.env.LOG_FORMAT) {
      config.format = process.env.LOG_FORMAT === 'json' ? 'json' : 'simple';
    }
    
    if (process.env.LOG_TIMESTAMP) {
      config.includeTimestamp = process.env.LOG_TIMESTAMP === 'true';
    }
    
    if (process.env.LOG_COLORIZE) {
      config.colorize = process.env.LOG_COLORIZE === 'true';
    }
    
    if (process.env.LOG_TO_CONSOLE) {
      config.outputToConsole = process.env.LOG_TO_CONSOLE === 'true';
    }
    
    if (process.env.LOG_TO_FILE) {
      config.outputToFile = process.env.LOG_TO_FILE === 'true';
    }
    
    if (process.env.LOG_FILE_PATH) {
      config.logFilePath = process.env.LOG_FILE_PATH;
    }
    
    return config;
  }
}