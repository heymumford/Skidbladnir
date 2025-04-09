/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { RateLimiter } from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
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
    const limiter = new RateLimiter();
    expect(limiter.getMetrics().currentDelayMs).toBe(100);
    expect(limiter.getMetrics().requestsLastMinute).toBe(0);
    expect(limiter.getMetrics().isRateLimited).toBe(false);
  });

  it('should initialize with custom options', () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 200,
      initialDelayMs: 50,
      maxDelayMs: 5000,
      backoffFactor: 2,
      backoffThreshold: 0.7
    });
    expect(limiter.getMetrics().currentDelayMs).toBe(50);
  });

  it('should track requests within the last minute', async () => {
    const limiter = new RateLimiter();
    
    await limiter.throttle(); // First request
    mockTime = 30000; // 30 seconds later
    await limiter.throttle(); // Second request
    mockTime = 59000; // 59 seconds from start
    await limiter.throttle(); // Third request
    
    expect(limiter.getMetrics().requestsLastMinute).toBe(3);
    
    mockTime = 61000; // Just past 1 minute from start
    expect(limiter.getMetrics().requestsLastMinute).toBe(2);
    
    mockTime = 150000; // Past 1 minute for all requests
    expect(limiter.getMetrics().requestsLastMinute).toBe(0);
  });

  it('should increase delay as threshold is approached', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      initialDelayMs: 100,
      backoffFactor: 2,
      backoffThreshold: 0.5
    });
    
    // First 5 requests (50% of limit)
    for (let i = 0; i < 5; i++) {
      await limiter.throttle();
    }
    
    // Now we're at threshold, delay should increase
    const initialDelay = limiter.getMetrics().currentDelayMs;
    await limiter.throttle();
    expect(limiter.getMetrics().currentDelayMs).toBeGreaterThan(initialDelay);
  });

  it('should handle rate limit responses', async () => {
    const limiter = new RateLimiter();
    expect(limiter.getMetrics().isRateLimited).toBe(false);
    
    limiter.handleRateLimitResponse(30000);
    
    expect(limiter.getMetrics().isRateLimited).toBe(true);
    await limiter.throttle();
    expect(limiter.getMetrics().isRateLimited).toBe(false);
  });

  it('should reset to initial state', async () => {
    const limiter = new RateLimiter();
    
    await limiter.throttle();
    await limiter.throttle();
    limiter.handleRateLimitResponse(5000);
    
    limiter.reset();
    
    expect(limiter.getMetrics().requestsLastMinute).toBe(0);
    expect(limiter.getMetrics().currentDelayMs).toBe(100);
    expect(limiter.getMetrics().isRateLimited).toBe(false);
  });
});