/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ServiceHealthMonitor, ServiceHealth } from '../../../packages/common/src/utils/resilience/health-monitor';
import * as resilenceFactory from '../../../packages/common/src/utils/resilience/resilience-factory';

// Mock the resilience factory module
jest.mock('../../../packages/common/src/utils/resilience/resilience-factory', () => {
  return {
    getAllHealthStatus: jest.fn()
  };
});

// Mock the Logger class
jest.mock('../../../packages/common/src/utils/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      };
    })
  };
});

describe('ServiceHealthMonitor', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Stop any monitoring between tests
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.stopMonitoring();
  });
  
  it('should be a singleton', () => {
    // Arrange & Act
    const instance1 = ServiceHealthMonitor.getInstance();
    const instance2 = ServiceHealthMonitor.getInstance();
    
    // Assert
    expect(instance1).toBe(instance2);
  });
  
  it('should report healthy status by default', () => {
    // Arrange
    jest.spyOn(resilenceFactory, 'getAllHealthStatus').mockReturnValue(new Map());
    
    // Act
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.checkHealth();
    
    // Assert
    expect(monitor.getStatus()).toBe(ServiceHealth.HEALTHY);
    expect(monitor.isHealthy()).toBe(true);
    expect(monitor.isOperational()).toBe(true);
  });
  
  it('should report degraded status if any provider is degraded', () => {
    // Arrange
    const mockStatus = new Map([
      ['provider1', ServiceHealth.HEALTHY],
      ['provider2', ServiceHealth.DEGRADED],
      ['provider3', ServiceHealth.HEALTHY]
    ]);
    jest.spyOn(resilenceFactory, 'getAllHealthStatus').mockReturnValue(mockStatus);
    
    // Act
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.checkHealth();
    
    // Assert
    expect(monitor.getStatus()).toBe(ServiceHealth.DEGRADED);
    expect(monitor.isHealthy()).toBe(false);
    expect(monitor.isOperational()).toBe(true);
    
    // Check the detailed health report
    const health = monitor.getHealth();
    expect(health.providers.provider1.status).toBe(ServiceHealth.HEALTHY);
    expect(health.providers.provider2.status).toBe(ServiceHealth.DEGRADED);
    expect(health.providers.provider3.status).toBe(ServiceHealth.HEALTHY);
  });
  
  it('should report unhealthy status if any provider is unhealthy', () => {
    // Arrange
    const mockStatus = new Map([
      ['provider1', ServiceHealth.HEALTHY],
      ['provider2', ServiceHealth.DEGRADED],
      ['provider3', ServiceHealth.UNHEALTHY]
    ]);
    jest.spyOn(resilenceFactory, 'getAllHealthStatus').mockReturnValue(mockStatus);
    
    // Act
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.checkHealth();
    
    // Assert
    expect(monitor.getStatus()).toBe(ServiceHealth.UNHEALTHY);
    expect(monitor.isHealthy()).toBe(false);
    expect(monitor.isOperational()).toBe(false);
  });
  
  it('should handle errors when checking health', () => {
    // Arrange
    jest.spyOn(resilenceFactory, 'getAllHealthStatus').mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Act
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.checkHealth();
    
    // Assert
    expect(monitor.getStatus()).toBe(ServiceHealth.DEGRADED);
    expect(monitor.isHealthy()).toBe(false);
    expect(monitor.isOperational()).toBe(true);
  });
  
  it('should start and stop monitoring', () => {
    // Arrange
    jest.useFakeTimers();
    const checkHealthSpy = jest.spyOn(ServiceHealthMonitor.prototype as any, 'checkHealth');
    
    // Act - Start monitoring
    const monitor = ServiceHealthMonitor.getInstance();
    monitor.startMonitoring(1000);
    
    // Assert - Should check health immediately
    expect(checkHealthSpy).toHaveBeenCalledTimes(1);
    
    // Act - Advance time and check it called again
    jest.advanceTimersByTime(1000);
    expect(checkHealthSpy).toHaveBeenCalledTimes(2);
    
    // Act - Stop monitoring and advance time
    monitor.stopMonitoring();
    jest.advanceTimersByTime(1000);
    
    // Assert - Should not have called again
    expect(checkHealthSpy).toHaveBeenCalledTimes(2);
    
    // Clean up
    jest.useRealTimers();
  });
});