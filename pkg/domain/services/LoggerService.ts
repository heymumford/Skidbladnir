/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Domain interface for logging service
 * 
 * This interface allows the domain layer to use logging without depending
 * on specific logging implementations. Infrastructure implementations can
 * provide different logging backends.
 */
export interface LoggerService {
  /**
   * Log debug level message
   */
  debug(message: string, ...meta: any[]): void;

  /**
   * Log info level message
   */
  info(message: string, ...meta: any[]): void;

  /**
   * Log warning level message
   */
  warn(message: string, ...meta: any[]): void;

  /**
   * Log error level message
   */
  error(message: string, ...meta: any[]): void;

  /**
   * Create a child logger with a sub-context
   */
  child(subContext: string): LoggerService;
}