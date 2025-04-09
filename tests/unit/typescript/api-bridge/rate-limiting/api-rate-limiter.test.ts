/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ApiRateLimiter } from '../../../../../internal/typescript/api-bridge/rate-limiting/api-rate-limiter';
import axios, { AxiosError } from 'axios';

jest.mock('axios');

describe('ApiRateLimiter', () => {
  // Mock Date.now for consistent testing
  let originalDateNow: () => number;
  let mockTime = 0;

  beforeAll(() => {
    originalDateNow = Date.now;
    Date.now = jest.fn(() => mockTime);
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  beforeEach(() => {
    mockTime = 0;
    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') cb();
      return null as any;
    });
  });

  it('should initialize with default options', () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 200,
        maxDelayMs: 20000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      }
    });

    const metrics = rateLimiter.getMetrics('test-provider');
    expect(metrics.currentDelayMs).toBe(200);
    expect(metrics.requestsLastMinute).toBe(0);
    expect(metrics.isRateLimited).toBe(false);
  });

  it('should use provider-specific configuration when available', () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 200,
        maxDelayMs: 20000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      },
      providerConfigs: [
        {
          providerName: 'custom-provider',
          maxRequestsPerMinute: 50,
          initialDelayMs: 300,
          maxDelayMs: 30000,
          backoffFactor: 3,
          backoffThreshold: 0.6
        }
      ]
    });

    const metrics = rateLimiter.getMetrics('custom-provider');
    expect(metrics.currentDelayMs).toBe(300); // Should use custom provider's initialDelayMs
  });

  it('should throttle requests based on provider settings', async () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 10,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.5
      }
    });

    // Make multiple requests to trigger backoff
    for (let i = 0; i < 5; i++) {
      await rateLimiter.throttle('test-provider');
    }

    // Get metrics after requests
    const metrics = rateLimiter.getMetrics('test-provider');
    expect(metrics.requestsLastMinute).toBe(5);
    expect(metrics.currentDelayMs).toBeGreaterThanOrEqual(100);
  });

  it('should reset provider rate limiter', async () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 10,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.5
      }
    });

    // Make some requests
    await rateLimiter.throttle('test-provider');
    await rateLimiter.throttle('test-provider');

    // Reset the limiter
    rateLimiter.reset('test-provider');

    // Verify it's reset
    const metrics = rateLimiter.getMetrics('test-provider');
    expect(metrics.requestsLastMinute).toBe(0);
    expect(metrics.currentDelayMs).toBe(100);
  });

  it('should handle rate limit responses with Retry-After header in seconds', () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      }
    });

    // Create mock Axios error with Retry-After header
    const error = {
      response: {
        status: 429,
        headers: {
          'retry-after': '60' // 60 seconds
        }
      }
    } as AxiosError;

    rateLimiter.handleRateLimitResponse('test-provider', error);
    
    // Should be rate limited
    expect(rateLimiter.isRateLimited('test-provider')).toBe(true);
  });

  it('should handle rate limit responses with Retry-After header as date', () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      }
    });

    // Set current time
    mockTime = new Date('2025-01-01T12:00:00Z').getTime();

    // Create mock Axios error with Retry-After header as date
    const error = {
      response: {
        status: 429,
        headers: {
          'retry-after': 'Wed, 01 Jan 2025 12:01:00 GMT' // 1 minute later
        }
      }
    } as AxiosError;

    rateLimiter.handleRateLimitResponse('test-provider', error);
    
    // Should be rate limited
    expect(rateLimiter.isRateLimited('test-provider')).toBe(true);
  });

  it('should handle rate limit responses with custom header', () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      },
      providerConfigs: [
        {
          providerName: 'custom-provider',
          maxRequestsPerMinute: 50,
          initialDelayMs: 300,
          maxDelayMs: 30000,
          backoffFactor: 3,
          backoffThreshold: 0.6,
          retryAfterHeaderName: 'x-rate-limit-reset'
        }
      ]
    });

    // Create mock Axios error with custom header
    const error = {
      response: {
        status: 429,
        headers: {
          'x-rate-limit-reset': '30' // 30 seconds
        }
      }
    } as AxiosError;

    rateLimiter.handleRateLimitResponse('custom-provider', error);
    
    // Should be rate limited
    expect(rateLimiter.isRateLimited('custom-provider')).toBe(true);
  });

  it('should use extractResetTime function when provided', () => {
    const extractResetTime = jest.fn().mockReturnValue(45000); // 45 seconds
    
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.7
      },
      providerConfigs: [
        {
          providerName: 'custom-provider',
          maxRequestsPerMinute: 50,
          initialDelayMs: 300,
          maxDelayMs: 30000,
          backoffFactor: 3,
          backoffThreshold: 0.6,
          extractResetTime
        }
      ]
    });

    // Create mock Axios error
    const error = {
      response: {
        status: 429,
        headers: {}
      }
    } as AxiosError;

    rateLimiter.handleRateLimitResponse('custom-provider', error);
    
    // Should have called the extract function
    expect(extractResetTime).toHaveBeenCalledWith(error);
    
    // Should be rate limited
    expect(rateLimiter.isRateLimited('custom-provider')).toBe(true);
  });

  it('should create axios interceptors that throttle requests', async () => {
    const rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 100,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.7,
        rateLimitStatusCodes: [429]
      }
    });

    const interceptors = rateLimiter.createAxiosInterceptor('test-provider');
    
    // Test request interceptor
    const throttleSpy = jest.spyOn(rateLimiter, 'throttle');
    const config = { headers: {} };
    await interceptors.request(config);
    
    expect(throttleSpy).toHaveBeenCalledWith('test-provider');
    
    // Test error interceptor with rate limit status
    const handleRateLimitSpy = jest.spyOn(rateLimiter, 'handleRateLimitResponse');
    const error = {
      response: {
        status: 429,
        headers: {}
      }
    } as AxiosError;
    
    await expect(interceptors.error(error)).rejects.toEqual(error);
    expect(handleRateLimitSpy).toHaveBeenCalledWith('test-provider', error);
    
    // Test error interceptor with non-rate limit status
    handleRateLimitSpy.mockClear();
    const nonRateLimitError = {
      response: {
        status: 500,
        headers: {}
      }
    } as AxiosError;
    
    await expect(interceptors.error(nonRateLimitError)).rejects.toEqual(nonRateLimitError);
    expect(handleRateLimitSpy).not.toHaveBeenCalled();
  });
});