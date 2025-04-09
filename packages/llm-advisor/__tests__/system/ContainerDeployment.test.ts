/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ContainerManager } from '../utils/ContainerManager';
import { DeploymentMonitor } from '../utils/DeploymentMonitor';

describe('LLM Advisor Container Deployment', () => {
  let containerManager: ContainerManager;
  let deploymentMonitor: DeploymentMonitor;
  const rootDir = path.resolve(__dirname, '../../../..');
  const dockerfilePath = path.join(rootDir, 'packages/llm-advisor/Dockerfile');
  
  beforeAll(() => {
    // Ensure we have docker available
    try {
      execSync('docker --version', { stdio: 'pipe' });
    } catch (error) {
      console.error('Docker is required to run these tests');
      process.exit(1);
    }
    
    containerManager = new ContainerManager();
    deploymentMonitor = new DeploymentMonitor();
  });
  
  afterEach(async () => {
    // Clean up any containers created during tests
    await containerManager.cleanup();
  });

  // ST-CONT-001: Verify container startup time
  test('container starts within time threshold', async () => {
    deploymentMonitor.startTimer('container-startup');
    
    // Build and start the container
    const containerId = await containerManager.buildAndStart(dockerfilePath);
    
    // Verify the container is running
    expect(containerId).toBeTruthy();
    expect(await containerManager.isRunning(containerId)).toBe(true);
    
    // Check startup time
    const startupTime = deploymentMonitor.stopTimer('container-startup');
    expect(startupTime).toBeLessThan(30000); // 30 seconds threshold
  });

  // ST-CONT-002: Verify container resource usage
  test('container stays within resource limits', async () => {
    // Build and start the container
    const containerId = await containerManager.buildAndStart(dockerfilePath);
    
    // Start the container with resource limits
    await containerManager.updateContainerResources(containerId, {
      cpuLimit: '1',
      memoryLimit: '4g'
    });
    
    // Run a heavy processing task
    await containerManager.executeCommand(
      containerId, 
      'curl -X POST http://localhost:3000/api/process-batch -d \'{"size":"large"}\''
    );
    
    // Measure resource usage
    const resourceUsage = await containerManager.getResourceUsage(containerId);
    
    // Verify within limits
    expect(parseFloat(resourceUsage.cpuUsage)).toBeLessThan(1.0);
    expect(parseFloat(resourceUsage.memoryUsage)).toBeLessThan(4.0);
  });

  // ST-CONT-003: Verify incremental update efficiency
  test('incremental update requires minimal rebuild', async () => {
    // Build initial container and measure time
    deploymentMonitor.startTimer('initial-build');
    const initialBuildId = await containerManager.buildAndTag('llm-advisor:initial');
    const initialBuildTime = deploymentMonitor.stopTimer('initial-build');
    
    // Make a minor change to a single source file
    const testFilePath = path.join(rootDir, 'packages/llm-advisor/src/utils/FormatUtils.ts');
    const originalContent = fs.readFileSync(testFilePath, 'utf8');
    const modifiedContent = originalContent.replace(
      'export class FormatUtils {',
      'export class FormatUtils { // Minor change for testing'
    );
    fs.writeFileSync(testFilePath, modifiedContent);
    
    // Rebuild and measure time
    deploymentMonitor.startTimer('incremental-build');
    const incrementalBuildId = await containerManager.buildAndTag('llm-advisor:incremental');
    const incrementalBuildTime = deploymentMonitor.stopTimer('incremental-build');
    
    // Restore original file
    fs.writeFileSync(testFilePath, originalContent);
    
    // Verify incremental build is significantly faster (should leverage cache)
    expect(incrementalBuildTime).toBeLessThan(initialBuildTime * 0.5);
    
    // Verify layer reuse
    const layers = await containerManager.getImageLayers(incrementalBuildId);
    const initialLayers = await containerManager.getImageLayers(initialBuildId);
    
    // Calculate percentage of reused layers
    const reusedLayers = layers.filter(layer => initialLayers.includes(layer));
    const reusePercentage = (reusedLayers.length / layers.length) * 100;
    
    // Expect high layer reuse (>80%)
    expect(reusePercentage).toBeGreaterThan(80);
  });

  // ST-CONT-004: Verify hot reload capabilities
  test('supports hot reloading of model files', async () => {
    // Build and start container with volume for model files
    const containerId = await containerManager.buildAndStartWithVolume(
      dockerfilePath,
      '/app/models:/models'
    );
    
    // Verify the container is running
    expect(await containerManager.isRunning(containerId)).toBe(true);
    
    // Get initial model list
    const initialModelList = await containerManager.executeCommand(
      containerId,
      'curl http://localhost:3000/api/models/list'
    );
    
    // Add a new model file to the volume
    const testModelPath = path.join(rootDir, 'test-resources/models/test-model.bin');
    const targetModelPath = path.join(rootDir, 'packages/llm-advisor/models/new-model.bin');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(targetModelPath))) {
      fs.mkdirSync(path.dirname(targetModelPath), { recursive: true });
    }
    
    // Copy test model file (just create a dummy file for testing)
    fs.writeFileSync(targetModelPath, 'Test model file');
    
    // Wait for hot reload (may have a polling interval)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get updated model list
    const updatedModelList = await containerManager.executeCommand(
      containerId,
      'curl http://localhost:3000/api/models/list'
    );
    
    // Clean up test file
    fs.unlinkSync(targetModelPath);
    
    // Verify new model was detected without container restart
    expect(updatedModelList).toContain('new-model');
    expect(updatedModelList).not.toEqual(initialModelList);
    
    // Verify no container restart occurred
    const containerInfo = await containerManager.getContainerInfo(containerId);
    expect(containerInfo.restartCount).toBe(0);
  });

  // ST-CONT-005: Verify container security configuration
  test('container has proper security configurations', async () => {
    // Build and start container
    const containerId = await containerManager.buildAndStart(dockerfilePath);
    
    // Get container security configurations
    const securityConfig = await containerManager.getSecurityConfig(containerId);
    
    // Verify security best practices
    expect(securityConfig.runAsNonRoot).toBe(true);
    expect(securityConfig.noNewPrivileges).toBe(true);
    expect(securityConfig.readOnlyRootFilesystem).toBe(true);
    expect(securityConfig.capDrop).toContain('ALL');
    
    // Verify sensitive directories are not accessible
    const sensitivePathAccess = await containerManager.executeCommand(
      containerId,
      'cat /etc/shadow || echo "Access denied"'
    );
    expect(sensitivePathAccess).toContain('Access denied');
  });
});