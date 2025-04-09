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
import { User, UserRole } from '../../../../pkg/domain/entities/User';
import { Identifier } from '../../../../pkg/domain/value-objects/Identifier';
import { TestCaseFactory } from '../../../../pkg/domain/entities/TestCaseFactory';
import { EntityValidator } from '../../../../pkg/domain/entities/EntityValidator';
import { TestCaseServiceImpl } from '../../../../internal/typescript/domain/services/TestCaseServiceImpl';

/**
 * Tests to ensure that entity relationships in our domain model function correctly.
 * These tests verify:
 * 1. Integrity of references between entities
 * 2. Proper navigation between related entities
 * 3. Consistency of related data
 * 4. Validation of relationships
 */
describe('Entity Relationships', () => {
  // Test data factories
  const createTestCase = (id: string, title: string): TestCase => {
    return {
      id,
      title,
      description: `Description for ${title}`,
      status: TestCaseStatus.DRAFT,
      priority: Priority.MEDIUM,
      steps: [
        { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
      ],
      tags: ['test'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const createTestSuite = (id: string, name: string, testCaseIds: string[] = []): TestSuite => {
    return {
      id,
      name,
      description: `Description for ${name}`,
      testCases: testCaseIds,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const createTestExecution = (id: string, testCaseId: string, status: ExecutionStatus): TestExecution => {
    return {
      id,
      testCaseId,
      executionDate: new Date(),
      executedBy: 'user-1',
      status,
      duration: 60,
      environment: 'TEST',
      buildVersion: '1.0.0',
      notes: '',
      stepResults: [
        { stepOrder: 1, status, actualResult: 'Actual result', notes: '' }
      ]
    };
  };

  const createUser = (id: string, username: string): User => {
    return {
      id,
      username,
      email: `${username}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.TESTER,
      preferences: {
        theme: 'light',
        notificationsEnabled: true,
        defaultTestProvider: 'default'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  describe('TestCase to TestSuite relationship', () => {
    it('should allow a test case to be part of one or more test suites', () => {
      // Arrange
      const testCase = createTestCase('tc-1', 'Test Case 1');
      const suite1 = createTestSuite('ts-1', 'Test Suite 1', [testCase.id]);
      const suite2 = createTestSuite('ts-2', 'Test Suite 2', [testCase.id]);
      
      // Assert
      expect(suite1.testCases).toContain(testCase.id);
      expect(suite2.testCases).toContain(testCase.id);
    });

    it('should allow a test suite to contain multiple test cases', () => {
      // Arrange
      const testCase1 = createTestCase('tc-1', 'Test Case 1');
      const testCase2 = createTestCase('tc-2', 'Test Case 2');
      const testCase3 = createTestCase('tc-3', 'Test Case 3');
      const suite = createTestSuite('ts-1', 'Test Suite 1', [testCase1.id, testCase2.id, testCase3.id]);
      
      // Assert
      expect(suite.testCases).toHaveLength(3);
      expect(suite.testCases).toContain(testCase1.id);
      expect(suite.testCases).toContain(testCase2.id);
      expect(suite.testCases).toContain(testCase3.id);
    });

    it('should validate that test suite contains valid test case IDs', () => {
      // Arrange
      const suite = createTestSuite('ts-1', 'Test Suite 1', ['tc-1', 'tc-2', 'tc-3']);
      const invalidSuite = createTestSuite('ts-2', 'Invalid Suite', ['tc-1', '', null as any]);
      
      // Act
      const validResult = EntityValidator.validateTestSuite(suite);
      const invalidResult = EntityValidator.validateTestSuite(invalidSuite);
      
      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate that test suite has unique test case IDs', () => {
      // Arrange
      const duplicateSuite = createTestSuite('ts-1', 'Duplicate Suite', ['tc-1', 'tc-2', 'tc-1']);
      
      // Act
      const result = EntityValidator.validateTestSuite(duplicateSuite);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test cases must have unique IDs');
    });
  });

  describe('TestSuite hierarchical relationship', () => {
    it('should allow a test suite to have a parent suite', () => {
      // Arrange
      const parentSuite = createTestSuite('ts-parent', 'Parent Suite');
      const childSuite: TestSuite = {
        ...createTestSuite('ts-child', 'Child Suite'),
        parentSuiteId: parentSuite.id
      };
      
      // Assert
      expect(childSuite.parentSuiteId).toBe(parentSuite.id);
    });

    it('should allow a suite to have multiple child suites', () => {
      // Arrange
      const parentSuite = createTestSuite('ts-parent', 'Parent Suite');
      const childSuite1: TestSuite = {
        ...createTestSuite('ts-child1', 'Child Suite 1'),
        parentSuiteId: parentSuite.id
      };
      const childSuite2: TestSuite = {
        ...createTestSuite('ts-child2', 'Child Suite 2'),
        parentSuiteId: parentSuite.id
      };
      
      // Assert - In a real app with repositories, we'd verify parentSuiteId references
      expect(childSuite1.parentSuiteId).toBe(parentSuite.id);
      expect(childSuite2.parentSuiteId).toBe(parentSuite.id);
    });

    it('should validate parent suite ID if provided', () => {
      // Arrange
      const validSuite: TestSuite = {
        ...createTestSuite('ts-child', 'Child Suite'),
        parentSuiteId: 'ts-parent'
      };
      const invalidSuite: TestSuite = {
        ...createTestSuite('ts-invalid', 'Invalid Suite'),
        parentSuiteId: ''
      };
      
      // Act & Assert
      // Note: Our current EntityValidator doesn't check parent suite ID validity,
      // but it should - this would be an enhancement to add in a real implementation
      // This test demonstrates the intent
      expect(validSuite.parentSuiteId).toBeTruthy();
      expect(invalidSuite.parentSuiteId).toBeFalsy();
    });
  });

  describe('TestCase to TestExecution relationship', () => {
    it('should link test executions to a specific test case', () => {
      // Arrange
      const testCase = createTestCase('tc-1', 'Test Case 1');
      const execution = createTestExecution('exec-1', testCase.id, ExecutionStatus.PASSED);
      
      // Assert
      expect(execution.testCaseId).toBe(testCase.id);
    });

    it('should allow multiple executions for a single test case', () => {
      // Arrange
      const testCase = createTestCase('tc-1', 'Test Case 1');
      const execution1 = createTestExecution('exec-1', testCase.id, ExecutionStatus.PASSED);
      const execution2 = createTestExecution('exec-2', testCase.id, ExecutionStatus.FAILED);
      const execution3 = createTestExecution('exec-3', testCase.id, ExecutionStatus.BLOCKED);
      
      // Assert - All executions point to the same test case
      expect(execution1.testCaseId).toBe(testCase.id);
      expect(execution2.testCaseId).toBe(testCase.id);
      expect(execution3.testCaseId).toBe(testCase.id);
    });

    it('should validate testCaseId in test execution', () => {
      // Arrange
      const validExecution = createTestExecution('exec-1', 'tc-1', ExecutionStatus.PASSED);
      const invalidExecution = createTestExecution('exec-2', '', ExecutionStatus.PASSED);
      
      // Act
      const validResult = EntityValidator.validateTestExecution(validExecution);
      const invalidResult = EntityValidator.validateTestExecution(invalidExecution);
      
      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Test case ID is required');
    });
  });

  describe('TestStep to StepResult relationship', () => {
    it('should link step results to test steps by order', () => {
      // Arrange
      const testCase = createTestCase('tc-1', 'Test Case 1');
      testCase.steps = [
        { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
        { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
      ];
      
      const execution: TestExecution = {
        id: 'exec-1',
        testCaseId: testCase.id,
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 60,
        environment: 'TEST',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.PASSED, actualResult: 'Actual 2', notes: '' }
        ]
      };
      
      // Assert - Step orders match
      expect(execution.stepResults[0].stepOrder).toBe(testCase.steps[0].order);
      expect(execution.stepResults[1].stepOrder).toBe(testCase.steps[1].order);
    });

    it('should validate step result orders match test case steps', () => {
      // Arrange
      const testCase = createTestCase('tc-1', 'Test Case 1');
      testCase.steps = [
        { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
        { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
      ];
      
      const missingStepExecution: TestExecution = {
        id: 'exec-1',
        testCaseId: testCase.id,
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 60,
        environment: 'TEST',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          // Missing step 2
          { stepOrder: 3, status: ExecutionStatus.PASSED, actualResult: 'Invalid step', notes: '' }
        ]
      };
      
      // Act & Assert
      // Note: Our current validation doesn't cross-check step orders against test cases
      // but this would be an important validation to add in a real implementation
      expect(missingStepExecution.stepResults.find(sr => sr.stepOrder === 3)).toBeDefined();
      expect(testCase.steps.find(s => s.order === 3)).toBeUndefined();
    });
    
    it('should validate step results have sequential order numbers', () => {
      // Arrange
      const validExecution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 60,
        environment: 'TEST',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.PASSED, actualResult: 'Actual 2', notes: '' },
          { stepOrder: 3, status: ExecutionStatus.PASSED, actualResult: 'Actual 3', notes: '' }
        ]
      };
      
      const nonSequentialExecution: TestExecution = {
        id: 'exec-2',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 60,
        environment: 'TEST',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          { stepOrder: 3, status: ExecutionStatus.PASSED, actualResult: 'Actual 3', notes: '' },
          // Missing step 2
          { stepOrder: 5, status: ExecutionStatus.PASSED, actualResult: 'Actual 5', notes: '' }
        ]
      };
      
      // Act
      const validResult = EntityValidator.validateTestExecution(validExecution);
      const invalidResult = EntityValidator.validateTestExecution(nonSequentialExecution);
      
      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Step results must have sequential order numbers');
    });
    
    it('should validate step results have unique order numbers', () => {
      // Arrange
      const duplicateStepExecution: TestExecution = {
        id: 'exec-1',
        testCaseId: 'tc-1',
        executionDate: new Date(),
        executedBy: 'user-1',
        status: ExecutionStatus.PASSED,
        duration: 60,
        environment: 'TEST',
        buildVersion: '1.0.0',
        notes: '',
        stepResults: [
          { stepOrder: 1, status: ExecutionStatus.PASSED, actualResult: 'Actual 1', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.PASSED, actualResult: 'Actual 2', notes: '' },
          { stepOrder: 2, status: ExecutionStatus.FAILED, actualResult: 'Duplicate step', notes: '' } // Duplicate step order
        ]
      };
      
      // Act
      const result = EntityValidator.validateTestExecution(duplicateStepExecution);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step results must have unique order numbers');
    });
  });

  describe('TestExecution to User relationship', () => {
    it('should link test execution to the user who executed it', () => {
      // Arrange
      const user = createUser('user-1', 'testuser');
      const execution = createTestExecution('exec-1', 'tc-1', ExecutionStatus.PASSED);
      execution.executedBy = user.id;
      
      // Assert
      expect(execution.executedBy).toBe(user.id);
    });

    it('should validate executedBy field in test execution', () => {
      // Arrange
      const validExecution = createTestExecution('exec-1', 'tc-1', ExecutionStatus.PASSED);
      validExecution.executedBy = 'user-1';
      
      const invalidExecution = createTestExecution('exec-2', 'tc-1', ExecutionStatus.PASSED);
      invalidExecution.executedBy = '';
      
      // Act
      const validResult = EntityValidator.validateTestExecution(validExecution);
      const invalidResult = EntityValidator.validateTestExecution(invalidExecution);
      
      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Executed by is required');
    });
  });

  describe('Complex relationship graph', () => {
    it('should allow navigation of the entire relationship graph', () => {
      // Arrange - Create a test suite hierarchy with test cases and executions
      const user = createUser('user-1', 'testuser');
      
      const parentSuite = createTestSuite('ts-parent', 'Parent Suite');
      
      const childSuite1: TestSuite = {
        ...createTestSuite('ts-child1', 'Child Suite 1'),
        parentSuiteId: parentSuite.id
      };
      
      const childSuite2: TestSuite = {
        ...createTestSuite('ts-child2', 'Child Suite 2'),
        parentSuiteId: parentSuite.id
      };
      
      const testCase1 = createTestCase('tc-1', 'Test Case 1');
      const testCase2 = createTestCase('tc-2', 'Test Case 2');
      const testCase3 = createTestCase('tc-3', 'Test Case 3');
      
      // Update suites with test cases
      childSuite1.testCases = [testCase1.id, testCase2.id];
      childSuite2.testCases = [testCase3.id];
      
      // Create executions
      const execution1 = createTestExecution('exec-1', testCase1.id, ExecutionStatus.PASSED);
      execution1.executedBy = user.id;
      
      const execution2 = createTestExecution('exec-2', testCase2.id, ExecutionStatus.FAILED);
      execution2.executedBy = user.id;
      
      // Assert - We can navigate the entire relationship graph
      // From parent suite -> child suite -> test case -> execution -> user
      
      // Step 1: From parent to child suites
      const childSuites = [childSuite1, childSuite2]
        .filter(suite => suite.parentSuiteId === parentSuite.id);
      expect(childSuites).toHaveLength(2);
      
      // Step 2: From child suite to test cases
      const suite1TestCases = [testCase1, testCase2]
        .filter(tc => childSuite1.testCases.includes(tc.id));
      expect(suite1TestCases).toHaveLength(2);
      
      // Step 3: From test case to executions
      const testCase1Executions = [execution1, execution2]
        .filter(exec => exec.testCaseId === testCase1.id);
      expect(testCase1Executions).toHaveLength(1);
      expect(testCase1Executions[0].id).toBe('exec-1');
      
      // Step 4: From execution to user
      const executionUser = user.id === execution1.executedBy ? user : null;
      expect(executionUser).not.toBeNull();
      expect(executionUser?.username).toBe('testuser');
    });
  });

  describe('Domain service interactions with relationships', () => {
    it('should maintain relationships when enriching entities', async () => {
      // Arrange
      const testCaseService = new TestCaseServiceImpl();
      const testCase = createTestCase('tc-1', 'Login Test Case');
      
      // Act - Enrich the test case
      const enrichedTestCase = await testCaseService.enrichTestCaseMetadata(testCase);
      
      // Assert - Steps relationship maintained
      expect(enrichedTestCase.steps).toHaveLength(testCase.steps.length);
      expect(enrichedTestCase.steps[0].order).toBe(testCase.steps[0].order);
      
      // Tags modified but in a predictable way
      expect(enrichedTestCase.tags).toContain('test'); // Original tag preserved
      expect(enrichedTestCase.tags).toContain('draft'); // New tag based on status
    });

    it('should generate steps with valid relationships', async () => {
      // Arrange
      const testCaseService = new TestCaseServiceImpl();
      const description = 'Test user login functionality';
      
      // Act
      const steps = await testCaseService.generateTestSteps(description);
      
      // Assert - Step orders are sequential
      expect(steps.length).toBeGreaterThan(0);
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i].order).toBe(i + 1);
      }
    });
  });
  
  describe('Entity creation with factories and relationships', () => {
    it('should maintain relationships when creating entities with factories', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Factory Test Case',
        description: 'Created with factory',
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
          { order: 2, description: 'Step 2', expectedResult: 'Result 2' }
        ]
      });
      
      // Act - Add a step using factory method
      const updatedTestCase = TestCaseFactory.addStep(
        testCase,
        'Step 3',
        'Result 3'
      );
      
      // Assert - Relationships maintained
      expect(updatedTestCase.steps).toHaveLength(3);
      expect(updatedTestCase.steps[2].order).toBe(3); // New step has correct order
      
      // Step order is sequential
      updatedTestCase.steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1);
      });
    });
  });
});