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
  TransformTestCasesInput,
  TransformTestCasesResult as _TransformTestCasesResult,
  TransformationPort,
  TransformationConfigurationPort
} from '../../../../pkg/usecases/transformation/TransformTestCasesUseCase';
import { 
  CanonicalTestCase, 
  TestCaseStatus, 
  Priority, 
  TransformationError 
} from '../../../../pkg/domain/canonical';
import { LoggerService } from '../../../../pkg/interfaces/LoggerService';

// Mock logger
const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock transformation port
const mockTransformationPort: TransformationPort = {
  transformTestCase: jest.fn(),
  getCanonicalTestCase: jest.fn(),
  fromCanonicalTestCase: jest.fn(),
  validateTestCaseTransformation: jest.fn(),
  registerMappers: jest.fn()
};

// Mock transformation configuration port
const mockConfigurationPort: TransformationConfigurationPort = {
  getTransformationConfiguration: jest.fn(),
  saveTransformationConfiguration: jest.fn(),
  deleteTransformationConfiguration: jest.fn(),
  getDefaultConfiguration: jest.fn()
};

// Sample test data
const sampleTestCase = {
  id: '123',
  name: 'Test Login Functionality',
  summary: 'Verify that users can log in with valid credentials',
  priority: 'HIGH',
  status: 'ACTIVE'
};

const sampleCanonicalTestCase: CanonicalTestCase = {
  id: '123',
  name: 'Test Login Functionality',
  objective: 'Verify that users can log in with valid credentials',
  status: TestCaseStatus.READY,
  priority: Priority.HIGH
};

const sampleTransformedTestCase = {
  id: '123',
  title: 'Test Login Functionality',
  description: 'Verify that users can log in with valid credentials',
  priority: '1',
  status: 'ACTIVE'
};

