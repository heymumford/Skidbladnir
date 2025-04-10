/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DependencyGraph } from '../../../../pkg/interfaces/api/operations/DependencyGraph';
import { OperationType } from '../../../../pkg/interfaces/api/operations/types';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      // Act
      graph.addNode(OperationType.AUTHENTICATE);
      
      // Assert
      expect(graph.getAllOperations()).toContain(OperationType.AUTHENTICATE);
      expect(graph.getAllOperations().length).toBe(1);
    });

    it('should not add duplicate nodes', () => {
      // Act
      graph.addNode(OperationType.AUTHENTICATE);
      graph.addNode(OperationType.AUTHENTICATE);
      
      // Assert
      expect(graph.getAllOperations().length).toBe(1);
    });
  });

  describe('addDependency', () => {
    it('should add a dependency between nodes', () => {
      // Act
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      
      // Assert
      expect(graph.getDependencies(OperationType.GET_PROJECTS)).toContain(OperationType.AUTHENTICATE);
      expect(graph.getDependents(OperationType.AUTHENTICATE)).toContain(OperationType.GET_PROJECTS);
    });

    it('should automatically add nodes if they do not exist', () => {
      // Act
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      
      // Assert
      expect(graph.getAllOperations()).toContain(OperationType.GET_PROJECTS);
      expect(graph.getAllOperations()).toContain(OperationType.AUTHENTICATE);
    });
  });

  describe('getDependencies', () => {
    it('should return all dependencies for a node', () => {
      // Arrange
      graph.addDependency(OperationType.GET_TEST_CASES, OperationType.AUTHENTICATE);
      graph.addDependency(OperationType.GET_TEST_CASES, OperationType.GET_PROJECTS);
      
      // Act
      const dependencies = graph.getDependencies(OperationType.GET_TEST_CASES);
      
      // Assert
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain(OperationType.AUTHENTICATE);
      expect(dependencies).toContain(OperationType.GET_PROJECTS);
    });

    it('should return empty array for a node with no dependencies', () => {
      // Arrange
      graph.addNode(OperationType.AUTHENTICATE);
      
      // Act
      const dependencies = graph.getDependencies(OperationType.AUTHENTICATE);
      
      // Assert
      expect(dependencies).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      // Act
      const dependencies = graph.getDependencies(OperationType.AUTHENTICATE);
      
      // Assert
      expect(dependencies).toHaveLength(0);
    });
  });

  describe('getDependents', () => {
    it('should return all dependents for a node', () => {
      // Arrange
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      graph.addDependency(OperationType.GET_TEST_CASES, OperationType.AUTHENTICATE);
      
      // Act
      const dependents = graph.getDependents(OperationType.AUTHENTICATE);
      
      // Assert
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain(OperationType.GET_PROJECTS);
      expect(dependents).toContain(OperationType.GET_TEST_CASES);
    });

    it('should return empty array for a node with no dependents', () => {
      // Arrange
      graph.addNode(OperationType.GET_TEST_CASES);
      
      // Act
      const dependents = graph.getDependents(OperationType.GET_TEST_CASES);
      
      // Assert
      expect(dependents).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      // Act
      const dependents = graph.getDependents(OperationType.GET_TEST_CASES);
      
      // Assert
      expect(dependents).toHaveLength(0);
    });
  });

  describe('hasCycles', () => {
    it('should return false for acyclic graph', () => {
      // Arrange
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      graph.addDependency(OperationType.GET_TEST_CASES, OperationType.GET_PROJECTS);
      
      // Act
      const hasCycles = graph.hasCycles();
      
      // Assert
      expect(hasCycles).toBe(false);
    });

    it('should return true for graph with direct cycle', () => {
      // Arrange
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      graph.addDependency(OperationType.AUTHENTICATE, OperationType.GET_PROJECTS);
      
      // Act
      const hasCycles = graph.hasCycles();
      
      // Assert
      expect(hasCycles).toBe(true);
    });

    it('should return true for graph with indirect cycle', () => {
      // Arrange
      graph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      graph.addDependency(OperationType.GET_TEST_CASES, OperationType.GET_PROJECTS);
      graph.addDependency(OperationType.AUTHENTICATE, OperationType.GET_TEST_CASES);
      
      // Act
      const hasCycles = graph.hasCycles();
      
      // Assert
      expect(hasCycles).toBe(true);
    });

    it('should return false for empty graph', () => {
      // Act
      const hasCycles = graph.hasCycles();
      
      // Assert
      expect(hasCycles).toBe(false);
    });
  });

  describe('getAllOperations', () => {
    it('should return all operations in the graph', () => {
      // Arrange
      graph.addNode(OperationType.AUTHENTICATE);
      graph.addNode(OperationType.GET_PROJECTS);
      graph.addNode(OperationType.GET_TEST_CASES);
      
      // Act
      const operations = graph.getAllOperations();
      
      // Assert
      expect(operations).toHaveLength(3);
      expect(operations).toContain(OperationType.AUTHENTICATE);
      expect(operations).toContain(OperationType.GET_PROJECTS);
      expect(operations).toContain(OperationType.GET_TEST_CASES);
    });

    it('should return empty array for empty graph', () => {
      // Act
      const operations = graph.getAllOperations();
      
      // Assert
      expect(operations).toHaveLength(0);
    });
  });
});