/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Pulse API Client
 * 
 * Client for interacting with the qTest Pulse API for metrics and insights.
 */

import { QTestClient, QTestClientConfig } from '../api-client';
import { AxiosRequestConfig } from 'axios';
import { ExternalServiceError } from '../../../../pkg/domain/errors/DomainErrors';

/**
 * Insight data model from qTest Pulse
 */
export interface Insight {
  id: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  trend?: string;
  lastUpdated?: string;
}

/**
 * Metric definition model from qTest Pulse
 */
export interface Metric {
  id: string;
  name: string;
  description?: string;
  formula?: string;
  parameters?: any[];
}

/**
 * Trend data point model
 */
export interface TrendDataPoint {
  date: string;
  value: number;
}

/**
 * Trend data model from qTest Pulse
 */
export interface TrendData {
  metric: string;
  dataPoints: TrendDataPoint[];
  startDate?: string;
  endDate?: string;
}

/**
 * Widget model for dashboards
 */
export interface Widget {
  id: string;
  type: string;
  title: string;
  metrics: string[];
  config?: Record<string, any>;
}

/**
 * Dashboard model from qTest Pulse
 */
export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
}

/**
 * Options for fetching insights
 */
export interface InsightOptions {
  type?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Options for fetching metrics
 */
export interface MetricOptions {
  category?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Options for fetching trend data
 */
export interface TrendOptions {
  startDate?: string;
  endDate?: string;
  interval?: 'day' | 'week' | 'month';
}

/**
 * Options for fetching dashboards
 */
export interface DashboardOptions {
  page?: number;
  pageSize?: number;
}

/**
 * qTest Pulse API client
 */
export class QTestPulseClient extends QTestClient {
  /**
   * Constructor for the qTest Pulse client
   */
  constructor(config: QTestClientConfig) {
    super(config);
  }

  /**
   * Get insights from qTest Pulse
   */
  async getInsights(
    projectId: string | number,
    options: InsightOptions = {}
  ): Promise<Insight[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/insights`,
        { params: options }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get insights from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get metrics definitions from qTest Pulse
   */
  async getMetrics(
    projectId: string | number,
    options: MetricOptions = {}
  ): Promise<Metric[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/metrics`,
        { params: options }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get metrics from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get metric data from qTest Pulse
   */
  async getMetricData(
    projectId: string | number,
    metricId: string,
    options: TrendOptions = {}
  ): Promise<any> {
    try {
      const response = await this.get(
        `/projects/${projectId}/metrics/${metricId}/data`,
        { params: options }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get metric data from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get trend data from qTest Pulse
   */
  async getTrends(
    projectId: string | number,
    options: TrendOptions = {}
  ): Promise<TrendData[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/trends`,
        { params: options }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get trends from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get dashboards from qTest Pulse
   */
  async getDashboards(
    projectId: string | number,
    options: DashboardOptions = {}
  ): Promise<Dashboard[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/dashboards`,
        { params: options }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get dashboards from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get a specific dashboard from qTest Pulse
   */
  async getDashboard(
    projectId: string | number,
    dashboardId: string
  ): Promise<Dashboard> {
    try {
      const response = await this.get(
        `/projects/${projectId}/dashboards/${dashboardId}`
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get dashboard from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get integration configurations from qTest Pulse
   */
  async getIntegrations(
    projectId: string | number
  ): Promise<any[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/integrations`
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get integrations from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get webhook configurations from qTest Pulse
   */
  async getWebhooks(
    projectId: string | number
  ): Promise<any[]> {
    try {
      const response = await this.get(
        `/projects/${projectId}/webhooks`
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to get webhooks from qTest Pulse: ${error.message}`,
        error
      );
    }
  }

  /**
   * Calculate a custom metric in qTest Pulse
   */
  async calculateMetric(
    projectId: string | number,
    formula: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    try {
      const response = await this.post(
        `/projects/${projectId}/metrics/calculate`,
        { formula, parameters }
      );
      return response.data;
    } catch (error: any) {
      throw new ExternalServiceError(
        `Failed to calculate metric in qTest Pulse: ${error.message}`,
        error
      );
    }
  }
}