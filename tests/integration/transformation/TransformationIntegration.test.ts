/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  TransformTestCasesUseCase,
  TransformationPortAdapter
} from '../../../pkg/usecases/transformation/TransformTestCasesUseCase';
import { InMemoryTransformationConfigurationRepository } from '../../../pkg/infrastructure/persistence/TransformationConfigurationRepository';
import { Transformer } from '../../../pkg/domain/canonical';
import { QTestTestCaseMapper } from '../../../pkg/domain/canonical/mappers/QTestMapper';
import { ZephyrTestCaseMapper } from '../../../pkg/domain/canonical/mappers/ZephyrMapper';
import { LoggerService } from '../../../pkg/interfaces/LoggerService';
import { mapperRegistry } from '../../../pkg/domain/canonical/BaseMapper';

// Mock logger
const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Register mappers for integration tests
function registerTestMappers() {
  // Clear existing mappers to avoid conflicts
  (mapperRegistry as any).mappers = new Map();
  
  // Register mappers manually
  mapperRegistry.register('qtest', 'test-case', new QTestTestCaseMapper());
  mapperRegistry.register('zephyr', 'test-case', new ZephyrTestCaseMapper());
}

describe('Transformation Integration Tests', () => {
  let transformer: Transformer;
  let adapter: TransformationPortAdapter;
  let repository: InMemoryTransformationConfigurationRepository;
  let useCase: TransformTestCasesUseCase;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Register mappers
    registerTestMappers();
    
    // Create domain service
    transformer = new Transformer(mockLogger);
    
    // Create adapter
    adapter = new TransformationPortAdapter(transformer, mockLogger);
    
    // Create repository
    repository = new InMemoryTransformationConfigurationRepository(mockLogger);
    
    // Create use case
    useCase = new TransformTestCasesUseCase(adapter, repository, mockLogger);
  });
  
  describe('qTest to Zephyr transformation', () => {
    it('should transform a qTest test case to Zephyr format', async () => {
      // Arrange
      const qtestTestCase = {
        id: '123',
        name: 'Login Test',
        description: 'Test login functionality',
        properties: [
          { field_name: 'Objective', field_value: 'Verify login functionality' },
          { field_name: 'Precondition', field_value: 'User exists in the system' },
          { field_name: 'Status', field_value: '3' }, // Approved
          { field_name: 'Priority', field_value: '2' } // High
        ],
        test_steps: [
          {
            id: 'step1',
            order: 1,
            description: 'Enter username',
            expected_result: 'Username field is filled'
          },
          {
            id: 'step2',
            order: 2,
            description: 'Enter password',
            expected_result: 'Password field is filled'
          },
          {
            id: 'step3',
            order: 3,
            description: 'Click login button',
            expected_result: 'User is logged in successfully'
          }
        ]
      };
      
      // Act
      const result = await useCase.transformTestCase({
        testCase: qtestTestCase,
        sourceSystem: 'qtest',
        targetSystem: 'zephyr'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCase).toBeDefined();
      
      // Verify basic properties were mapped correctly
      const zephyrTestCase = result.transformedTestCase!;
      expect(zephyrTestCase.name).toBe('Login Test');
      expect(zephyrTestCase.description).toBe('Test login functionality');
      expect(zephyrTestCase.objective).toBe('Verify login functionality');
      expect(zephyrTestCase.precondition).toBe('User exists in the system');
      expect(zephyrTestCase.status).toBe('APPROVED');
      expect(zephyrTestCase.priority).toBe('HIGH');
      
      // Verify steps were mapped correctly
      expect(zephyrTestCase.steps).toHaveLength(3);
      expect(zephyrTestCase.steps[0].description).toBe('Enter username');
      expect(zephyrTestCase.steps[0].expectedResult).toBe('Username field is filled');
    });
    
    it('should handle a qTest test case with missing fields', async () => {
      // Arrange - minimal test case
      const minimalTestCase = {
        id: '456',
        name: 'Minimal Test'
        // No other fields
      };
      
      // Act
      const result = await useCase.transformTestCase({
        testCase: minimalTestCase,
        sourceSystem: 'qtest',
        targetSystem: 'zephyr'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCase).toBeDefined();
      
      // Should have defaults for missing fields
      const zephyrTestCase = result.transformedTestCase!;
      expect(zephyrTestCase.name).toBe('Minimal Test');
      expect(zephyrTestCase.description).toBe('');
      expect(zephyrTestCase.status).toBe('DRAFT'); // Default status
      expect(zephyrTestCase.priority).toBe('MEDIUM'); // Default priority
    });
  });
  
  describe('Zephyr to qTest transformation', () => {
    it('should transform a Zephyr test case to qTest format', async () => {
      // Arrange
      const zephyrTestCase = {
        id: '789',
        name: 'Registration Test',
        description: 'Test user registration',
        objective: 'Verify user registration process',
        precondition: 'Email address is not already registered',
        status: 'APPROVED',
        priority: 'HIGH',
        steps: [
          {
            id: 'z-step1',
            index: 1,
            description: 'Enter email address',
            expectedResult: 'Email is validated'
          },
          {
            id: 'z-step2',
            index: 2,
            description: 'Enter password',
            expectedResult: 'Password meets complexity requirements'
          },
          {
            id: 'z-step3',
            index: 3,
            description: 'Confirm password',
            expectedResult: 'Passwords match'
          },
          {
            id: 'z-step4',
            index: 4,
            description: 'Click register button',
            expectedResult: 'Account is created successfully'
          }
        ]
      };
      
      // Act
      const result = await useCase.transformTestCase({
        testCase: zephyrTestCase,
        sourceSystem: 'zephyr',
        targetSystem: 'qtest'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCase).toBeDefined();
      
      // Verify basic properties were mapped correctly
      const qtestTestCase = result.transformedTestCase!;
      expect(qtestTestCase.name).toBe('Registration Test');
      expect(qtestTestCase.description).toBe('Test user registration');
      
      // Verify properties array contains the expected values
      const properties = qtestTestCase.properties;
      expect(properties).toBeDefined();
      expect(properties).toContainEqual({
        field_name: 'Objective',
        field_value: 'Verify user registration process'
      });
      expect(properties).toContainEqual({
        field_name: 'Precondition',
        field_value: 'Email address is not already registered'
      });
      expect(properties).toContainEqual({
        field_name: 'Status',
        field_value: '3'  // APPROVED
      });
      expect(properties).toContainEqual({
        field_name: 'Priority',
        field_value: '2'  // HIGH
      });
      
      // Verify steps were mapped correctly
      expect(qtestTestCase.test_steps).toHaveLength(4);
      expect(qtestTestCase.test_steps[0].description).toBe('Enter email address');
      expect(qtestTestCase.test_steps[0].expected_result).toBe('Email is validated');
    });
  });
  
  describe('Transformation Preview', () => {
    it('should generate a preview of the transformation', async () => {
      // Arrange
      const qtestTestCase = {
        id: 'preview-123',
        name: 'Preview Test',
        description: 'Test with preview',
        properties: [
          { field_name: 'Objective', field_value: 'Preview transformation' },
          { field_name: 'Status', field_value: '5' }, // Ready
          { field_name: 'Priority', field_value: '3' } // Medium
        ]
      };
      
      // Act
      const result = await useCase.previewTransformation({
        testCase: qtestTestCase,
        sourceSystem: 'qtest',
        targetSystem: 'zephyr'
      });
      
      // Assert
      expect(result.success).toBe(true);
      
      // Should include all three forms
      expect(result.sourceTestCase).toEqual(qtestTestCase);
      expect(result.canonicalTestCase).toBeDefined();
      expect(result.targetTestCase).toBeDefined();
      
      // Verify canonical form
      const canonical = result.canonicalTestCase!;
      expect(canonical.name).toBe('Preview Test');
      expect(canonical.objective).toBe('Preview transformation');
      
      // Verify target form
      const target = result.targetTestCase!;
      expect(target.name).toBe('Preview Test');
      expect(target.objective).toBe('Preview transformation');
      expect(target.status).toBe('READY'); // Mapped from qTest '5'
      expect(target.priority).toBe('MEDIUM'); // Mapped from qTest '3'
    });
  });
  
  describe('Batch Transformation', () => {
    it('should transform multiple test cases in batch', async () => {
      // Arrange
      const testCases = [
        {
          id: 'batch-1',
          name: 'Batch Test 1',
          properties: [{ field_name: 'Status', field_value: '1' }] // Draft
        },
        {
          id: 'batch-2',
          name: 'Batch Test 2',
          properties: [{ field_name: 'Status', field_value: '3' }] // Approved
        },
        {
          id: 'batch-3',
          name: 'Batch Test 3',
          properties: [{ field_name: 'Status', field_value: '6' }] // Deprecated
        }
      ];
      
      // Act
      const result = await useCase.transformMultipleTestCases({
        testCases,
        sourceSystem: 'qtest',
        targetSystem: 'zephyr'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCases).toHaveLength(3);
      
      // Verify statuses were mapped correctly
      expect(result.transformedTestCases![0].status).toBe('DRAFT');
      expect(result.transformedTestCases![1].status).toBe('APPROVED');
      expect(result.transformedTestCases![2].status).toBe('DEPRECATED');
    });
    
    it('should handle partial failures in batch transformation', async () => {
      // Arrange - create a test case that will cause an error
      const validTestCase1 = {
        id: 'valid-1',
        name: 'Valid Test 1'
      };
      
      // This will cause an error during transformation in the transformer mock
      const invalidTestCase = {
        id: 'invalid',
        name: null // This will cause an error
      };
      
      const validTestCase2 = {
        id: 'valid-2',
        name: 'Valid Test 2'
      };
      
      const testCases = [validTestCase1, invalidTestCase, validTestCase2];
      
      // Create a spy on the transform method that throws an error for the invalid test case
      jest.spyOn(transformer, 'transform').mockImplementation((sourceSys, targetSys, entityType, data, context) => {
        if (data.id === 'invalid') {
          throw new Error('Invalid test case');
        }
        
        // For valid test cases, return a simple transformed result
        if (data.id === 'valid-1' || data.id === 'valid-2') {
          return {
            id: data.id,
            name: data.name,
            status: 'DRAFT',
            priority: 'MEDIUM'
          };
        }
        
        // Default implementation
        return {
          id: data.id || 'unknown',
          name: data.name || 'unknown'
        };
      });
      
      // Act
      const result = await useCase.transformMultipleTestCases({
        testCases,
        sourceSystem: 'qtest',
        targetSystem: 'zephyr'
      });
      
      // Assert
      expect(result.success).toBe(true); // Partial success
      expect(result.transformedTestCases).toHaveLength(2);
      expect(result.failedTestCases).toHaveLength(1);
      expect(result.failedTestCases![0].testCaseId).toBe('invalid');
      
      // Verify the valid test cases were transformed
      expect(result.transformedTestCases![0].id).toBe('valid-1');
      expect(result.transformedTestCases![1].id).toBe('valid-2');
    });
  });
});