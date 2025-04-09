/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as StringUtils from '../../src/utils/string-utils';

describe('String Utilities', () => {
  describe('Case Conversion', () => {
    it('should convert to camelCase', () => {
      expect(StringUtils.toCamelCase('hello world')).toBe('helloWorld');
      expect(StringUtils.toCamelCase('Hello World')).toBe('helloWorld');
      expect(StringUtils.toCamelCase('hello-world')).toBe('helloWorld');
      expect(StringUtils.toCamelCase('hello_world')).toBe('helloWorld');
      expect(StringUtils.toCamelCase('HELLO_WORLD')).toBe('helloWORLD');
    });

    it('should convert to PascalCase', () => {
      expect(StringUtils.toPascalCase('hello world')).toBe('HelloWorld');
      expect(StringUtils.toPascalCase('Hello World')).toBe('HelloWorld');
      expect(StringUtils.toPascalCase('hello-world')).toBe('HelloWorld');
      expect(StringUtils.toPascalCase('hello_world')).toBe('HelloWorld');
      expect(StringUtils.toPascalCase('HELLO_WORLD')).toBe('HELLOWORLD');
    });

    it('should convert to snake_case', () => {
      expect(StringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
      expect(StringUtils.toSnakeCase('HelloWorld')).toBe('hello_world');
      expect(StringUtils.toSnakeCase('hello-world')).toBe('hello_world');
      expect(StringUtils.toSnakeCase('hello world')).toBe('hello_world');
      expect(StringUtils.toSnakeCase('HELLO WORLD')).toBe('hello_world');
    });

    it('should convert to kebab-case', () => {
      expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world');
      expect(StringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
      expect(StringUtils.toKebabCase('hello_world')).toBe('hello-world');
      expect(StringUtils.toKebabCase('hello world')).toBe('hello-world');
      expect(StringUtils.toKebabCase('HELLO WORLD')).toBe('hello-world');
    });
  });

  describe('String Manipulation', () => {
    it('should truncate strings', () => {
      expect(StringUtils.truncate('Hello World', 5)).toBe('He...');
      expect(StringUtils.truncate('Hello', 10)).toBe('Hello');
      expect(StringUtils.truncate('Hello World', 8, '…')).toBe('Hello W…');
      expect(StringUtils.truncate('', 5)).toBe('');
      expect(StringUtils.truncate(null as any, 5)).toBe(null);
    });

    it('should check if string is empty', () => {
      expect(StringUtils.isEmpty('')).toBe(true);
      expect(StringUtils.isEmpty('  ')).toBe(true);
      expect(StringUtils.isEmpty(null as any)).toBe(true);
      expect(StringUtils.isEmpty(undefined as any)).toBe(true);
      expect(StringUtils.isEmpty('hello')).toBe(false);
      expect(StringUtils.isEmpty(' hello ')).toBe(false);
    });

    it('should extract words from a string', () => {
      expect(StringUtils.extractWords('Hello world from Skidbladnir', 2)).toBe('Hello world');
      expect(StringUtils.extractWords('Hello', 3)).toBe('Hello');
      expect(StringUtils.extractWords('', 2)).toBe('');
      expect(StringUtils.extractWords('Hello  world  test', 2)).toBe('Hello world');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize strings for HTML', () => {
      expect(StringUtils.sanitizeForHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
      expect(StringUtils.sanitizeForHtml('Hello & World')).toBe('Hello &amp; World');
    });

    it('should sanitize strings for filenames', () => {
      expect(StringUtils.sanitizeForFilename('file/with\\illegal:chars?')).toBe('file_with_illegal_chars_');
      expect(StringUtils.sanitizeForFilename('spaces and   multiple___underscores')).toBe('spaces_and_multiple_underscores');
    });
  });

  describe('Formatting', () => {
    it('should format values consistently', () => {
      expect(StringUtils.formatValue('hello world', 'uppercase')).toBe('HELLO WORLD');
      expect(StringUtils.formatValue('HELLO WORLD', 'lowercase')).toBe('hello world');
      expect(StringUtils.formatValue('hello world', 'title-case')).toBe('Hello World');
      expect(StringUtils.formatValue('hELLO wORLD', 'sentence-case')).toBe('Hello world');
      expect(StringUtils.formatValue('hello', 'unknown-format')).toBe('hello');
      expect(StringUtils.formatValue(null)).toBe('');
      expect(StringUtils.formatValue(undefined)).toBe('');
      expect(StringUtils.formatValue(123)).toBe('123');
    });
  });

  describe('Parsing', () => {
    it('should parse boolean values correctly', () => {
      expect(StringUtils.parseBoolean('true')).toBe(true);
      expect(StringUtils.parseBoolean('yes')).toBe(true);
      expect(StringUtils.parseBoolean('y')).toBe(true);
      expect(StringUtils.parseBoolean('1')).toBe(true);
      expect(StringUtils.parseBoolean('on')).toBe(true);
      expect(StringUtils.parseBoolean('false')).toBe(false);
      expect(StringUtils.parseBoolean('no')).toBe(false);
      expect(StringUtils.parseBoolean('0')).toBe(false);
      expect(StringUtils.parseBoolean('')).toBe(false);
      expect(StringUtils.parseBoolean(null as any)).toBe(false);
      expect(StringUtils.parseBoolean(undefined as any)).toBe(false);
      expect(StringUtils.parseBoolean(true)).toBe(true);
      expect(StringUtils.parseBoolean(false)).toBe(false);
    });
  });

  describe('Normalization', () => {
    it('should normalize strings for comparison', () => {
      const normalized = StringUtils.normalizeForComparison('Café');
      expect(normalized).toBe('cafe');
      
      // These should normalize to the same value
      const str1 = StringUtils.normalizeForComparison('résumé');
      const str2 = StringUtils.normalizeForComparison('resume');
      expect(str1).toBe(str2);
      
      // Case insensitive
      const str3 = StringUtils.normalizeForComparison('HELLO');
      const str4 = StringUtils.normalizeForComparison('hello');
      expect(str3).toBe(str4);
      
      // Trims whitespace
      const str5 = StringUtils.normalizeForComparison('  hello  ');
      expect(str5).toBe('hello');
    });
  });
});