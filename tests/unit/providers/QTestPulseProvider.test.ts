/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * QTestPulseProvider unit tests
 * 
 * This file contains tests for the qTest Pulse provider implementation.
 */

import { QTestPulseProvider } from '../../../packages/providers/qtest/pulse-provider';
import { 
  QTestPulseClient, 
  Insight, 
  Metric,
  TrendData,
  Dashboard
} from '../../../packages/providers/qtest/api-client/pulse-client';

// Mock the QTestPulseClient class
jest.mock('../../../packages/providers/qtest/api-client/pulse-client', () => {
  const originalModule = jest.requireActual('../../../packages/providers/qtest/api-client/pulse-client');
  
  return {
    ...originalModule,
    QTestPulseClient: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      post: jest.fn(),
      getInsights: jest.fn(),
      getMetrics: jest.fn(),
      getMetricData: jest.fn(),
      getTrends: jest.fn(),
      getDashboards: jest.fn(),
      getDashboard: jest.fn(),
      getIntegrations: jest.fn(),
      getWebhooks: jest.fn(),
      calculateMetric: jest.fn()
    }))
  };
});

describe('QTestPulseProvider', () => {
  let provider: QTestPulseProvider;
  let mockClient: jest.Mocked<QTestPulseClient>;
  
  beforeEach(() => {
    // Create a new provider instance
    provider = new QTestPulseProvider();
    
    // Initialize the provider with test configuration
    return provider.initialize({
      baseUrl: 'https://test.qtest.com',
      apiToken: 'test-token',
      defaultProjectId: 123
    }).then(() => {
      // Get the mock client instance
      mockClient = (provider as any).client;
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('testConnection', () => {
    it('should return connected=true when metrics API call succeeds', async () => {
      // Mock the getMetrics call to return successfully
      mockClient.getMetrics.mockResolvedValueOnce([]);
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(true);
      expect(mockClient.getMetrics).toHaveBeenCalled();
    });
    
    it('should return connected=false when metrics API call fails', async () => {
      // Mock the getMetrics call to throw an error
      mockClient.getMetrics.mockRejectedValueOnce(new Error('API error'));
      
      const result = await provider.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toBe('API error');
      expect(mockClient.getMetrics).toHaveBeenCalled();
    });
  });
  
  describe('getInsights', () => {
    it('should return insights with pagination information', async () => {
      const mockInsights: Insight[] = [
        {
          id: '1',
          name: 'Test Insight 1',
          type: 'test-progress',
          value: 85.5
        },
        {
          id: '2',
          name: 'Test Insight 2',
          type: 'test-quality',
          value: 92.3,
          description: 'Quality score'
        }
      ];
      
      mockClient.getInsights.mockResolvedValueOnce(mockInsights);
      
      const result = await provider.getInsights('123');
      
      expect(result.items).toEqual(mockInsights);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(mockClient.getInsights).toHaveBeenCalledWith('123', {});
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics with pagination information', async () => {
      const mockMetrics: Metric[] = [
        {
          id: '1',
          name: 'Test Coverage',
          formula: 'executed/total*100'
        },
        {
          id: '2',
          name: 'Defect Density',
          formula: 'defects/loc',
          description: 'Defects per line of code'
        }
      ];
      
      mockClient.getMetrics.mockResolvedValueOnce(mockMetrics);
      
      const result = await provider.getMetrics('123');
      
      expect(result.items).toEqual(mockMetrics);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(mockClient.getMetrics).toHaveBeenCalledWith('123', {});
    });
  });
  
  describe('getMetricData', () => {
    it('should apply default date range if not provided', async () => {
      const mockData = {
        id: '1',
        name: 'Test Coverage',
        values: [85, 86, 87, 89, 90]
      };
      
      mockClient.getMetricData.mockResolvedValueOnce(mockData);
      
      const result = await provider.getMetricData('123', '1');
      
      expect(result).toEqual(mockData);
      expect(mockClient.getMetricData).toHaveBeenCalledWith('123', '1', expect.objectContaining({
        interval: 'day',
        startDate: expect.any(String),
        endDate: expect.any(String)
      }));
    });
    
    it('should use provided date range and interval', async () => {
      const mockData = {
        id: '1',
        name: 'Test Coverage',
        values: [85, 86, 87, 89, 90]
      };
      
      mockClient.getMetricData.mockResolvedValueOnce(mockData);
      
      const options = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        interval: 'week' as const
      };
      
      const result = await provider.getMetricData('123', '1', options);
      
      expect(result).toEqual(mockData);
      expect(mockClient.getMetricData).toHaveBeenCalledWith('123', '1', options);
    });
  });
  
  describe('getTrends', () => {
    it('should return trend data with pagination information', async () => {
      const mockTrends: TrendData[] = [
        {
          metric: 'Test Coverage',
          dataPoints: [
            { date: '2023-01-01', value: 85 },
            { date: '2023-01-02', value: 86 },
            { date: '2023-01-03', value: 87 }
          ]
        }
      ];
      
      mockClient.getTrends.mockResolvedValueOnce(mockTrends);
      
      const result = await provider.getTrends('123');
      
      expect(result.items).toEqual(mockTrends);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
      expect(mockClient.getTrends).toHaveBeenCalledWith('123', expect.objectContaining({
        interval: 'day',
        startDate: expect.any(String),
        endDate: expect.any(String)
      }));
    });
  });
  
  describe('getDashboards', () => {
    it('should return dashboards with pagination information', async () => {
      const mockDashboards: Dashboard[] = [
        {
          id: '1',
          name: 'Test Dashboard',
          widgets: [
            {
              id: 'w1',
              type: 'line-chart',
              title: 'Test Progress',
              metrics: ['test-progress']
            }
          ]
        }
      ];
      
      mockClient.getDashboards.mockResolvedValueOnce(mockDashboards);
      
      const result = await provider.getDashboards('123');
      
      expect(result.items).toEqual(mockDashboards);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
      expect(mockClient.getDashboards).toHaveBeenCalledWith('123', {});
    });
  });
});