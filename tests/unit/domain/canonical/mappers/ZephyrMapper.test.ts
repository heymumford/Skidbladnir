/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  ZephyrTestCaseMapper, 
  ZephyrTestExecutionMapper 
} from '../../../../../pkg/domain/canonical/mappers/ZephyrMapper';
import {
  CanonicalTestCase,
  TestCaseStatus,
  Priority,
  ExecutionStatus,
  CanonicalTestExecution
} from '../../../../../pkg/domain/canonical/CanonicalModels';

describe('ZephyrTestCaseMapper', () => {
  let mapper: ZephyrTestCaseMapper;
  
  beforeEach(() => {
    mapper = new ZephyrTestCaseMapper();
  });
  
  describe('toCanonical', () => {
    it('should convert basic Zephyr test case to canonical form', () => {
      // Arrange
      const zephyrCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        description: 'Test login functionality',
        precondition: 'User exists in the system',
        status: 'APPROVED',
        priority: 'HIGH',
        folderPath: '/Project/Folder',
        key: 'TEST-123',
        owner: 'user1',
        createdBy: 'admin',
        createdOn: '2025-01-15T10:00:00Z',
        updatedOn: '2025-01-16T10:00:00Z'
      };
      
      // Act
      const result = mapper.toCanonical(zephyrCase);
      
      // Assert
      expect(result).toMatchObject({
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        description: 'Test login functionality',
        preconditions: 'User exists in the system',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        folderPath: '/Project/Folder',
        externalId: 'TEST-123',
        sourceSystem: 'zephyr',
        owner: {
          id: 'user1',
          username: 'user1'
        },
        createdBy: {
          id: 'admin',
          username: 'admin'
        }
      });
      
      // Check date parsing
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
    
    it('should map test steps correctly', () => {
      // Arrange
      const zephyrCase = {
        id: '123',
        name: 'Login Test',
        steps: [
          { 
            id: '1', 
            index: 1, 
            description: 'Enter username', 
            expectedResult: 'Username is entered',
            testData: 'testuser'
          },
          { 
            id: '2', 
            index: 2, 
            description: 'Enter password', 
            expectedResult: 'Password is entered',
            testData: 'password123'
          }
        ]
      };
      
      // Act
      const result = mapper.toCanonical(zephyrCase);
      
      // Assert
      expect(result.testSteps).toHaveLength(2);
      expect(result.testSteps![0]).toMatchObject({
        id: '1',
        order: 1,
        action: 'Enter username',
        expectedResult: 'Username is entered',
        data: 'testuser',
        isDataDriven: true
      });
    });
    
    it('should map custom fields and labels correctly', () => {
      // Arrange
      const zephyrCase = {
        id: '123',
        name: 'Login Test',
        customFields: {
          'Component': 'Authentication',
          'Feature': 'Login',
          'Automation Status': 'Automated'
        },
        labels: ['regression', 'smoke', 'ui']
      };
      
      // Act
      const result = mapper.toCanonical(zephyrCase);
      
      // Assert
      expect(result.customFields).toHaveLength(3);
      expect(result.customFields![0]).toMatchObject({
        name: 'Component',
        value: 'Authentication',
        fieldType: 'STRING'
      });
      
      expect(result.tags).toHaveLength(3);
      expect(result.tags!.map(t => t.name)).toEqual(['regression', 'smoke', 'ui']);
    });
  });
  
  describe('fromCanonical', () => {
    it('should convert canonical test case to Zephyr format', () => {
      // Arrange
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        description: 'Test login functionality',
        preconditions: 'User exists in the system',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        folderPath: '/Project/Folder'
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalCase);
      
      // Assert
      expect(result).toMatchObject({
        name: 'Login Test',
        objective: 'Verify login works',
        description: 'Test login functionality',
        precondition: 'User exists in the system',
        status: 'APPROVED',
        priority: 'HIGH',
        folderPath: '/Project/Folder'
      });
    });
    
    it('should map test steps correctly', () => {
      // Arrange
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        testSteps: [
          {
            id: '1',
            order: 1,
            action: 'Enter username',
            expectedResult: 'Username is entered',
            data: 'testuser'
          },
          {
            id: '2',
            order: 2,
            action: 'Enter password',
            expectedResult: 'Password is entered',
            data: 'password123'
          }
        ]
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalCase);
      
      // Assert
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]).toMatchObject({
        id: '1',
        index: 1,
        description: 'Enter username',
        expectedResult: 'Username is entered',
        testData: 'testuser'
      });
    });
    
    it('should map tags and custom fields correctly', () => {
      // Arrange
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        tags: [
          { name: 'regression' },
          { name: 'smoke' },
          { name: 'ui' }
        ],
        customFields: [
          { name: 'Component', value: 'Authentication', fieldType: 'STRING' },
          { name: 'Feature', value: 'Login', fieldType: 'STRING' }
        ]
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalCase);
      
      // Assert
      expect(result.labels).toEqual(['regression', 'smoke', 'ui']);
      expect(result.customFields).toMatchObject({
        'Component': 'Authentication',
        'Feature': 'Login'
      });
    });
  });
  
  describe('validateMapping', () => {
    it('should validate mapping between Zephyr and canonical model', () => {
      // Arrange
      const zephyrCase = {
        id: '123',
        name: 'Login Test',
        steps: [
          { id: '1', index: 1, description: 'Step 1' },
          { id: '2', index: 2, description: 'Step 2' }
        ]
      };
      
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        testSteps: [
          { id: '1', order: 1, action: 'Step 1', expectedResult: '' },
          { id: '2', order: 2, action: 'Step 2', expectedResult: '' }
        ]
      };
      
      // Act
      const result = mapper.validateMapping(zephyrCase, canonicalCase);
      
      // Assert
      expect(result).toEqual([]);
    });
    
    it('should return validation messages for mismatched mapping', () => {
      // Arrange
      const zephyrCase = {
        id: '123',
        name: 'Login Test',
        steps: [
          { id: '1', index: 1, description: 'Step 1' },
          { id: '2', index: 2, description: 'Step 2' }
        ]
      };
      
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        testSteps: [
          { id: '1', order: 1, action: 'Step 1', expectedResult: '' }
        ]
      };
      
      // Act
      const result = mapper.validateMapping(zephyrCase, canonicalCase);
      
      // Assert
      expect(result).toContain('Step count mismatch: 2 in source, 1 in target');
    });
  });
});

