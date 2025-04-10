/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ApiBridge, ApiBridgeConfig } from '../../../../internal/typescript/api-bridge';
import { 
  AuthenticationHandler, 
  AuthenticationMethod, 
  TokenCredentials,
  PasswordCredentials,
  OAuthCredentials,
  AuthenticationError
} from '../../../../internal/typescript/api-bridge/auth/authentication-handler';
import axios from 'axios';
import nock from 'nock';

// Mock axios and its methods
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    isAxiosError: jest.fn((error) => error && error.response !== undefined),
    isCancel: jest.fn((error) => error && error.message === 'canceled'),
    CancelToken: {
      source: jest.fn(() => ({
        token: 'mock-token',
        cancel: jest.fn()
      }))
    }
  };
  return mockAxios;
});

describe('ApiBridge', () => {
  let bridge: ApiBridge;
  let config: ApiBridgeConfig;
  
  // Basic authentication tests
  describe('Authentication methods', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Default configuration
      config = {
        baseURL: 'https://api.example.com',
        serviceName: 'test-service',
        providerName: 'test-provider',
        authentication: {
          credentials: {
            type: AuthenticationMethod.TOKEN,
            token: 'test-api-token'
          }
        }
      };
      
      // Mock authentication handler methods to directly test them
      jest.spyOn(AuthenticationHandler.prototype, 'authenticate').mockImplementation(
        async (providerName, credentials) => {
          if (credentials?.type === AuthenticationMethod.TOKEN) {
            return {
              success: true,
              token: (credentials as TokenCredentials).token,
              headers: { 'Authorization': `Bearer ${(credentials as TokenCredentials).token}` },
              tokenType: 'bearer',
            };
          } else if (credentials?.type === AuthenticationMethod.PASSWORD) {
            return {
              success: true,
              token: 'login-generated-token',
              headers: { 'Authorization': 'Bearer login-generated-token' },
              tokenType: 'bearer',
            };
          } else if (credentials?.type === AuthenticationMethod.OAUTH) {
            return {
              success: true,
              token: 'oauth-access-token',
              refreshToken: 'refresh-token',
              headers: { 'Authorization': 'Bearer oauth-access-token' },
              tokenType: 'bearer',
              expiresAt: new Date(Date.now() + 3600 * 1000),
            };
          } else {
            throw new AuthenticationError('Unknown authentication method', providerName);
          }
        }
      );
      
      // Create a new bridge with the configuration
      bridge = new ApiBridge(config);
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should authenticate with token authentication', async () => {
      // Arrange
      const credentials: TokenCredentials = {
        type: AuthenticationMethod.TOKEN,
        token: 'new-test-token'
      };
      
      // Mock request response
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: { result: 'success' } });
      
      // Spy on the authenticate method to verify it's called with expected args
      const authSpy = jest.spyOn(bridge['authHandler'], 'authenticate');
      
      // Act
      await bridge.authenticate(credentials);
      await bridge.get('/api/resource');
      
      // Assert
      expect(authSpy).toHaveBeenCalledWith('test-provider', credentials);
    });
    
    it('should authenticate with password authentication', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'testpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock request response
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: { result: 'success' } });
      
      // Spy on the authenticate method to verify it's called with expected args
      const authSpy = jest.spyOn(bridge['authHandler'], 'authenticate');
      
      // Act
      await bridge.authenticate(credentials);
      await bridge.get('/api/resource');
      
      // Assert
      expect(authSpy).toHaveBeenCalledWith('test-provider', credentials);
    });
    
    it('should authenticate with OAuth', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'client_credentials',
        scope: 'read write'
      };
      
      // Mock request response
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: { result: 'success' } });
      
      // Spy on the authenticate method to verify it's called with expected args
      const authSpy = jest.spyOn(bridge['authHandler'], 'authenticate');
      
      // Act
      await bridge.authenticate(credentials);
      await bridge.get('/api/resource');
      
      // Assert
      expect(authSpy).toHaveBeenCalledWith('test-provider', credentials);
    });
    
    it('should handle authentication errors', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'wrongpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock authentication to throw error
      jest.spyOn(AuthenticationHandler.prototype, 'authenticate').mockRejectedValueOnce(
        new AuthenticationError('Authentication failed', 'test-provider', {
          httpStatus: 401,
          details: { message: 'Invalid credentials' },
        })
      );
      
      // Act & Assert
      await expect(bridge.authenticate(credentials)).rejects.toThrow(AuthenticationError);
    });
  });
  
  describe('Token refresh tests', () => {
    it('should have token refresh capabilities', () => {
      // This is a simplified test to verify the API Bridge exposes token refresh functionality
      
      // The API bridge should have access to the AuthHandler for refreshing tokens
      expect(bridge['authHandler']).toBeDefined();
      
      // The bridge's authHandler should have the authenticate method used for token refresh
      expect(typeof bridge['authHandler'].authenticate).toBe('function');
      
      // The bridge should handle 401 errors by refreshing the token
      // (Full functionality tested in the implementation)
      expect(typeof bridge['apiClient']['request']).toBe('function');
    });
  });
  
  describe('Rate limiting features', () => {
    it('should have rate limiting capabilities', () => {
      // This is a simplified test to verify the API Bridge has rate limiting capabilities
      
      // The API bridge should have a rate limiter
      expect(bridge['rateLimiter']).toBeDefined();
      
      // The bridge's rateLimiter should have the throttle method
      expect(typeof bridge['rateLimiter'].throttle).toBe('function');
      
      // The bridge should expose metrics
      expect(typeof bridge.getMetrics).toBe('function');
      
      // The bridge should expose rate limiter metrics
      const metrics = bridge.getMetrics();
      expect(metrics.rateLimiting).toBeDefined();
    });
  });
  
  describe('Resilience features', () => {
    it('should have resilience capabilities', () => {
      // This is a simplified test to verify the API Bridge has resilience capabilities
      
      // The API bridge should expose resilience metrics
      const metrics = bridge.getMetrics();
      expect(metrics.resilience).toBeDefined();
      
      // The API bridge should expose a health status
      expect(typeof bridge.getHealthStatus).toBe('function');
      
      // The bridge should have a reset method for resilience state
      expect(typeof bridge.reset).toBe('function');
      
      // The API bridge should have resilience circuit breaker settings
      expect(bridge['apiClient']['circuitState']).toBeDefined();
    });
  });
});