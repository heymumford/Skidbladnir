/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TestCase, Priority, TestCaseStatus } from '../../../pkg/domain/entities/TestCase';
import { TestCaseControllerMock } from '../../mocks/typescript/api/controllers/TestCaseControllerMock';

describe('TestCaseService', () => {
  let testCaseController: TestCaseControllerMock;

  beforeEach(() => {
    testCaseController = new TestCaseControllerMock();
  });

  it('should get a test case by ID', async () => {
    // Given a test case ID
    const testCaseId = 'TC-001';
    
    // When getting the test case
    const result = await testCaseController.getTestCase(testCaseId);
    
    // Then the test case should be returned
    expect(result).toBeDefined();
    expect(result.id).toBe(testCaseId);
    expect(result.title).toBe('Login Test');
  });

  it('should get all test cases with pagination', async () => {
    // Given filter parameters
    const filters = {
      page: 1,
      pageSize: 10
    };
    
    // When getting all test cases
    const result = await testCaseController.getAllTestCases(filters);
    
    // Then paged results should be returned
    expect(result).toBeDefined();
    expect(result.items).toBeInstanceOf(Array);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.page).toBe(filters.page);
    expect(result.pageSize).toBe(filters.pageSize);
  });

  it('should create a new test case', async () => {
    // Given a new test case data
    const newTestCase = {
      title: 'New Test Case',
      description: 'Description for new test case',
      status: TestCaseStatus.DRAFT,
      priority: Priority.MEDIUM,
      steps: [
        { 
          description: 'Step 1', 
          expectedResult: 'Expected result 1' 
        }
      ],
      tags: ['new', 'test']
    };
    
    // When creating a new test case
    const result = await testCaseController.createTestCase(newTestCase);
    
    // Then a new test case should be created
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.title).toBe(newTestCase.title);
    expect(result.description).toBe(newTestCase.description);
  });

  it('should filter test cases by status', async () => {
    // Given filter parameters with status
    const filters = {
      status: ['READY'],
      page: 1,
      pageSize: 10
    };
    
    // When getting filtered test cases
    const result = await testCaseController.getAllTestCases(filters);
    
    // Then filtered results should be returned
    expect(result).toBeDefined();
    expect(result.items).toBeInstanceOf(Array);
    expect(result.items.length).toBeGreaterThan(0);
    
    // All returned items should have the specified status
    result.items.forEach(item => {
      expect(item.status).toBe('READY');
    });
  });
});