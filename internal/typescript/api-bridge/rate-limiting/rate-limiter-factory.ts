/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ApiRateLimiter, ProviderRateLimitConfig } from './api-rate-limiter';
import { AxiosError } from 'axios';

const DefaultConfig: Omit<ProviderRateLimitConfig, 'providerName'> = {
  maxRequestsPerMinute: 120,
  initialDelayMs: 100,
  maxDelayMs: 30000,
  backoffFactor: 2,
  backoffThreshold: 0.7,
  rateLimitStatusCodes: [429]
};

// Provider-specific configurations
const ProviderConfigurations: ProviderRateLimitConfig[] = [
  {
    providerName: 'azure-devops',
    maxRequestsPerMinute: 300,
    initialDelayMs: 50,
    maxDelayMs: 15000,
    backoffFactor: 1.5,
    backoffThreshold: 0.7,
    rateLimitStatusCodes: [429, 503]
  },
  {
    providerName: 'rally',
    maxRequestsPerMinute: 60,
    initialDelayMs: 200,
    maxDelayMs: 60000,
    backoffFactor: 2.5,
    backoffThreshold: 0.6,
    rateLimitStatusCodes: [429, 503],
    retryAfterHeaderName: 'X-RateLimit-Reset'
  },
  {
    providerName: 'jira',
    maxRequestsPerMinute: 100,
    initialDelayMs: 150,
    maxDelayMs: 30000,
    backoffFactor: 2,
    backoffThreshold: 0.7,
    rateLimitStatusCodes: [429],
    extractResetTime: (error: AxiosError): number | undefined => {
      if (error.response?.headers?.['x-ratelimit-reset']) {
        // Jira uses Unix timestamp
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] as string);
        return Math.max(0, resetTime * 1000 - Date.now());
      }
      return undefined;
    }
  },
  {
    providerName: 'zephyr',
    maxRequestsPerMinute: 180,
    initialDelayMs: 100,
    maxDelayMs: 20000,
    backoffFactor: 1.8,
    backoffThreshold: 0.75,
    rateLimitStatusCodes: [429, 503]
  },
  {
    providerName: 'qtest',
    maxRequestsPerMinute: 200,
    initialDelayMs: 80,
    maxDelayMs: 15000,
    backoffFactor: 1.5,
    backoffThreshold: 0.8,
    rateLimitStatusCodes: [429]
  },
  {
    providerName: 'hp-alm',
    maxRequestsPerMinute: 150,
    initialDelayMs: 120,
    maxDelayMs: 25000,
    backoffFactor: 2,
    backoffThreshold: 0.7,
    rateLimitStatusCodes: [429, 500]
  }
];

// Singleton instance
let instance: ApiRateLimiter | null = null;

export const getRateLimiter = (): ApiRateLimiter => {
  if (!instance) {
    instance = new ApiRateLimiter({
      defaultConfig: DefaultConfig,
      providerConfigs: ProviderConfigurations
    });
  }
  
  return instance;
};

export const resetAllLimiters = (): void => {
  if (instance) {
    ProviderConfigurations.forEach(config => {
      instance!.reset(config.providerName);
    });
  }
};