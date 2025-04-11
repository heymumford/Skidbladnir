/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios from 'axios';
import nock from 'nock';
import { ResilientApiClient, ApiClientOptions } from '../../../internal/typescript/api-bridge/clients/resilient-api-client';
import { AuthenticationHandler, AuthenticationMethod, TokenCredentials, AuthenticationResult } from '../../../internal/typescript/api-bridge/auth/authentication-handler';
import { ResilienceFacade } from '../../../packages/common/src/utils/resilience';
import { wait } from '../../../packages/common/src/utils/helpers';

// Mock base URL for tests
const BASE_URL = 'https://test-api.example.com';

// Mock authentication handler
class MockAuthHandler extends AuthenticationHandler {
  public mockToken = 'mock-api-token';
  public authenticateCalled = 0;
  public logoutCalled = 0;
  
  constructor() {
    super();
  }
  
  async authenticate(providerName: string, credentials?: any): Promise<AuthenticationResult> {
    this.authenticateCalled++;
    return {
      success: true,
      token: this.mockToken,
      headers: { 'Authorization': `Bearer ${this.mockToken}` },
      tokenType: 'bearer'
    };
  }
  
  async logout(providerName: string): Promise<void> {
    this.logoutCalled++;
  }
}

describe('ResilientApiClient', () => {
  let mockAuthHandler: MockAuthHandler;
  let apiClient: ResilientApiClient;
  
  // Setup nock for testing HTTP requests
  beforeEach(() => {
    nock.cleanAll();
    
    mockAuthHandler = new MockAuthHandler();
    
    const options: ApiClientOptions = {
      baseURL: BASE_URL,
      serviceName: 'TestApi',
      providerName: 'test-provider',
      authHandler: mockAuthHandler,
      resilience: {
        retryOptions: {
          maxAttempts: 3,
          initialDelayMs: 10, // Small for tests
          backoffFactor: 2,
        },
        circuitBreakerOptions: {
          failureThreshold: 3,
          resetTimeoutMs: 100, // Small for tests
          halfOpenSuccessThreshold: 1
        },
        timeoutMs: 1000,
        logErrors: true
      }
    };
    
    apiClient = new ResilientApiClient(options);
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  afterAll(() => {
    nock.restore();
  });
  
  it('should successfully make API requests with auth token', async () => {
    // Arrange
    const scope = nock(BASE_URL)
      .get('/test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(200, { message: 'Success' });
    
    // Act
    const response = await apiClient.get('/test');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Success' });
    expect(scope.isDone()).toBeTruthy();
    expect(mockAuthHandler.authenticateCalled).toBe(1);
  });
  
  it('should reuse authentication tokens for multiple requests', async () => {
    // Arrange
    const scope1 = nock(BASE_URL)
      .get('/test1')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(200, { message: 'Success 1' });
      
    const scope2 = nock(BASE_URL)
      .get('/test2')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(200, { message: 'Success 2' });
    
    // Act
    const response1 = await apiClient.get('/test1');
    const response2 = await apiClient.get('/test2');
    
    // Assert
    expect(response1.data).toEqual({ message: 'Success 1' });
    expect(response2.data).toEqual({ message: 'Success 2' });
    expect(mockAuthHandler.authenticateCalled).toBe(1); // Called only once
    expect(scope1.isDone()).toBeTruthy();
    expect(scope2.isDone()).toBeTruthy();
  });
  
  it('should retry on transient errors', async () => {
    // Arrange - mock a server that fails twice then succeeds
    const scope = nock(BASE_URL)
      .get('/retry-test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(500, { message: 'Server Error' })
      .get('/retry-test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(500, { message: 'Server Error' })
      .get('/retry-test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(200, { message: 'Success after retries' });
    
    // Act
    const response = await apiClient.get('/retry-test');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Success after retries' });
    expect(scope.isDone()).toBeTruthy();
    expect(mockAuthHandler.authenticateCalled).toBe(1); // Should still only be called once
  });
  
  it('should handle unauthorized responses by refreshing auth', async () => {
    // Arrange
    const scope1 = nock(BASE_URL)
      .get('/auth-test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(401, { message: 'Unauthorized' });
    
    // After getting a 401, the client should get a new token and retry
    mockAuthHandler.mockToken = 'new-token-after-refresh';
    
    const scope2 = nock(BASE_URL)
      .get('/auth-test')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(200, { message: 'Success after token refresh' });
    
    // Act
    const response = await apiClient.get('/auth-test');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Success after token refresh' });
    expect(scope1.isDone()).toBeTruthy();
    expect(scope2.isDone()).toBeTruthy();
    expect(mockAuthHandler.authenticateCalled).toBe(2); // Called initially and after 401
    expect(mockAuthHandler.logoutCalled).toBe(1); // Logout called once to clear bad token
  });
  
  it('should support post requests with data', async () => {
    // Arrange
    const requestData = { key: 'value' };
    const scope = nock(BASE_URL)
      .post('/data', requestData)
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .reply(201, { id: 123, ...requestData });
    
    // Act
    const response = await apiClient.post('/data', requestData);
    
    // Assert
    expect(response.status).toBe(201);
    expect(response.data).toEqual({ id: 123, key: 'value' });
    expect(scope.isDone()).toBeTruthy();
  });
  
  it('should support custom headers', async () => {
    // Arrange
    const scope = nock(BASE_URL)
      .get('/headers')
      .matchHeader('Authorization', `Bearer ${mockAuthHandler.mockToken}`)
      .matchHeader('X-Custom-Header', 'custom-value')
      .reply(200, { success: true });
    
    // Act
    const response = await apiClient.get('/headers', {
      headers: { 'X-Custom-Header': 'custom-value' }
    });
    
    // Assert
    expect(response.status).toBe(200);
    expect(scope.isDone()).toBeTruthy();
  });
  
  it('should timeout for slow responses', async () => {
    // Arrange
    const scope = nock(BASE_URL)
      .get('/timeout')
      .delay(2000) // Delay longer than our timeout
      .reply(200, { message: 'This response is delayed' });
    
    // Act & Assert
    await expect(apiClient.get('/timeout')).rejects.toThrow(/timeout|timedout|time/i);
    
    // The timeout error should not trigger a token refresh
    expect(mockAuthHandler.authenticateCalled).toBe(1); // Still just one call from the initial request
  });
  
  it('should open circuit breaker after consecutive failures', async () => {
    // Arrange - Setup multiple failures to trip the circuit breaker
    const failureScope = nock(BASE_URL)
      .get('/circuit-test')
      .times(4) // More than the failure threshold
      .reply(500, { message: 'Server Error' });
    
    // Act - Make repeated calls to trigger the circuit breaker
    try {
      await apiClient.get('/circuit-test');
    } catch (e) { /* expected */ }
    
    try {
      await apiClient.get('/circuit-test');
    } catch (e) { /* expected */ }
    
    try {
      await apiClient.get('/circuit-test');
    } catch (e) { /* expected */ }
    
    // Circuit should be open now
    const error = await apiClient.get('/circuit-test').catch(e => e);
    
    // Assert
    expect(error).toBeDefined();
    expect(error.message).toMatch(/circuit/i);
  });
  
  it('should close circuit breaker after successful retry', async () => {
    // Set up a sequence: failures -> success -> success
    // This should open the circuit, then half-open it, then close it
    
    // First, force the circuit to open
    const failureScope = nock(BASE_URL)
      .get('/circuit-recovery')
      .times(4)
      .reply(500, { message: 'Server Error' });
    
    // Try to trigger open circuit
    try {
      await apiClient.get('/circuit-recovery');
    } catch (e) { /* expected */ }
    
    try {
      await apiClient.get('/circuit-recovery');
    } catch (e) { /* expected */ }
    
    try {
      await apiClient.get('/circuit-recovery');
    } catch (e) { /* expected */ }
    
    // Now circuit should be open
    try {
      await apiClient.get('/circuit-recovery');
      fail('This request should fail with circuit open');
    } catch (e) {
      expect(e.message).toMatch(/circuit/i);
    }
    
    // Wait for reset timeout to let circuit go to half-open
    await wait(200);
    
    // Now set up a success for the half-open test
    const successScope = nock(BASE_URL)
      .get('/circuit-recovery')
      .reply(200, { message: 'Success' });
    
    // This should succeed and close the circuit
    const response = await apiClient.get('/circuit-recovery');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Success' });
    
    // The circuit should be closed - confirm with another successful request
    const confirmScope = nock(BASE_URL)
      .get('/circuit-recovery')
      .reply(200, { message: 'Success again' });
    
    const response2 = await apiClient.get('/circuit-recovery');
    expect(response2.status).toBe(200);
  });
  
  it('should support request cancellation', async () => {
    // Arrange
    const scope = nock(BASE_URL)
      .get('/cancel')
      .delay(500)
      .reply(200, { message: 'This should be cancelled' });
    
    // Create a cancel token
    const { CancelToken } = axios;
    const source = CancelToken.source();
    
    // Act - start request then cancel it
    const requestPromise = apiClient.get('/cancel', {
      cancelToken: source.token
    });
    
    // Cancel the request
    source.cancel('Request cancelled by test');
    
    // Assert
    await expect(requestPromise).rejects.toThrow('Request cancelled by test');
  });
  
  it('should handle rate limiting with exponential backoff', async () => {
    // Arrange - mock a server that returns 429 rate limit errors
    const scope = nock(BASE_URL)
      .get('/rate-limit')
      .reply(429, { message: 'Too Many Requests' })
      .get('/rate-limit')
      .reply(429, { message: 'Too Many Requests' })
      .get('/rate-limit')
      .reply(200, { message: 'Success after rate limiting' });
    
    // Act
    const response = await apiClient.get('/rate-limit');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Success after rate limiting' });
    expect(scope.isDone()).toBeTruthy();
  });
});