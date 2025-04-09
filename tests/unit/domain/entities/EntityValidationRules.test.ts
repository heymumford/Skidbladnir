/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { EntityValidator } from '../../../../pkg/domain/entities/EntityValidator';
import { TestCase, TestCaseStatus, Priority } from '../../../../pkg/domain/entities/TestCase';
import { User, UserRole } from '../../../../pkg/domain/entities/User';
import { Email } from '../../../../pkg/domain/value-objects/Email';
import { Identifier } from '../../../../pkg/domain/value-objects/Identifier';
import { ValidationError } from '../../../../pkg/domain/errors/DomainErrors';

/**
 * This test suite verifies that entity validation is correctly enforcing
 * business rules when using value objects.
 */
describe('Entity Validation Rules with Value Objects', () => {
  // Helper function to create a test case with value objects
  const createTestCaseWithValueObjects = () => {
    const id = Identifier.createRandom();
    const testCase: TestCase = {
      id: id.toString(),
      title: 'Test Case with Value Objects',
      description: 'Description of test case using value objects',
      status: TestCaseStatus.DRAFT,
      priority: Priority.MEDIUM,
      steps: [
        { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
        { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
      ],
      tags: ['valueObject', 'validation'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return testCase;
  };

  // Helper function to create a user with value objects
  const createUserWithValueObjects = () => {
    const id = Identifier.createRandom();
    const email = Email.create('user@example.com');
    const user: User = {
      id: id.toString(),
      username: 'testuser',
      email: email.toString(),
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.TESTER,
      preferences: {
        theme: 'dark',
        notificationsEnabled: true,
        defaultTestProvider: 'zephyr'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return user;
  };

  describe('Value object integration', () => {
    it('should validate a test case created with value objects', () => {
      // Arrange
      const testCase = createTestCaseWithValueObjects();
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a user created with value objects', () => {
      // Arrange
      const user = createUserWithValueObjects();
      
      // Act
      const result = EntityValidator.validateUser(user);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Business rule validation', () => {
    it('should enforce test case title length rules', () => {
      // Arrange
      const testCase = createTestCaseWithValueObjects();
      testCase.title = 'a'.repeat(201); // Exceeds 200 char limit
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be 200 characters or less');
    });

    it('should enforce email format rules via value object', () => {
      // Arrange
      const user = createUserWithValueObjects();
      user.email = 'invalid-email'; // Invalid email format
      
      // Act
      const result = EntityValidator.validateUser(user);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is invalid');
    });

    it('should reject a test case with non-sequential steps', () => {
      // Arrange
      const testCase = createTestCaseWithValueObjects();
      testCase.steps = [
        { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
        { order: 3, description: 'Step 3', expectedResult: 'Result 3' }, // Skipped step 2
        { order: 4, description: 'Step 4', expectedResult: 'Result 4' }
      ];
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step order must be sequential starting from 1');
    });
  });

  describe('Cross-entity validation', () => {
    it('should validate relationships between entities', () => {
      // Arrange
      const testCaseId = Identifier.createRandom().toString();
      const userId = Identifier.createRandom().toString();
      
      // Act - Create execution with valid test case ID and user ID
      const execution = {
        id: Identifier.createRandom().toString(),
        testCaseId: testCaseId,
        executedBy: userId,
        executionDate: new Date(),
        environment: 'QA',
        status: 'PASSED',
        duration: 120,
        stepResults: []
      };
      
      const result = EntityValidator.validateTestExecution(execution);
      
      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject empty/missing required references to other entities', () => {
      // Arrange - Execution with missing test case ID or user ID
      const execution = {
        id: Identifier.createRandom().toString(),
        testCaseId: '', // Empty test case ID
        executedBy: Identifier.createRandom().toString(),
        executionDate: new Date(),
        environment: 'QA',
        status: 'PASSED',
        duration: 120,
        stepResults: []
      };
      
      // Act
      const result = EntityValidator.validateTestExecution(execution);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test case ID is required');
    });
  });

  describe('Validation error conversion', () => {
    it('should convert validation errors to domain ValidationError objects', () => {
      // Arrange
      const testCase = createTestCaseWithValueObjects();
      testCase.title = ''; // Invalid: title is required
      
      // Act & Assert
      expect(() => {
        const validationResult = EntityValidator.validateTestCase(testCase);
        if (!validationResult.isValid) {
          throw new ValidationError(
            'TestCase validation failed',
            validationResult.errors
          );
        }
      }).toThrow(ValidationError);
      
      try {
        const validationResult = EntityValidator.validateTestCase(testCase);
        if (!validationResult.isValid) {
          throw new ValidationError(
            'TestCase validation failed',
            validationResult.errors
          );
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toContain('Title is required');
          expect(error.name).toBe('ValidationError');
        } else {
          fail('Error should be a ValidationError');
        }
      }
    });
  });
});