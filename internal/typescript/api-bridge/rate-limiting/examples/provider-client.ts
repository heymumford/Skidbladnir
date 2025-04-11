/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Example provider client implementation using the rate limiter
 */

import axios, { AxiosInstance } from 'axios';
import { getRateLimiter } from '../rate-limiter-factory';

export class ProviderClient {
  private axiosInstance: AxiosInstance;
  private providerName: string;
  
  constructor(
    providerName: string,
    baseUrl: string,
    authToken?: string
  ) {
    this.providerName = providerName;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      }
    });
    
    // Get rate limiter and apply interceptors
    const rateLimiter = getRateLimiter();
    const interceptors = rateLimiter.createAxiosInterceptor(providerName);
    
    // Apply interceptors - using any to bypass type checking in the example file
    // In a real implementation, we would use the proper InternalAxiosRequestConfig type
    this.axiosInstance.interceptors.request.use(interceptors.request as any);
    this.axiosInstance.interceptors.response.use(
      interceptors.response,
      interceptors.error
    );
  }
  
  /**
   * Get rate limit metrics for this provider
   */
  public getRateLimitMetrics() {
    const rateLimiter = getRateLimiter();
    return rateLimiter.getMetrics(this.providerName);
  }
  
  /**
   * Reset rate limiter for this provider
   */
  public resetRateLimiter() {
    const rateLimiter = getRateLimiter();
    rateLimiter.reset(this.providerName);
  }
  
  /**
   * Get test cases from the provider
   */
  public async getTestCases(params?: any) {
    try {
      const response = await this.axiosInstance.get('/api/test-cases', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching test cases from ${this.providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific test case
   */
  public async getTestCase(id: string) {
    try {
      const response = await this.axiosInstance.get(`/api/test-cases/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching test case ${id} from ${this.providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a test case
   */
  public async createTestCase(testCase: any) {
    try {
      const response = await this.axiosInstance.post('/api/test-cases', testCase);
      return response.data;
    } catch (error) {
      console.error(`Error creating test case in ${this.providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a test case
   */
  public async updateTestCase(id: string, testCase: any) {
    try {
      const response = await this.axiosInstance.put(`/api/test-cases/${id}`, testCase);
      return response.data;
    } catch (error) {
      console.error(`Error updating test case ${id} in ${this.providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a test case
   */
  public async deleteTestCase(id: string) {
    try {
      const response = await this.axiosInstance.delete(`/api/test-cases/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting test case ${id} in ${this.providerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Batch retrieve test cases
   */
  public async batchGetTestCases(ids: string[]) {
    try {
      const response = await this.axiosInstance.post('/api/test-cases/batch', { ids });
      return response.data;
    } catch (error) {
      console.error(`Error batch retrieving test cases from ${this.providerName}:`, error);
      throw error;
    }
  }
}

// Example usage
async function _example() {
  const rallyClient = new ProviderClient(
    'rally',
    'https://rally1.rallydev.com/slm/webservice/v2.0',
    'YOUR_API_KEY'
  );
  
  try {
    // Get test cases (automatically rate limited)
    const testCases = await rallyClient.getTestCases({ project: 'Sample Project' });
    console.log(`Retrieved ${testCases.length} test cases`);
    
    // Check rate limit metrics
    const metrics = rallyClient.getRateLimitMetrics();
    console.log(`Requests in last minute: ${metrics.requestsLastMinute}`);
    console.log(`Current delay: ${metrics.currentDelayMs}ms`);
    
    // Batch operations are also rate limited
    if (testCases.length > 0) {
      const ids = testCases.slice(0, 5).map((tc: any) => tc.id);
      const batchResults = await rallyClient.batchGetTestCases(ids);
      console.log(`Retrieved ${batchResults.length} test cases in batch`);
    }
  } catch (error) {
    console.error('Error in example:', error);
  }
}