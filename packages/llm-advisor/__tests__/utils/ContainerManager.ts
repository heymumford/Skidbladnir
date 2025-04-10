/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Container configuration interface
 */
export interface ContainerConfig {
  name: string;
  image: string;
  tag: string;
  ports?: { host: number; container: number }[];
  environment?: Record<string, string>;
  volumes?: { host: string; container: string }[];
  network?: string;
  memoryLimit?: string;
  cpuLimit?: string;
  healthcheck?: {
    command: string;
    interval: string;
    timeout: string;
    retries: number;
  };
}

/**
 * Container status interface
 */
export interface ContainerStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'exited' | 'created' | 'error';
  startTime?: string;
  exitCode?: number;
  errorMessage?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'starting';
  ports?: { host: number; container: number }[];
  cpu?: { usage: number; limit: number };
  memory?: { used: number; limit: number };
}

/**
 * Utility class for managing container deployments in tests
 */
export class ContainerManager {
  private containers: Map<string, ContainerStatus> = new Map();

  /**
   * Start a container with the given configuration
   */
  async startContainer(config: ContainerConfig): Promise<ContainerStatus> {
    // In a real implementation, this would use Docker/Podman API or spawn a process
    // For testing, we'll simulate container creation
    
    console.log(`Starting container: ${config.name} (${config.image}:${config.tag})`);
    
    // Simulate some delay for container startup
    await this.delay(1000);
    
    const containerId = `mock-${Math.random().toString(36).substring(2, 10)}`;
    
    const status: ContainerStatus = {
      id: containerId,
      name: config.name,
      status: 'running',
      startTime: new Date().toISOString(),
      ports: config.ports,
      healthStatus: 'healthy',
      cpu: { usage: 5, limit: config.cpuLimit ? parseInt(config.cpuLimit) : 100 },
      memory: { used: 100, limit: config.memoryLimit ? parseInt(config.memoryLimit) : 1024 }
    };
    
    this.containers.set(config.name, status);
    return status;
  }

  /**
   * Stop a container by name
   */
  async stopContainer(name: string): Promise<void> {
    console.log(`Stopping container: ${name}`);
    
    const container = this.containers.get(name);
    if (!container) {
      throw new Error(`Container ${name} not found`);
    }
    
    // Simulate container stopping
    await this.delay(500);
    
    container.status = 'stopped';
    container.exitCode = 0;
    
    this.containers.set(name, container);
  }

  /**
   * Get container status
   */
  async getContainerStatus(name: string): Promise<ContainerStatus | null> {
    const container = this.containers.get(name);
    return container || null;
  }

  /**
   * Get logs from a container
   */
  async getContainerLogs(name: string): Promise<string> {
    const container = this.containers.get(name);
    if (!container) {
      throw new Error(`Container ${name} not found`);
    }
    
    // Mock logs
    return `
      [2025-02-15T10:00:01Z] Container ${name} starting up
      [2025-02-15T10:00:02Z] Initializing services
      [2025-02-15T10:00:03Z] Services initialized
      [2025-02-15T10:00:04Z] Container ${name} ready
    `;
  }

  /**
   * Run a command inside a container
   */
  async execInContainer(name: string, command: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const container = this.containers.get(name);
    if (!container) {
      throw new Error(`Container ${name} not found`);
    }
    
    if (container.status !== 'running') {
      throw new Error(`Container ${name} is not running`);
    }
    
    // Simulate command execution
    await this.delay(300);
    
    return {
      exitCode: 0,
      stdout: `Mock execution of ${command.join(' ')} in ${name}`,
      stderr: ''
    };
  }

  /**
   * Deploy a multi-container application
   */
  async deployApplication(containersConfig: ContainerConfig[]): Promise<Record<string, ContainerStatus>> {
    console.log(`Deploying application with ${containersConfig.length} containers`);
    
    const results: Record<string, ContainerStatus> = {};
    
    // Start containers in parallel
    const startPromises = containersConfig.map(async (config) => {
      const status = await this.startContainer(config);
      results[config.name] = status;
    });
    
    await Promise.all(startPromises);
    return results;
  }

  /**
   * Shut down a multi-container application
   */
  async shutdownApplication(containerNames: string[]): Promise<void> {
    console.log(`Shutting down application with ${containerNames.length} containers`);
    
    // Stop containers in reverse order
    for (const name of containerNames.reverse()) {
      await this.stopContainer(name);
    }
  }

  /**
   * Utility helper to create delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}