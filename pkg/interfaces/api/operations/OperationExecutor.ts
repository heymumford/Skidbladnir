/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  Operation, 
  OperationContext, 
  OperationResult, 
  OperationType 
} from './types';

/**
 * Executes operations in the proper order with error handling and context management.
 */
export class OperationExecutor {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly retryDelayMs: number = 1000
  ) {}

  /**
   * Executes a list of operations in the provided order.
   * @param operations Array of operations to execute
   * @param context Initial operation context
   * @returns Array of operation results
   */
  async executeOperations(
    operations: Operation[],
    context: OperationContext
  ): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    
    // Execute each operation in sequence
    for (const operation of operations) {
      // Check for abort signal
      if (context.abortSignal?.aborted) {
        break;
      }
      
      // Execute with resilience and collect result
      const result = await this.executeWithResilience(operation, context);
      results.push(result);
      
      // If an operation fails, stop execution
      if (!result.success) {
        break;
      }
      
      // Update context with result for next operation
      context.results[result.operationType] = result.data;
    }
    
    return results;
  }

  /**
   * Executes an operation with retry logic for resilience.
   * @param operation The operation to execute
   * @param context The operation context
   * @returns The operation result
   */
  async executeWithResilience(
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult> {
    let attempt = 0;
    let lastError: Error | undefined;
    
    while (attempt < this.maxRetries) {
      try {
        // Check for abort signal
        if (context.abortSignal?.aborted) {
          throw new Error('Operation was aborted');
        }
        
        const result = await this.executeOperation(operation, context);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if operation was aborted
        if (context.abortSignal?.aborted) {
          break;
        }
        
        attempt++;
        
        // If we've reached max retries, break out of loop
        if (attempt >= this.maxRetries) {
          break;
        }
        
        // Exponential backoff for retries
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If all attempts failed, return an error result
    return {
      operationType: operation.definition.type,
      success: false,
      error: lastError || new Error('Operation failed after max retries'),
      durationMs: 0,
      timestamp: new Date()
    };
  }

  /**
   * Executes a single operation and measures its execution time.
   * @param operation The operation to execute
   * @param context The operation context
   * @returns The operation result
   */
  async executeOperation(
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult> {
    const startTime = Date.now();
    
    try {
      // Check for required parameters
      this.validateRequiredParams(operation, context);
      
      // Execute the operation
      const data = await operation.execute(context);
      
      // Calculate duration and return result
      const durationMs = Date.now() - startTime;
      
      return {
        operationType: operation.definition.type,
        success: true,
        data,
        durationMs,
        timestamp: new Date()
      };
    } catch (error) {
      // Calculate duration and return error result
      const durationMs = Date.now() - startTime;
      
      return {
        operationType: operation.definition.type,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs,
        timestamp: new Date()
      };
    }
  }
  }

  /**
   * Validates that all required parameters are present in the context.
   * @param operation The operation to validate parameters for
   * @param context The operation context
   */
  private validateRequiredParams(operation: Operation, context: OperationContext): void {
    const { requiredParams } = operation.definition;
    
    for (const param of requiredParams) {
      if (context.input[param] === undefined || context.input[param] === null) {
        throw new Error(`Missing required parameter: ${param} for operation ${operation.definition.type}`);
      }
    }
  }
}