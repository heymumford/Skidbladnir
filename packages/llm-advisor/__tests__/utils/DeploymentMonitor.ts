/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ContainerManager, ContainerStatus } from './ContainerManager';

/**
 * Deployment health status type
 */
export type DeploymentHealth = 'healthy' | 'degraded' | 'unhealthy' | 'initializing';

/**
 * Deployment metrics interface
 */
export interface DeploymentMetrics {
  startTime: string;
  uptime: number; // in seconds
  containers: {
    total: number;
    running: number;
    unhealthy: number;
    stopped: number;
  };
  response: {
    avg: number; // in ms
    p95: number; // 95th percentile in ms
    p99: number; // 99th percentile in ms
  };
  resources: {
    cpu: {
      usage: number; // percentage
      available: number; // percentage
    };
    memory: {
      used: number; // in MB
      available: number; // in MB
    };
  };
}

/**
 * Deployment event listener type
 */
type DeploymentEventListener = (event: string, data: any) => void;

/**
 * Utility for monitoring deployed applications
 */
export class DeploymentMonitor {
  private containerManager: ContainerManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private healthyThreshold = 90; // percentage of healthy containers to consider deployment healthy
  private listeners: DeploymentEventListener[] = [];
  private metrics: DeploymentMetrics;

  constructor(containerManager: ContainerManager) {
    this.containerManager = containerManager;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Start monitoring a deployment
   */
  startMonitoring(containerNames: string[], intervalMs = 5000): void {
    console.log(`Starting deployment monitoring for ${containerNames.length} containers`);
    this.startTime = new Date();
    this.metrics.startTime = this.startTime.toISOString();
    
    // Initialize metrics
    this.metrics.containers.total = containerNames.length;
    
    // Set up monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics(containerNames);
    }, intervalMs);
    
    // Trigger initial metrics collection
    this.collectMetrics(containerNames);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Deployment monitoring stopped');
    }
  }

  /**
   * Get current deployment health status
   */
  getHealth(): DeploymentHealth {
    if (!this.startTime) {
      return 'initializing';
    }
    
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    if (uptime < 30) {
      return 'initializing';
    }
    
    const { total, running, unhealthy } = this.metrics.containers;
    if (unhealthy > 0) {
      return 'degraded';
    }
    
    const healthPercentage = (running / total) * 100;
    if (healthPercentage < this.healthyThreshold) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get current metrics
   */
  getMetrics(): DeploymentMetrics {
    if (this.startTime) {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      this.metrics.uptime = uptime;
    }
    
    return { ...this.metrics };
  }

  /**
   * Subscribe to deployment events
   */
  subscribe(listener: DeploymentEventListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Collect metrics from all containers
   */
  private async collectMetrics(containerNames: string[]): Promise<void> {
    const containerStatuses: ContainerStatus[] = [];
    
    for (const name of containerNames) {
      const status = await this.containerManager.getContainerStatus(name);
      if (status) {
        containerStatuses.push(status);
      }
    }
    
    // Update container metrics
    this.metrics.containers.running = containerStatuses.filter(c => c.status === 'running').length;
    this.metrics.containers.unhealthy = containerStatuses.filter(c => 
      c.status === 'running' && c.healthStatus === 'unhealthy'
    ).length;
    this.metrics.containers.stopped = containerStatuses.filter(c => 
      c.status === 'stopped' || c.status === 'exited' || c.status === 'error'
    ).length;
    
    // Update resource metrics
    const cpuUsage = containerStatuses.reduce((sum, c) => sum + (c.cpu?.usage || 0), 0);
    const cpuAvailable = containerStatuses.reduce((sum, c) => sum + (c.cpu?.limit || 100), 0);
    const memoryUsed = containerStatuses.reduce((sum, c) => sum + (c.memory?.used || 0), 0);
    const memoryAvailable = containerStatuses.reduce((sum, c) => sum + (c.memory?.limit || 0), 0);
    
    this.metrics.resources.cpu.usage = cpuUsage / containerStatuses.length;
    this.metrics.resources.cpu.available = cpuAvailable;
    this.metrics.resources.memory.used = memoryUsed;
    this.metrics.resources.memory.available = memoryAvailable;
    
    // Simulate response metrics
    this.metrics.response.avg = Math.floor(50 + Math.random() * 50);
    this.metrics.response.p95 = this.metrics.response.avg * 1.5;
    this.metrics.response.p99 = this.metrics.response.avg * 2;
    
    // Emit metrics event
    this.emitEvent('metrics', this.metrics);
    
    // Check for health status changes
    const health = this.getHealth();
    this.emitEvent('health', health);
    
    // Check for container status changes
    for (const container of containerStatuses) {
      if (container.status === 'error' || container.healthStatus === 'unhealthy') {
        this.emitEvent('containerIssue', {
          container: container.name,
          status: container.status,
          health: container.healthStatus,
          message: container.errorMessage || 'Container health check failed'
        });
      }
    }
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): DeploymentMetrics {
    return {
      startTime: new Date().toISOString(),
      uptime: 0,
      containers: {
        total: 0,
        running: 0,
        unhealthy: 0,
        stopped: 0
      },
      response: {
        avg: 0,
        p95: 0,
        p99: 0
      },
      resources: {
        cpu: {
          usage: 0,
          available: 100
        },
        memory: {
          used: 0,
          available: 1024
        }
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: string, data: any): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }
}