describe('ZephyrTestExecutionMapper', () => {
  let mapper: ZephyrTestExecutionMapper;
  
  beforeEach(() => {
    mapper = new ZephyrTestExecutionMapper();
  });
  
  describe('toCanonical', () => {
    it('should convert Zephyr test execution to canonical form', () => {
      // Arrange
      const zephyrExecution = {
        id: '1234',
        testId: '456',
        status: 'PASSED',
        comment: 'Execution note',
        environment: 'Staging',
        executedOn: '2025-01-15T10:00:00Z',
        executedBy: 'tester1',
        cycleId: '789',
        timeSpentInSeconds: 120
      };
      
      // Act
      const result = mapper.toCanonical(zephyrExecution);
      
      // Assert
      expect(result).toMatchObject({
        id: '1234',
        testCaseId: '456',
        status: ExecutionStatus.PASSED,
        description: 'Execution note',
        environment: 'Staging',
        executedBy: {
          id: 'tester1',
          username: 'tester1'
        },
        executionTime: 120,
        testCycleId: '789'
      });
      
      // Check date parsing
      expect(result.startTime).toBeInstanceOf(Date);
    });
    
    it('should map step results correctly', () => {
      // Arrange
      const zephyrExecution = {
        id: '1234',
        testId: '456',
        status: 'PASSED',
        stepResults: [
          {
            stepId: '1',
            index: 1,
            status: 'PASSED',
            actualResult: 'User logged in successfully',
            comment: 'Step note'
          },
          {
            stepId: '2',
            index: 2,
            status: 'FAILED',
            actualResult: 'Error occurred',
            comment: 'Step failed'
          }
        ]
      };
      
      // Act
      const result = mapper.toCanonical(zephyrExecution);
      
      // Assert
      expect(result.stepResults).toHaveLength(2);
      expect(result.stepResults![0]).toMatchObject({
        stepId: '1',
        status: ExecutionStatus.PASSED,
        actualResult: 'User logged in successfully',
        notes: 'Step note',
        metadata: {
          sequence: 1
        }
      });
      expect(result.stepResults![1].status).toBe(ExecutionStatus.FAILED);
    });
  });
  
  describe('fromCanonical', () => {
    it('should convert canonical test execution to Zephyr format', () => {
      // Arrange
      const canonicalExecution: CanonicalTestExecution = {
        id: '1234',
        testCaseId: '456',
        status: ExecutionStatus.PASSED,
        description: 'Execution note',
        environment: 'Staging',
        startTime: new Date('2025-01-15T10:00:00Z'),
        executedBy: {
          id: 'tester1',
          username: 'tester1'
        },
        executionTime: 120,
        testCycleId: '789'
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalExecution);
      
      // Assert
      expect(result).toMatchObject({
        testId: '456',
        status: 'PASSED',
        comment: 'Execution note',
        environment: 'Staging',
        executedBy: 'tester1',
        timeSpentInSeconds: 120,
        cycleId: '789'
      });
      
      // Check date handling
      expect(result.executedOn).toBe(canonicalExecution.startTime.toISOString());
    });
    
    it('should map step results correctly', () => {
      // Arrange
      const canonicalExecution: CanonicalTestExecution = {
        id: '1234',
        testCaseId: '456',
        status: ExecutionStatus.PASSED,
        stepResults: [
          {
            stepId: '1',
            status: ExecutionStatus.PASSED,
            actualResult: 'User logged in successfully',
            notes: 'Step note',
            metadata: {
              sequence: 1
            }
          },
          {
            stepId: '2',
            status: ExecutionStatus.FAILED,
            actualResult: 'Error occurred',
            notes: 'Step failed',
            metadata: {
              sequence: 2
            }
          }
        ]
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalExecution);
      
      // Assert
      expect(result.stepResults).toHaveLength(2);
      expect(result.stepResults[0]).toMatchObject({
        stepId: '1',
        index: 1,
        status: 'PASSED',
        actualResult: 'User logged in successfully',
        comment: 'Step note'
      });
      expect(result.stepResults[1].status).toBe('FAILED');
    });
  });
});