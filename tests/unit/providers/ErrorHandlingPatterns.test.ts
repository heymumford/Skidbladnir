/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Tests for the standardized error handling pattern implementation
 */

import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';
import { 
  createErrorHandler, 
  withErrorHandling,
  ErrorContext 
} from '../../../packages/common/src/utils/resilience/error-handler';

describe('Error handling utilities', () => {
  describe('createErrorHandler', () => {
    it('should create a function that wraps errors with ExternalServiceError', () => {
      // Arrange
      const serviceName = 'TestService';
      const errorHandler = createErrorHandler(serviceName);
      const originalError = new Error('Original error');
      
      // Act
      const result = errorHandler('Test operation failed', originalError);
      
      // Assert
      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.message).toContain('Error in external service TestService');
      expect(result.message).toContain('Test operation failed');
      expect(result.message).toContain('Original error');
    });
    
    it('should include context information when provided', () => {
      // Arrange
      const serviceName = 'TestService';
      const errorHandler = createErrorHandler(serviceName, { includeParams: true });
      const originalError = new Error('API timeout');
      const context: ErrorContext = {
        operation: 'fetchData',
        params: { id: '123', limit: 10 },
        additionalInfo: { status: 'timeout' }
      };
      
      // Act
      const result = errorHandler('Failed to fetch data', originalError, context);
      
      // Assert
      expect(result.message).toContain('Operation: fetchData');
      expect(result.message).toContain('Parameters: {"id":"123","limit":10}');
      expect(result.message).toContain('Additional Info: {"status":"timeout"}');
    });
    
    it('should redact sensitive information from parameters', () => {
      // Arrange
      const serviceName = 'TestService';
      const errorHandler = createErrorHandler(serviceName, {
        includeParams: true,
        sensitiveParamKeys: ['password', 'apiToken']
      });
      const originalError = new Error('Authentication failed');
      const context: ErrorContext = {
        operation: 'authenticate',
        params: {
          username: 'testuser',
          password: 'secret123',
          apiToken: 'abc123xyz'
        }
      };
      
      // Act
      const result = errorHandler('Failed to authenticate', originalError, context);
      
      // Assert
      expect(result.message).toContain('username":"testuser"');
      expect(result.message).not.toContain('secret123');
      expect(result.message).not.toContain('abc123xyz');
      expect(result.message).toContain('"password":"***REDACTED***"');
      expect(result.message).toContain('"apiToken":"***REDACTED***"');
    });
  });
  
  describe('withErrorHandling', () => {
    it('should wrap the method and handle errors', async () => {
      // Arrange
      const errorHandler = jest.fn().mockReturnValue(new ExternalServiceError('TestService', 'Handled error'));
      const failingMethod = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const wrappedMethod = withErrorHandling(failingMethod, errorHandler, 'testOperation');
      
      // Act & Assert
      await expect(wrappedMethod('arg1', 123)).rejects.toThrow(ExternalServiceError);
      expect(errorHandler).toHaveBeenCalledWith(
        'Failed during testOperation',
        expect.any(Error),
        expect.objectContaining({
          operation: 'testOperation',
          params: expect.anything()
        })
      );
    });
    
    it('should pass through the result for successful operations', async () => {
      // Arrange
      const errorHandler = jest.fn();
      const successMethod = jest.fn().mockResolvedValue('success result');
      const wrappedMethod = withErrorHandling(successMethod, errorHandler, 'testOperation');
      
      // Act
      const result = await wrappedMethod('arg1', 123);
      
      // Assert
      expect(result).toBe('success result');
      expect(errorHandler).not.toHaveBeenCalled();
    });
  });
  
  describe('Integration with real provider', () => {
    class TestProvider {
      private handleError = createErrorHandler('TestProvider', {
        includeErrorStack: false
      });
      
      public async fetchData(id: string, options: Record<string, any> = {}): Promise<any> {
        try {
          // Simulate API call that fails
          throw new Error('Network error: Connection refused');
        } catch (error) {
          throw this.handleError(
            `Failed to fetch data for id ${id}`,
            error,
            {
              operation: 'fetchData',
              params: { id, options },
              additionalInfo: { timestamp: new Date().toISOString() }
            }
          );
        }
      }
    }
    
    it('should provide a detailed error with proper context', async () => {
      // Arrange
      const provider = new TestProvider();
      
      // Act & Assert
      try {
        await provider.fetchData('user-123', { include: ['profile', 'settings'] });
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ExternalServiceError);
        const externalError = error as ExternalServiceError;
        
        // Verify error details
        expect(externalError.message).toContain('TestProvider');
        expect(externalError.message).toContain('Failed to fetch data for id user-123');
        expect(externalError.message).toContain('Network error: Connection refused');
        expect(externalError.message).toContain('Operation: fetchData');
        expect(externalError.message).toContain('"id":"user-123"');
        expect(externalError.message).toContain('"include":["profile","settings"]');
        expect(externalError.message).toContain('timestamp');
      }
    });
  });
});