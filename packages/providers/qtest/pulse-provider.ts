/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Pulse Provider
 * 
 * Provider implementation for qTest Pulse metrics and insights.
 */

import {
  ProviderConfig as _ProviderConfig,
  ConnectionStatus,
  ProviderMetadata,
  ProviderCapabilities,
  EntityType
} from '../../common/src/interfaces/provider';

import { QTestProvider, QTestProviderConfig } from './index';
import { 
  QTestPulseClient, 
  Insight, 
  Metric, 
  TrendData, 
  Dashboard,
  InsightOptions,
  MetricOptions,
  TrendOptions,
  DashboardOptions
} from './api-client/pulse-client';
import { PaginatedResult } from '../../common/src/models/paginated';

/**
 * qTest Pulse Provider Configuration
 */
export interface QTestPulseProviderConfig extends QTestProviderConfig {
  /**
   * Period for fetching metrics (days)
   */
  metricsPeriodDays?: number;
  
  /**
   * Default interval for trend data
   */
  defaultInterval?: 'day' | 'week' | 'month';
}

/**
 * qTest Pulse Provider
 */
export class QTestPulseProvider extends QTestProvider {
  protected client: QTestPulseClient;
  private metricsPeriodDays = 30; // Default 30 days
  private defaultInterval: 'day' | 'week' | 'month' = 'day';

  /**
   * Default provider configuration
   */
  static readonly DEFAULT_CONFIG: Partial<QTestPulseProviderConfig> = {
    ...QTestProvider.DEFAULT_CONFIG,
    metricsPeriodDays: 30,
    defaultInterval: 'day'
  };

  /**
   * qTest Pulse provider capabilities
   */
  readonly capabilities: ProviderCapabilities = {
    canBeSource: true,
    canBeTarget: false,
    entityTypes: [
      EntityType.PROJECT,
      EntityType.METRIC,
      EntityType.DASHBOARD
    ],
    supportsAttachments: false,
    supportsExecutionHistory: false,
    supportsTestSteps: false,
    supportsHierarchy: false,
    supportsCustomFields: false
  };

  /**
   * Constructor for the qTest Pulse Provider
   */
  constructor() {
    super();
    this.id = 'qtest-pulse';
    this.name = 'qTest Pulse';
    this.version = '1.0.0';
  }

  /**
   * Initialize the qTest Pulse provider
   */
  async initialize(config: QTestPulseProviderConfig): Promise<void> {
    // Initialize parent with base configuration
    await super.initialize(config);
    
    // Initialize client specifically for Pulse
    this.client = new QTestPulseClient({
      ...config,
      serviceName: 'qTest Pulse'
    });
    
    // Get additional configuration
    this.metricsPeriodDays = config.metricsPeriodDays || QTestPulseProvider.DEFAULT_CONFIG.metricsPeriodDays!;
    this.defaultInterval = config.defaultInterval || QTestPulseProvider.DEFAULT_CONFIG.defaultInterval!;
  }

  /**
   * Test connection to qTest Pulse
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Use actual default project ID for test
      const projectId = this.defaultProjectId;

      // Try to get metrics - if this works, we have connectivity
      await this.client.getMetrics(projectId);
      
      return {
        connected: true,
        details: {
          product: 'qTest Pulse',
          baseUrl: this.baseUrl,
          projectId: this.defaultProjectId
        }
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      systemName: 'qTest Pulse',
      providerVersion: this.version,
      capabilities: this.capabilities,
      configSchema: {
        baseUrl: { type: 'string', required: true },
        apiToken: { type: 'string', required: false },
        username: { type: 'string', required: false },
        password: { type: 'string', required: false },
        defaultProjectId: { type: 'number', required: false },
        metricsPeriodDays: { type: 'number', required: false },
        defaultInterval: { type: 'string', required: false }
      }
    };
  }

  /**
   * Validate that project ID is provided
   */
  private validateProjectId(projectId: string): void {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
  }

