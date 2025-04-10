/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  AuthenticationHandler, 
  AuthenticationMethod, 
  AuthenticationError, 
  TokenCredentials,
  PasswordCredentials,
  OAuthCredentials,
  AuthenticationConfig,
  AuthenticationResult
} from '../../../../../internal/typescript/api-bridge/auth/authentication-handler';
import axios from 'axios';
import nock from 'nock';

// Mock axios
jest.mock('axios');

describe('AuthenticationHandler', () => {
  let authHandler: AuthenticationHandler;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authHandler = new AuthenticationHandler();
    
    // Set up nock to intercept HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });
  
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('API Token Authentication', () => {
    it('should authenticate with an API token', async () => {
      // Arrange
      const credentials: TokenCredentials = {
        type: AuthenticationMethod.TOKEN,
        token: 'test-api-token',
        tokenHeaderName: 'Authorization',
        tokenPrefix: 'Bearer'
      };
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('test-api-token');
      expect(result.headers).toEqual({
        'Authorization': 'Bearer test-api-token'
      });
    });
    
    it('should use custom token header and prefix', async () => {
      // Arrange
      const credentials: TokenCredentials = {
        type: AuthenticationMethod.TOKEN,
        token: 'test-api-token',
        tokenHeaderName: 'X-API-KEY',
        tokenPrefix: ''
      };
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('test-api-token');
      expect(result.headers).toEqual({
        'X-API-KEY': 'test-api-token'
      });
    });
  });
  
  describe('Password Authentication', () => {
    it('should authenticate with username and password', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'testpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock successful login response
      const mockLoginResponse = {
        data: {
          token: 'login-generated-token'
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockLoginResponse);
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('login-generated-token');
      expect(result.headers).toEqual({
        'Authorization': 'Bearer login-generated-token'
      });
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/login',
        { username: 'testuser', password: 'testpassword' },
        expect.any(Object)
      );
    });
    
    it('should handle login failures', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'wrongpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock failed login response
      const error = new Error('Authentication failed');
      (error as any).response = {
        status: 401,
        data: { message: 'Invalid credentials' }
      };
      (axios.post as jest.Mock).mockRejectedValue(error);
      
      // Act & Assert
      await expect(
        authHandler.authenticate('test-provider', credentials)
      ).rejects.toThrow(AuthenticationError);
    });
    
    it('should use custom token extraction from response', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'testpassword',
        loginUrl: 'https://api.example.com/login',
        extractToken: (response: any) => response.data.auth.accessToken
      };
      
      // Mock login response with nested token
      const mockLoginResponse = {
        data: {
          auth: {
            accessToken: 'nested-access-token'
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockLoginResponse);
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('nested-access-token');
    });
  });
  
  describe('OAuth Authentication', () => {
    it('should authenticate with OAuth client credentials flow', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'client_credentials',
        scope: 'read write'
      };
      
      // Mock successful OAuth token response
      const mockTokenResponse = {
        data: {
          access_token: 'oauth-access-token',
          token_type: 'bearer',
          expires_in: 3600
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('oauth-access-token');
      expect(result.headers).toEqual({
        'Authorization': 'Bearer oauth-access-token'
      });
      expect(result.tokenType).toBe('bearer');
      expect(result.expiresAt).toBeDefined();
      expect(axios.post).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.stringContaining('grant_type=client_credentials'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });
    
    it('should authenticate with OAuth password grant flow', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'password',
        username: 'testuser',
        password: 'testpassword',
        scope: 'read write'
      };
      
      // Mock successful OAuth token response
      const mockTokenResponse = {
        data: {
          access_token: 'oauth-password-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token'
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
      
      // Act
      const result = await authHandler.authenticate('test-provider', credentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('oauth-password-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(axios.post).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.stringContaining('grant_type=password'),
        expect.any(Object)
      );
    });
    
    it('should handle OAuth errors', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'invalid-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'client_credentials'
      };
      
      // Mock failed OAuth response
      const error = new Error('OAuth authentication failed');
      (error as any).response = {
        status: 400,
        data: {
          error: 'invalid_client',
          error_description: 'Client authentication failed'
        }
      };
      (axios.post as jest.Mock).mockRejectedValue(error);
      
      // Act & Assert
      await expect(
        authHandler.authenticate('test-provider', credentials)
      ).rejects.toThrow(AuthenticationError);
    });
  });
  
  describe('Session Management', () => {
    it('should reuse existing valid tokens', async () => {
      // Arrange
      const credentials: TokenCredentials = {
        type: AuthenticationMethod.TOKEN,
        token: 'test-api-token'
      };
      
      // First authentication
      await authHandler.authenticate('session-provider', credentials);
      
      // Act - second authentication should reuse the token
      const spy = jest.spyOn(authHandler as any, 'authenticateWithToken');
      const result = await authHandler.authenticate('session-provider', credentials);
      
      // Assert
      expect(result.token).toBe('test-api-token');
      expect(spy).not.toHaveBeenCalled(); // Should use cached session
    });
    
    it('should refresh expired tokens', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'client_credentials',
        scope: 'read write'
      };
      
      // Mock first token response
      const mockTokenResponse1 = {
        data: {
          access_token: 'first-token',
          token_type: 'bearer',
          expires_in: 1 // Very short expiration
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockTokenResponse1);
      
      // First authentication
      await authHandler.authenticate('token-refresh-provider', credentials);
      
      // Fast-forward time to expire the token
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000); // 2 seconds
      
      // Mock refresh token response
      const mockTokenResponse2 = {
        data: {
          access_token: 'refreshed-token',
          token_type: 'bearer',
          expires_in: 3600
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockTokenResponse2);
      
      // Act - second authentication should get a new token
      const result = await authHandler.authenticate('token-refresh-provider', credentials);
      
      // Assert
      expect(result.token).toBe('refreshed-token');
      expect(axios.post).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
    
    it('should refresh tokens using a refresh token', async () => {
      // Arrange
      const credentials: OAuthCredentials = {
        type: AuthenticationMethod.OAUTH,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/oauth/token',
        grantType: 'password',
        username: 'testuser',
        password: 'testpassword',
        refreshTokenGrantType: 'refresh_token'
      };
      
      // Mock initial token response with refresh token
      const mockTokenResponse1 = {
        data: {
          access_token: 'original-token',
          token_type: 'bearer',
          expires_in: 1, // Very short expiration
          refresh_token: 'the-refresh-token'
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockTokenResponse1);
      
      // First authentication
      await authHandler.authenticate('refresh-token-provider', credentials);
      
      // Fast-forward time to expire the token
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000); // 2 seconds
      
      // Mock refresh token response
      const mockTokenResponse2 = {
        data: {
          access_token: 'refreshed-with-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'new-refresh-token'
        }
      };
      (axios.post as jest.Mock).mockResolvedValueOnce(mockTokenResponse2);
      
      // Act - second authentication should use refresh token
      const result = await authHandler.authenticate('refresh-token-provider', credentials);
      
      // Assert
      expect(result.token).toBe('refreshed-with-refresh-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      
      // Verify refresh token was used
      expect(axios.post).toHaveBeenLastCalledWith(
        'https://auth.example.com/oauth/token',
        expect.stringContaining('grant_type=refresh_token'),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
      
      jest.useRealTimers();
    });
    
    it('should clear session on logout', async () => {
      // Arrange
      const credentials: TokenCredentials = {
        type: AuthenticationMethod.TOKEN,
        token: 'test-api-token'
      };
      
      // First authentication
      await authHandler.authenticate('logout-provider', credentials);
      
      // Act
      await authHandler.logout('logout-provider');
      
      // Try to use session after logout
      const spy = jest.spyOn(authHandler as any, 'authenticateWithToken');
      await authHandler.authenticate('logout-provider', credentials);
      
      // Assert
      expect(spy).toHaveBeenCalled(); // Should authenticate again
    });
  });
  
  describe('Error Handling', () => {
    it('should throw AuthenticationError with specific details', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'wrongpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock error response with HTTP status
      const error = new Error('Authentication failed');
      (error as any).response = {
        status: 401,
        data: { message: 'Invalid credentials', code: 'AUTH_FAILED' }
      };
      (axios.post as jest.Mock).mockRejectedValue(error);
      
      // Act & Assert
      try {
        await authHandler.authenticate('error-provider', credentials);
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthenticationError);
        expect(e.message).toContain('Authentication failed');
        expect(e.httpStatus).toBe(401);
        expect(e.providerName).toBe('error-provider');
        expect(e.details).toEqual(expect.objectContaining({
          message: 'Invalid credentials',
          code: 'AUTH_FAILED'
        }));
      }
    });
    
    it('should provide helpful message for network errors', async () => {
      // Arrange
      const credentials: PasswordCredentials = {
        type: AuthenticationMethod.PASSWORD,
        username: 'testuser',
        password: 'testpassword',
        loginUrl: 'https://api.example.com/login'
      };
      
      // Mock network error
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      (axios.post as jest.Mock).mockRejectedValue(networkError);
      
      // Act & Assert
      try {
        await authHandler.authenticate('network-error-provider', credentials);
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthenticationError);
        expect(e.message).toContain('Network Error');
        expect(e.isNetworkError).toBe(true);
        expect(e.isRetryable).toBe(true);
      }
    });
  });
  
  describe('Provider-specific configurations', () => {
    it('should handle provider-specific authentication flows', async () => {
      // Arrange - Define a custom provider config
      const mockConfig: AuthenticationConfig = {
        baseUrl: 'https://api.custom-provider.com',
        headers: {
          'X-Custom-Header': 'CustomValue'
        },
        authMethods: [
          {
            type: AuthenticationMethod.OAUTH,
            clientId: 'custom-client',
            clientSecret: 'custom-secret',
            tokenUrl: 'https://api.custom-provider.com/oauth/token',
            grantType: 'client_credentials'
          }
        ]
      };
      
      // Register the config
      authHandler.registerProviderConfig('custom-provider', mockConfig);
      
      // Mock OAuth response
      const mockTokenResponse = {
        data: {
          access_token: 'custom-token',
          token_type: 'bearer',
          expires_in: 3600
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
      
      // Act - authenticate using provider name only
      const result = await authHandler.authenticate('custom-provider');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('custom-token');
      expect(result.headers).toEqual(expect.objectContaining({
        'Authorization': 'Bearer custom-token',
        'X-Custom-Header': 'CustomValue'
      }));
    });
    
    it('should throw error for unknown provider without credentials', async () => {
      // Act & Assert
      await expect(
        authHandler.authenticate('unknown-provider')
      ).rejects.toThrow('No authentication configuration found for provider: unknown-provider');
    });
    
    it('should support different authentication methods for different providers', async () => {
      // Arrange - register different providers
      const tokenConfig: AuthenticationConfig = {
        authMethods: [{
          type: AuthenticationMethod.TOKEN,
          token: 'token-method-api-key'
        }]
      };
      
      const oauthConfig: AuthenticationConfig = {
        authMethods: [{
          type: AuthenticationMethod.OAUTH,
          clientId: 'oauth-client',
          clientSecret: 'oauth-secret',
          tokenUrl: 'https://oauth-provider.com/token',
          grantType: 'client_credentials'
        }]
      };
      
      // Mock OAuth response
      const mockTokenResponse = {
        data: {
          access_token: 'oauth-method-token',
          token_type: 'bearer',
          expires_in: 3600
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
      
      // Register configs
      authHandler.registerProviderConfig('token-method-provider', tokenConfig);
      authHandler.registerProviderConfig('oauth-method-provider', oauthConfig);
      
      // Act
      const tokenResult = await authHandler.authenticate('token-method-provider');
      const oauthResult = await authHandler.authenticate('oauth-method-provider');
      
      // Assert
      expect(tokenResult.token).toBe('token-method-api-key');
      expect(oauthResult.token).toBe('oauth-method-token');
    });
  });
});