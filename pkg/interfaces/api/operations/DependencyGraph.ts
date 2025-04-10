/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationType } from './types';

/**
 * Represents a directed graph of operation dependencies.
 * Used for determining the correct execution order of operations.
 */
export class DependencyGraph {
  private nodes: Map<OperationType, Set<OperationType>> = new Map();
  private dependents: Map<OperationType, Set<OperationType>> = new Map();

  /**
   * Adds a node to the graph if it doesn't already exist.
   * @param operation The operation to add as a node
   */
  addNode(operation: OperationType): void {
    if (!this.nodes.has(operation)) {
      this.nodes.set(operation, new Set<OperationType>());
    }
    
    if (!this.dependents.has(operation)) {
      this.dependents.set(operation, new Set<OperationType>());
    }
  }

  /**
   * Adds a dependency relationship between operations.
   * @param dependent The operation that depends on another
   * @param dependency The operation that must be completed first
   */
  addDependency(dependent: OperationType, dependency: OperationType): void {
    this.addNode(dependent);
    this.addNode(dependency);
    
    // Add the dependency to the dependent's dependencies
    const dependencies = this.nodes.get(dependent)!;
    dependencies.add(dependency);
    
    // Add the dependent to the dependency's dependents
    const deps = this.dependents.get(dependency)!;
    deps.add(dependent);
  }

  /**
   * Gets all direct dependencies for an operation.
   * @param operation The operation to get dependencies for
   * @returns Array of operations that this operation depends on
   */
  getDependencies(operation: OperationType): OperationType[] {
    if (!this.nodes.has(operation)) {
      return [];
    }
    
    return Array.from(this.nodes.get(operation)!);
  }

  /**
   * Gets all operations that directly depend on the given operation.
   * @param operation The operation to get dependents for
   * @returns Array of operations that depend on this operation
   */
  getDependents(operation: OperationType): OperationType[] {
    if (!this.dependents.has(operation)) {
      return [];
    }
    
    return Array.from(this.dependents.get(operation)!);
  }

  /**
   * Checks if the graph contains any cycles, which would make a valid
   * topological sort impossible.
   * @returns True if the graph contains cycles, false otherwise
   */
  hasCycles(): boolean {
    // Track visited and current path nodes for cycle detection
    const visited = new Set<OperationType>();
    const currentPath = new Set<OperationType>();
    
    const operations = this.getAllOperations();
    
    // Define recursive DFS for cycle detection
    const dfs = (operation: OperationType): boolean => {
      // If we encounter a node already in our current path, we have a cycle
      if (currentPath.has(operation)) {
        return true;
      }
      
      // If we've already processed this node completely and found no cycles, skip
      if (visited.has(operation)) {
        return false;
      }
      
      // Add to current path
      currentPath.add(operation);
      
      // Check all dependencies for cycles
      for (const dependency of this.getDependencies(operation)) {
        if (dfs(dependency)) {
          return true;
        }
      }
      
      // Remove from current path when done
      currentPath.delete(operation);
      
      // Mark as completely visited
      visited.add(operation);
      
      return false;
    };
    
    // Check each operation for cycles
    for (const operation of operations) {
      if (dfs(operation)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Gets all operations in the graph.
   * @returns Array of all operations
   */
  getAllOperations(): OperationType[] {
    return Array.from(this.nodes.keys());
  }
}