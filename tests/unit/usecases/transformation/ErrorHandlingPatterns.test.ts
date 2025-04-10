/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  TransformationError, 
  Transformer 
} from '../../../../pkg/domain/canonical';
import { 
  TransformTestCasesUseCase,
  TransformationPort,
  TransformationConfigurationPort,
  TransformationPortAdapter
} from '../../../../pkg/usecases/transformation/TransformTestCasesUseCase';
import { LoggerService } from '../../../../pkg/interfaces/LoggerService';

// Mock logger
const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock transformer
const mockTransformer = {
  transform: jest.fn(),
  getCanonicalForm: jest.fn(),
  fromCanonicalForm: jest.fn(),
  getTranslations: jest.fn(),
  clearTranslations: jest.fn()
} as unknown as Transformer;

// Mock configuration port
const mockConfigurationPort: TransformationConfigurationPort = {
  getTransformationConfiguration: jest.fn(),
  saveTransformationConfiguration: jest.fn(),
  deleteTransformationConfiguration: jest.fn(),
  getDefaultConfiguration: jest.fn()
};

describe('Error Handling Patterns', () => {
  let adapter: TransformationPort;
  let useCase: TransformTestCasesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    adapter = new TransformationPortAdapter(mockTransformer, mockLogger);
    useCase = new TransformTestCasesUseCase(adapter, mockConfigurationPort, mockLogger);
  });
  
  describe('Error propagation', () => {
    it('should encapsulate domain errors without exposing implementation details', async () => {
      // Arrange
      const input = {
        testCase: { id: '123', name: 'Test Case' },
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };
      
      // Set up mock configuration
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      // Mock domain error with implementation details
      const domainError = new TransformationError('Transformation failed', {
        internalCode: 'ERR-1234',
        stackTrace: 'at Object.transform (/src/transformer.ts:123)',
        dbError: 'Connection pool exhausted',
        sensitiveData: 'API key expired'
      });
      
      // Make transformer throw the domain error
      (mockTransformer.transform as jest.Mock).mockRejectedValue(domainError);
      
      // Act
      const result = await useCase.transformTestCase(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transformation failed');
      
      // Error should not expose internal details
      expect(result.error).not.toContain('ERR-1234');
      expect(result.error).not.toContain('stackTrace');
      expect(result.error).not.toContain('Connection pool');
      expect(result.error).not.toContain('API key');
      
      // Logger should capture the full error
      expect(mockLogger.error).toHaveBeenCalled();
      expect((mockLogger.error as jest.Mock).mock.calls[0][0]).toContain('Transformation failed');
      expect((mockLogger.error as jest.Mock).mock.calls[0][1]).toHaveProperty('error');
    });
    
    it('should return structured errors that follow consistent patterns', async () => {
      // Arrange
      const input = {
        testCase: { id: '123', name: 'Test Case' },
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'invalid-id'
      };
      
      // Set up configuration to return null (not found)
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue(null);
      (mockConfigurationPort.getDefaultConfiguration as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await useCase.transformTestCase(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/^Configuration not found/);  // Error message follows consistent pattern
      expect(result.transformedTestCase).toBeUndefined();  // No partial results
      
      // Check that errors are properly logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    it('should provide detailed error context for complex operations', async () => {
      // Arrange
      const testCases = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
        { id: '3', name: 'Test 3' }
      ];
      
      const input = {
        testCases,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };
      
      // Set up mock configuration
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      // Mock errors for specific test cases
      (mockTransformer.transform as jest.Mock)
        .mockResolvedValueOnce({ id: '1', title: 'Test 1' })
        .mockRejectedValueOnce(new TransformationError('Invalid field mapping for priority'))
        .mockRejectedValueOnce(new TransformationError('Target system rejected test case'));
      
      // Act
      const result = await useCase.transformMultipleTestCases(input);
      
      // Assert
      expect(result.success).toBe(true);  // Partial success
      expect(result.transformedTestCases).toHaveLength(1);
      expect(result.failedTestCases).toHaveLength(2);
      
      // Check that the errors contain the test case ID for context
      expect(result.failedTestCases![0].testCaseId).toBe('2');
      expect(result.failedTestCases![0].error).toContain('Invalid field mapping');
      
      expect(result.failedTestCases![1].testCaseId).toBe('3');
      expect(result.failedTestCases![1].error).toContain('Target system rejected');
      
      // Check that errors are properly logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
  
  describe('Recovery mechanisms', () => {
    it('should handle partial success in batch operations', async () => {
      // Arrange
      const testCases = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
        { id: '3', name: 'Test 3' }
      ];
      
      const input = {
        testCases,
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };
      
      // Set up mock configuration
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      // Mock failures for some test cases but not all
      (mockTransformer.transform as jest.Mock)
        .mockResolvedValueOnce({ id: '1', title: 'Test 1' })
        .mockRejectedValueOnce(new TransformationError('Error in test case 2'))
        .mockResolvedValueOnce({ id: '3', title: 'Test 3' });
      
      // Act
      const result = await useCase.transformMultipleTestCases(input);
      
      // Assert
      expect(result.success).toBe(true);  // Overall success with partial failures
      expect(result.transformedTestCases).toHaveLength(2);
      expect(result.transformedTestCases![0].id).toBe('1');
      expect(result.transformedTestCases![1].id).toBe('3');
      expect(result.failedTestCases).toHaveLength(1);
      expect(result.failedTestCases![0].testCaseId).toBe('2');
      
      // Validation that processing continues after failures
      expect(mockTransformer.transform).toHaveBeenCalledTimes(3);
    });
    
    it('should validate data and provide warnings without failing the operation', async () => {
      // Arrange
      const input = {
        testCase: { id: '123', name: 'Test Case' },
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };
      
      // Set up mock configuration
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      // Mock successful transformation with validation warnings
      (mockTransformer.transform as jest.Mock).mockResolvedValue({ id: '123', title: 'Test Case' });
      
      // Mock validation warnings
      (mockTransformer.getTranslations as jest.Mock).mockReturnValue(new Map([
        ['system-a:system-b:test-case:123', {
          status: 'partial',
          messages: ['Field "priority" was not mapped', 'Attachment links may not be preserved']
        }]
      ]));
      
      // Act
      const result = await useCase.transformTestCase(input);
      
      // Assert
      expect(result.success).toBe(true);  // Operation succeeds despite warnings
      expect(result.transformedTestCase).toBeDefined();
      expect(result.validationMessages).toBeDefined();
      expect(result.validationMessages).toContain('Field "priority" was not mapped');
      
      // Warnings should be logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
  
  describe('Consistent error handling patterns', () => {
    it('should follow the same error format across all operations', async () => {
      // Arrange - multiple different operations
      const transformInput = {
        testCase: { id: '1', name: 'Test 1' },
        sourceSystem: 'system-a', 
        targetSystem: 'system-b',
        configurationId: 'invalid-id'
      };
      
      const previewInput = {
        testCase: { id: '2', name: 'Test 2' },
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'invalid-id'
      };
      
      const batchInput = {
        testCases: [{ id: '3', name: 'Test 3' }],
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'invalid-id'
      };
      
      // Mock configuration not found for all operations
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue(null);
      (mockConfigurationPort.getDefaultConfiguration as jest.Mock).mockResolvedValue(null);
      
      // Act - execute all three operations
      const transformResult = await useCase.transformTestCase(transformInput);
      const previewResult = await useCase.previewTransformation(previewInput);
      const batchResult = await useCase.transformMultipleTestCases(batchInput);
      
      // Assert - all results should follow the same error pattern
      expect(transformResult.success).toBe(false);
      expect(previewResult.success).toBe(false);
      expect(batchResult.success).toBe(false);
      
      // Error messages should follow a consistent format
      expect(transformResult.error).toMatch(/^Configuration not found/);
      expect(previewResult.error).toMatch(/^Configuration not found/);
      expect(batchResult.error).toMatch(/^Configuration not found/);
      
      // All should have undefined results rather than null
      expect(transformResult.transformedTestCase).toBeUndefined();
      expect(previewResult.canonicalTestCase).toBeUndefined();
      expect(batchResult.transformedTestCases).toEqual([]);
    });
    
    it('should use appropriate error levels based on severity', async () => {
      // Arrange
      const input = {
        testCase: { id: '123', name: 'Test Case' },
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        configurationId: 'config-1'
      };
      
      // Set up mock configuration
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      // Set up three different scenarios
      
      // 1. Information-level message (configuration fallback)
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock)
        .mockResolvedValueOnce(null) // First call returns null to trigger fallback
        .mockImplementation((id) => Promise.resolve({
          id,
          sourceSystem: 'system-a',
          targetSystem: 'system-b',
          fieldMappings: {}
        }));
      
      (mockConfigurationPort.getDefaultConfiguration as jest.Mock).mockResolvedValue({
        id: 'default-config',
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        fieldMappings: {}
      });
      
      (mockTransformer.transform as jest.Mock).mockResolvedValue({ id: '123', title: 'Test Case' });
      
      // Act - first scenario (info)
      await useCase.transformTestCase({...input, configurationId: 'missing-config'});
      
      // 2. Warning-level message (field mapping issues but successful transformation)
      // Reset mocks
      jest.clearAllMocks();
      (mockConfigurationPort.getTransformationConfiguration as jest.Mock).mockResolvedValue({
        id: 'config-1',
        sourceSystem: 'system-a',
        targetSystem: 'system-b', 
        fieldMappings: {}
      });
      
      // Set up validation warnings
      const warningTranslation = {
        sourceSystem: 'system-a',
        targetSystem: 'system-b',
        entityType: 'test-case',
        sourceId: '123',
        targetId: '123',
        status: 'partial',
        timestamp: new Date(),
        messages: ['Field mapping warning'],
        migrationId: undefined
      };
      
      (mockTransformer.getTranslations as jest.Mock).mockReturnValue(new Map([
        ['system-a:system-b:test-case:123', warningTranslation]
      ]));
      
      // Act - second scenario (warning)
      await useCase.transformTestCase(input);
      
      // 3. Error-level message (transformation failure)
      jest.clearAllMocks();
      (mockTransformer.transform as jest.Mock).mockRejectedValue(
        new TransformationError('Critical error occurred')
      );
      
      // Act - third scenario (error)
      await useCase.transformTestCase(input);
      
      // Assert - check appropriate log levels were used
      expect(mockLogger.info).toHaveBeenCalled(); // Info for config fallback
      expect(mockLogger.warn).toHaveBeenCalled(); // Warning for field validation
      expect(mockLogger.error).toHaveBeenCalled(); // Error for transformation failure
    });
  });
});