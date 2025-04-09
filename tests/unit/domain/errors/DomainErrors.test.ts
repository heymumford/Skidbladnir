/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import {
  DomainError,
  EntityNotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DuplicateEntityError,
  InvalidOperationError,
  ExternalServiceError
} from '../../../../pkg/domain/errors/DomainErrors';

describe('DomainErrors', () => {
  describe('Base DomainError', () => {
    it('should create a base domain error with the correct name and message', () => {
      // Arrange & Act
      const error = new DomainError('Basic domain error');
      
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Basic domain error');
    });
  });

  describe('EntityNotFoundError', () => {
    it('should create an entity not found error with the correct message', () => {
      // Arrange & Act
      const entityName = 'TestCase';
      const id = 'tc-123';
      const error = new EntityNotFoundError(entityName, id);
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('EntityNotFoundError');
      expect(error.message).toBe(`${entityName} with id ${id} not found`);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with validation errors array', () => {
      // Arrange & Act
      const message = 'Validation failed';
      const validationErrors = ['Field1 is required', 'Field2 is invalid'];
      const error = new ValidationError(message, validationErrors);
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe(message);
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should create a validation error with empty validation errors if not provided', () => {
      // Arrange & Act
      const message = 'Validation failed';
      const error = new ValidationError(message);
      
      // Assert
      expect(error.validationErrors).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    it('should create an authentication error with the correct message', () => {
      // Arrange & Act
      const error = new AuthenticationError();
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication failed');
    });

    it('should create an authentication error with a custom message', () => {
      // Arrange & Act
      const message = 'Invalid credentials';
      const error = new AuthenticationError(message);
      
      // Assert
      expect(error.message).toBe(message);
    });
  });

  describe('AuthorizationError', () => {
    it('should create an authorization error with the correct message', () => {
      // Arrange & Act
      const error = new AuthorizationError();
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Not authorized to perform this action');
    });

    it('should create an authorization error with a custom message', () => {
      // Arrange & Act
      const message = 'User does not have administrator role';
      const error = new AuthorizationError(message);
      
      // Assert
      expect(error.message).toBe(message);
    });
  });

  describe('DuplicateEntityError', () => {
    it('should create a duplicate entity error with the correct message', () => {
      // Arrange & Act
      const entityName = 'User';
      const identifier = 'username: john.doe';
      const error = new DuplicateEntityError(entityName, identifier);
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('DuplicateEntityError');
      expect(error.message).toBe(`${entityName} with identifier ${identifier} already exists`);
    });
  });

  describe('InvalidOperationError', () => {
    it('should create an invalid operation error with the correct message', () => {
      // Arrange & Act
      const message = 'Cannot delete a test case that is being executed';
      const error = new InvalidOperationError(message);
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('InvalidOperationError');
      expect(error.message).toBe(message);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an external service error with the correct message', () => {
      // Arrange & Act
      const serviceName = 'ZephyrAPI';
      const message = 'Connection timeout';
      const error = new ExternalServiceError(serviceName, message);
      
      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ExternalServiceError');
      expect(error.message).toBe(`Error in external service ${serviceName}: ${message}`);
    });
  });

  describe('Error handling in catch blocks', () => {
    it('should be possible to catch domain errors by their specific type', () => {
      // Arrange
      const throwValidationError = () => {
        throw new ValidationError('Validation failed', ['Field is required']);
      };
      
      // Act & Assert
      try {
        throwValidationError();
        fail('Expected error to be thrown');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toHaveLength(1);
        } else {
          fail('Expected error to be ValidationError');
        }
      }
    });

    it('should be possible to catch domain errors by their base type', () => {
      // Arrange
      const throwEntityNotFoundError = () => {
        throw new EntityNotFoundError('TestCase', 'tc-123');
      };
      
      // Act & Assert
      try {
        throwEntityNotFoundError();
        fail('Expected error to be thrown');
      } catch (error) {
        if (error instanceof DomainError) {
          expect(error.name).toBe('EntityNotFoundError');
        } else {
          fail('Expected error to be DomainError');
        }
      }
    });
  });
});