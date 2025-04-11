/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DependencyAwareMigrationUseCase } from './DependencyAwareMigrationUseCase';
import { OperationDependencyResolver } from '../../interfaces/api/operations/OperationDependencyResolver';
import { OperationExecutor } from '../../interfaces/api/operations/OperationExecutor';
import { DependencyGraphVisualizer } from '../../interfaces/api/operations/DependencyGraphVisualizer';

import {
  SourceProvider,
  TargetProvider,
  ProviderRegistry
} from '../../../packages/common/src/interfaces/provider';

import { LoggerService } from '../../domain/services/LoggerService';

/**
 * Factory for creating a fully configured DependencyAwareMigrationUseCase
 */
export class DependencyAwareMigrationFactory {
  /**
   * Creates and configures a DependencyAwareMigrationUseCase
   * @param sourceProviderId Source provider ID
   * @param targetProviderId Target provider ID
   * @param providerRegistry Provider registry to look up providers
   * @param loggerService Optional logger service
   * @returns Configured migration use case
   */
  static createMigrationUseCase(
    sourceProviderId: string,
    targetProviderId: string,
    providerRegistry: ProviderRegistry,
    loggerService?: LoggerService
  ): DependencyAwareMigrationUseCase {
    // Create dependencies
    const operationResolver = new OperationDependencyResolver();
    const operationExecutor = new OperationExecutor(3, 1000); // 3 retries, 1s initial delay
    
    // Create visualization tool (for debugging)
    const visualizer = new DependencyGraphVisualizer();
    
    // Get providers
    const sourceProvider = providerRegistry.getProvider(sourceProviderId) as SourceProvider;
    const targetProvider = providerRegistry.getProvider(targetProviderId) as TargetProvider;
    
    if (!sourceProvider) {
      throw new Error(`Source provider not found: ${sourceProviderId}`);
    }
    
    if (!targetProvider) {
      throw new Error(`Target provider not found: ${targetProviderId}`);
    }
    
    if (!sourceProvider.capabilities.canBeSource) {
      throw new Error(`Provider ${sourceProviderId} cannot be used as a source`);
    }
    
    if (!targetProvider.capabilities.canBeTarget) {
      throw new Error(`Provider ${targetProviderId} cannot be used as a target`);
    }
    
    // Create and return the use case
    return new DependencyAwareMigrationUseCase(
      operationResolver,
      operationExecutor,
      sourceProvider,
      targetProvider,
      loggerService
    );
  }
  
  /**
   * Generates a dependency graph visualization for the migration between two providers
   * @param sourceProviderId Source provider ID
   * @param targetProviderId Target provider ID
   * @param providerRegistry Provider registry
   * @param format Output format ('mermaid', 'dot', or 'html')
   * @returns Visualization in the requested format
   */
  static async generateDependencyGraphVisualization(
    sourceProviderId: string,
    targetProviderId: string,
    providerRegistry: ProviderRegistry,
    format: 'mermaid' | 'dot' | 'html' = 'html'
  ): Promise<string> {
    const sourceProvider = providerRegistry.getProvider(sourceProviderId);
    const targetProvider = providerRegistry.getProvider(targetProviderId);
    
    if (!sourceProvider) {
      throw new Error(`Source provider not found: ${sourceProviderId}`);
    }
    
    if (!targetProvider) {
      throw new Error(`Target provider not found: ${targetProviderId}`);
    }
    
    // Get API contracts
    const sourceContract = await sourceProvider.getApiContract();
    const targetContract = await targetProvider.getApiContract();
    
    // Merge operations from both contracts
    // Use type assertions to satisfy TypeScript while we fix the underlying issue
    const operations = [
      ...Object.values(sourceContract.operations),
      ...Object.values(targetContract.operations)
    ];
    
    // Create dependencies
    const operationResolver = new OperationDependencyResolver();
    // @ts-ignore - We'll need to eventually properly type the operations
    const graph = operationResolver.buildDependencyGraph(operations);
    
    // Generate visualization
    const visualizer = new DependencyGraphVisualizer();
    
    // Get execution order if possible
    let executionOrder: string[] = [];
    if (!graph.hasCycles()) {
      // @ts-ignore - We'll need to eventually properly type the operations and execution order
      executionOrder = operationResolver.resolveExecutionOrder(graph);
    }
    
    // Generate requested format
    switch (format) {
      case 'mermaid':
        return visualizer.generateMermaidDiagram(graph);
      case 'dot':
        return visualizer.generateDotDiagram(graph);
      case 'html':
      default:
        // @ts-ignore - We're using string[] executionOrder but the API expects OperationType[]
        return visualizer.generateHtmlReport(graph, executionOrder);
    }
  }
}