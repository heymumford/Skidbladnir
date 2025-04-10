/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationEngine } from '../../../packages/ui/src/services/TransformationEngine';
import { TransformationType } from '../../../packages/ui/src/components/Transformation/FieldTransformation';

describe('TransformationEngine', () => {
  const engine = new TransformationEngine();
  
  // Test object for multi-field transformations
  const testObject = {
    id: 'TC-123',
    name: 'Login Test',
    description: 'Verify login functionality',
    priority: 'HIGH',
    labels: ['login', 'authentication', 'security'],
    steps: [
      { id: 'step-1', description: 'Open login page' },
      { id: 'step-2', description: 'Enter credentials' },
      { id: 'step-3', description: 'Click login button' }
    ]
  };
  
  describe('Direct mapping (NONE)', () => {
    it('should return the source value unchanged', () => {
      expect(engine.applyTransformation('test value', TransformationType.NONE, {})).toBe('test value');
      expect(engine.applyTransformation(123, TransformationType.NONE, {})).toBe(123);
      expect(engine.applyTransformation(null, TransformationType.NONE, {})).toBe(null);
    });
  });
  
  describe('CONCAT transformation', () => {
    it('should concatenate multiple fields with a separator', () => {
      const params = {
        separator: ' - ',
        fields: ['id', 'name']
      };
      
      const result = engine.applyTransformation('not used', TransformationType.CONCAT, params, testObject);
      expect(result).toBe('TC-123 - Login Test');
    });
    
    it('should handle missing fields gracefully', () => {
      const params = {
        separator: ', ',
        fields: ['id', 'nonexistent']
      };
      
      const result = engine.applyTransformation('not used', TransformationType.CONCAT, params, testObject);
      expect(result).toBe('TC-123');
    });
    
    it('should return the source value if no source object is provided', () => {
      const params = {
        separator: ', ',
        fields: ['id', 'name']
      };
      
      const result = engine.applyTransformation('fallback', TransformationType.CONCAT, params);
      expect(result).toBe('fallback');
    });
  });
  
  describe('SUBSTRING transformation', () => {
    it('should extract a substring based on start and end positions', () => {
      const params = {
        start: 3,
        end: 7
      };
      
      const result = engine.applyTransformation('hello world', TransformationType.SUBSTRING, params);
      expect(result).toBe('lo w');
    });
    
    it('should handle cases when end is omitted', () => {
      const params = {
        start: 6
      };
      
      const result = engine.applyTransformation('hello world', TransformationType.SUBSTRING, params);
      expect(result).toBe('world');
    });
    
    it('should handle null or undefined gracefully', () => {
      const params = {
        start: 0,
        end: 5
      };
      
      expect(engine.applyTransformation(null, TransformationType.SUBSTRING, params)).toBe('');
      expect(engine.applyTransformation(undefined, TransformationType.SUBSTRING, params)).toBe('');
    });
  });
  
  describe('REPLACE transformation', () => {
    it('should replace all occurrences of a pattern with a replacement', () => {
      const params = {
        pattern: 'test',
        replacement: 'exam'
      };
      
      const result = engine.applyTransformation('this is a test for testing', TransformationType.REPLACE, params);
      expect(result).toBe('this is a exam for examing');
    });
    
    it('should handle regular expression patterns', () => {
      const params = {
        pattern: '/\\d+/',
        replacement: 'NUM'
      };
      
      const result = engine.applyTransformation('user123 has 456 points', TransformationType.REPLACE, params);
      expect(result).toBe('userNUM has NUM points');
    });
    
    it('should handle null or undefined gracefully', () => {
      const params = {
        pattern: 'test',
        replacement: 'exam'
      };
      
      expect(engine.applyTransformation(null, TransformationType.REPLACE, params)).toBe('');
      expect(engine.applyTransformation(undefined, TransformationType.REPLACE, params)).toBe('');
    });
  });
  
  describe('MAP_VALUES transformation', () => {
    it('should map specific values to different values', () => {
      const params = {
        mappings: {
          'HIGH': 'P1',
          'MEDIUM': 'P2',
          'LOW': 'P3'
        }
      };
      
      expect(engine.applyTransformation('HIGH', TransformationType.MAP_VALUES, params)).toBe('P1');
      expect(engine.applyTransformation('MEDIUM', TransformationType.MAP_VALUES, params)).toBe('P2');
      expect(engine.applyTransformation('LOW', TransformationType.MAP_VALUES, params)).toBe('P3');
    });
    
    it('should return the original value if not found in mappings', () => {
      const params = {
        mappings: {
          'HIGH': 'P1',
          'MEDIUM': 'P2'
        }
      };
      
      expect(engine.applyTransformation('CRITICAL', TransformationType.MAP_VALUES, params)).toBe('CRITICAL');
    });
    
    it('should handle null or undefined gracefully', () => {
      const params = {
        mappings: {
          'HIGH': 'P1',
          'MEDIUM': 'P2'
        }
      };
      
      expect(engine.applyTransformation(null, TransformationType.MAP_VALUES, params)).toBe(null);
      expect(engine.applyTransformation(undefined, TransformationType.MAP_VALUES, params)).toBe(undefined);
    });
  });
  
  describe('SPLIT transformation', () => {
    it('should split a string and return the specified part', () => {
      const params = {
        separator: ',',
        index: 1
      };
      
      const result = engine.applyTransformation('apple,orange,banana', TransformationType.SPLIT, params);
      expect(result).toBe('orange');
    });
    
    it('should return an empty string if the index is out of bounds', () => {
      const params = {
        separator: ',',
        index: 5
      };
      
      const result = engine.applyTransformation('apple,orange,banana', TransformationType.SPLIT, params);
      expect(result).toBe('');
    });
    
    it('should handle null or undefined gracefully', () => {
      const params = {
        separator: ',',
        index: 0
      };
      
      expect(engine.applyTransformation(null, TransformationType.SPLIT, params)).toBe('');
      expect(engine.applyTransformation(undefined, TransformationType.SPLIT, params)).toBe('');
    });
  });
  
  describe('JOIN transformation', () => {
    it('should join values from multiple fields with a separator', () => {
      const params = {
        separator: ' | ',
        fields: ['name', 'priority']
      };
      
      const result = engine.applyTransformation('not used', TransformationType.JOIN, params, testObject);
      expect(result).toBe('Login Test | HIGH');
    });
    
    it('should handle array values by joining them', () => {
      const params = {
        separator: ', ',
        fields: ['labels']
      };
      
      const result = engine.applyTransformation('not used', TransformationType.JOIN, params, testObject);
      expect(result).toBe('login, authentication, security');
    });
    
    it('should handle missing fields gracefully', () => {
      const params = {
        separator: ', ',
        fields: ['name', 'nonexistent']
      };
      
      const result = engine.applyTransformation('not used', TransformationType.JOIN, params, testObject);
      expect(result).toBe('Login Test');
    });
  });
  
  describe('UPPERCASE transformation', () => {
    it('should convert a string to uppercase', () => {
      const result = engine.applyTransformation('hello world', TransformationType.UPPERCASE, {});
      expect(result).toBe('HELLO WORLD');
    });
    
    it('should handle null or undefined gracefully', () => {
      expect(engine.applyTransformation(null, TransformationType.UPPERCASE, {})).toBe('');
      expect(engine.applyTransformation(undefined, TransformationType.UPPERCASE, {})).toBe('');
    });
  });
  
  describe('LOWERCASE transformation', () => {
    it('should convert a string to lowercase', () => {
      const result = engine.applyTransformation('HELLO WORLD', TransformationType.LOWERCASE, {});
      expect(result).toBe('hello world');
    });
    
    it('should handle null or undefined gracefully', () => {
      expect(engine.applyTransformation(null, TransformationType.LOWERCASE, {})).toBe('');
      expect(engine.applyTransformation(undefined, TransformationType.LOWERCASE, {})).toBe('');
    });
  });
  
  describe('CUSTOM transformation', () => {
    it('should apply a custom JavaScript transformation', () => {
      const params = {
        formula: 'return sourceValue ? sourceValue.toUpperCase() + "!" : "";'
      };
      
      const result = engine.applyTransformation('hello world', TransformationType.CUSTOM, params);
      expect(result).toBe('HELLO WORLD!');
    });
    
    it('should handle errors in custom code gracefully', () => {
      const params = {
        formula: 'throw new Error("Test error");'
      };
      
      // Should return the original value if the custom code throws an error
      const result = engine.applyTransformation('hello world', TransformationType.CUSTOM, params);
      expect(result).toBe('hello world');
    });
  });
  
  describe('Error handling', () => {
    it('should handle errors gracefully and return the original value', () => {
      // Create a transformation that will cause an error
      const result = engine.applyTransformation(
        {}, // Object instead of string, which will cause errors in string operations
        TransformationType.SUBSTRING,
        { start: 0, end: 5 }
      );
      
      // Should return the original value
      expect(result).toEqual({});
    });
  });
});