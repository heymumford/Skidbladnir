/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationService } from '../../../packages/ui/src/services/TransformationService';
import { TransformationType } from '../../../packages/ui/src/components/Transformation/FieldTransformation';
import { FieldMapping } from '../../../packages/ui/src/types';

// Mock the transformationEngine
jest.mock('../../../packages/ui/src/services/TransformationEngine', () => {
  return {
    transformationEngine: {
      applyTransformation: jest.fn((sourceValue, type, params, sourceObject) => {
        // Simple implementation for testing
        if (type === TransformationType.UPPERCASE) {
          return String(sourceValue).toUpperCase();
        }
        if (type === TransformationType.LOWERCASE) {
          return String(sourceValue).toLowerCase();
        }
        return sourceValue;
      })
    }
  };
});

describe('TransformationService', () => {
  const service = new TransformationService();
  
  // Test data
  const testCase = {
    id: 'TC-123',
    name: 'Login Test',
    description: 'Verify login functionality',
    priority: 'HIGH',
    status: 'ACTIVE',
    labels: ['login', 'authentication']
  };
  
  describe('applyFieldTransformations', () => {
    it('should apply transformations to fields based on mappings', () => {
      const fieldMappings: FieldMapping[] = [
        // Direct mapping, no transformation
        { sourceId: 'id', targetId: 'externalId', transformation: null },
        
        // With transformation (uppercase)
        { 
          sourceId: 'name', 
          targetId: 'summary', 
          transformation: JSON.stringify({
            type: TransformationType.UPPERCASE,
            params: {}
          })
        },
        
        // With transformation (lowercase)
        { 
          sourceId: 'priority', 
          targetId: 'priorityLevel', 
          transformation: JSON.stringify({
            type: TransformationType.LOWERCASE,
            params: {}
          })
        }
      ];
      
      const result = service.applyFieldTransformations(testCase, fieldMappings);
      
      expect(result).toEqual({
        externalId: 'TC-123',
        summary: 'LOGIN TEST',
        priorityLevel: 'high'
      });
    });
    
    it('should handle invalid transformation JSON gracefully', () => {
      const fieldMappings: FieldMapping[] = [
        // With invalid transformation JSON
        { 
          sourceId: 'name', 
          targetId: 'summary', 
          transformation: '{invalid json'
        }
      ];
      
      const result = service.applyFieldTransformations(testCase, fieldMappings);
      
      // Should use direct mapping as fallback
      expect(result).toEqual({
        summary: 'Login Test'
      });
    });
  });
  
  describe('applyFieldTransformation', () => {
    it('should call the transformation engine with correct parameters', () => {
      const result = service.applyFieldTransformation(
        'name',
        'Test Value',
        TransformationType.UPPERCASE,
        {},
        testCase
      );
      
      expect(result).toBe('TEST VALUE');
    });
  });
  
  describe('generateTransformationPreview', () => {
    it('should call applyFieldTransformations with correct parameters', () => {
      // Spy on applyFieldTransformations
      const spy = jest.spyOn(service, 'applyFieldTransformations');
      
      const fieldMappings: FieldMapping[] = [
        { sourceId: 'id', targetId: 'externalId', transformation: null }
      ];
      
      service.generateTransformationPreview(testCase, fieldMappings);
      
      expect(spy).toHaveBeenCalledWith(testCase, fieldMappings);
      
      // Restore the spy
      spy.mockRestore();
    });
  });
});