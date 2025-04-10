/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ApiBridge, createApiBridge, getSystemHealth } from '../../../../internal/typescript/api-bridge';
import { AuthenticationMethod } from '../../../../internal/typescript/api-bridge/auth/authentication-handler';
import nock from 'nock';
import axios from 'axios';

// Helper to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('API Bridge Integration', () => {
  let bridge: ApiBridge;
  const baseURL = 'https://api.example.com';
  
  beforeEach(() => {
    nock.cleanAll();
    
    // Create a bridge with a simple token auth
    bridge = createApiBridge({
      baseURL,
      serviceName: 'integration-test',
      providerName: 'test-provider',
      authentication: {
        credentials: {
          type: AuthenticationMethod.TOKEN,
          token: 'test-token'
        }
      },
      healthCheckEndpoint: '/health',
      resilience: {
        retryOptions: {
          maxAttempts: 2,
          initialDelayMs: 10,
          backoffFactor: 2
        },
        circuitBreakerOptions: {
          failureThreshold: 3,
          resetTimeoutMs: 100, // Short for testing
          halfOpenSuccessThreshold: 1
        },
        timeoutMs: 500
      }
    });
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  afterAll(() => {
    nock.restore();
  });
  
  describe('Authentication and Basic Operations', () => {
    it('should make authenticated requests', async () => {
      // Arrange
      const scope = nock(baseURL)
        .get('/resource')
        .matchHeader('Authorization', 'Bearer test-token')
        .reply(200, { data: 'success' });
      
      // Act
      const response = await bridge.get('/resource');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success' });
      expect(scope.isDone()).toBeTruthy();
    });
    
    it('should handle POST requests with data', async () => {
      // Arrange
      const postData = { name: 'Test', value: 123 };
      const scope = nock(baseURL)
        .post('/resource', postData)
        .matchHeader('Authorization', 'Bearer test-token')
        .reply(201, { id: 1, ...postData });
      
      // Act
      const response = await bridge.post('/resource', postData);
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toEqual({ id: 1, name: 'Test', value: 123 });
      expect(scope.isDone()).toBeTruthy();
    });
    
    it('should support request cancellation', async () => {
      // Arrange
      const scope = nock(baseURL)
        .get('/slow-resource')
        .delay(1000)
        .reply(200, { data: 'delayed response' });
      
      // Act
      const source = bridge.createCancelTokenSource();
      const promise = bridge.get('/slow-resource', { cancelToken: source.token });
      
      // Cancel after short delay
      setTimeout(() => {
        source.cancel('Operation cancelled by test');
      }, 50);
      
      // Assert
      try {
        await promise;
        fail('Request should have been cancelled');
      } catch (error) {
        expect(bridge.isCancel(error)).toBe(true);
        expect((error as Error).message).toBe('Operation cancelled by test');
      }
    });
  });
  
  describe('Resilience Patterns', () => {
    it('should retry on transient errors', async () => {
      // Arrange - server fails once, then succeeds
      const scope = nock(baseURL)
        .get('/retry-test')
        .reply(500, { error: 'Server Error' })
        .get('/retry-test')
        .reply(200, { data: 'success after retry' });
      
      // Act
      const response = await bridge.get('/retry-test');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success after retry' });
      expect(scope.isDone()).toBeTruthy();
    });
    
    it('should use circuit breaker to prevent cascading failures', async () => {
      // Arrange - server consistently fails
      const scope = nock(baseURL)
        .get('/circuit-test')
        .times(5)
        .reply(500, { error: 'Server Error' });
      
      // Act - trigger circuit breaker
      try { await bridge.get('/circuit-test'); } catch (e) { /* expected */ }
      try { await bridge.get('/circuit-test'); } catch (e) { /* expected */ }
      try { await bridge.get('/circuit-test'); } catch (e) { /* expected */ }
      
      // Now the circuit should be open
      try {
        await bridge.get('/circuit-test');
        fail('Request should have failed due to open circuit');
      } catch (error) {
        expect((error as Error).message).toMatch(/circuit is open/i);
      }
      
      // Check health status
      expect(bridge.getHealthStatus()).toBe('UNHEALTHY');
      
      // Wait for circuit half-open delay
      await wait(150);
      
      // Set up success for recovery
      nock(baseURL)
        .get('/circuit-test')
        .reply(200, { data: 'success after recovery' });
      
      // Circuit should try again in half-open state
      const response = await bridge.get('/circuit-test');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success after recovery' });
      
      // Health should improve
      expect(bridge.getHealthStatus()).toBe('HEALTHY');
    });
    
    it('should respect rate limits', async () => {
      // Arrange - server returns rate limit response
      const scope = nock(baseURL)
        .get('/rate-limited')
        .reply(429, { error: 'Too Many Requests' }, { 'Retry-After': '1' })
        .get('/rate-limited')
        .reply(200, { data: 'success after rate limit' });
      
      // Act
      try {
        await bridge.get('/rate-limited');
        fail('Should have received rate limit error');
      } catch (error) {
        expect((error as Error).message).toMatch(/429/);
      }
      
      // The API Bridge should apply rate limiting
      const startTime = Date.now();
      const response = await bridge.get('/rate-limited');
      const elapsedTime = Date.now() - startTime;
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success after rate limit' });
      expect(elapsedTime).toBeGreaterThanOrEqual(900); // Should wait at least 900ms (1s minus small margin)
      expect(scope.isDone()).toBeTruthy();
    });
    
    it('should handle timeouts correctly', async () => {
      // Arrange - server takes longer than the timeout
      const scope = nock(baseURL)
        .get('/timeout-test')
        .delay(1000) // Longer than our timeout
        .reply(200, { data: 'delayed response' });
      
      // Act & Assert
      try {
        await bridge.get('/timeout-test');
        fail('Request should have timed out');
      } catch (error) {
        expect((error as Error).message).toMatch(/timeout/i);
      }
    });
  });
  
  describe('Health Monitoring', () => {
    it('should report health status correctly', async () => {
      // Arrange - set up health endpoint
      nock(baseURL)
        .get('/health')
        .reply(200, { status: 'UP' });
      
      // Act
      const isHealthy = await bridge.checkHealth();
      const healthStatus = bridge.getHealthStatus();
      const metrics = bridge.getMetrics();
      
      // Assert
      expect(isHealthy).toBe(true);
      expect(healthStatus).toBe('HEALTHY');
      expect(metrics.healthStatus).toBe('HEALTHY');
      expect(metrics.rateLimiting).toBeDefined();
      expect(metrics.resilience).toBeDefined();
    });
    
    it('should detect unhealthy services', async () => {
      // Arrange - set up failing health endpoint
      nock(baseURL)
        .get('/health')
        .reply(500, { status: 'DOWN' });
      
      // Act
      const isHealthy = await bridge.checkHealth();
      const healthStatus = bridge.getHealthStatus();
      
      // Assert
      expect(isHealthy).toBe(false);
      expect(healthStatus).not.toBe('HEALTHY');
    });
  });
  
  describe('Factory Function', () => {
    it('should create bridges with provider-specific configurations', () => {
      // Create bridges for different providers
      const zephyrBridge = createApiBridge({
        baseURL: 'https://api.zephyr.example.com',
        serviceName: 'migration',
        providerName: 'zephyr',
        authentication: {
          credentials: {
            type: AuthenticationMethod.TOKEN,
            token: 'zephyr-token'
          }
        }
      });
      
      const qtestBridge = createApiBridge({
        baseURL: 'https://api.qtest.example.com',
        serviceName: 'migration',
        providerName: 'qtest',
        authentication: {
          credentials: {
            type: AuthenticationMethod.TOKEN,
            token: 'qtest-token'
          }
        }
      });
      
      // Each bridge should have distinct configurations
      expect(zephyrBridge).not.toBe(qtestBridge);
      expect(zephyrBridge['providerName']).toBe('zephyr');
      expect(qtestBridge['providerName']).toBe('qtest');
    });
    
    it('should get system health across all providers', async () => {
      // The getSystemHealth function returns the global health status
      const systemHealth = getSystemHealth();
      
      // It should be one of the valid health statuses
      expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(systemHealth);
    });
  });
});