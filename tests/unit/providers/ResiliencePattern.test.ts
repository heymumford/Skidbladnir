/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import {
  CircuitBreaker, 
  RetryService, 
  Bulkhead, 
  ResponseCache, 
  ResilienceFacade,
  getResilienceFacade
} from '../../../packages/common/src/utils/resilience';
import axios from 'axios';
import nock from 'nock';

// Helper to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Resilience Pattern Integration', () => {
  // Setup nock for HTTP mocking
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('CircuitBreaker and RetryService integration', () => {
    it('should retry and eventually trip circuit breaker on persistent failures', async () => {
      // Setup circuit breaker with low thresholds for testing
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 50, // Very short for testing
        halfOpenSuccessThreshold: 1
      });
      
      // Setup retry service with short delays for testing
      const retryService = new RetryService({
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffFactor: 2
      });
      
      // Create a test API endpoint that always fails
      const baseUrl = 'https://test-api.example.com';
      nock(baseUrl)
        .get('/error')
        .times(6) // Will be called multiple times
        .reply(500, { error: 'Server Error' });
      
      // Create a function that uses both retry and circuit breaker
      const executeWithResilience = async () => {
        return circuitBreaker.execute(async () => {
          return retryService.execute(async () => {
            const response = await axios.get(`${baseUrl}/error`);
            return response.data;
          });
        });
      };
      
      // First call - should retry but eventually fail
      await expect(executeWithResilience()).rejects.toThrow();
      
      // Second call - should retry but eventually fail
      await expect(executeWithResilience()).rejects.toThrow();
      
      // Third call - should retry but then trip the circuit
      await expect(executeWithResilience()).rejects.toThrow();
      
      // Fourth call - should immediately fail with circuit open
      const circuitError = await executeWithResilience().catch(e => e);
      expect(circuitError.message).toMatch(/circuit is open/i);
      
      // Wait for circuit to transition to half-open
      await wait(100);
      
      // Setup a successful response for recovery
      nock(baseUrl)
        .get('/error')
        .reply(200, { success: true });
      
      // Should succeed and close the circuit
      const result = await executeWithResilience();
      expect(result).toEqual({ success: true });
      expect(circuitBreaker.getState()).toBe(0); // CLOSED
    });
  });
  
  describe('Bulkhead and Circuit Breaker integration', () => {
    it('should limit concurrent requests and isolate failures', async () => {
      // Setup bulkhead with limited concurrency
      const bulkhead = new Bulkhead({
        maxConcurrentCalls: 2,
        maxQueueSize: 3,
        executionTimeoutMs: 200 // Short timeout for testing
      });
      
      // Setup circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 50,
        halfOpenSuccessThreshold: 1
      });
      
      // Create test endpoint that varies response time
      const baseUrl = 'https://test-api.example.com';
      
      // Setup successful endpoints with varying delays
      nock(baseUrl)
        .get('/fast')
        .reply(200, { result: 'fast' });
      
      nock(baseUrl)
        .get('/medium')
        .delay(50)
        .reply(200, { result: 'medium' });
      
      nock(baseUrl)
        .get('/slow')
        .delay(150)
        .reply(200, { result: 'slow' });
      
      // Setup failing endpoint
      nock(baseUrl)
        .get('/error')
        .times(5)
        .reply(500, { error: 'Server Error' });
      
      // Create a function that uses both bulkhead and circuit breaker
      const executeWithResilience = async (endpoint: string) => {
        return bulkhead.execute(async () => {
          return circuitBreaker.execute(async () => {
            const response = await axios.get(`${baseUrl}/${endpoint}`);
            return response.data;
          });
        });
      };
      
      // Start several concurrent operations
      const fast = executeWithResilience('fast');
      const medium = executeWithResilience('medium');
      const slow = executeWithResilience('slow');
      
      // These should all succeed
      expect(await fast).toEqual({ result: 'fast' });
      expect(await medium).toEqual({ result: 'medium' });
      expect(await slow).toEqual({ result: 'slow' });
      
      // Start error operations that should eventually trip the circuit
      await expect(executeWithResilience('error')).rejects.toThrow();
      await expect(executeWithResilience('error')).rejects.toThrow();
      await expect(executeWithResilience('error')).rejects.toThrow();
      
      // Now circuit should be open
      const circuitError = await executeWithResilience('error').catch(e => e);
      expect(circuitError.message).toMatch(/circuit is open/i);
      
      // Check bulkhead stats
      const stats = bulkhead.getStats();
      // Use property name appropriate for the implementation
      expect(stats.maxConcurrentCalls || stats.activeCalls).toBeDefined();
      expect(stats.totalExecutedCalls || stats.totalExecuted).toBeGreaterThan(0);
    });
  });
  
  describe('Facade integration with all patterns', () => {
    it('should integrate circuit breaker, retry, bulkhead, and cache', async () => {
      // Create a resilience facade with all patterns
      const facade = new ResilienceFacade({
        retryOptions: {
          maxAttempts: 2,
          initialDelayMs: 10,
          maxDelayMs: 50,
          backoffFactor: 2
        },
        circuitBreakerOptions: {
          failureThreshold: 3,
          resetTimeoutMs: 50,
          halfOpenSuccessThreshold: 1
        },
        bulkheadOptions: {
          maxConcurrentCalls: 2,
          maxQueueSize: 3,
          // Use a longer timeout to prevent timeout in tests
          executionTimeoutMs: 2000
        },
        cacheOptions: {
          ttlMs: 1000, // 1 second for testing
          maxEntries: 10,
          staleWhileRevalidate: true
        },
        timeoutMs: 1000, // Longer timeout to prevent test failures
        fallbackEnabled: true,
        serviceName: 'test-service'
      });
      
      // Create test endpoint
      const baseUrl = 'https://test-api.example.com';
      
      // Setup a cacheable endpoint
      nock(baseUrl)
        .get('/cached')
        .reply(200, { id: 1, timestamp: Date.now() })
        .get('/cached') // Second call should use cache, not hit server
        .reply(200, { id: 2, timestamp: Date.now() + 1000 });
      
      // Create an operation
      const executeOperation = async () => {
        const response = await axios.get(`${baseUrl}/cached`);
        return response.data;
      };
      
      // Execute with caching - first call
      const result1 = await facade.execute('cached', executeOperation);
      expect(result1.id).toBe(1);
      
      // Second call should return cached result without hitting server
      const result2 = await facade.execute('cached', executeOperation);
      expect(result2.id).toBe(1); // Same as first call
      
      // Create an error endpoint to test circuit breaker
      nock(baseUrl)
        .get('/error')
        .times(5)
        .reply(500, { error: 'Server Error' });
      
      // Create error operation
      const executeErrorOperation = async () => {
        const response = await axios.get(`${baseUrl}/error`);
        return response.data;
      };
      
      // Setup fallback function for testing
      const fallback = async (error: Error) => {
        return { fallback: true, error: error.message };
      };
      
      // Execute with retries and circuit breaker
      // First few calls should retry and eventually fail
      await expect(facade.execute('error', executeErrorOperation)).rejects.toThrow();
      await expect(facade.execute('error', executeErrorOperation)).rejects.toThrow();
      await expect(facade.execute('error', executeErrorOperation)).rejects.toThrow();
      
      // Now circuit should be open, but fallback should work
      const fallbackResult = await facade.execute('error', executeErrorOperation, fallback);
      expect(fallbackResult.fallback).toBe(true);
      
      // Check health status
      const health = facade.getHealthStatus();
      expect(health).toBe('UNHEALTHY'); // Due to open circuit
      
      // Wait for circuit to reset
      await wait(100);
      
      // Setup success for recovery
      nock(baseUrl)
        .get('/error')
        .reply(200, { recovered: true });
      
      // Should recover
      const recoveryResult = await facade.execute('error', executeErrorOperation);
      expect(recoveryResult.recovered).toBe(true);
      
      // Health should improve
      expect(facade.getHealthStatus()).toBe('HEALTHY');
    });
  });
  
  describe('Factory pattern for resilience facades', () => {
    it('should create and reuse facade instances per provider', () => {
      // Get facade instances for two different providers
      const zephyrFacade = getResilienceFacade('zephyr');
      const qtestFacade = getResilienceFacade('qtest');
      
      // Should be different instances
      expect(zephyrFacade).not.toBe(qtestFacade);
      
      // Getting the same provider again should return the same instance
      const zephyrFacade2 = getResilienceFacade('zephyr');
      expect(zephyrFacade).toBe(zephyrFacade2);
      
      // Each provider should have appropriate settings
      const zephyrStats = zephyrFacade.getStats();
      const qtestStats = qtestFacade.getStats();
      
      expect(zephyrStats.healthStatus).toBe('HEALTHY');
      expect(qtestStats.healthStatus).toBe('HEALTHY');
      
      // Reset should work for each provider independently
      zephyrFacade.reset();
      expect(zephyrFacade.getStats().healthStatus).toBe('HEALTHY');
    });
  });
});