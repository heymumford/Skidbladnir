/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  QTestTestCaseMapper, 
  QTestTestExecutionMapper 
} from '../../../../../pkg/domain/canonical/mappers/QTestMapper';
import {
  CanonicalTestCase,
  TestCaseStatus,
  Priority,
  ExecutionStatus
} from '../../../../../pkg/domain/canonical/CanonicalModels';

describe('QTestTestCaseMapper', () => {
  let mapper: QTestTestCaseMapper;
  
  beforeEach(() => {
    mapper = new QTestTestCaseMapper();
  });
  
  describe('toCanonical', () => {
    it('should convert basic qTest test case to canonical form', () => {
      // Arrange
      const qtestCase = {
        id: 123,
        name: 'Login Test',
        description: 'Test login functionality',
        properties: [
          { field_name: 'Objective', field_value: 'Verify login works' },
          { field_name: 'Precondition', field_value: 'User exists in the system' },
          { field_name: 'Status', field_value: '3' }, // APPROVED
          { field_name: 'Priority', field_value: '2' } // HIGH
        ]
      };
      
      // Act
      const result = mapper.toCanonical(qtestCase);
      
      // Assert
      expect(result).toMatchObject({
        id: '123',
        name: 'Login Test',
        description: 'Test login functionality',
        objective: 'Verify login works',
        preconditions: 'User exists in the system',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        sourceSystem: 'qtest'
      });
    });
    
    it('should map test steps correctly', () => {
      // Arrange
      const qtestCase = {
        id: 123,
        name: 'Login Test',
        test_steps: [
          { 
            id: 1, 
            order: 1, 
            description: 'Enter username', 
            expected_result: 'Username is entered',
            test_data: 'testuser'
          },
          { 
            id: 2, 
            order: 2, 
            description: 'Enter password', 
            expected_result: 'Password is entered',
            test_data: 'password123'
          }
        ]
      };
      
      // Act
      const result = mapper.toCanonical(qtestCase);
      
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
  });
  
  describe('fromCanonical', () => {
    it('should convert canonical test case to qTest format', () => {
      // Arrange
      const canonicalCase: CanonicalTestCase = {
        id: '123',
        name: 'Login Test',
        objective: 'Verify login works',
        description: 'Test login functionality',
        preconditions: 'User exists in the system',
        status: TestCaseStatus.APPROVED,
        priority: Priority.HIGH,
        folderPath: '456'
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalCase);
      
      // Assert
      expect(result).toMatchObject({
        name: 'Login Test',
        description: 'Test login functionality',
        parent_id: 456,
        properties: expect.arrayContaining([
          { field_name: 'Objective', field_value: 'Verify login works' },
          { field_name: 'Precondition', field_value: 'User exists in the system' },
          { field_name: 'Status', field_value: '3' }, // APPROVED
          { field_name: 'Priority', field_value: '2' } // HIGH
        ])
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
      expect(result.test_steps).toHaveLength(2);
      expect(result.test_steps[0]).toMatchObject({
        id: '1',
        order: 1,
        description: 'Enter username',
        expected_result: 'Username is entered',
        test_data: 'testuser'
      });
    });
  });
  
  describe('validateMapping', () => {
    it('should validate mapping between qTest and canonical model', () => {
      // Arrange
      const qtestCase = {
        id: 123,
        name: 'Login Test',
        test_steps: [
          { id: 1, order: 1, description: 'Step 1' },
          { id: 2, order: 2, description: 'Step 2' }
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
      const result = mapper.validateMapping(qtestCase, canonicalCase);
      
      // Assert
      expect(result).toEqual([]);
    });
    
    it('should return validation messages for mismatched mapping', () => {
      // Arrange
      const qtestCase = {
        id: 123,
        name: 'Login Test',
        test_steps: [
          { id: 1, order: 1, description: 'Step 1' },
          { id: 2, order: 2, description: 'Step 2' }
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
      const result = mapper.validateMapping(qtestCase, canonicalCase);
      
      // Assert
      expect(result).toContain('Step count mismatch: 2 in source, 1 in target');
    });
  });
});

describe('QTestTestExecutionMapper', () => {
  let mapper: QTestTestExecutionMapper;
  
  beforeEach(() => {
    mapper = new QTestTestExecutionMapper();
  });
  
  describe('toCanonical', () => {
    it('should convert qTest test execution to canonical form', () => {
      // Arrange
      const qtestExecution = {
        test_run: {
          id: 123,
          test_case: { id: 456 },
          test_cycle: { id: 789 }
        },
        test_log: {
          id: 1234,
          status: { name: 'PASSED' },
          note: 'Execution note',
          execution_date: '2025-01-15T10:00:00Z',
          executed_by: 'tester1',
          execution_time_seconds: 120
        }
      };
      
      // Act
      const result = mapper.toCanonical(qtestExecution);
      
      // Assert
      expect(result).toMatchObject({
        id: '1234',
        testCaseId: '456',
        status: ExecutionStatus.PASSED,
        description: 'Execution note',
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
      const qtestExecution = {
        test_run: {
          id: 123,
          test_case: { id: 456 }
        },
        test_log: {
          id: 1234,
          status: { name: 'PASSED' },
          test_step_logs: [
            {
              test_step_id: 1,
              order: 1,
              status: { name: 'PASSED' },
              actual_result: 'User logged in successfully',
              note: 'Step note'
            },
            {
              test_step_id: 2,
              order: 2,
              status: { name: 'FAILED' },
              actual_result: 'Error occurred',
              note: 'Step failed'
            }
          ]
        }
      };
      
      // Act
      const result = mapper.toCanonical(qtestExecution);
      
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
    it('should convert canonical test execution to qTest format', () => {
      // Arrange
      const canonicalExecution = {
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
        executionTime: 120
      };
      
      // Act
      const result = mapper.fromCanonical(canonicalExecution);
      
      // Assert
      expect(result).toMatchObject({
        status: {
          name: 'PASSED'
        },
        note: 'Execution note',
        executed_by: 'tester1',
        execution_time_seconds: 120,
        test_case_id: '456',
        properties: [
          {
            field_name: 'Environment',
            field_value: 'Staging'
          }
        ]
      });
      
      // Check date handling
      expect(result.execution_date).toBe(canonicalExecution.startTime.toISOString());
    });
    
    it('should map step results correctly', () => {
      // Arrange
      const canonicalExecution = {
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
      expect(result.test_step_logs).toHaveLength(2);
      expect(result.test_step_logs[0]).toMatchObject({
        test_step_id: '1',
        order: 1,
        status: {
          name: 'PASSED'
        },
        actual_result: 'User logged in successfully',
        note: 'Step note'
      });
      expect(result.test_step_logs[1].status.name).toBe('FAILED');
    });
  });
});