/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Rate limiter implementation for API clients
 * 
 * This utility helps manage API rate limits by throttling requests
 * and adapting to API responses.
 */

export interface RateLimiterOptions {
  /**
   * Maximum requests per minute
   */
  maxRequestsPerMinute: number;
  
  /**
   * Initial delay between requests in milliseconds
   */
  initialDelayMs: number;
  
  /**
   * Maximum delay between requests in milliseconds
   */
  maxDelayMs: number;
  
  /**
   * Backoff factor when rate limit is approached
   */
  backoffFactor: number;
  
  /**
   * Threshold percentage of rate limit at which to start backing off
   */
  backoffThreshold: number;
}

export class RateLimiter {
  private options: RateLimiterOptions;
  private requestTimestamps: number[] = [];
  private currentDelay: number;
  private isRateLimited: boolean = false;
  
  constructor(options: Partial<RateLimiterOptions> = {}) {
    // Default options
    this.options = {
      maxRequestsPerMinute: 120, // 2 requests per second
      initialDelayMs: 100,
      maxDelayMs: 10000, // 10 seconds
      backoffFactor: 1.5,
      backoffThreshold: 0.8, // 80% of limit
      ...options
    };
    
    this.currentDelay = this.options.initialDelayMs;
  }
  
  /**
   * Wait for appropriate delay before making a request
   */
  public async throttle(): Promise<void> {
    // If currently rate limited, use max delay
    if (this.isRateLimited) {
      await this.delay(this.options.maxDelayMs);
      this.isRateLimited = false;
      return;
    }
    
    // Clean up old timestamps (older than 1 minute)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
    
    // Calculate current usage as percentage of limit
    const currentRequests = this.requestTimestamps.length;
    const usagePercentage = currentRequests / this.options.maxRequestsPerMinute;
    
    // Adjust delay based on current usage
    if (usagePercentage >= this.options.backoffThreshold) {
      this.currentDelay = Math.min(
        this.currentDelay * this.options.backoffFactor,
        this.options.maxDelayMs
      );
    } else {
      this.currentDelay = Math.max(
        this.currentDelay / this.options.backoffFactor,
        this.options.initialDelayMs
      );
    }
    
    // Wait for the calculated delay
    await this.delay(this.currentDelay);
    
    // Record this request
    this.requestTimestamps.push(Date.now());
  }
  
  /**
   * Handle rate limit response from API
   * @param resetTimeMs Time until rate limit resets in milliseconds
   */
  public handleRateLimitResponse(resetTimeMs: number): void {
    this.isRateLimited = true;
    console.warn(`Rate limit hit. Backing off for ${resetTimeMs}ms`);
  }
  
  /**
   * Reset the rate limiter
   */
  public reset(): void {
    this.requestTimestamps = [];
    this.currentDelay = this.options.initialDelayMs;
    this.isRateLimited = false;
  }
  
  /**
   * Get current request metrics
   */
  public getMetrics(): {
    requestsLastMinute: number;
    currentDelayMs: number;
    isRateLimited: boolean;
  } {
    const now = Date.now();
    const requestsLastMinute = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    ).length;
    
    return {
      requestsLastMinute,
      currentDelayMs: this.currentDelay,
      isRateLimited: this.isRateLimited
    };
  }
  
  /**
   * Promise-based delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}