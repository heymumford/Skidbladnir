/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiRateLimiter } from '../../../internal/typescript/api-bridge/rate-limiting/api-rate-limiter';
import nock from 'nock';

describe('API Rate Limiter Integration Tests', () => {
  let axiosInstance: AxiosInstance;
  let rateLimiter: ApiRateLimiter;
  
  const baseUrl = 'https://api.example.com';
  
  beforeAll(() => {
    // Enable nock for HTTP request mocking
    nock.disableNetConnect();
  });
  
  afterAll(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });
  
  beforeEach(() => {
    nock.cleanAll();
    
    // Create fresh instances for each test
    rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 10,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.5,
        rateLimitStatusCodes: [429]
      }
    });
    
    // Create axios instance with the rate limiter interceptors
    axiosInstance = axios.create({
      baseURL: baseUrl
    });
    
    const interceptors = rateLimiter.createAxiosInterceptor('test-provider');
    
    // Add request interceptor
    axiosInstance.interceptors.request.use(
      interceptors.request,
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor
    axiosInstance.interceptors.response.use(
      interceptors.response,
      interceptors.error
    );
  });
  
  it('should successfully make API calls when rate limits are not hit', async () => {
    // Mock successful API response
    nock(baseUrl)
      .get('/data')
      .times(3)
      .reply(200, { message: 'Success' });
    
    // Make several API calls
    const promises = Array(3).fill(0).map(() => 
      axiosInstance.get('/data')
    );
    
    // All should resolve successfully
    const responses = await Promise.all(promises);
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: 'Success' });
    });
    
    // Should have tracked the requests
    expect(rateLimiter.getMetrics('test-provider').requestsLastMinute).toBe(3);
  });
  
  it('should handle 429 responses with Retry-After header', async () => {
    // First call succeeds
    nock(baseUrl)
      .get('/data')
      .reply(200, { message: 'Success' });
    
    // Second call hits rate limit
    nock(baseUrl)
      .get('/data')
      .reply(429, { message: 'Too Many Requests' }, {
        'Retry-After': '30' // 30 seconds
      });
    
    // Third call succeeds after rate limit cooldown
    nock(baseUrl)
      .get('/data')
      .reply(200, { message: 'Success' });
    
    // First call
    const response1 = await axiosInstance.get('/data');
    expect(response1.status).toBe(200);
    
    // Second call - should fail with 429
    try {
      await axiosInstance.get('/data');
      fail('Should have thrown a 429 error');
    } catch (error: any) {
      expect(error.response.status).toBe(429);
      
      // Rate limiter should be triggered
      expect(rateLimiter.isRateLimited('test-provider')).toBe(true);
    }
    
    // Reset rate limiter state since we can't actually wait
    rateLimiter.reset('test-provider');
    
    // Third call should succeed
    const response3 = await axiosInstance.get('/data');
    expect(response3.status).toBe(200);
  });
  
  it('should handle custom rate limit headers', async () => {
    // Create a provider with custom rate limit header
    rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: 10,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 2,
        backoffThreshold: 0.5
      },
      providerConfigs: [
        {
          providerName: 'custom-provider',
          maxRequestsPerMinute: 5,
          initialDelayMs: 200,
          maxDelayMs: 10000,
          backoffFactor: 2,
          backoffThreshold: 0.6,
          rateLimitStatusCodes: [429],
          retryAfterHeaderName: 'X-RateLimit-Reset'
        }
      ]
    });
    
    // Apply new interceptors
    const interceptors = rateLimiter.createAxiosInterceptor('custom-provider');
    axiosInstance.interceptors.request.use(interceptors.request);
    axiosInstance.interceptors.response.use(interceptors.response, interceptors.error);
    
    // First call succeeds
    nock(baseUrl)
      .get('/data')
      .reply(200, { message: 'Success' });
    
    // Second call hits rate limit with custom header
    nock(baseUrl)
      .get('/data')
      .reply(429, { message: 'Too Many Requests' }, {
        'X-RateLimit-Reset': '45' // 45 seconds
      });
    
    // First call
    const response1 = await axiosInstance.get('/data');
    expect(response1.status).toBe(200);
    
    // Second call - should fail with 429
    try {
      await axiosInstance.get('/data');
      fail('Should have thrown a 429 error');
    } catch (error: any) {
      expect(error.response.status).toBe(429);
      
      // Rate limiter should be triggered
      expect(rateLimiter.isRateLimited('custom-provider')).toBe(true);
    }
  });
  
  it('should track requests properly during bursts', async () => {
    // Mock successful API responses
    nock(baseUrl)
      .get('/data')
      .times(5)
      .reply(200, { message: 'Success' });
    
    // Make several API calls
    for (let i = 0; i < 5; i++) {
      const response = await axiosInstance.get('/data');
      expect(response.status).toBe(200);
    }
    
    // Should have tracked the exact number of requests
    expect(rateLimiter.getMetrics('test-provider').requestsLastMinute).toBe(5);
  });
});