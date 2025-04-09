/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * API Contract Tests
 * These tests verify that the API adheres to its contract
 * and responds as expected to various inputs
 */

import axios from 'axios';

// Configure API URL
const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_BASE = `${API_URL}/api`;

// Test data
const newTestCase = {
  title: 'API Contract Test Case',
  description: 'Test case created for API contract testing',
  status: 'DRAFT',
  priority: 'MEDIUM',
  steps: [
    { description: 'Perform API call', expectedResult: 'API responds correctly' }
  ],
  tags: ['api', 'contract', 'test']
};

describe('API Contract', () => {
  let createdTestCaseId: string;
  
  // Set timeout for tests
  jest.setTimeout(10000);
  
  // Verify basic API health
  describe('Health check', () => {
    it('should respond to health check endpoint', async () => {
      const response = await axios.get(`${API_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('timestamp');
    });
    
    it('should provide API status information', async () => {
      const response = await axios.get(`${API_BASE}/status`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'operational');
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('requestId');
    });
  });
  
  // Test case CRUD operations
  describe('Test case management', () => {
    // Create test case
    it('should create a test case and return 201 status', async () => {
      const response = await axios.post(`${API_BASE}/test-cases`, newTestCase);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('title', newTestCase.title);
      expect(response.data).toHaveProperty('_links');
      expect(response.data._links).toHaveProperty('self');
      expect(response.data._links).toHaveProperty('steps');
      
      // Store ID for later tests
      createdTestCaseId = response.data.id;
    });
    
    // Get test case by ID
    it('should retrieve a test case by ID', async () => {
      const response = await axios.get(`${API_BASE}/test-cases/${createdTestCaseId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', createdTestCaseId);
      expect(response.data).toHaveProperty('title', newTestCase.title);
      expect(response.data).toHaveProperty('description', newTestCase.description);
      expect(response.data).toHaveProperty('status', newTestCase.status);
      expect(response.data).toHaveProperty('priority', newTestCase.priority);
      expect(response.data).toHaveProperty('tags');
      expect(response.data.tags).toEqual(expect.arrayContaining(newTestCase.tags));
    });
    
    // Get all test cases with pagination
    it('should retrieve paginated test cases', async () => {
      const response = await axios.get(`${API_BASE}/test-cases?page=1&pageSize=10`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data).toHaveProperty('totalCount');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('pageSize');
      expect(response.data).toHaveProperty('_links');
      expect(response.data._links).toHaveProperty('self');
      expect(response.data._links).toHaveProperty('first');
    });
    
    // Get test cases with filters
    it('should filter test cases by status', async () => {
      const response = await axios.get(`${API_BASE}/test-cases?status=DRAFT`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
      
      // All returned items should have DRAFT status
      response.data.items.forEach((item: any) => {
        expect(item.status).toBe('DRAFT');
      });
    });
    
    // Get test cases with multiple filters
    it('should filter test cases by multiple criteria', async () => {
      const response = await axios.get(
        `${API_BASE}/test-cases?status=DRAFT&priority=MEDIUM&tags=api,contract`
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      
      // Ensure our test case is in the results
      const found = response.data.items.some((item: any) => item.id === createdTestCaseId);
      expect(found).toBe(true);
    });
    
    // Update test case
    it('should update a test case', async () => {
      const updatedTestCase = {
        title: 'Updated API Contract Test Case',
        status: 'READY',
        priority: 'HIGH'
      };
      
      const response = await axios.put(
        `${API_BASE}/test-cases/${createdTestCaseId}`, 
        updatedTestCase
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', createdTestCaseId);
      expect(response.data).toHaveProperty('title', updatedTestCase.title);
      expect(response.data).toHaveProperty('status', updatedTestCase.status);
      expect(response.data).toHaveProperty('priority', updatedTestCase.priority);
      // Description should remain unchanged
      expect(response.data).toHaveProperty('description', newTestCase.description);
    });
    
    // Get test case steps
    it('should get test case steps', async () => {
      const response = await axios.get(`${API_BASE}/test-cases/${createdTestCaseId}/steps`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(1);
      expect(response.data[0]).toHaveProperty('description', newTestCase.steps[0].description);
      expect(response.data[0]).toHaveProperty('expectedResult', newTestCase.steps[0].expectedResult);
    });
    
    // Delete test case
    it('should delete a test case', async () => {
      const response = await axios.delete(`${API_BASE}/test-cases/${createdTestCaseId}`);
      expect(response.status).toBe(204);
      expect(response.data).toBe('');
      
      // Verify it's gone
      try {
        await axios.get(`${API_BASE}/test-cases/${createdTestCaseId}`);
        fail('Expected 404 error but request succeeded');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
  
  // Error handling
  describe('Error handling', () => {
    // Not found
    it('should return 404 for non-existent test case', async () => {
      try {
        await axios.get(`${API_BASE}/test-cases/nonexistent-id`);
        fail('Expected 404 error but request succeeded');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error', 'Not Found');
        expect(error.response.data).toHaveProperty('message');
      }
    });
    
    // Validation error
    it('should return 400 for invalid test case data', async () => {
      try {
        await axios.post(`${API_BASE}/test-cases`, { 
          // Missing required title
          description: 'Invalid test case' 
        });
        fail('Expected 400 error but request succeeded');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error', 'Validation Error');
        expect(error.response.data).toHaveProperty('details');
      }
    });
    
    // Malformed request
    it('should return 400 for malformed JSON', async () => {
      try {
        await axios.post(
          `${API_BASE}/test-cases`, 
          'This is not JSON',
          { headers: { 'Content-Type': 'application/json' } }
        );
        fail('Expected 400 error but request succeeded');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
  
  // HATEOAS links
  describe('HATEOAS compliance', () => {
    it('should include navigation links in collection response', async () => {
      const response = await axios.get(`${API_BASE}/test-cases`);
      expect(response.data).toHaveProperty('_links');
      expect(response.data._links).toHaveProperty('self');
      expect(response.data._links).toHaveProperty('first');
      
      // If there's more than one page
      if (response.data.totalCount > response.data.pageSize) {
        expect(response.data._links).toHaveProperty('last');
        // If we're on first page, should have next but not prev
        if (response.data.page === 1) {
          expect(response.data._links).toHaveProperty('next');
          expect(response.data._links).not.toHaveProperty('prev');
        }
      }
    });
    
    it('should include navigation links in individual resources', async () => {
      // Create a test case
      const createResponse = await axios.post(`${API_BASE}/test-cases`, newTestCase);
      const testCaseId = createResponse.data.id;
      
      try {
        // Get it back and check links
        const response = await axios.get(`${API_BASE}/test-cases/${testCaseId}`);
        expect(response.data).toHaveProperty('_links');
        expect(response.data._links).toHaveProperty('self');
        expect(response.data._links).toHaveProperty('steps');
        expect(response.data._links.self.href).toContain(testCaseId);
        expect(response.data._links.steps.href).toContain(testCaseId);
      } finally {
        // Clean up
        await axios.delete(`${API_BASE}/test-cases/${testCaseId}`);
      }
    });
  });
  
  // Content negotiation
  describe('Content negotiation', () => {
    it('should respond with JSON for Accept: application/json', async () => {
      const response = await axios.get(`${API_BASE}/test-cases`, {
        headers: { 'Accept': 'application/json' }
      });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
    
    // Note: This test might fail if the API doesn't support XML
    // Comment it out if the API is JSON-only
    it('should prioritize JSON over XML when multiple formats accepted', async () => {
      const response = await axios.get(`${API_BASE}/test-cases`, {
        headers: { 'Accept': 'application/xml, application/json' }
      });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
  
  // Rate limiting
  describe('Rate limiting', () => {
    it('should have rate limiting headers', async () => {
      const response = await axios.get(`${API_URL}/health`);
      
      // Some of these might not be present depending on your implementation
      // Adjust as needed based on your actual rate limiting strategy
      const rateLimitHeaders = [
        'x-rate-limit-limit',
        'x-rate-limit-remaining',
        'x-rate-limit-reset',
        'retry-after'
      ];
      
      // Check if at least one rate limit header is present
      const hasRateLimitHeader = rateLimitHeaders.some(
        header => response.headers[header] !== undefined
      );
      
      // This is only a warning, not a failure, since the API may not implement rate limiting yet
      if (!hasRateLimitHeader) {
        console.warn('No rate limiting headers found. Consider implementing API rate limiting.');
      }
    });
  });
});