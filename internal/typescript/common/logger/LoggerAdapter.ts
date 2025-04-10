/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Logger } from '../../../../packages/common/src/utils/logger';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';

/**
 * Adapter that converts the common Logger to the domain LoggerService interface
 * 
 * This adapter allows the domain layer to use the common Logger implementation
 * without depending on its implementation details.
 */
export class LoggerAdapter implements LoggerService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  child(subContext: string): LoggerService {
    return new LoggerAdapter(this.logger.child(subContext));
  }
}

/**
 * Create a LoggerService implementation from the default logger
 */
export function createLoggerService(): LoggerService {
  // We need to use dynamic import because we want to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createLogger } = require('../../../../packages/common/src/utils/logger');
  return new LoggerAdapter(createLogger({ context: 'Domain' }));
}

/**
 * Default logger service for domain layer
 */
export const defaultLoggerService = createLoggerService();