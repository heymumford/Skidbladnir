/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Interface for logging services.
 */
export interface LoggerService {
  /**
   * Log a debug message.
   * 
   * @param message The message to log
   * @param meta Optional metadata
   */
  debug(message: string, meta?: Record<string, any>): void;
  
  /**
   * Log an informational message.
   * 
   * @param message The message to log
   * @param meta Optional metadata
   */
  info(message: string, meta?: Record<string, any>): void;
  
  /**
   * Log a warning message.
   * 
   * @param message The message to log
   * @param meta Optional metadata
   */
  warn(message: string, meta?: Record<string, any>): void;
  
  /**
   * Log an error message.
   * 
   * @param message The message to log
   * @param meta Optional metadata
   */
  error(message: string, meta?: Record<string, any>): void;
}