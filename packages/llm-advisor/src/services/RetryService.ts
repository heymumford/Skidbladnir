/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ConfigurationService } from './ConfigurationService';
import { LoggingService } from './LoggingService';

/**
 * Provides retry functionality with exponential backoff for LLM service resilience
 */
export class RetryService {
  private static instance: RetryService;
  private maxAttempts: number;
  private baseDelayMs: number;
  private logger = LoggingService.getInstance().getLogger('RetryService');

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const config = ConfigurationService.getInstance().getResilienceConfig();
    this.maxAttempts = config.retryAttempts;
    this.baseDelayMs = config.retryBaseDelayMs;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Execute a function with retry logic
   * 
   * @param operation Function to execute with retry logic
   * @param isRetryable Optional function to determine if an error is retryable
   * @returns Result of the operation
   * @throws Last error encountered if all retries fail
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    isRetryable: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error; // Rethrow if not an Error object
        }
        
        lastError = error;
        
        if (!isRetryable(error) || attempt >= this.maxAttempts) {
          break;
        }
        
        const delayMs = this.calculateBackoff(attempt);
        this.logger.warn(`Retry attempt ${attempt}/${this.maxAttempts} after ${delayMs}ms due to: ${error.message}`);
        await this.delay(delayMs);
      }
    }
    
    if (lastError) {
      this.logger.error(`All ${this.maxAttempts} retry attempts failed`);
      throw lastError;
    }
    
    throw new Error('Retry operation failed without an error');
  }

  /**
   * Calculate backoff delay using exponential strategy with jitter
   * 
   * @param attempt Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number): number {
    // Base exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
    
    // Add some jitter (±20%) to prevent thundering herd problem
    const jitterFactor = 0.8 + (Math.random() * 0.4);
    
    return Math.floor(exponentialDelay * jitterFactor);
  }

  /**
   * Delay execution for a specified time
   * 
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}