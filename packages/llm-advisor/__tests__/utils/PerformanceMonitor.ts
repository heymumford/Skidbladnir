/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestId: string;
  timestamp: string;
  duration: number; // in milliseconds
  endpoint: string;
  method: string;
  statusCode: number;
  requestSize: number; // in bytes
  responseSize: number; // in bytes
  cacheHit: boolean;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  successful: boolean;
  errorType?: string;
  errorMessage?: string;
}

/**
 * Performance statistics for a series of requests
 */
export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHitRate: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  averagePromptTokens: number;
  averageCompletionTokens: number;
  totalTokens: number;
  errorTypes: Record<string, number>;
  startTime: string;
  endTime: string;
}

/**
 * Utility for monitoring API performance in tests
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private requestStartTimes: Map<string, number> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Start timing a request
   */
  startRequest(requestId: string): void {
    this.requestStartTimes.set(requestId, Date.now());
  }

  /**
   * Record completion of a request
   */
  recordRequest(metrics: Omit<PerformanceMetrics, 'timestamp' | 'duration'>): PerformanceMetrics {
    const startTime = this.requestStartTimes.get(metrics.requestId) || Date.now();
    const duration = Date.now() - startTime;
    
    const completeMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
      duration
    };
    
    this.metrics.push(completeMetrics);
    this.requestStartTimes.delete(metrics.requestId);
    
    return completeMetrics;
  }

  /**
   * Measure a complete request
   */
  async measureRequest<_T>(
    endpoint: string,
    method: string,
    options: RequestInit = {}
  ): Promise<{ response: Response; metrics: PerformanceMetrics }> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.startRequest(requestId);
    
    const url = new URL(endpoint, this.baseUrl).toString();
    const requestSize = JSON.stringify(options.body || '').length;
    
    let response: Response;
    let metrics: PerformanceMetrics;
    
    try {
      response = await fetch(url, { method, ...options });
      const responseText = await response.text();
      const responseSize = responseText.length;
      
      // Extract metrics from response headers
      const promptTokens = parseInt(response.headers.get('x-prompt-tokens') || '0', 10);
      const completionTokens = parseInt(response.headers.get('x-completion-tokens') || '0', 10);
      const totalTokens = promptTokens + completionTokens;
      const cacheHit = response.headers.get('x-cache') === 'HIT';
      const model = response.headers.get('x-model') || 'unknown';
      
      metrics = this.recordRequest({
        requestId,
        endpoint,
        method,
        statusCode: response.status,
        requestSize,
        responseSize,
        cacheHit,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        successful: response.ok
      });
      
      // Recreate response with the text we already read
      response = new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
    } catch (error) {
      metrics = this.recordRequest({
        requestId,
        endpoint,
        method,
        statusCode: 0,
        requestSize,
        responseSize: 0,
        cacheHit: false,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        successful: false,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
    
    return { response, metrics };
  }

  /**
   * Generate performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cacheHitRate: 0,
        averageDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        averagePromptTokens: 0,
        averageCompletionTokens: 0,
        totalTokens: 0,
        errorTypes: {},
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };
    }
    
    const successful = this.metrics.filter(m => m.successful);
    const failed = this.metrics.filter(m => !m.successful);
    const cacheHits = this.metrics.filter(m => m.cacheHit);
    
    // Sort durations for percentile calculations
    const sortedDurations = [...this.metrics.map(m => m.duration)].sort((a, b) => a - b);
    
    // Calculate error type distribution
    const errorTypes: Record<string, number> = {};
    for (const metric of failed) {
      const type = metric.errorType || 'UnknownError';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    }
    
    // Find timestamp boundaries
    const sortedByTime = [...this.metrics].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      totalRequests: this.metrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      cacheHitRate: cacheHits.length / this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      p50Duration: sortedDurations[Math.floor(sortedDurations.length * 0.5)],
      p95Duration: sortedDurations[Math.floor(sortedDurations.length * 0.95)],
      p99Duration: sortedDurations[Math.floor(sortedDurations.length * 0.99)],
      averagePromptTokens: successful.reduce((sum, m) => sum + m.promptTokens, 0) / Math.max(1, successful.length),
      averageCompletionTokens: successful.reduce((sum, m) => sum + m.completionTokens, 0) / Math.max(1, successful.length),
      totalTokens: this.metrics.reduce((sum, m) => sum + m.totalTokens, 0),
      errorTypes,
      startTime: sortedByTime[0]?.timestamp || new Date().toISOString(),
      endTime: sortedByTime[sortedByTime.length - 1]?.timestamp || new Date().toISOString()
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.requestStartTimes.clear();
  }

  /**
   * Get all recorded metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by criteria
   */
  getFilteredMetrics(filter: Partial<PerformanceMetrics>): PerformanceMetrics[] {
    return this.metrics.filter(metric => {
      for (const [key, value] of Object.entries(filter)) {
        if (metric[key as keyof PerformanceMetrics] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}