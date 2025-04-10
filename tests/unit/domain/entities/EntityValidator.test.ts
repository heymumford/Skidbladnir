/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { EntityValidator } from '../../../../pkg/domain/entities/EntityValidator';
import { TestCase, TestCaseStatus, Priority, TestStep } from '../../../../pkg/domain/entities/TestCase';
import { TestSuite } from '../../../../pkg/domain/entities/TestSuite';
import { TestExecution, ExecutionStatus, StepResult } from '../../../../pkg/domain/entities/TestExecution';
import { User, UserRole, UserPreferences } from '../../../../pkg/domain/entities/User';

describe('EntityValidator', () => {
  describe('validateTestCase', () => {
    it('should validate a complete and valid test case', () => {
      // Arrange
      const testCase: Partial<TestCase> = {
        title: 'Valid Test Case',
        description: 'This is a valid test case',
        status: TestCaseStatus.READY,
        priority: Priority.MEDIUM,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
          { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
        ],
        tags: ['tag1', 'tag2']
      };
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for an invalid test case', () => {
      // Arrange
      const testCase: Partial<TestCase> = {
        title: '',
        description: '',
        status: 'INVALID_STATUS' as any,
        priority: 'INVALID_PRIORITY' as any,
        steps: [
          { order: 0, description: '', expectedResult: '' }
        ],
        tags: 'not-an-array' as any
      };
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain(`Status must be one of: ${Object.values(TestCaseStatus).join(', ')}`);
      expect(result.errors).toContain(`Priority must be one of: ${Object.values(Priority).join(', ')}`);
      expect(result.errors).toContain('Tags must be an array');
      // Also check for step errors
      expect(result.errors.some(e => e.includes('Step 1:'))).toBe(true);
    });

    it('should validate steps order is sequential', () => {
      // Arrange
      const testCase: Partial<TestCase> = {
        title: 'Test with non-sequential steps',
        description: 'Description',
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
          { order: 3, description: 'Step 3', expectedResult: 'Result 3' }, // Missing step 2
          { order: 4, description: 'Step 4', expectedResult: 'Result 4' }
        ]
      };
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step order must be sequential starting from 1');
    });

    it('should enforce title length limits', () => {
      // Arrange
      const veryLongTitle = 'a'.repeat(201);
      const testCase: Partial<TestCase> = {
        title: veryLongTitle,
        description: 'Description'
      };
      
      // Act
      const result = EntityValidator.validateTestCase(testCase);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be 200 characters or less');
    });
  });

  describe('validateTestStep', () => {
    it('should validate a complete and valid test step', () => {
      // Arrange
      const step: Partial<TestStep> = {
        order: 1,
        description: 'Valid step description',
        expectedResult: 'Expected result'
      };
      
      // Act
      const errors = EntityValidator.validateTestStep(step);
      
      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should return errors for an invalid test step', () => {
      // Arrange
      const step: Partial<TestStep> = {
        order: 0,
        description: '',
        expectedResult: ''
      };
      
      // Act
      const errors = EntityValidator.validateTestStep(step);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Step description is required');
      expect(errors).toContain('Expected result is required');
      expect(errors).toContain('Step order must be a positive number');
    });
  });

  describe('validateTestSuite', () => {
    it('should validate a complete and valid test suite', () => {
      // Arrange
      const testSuite: Partial<TestSuite> = {
        name: 'Valid Test Suite',
        description: 'This is a valid test suite',
        testCases: ['tc-1', 'tc-2', 'tc-3']
      };
      
      // Act
      const result = EntityValidator.validateTestSuite(testSuite);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for an invalid test suite', () => {
      // Arrange
      const testSuite: Partial<TestSuite> = {
        name: '',
        description: '',
        testCases: 'not-an-array' as any
      };
      
      // Act
      const result = EntityValidator.validateTestSuite(testSuite);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Name is required');
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain('Test cases must be an array');
    });

    it('should enforce name length limits', () => {
      // Arrange
      const veryLongName = 'a'.repeat(101);
      const testSuite: Partial<TestSuite> = {
        name: veryLongName,
        description: 'Description'
      };
      
      // Act
      const result = EntityValidator.validateTestSuite(testSuite);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be 100 characters or less');
    });

    it('should detect duplicate test case IDs', () => {
      // Arrange
      const testSuite: Partial<TestSuite> = {
        name: 'Suite with duplicates',
        description: 'Description',
        testCases: ['tc-1', 'tc-2', 'tc-1'] // tc-1 is duplicate
      };
      
      // Act
      const result = EntityValidator.validateTestSuite(testSuite);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test cases must have unique IDs');
    });
  });

  describe('validateTestExecution', () => {
    it('should validate a complete and valid test execution', () => {
      // Arrange
      const execution: Partial<TestExecution> = {
        testCaseId: 'tc-1',
        executedBy: 'user-1',
        environment: 'QA',
        status: ExecutionStatus.PASSED,
        duration: 120,
        buildVersion: '1.0.0',
        notes: 'Execution notes',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: 'Notes 1' },
          { stepOrder: 2, status: ExecutionStatus.PASSED, actualResult: 'Actual 2', notes: 'Notes 2' }
        ]
      };
      
      // Act
      const result = EntityValidator.validateTestExecution(execution);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for an invalid test execution', () => {
      // Arrange
      const execution: Partial<TestExecution> = {
        testCaseId: '',
        executedBy: '',
        environment: '',
        status: 'INVALID_STATUS' as any,
        duration: -10,
        stepResults: [
          { stepOrder: 0, status: 'INVALID_STATUS' as any, actualResult: '', notes: '' }
        ]
      };
      
      // Act
      const result = EntityValidator.validateTestExecution(execution);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Test case ID is required');
      expect(result.errors).toContain('Executed by is required');
      expect(result.errors).toContain('Environment is required');
      expect(result.errors).toContain(`Status must be one of: ${Object.values(ExecutionStatus).join(', ')}`);
      expect(result.errors).toContain('Duration cannot be negative');
      // Also check for step result errors
      expect(result.errors.some(e => e.includes('Step result 1:'))).toBe(true);
    });
  });

  describe('validateStepResult', () => {
    it('should validate a complete and valid step result', () => {
      // Arrange
      const stepResult: Partial<StepResult> = {
        stepOrder: 1,
        status: ExecutionStatus.PASSED,
        actualResult: 'Actual result',
        notes: 'Notes'
      };
      
      // Act
      const errors = EntityValidator.validateStepResult(stepResult);
      
      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should return errors for an invalid step result', () => {
      // Arrange
      const stepResult: Partial<StepResult> = {
        stepOrder: 0,
        status: 'INVALID_STATUS' as any
      };
      
      // Act
      const errors = EntityValidator.validateStepResult(stepResult);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Step order must be a positive number');
      expect(errors).toContain(`Status must be one of: ${Object.values(ExecutionStatus).join(', ')}`);
    });
  });

  describe('validateUser', () => {
    it('should validate a complete and valid user', () => {
      // Arrange
      const user: Partial<User> = {
        username: 'validuser',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.TESTER,
        preferences: {
          theme: 'dark',
          notificationsEnabled: true,
          defaultTestProvider: 'zephyr'
        }
      };
      
      // Act
      const result = EntityValidator.validateUser(user);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for an invalid user', () => {
      // Arrange
      const user: Partial<User> = {
        username: '',
        email: 'invalid-email',
        role: 'INVALID_ROLE' as any,
        preferences: {
          theme: 'invalid-theme' as any,
          notificationsEnabled: 'not-a-boolean' as any
        }
      };
      
      // Act
      const result = EntityValidator.validateUser(user);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Username is required');
      expect(result.errors).toContain('Email is invalid');
      expect(result.errors).toContain(`Role must be one of: ${Object.values(UserRole).join(', ')}`);
      // Also check for preferences errors
      expect(result.errors.some(e => e.includes('Preferences:'))).toBe(true);
    });

    it('should enforce username length limits', () => {
      // Arrange
      const tooShortUsername = 'ab';
      const tooLongUsername = 'a'.repeat(51);
      
      // Act
      const shortResult = EntityValidator.validateUser({ username: tooShortUsername, email: 'user@example.com' });
      const longResult = EntityValidator.validateUser({ username: tooLongUsername, email: 'user@example.com' });
      
      // Assert
      expect(shortResult.isValid).toBe(false);
      expect(longResult.isValid).toBe(false);
      expect(shortResult.errors).toContain('Username must be between 3 and 50 characters');
      expect(longResult.errors).toContain('Username must be between 3 and 50 characters');
    });
  });

  describe('validateUserPreferences', () => {
    it('should validate valid user preferences', () => {
      // Arrange
      const preferences: Partial<UserPreferences> = {
        theme: 'dark',
        notificationsEnabled: true,
        defaultTestProvider: 'zephyr'
      };
      
      // Act
      const errors = EntityValidator.validateUserPreferences(preferences);
      
      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid user preferences', () => {
      // Arrange
      const preferences: Partial<UserPreferences> = {
        theme: 'invalid-theme' as any,
        notificationsEnabled: 'not-a-boolean' as any
      };
      
      // Act
      const errors = EntityValidator.validateUserPreferences(preferences);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Theme must be one of: light, dark, system');
      expect(errors).toContain('Notifications enabled must be a boolean');
    });
  });
});