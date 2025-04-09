/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Email } from '../../../../pkg/domain/value-objects/Email';

describe('Email', () => {
  describe('create', () => {
    it('should create an email with a valid value', () => {
      // Arrange
      const value = 'test@example.com';
      
      // Act
      const email = Email.create(value);
      
      // Assert
      expect(email).toBeDefined();
      expect(email.getValue()).toBe(value);
    });

    it('should convert the email to lowercase', () => {
      // Arrange
      const mixedCaseEmail = 'Test.User@Example.COM';
      const lowerCaseEmail = 'test.user@example.com';
      
      // Act
      const email = Email.create(mixedCaseEmail);
      
      // Assert
      expect(email.getValue()).toBe(lowerCaseEmail);
    });

    it('should trim whitespace from the email', () => {
      // Arrange
      const emailWithWhitespace = '  test@example.com  ';
      const trimmedEmail = 'test@example.com';
      
      // Act
      const email = Email.create(emailWithWhitespace);
      
      // Assert
      expect(email.getValue()).toBe(trimmedEmail);
    });

    it('should throw an error if the email is empty', () => {
      // Arrange
      const emptyEmail = '';
      
      // Act & Assert
      expect(() => Email.create(emptyEmail)).toThrow('Email cannot be empty');
    });

    it('should throw an error if the email is invalid', () => {
      // Arrange
      const invalidEmails = [
        'notanemail',
        'missing@tld',
        '@nodomain.com',
        'no@domain@here.com',
        'spaces in@domain.com',
        'no domain@.com'
      ];
      
      // Act & Assert
      invalidEmails.forEach(invalidEmail => {
        expect(() => Email.create(invalidEmail)).toThrow('Invalid email format');
      });
    });

    it('should throw an error if the email is not a string', () => {
      // Arrange
      const nonStringValue = 123 as any;
      
      // Act & Assert
      expect(() => Email.create(nonStringValue)).toThrow('Email must be a string');
    });
  });

  describe('isValid', () => {
    it('should return true for valid email addresses', () => {
      // Arrange
      const validEmails = [
        'simple@example.com',
        'very.common@example.com',
        'disposable.style.email.with+symbol@example.com',
        'other.email-with-hyphen@example.com',
        'user.name+tag+sorting@example.com'
      ];
      
      // Act & Assert
      validEmails.forEach(validEmail => {
        expect(Email.isValid(validEmail)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      // Arrange
      const invalidEmails = [
        'plainaddress',
        '#@%^%#$@#$@#.com',
        '@example.com',
        'email.example.com',
        'email@example@example.com',
        '.email@example.com',
        'email.@example.com',
        'email@example..com'
      ];
      
      // Act & Assert
      invalidEmails.forEach(invalidEmail => {
        expect(Email.isValid(invalidEmail)).toBe(false);
      });
    });
  });

  describe('getDomain', () => {
    it('should return the domain part of the email', () => {
      // Arrange
      const email = Email.create('user@example.com');
      const expectedDomain = 'example.com';
      
      // Act
      const domain = email.getDomain();
      
      // Assert
      expect(domain).toBe(expectedDomain);
    });
  });

  describe('getLocalPart', () => {
    it('should return the local part of the email', () => {
      // Arrange
      const email = Email.create('user@example.com');
      const expectedLocalPart = 'user';
      
      // Act
      const localPart = email.getLocalPart();
      
      // Assert
      expect(localPart).toBe(expectedLocalPart);
    });
  });

  describe('equals', () => {
    it('should return true for emails with the same value', () => {
      // Arrange
      const value = 'same@example.com';
      const email1 = Email.create(value);
      const email2 = Email.create(value);
      
      // Act
      const result = email1.equals(email2);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return false for emails with different values', () => {
      // Arrange
      const email1 = Email.create('first@example.com');
      const email2 = Email.create('second@example.com');
      
      // Act
      const result = email1.equals(email2);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should return false when compared with a non-Email object', () => {
      // Arrange
      const email = Email.create('test@example.com');
      const notAnEmail = { getValue: () => 'test@example.com' } as any;
      
      // Act
      const result = email.equals(notAnEmail);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string representation of the email', () => {
      // Arrange
      const value = 'string@example.com';
      const email = Email.create(value);
      
      // Act
      const result = email.toString();
      
      // Assert
      expect(result).toBe(value);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const value = 'immutable@example.com';
      const email = Email.create(value);
      
      // Act & Assert - try to modify the internal value
      // @ts-ignore - deliberately accessing private property for test
      expect(() => { email.value = 'changed@example.com'; }).toThrow();
      
      // Verify the value is unchanged
      expect(email.getValue()).toBe(value);
    });
  });
});