  /**
   * Get insights from qTest Pulse
   */
  async getInsights(
    projectId: string = this.defaultProjectId?.toString() || '',
    options: InsightOptions = {}
  ): Promise<PaginatedResult<Insight>> {
    this.validateProjectId(projectId);
    
    // Get insights from API
    const insights = await this.client.getInsights(projectId, options);
    
    return {
      items: insights,
      total: insights.length,
      page: 1,
      pageSize: insights.length
    };
  }

  /**
   * Get metrics definitions from qTest Pulse
   */
  async getMetrics(
    projectId: string = this.defaultProjectId?.toString() || '',
    options: MetricOptions = {}
  ): Promise<PaginatedResult<Metric>> {
    this.validateProjectId(projectId);
    
    // Get metrics from API
    const metrics = await this.client.getMetrics(projectId, options);
    
    return {
      items: metrics,
      total: metrics.length,
      page: 1,
      pageSize: metrics.length
    };
  }

  /**
   * Get metric data from qTest Pulse
   */
  async getMetricData(
    projectId: string = this.defaultProjectId?.toString() || '',
    metricId: string,
    options: TrendOptions = {}
  ): Promise<any> {
    this.validateProjectId(projectId);
    
    // Apply default options if not provided
    const requestOptions: TrendOptions = {
      interval: this.defaultInterval,
      ...options
    };
    
    // If date range not specified, use default period
    if (!requestOptions.startDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.metricsPeriodDays);
      
      requestOptions.startDate = startDate.toISOString().split('T')[0];
      requestOptions.endDate = endDate.toISOString().split('T')[0];
    }
    
    // Get metric data from API
    return this.client.getMetricData(projectId, metricId, requestOptions);
  }

  /**
   * Get trend data from qTest Pulse
   */
  async getTrends(
    projectId: string = this.defaultProjectId?.toString() || '',
    options: TrendOptions = {}
  ): Promise<PaginatedResult<TrendData>> {
    this.validateProjectId(projectId);
    
    // Apply default options if not provided
    const requestOptions: TrendOptions = {
      interval: this.defaultInterval,
      ...options
    };
    
    // If date range not specified, use default period
    if (!requestOptions.startDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.metricsPeriodDays);
      
      requestOptions.startDate = startDate.toISOString().split('T')[0];
      requestOptions.endDate = endDate.toISOString().split('T')[0];
    }
    
    // Get trends from API
    const trends = await this.client.getTrends(projectId, requestOptions);
    
    return {
      items: trends,
      total: trends.length,
      page: 1,
      pageSize: trends.length
    };
  }

  /**
   * Get dashboards from qTest Pulse
   */
  async getDashboards(
    projectId: string = this.defaultProjectId?.toString() || '',
    options: DashboardOptions = {}
  ): Promise<PaginatedResult<Dashboard>> {
    this.validateProjectId(projectId);
    
    // Get dashboards from API
    const dashboards = await this.client.getDashboards(projectId, options);
    
    return {
      items: dashboards,
      total: dashboards.length,
      page: 1,
      pageSize: dashboards.length
    };
  }

  /**
   * Get a specific dashboard from qTest Pulse
   */
  async getDashboard(
    projectId: string = this.defaultProjectId?.toString() || '',
    dashboardId: string
  ): Promise<Dashboard> {
    this.validateProjectId(projectId);
    
    // Get dashboard from API
    return this.client.getDashboard(projectId, dashboardId);
  }

  /**
   * Get integration configurations from qTest Pulse
   */
  async getIntegrations(
    projectId: string = this.defaultProjectId?.toString() || ''
  ): Promise<any[]> {
    this.validateProjectId(projectId);
    
    // Get integrations from API
    return this.client.getIntegrations(projectId);
  }

  /**
   * Get webhook configurations from qTest Pulse
   */
  async getWebhooks(
    projectId: string = this.defaultProjectId?.toString() || ''
  ): Promise<any[]> {
    this.validateProjectId(projectId);
    
    // Get webhooks from API
    return this.client.getWebhooks(projectId);
  }

  /**
   * Calculate a custom metric in qTest Pulse
   */
  async calculateMetric(
    projectId: string = this.defaultProjectId?.toString() || '',
    formula: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    this.validateProjectId(projectId);
    
    // Calculate metric using API
    return this.client.calculateMetric(projectId, formula, parameters);
  }
}