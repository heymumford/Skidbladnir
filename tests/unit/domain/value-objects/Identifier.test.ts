/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Identifier } from '../../../../pkg/domain/value-objects/Identifier';

describe('Identifier', () => {
  describe('create', () => {
    it('should create an identifier with a valid value', () => {
      // Arrange
      const value = 'valid-id-123';
      
      // Act
      const identifier = Identifier.create(value);
      
      // Assert
      expect(identifier).toBeDefined();
      expect(identifier.getValue()).toBe(value);
    });

    it('should throw an error if the value is empty', () => {
      // Arrange
      const emptyValue = '';
      
      // Act & Assert
      expect(() => Identifier.create(emptyValue)).toThrow('Identifier value cannot be empty');
    });

    it('should throw an error if the value is only whitespace', () => {
      // Arrange
      const whitespaceValue = '   ';
      
      // Act & Assert
      expect(() => Identifier.create(whitespaceValue)).toThrow('Identifier value cannot be empty');
    });

    it('should throw an error if the value is not a string', () => {
      // Arrange
      const nonStringValue = 123 as any;
      
      // Act & Assert
      expect(() => Identifier.create(nonStringValue)).toThrow('Identifier value must be a string');
    });
  });

  describe('createRandom', () => {
    it('should create an identifier with a random UUID', () => {
      // Act
      const identifier = Identifier.createRandom();
      
      // Assert
      expect(identifier).toBeDefined();
      expect(identifier.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should create unique identifiers when called multiple times', () => {
      // Act
      const identifier1 = Identifier.createRandom();
      const identifier2 = Identifier.createRandom();
      
      // Assert
      expect(identifier1.getValue()).not.toBe(identifier2.getValue());
    });
  });

  describe('equals', () => {
    it('should return true for identifiers with the same value', () => {
      // Arrange
      const value = 'same-id-123';
      const identifier1 = Identifier.create(value);
      const identifier2 = Identifier.create(value);
      
      // Act
      const result = identifier1.equals(identifier2);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return false for identifiers with different values', () => {
      // Arrange
      const identifier1 = Identifier.create('id-1');
      const identifier2 = Identifier.create('id-2');
      
      // Act
      const result = identifier1.equals(identifier2);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should return false when compared with a non-Identifier object', () => {
      // Arrange
      const identifier = Identifier.create('id-1');
      const notAnIdentifier = { getValue: () => 'id-1' } as any;
      
      // Act
      const result = identifier.equals(notAnIdentifier);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string representation of the identifier', () => {
      // Arrange
      const value = 'id-to-string';
      const identifier = Identifier.create(value);
      
      // Act
      const result = identifier.toString();
      
      // Assert
      expect(result).toBe(value);
    });

    it('should be the same as getValue', () => {
      // Arrange
      const value = 'id-get-value';
      const identifier = Identifier.create(value);
      
      // Act
      const toStringResult = identifier.toString();
      const getValueResult = identifier.getValue();
      
      // Assert
      expect(toStringResult).toBe(getValueResult);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const value = 'immutable-id';
      const identifier = Identifier.create(value);
      
      // Act & Assert - try to modify the internal value
      // @ts-ignore - deliberately accessing private property for test
      expect(() => { identifier.value = 'changed'; }).toThrow();
      
      // Verify the value is unchanged
      expect(identifier.getValue()).toBe(value);
    });
  });
});