describe('TransformTestCasesUseCase', () => {
  let useCase: TransformTestCasesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock implementation for transformation functions
    (mockTransformationPort.transformTestCase as jest.Mock).mockResolvedValue(sampleTransformedTestCase);
    (mockTransformationPort.getCanonicalTestCase as jest.Mock).mockReturnValue(sampleCanonicalTestCase);
    (mockTransformationPort.fromCanonicalTestCase as jest.Mock).mockReturnValue(sampleTransformedTestCase);
    (mockTransformationPort.validateTestCaseTransformation as jest.Mock).mockReturnValue([]);
    
    // Mock implementation for configuration functions
    (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
      id: 'config-1',
      name: 'Default configuration',
      sourceSystem: 'system-a',
      targetSystem: 'system-b',
      fieldMappings: { name: 'title', objective: 'description' },
      valueMappings: {}
    });
    
    useCase = new TransformTestCasesUseCase(
      mockTransformationPort,
      mockConfigurationPort,
      mockLogger
    );
  });

  describe('transformTestCase', () => {
    it('should transform a test case successfully', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Act
      const result = await useCase.transformTestCase(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCase).toEqual(sampleTransformedTestCase);
      expect(mockTransformationPort.transformTestCase).toHaveBeenCalledWith(
        sampleTestCase,
        'system-a',
        'system-b',
        expect.any(Object) // Configuration object
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors during transformation', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Mock error behavior
      const error = new TransformationError('Transformation failed');
      (mockTransformationPort.transformTestCase as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await useCase.transformTestCase(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transformation failed');
      expect(result.transformedTestCase).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use default configuration when not specified', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b'
        // No configurationId
      };

      const defaultConfig = {
        id: 'default-config',
        name: 'Default configuration',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: { name: 'title', objective: 'description' },
        valueMappings: {}
      };

      (mockConfigurationPort.getDefaultConfiguration as jest.Mock).mockResolvedValue(defaultConfig);

      // Act
      const result = await useCase.transformTestCase(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockConfigurationPort.getDefaultConfiguration).toHaveBeenCalledWith('system-a', 'system-b');
      expect(mockTransformationPort.transformTestCase).toHaveBeenCalledWith(
        sampleTestCase,
        'system-a',
        'system-b',
        defaultConfig
      );
    });

    it('should fail when configuration cannot be found', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'nonexistent-config'
      };

      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue(null);
      (mockConfigurationPort.getDefaultConfiguration as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await useCase.transformTestCase(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle validation issues during transformation', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      const validationMessages = ['Field X was not mapped correctly', 'Required field Y is missing'];
      (mockTransformationPort.validateTestCaseTransformation as jest.Mock).mockReturnValue(validationMessages);

      // Act
      const result = await useCase.transformTestCase(input);

      // Assert
      expect(result.success).toBe(true); // Still succeeds but with warnings
      expect(result.validationMessages).toEqual(validationMessages);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('transformMultipleTestCases', () => {
    it('should transform multiple test cases successfully', async () => {
      // Arrange
      const testCases = [
        { ...sampleTestCase, id: '1' },
        { ...sampleTestCase, id: '2' },
        { ...sampleTestCase, id: '3' }
      ];

      const input: TransformTestCasesInput = {
        testCases,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Mock different transformed results for each test case
      const transformedResults = [
        { ...sampleTransformedTestCase, id: '1' },
        { ...sampleTransformedTestCase, id: '2' },
        { ...sampleTransformedTestCase, id: '3' }
      ];

      // Set up mocks to return different values on each call
      (mockTransformationPort.transformTestCase as jest.Mock)
        .mockResolvedValueOnce(transformedResults[0])
        .mockResolvedValueOnce(transformedResults[1])
        .mockResolvedValueOnce(transformedResults[2]);

      // Act
      const result = await useCase.transformMultipleTestCases(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transformedTestCases).toHaveLength(3);
      expect(result.transformedTestCases).toEqual(transformedResults);
      expect(mockTransformationPort.transformTestCase).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in some test cases during batch transformation', async () => {
      // Arrange
      const testCases = [
        { ...sampleTestCase, id: '1' },
        { ...sampleTestCase, id: '2' }, // This one will fail
        { ...sampleTestCase, id: '3' }
      ];

      const input: TransformTestCasesInput = {
        testCases,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Mock success for first and third case, error for second
      (mockTransformationPort.transformTestCase as jest.Mock)
        .mockResolvedValueOnce({ ...sampleTransformedTestCase, id: '1' })
        .mockRejectedValueOnce(new TransformationError('Error in test case 2'))
        .mockResolvedValueOnce({ ...sampleTransformedTestCase, id: '3' });

      // Act
      const result = await useCase.transformMultipleTestCases(input);

      // Assert
      expect(result.success).toBe(true); // Overall still succeeds
      expect(result.transformedTestCases).toHaveLength(2); // Only 2 successful transformations
      expect(result.failedTestCases).toHaveLength(1);
      expect(result.failedTestCases?.[0].testCaseId).toBe('2');
      expect(result.failedTestCases?.[0].error).toContain('Error in test case 2');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return overall failure when all transformations fail', async () => {
      // Arrange
      const testCases = [
        { ...sampleTestCase, id: '1' },
        { ...sampleTestCase, id: '2' }
      ];

      const input: TransformTestCasesInput = {
        testCases,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // All transformations fail
      (mockTransformationPort.transformTestCase as jest.Mock)
        .mockRejectedValue(new TransformationError('Transformation failed'));

      // Act
      const result = await useCase.transformMultipleTestCases(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('All transformations failed');
      expect(result.transformedTestCases).toHaveLength(0);
      expect(result.failedTestCases).toHaveLength(2);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('previewTransformation', () => {
    it('should preview a transformation successfully', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Act
      const result = await useCase.previewTransformation(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sourceTestCase).toEqual(sampleTestCase);
      expect(result.canonicalTestCase).toEqual(sampleCanonicalTestCase);
      expect(result.targetTestCase).toEqual(sampleTransformedTestCase);
      expect(mockTransformationPort.getCanonicalTestCase).toHaveBeenCalled();
      expect(mockTransformationPort.fromCanonicalTestCase).toHaveBeenCalled();
    });

    it('should handle errors during preview', async () => {
      // Arrange
      const input: TransformTestCasesInput = {
        testCase: sampleTestCase,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };

      // Mock error in canonical conversion
      const error = new TransformationError('Cannot convert to canonical form');
      (mockTransformationPort.getCanonicalTestCase as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await useCase.previewTransformation(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot convert to canonical form');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});