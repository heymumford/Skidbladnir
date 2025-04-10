/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DependencyGraph } from './DependencyGraph';
import { 
  OperationType, 
  OperationDefinition, 
  ValidationResult, 
  ValidationError 
} from './types';

/**
 * Resolves dependencies between operations and determines the correct execution order.
 */
export class OperationDependencyResolver {
  /**
   * Builds a dependency graph from a list of operation definitions.
   * @param operations List of operation definitions
   * @returns A dependency graph representing the operations and their dependencies
   */
  buildDependencyGraph(operations: OperationDefinition[]): DependencyGraph {
    const graph = new DependencyGraph();
    
    // Add all operations as nodes first
    for (const operation of operations) {
      graph.addNode(operation.type);
    }
    
    // Add dependencies
    for (const operation of operations) {
      for (const dependency of operation.dependencies) {
        graph.addDependency(operation.type, dependency);
      }
    }
    
    return graph;
  }

  /**
   * Performs topological sorting to determine the correct execution order of operations.
   * @param operationsOrGraph The dependency graph or array of operation definitions
   * @returns Ordered array of operations, or an empty array if cycles exist
   */
  resolveExecutionOrder(operationsOrGraph: DependencyGraph | OperationDefinition[]): OperationType[] {
    // If we were passed operation definitions, build the graph first
    const graph = Array.isArray(operationsOrGraph) 
      ? this.buildDependencyGraph(operationsOrGraph)
      : operationsOrGraph;
    
    // Check for cycles
    if (graph.hasCycles()) {
      return [];
    }
    
    const operations = graph.getAllOperations();
    const result: OperationType[] = [];
    const visited = new Set<OperationType>();
    const temporaryMarked = new Set<OperationType>();
    
    // Recursive visit function for topological sort
    const visit = (operation: OperationType): void => {
      // Skip if already processed
      if (visited.has(operation)) {
        return;
      }
      
      // Detect cycles (should not happen if hasCycles was called)
      if (temporaryMarked.has(operation)) {
        throw new Error(`Cycle detected involving operation: ${operation}`);
      }
      
      // Mark temporarily for cycle detection
      temporaryMarked.add(operation);
      
      // Visit all dependencies first
      for (const dependency of graph.getDependencies(operation)) {
        visit(dependency);
      }
      
      // Mark as permanently visited and add to result
      temporaryMarked.delete(operation);
      visited.add(operation);
      result.push(operation);
    };
    
    // Visit all operations
    for (const operation of operations) {
      if (!visited.has(operation)) {
        visit(operation);
      }
    }
    
    return result;
  }

  /**
   * Validates a dependency graph to identify issues like missing operations or circular dependencies.
   * @param operationsOrGraph The dependency graph or operation definitions to validate
   * @returns Validation result with any errors found
   */
  validateDependencies(operationsOrGraph: DependencyGraph | OperationDefinition[]): ValidationResult {
    // If we were passed operation definitions, build the graph first
    const graph = Array.isArray(operationsOrGraph) 
      ? this.buildDependencyGraph(operationsOrGraph)
      : operationsOrGraph;
    
    const errors: ValidationError[] = [];
    
    // Check for cycles
    if (graph.hasCycles()) {
      errors.push({
        type: 'circular_dependency',
        message: 'Circular dependency detected in operation graph'
      });
    }
    
    // Check that all referenced dependencies exist in the graph
    const operations = graph.getAllOperations();
    
    for (const operation of operations) {
      const dependencies = graph.getDependencies(operation);
      
      for (const dependency of dependencies) {
        if (!operations.includes(dependency)) {
          errors.push({
            type: 'missing_operation',
            message: `Operation ${operation} depends on missing operation ${dependency}`,
            operation: operation,
            details: { missingDependency: dependency }
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculates the minimal set of operations needed to achieve a specific goal operation.
   * @param graph The dependency graph
   * @param goalOperation The target operation to achieve
   * @returns Array of operations needed to achieve the goal
   */
  calculateMinimalOperationSet(
    graph: DependencyGraph, 
    goalOperation: OperationType
  ): OperationType[] {
    const result = new Set<OperationType>();
    
    // If goal operation doesn't exist in graph, return empty array
    if (!graph.getAllOperations().includes(goalOperation)) {
      return [];
    }
    
    // Add the goal operation and recursively add its dependencies
    const addWithDependencies = (operation: OperationType): void => {
      if (result.has(operation)) {
        return;
      }
      
      // Add all dependencies first
      const dependencies = graph.getDependencies(operation);
      for (const dependency of dependencies) {
        addWithDependencies(dependency);
      }
      
      // Then add this operation
      result.add(operation);
    };
    
    // Start with the goal operation
    addWithDependencies(goalOperation);
    
    // Convert set to array and return
    return Array.from(result);
  }
}