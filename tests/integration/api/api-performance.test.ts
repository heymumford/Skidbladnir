/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * API Performance Tests
 * These tests verify that the API meets performance requirements
 * and handles scaling gracefully
 */

import axios from 'axios';

// Configure API URL
const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_BASE = `${API_URL}/api`;

// Performance thresholds
const MAX_RESPONSE_TIME_MS = 500; // Maximum acceptable response time
const BULK_OPERATION_SIZE = 10;    // Number of operations for bulk tests

// Skip heavy performance tests in CI environment
const isCI = process.env.CI === 'true';

// Helper to measure response time
const measureResponseTime = async (requestFn: () => Promise<any>): Promise<number> => {
  const start = Date.now();
  await requestFn();
  return Date.now() - start;
};

describe('API Performance', () => {
  // Collection of test cases created during test run for cleanup
  const createdTestCaseIds: string[] = [];
  
  // Extended timeout for performance tests
  jest.setTimeout(isCI ? 10000 : 30000);
  
  // Basic response time tests
  describe('Response time', () => {
    it('should respond to health check within acceptable time', async () => {
      const responseTime = await measureResponseTime(() => 
        axios.get(`${API_URL}/health`)
      );
      
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
    
    it('should respond to GET requests within acceptable time', async () => {
      const responseTime = await measureResponseTime(() =>
        axios.get(`${API_BASE}/test-cases`)
      );
      
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
    
    it('should respond to single POST request within acceptable time', async () => {
      const responseTime = await measureResponseTime(async () => {
        const response = await axios.post(`${API_BASE}/test-cases`, {
          title: 'Performance Test Case',
          description: 'Test case for measuring API performance',
          status: 'DRAFT',
          priority: 'LOW',
          tags: ['performance', 'test']
        });
        
        createdTestCaseIds.push(response.data.id);
      });
      
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
  });
  
  // Bulk operation tests
  describe('Bulk operations', () => {
    // Skip bulk tests in CI environment
    beforeEach(() => {
      if (isCI) {
        console.warn('Skipping bulk tests in CI environment');
        pending('Bulk tests skipped in CI');
      }
    });
    
    it('should handle multiple concurrent GET requests', async () => {
      const requests = Array(BULK_OPERATION_SIZE).fill(null).map(() => 
        axios.get(`${API_BASE}/test-cases`)
      );
      
      const start = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - start;
      
      // Since these are parallel, we expect total time to be less than
      // BULK_OPERATION_SIZE * MAX_RESPONSE_TIME_MS
      const maxAcceptableTime = BULK_OPERATION_SIZE * MAX_RESPONSE_TIME_MS / 2;
      expect(totalTime).toBeLessThan(maxAcceptableTime);
    });
    
    it('should handle bulk creation of test cases', async () => {
      const requests = Array(BULK_OPERATION_SIZE).fill(null).map((_, index) => 
        axios.post(`${API_BASE}/test-cases`, {
          title: `Bulk Test Case ${index + 1}`,
          description: 'Test case created as part of bulk operation test',
          status: 'DRAFT',
          priority: 'LOW',
          tags: ['bulk', 'performance', 'test']
        })
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - start;
      
      responses.forEach(response => {
        createdTestCaseIds.push(response.data.id);
      });
      
      // For creation, we'll be more lenient since it involves DB operations
      const maxAcceptableTime = BULK_OPERATION_SIZE * MAX_RESPONSE_TIME_MS;
      expect(totalTime).toBeLessThan(maxAcceptableTime);
    });
    
    it('should handle bulk retrieval of test cases by ID', async () => {
      // Skip if we don't have created test cases
      if (createdTestCaseIds.length < BULK_OPERATION_SIZE) {
        console.warn('Not enough test cases created for bulk retrieval test');
        pending('Insufficient test data');
        return;
      }
      
      const requests = createdTestCaseIds.slice(0, BULK_OPERATION_SIZE).map(id => 
        axios.get(`${API_BASE}/test-cases/${id}`)
      );
      
      const start = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - start;
      
      const maxAcceptableTime = BULK_OPERATION_SIZE * MAX_RESPONSE_TIME_MS / 2;
      expect(totalTime).toBeLessThan(maxAcceptableTime);
    });
    
    it('should handle bulk updates of test cases', async () => {
      // Skip if we don't have created test cases
      if (createdTestCaseIds.length < BULK_OPERATION_SIZE) {
        console.warn('Not enough test cases created for bulk update test');
        pending('Insufficient test data');
        return;
      }
      
      const requests = createdTestCaseIds.slice(0, BULK_OPERATION_SIZE).map((id, index) => 
        axios.put(`${API_BASE}/test-cases/${id}`, {
          title: `Updated Bulk Test Case ${index + 1}`,
          status: 'READY'
        })
      );
      
      const start = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - start;
      
      // For updates, we'll be more lenient
      const maxAcceptableTime = BULK_OPERATION_SIZE * MAX_RESPONSE_TIME_MS;
      expect(totalTime).toBeLessThan(maxAcceptableTime);
    });
  });
  
  // Pagination performance
  describe('Pagination performance', () => {
    it('should maintain consistent response times across pages', async () => {
      // First page
      const firstPageTime = await measureResponseTime(() => 
        axios.get(`${API_BASE}/test-cases?page=1&pageSize=10`)
      );
      
      // Second page (if available)
      const secondPageTime = await measureResponseTime(() => 
        axios.get(`${API_BASE}/test-cases?page=2&pageSize=10`)
      );
      
      // Time difference should not be too significant
      const timeDiff = Math.abs(secondPageTime - firstPageTime);
      expect(timeDiff).toBeLessThan(MAX_RESPONSE_TIME_MS / 2);
    });
    
    it('should handle different page sizes efficiently', async () => {
      // Small page size
      const smallPageTime = await measureResponseTime(() => 
        axios.get(`${API_BASE}/test-cases?page=1&pageSize=5`)
      );
      
      // Larger page size
      const largePageTime = await measureResponseTime(() => 
        axios.get(`${API_BASE}/test-cases?page=1&pageSize=20`)
      );
      
      // Larger page should not be significantly slower
      // (allowing for some overhead)
      expect(largePageTime).toBeLessThan(smallPageTime * 2);
    });
  });
  
  // Search and filter performance
  describe('Search and filter performance', () => {
    it('should efficiently handle filtered queries', async () => {
      const filterResponseTime = await measureResponseTime(() => 
        axios.get(`${API_BASE}/test-cases?status=DRAFT&priority=LOW`)
      );
      
      expect(filterResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
    
    // This test will be skipped if full-text search is not implemented yet
    it('should perform text search within acceptable time', async () => {
      try {
        const searchResponseTime = await measureResponseTime(() => 
          axios.get(`${API_BASE}/test-cases?search=performance`)
        );
        
        // Search might be slower, so we allow more time
        expect(searchResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS * 2);
      } catch (error: any) {
        if (error.response && error.response.status === 400) {
          // Search not implemented yet
          console.warn('Search functionality not implemented yet');
          pending('Search not implemented');
        } else {
          throw error;
        }
      }
    });
  });
  
  // Error handling performance
  describe('Error handling performance', () => {
    it('should respond quickly to validation errors', async () => {
      const errorResponseTime = await measureResponseTime(async () => {
        try {
          // Create test case with missing required field (title)
          await axios.post(`${API_BASE}/test-cases`, {
            description: 'Test case with validation error'
          });
        } catch (error) {
          // Expected error, ignore
        }
      });
      
      expect(errorResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
    
    it('should respond quickly to not found errors', async () => {
      const errorResponseTime = await measureResponseTime(async () => {
        try {
          await axios.get(`${API_BASE}/test-cases/nonexistent-id`);
        } catch (error) {
          // Expected error, ignore
        }
      });
      
      expect(errorResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
  });
  
  // Cleanup
  afterAll(async () => {
    // Clean up created test cases
    if (createdTestCaseIds.length > 0) {
      try {
        await Promise.all(
          createdTestCaseIds.map(id => 
            axios.delete(`${API_BASE}/test-cases/${id}`)
          )
        );
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Could not clean up all test cases');
      }
    }
  });
});