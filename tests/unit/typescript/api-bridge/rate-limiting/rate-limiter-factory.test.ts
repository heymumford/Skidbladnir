/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { getRateLimiter, resetAllLimiters } from '../../../../../internal/typescript/api-bridge/rate-limiting/rate-limiter-factory';

describe('RateLimiterFactory', () => {
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
    
    // Reset all limiters before each test to ensure clean state
    resetAllLimiters();
  });

  it('should return the same instance on multiple calls', () => {
    const instance1 = getRateLimiter();
    const instance2 = getRateLimiter();
    
    expect(instance1).toBe(instance2);
  });

  it('should configure rate limiters for known providers', async () => {
    const rateLimiter = getRateLimiter();
    
    // Test different provider configurations by checking their initial delay
    const azureMetrics = rateLimiter.getMetrics('azure-devops');
    const rallyMetrics = rateLimiter.getMetrics('rally');
    const jiraMetrics = rateLimiter.getMetrics('jira');
    
    // Each should have its configured initial delay
    expect(azureMetrics.currentDelayMs).toBe(50);
    expect(rallyMetrics.currentDelayMs).toBe(200);
    expect(jiraMetrics.currentDelayMs).toBe(150);
  });

  it('should use default configuration for unknown providers', () => {
    const rateLimiter = getRateLimiter();
    
    // Unknown provider should use default config
    const unknownMetrics = rateLimiter.getMetrics('unknown-provider');
    
    // Should use the default initial delay
    expect(unknownMetrics.currentDelayMs).toBe(100);
  });

  it('should reset all limiters properly', async () => {
    const rateLimiter = getRateLimiter();
    
    // Make some requests with various providers
    await rateLimiter.throttle('azure-devops');
    await rateLimiter.throttle('rally');
    await rateLimiter.throttle('jira');
    
    // Verify we have some requests tracked
    expect(rateLimiter.getMetrics('azure-devops').requestsLastMinute).toBe(1);
    expect(rateLimiter.getMetrics('rally').requestsLastMinute).toBe(1);
    expect(rateLimiter.getMetrics('jira').requestsLastMinute).toBe(1);
    
    // Reset all limiters
    resetAllLimiters();
    
    // Verify all are reset
    expect(rateLimiter.getMetrics('azure-devops').requestsLastMinute).toBe(0);
    expect(rateLimiter.getMetrics('rally').requestsLastMinute).toBe(0);
    expect(rateLimiter.getMetrics('jira').requestsLastMinute).toBe(0);
  });
});