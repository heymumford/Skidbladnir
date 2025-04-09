/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TestCaseServiceImpl } from '../../../../internal/typescript/domain/services/TestCaseServiceImpl';
import { TestCase, TestCaseStatus, Priority } from '../../../../pkg/domain/entities/TestCase';
import { TestCaseFactory } from '../../../../pkg/domain/entities/TestCaseFactory';

describe('TestCaseService', () => {
  let testCaseService: TestCaseServiceImpl;
  
  beforeEach(() => {
    testCaseService = new TestCaseServiceImpl();
  });
  
  describe('validateTestCase', () => {
    it('should return empty array for valid test case', () => {
      // Arrange
      const testCase: Partial<TestCase> = {
        title: 'Valid Test Case',
        description: 'This is a valid test case',
        status: TestCaseStatus.DRAFT,
        priority: Priority.MEDIUM,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ],
        tags: ['tag1', 'tag2']
      };
      
      // Act
      const errors = testCaseService.validateTestCase(testCase);
      
      // Assert
      expect(errors).toEqual([]);
    });
    
    it('should return validation errors for invalid test case', () => {
      // Arrange
      const invalidTestCase: Partial<TestCase> = {
        title: '', // Empty title is invalid
        description: 'Description',
        steps: []
      };
      
      // Act
      const errors = testCaseService.validateTestCase(invalidTestCase);
      
      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Title is required');
    });
  });
  
  describe('enrichTestCaseMetadata', () => {
    it('should add default status if not provided', async () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description',
        status: undefined,
        steps: [],
        tags: []
      });
      
      // Act
      const enriched = await testCaseService.enrichTestCaseMetadata(testCase);
      
      // Assert
      expect(enriched.status).toBe(TestCaseStatus.DRAFT);
    });
    
    it('should add tags based on content', async () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Login Test',
        description: 'Test login functionality',
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ],
        tags: ['existing-tag']
      });
      
      // Act
      const enriched = await testCaseService.enrichTestCaseMetadata(testCase);
      
      // Assert
      expect(enriched.tags).toContain('authentication');
      expect(enriched.tags).toContain('existing-tag');
    });
    
    it('should calculate and store complexity metadata', async () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Complex Test',
        description: 'A complex test with many steps',
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' },
          { order: 2, description: 'Step 2', expectedResult: 'Result 2' },
          { order: 3, description: 'Step 3', expectedResult: 'Result 3' },
          { order: 4, description: 'Step 4', expectedResult: 'Result 4' },
          { order: 5, description: 'Step 5', expectedResult: 'Result 5' }
        ],
        priority: Priority.HIGH
      });
      
      // Act
      const enriched = await testCaseService.enrichTestCaseMetadata(testCase);
      
      // Assert
      expect((enriched as any).metadata).toBeDefined();
      expect((enriched as any).metadata.complexity).toBeGreaterThan(0);
    });
    
    it('should preserve existing test case properties', async () => {
      // Arrange
      const originalDate = new Date('2025-01-01');
      const testCase = TestCaseFactory.create({
        title: 'Original Test',
        description: 'Original description',
        priority: Priority.CRITICAL
      });
      testCase.createdAt = originalDate;
      
      // Act
      const enriched = await testCaseService.enrichTestCaseMetadata(testCase);
      
      // Assert
      expect(enriched.title).toBe('Original Test');
      expect(enriched.description).toBe('Original description');
      expect(enriched.priority).toBe(Priority.CRITICAL);
      expect(enriched.createdAt).toEqual(originalDate);
    });
  });
  
  describe('generateTestSteps', () => {
    it('should generate authentication steps for login-related descriptions', async () => {
      // Arrange
      const description = 'Test user login functionality';
      
      // Act
      const steps = await testCaseService.generateTestSteps(description);
      
      // Assert
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].description).toContain('login');
      
      // Verify steps are sequential
      steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1);
      });
    });
    
    it('should generate CRUD steps for creation-related descriptions', async () => {
      // Arrange
      const description = 'Test creating a new user account';
      
      // Act
      const steps = await testCaseService.generateTestSteps(description);
      
      // Assert
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(step => step.description.toLowerCase().includes('form'))).toBe(true);
    });
    
    it('should generate search steps for search-related descriptions', async () => {
      // Arrange
      const description = 'Test searching for users by name';
      
      // Act
      const steps = await testCaseService.generateTestSteps(description);
      
      // Assert
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(step => step.description.toLowerCase().includes('search'))).toBe(true);
    });
    
    it('should generate default steps for other descriptions', async () => {
      // Arrange
      const description = 'Test application performance';
      
      // Act
      const steps = await testCaseService.generateTestSteps(description);
      
      // Assert
      expect(steps.length).toBeGreaterThan(0);
      // Default steps should be generic
      expect(steps[0].description).not.toContain('login');
      expect(steps[0].description).not.toContain('form');
      expect(steps[0].description).not.toContain('search');
    });
  });
  
  describe('calculateTestComplexity', () => {
    it('should calculate higher complexity for tests with many steps', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Complex Test',
        description: 'Test with many steps',
        steps: Array(10).fill(0).map((_, i) => ({ 
          order: i + 1, 
          description: `Step ${i + 1}`, 
          expectedResult: `Result ${i + 1}` 
        }))
      });
      
      // Act
      const complexity = testCaseService.calculateTestComplexity(testCase);
      
      // Assert
      expect(complexity).toBeGreaterThanOrEqual(3); // At least 3 points for 10+ steps
    });
    
    it('should calculate higher complexity for tests with verbose steps', () => {
      // Arrange
      const longText = 'A'.repeat(100);
      const testCase = TestCaseFactory.create({
        title: 'Test with verbose steps',
        description: 'Test description',
        steps: [
          { 
            order: 1, 
            description: longText, 
            expectedResult: longText 
          }
        ]
      });
      
      // Act
      const complexity = testCaseService.calculateTestComplexity(testCase);
      
      // Assert
      expect(complexity).toBeGreaterThanOrEqual(1); // At least 1 point for step complexity
    });
    
    it('should calculate higher complexity for critical priority tests', () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Critical Test',
        description: 'Test description',
        priority: Priority.CRITICAL,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ]
      });
      
      // Act
      const complexity = testCaseService.calculateTestComplexity(testCase);
      
      // Assert
      expect(complexity).toBeGreaterThanOrEqual(2); // At least 2 points for critical priority
    });
    
    it('should calculate higher complexity for tests with long descriptions', () => {
      // Arrange
      const longDescription = 'A'.repeat(501);
      const testCase = TestCaseFactory.create({
        title: 'Test with long description',
        description: longDescription,
        steps: [
          { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
        ]
      });
      
      // Act
      const complexity = testCaseService.calculateTestComplexity(testCase);
      
      // Assert
      expect(complexity).toBeGreaterThanOrEqual(2); // At least 2 points for long description
    });
    
    it('should cap complexity at 10', () => {
      // Arrange
      const longText = 'A'.repeat(200);
      const testCase = TestCaseFactory.create({
        title: 'Very Complex Test',
        description: 'A'.repeat(1000), // Very long description
        priority: Priority.CRITICAL,
        steps: Array(20).fill(0).map((_, i) => ({ 
          order: i + 1, 
          description: longText, // Long step descriptions
          expectedResult: longText // Long expected results
        }))
      });
      
      // Act
      const complexity = testCaseService.calculateTestComplexity(testCase);
      
      // Assert
      expect(complexity).toBeLessThanOrEqual(10); // Capped at 10
    });
  });
  
  describe('checkForDuplicates', () => {
    it('should return an empty array (no infrastructure dependencies)', async () => {
      // Arrange
      const testCase = TestCaseFactory.create({
        title: 'Test Case',
        description: 'Description'
      });
      
      // Act
      const duplicates = await testCaseService.checkForDuplicates(testCase);
      
      // Assert
      expect(duplicates).toEqual([]);
    });
  });
});