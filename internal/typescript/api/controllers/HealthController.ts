/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Request, Response } from 'express';
import { ServiceHealthMonitor, ServiceHealth } from '../../../../packages/common/src/utils/resilience/health-monitor';

/**
 * Health controller for the API
 * 
 * Provides endpoints for checking the health of the API and its dependencies
 */
export class HealthController {
  private healthMonitor: ServiceHealthMonitor;
  
  constructor() {
    // Get the singleton instance of the health monitor
    this.healthMonitor = ServiceHealthMonitor.getInstance();
    
    // Start monitoring service health
    this.healthMonitor.startMonitoring();
  }
  
  /**
   * Simple health check endpoint
   * Returns 200 OK if the API is running
   */
  public healthCheck = (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString()
    });
  };
  
  /**
   * Detailed health check endpoint
   * Returns the health status of the API and its dependencies
   */
  public healthStatus = (req: Request, res: Response): void => {
    // Get the current health status
    const health = this.healthMonitor.getHealth();
    
    // Determine HTTP status code based on health status
    let statusCode = 200;
    
    if (health.overallStatus === ServiceHealth.DEGRADED) {
      statusCode = 200; // Still operational, but with degraded performance
    } else if (health.overallStatus === ServiceHealth.UNHEALTHY) {
      statusCode = 503; // Service unavailable
    }
    
    // Return health status with appropriate HTTP status code
    res.status(statusCode).json({
      status: health.overallStatus,
      timestamp: new Date(health.timestamp).toISOString(),
      uptime: process.uptime(),
      providers: health.providers,
      version: process.env.npm_package_version || 'unknown'
    });
  };
  
  /**
   * Force a health check update
   * This is useful for testing or when you want to immediately update the health status
   */
  public forceHealthCheck = (req: Request, res: Response): void => {
    try {
      // Force a health check update
      const health = this.healthMonitor.checkHealth();
      
      // Return the updated health status
      res.status(200).json({
        status: health.overallStatus,
        timestamp: new Date(health.timestamp).toISOString(),
        message: 'Health check completed successfully',
        providers: health.providers
      });
    } catch (error) {
      res.status(500).json({
        status: ServiceHealth.DEGRADED,
        timestamp: new Date().toISOString(),
        message: 'Error forcing health check',
        error: (error as Error).message
      });
    }
  };
}