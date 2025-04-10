/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Standard error handling for external service providers
 */

import { ExternalServiceError } from '../../../../pkg/domain/errors/DomainErrors';

/**
 * Error context for provider errors
 */
export interface ErrorContext {
  operation: string;
  params?: Record<string, any>;
  additionalInfo?: Record<string, any>;
}

/**
 * Options for error handler
 */
export interface ErrorHandlerOptions {
  includeErrorStack?: boolean;
  includeParams?: boolean;
  sensitiveParamKeys?: string[];
}

/**
 * Default options for error handler
 */
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  includeErrorStack: false,
  includeParams: true,
  sensitiveParamKeys: ['password', 'apiToken', 'token', 'key', 'secret', 'auth', 'credential']
};

/**
 * Creates a standardized error handler for a provider
 * 
 * @param serviceName Name of the external service (e.g., "Zephyr Scale", "qTest Manager")
 * @param options Configuration options for the error handler
 * @returns A function that wraps errors in a standardized format
 */
export const createErrorHandler = (
  serviceName: string,
  options: ErrorHandlerOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  /**
   * Wraps any error in a standardized ExternalServiceError
   * 
   * @param message Human-readable error message
   * @param error Original error that was caught
   * @param context Additional context for debugging
   * @returns Standardized ExternalServiceError
   */
  return function wrapError(
    message: string,
    error: unknown,
    context?: ErrorContext
  ): ExternalServiceError {
    // Format the original error
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      if (config.includeErrorStack && error.stack) {
        errorDetails += `\nStack: ${error.stack}`;
      }
    } else if (error !== null && error !== undefined) {
      errorDetails = String(error);
    }
    
    // Build the complete error message
    let errorMessage = `${message}: ${errorDetails}`;
    
    // Add context information if provided
    if (context) {
      errorMessage += `\nOperation: ${context.operation}`;
      
      // Include parameters if enabled and provided, hiding sensitive values
      if (config.includeParams && context.params) {
        const safeParams = { ...context.params };
        
        // Redact sensitive parameters
        for (const key of config.sensitiveParamKeys || []) {
          if (key in safeParams) {
            safeParams[key] = '***REDACTED***';
          }
        }
        
        errorMessage += `\nParameters: ${JSON.stringify(safeParams)}`;
      }
      
      // Include any additional contextual information
      if (context.additionalInfo) {
        errorMessage += `\nAdditional Info: ${JSON.stringify(context.additionalInfo)}`;
      }
    }
    
    return new ExternalServiceError(serviceName, errorMessage);
  };
};

/**
 * Creates a wrapped method that automatically handles errors using the provided error handler
 * 
 * @param method The async method to wrap with error handling
 * @param errorHandler The error handler function to use
 * @param operationName Name of the operation (for error context)
 * @returns A wrapped method with standardized error handling
 */
export const withErrorHandling = <T extends any[], R>(
  method: (...args: T) => Promise<R>,
  errorHandler: (message: string, error: unknown, context?: ErrorContext) => ExternalServiceError,
  operationName: string
): ((...args: T) => Promise<R>) => {
  return async function(...args: T): Promise<R> {
    try {
      return await method(...args);
    } catch (error) {
      // Get the parameters for context, but only if they don't contain circular references
      let params: Record<string, any> | undefined = undefined;
      try {
        params = JSON.parse(JSON.stringify(args));
      } catch (e) {
        // If we can't serialize the parameters, just ignore them
      }
      
      throw errorHandler(
        `Failed during ${operationName}`,
        error,
        { operation: operationName, params }
      );
    }
  };
};

/**
 * Utility to create an error handler and apply it to an entire class
 * 
 * @param target The class or object to apply error handling to
 * @param serviceName The name of the service for error messages
 * @param methodNames List of method names to wrap with error handling
 * @param options Error handler options
 */
export const applyErrorHandling = (
  target: any,
  serviceName: string,
  methodNames: string[],
  options: ErrorHandlerOptions = {}
): void => {
  const errorHandler = createErrorHandler(serviceName, options);
  
  for (const methodName of methodNames) {
    const originalMethod = target[methodName];
    if (typeof originalMethod === 'function') {
      target[methodName] = withErrorHandling(
        originalMethod.bind(target),
        errorHandler,
        methodName
      );
    }
  }
};