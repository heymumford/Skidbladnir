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
import { OperationTypeAdapter } from '../../../../pkg/interfaces/api/operations/adapters';

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
            // Convert the provider operation definition to the standardized format
            // The controller expects OperationType enum values, but providers work with strings
            const apiOperationType = OperationTypeAdapter.stringToOperationType(type);
            
            operations.push({
              type: apiOperationType,  // Use the converted enum value
              provider: provider.id,
              dependencies: definition.dependencies.map(
                dep => OperationTypeAdapter.stringToOperationType(dep)
              ),
              required: definition.required,
              description: definition.description,
              requiredParams: definition.requiredParams,
              estimatedTimeCost: definition.estimatedTimeCost
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
          // Convert provider operation definitions to API operation definitions
          const apiOperations = OperationTypeAdapter.toApiOperationDefinitions(
            Object.values(contract.operations)
          );
          operations.push(...apiOperations);
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Operations array is required'
        });
        return;
      }
      
      // Convert string operation types to API operation definitions if needed
      const apiOperations = operations.map(op => {
        // Check if this is already an API operation definition or needs conversion
        if (typeof op.type === 'string' && !(op.type in OperationType)) {
          return OperationTypeAdapter.toApiOperationDefinition(op);
        }
        return op;
      });
      
      const graph = this.resolver.buildDependencyGraph(apiOperations);
      const validation = this.resolver.validateDependencies(graph);
      
      if (validation.valid) {
        res.status(200).json({
          valid: true,
          executionOrder: this.resolver.resolveExecutionOrder(graph)
        });
      } else {
        res.status(400).json(validation);
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Source and target systems are required'
        });
        return;
      }
      
      const sourceProvider = this.providerRegistry.getProvider(sourceSystem);
      const targetProvider = this.providerRegistry.getProvider(targetSystem);
      
      if (!sourceProvider) {
        res.status(404).json({
          error: 'Source provider not found',
          message: `Provider with id ${sourceSystem} not found`
        });
        return;
      }
      
      if (!targetProvider) {
        res.status(404).json({
          error: 'Target provider not found',
          message: `Provider with id ${targetSystem} not found`
        });
        return;
      }
      
      // Get API contracts
      const sourceContract = await sourceProvider.getApiContract();
      const targetContract = await targetProvider.getApiContract();
      
      // Convert provider operations to API operations
      const sourceOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(sourceContract.operations)
      );
      const targetOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(targetContract.operations)
      );
      
      // Merge operations from both contracts
      const operations = [...sourceOperations, ...targetOperations];
      
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
          // Convert string[] to OperationType[] for the visualizer
          const typedExecutionOrder = executionOrder.map(op => 
            typeof op === 'string' ? OperationTypeAdapter.stringToOperationType(op) : op
          );
          visualization = this.visualizer.generateHtmlReport(graph, typedExecutionOrder);
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Provider ID is required'
        });
        return;
      }
      
      const provider = this.providerRegistry.getProvider(providerId);
      
      if (!provider) {
        res.status(404).json({
          error: 'Provider not found',
          message: `Provider with id ${providerId} not found`
        });
        return;
      }
      
      // Get API contract
      const contract = await provider.getApiContract();
      
      // Convert provider operations to API operations
      const apiOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(contract.operations)
      );
      
      // Build the graph with converted operations
      const graph = this.resolver.buildDependencyGraph(apiOperations);
      
      // Resolve execution order if possible
      const executionOrder = graph.hasCycles() ? [] : this.resolver.resolveExecutionOrder(graph);
      
      res.status(200).json({
        providerId,
        // Return the API operations for consistent typing
        operations: apiOperations,
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Provider ID is required'
        });
        return;
      }
      
      const provider = this.providerRegistry.getProvider(providerId);
      
      if (!provider) {
        res.status(404).json({
          error: 'Provider not found',
          message: `Provider with id ${providerId} not found`
        });
        return;
      }
      
      // Get API contract
      const contract = await provider.getApiContract();
      
      // Convert provider operations to API operations
      const apiOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(contract.operations)
      );
      
      // Build the graph with converted operations
      const graph = this.resolver.buildDependencyGraph(apiOperations);
      
      // Resolve execution order if possible
      const executionOrder = graph.hasCycles() ? [] : this.resolver.resolveExecutionOrder(graph);
      
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
          // Convert string[] to OperationType[] for the visualizer
          const typedExecutionOrder = executionOrder.map(op => 
            typeof op === 'string' ? OperationTypeAdapter.stringToOperationType(op) : op
          );
          visualization = this.visualizer.generateHtmlReport(graph, typedExecutionOrder);
          break;
      }
      
      // Content-Type header based on format
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(visualization);
      } else {
        res.status(200).send(visualization);
      }
      return;
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Operations array and parameters object are required'
        });
        return;
      }
      
      let operationDefinitions: OperationDefinition[] = [];
      
      // If providerId is specified, get operations from that provider
      if (providerId) {
        const provider = this.providerRegistry.getProvider(providerId);
        
        if (!provider) {
          res.status(404).json({
            error: 'Provider not found',
            message: `Provider with id ${providerId} not found`
          });
          return;
        }
        
        const contract = await provider.getApiContract();
        
        // Get the operation definitions for the specified operation types
        operationDefinitions = operations.map(opType => {
          // Convert the string operation type to OperationType enum
          const operationType = OperationTypeAdapter.stringToOperationType(opType);
          
          // Find the operation in the contract
          const providerDefinition = contract.operations[opType];
          if (!providerDefinition) {
            throw new Error(`Operation ${opType} not found in provider ${providerId}`);
          }
          
          // Convert the provider definition to API definition
          return OperationTypeAdapter.toApiOperationDefinition(providerDefinition);
        });
      } else {
        // If no providerId specified, convert the operations from the request
        // This assumes the operations are already in the provider format
        operationDefinitions = operations.map(op => {
          if (typeof op === 'string') {
            // If operation is just a string, create a minimal definition with just the type
            return {
              type: OperationTypeAdapter.stringToOperationType(op),
              dependencies: [],
              required: true,
              description: `Operation ${op}`,
              requiredParams: []
            };
          } else {
            // If it's an object, convert it
            return OperationTypeAdapter.toApiOperationDefinition(op);
          }
        });
      }
      
      // Validate dependencies
      const graph = this.resolver.buildDependencyGraph(operationDefinitions);
      const dependencyValidation = this.resolver.validateDependencies(graph);
      
      if (!dependencyValidation.valid) {
        res.status(200).json(dependencyValidation);
        return;
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
        res.status(400).json({
          error: 'Invalid request',
          message: 'Source system, target system, and goal operation are required'
        });
        return;
      }
      
      const sourceProvider = this.providerRegistry.getProvider(sourceSystem);
      const targetProvider = this.providerRegistry.getProvider(targetSystem);
      
      if (!sourceProvider) {
        res.status(404).json({
          error: 'Source provider not found',
          message: `Provider with id ${sourceSystem} not found`
        });
        return;
      }
      
      if (!targetProvider) {
        res.status(404).json({
          error: 'Target provider not found',
          message: `Provider with id ${targetSystem} not found`
        });
        return;
      }
      
      // Get API contracts
      const sourceContract = await sourceProvider.getApiContract();
      const targetContract = await targetProvider.getApiContract();
      
      // Convert provider operations to API operations
      const sourceOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(sourceContract.operations)
      );
      const targetOperations = OperationTypeAdapter.toApiOperationDefinitions(
        Object.values(targetContract.operations)
      );
      
      // Merge operations from both contracts
      const operations = [...sourceOperations, ...targetOperations];
      
      // Create dependency graph
      const graph = this.resolver.buildDependencyGraph(operations);
      
      // Convert goal operation to enum type if it's a string
      const goalOperationEnum = typeof goalOperation === 'string'
        ? OperationTypeAdapter.stringToOperationType(goalOperation)
        : goalOperation;
      
      // Calculate minimal operation set
      const minimalSet = this.resolver.calculateMinimalOperationSet(graph, goalOperationEnum);
      
      res.status(200).json({
        goalOperation: goalOperationEnum,
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