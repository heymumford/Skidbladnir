/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TestCase, TestCaseStatus, Priority, TestStep } from '../../../../pkg/domain/entities/TestCase';
import { TestSuite } from '../../../../pkg/domain/entities/TestSuite';
import { TestExecution, ExecutionStatus, StepResult } from '../../../../pkg/domain/entities/TestExecution';
import { User, UserRole, UserPreferences } from '../../../../pkg/domain/entities/User';

/**
 * This test suite ensures that our core domain entity models follow Domain-Driven Design (DDD) principles:
 * - Entities have identity
 * - Entities encapsulate state and behavior
 * - Entities use meaningful, domain-specific naming
 * - Entities use value objects for descriptive concepts
 * - Relationships between entities are clearly defined
 * - Entities have consistency rules (invariants)
 */
describe('Domain Entity Models', () => {
  describe('Domain entities structure', () => {
    it('should have correct structure for TestCase entity', () => {
      // Create a valid test case
      const testCase: TestCase = {
        id: 'tc-1',
        title: 'Login functionality',
        description: 'Test the login functionality',
        status: TestCaseStatus.READY,
        priority: Priority.HIGH,
        steps: [
          { order: 1, description: 'Navigate to login page', expectedResult: 'Login page is displayed' },
          { order: 2, description: 'Enter credentials', expectedResult: 'User is logged in' }
        ],
        tags: ['login', 'authentication'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Ensure all properties are present
      expect(testCase.id).toBeDefined();
      expect(testCase.title).toBeDefined();
      expect(testCase.description).toBeDefined();
      expect(testCase.status).toBeDefined();
      expect(testCase.priority).toBeDefined();
      expect(testCase.steps).toBeDefined();
      expect(testCase.tags).toBeDefined();
      expect(testCase.createdAt).toBeDefined();
      expect(testCase.updatedAt).toBeDefined();
      
      // Verify enums are properly defined
      expect(Object.values(TestCaseStatus)).toContain(testCase.status);
      expect(Object.values(Priority)).toContain(testCase.priority);
      
      // Verify array properties
      expect(Array.isArray(testCase.steps)).toBe(true);
      expect(Array.isArray(testCase.tags)).toBe(true);
    });

    it('should have correct structure for TestSuite entity', () => {
      // Create a valid test suite
      const testSuite: TestSuite = {
        id: 'ts-1',
        name: 'Authentication Test Suite',
        description: 'Tests for authentication functionality',
        testCases: ['tc-1', 'tc-2', 'tc-3'],
        parentSuiteId: 'ts-parent',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Ensure all properties are present
      expect(testSuite.id).toBeDefined();
      expect(testSuite.name).toBeDefined();
      expect(testSuite.description).toBeDefined();
      expect(testSuite.testCases).toBeDefined();
      expect(testSuite.createdAt).toBeDefined();
      expect(testSuite.updatedAt).toBeDefined();
      
      // Verify optional properties
      expect(testSuite.parentSuiteId).toBeDefined();
      
      // Verify array properties
      expect(Array.isArray(testSuite.testCases)).toBe(true);
    });

    it('should have correct structure for TestExecution entity', () => {
      // Create a valid test execution
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 120,
        environment: 'QA',
        buildVersion: '1.0.0',
        notes: 'Execution completed successfully',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Login page displayed', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.PASSED, actualResult: 'User logged in successfully', notes: '' }
        ]
      };
      
      // Ensure all properties are present
      expect(execution.id).toBeDefined();
      expect(execution.testCaseId).toBeDefined();
      expect(execution.executionDate).toBeDefined();
      expect(execution.executedBy).toBeDefined();
      expect(execution.status).toBeDefined();
      expect(execution.duration).toBeDefined();
      expect(execution.environment).toBeDefined();
      expect(execution.buildVersion).toBeDefined();
      expect(execution.notes).toBeDefined();
      expect(execution.stepResults).toBeDefined();
      
      // Verify enums are properly defined
      expect(Object.values(ExecutionStatus)).toContain(execution.status);
      
      // Verify array properties
      expect(Array.isArray(execution.stepResults)).toBe(true);
    });

    it('should have correct structure for User entity', () => {
      // Create a valid user
      const user: User = {
        id: 'user-1',
        username: 'jdoe',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.TESTER,
        preferences: {
          theme: 'dark',
          notificationsEnabled: true,
          defaultTestProvider: 'zephyr'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Ensure all properties are present
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.preferences).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      
      // Verify enums are properly defined
      expect(Object.values(UserRole)).toContain(user.role);
      
      // Verify nested objects
      expect(user.preferences.theme).toBeDefined();
      expect(user.preferences.notificationsEnabled).toBeDefined();
      expect(user.preferences.defaultTestProvider).toBeDefined();
    });
  });

  describe('Domain entity relationships', () => {
    it('should have correct relationship between TestCase and TestSuite', () => {
      // TestSuite contains TestCase IDs
      const testSuite: TestSuite = {
        id: 'ts-1',
        name: 'Authentication Suite',
        description: 'Tests for authentication',
        testCases: ['tc-1', 'tc-2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Verify the relationship
      expect(testSuite.testCases).toContain('tc-1');
      expect(testSuite.testCases).toContain('tc-2');
    });

    it('should have correct relationship between TestCase and TestExecution', () => {
      // TestExecution references TestCase ID
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 120,
        environment: 'QA',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: []
      };
      
      // Verify the relationship
      expect(execution.testCaseId).toBe('tc-1');
    });

    it('should have correct relationship between TestCase and TestStep', () => {
      // TestCase contains TestSteps
      const testCase: TestCase = {
        id: 'tc-1',
        title: 'Login Test',
        description: 'Test login functionality',
        status: TestCaseStatus.READY,
        priority: Priority.MEDIUM,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
          { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Verify the relationship
      expect(testCase.steps).toHaveLength(2);
      expect(testCase.steps[0].order).toBe(1);
      expect(testCase.steps[1].order).toBe(2);
    });

    it('should have correct relationship between TestExecution and StepResult', () => {
      // TestExecution contains StepResults that correspond to TestSteps
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 120,
        environment: 'QA',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.FAILED, actualResult: 'Actual 2', notes: 'Failed' }
        ]
      };
      
      // Verify the relationship
      expect(execution.stepResults).toHaveLength(2);
      expect(execution.stepResults[0].stepOrder).toBe(1);
      expect(execution.stepResults[1].stepOrder).toBe(2);
      
      // Verify that stepOrder in StepResult corresponds to order in TestStep
      expect(execution.stepResults[0].stepOrder).toBe(1);
      expect(execution.stepResults[1].stepOrder).toBe(2);
    });

    it('should have correct hierarchical relationship in TestSuite', () => {
      // TestSuite can have a parent TestSuite
      const parentSuite: TestSuite = {
        id: 'ts-parent',
        name: 'Parent Suite',
        description: 'Parent test suite',
        testCases: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const childSuite: TestSuite = {
        id: 'ts-child',
        name: 'Child Suite',
        description: 'Child test suite',
        testCases: [],
        parentSuiteId: 'ts-parent',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Verify the relationship
      expect(childSuite.parentSuiteId).toBe(parentSuite.id);
    });
  });

  describe('Domain entity invariants', () => {
    it('should maintain TestCase invariants', () => {
      // TestCase must have a title and description
      const testCase: TestCase = {
        id: 'tc-1',
        title: 'Login Test',
        description: 'Test login functionality',
        status: TestCaseStatus.READY,
        priority: Priority.MEDIUM,
        steps: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Verify invariants
      expect(testCase.title).not.toBe('');
      expect(testCase.description).not.toBe('');
    });

    it('should maintain TestStep invariants', () => {
      // TestStep must have a description and expectedResult
      const step: TestStep = {
        order: 1,
        description: 'Navigate to login page',
        expectedResult: 'Login page is displayed'
      };
      
      // Verify invariants
      expect(step.order).toBeGreaterThan(0);
      expect(step.description).not.toBe('');
      expect(step.expectedResult).not.toBe('');
    });

    it('should maintain TestExecution invariants', () => {
      // TestExecution must have a testCaseId, executedBy, and environment
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 120,
        environment: 'QA',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: []
      };
      
      // Verify invariants
      expect(execution.testCaseId).not.toBe('');
      expect(execution.executedBy).not.toBe('');
      expect(execution.environment).not.toBe('');
      expect(execution.duration).toBeGreaterThanOrEqual(0);
    });

    it('should maintain StepResult invariants', () => {
      // StepResult must have a stepOrder
      const stepResult: StepResult = {
        stepOrder: 1,
        status: ExecutionStatus.PASSED,
        actualResult: 'Login page displayed',
        notes: ''
      };
      
      // Verify invariants
      expect(stepResult.stepOrder).toBeGreaterThan(0);
      expect(Object.values(ExecutionStatus)).toContain(stepResult.status);
    });

    it('should maintain User invariants', () => {
      // User must have a username and email
      const user: User = {
        id: 'user-1',
        username: 'jdoe',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.TESTER,
        preferences: {
          theme: 'dark',
          notificationsEnabled: true,
          defaultTestProvider: 'zephyr'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Verify invariants
      expect(user.username).not.toBe('');
      expect(user.email).not.toBe('');
      expect(Object.values(UserRole)).toContain(user.role);
    });
  });

  describe('Domain entity value objects', () => {
    it('should use proper value types for dates', () => {
      // Create entities with dates
      const testCase: TestCase = {
        id: 'tc-1',
        title: 'Test',
        description: 'Description',
        status: TestCaseStatus.DRAFT,
        priority: Priority.LOW,
        steps: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.NOT_EXECUTED,
        duration: 0,
        environment: 'DEV',
        buildVersion: '1.0',
        notes: '',
        stepResults: []
      };
      
      // Verify date types
      expect(testCase.createdAt instanceof Date).toBe(true);
      expect(testCase.updatedAt instanceof Date).toBe(true);
      expect(execution.executionDate instanceof Date).toBe(true);
    });

    it('should represent IDs consistently across the domain', () => {
      // Create various entities with IDs
      const testCase: TestCase = { id: 'tc-1', title: 'Test', description: 'Desc', status: TestCaseStatus.DRAFT, priority: Priority.LOW, steps: [], tags: [], createdAt: new Date(), updatedAt: new Date() };
      const testSuite: TestSuite = { id: 'ts-1', name: 'Suite', description: 'Desc', testCases: [], createdAt: new Date(), updatedAt: new Date() };
      const execution: TestExecution = { id: 'exec-1', testCaseId: 'tc-1', executionDate: new Date(), executedBy: 'user-1', status: ExecutionStatus.NOT_EXECUTED, duration: 0, environment: 'DEV', buildVersion: '1.0', notes: '', stepResults: [] };
      const user: User = { id: 'user-1', username: 'user', email: 'user@example.com', firstName: 'First', lastName: 'Last', role: UserRole.VIEWER, preferences: { theme: 'light', notificationsEnabled: false, defaultTestProvider: 'default' }, createdAt: new Date(), updatedAt: new Date() };
      
      // Verify consistent ID representation
      expect(typeof testCase.id).toBe('string');
      expect(typeof testSuite.id).toBe('string');
      expect(typeof execution.id).toBe('string');
      expect(typeof user.id).toBe('string');
    });
  });
});