/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TestCaseFactory, CreateTestCaseProps } from '../../../../pkg/domain/entities/TestCaseFactory';
import { TestCase, TestCaseStatus, Priority } from '../../../../pkg/domain/entities/TestCase';
import { ValidationError } from '../../../../pkg/domain/errors/DomainErrors';
import { Identifier } from '../../../../pkg/domain/value-objects/Identifier';

describe('TestCaseFactory', () => {
  // Setup fake timers for time-based tests
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('create', () => {
    it('should create a valid test case with required properties', () => {
      // Arrange
      const props: CreateTestCaseProps = {
        title: 'Test login functionality',
        description: 'Verify that users can log in with valid credentials'
      };
      
      // Act
      const testCase = TestCaseFactory.create(props);
      
      // Assert
      expect(testCase).toBeDefined();
      expect(testCase.id).toBeDefined();
      expect(testCase.title).toBe(props.title);
      expect(testCase.description).toBe(props.description);
      expect(testCase.status).toBe(TestCaseStatus.DRAFT); // Default status
      expect(testCase.priority).toBe(Priority.MEDIUM); // Default priority
      expect(testCase.steps).toEqual([]);
      expect(testCase.tags).toEqual([]);
      expect(testCase.createdAt).toBeInstanceOf(Date);
      expect(testCase.updatedAt).toBeInstanceOf(Date);
    });
    
    it('should create a test case with all properties specified', () => {
      // Arrange
      const props: CreateTestCaseProps = {
        title: 'Test login functionality',
        description: 'Verify that users can log in with valid credentials',
        status: TestCaseStatus.READY,
        priority: Priority.HIGH,
        steps: [
          { order: 1, description: 'Navigate to login page', expectedResult: 'Login page is displayed' },
          { order: 2, description: 'Enter valid credentials', expectedResult: 'User is logged in' }
        ],
        tags: ['login', 'authentication']
      };
      
      // Act
      const testCase = TestCaseFactory.create(props);
      
      // Assert
      expect(testCase).toBeDefined();
      expect(testCase.id).toBeDefined();
      expect(testCase.title).toBe(props.title);
      expect(testCase.description).toBe(props.description);
      expect(testCase.status).toBe(props.status);
      expect(testCase.priority).toBe(props.priority);
      expect(testCase.steps).toEqual(props.steps);
      expect(testCase.tags).toEqual(props.tags);
    });
    
    it('should throw ValidationError for invalid properties', () => {
      // Arrange
      const invalidProps: CreateTestCaseProps = {
        title: '', // Empty title is invalid
        description: 'Description'
      };
      
      // Act & Assert
      expect(() => TestCaseFactory.create(invalidProps)).toThrow(ValidationError);
      
      try {
        TestCaseFactory.create(invalidProps);
        fail('Should have thrown ValidationError');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toContain('Title is required');
        } else {
          fail('Error should be a ValidationError');
        }
      }
    });
    
    it('should generate a unique ID using Identifier value object', () => {
      // Arrange
      const props: CreateTestCaseProps = {
        title: 'Test Case',
        description: 'Description'
      };
      
      // Act
      const testCase1 = TestCaseFactory.create(props);
      const testCase2 = TestCaseFactory.create(props);
      
      // Assert - IDs should be different
      expect(testCase1.id).not.toBe(testCase2.id);
      
      // Verify they match the UUID format from Identifier
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(testCase1.id).toMatch(uuidRegex);
      expect(testCase2.id).toMatch(uuidRegex);
    });
  });
  
  describe('reconstitute', () => {
    it('should reconstitute a valid test case from storage', () => {
      // Arrange
      const storedTestCase: TestCase = {
        id: Identifier.createRandom().toString(),
        title: 'Stored Test Case',
        description: 'Description of stored test case',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ],
        tags: ['stored'],
        createdAt: new Date(2025, 0, 1), // January 1, 2025
        updatedAt: new Date(2025, 0, 2)  // January 2, 2025
      };
      
      // Act
      const reconstitutedTestCase = TestCaseFactory.reconstitute(storedTestCase);
      
      // Assert
      expect(reconstitutedTestCase).toEqual(storedTestCase);
    });
    
    it('should throw ValidationError for invalid stored test case', () => {
      // Arrange
      const invalidStoredTestCase: TestCase = {
        id: Identifier.createRandom().toString(),
        title: '', // Empty title is invalid
        description: 'Description',
        status: 'INVALID_STATUS' as any, // Invalid status
        priority: Priority.MEDIUM,
        steps: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Act & Assert
      expect(() => TestCaseFactory.reconstitute(invalidStoredTestCase)).toThrow(ValidationError);
      
      try {
        TestCaseFactory.reconstitute(invalidStoredTestCase);
        fail('Should have thrown ValidationError');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toContain('Title is required');
          expect(error.validationErrors.some(e => e.includes('Status must be one of'))).toBe(true);
        } else {
          fail('Error should be a ValidationError');
        }
      }
    });
  });
  
  describe('addStep', () => {
    it('should add a valid step to a test case', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description',
        steps: [
          { order: 1, description: 'Existing Step', expectedResult: 'Existing Result' }
        ]
      });
      const originalUpdatedAt = testCase.updatedAt;
      
      // Wait a moment to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      // Act
      const stepDescription = 'New Step';
      const expectedResult = 'New Result';
      const updatedTestCase = TestCaseFactory.addStep(testCase, stepDescription, expectedResult);
      
      // Assert
      expect(updatedTestCase.steps).toHaveLength(2);
      expect(updatedTestCase.steps[1]).toEqual({
        order: 2,
        description: stepDescription,
        expectedResult: expectedResult
      });
      expect(updatedTestCase.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
    
    it('should throw ValidationError for invalid step', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description'
      });
      
      // Act & Assert
      expect(() => TestCaseFactory.addStep(testCase, '', '')).toThrow(ValidationError);
      
      try {
        TestCaseFactory.addStep(testCase, '', '');
        fail('Should have thrown ValidationError');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toContain('Step description is required');
          expect(error.validationErrors).toContain('Expected result is required');
        } else {
          fail('Error should be a ValidationError');
        }
      }
    });
  });
  
  describe('updateStatus', () => {
    it('should update the status of a test case', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description',
        status: TestCaseStatus.DRAFT
      });
      const originalUpdatedAt = testCase.updatedAt;
      
      // Wait a moment to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      // Act
      const newStatus = TestCaseStatus.READY;
      const updatedTestCase = TestCaseFactory.updateStatus(testCase, newStatus);
      
      // Assert
      expect(updatedTestCase.status).toBe(newStatus);
      expect(updatedTestCase.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
    
    it('should preserve other properties when updating status', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description',
        status: TestCaseStatus.DRAFT,
        priority: Priority.HIGH,
        steps: [{ order: 1, description: 'Step', expectedResult: 'Result' }],
        tags: ['tag1', 'tag2']
      });
      
      // Act
      const updatedTestCase = TestCaseFactory.updateStatus(testCase, TestCaseStatus.APPROVED);
      
      // Assert
      expect(updatedTestCase.id).toBe(testCase.id);
      expect(updatedTestCase.title).toBe(testCase.title);
      expect(updatedTestCase.description).toBe(testCase.description);
      expect(updatedTestCase.priority).toBe(testCase.priority);
      expect(updatedTestCase.steps).toEqual(testCase.steps);
      expect(updatedTestCase.tags).toEqual(testCase.tags);
      expect(updatedTestCase.createdAt).toEqual(testCase.createdAt);
    });
    
    it('should throw ValidationError for invalid status', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description'
      });
      
      // Act & Assert
      expect(() => TestCaseFactory.updateStatus(testCase, 'INVALID_STATUS' as any)).toThrow(ValidationError);
    });
  });
});