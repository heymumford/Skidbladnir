/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Request, Response } from 'express';
import { OperationDependencyResolver } from '../../../../pkg/interfaces/api/operations/OperationDependencyResolver';
import { DependencyGraph } from '../../../../pkg/interfaces/api/operations/DependencyGraph';
import { DependencyGraphVisualizer } from '../../../../pkg/interfaces/api/operations/DependencyGraphVisualizer';
import { ProviderRegistry } from '../../../../packages/common/src/interfaces/provider';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';
import { OperationType, OperationDefinition, ValidationResult } from '../../../../pkg/interfaces/api/operations/types';

/**
 * Controller for API operations related to operation dependencies
 */
export class OperationDependencyController {
  private readonly resolver: OperationDependencyResolver;
  private readonly visualizer: DependencyGraphVisualizer;
  
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly logger?: LoggerService
  ) {
    this.resolver = new OperationDependencyResolver();
    this.visualizer = new DependencyGraphVisualizer();
  }
  
  /**
   * Get all available operations from providers
   */
  async getOperations(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.providerRegistry.getAllProviders();
      const operations = [];
      
      for (const provider of providers) {
        try {
          const contract = await provider.getApiContract();
          
          for (const [type, definition] of Object.entries(contract.operations)) {
            operations.push({
              type,
              provider: provider.id,
              ...definition
            });
          }
        } catch (error) {
          this.logger?.warn(`Error fetching operations from provider ${provider.id}:`, error);
        }
      }
      
      res.status(200).json({
        operations,
        count: operations.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error retrieving operations:', error);
      res.status(500).json({
        error: 'Failed to retrieve operations',
        message
      });
    }
  }
  
  /**
   * Get the dependency graph for all operations
   */
  async getDependencyGraph(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.providerRegistry.getAllProviders();
      const operations = [];
      
      for (const provider of providers) {
        try {
          const contract = await provider.getApiContract();
          operations.push(...Object.values(contract.operations));
        } catch (error) {
          this.logger?.warn(`Error fetching operations from provider ${provider.id}:`, error);
        }
      }
      
      const graph = this.resolver.buildDependencyGraph(operations);
      const executionOrder = graph.hasCycles() ? [] : this.resolver.resolveExecutionOrder(graph);
      
      res.status(200).json({
        graph: {
          operations: graph.getAllOperations(),
          hasCycles: graph.hasCycles()
        },
        executionOrder
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error retrieving dependency graph:', error);
      res.status(500).json({
        error: 'Failed to retrieve dependency graph',
        message
      });
    }
  }
  
  /**
   * Validate a set of operations for dependency issues
   */
  async validateOperations(req: Request, res: Response): Promise<void> {
    try {
      const { operations } = req.body;
      
      if (!operations || !Array.isArray(operations)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Operations array is required'
        });
      }
      
      const graph = this.resolver.buildDependencyGraph(operations);
      const validation = this.resolver.validateDependencies(graph);
      
      if (validation.valid) {
        return res.status(200).json({
          valid: true,
          executionOrder: this.resolver.resolveExecutionOrder(graph)
        });
      } else {
        return res.status(400).json(validation);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error validating operations:', error);
      res.status(500).json({
        error: 'Failed to validate operations',
        message
      });
    }
  }
  
  /**
   * Generate a visualization of the dependency graph
   */
  async visualizeDependencyGraph(req: Request, res: Response): Promise<void> {
    try {
      const { sourceSystem, targetSystem, format = 'html' } = req.body;
      
      if (!sourceSystem || !targetSystem) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Source and target systems are required'
        });
      }
      
      const sourceProvider = this.providerRegistry.getProvider(sourceSystem);
      const targetProvider = this.providerRegistry.getProvider(targetSystem);
      
      if (!sourceProvider) {
        return res.status(404).json({
          error: 'Source provider not found',
          message: `Provider with id ${sourceSystem} not found`
        });
      }
      
      if (!targetProvider) {
        return res.status(404).json({
          error: 'Target provider not found',
          message: `Provider with id ${targetSystem} not found`
        });
      }
      
      // Get API contracts
      const sourceContract = await sourceProvider.getApiContract();
      const targetContract = await targetProvider.getApiContract();
      
      // Merge operations from both contracts
      const operations = [
        ...Object.values(sourceContract.operations),
        ...Object.values(targetContract.operations)
      ];
      
      // Create dependency graph
      const graph = this.resolver.buildDependencyGraph(operations);
      
      // Get execution order if possible
      let executionOrder: string[] = [];
      if (!graph.hasCycles()) {
        executionOrder = this.resolver.resolveExecutionOrder(graph);
      }
      
      // Generate requested format
      let visualization: string;
      switch (format) {
        case 'mermaid':
          visualization = this.visualizer.generateMermaidDiagram(graph);
          break;
        case 'dot':
          visualization = this.visualizer.generateDotDiagram(graph);
          break;
        case 'html':
        default:
          visualization = this.visualizer.generateHtmlReport(graph, executionOrder);
          break;
      }
      
      res.status(200).json({
        visualization,
        format,
        hasCycles: graph.hasCycles(),
        executionOrder
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error generating visualization:', error);
      res.status(500).json({
        error: 'Failed to generate visualization',
        message
      });
    }
  }
  
  /**
   * Get and visualize dependency graph for a specific provider
   */
  async getProviderDependencyGraph(req: Request, res: Response): Promise<void> {
    try {
      const providerId = req.params.providerId;
      
      if (!providerId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Provider ID is required'
        });
      }
      
      const provider = this.providerRegistry.getProvider(providerId);
      
      if (!provider) {
        return res.status(404).json({
          error: 'Provider not found',
          message: `Provider with id ${providerId} not found`
        });
      }
      
      // Get API contract
      const contract = await provider.getApiContract();
      
      // Build the graph
      const operations = Object.values(contract.operations);
      const graph = this.resolver.buildDependencyGraph(operations);
      
      // Resolve execution order if possible
      const executionOrder = graph.hasCycles() ? [] : this.resolver.resolveExecutionOrder(operations);
      
      res.status(200).json({
        providerId,
        operations: Object.values(contract.operations),
        valid: !graph.hasCycles(),
        executionOrder
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error retrieving provider dependency graph:', error);
      res.status(500).json({
        error: 'Failed to retrieve provider dependency graph',
        message
      });
    }
  }
  
  /**
   * Visualize dependency graph for a specific provider
   */
  async visualizeProviderDependencyGraph(req: Request, res: Response): Promise<void> {
    try {
      const providerId = req.params.providerId;
      const format = req.query.format as string || 'html';
      
      if (!providerId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Provider ID is required'
        });
      }
      
      const provider = this.providerRegistry.getProvider(providerId);
      
      if (!provider) {
        return res.status(404).json({
          error: 'Provider not found',
          message: `Provider with id ${providerId} not found`
        });
      }
      
      // Get API contract
      const contract = await provider.getApiContract();
      
      // Build the graph
      const operations = Object.values(contract.operations);
      const graph = this.resolver.buildDependencyGraph(operations);
      
      // Resolve execution order if possible
      const executionOrder = graph.hasCycles() ? [] : this.resolver.resolveExecutionOrder(operations);
      
      // Generate requested format
      let visualization: string;
      switch (format) {
        case 'mermaid':
          visualization = this.visualizer.generateMermaidDiagram(graph);
          break;
        case 'dot':
          visualization = this.visualizer.generateDotDiagram(graph);
          break;
        case 'html':
        default:
          visualization = this.visualizer.generateHtmlReport(graph, executionOrder);
          break;
      }
      
      // Content-Type header based on format
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(visualization);
      } else {
        res.status(200).send(visualization);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error visualizing provider dependency graph:', error);
      res.status(500).json({
        error: 'Failed to visualize provider dependency graph',
        message
      });
    }
  }
  
  /**
   * Validate operations with their parameters
   */
  async validateOperationsWithParameters(req: Request, res: Response): Promise<void> {
    try {
      const { operations, parameters, providerId } = req.body;
      
      if (!operations || !Array.isArray(operations) || !parameters) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Operations array and parameters object are required'
        });
      }
      
      let operationDefinitions: OperationDefinition[] = [];
      
      // If providerId is specified, get operations from that provider
      if (providerId) {
        const provider = this.providerRegistry.getProvider(providerId);
        
        if (!provider) {
          return res.status(404).json({
            error: 'Provider not found',
            message: `Provider with id ${providerId} not found`
          });
        }
        
        const contract = await provider.getApiContract();
        
        // Get the operation definitions for the specified operation types
        operationDefinitions = operations.map(opType => {
          const definition = contract.operations[opType as OperationType];
          if (!definition) {
            throw new Error(`Operation ${opType} not found in provider ${providerId}`);
          }
          return definition;
        });
      }
      
      // Validate dependencies
      const graph = this.resolver.buildDependencyGraph(operationDefinitions);
      const dependencyValidation = this.resolver.validateDependencies(operationDefinitions);
      
      if (!dependencyValidation.valid) {
        return res.status(200).json(dependencyValidation);
      }
      
      // Check for missing parameters
      const paramValidation: ValidationResult = {
        valid: true,
        errors: []
      };
      
      for (const operation of operationDefinitions) {
        for (const param of operation.requiredParams) {
          if (parameters[param] === undefined) {
            paramValidation.valid = false;
            paramValidation.errors.push({
              type: 'missing_parameter',
              message: `Missing required parameter: ${param} for operation ${operation.type}`,
              operation: operation.type,
              details: { paramName: param }
            });
          }
        }
      }
      
      // Validation result
      const result: ValidationResult = {
        valid: dependencyValidation.valid && paramValidation.valid,
        errors: [...dependencyValidation.errors, ...paramValidation.errors]
      };
      
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error validating operations with parameters:', error);
      res.status(500).json({
        error: 'Failed to validate operations with parameters',
        message
      });
    }
  }
  
  /**
   * Calculate minimal set of operations needed for a specific goal
   */
  async calculateMinimalOperationSet(req: Request, res: Response): Promise<void> {
    try {
      const { sourceSystem, targetSystem, goalOperation } = req.body;
      
      if (!sourceSystem || !targetSystem || !goalOperation) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Source system, target system, and goal operation are required'
        });
      }
      
      const sourceProvider = this.providerRegistry.getProvider(sourceSystem);
      const targetProvider = this.providerRegistry.getProvider(targetSystem);
      
      if (!sourceProvider) {
        return res.status(404).json({
          error: 'Source provider not found',
          message: `Provider with id ${sourceSystem} not found`
        });
      }
      
      if (!targetProvider) {
        return res.status(404).json({
          error: 'Target provider not found',
          message: `Provider with id ${targetSystem} not found`
        });
      }
      
      // Get API contracts
      const sourceContract = await sourceProvider.getApiContract();
      const targetContract = await targetProvider.getApiContract();
      
      // Merge operations from both contracts
      const operations = [
        ...Object.values(sourceContract.operations),
        ...Object.values(targetContract.operations)
      ];
      
      // Create dependency graph
      const graph = this.resolver.buildDependencyGraph(operations);
      
      // Calculate minimal operation set
      const minimalSet = this.resolver.calculateMinimalOperationSet(graph, goalOperation);
      
      res.status(200).json({
        goalOperation,
        operations: minimalSet,
        count: minimalSet.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Error calculating minimal operation set:', error);
      res.status(500).json({
        error: 'Failed to calculate minimal operation set',
        message
      });
    }
  }
}