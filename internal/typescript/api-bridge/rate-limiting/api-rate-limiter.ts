/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { RateLimiter } from '../../../../packages/common/src/utils/rate-limiter';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface ProviderRateLimitConfig {
  providerName: string;
  maxRequestsPerMinute: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  backoffThreshold: number;
  retryAfterHeaderName?: string;
  rateLimitStatusCodes?: number[];
  extractResetTime?: (error: AxiosError) => number | undefined;
}

export interface ApiRateLimiterOptions {
  defaultConfig: Omit<ProviderRateLimitConfig, 'providerName'>;
  providerConfigs?: ProviderRateLimitConfig[];
}

export class ApiRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  private defaultConfig: Omit<ProviderRateLimitConfig, 'providerName'>;
  private providerConfigs: Map<string, ProviderRateLimitConfig> = new Map();
  
  constructor(options: ApiRateLimiterOptions) {
    this.defaultConfig = options.defaultConfig;
    
    if (options.providerConfigs) {
      options.providerConfigs.forEach(config => {
        this.providerConfigs.set(config.providerName, config);
      });
    }
  }
  
  private getLimiter(providerName: string): RateLimiter {
    if (!this.limiters.has(providerName)) {
      const config = this.providerConfigs.get(providerName) || { 
        providerName, 
        ...this.defaultConfig 
      };
      
      const limiter = new RateLimiter({
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        initialDelayMs: config.initialDelayMs,
        maxDelayMs: config.maxDelayMs,
        backoffFactor: config.backoffFactor,
        backoffThreshold: config.backoffThreshold
      });
      
      this.limiters.set(providerName, limiter);
      return limiter;
    }
    
    return this.limiters.get(providerName)!;
  }
  
  public async throttle(providerName: string): Promise<void> {
    const limiter = this.getLimiter(providerName);
    await limiter.throttle();
  }
  
  public getMetrics(providerName: string) {
    const limiter = this.getLimiter(providerName);
    return limiter.getMetrics();
  }
  
  public reset(providerName: string): void {
    const limiter = this.getLimiter(providerName);
    limiter.reset();
  }
  
  public handleRateLimitResponse(providerName: string, error: AxiosError): void {
    const limiter = this.getLimiter(providerName);
    const config = this.providerConfigs.get(providerName) || {
      providerName,
      ...this.defaultConfig
    };
    
    let resetTimeMs = 60000; // Default 1 minute
    
    // Try to extract reset time from custom extractor
    if (config.extractResetTime) {
      const extractedTime = config.extractResetTime(error);
      if (extractedTime) {
        resetTimeMs = extractedTime;
      }
    } 
    // Try to extract from Retry-After or custom header
    else if (error.response?.headers) {
      const headerName = config.retryAfterHeaderName || 'retry-after';
      const retryAfter = error.response.headers[headerName];
      
      if (retryAfter) {
        // Check if it's a timestamp or number of seconds
        if (isNaN(Number(retryAfter))) {
          // Timestamp format
          const retryDate = new Date(retryAfter);
          resetTimeMs = Math.max(0, retryDate.getTime() - Date.now());
        } else {
          // Seconds format
          resetTimeMs = Number(retryAfter) * 1000;
        }
      }
    }
    
    limiter.handleRateLimitResponse(resetTimeMs);
  }
  
  public isRateLimited(providerName: string): boolean {
    return this.getLimiter(providerName).getMetrics().isRateLimited;
  }
  
  public createAxiosInterceptor(providerName: string) {
    return {
      request: async (config: AxiosRequestConfig) => {
        await this.throttle(providerName);
        return config;
      },
      response: (response: AxiosResponse) => {
        return response;
      },
      error: (error: AxiosError) => {
        const config = this.providerConfigs.get(providerName) || {
          providerName,
          ...this.defaultConfig,
          rateLimitStatusCodes: [429]
        };
        
        const statusCodes = config.rateLimitStatusCodes || [429];
        
        if (error.response && statusCodes.includes(error.response.status)) {
          this.handleRateLimitResponse(providerName, error);
        }
        
        return Promise.reject(error);
      }
    };
  }
}