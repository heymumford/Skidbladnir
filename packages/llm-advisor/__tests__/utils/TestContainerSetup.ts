/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ContainerManager, ContainerConfig } from './ContainerManager';

/**
 * Test container stack configuration
 */
export interface TestStackConfig {
  llmModel: string;
  useCache: boolean;
  includeMetrics: boolean;
  includeProxy: boolean;
  memoryLimits: boolean;
}

/**
 * Default test configuration
 */
export const defaultTestStackConfig: TestStackConfig = {
  llmModel: 'llama2-7b',
  useCache: true,
  includeMetrics: true,
  includeProxy: false,
  memoryLimits: true
};

/**
 * Helper for setting up test containers
 */
export class TestContainerSetup {
  private containerManager: ContainerManager;
  private deployedContainers: string[] = [];

  constructor(containerManager: ContainerManager) {
    this.containerManager = containerManager;
  }

  /**
   * Set up a full test stack for LLM advisor
   */
  async setupTestStack(config: Partial<TestStackConfig> = {}): Promise<string[]> {
    const fullConfig = { ...defaultTestStackConfig, ...config };
    
    const containers: ContainerConfig[] = [
      // Core LLM container
      {
        name: 'llm-model',
        image: 'skidbladnir/llm',
        tag: fullConfig.llmModel,
        ports: [{ host: 8080, container: 8080 }],
        environment: {
          MODEL_NAME: fullConfig.llmModel,
          MAX_CONCURRENT_REQUESTS: '2'
        },
        memoryLimit: fullConfig.memoryLimits ? '8G' : undefined,
        cpuLimit: fullConfig.memoryLimits ? '4' : undefined,
        healthcheck: {
          command: 'curl -f http://localhost:8080/health || exit 1',
          interval: '10s',
          timeout: '5s',
          retries: 3
        }
      },
      
      // API service
      {
        name: 'llm-api',
        image: 'skidbladnir/llm-api',
        tag: 'latest',
        ports: [{ host: 3000, container: 3000 }],
        environment: {
          LLM_ENDPOINT: 'http://llm-model:8080',
          LOG_LEVEL: 'info'
        },
        healthcheck: {
          command: 'curl -f http://localhost:3000/health || exit 1',
          interval: '5s',
          timeout: '3s',
          retries: 3
        }
      }
    ];
    
    // Add cache if enabled
    if (fullConfig.useCache) {
      containers.push({
        name: 'llm-cache',
        image: 'redis',
        tag: 'alpine',
        ports: [{ host: 6379, container: 6379 }],
        environment: {
          REDIS_MAX_MEMORY: '256mb',
          REDIS_MAX_MEMORY_POLICY: 'allkeys-lru'
        },
        healthcheck: {
          command: 'redis-cli ping || exit 1',
          interval: '5s',
          timeout: '3s',
          retries: 3
        }
      });
      
      // Update API to use cache
      const apiContainer = containers.find(c => c.name === 'llm-api');
      if (apiContainer) {
        apiContainer.environment = {
          ...apiContainer.environment,
          CACHE_ENABLED: 'true',
          CACHE_HOST: 'llm-cache',
          CACHE_PORT: '6379'
        };
      }
    }
    
    // Add metrics monitoring if enabled
    if (fullConfig.includeMetrics) {
      containers.push({
        name: 'llm-metrics',
        image: 'prom/prometheus',
        tag: 'latest',
        ports: [{ host: 9090, container: 9090 }],
        volumes: [
          { host: './prometheus.yml', container: '/etc/prometheus/prometheus.yml' }
        ],
        healthcheck: {
          command: 'wget -q --spider http://localhost:9090/-/healthy || exit 1',
          interval: '10s',
          timeout: '5s',
          retries: 3
        }
      });
      
      containers.push({
        name: 'llm-grafana',
        image: 'grafana/grafana',
        tag: 'latest',
        ports: [{ host: 3001, container: 3000 }],
        environment: {
          GF_SECURITY_ADMIN_USER: 'admin',
          GF_SECURITY_ADMIN_PASSWORD: 'password'
        },
        healthcheck: {
          command: 'wget -q --spider http://localhost:3000/api/health || exit 1',
          interval: '10s',
          timeout: '5s',
          retries: 3
        }
      });
    }
    
    // Add API proxy if enabled
    if (fullConfig.includeProxy) {
      containers.push({
        name: 'llm-proxy',
        image: 'nginx',
        tag: 'alpine',
        ports: [{ host: 8000, container: 80 }],
        volumes: [
          { host: './nginx.conf', container: '/etc/nginx/conf.d/default.conf' }
        ],
        healthcheck: {
          command: 'wget -q --spider http://localhost/health || exit 1',
          interval: '5s',
          timeout: '3s',
          retries: 3
        }
      });
    }
    
    // Start all containers
    console.log(`Starting test stack with ${containers.length} containers`);
    const results = await this.containerManager.deployApplication(containers);
    
    // Store deployed container names
    this.deployedContainers = containers.map(c => c.name);
    
    return this.deployedContainers;
  }

  /**
   * Clean up all deployed containers
   */
  async tearDown(): Promise<void> {
    if (this.deployedContainers.length > 0) {
      console.log(`Tearing down ${this.deployedContainers.length} containers`);
      await this.containerManager.shutdownApplication(this.deployedContainers);
      this.deployedContainers = [];
    }
  }

  /**
   * Get URL for a specific service in the test stack
   */
  getServiceUrl(serviceName: string): string {
    switch (serviceName) {
      case 'api':
        return this.deployedContainers.includes('llm-proxy') ? 
          'http://localhost:8000/api' : 
          'http://localhost:3000';
      case 'model':
        return 'http://localhost:8080';
      case 'metrics':
        return 'http://localhost:9090';
      case 'dashboard':
        return 'http://localhost:3001';
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }
}