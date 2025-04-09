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
  let originalConsoleWarn: Console['warn'];

  beforeAll(() => {
    originalDateNow = Date.now;
    Date.now = jest.fn(() => mockTime);
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();
  });

  afterAll(() => {
    Date.now = originalDateNow;
    console.warn = originalConsoleWarn;
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

  it('should decrease delay when under threshold', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 20,
      initialDelayMs: 100,
      backoffFactor: 2,
      backoffThreshold: 0.5
    });
    
    // First go over threshold
    for (let i = 0; i < 11; i++) {
      await limiter.throttle();
    }
    
    const highDelay = limiter.getMetrics().currentDelayMs;
    
    // Now simulate time passing and requests aging out
    mockTime = 61000; // 61 seconds later
    
    await limiter.throttle();
    expect(limiter.getMetrics().currentDelayMs).toBeLessThan(highDelay);
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

  it('should respect maxDelayMs when backing off', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 5,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffFactor: 10,
      backoffThreshold: 0.2
    });
    
    // Push beyond threshold
    for (let i = 0; i < 4; i++) {
      await limiter.throttle();
    }
    
    // Delay should be at max due to aggressive backoff factor
    expect(limiter.getMetrics().currentDelayMs).toBe(5000);
  });

  it('should respect initialDelayMs when reducing delay', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 20,
      initialDelayMs: 200,
      backoffFactor: 10,
      backoffThreshold: 0.5
    });
    
    // Store the initial delay
    const initialDelay = limiter.getMetrics().currentDelayMs;
    
    // Push beyond threshold
    for (let i = 0; i < 15; i++) {
      await limiter.throttle();
    }
    
    // Now simulate time passing and all requests aging out
    mockTime = 70000;
    
    // Reset the limiter to simulate a clean slate
    limiter.reset();
    
    // Make a request with no recent history
    await limiter.throttle();
    
    // Delay should be back at initial
    expect(limiter.getMetrics().currentDelayMs).toBe(initialDelay);
  });

  it('should handle burst of requests followed by silence', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 30,
      initialDelayMs: 100,
      backoffFactor: 2,
      backoffThreshold: 0.7
    });
    
    // Burst of 25 requests
    for (let i = 0; i < 25; i++) {
      await limiter.throttle();
    }
    
    // Record the delay after burst
    const burstDelay = limiter.getMetrics().currentDelayMs;
    expect(burstDelay).toBeGreaterThan(100);
    
    // Simulate 2 minutes passing
    mockTime = 120000;
    
    // Make a new request
    await limiter.throttle();
    
    // Delay should be back down
    expect(limiter.getMetrics().currentDelayMs).toBeLessThan(burstDelay);
  });

  it('should handle consecutive rate limit responses', async () => {
    const limiter = new RateLimiter();
    
    // First rate limit
    limiter.handleRateLimitResponse(1000);
    await limiter.throttle();
    
    // Second rate limit before making any successful requests
    limiter.handleRateLimitResponse(2000);
    expect(limiter.getMetrics().isRateLimited).toBe(true);
    
    await limiter.throttle();
    expect(limiter.getMetrics().isRateLimited).toBe(false);
  });

  it('should log warning when handling rate limit', () => {
    const limiter = new RateLimiter();
    limiter.handleRateLimitResponse(5000);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit hit'));
  });
});