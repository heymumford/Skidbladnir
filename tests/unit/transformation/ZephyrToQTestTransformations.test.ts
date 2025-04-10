/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationEngine } from '../../../packages/ui/src/services/TransformationEngine';
import { TransformationService } from '../../../packages/ui/src/services/TransformationService';
import { TransformationType } from '../../../packages/ui/src/components/Transformation/FieldTransformation';
import { FieldMapping } from '../../../packages/ui/src/types';

describe('Zephyr to qTest Transformations', () => {
  const engine = new TransformationEngine();
  const service = new TransformationService();
  
  // Sample Zephyr test case
  const zephyrTestCase = {
    id: 'ZEP-123',
    key: 'ZEP-123',
    name: 'Login Authentication Test',
    objective: 'Verify user can log in with valid credentials',
    description: 'This test case validates the authentication flow for regular users.',
    component: 'Authentication',
    priority: 'HIGH',
    status: 'ACTIVE',
    labels: ['login', 'authentication', 'security'],
    owner: 'jsmith',
    createdBy: 'jdoe',
    createdOn: '2025-01-15T10:00:00Z',
    updatedOn: '2025-01-20T15:30:00Z',
    precondition: 'User account exists in the system.',
    steps: [
      {
        id: 'step-1',
        index: 1,
        description: 'Navigate to login page',
        expectedResult: 'Login page is displayed'
      },
      {
        id: 'step-2',
        index: 2,
        description: 'Enter valid username and password',
        expectedResult: 'Credentials are accepted'
      },
      {
        id: 'step-3',
        index: 3,
        description: 'Click login button',
        expectedResult: 'User is redirected to dashboard'
      }
    ],
    testData: 'username=testuser; password=Password123'
  };
  
  // Common transformation mappings for Zephyr to qTest
  const commonMappings: FieldMapping[] = [
    // Direct mappings
    { sourceId: 'name', targetId: 'name', transformation: null },
    { sourceId: 'description', targetId: 'description', transformation: null },
    { sourceId: 'steps', targetId: 'testSteps', transformation: null },
    
    // Status mapping with value transformation
    { 
      sourceId: 'status', 
      targetId: 'status', 
      transformation: JSON.stringify({
        type: TransformationType.MAP_VALUES,
        params: {
          mappings: {
            'ACTIVE': 'Ready',
            'DRAFT': 'Draft',
            'DEPRECATED': 'Deprecated'
          }
        }
      })
    },
    
    // Priority mapping with value transformation
    { 
      sourceId: 'priority', 
      targetId: 'priority', 
      transformation: JSON.stringify({
        type: TransformationType.MAP_VALUES,
        params: {
          mappings: {
            'HIGH': 'P1',
            'MEDIUM': 'P2',
            'LOW': 'P3'
          }
        }
      })
    },
    
    // Combine fields into a single field
    { 
      sourceId: 'name', 
      targetId: 'summary', 
      transformation: JSON.stringify({
        type: TransformationType.CONCAT,
        params: {
          separator: ' - ',
          fields: ['key', 'name']
        }
      })
    },
    
    // Transform labels to tags
    { 
      sourceId: 'labels', 
      targetId: 'tags', 
      transformation: JSON.stringify({
        type: TransformationType.JOIN,
        params: {
          separator: ', ',
          fields: ['labels']
        }
      })
    }
  ];
  
  describe('Field-by-field Zephyr to qTest transformations', () => {
    it('should map status values correctly', () => {
      const mapping = commonMappings.find(m => m.sourceId === 'status' && m.targetId === 'status')!;
      const config = JSON.parse(mapping.transformation!);
      
      const result = engine.applyTransformation(
        'ACTIVE',
        config.type as TransformationType,
        config.params,
        zephyrTestCase
      );
      
      expect(result).toBe('Ready');
    });
    
    it('should map priority values correctly', () => {
      const mapping = commonMappings.find(m => m.sourceId === 'priority' && m.targetId === 'priority')!;
      const config = JSON.parse(mapping.transformation!);
      
      const result = engine.applyTransformation(
        'HIGH',
        config.type as TransformationType,
        config.params,
        zephyrTestCase
      );
      
      expect(result).toBe('P1');
    });
    
    it('should concatenate key and name for summary', () => {
      const mapping = commonMappings.find(m => m.sourceId === 'name' && m.targetId === 'summary')!;
      const config = JSON.parse(mapping.transformation!);
      
      const result = engine.applyTransformation(
        zephyrTestCase.name,
        config.type as TransformationType,
        config.params,
        zephyrTestCase
      );
      
      expect(result).toBe('ZEP-123 - Login Authentication Test');
    });
    
    it('should join labels into a comma-separated string for tags', () => {
      const mapping = commonMappings.find(m => m.sourceId === 'labels' && m.targetId === 'tags')!;
      const config = JSON.parse(mapping.transformation!);
      
      const result = engine.applyTransformation(
        zephyrTestCase.labels,
        config.type as TransformationType,
        config.params,
        zephyrTestCase
      );
      
      expect(result).toBe('login, authentication, security');
    });
  });
  
  describe('Complete test case transformation', () => {
    it('should apply all transformations to produce a complete qTest test case', () => {
      const transformedTestCase = service.applyFieldTransformations(
        zephyrTestCase,
        commonMappings
      );
      
      expect(transformedTestCase).toMatchObject({
        name: 'Login Authentication Test',
        description: 'This test case validates the authentication flow for regular users.',
        status: 'Ready',
        priority: 'P1',
        summary: 'ZEP-123 - Login Authentication Test',
        tags: 'login, authentication, security',
        testSteps: zephyrTestCase.steps
      });
    });
  });
  
  describe('Edge cases and error handling', () => {
    it('should handle missing source fields gracefully', () => {
      const incompleteTestCase = { ...zephyrTestCase };
      delete incompleteTestCase.labels;
      
      const transformedTestCase = service.applyFieldTransformations(
        incompleteTestCase,
        commonMappings
      );
      
      // Should not include tags since labels are missing
      expect(transformedTestCase.tags).toBeUndefined();
      
      // But other fields should still be transformed
      expect(transformedTestCase.name).toBe('Login Authentication Test');
      expect(transformedTestCase.status).toBe('Ready');
    });
    
    it('should handle invalid transformation configurations gracefully', () => {
      const invalidMapping: FieldMapping = {
        sourceId: 'status',
        targetId: 'qTestStatus',
        transformation: '{invalid json' // Invalid JSON
      };
      
      const result = service.applyFieldTransformations(
        zephyrTestCase,
        [...commonMappings, invalidMapping]
      );
      
      // Should apply direct mapping for the invalid transformation
      expect(result.qTestStatus).toBe('ACTIVE');
      
      // But other fields should still be transformed
      expect(result.status).toBe('Ready');
    });
  });
});