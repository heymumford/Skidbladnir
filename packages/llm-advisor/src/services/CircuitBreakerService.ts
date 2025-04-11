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
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED, // Normal operation, requests flow through
  OPEN,   // Circuit is broken, requests fail fast
  HALF_OPEN // Trial state, limited requests allowed to test recovery
}

/**
 * Provides circuit breaker pattern implementation for LLM service resilience
 */
export class CircuitBreakerService {
  private static instance: CircuitBreakerService;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private logger = LoggingService.getInstance().getLogger('CircuitBreaker');
  
  // Circuit breaker configuration
  private threshold: number;
  private resetTimeMs: number;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const config = ConfigurationService.getInstance().getResilienceConfig();
    this.threshold = config.circuitBreakerThreshold;
    this.resetTimeMs = config.circuitBreakerResetTimeMs;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService();
    }
    return CircuitBreakerService.instance;
  }

  /**
   * Check if circuit is closed and requests can flow through
   */
  public isAllowed(): boolean {
    this.updateState();
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Get the current circuit state
   */
  public getState(): string {
    this.updateState();
    return CircuitState[this.state];
  }

  /**
   * Record a successful operation, potentially closing the circuit
   */
  public recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.info('Circuit closed after successful request in half-open state');
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed operation, potentially opening the circuit
   */
  public recordFailure(): void {
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Request failed in half-open state, reopening circuit');
      this.state = CircuitState.OPEN;
      return;
    }
    
    this.failureCount++;
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.threshold) {
      this.logger.warn(`Circuit opened after ${this.failureCount} consecutive failures`);
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Reset the circuit breaker to closed state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.logger.info('Circuit breaker manually reset');
  }

  /**
   * Update the circuit state based on time elapsed
   */
  private updateState(): void {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeMs) {
        this.logger.info(`Circuit half-opened after ${elapsed}ms cooling period`);
        this.state = CircuitState.HALF_OPEN;
      }
    }
  }
}