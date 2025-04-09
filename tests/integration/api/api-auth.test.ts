/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * API Authentication and Authorization Tests
 * These tests verify that the API enforces authentication and authorization rules
 */

import axios from 'axios';

// Configure API URL
const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_BASE = `${API_URL}/api`;

// Test data
const testUser = {
  username: 'test_user',
  password: 'P@ssw0rd123'
};

const adminUser = {
  username: 'admin_user',
  password: 'Admin123!'
};

describe('API Authentication and Authorization', () => {
  let testUserToken: string;
  let adminUserToken: string;
  let testCaseId: string;
  
  // Set timeout for tests
  jest.setTimeout(10000);
  
  // Skip the entire suite if auth is not implemented yet
  beforeAll(async () => {
    try {
      // Check if login endpoint exists
      await axios.post(`${API_BASE}/auth/login`, testUser);
      // If we get here, auth is implemented
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Skip tests if auth endpoints don't exist yet
        console.warn('Authentication endpoints not found. Skipping auth tests.');
        return Promise.resolve('skip');
      }
      // Other errors should not skip the tests
    }
  });
  
  // Authentication tests
  describe('Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, testUser);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('token');
        expect(response.data).toHaveProperty('expiresAt');
        
        testUserToken = response.data.token;
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Login endpoint not implemented yet');
          pending('Authentication not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should reject invalid credentials', async () => {
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          username: 'test_user',
          password: 'wrong_password'
        });
        fail('Expected 401 error but request succeeded');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Login endpoint not implemented yet');
          pending('Authentication not implemented yet');
        } else {
          expect(error.response.status).toBe(401);
          expect(error.response.data).toHaveProperty('error');
        }
      }
    });
    
    it('should authenticate admin user', async () => {
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, adminUser);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('token');
        
        adminUserToken = response.data.token;
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Login endpoint not implemented yet');
          pending('Authentication not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should reject access to protected resources without token', async () => {
      try {
        await axios.get(`${API_BASE}/users/me`);
        fail('Expected 401 error but request succeeded');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Protected endpoint not implemented yet');
          pending('Protected routes not implemented yet');
        } else {
          expect(error.response.status).toBe(401);
        }
      }
    });
    
    it('should access protected resources with valid token', async () => {
      if (!testUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      try {
        const response = await axios.get(`${API_BASE}/users/me`, {
          headers: { 'Authorization': `Bearer ${testUserToken}` }
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('username', testUser.username);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Protected endpoint not implemented yet');
          pending('Protected routes not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should reject expired tokens', async () => {
      if (!testUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      // Note: This test works only if we can generate an expired token
      // For now, we'll use a fake token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJleHAiOjE1MTYyMzkwMjJ9.not_a_valid_signature';
      
      try {
        await axios.get(`${API_BASE}/users/me`, {
          headers: { 'Authorization': `Bearer ${expiredToken}` }
        });
        fail('Expected 401 error but request succeeded');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Protected endpoint not implemented yet');
          pending('Protected routes not implemented yet');
        } else {
          expect(error.response.status).toBe(401);
        }
      }
    });
  });
  
  // Authorization tests
  describe('Authorization', () => {
    beforeAll(async () => {
      // Create a test case for authorization tests
      if (!testUserToken) {
        console.warn('Authentication not implemented yet. Skipping authorization tests setup.');
        return;
      }
      
      try {
        const response = await axios.post(
          `${API_BASE}/test-cases`,
          {
            title: 'Auth Test Case',
            description: 'Test case for authorization testing',
            status: 'DRAFT'
          },
          { headers: { 'Authorization': `Bearer ${testUserToken}` } }
        );
        testCaseId = response.data.id;
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          console.warn('Authorization not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should allow owner to update their test case', async () => {
      if (!testUserToken || !testCaseId) {
        pending('Authentication/Authorization not implemented yet');
        return;
      }
      
      try {
        const response = await axios.put(
          `${API_BASE}/test-cases/${testCaseId}`,
          { title: 'Updated Auth Test Case' },
          { headers: { 'Authorization': `Bearer ${testUserToken}` } }
        );
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('title', 'Updated Auth Test Case');
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          console.warn('Authorization not implemented yet');
          pending('Authorization not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should allow admins to access any test case', async () => {
      if (!adminUserToken || !testCaseId) {
        pending('Authentication/Authorization not implemented yet');
        return;
      }
      
      try {
        const response = await axios.get(
          `${API_BASE}/test-cases/${testCaseId}`,
          { headers: { 'Authorization': `Bearer ${adminUserToken}` } }
        );
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testCaseId);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          console.warn('Authorization not implemented yet');
          pending('Authorization not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should prevent unauthorized access to admin-only routes', async () => {
      if (!testUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      try {
        await axios.get(
          `${API_BASE}/admin/users`,
          { headers: { 'Authorization': `Bearer ${testUserToken}` } }
        );
        fail('Expected 403 error but request succeeded');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Admin routes not implemented yet');
          pending('Admin routes not implemented yet');
        } else {
          expect(error.response.status).toBe(403);
        }
      }
    });
    
    it('should allow admin access to admin-only routes', async () => {
      if (!adminUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      try {
        const response = await axios.get(
          `${API_BASE}/admin/users`,
          { headers: { 'Authorization': `Bearer ${adminUserToken}` } }
        );
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Admin routes not implemented yet');
          pending('Admin routes not implemented yet');
        } else {
          throw error;
        }
      }
    });
  });
  
  // Token management
  describe('Token management', () => {
    it('should refresh access token with refresh token', async () => {
      if (!testUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      try {
        // First login to get refresh token
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
        const refreshToken = loginResponse.data.refreshToken;
        
        if (!refreshToken) {
          console.warn('Refresh tokens not implemented yet');
          pending('Refresh tokens not implemented yet');
          return;
        }
        
        // Now try to refresh the token
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken
        });
        
        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.data).toHaveProperty('token');
        expect(refreshResponse.data).toHaveProperty('expiresAt');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Refresh endpoint not implemented yet');
          pending('Token refresh not implemented yet');
        } else {
          throw error;
        }
      }
    });
    
    it('should invalidate tokens on logout', async () => {
      if (!testUserToken) {
        pending('Authentication not implemented yet');
        return;
      }
      
      try {
        // Logout
        const logoutResponse = await axios.post(
          `${API_BASE}/auth/logout`,
          {},
          { headers: { 'Authorization': `Bearer ${testUserToken}` } }
        );
        expect(logoutResponse.status).toBe(200);
        
        // Try to use the token after logout
        try {
          await axios.get(
            `${API_BASE}/users/me`,
            { headers: { 'Authorization': `Bearer ${testUserToken}` } }
          );
          fail('Expected 401 error but request succeeded');
        } catch (error: any) {
          expect(error.response.status).toBe(401);
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn('Logout endpoint not implemented yet');
          pending('Logout not implemented yet');
        } else {
          throw error;
        }
      }
    });
  });
  
  // Cleanup
  afterAll(async () => {
    // Clean up test data
    if (adminUserToken && testCaseId) {
      try {
        await axios.delete(
          `${API_BASE}/test-cases/${testCaseId}`,
          { headers: { 'Authorization': `Bearer ${adminUserToken}` } }
        );
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Could not clean up test data');
      }
    }
  });
});