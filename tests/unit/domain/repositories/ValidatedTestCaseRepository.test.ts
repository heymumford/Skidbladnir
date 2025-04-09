/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ValidatedTestCaseRepository } from '../../../../internal/typescript/api/repositories/ValidatedTestCaseRepository';
import { TestCaseRepository } from '../../../../pkg/domain/repositories/TestCaseRepository';
import { TestCase, TestCaseStatus, Priority } from '../../../../pkg/domain/entities/TestCase';
import { ValidationError } from '../../../../pkg/domain/errors/DomainErrors';

describe('ValidatedTestCaseRepository', () => {
  // Mock underlying repository
  let mockRepository: TestCaseRepository;
  let validatedRepository: ValidatedTestCaseRepository;
  
  const validTestCase: TestCase = {
    id: 'test-1',
    title: 'Valid Test Case',
    description: 'Description of valid test case',
    status: TestCaseStatus.DRAFT,
    priority: Priority.MEDIUM,
    steps: [
      { order: 1, description: 'Step 1', expectedResult: 'Result 1' }
    ],
    tags: ['test', 'valid'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    // Create repository with mock
    validatedRepository = new ValidatedTestCaseRepository(mockRepository);
  });
  
  describe('create', () => {
    it('should create a valid test case', async () => {
      // Arrange
      const input = {
        title: 'Test Case',
        description: 'Description',
        status: TestCaseStatus.DRAFT,
        priority: Priority.MEDIUM,
        steps: [{ order: 1, description: 'Step', expectedResult: 'Result' }],
        tags: ['tag']
      };
      
      const createdTestCase = {
        ...input,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (mockRepository.create as jest.Mock).mockResolvedValue(createdTestCase);
      
      // Act
      const result = await validatedRepository.create(input);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toEqual(createdTestCase);
    });
    
    it('should reject an invalid test case', async () => {
      // Arrange
      const invalidInput = {
        title: '', // Empty title (invalid)
        description: 'Description',
        status: TestCaseStatus.DRAFT,
        priority: Priority.MEDIUM,
        steps: [],
        tags: []
      };
      
      // Act & Assert
      await expect(validatedRepository.create(invalidInput)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
  
  describe('update', () => {
    it('should update a test case with valid changes', async () => {
      // Arrange
      const id = 'test-1';
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };
      
      const updatedTestCase = {
        ...validTestCase,
        ...updates,
        updatedAt: new Date()
      };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      (mockRepository.update as jest.Mock).mockResolvedValue(updatedTestCase);
      
      // Act
      const result = await validatedRepository.update(id, updates);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalledWith(id, updates);
      expect(result).toEqual(updatedTestCase);
    });
    
    it('should reject invalid updates', async () => {
      // Arrange
      const id = 'test-1';
      const invalidUpdates = {
        title: '' // Empty title (invalid)
      };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      
      // Act & Assert
      await expect(validatedRepository.update(id, invalidUpdates)).rejects.toThrow(ValidationError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('should return null for non-existent test case', async () => {
      // Arrange
      const id = 'non-existent';
      const updates = { title: 'Updated Title' };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await validatedRepository.update(id, updates);
      
      // Assert
      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
  
  describe('findById', () => {
    it('should return a validated test case', async () => {
      // Arrange
      const id = 'test-1';
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      
      // Act
      const result = await validatedRepository.findById(id);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(validTestCase);
    });
    
    it('should reject an invalid test case from storage', async () => {
      // Arrange
      const id = 'invalid-1';
      const invalidTestCase = {
        ...validTestCase,
        title: '' // Empty title (invalid)
      };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(invalidTestCase);
      
      // Act & Assert
      await expect(validatedRepository.findById(id)).rejects.toThrow(ValidationError);
    });
    
    it('should return null for non-existent test case', async () => {
      // Arrange
      const id = 'non-existent';
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await validatedRepository.findById(id);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('findAll', () => {
    it('should return validated test cases', async () => {
      // Arrange
      const testCases = [
        validTestCase,
        { ...validTestCase, id: 'test-2', title: 'Another Test Case' }
      ];
      
      (mockRepository.findAll as jest.Mock).mockResolvedValue(testCases);
      
      // Act
      const result = await validatedRepository.findAll();
      
      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(testCases);
      expect(result).toHaveLength(2);
    });
    
    it('should reject invalid test cases from storage', async () => {
      // Arrange
      const testCases = [
        validTestCase,
        { ...validTestCase, id: 'invalid-1', title: '' } // Invalid test case
      ];
      
      (mockRepository.findAll as jest.Mock).mockResolvedValue(testCases);
      
      // Act & Assert
      await expect(validatedRepository.findAll()).rejects.toThrow(ValidationError);
    });
    
    it('should apply filters to the underlying repository', async () => {
      // Arrange
      const filters = {
        status: [TestCaseStatus.DRAFT],
        priority: [Priority.HIGH],
        search: 'search term'
      };
      
      const testCases = [validTestCase];
      
      (mockRepository.findAll as jest.Mock).mockResolvedValue(testCases);
      
      // Act
      const result = await validatedRepository.findAll(filters);
      
      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(testCases);
    });
  });
  
  describe('delete', () => {
    it('should delete a test case', async () => {
      // Arrange
      const id = 'test-1';
      
      (mockRepository.delete as jest.Mock).mockResolvedValue(true);
      
      // Act
      const result = await validatedRepository.delete(id);
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toBe(true);
    });
    
    it('should return false for non-existent test case', async () => {
      // Arrange
      const id = 'non-existent';
      
      (mockRepository.delete as jest.Mock).mockResolvedValue(false);
      
      // Act
      const result = await validatedRepository.delete(id);
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('addStep', () => {
    it('should add a valid step to a test case', async () => {
      // Arrange
      const id = 'test-1';
      const description = 'New Step';
      const expectedResult = 'New Result';
      
      const updatedTestCase = {
        ...validTestCase,
        steps: [
          ...validTestCase.steps,
          { order: 2, description, expectedResult }
        ],
        updatedAt: new Date()
      };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      (mockRepository.update as jest.Mock).mockResolvedValue(updatedTestCase);
      
      // Act
      const result = await validatedRepository.addStep(id, description, expectedResult);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalled();
      expect(result).toEqual(updatedTestCase);
      expect(result?.steps).toHaveLength(2);
      expect(result?.steps[1].description).toBe(description);
    });
    
    it('should reject invalid step', async () => {
      // Arrange
      const id = 'test-1';
      const invalidDescription = ''; // Empty description (invalid)
      const expectedResult = 'Result';
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      
      // Act & Assert
      await expect(validatedRepository.addStep(id, invalidDescription, expectedResult)).rejects.toThrow(ValidationError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('should return null for non-existent test case', async () => {
      // Arrange
      const id = 'non-existent';
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await validatedRepository.addStep(id, 'Step', 'Result');
      
      // Assert
      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
  
  describe('updateStatus', () => {
    it('should update the status of a test case', async () => {
      // Arrange
      const id = 'test-1';
      const newStatus = TestCaseStatus.APPROVED;
      
      const updatedTestCase = {
        ...validTestCase,
        status: newStatus,
        updatedAt: new Date()
      };
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      (mockRepository.update as jest.Mock).mockResolvedValue(updatedTestCase);
      
      // Act
      const result = await validatedRepository.updateStatus(id, newStatus);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalled();
      expect(result).toEqual(updatedTestCase);
      expect(result?.status).toBe(newStatus);
    });
    
    it('should reject invalid status', async () => {
      // Arrange
      const id = 'test-1';
      const invalidStatus = 'INVALID_STATUS'; // Not a valid status
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(validTestCase);
      
      // Act & Assert
      await expect(validatedRepository.updateStatus(id, invalidStatus)).rejects.toThrow();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('should return null for non-existent test case', async () => {
      // Arrange
      const id = 'non-existent';
      
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await validatedRepository.updateStatus(id, TestCaseStatus.READY);
      
      // Assert
      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});