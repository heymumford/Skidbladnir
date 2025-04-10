/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  OperationDependencyResolver 
} from '../../../../pkg/interfaces/api/operations/OperationDependencyResolver';

import { 
  OperationType,
  OperationDefinition 
} from '../../../../pkg/interfaces/api/operations/types';

import { DependencyGraph } from '../../../../pkg/interfaces/api/operations/DependencyGraph';

describe('OperationDependencyResolver', () => {
  let resolver: OperationDependencyResolver;
  let operations: OperationDefinition[];

  beforeEach(() => {
    resolver = new OperationDependencyResolver();
    
    // Set up a common set of operations for tests
    operations = [
      {
        type: OperationType.AUTHENTICATE,
        dependencies: [],
        required: true,
        description: 'Authenticate with API',
        requiredParams: ['apiKey', 'baseUrl']
      },
      {
        type: OperationType.GET_PROJECTS,
        dependencies: [OperationType.AUTHENTICATE],
        required: true,
        description: 'Get all projects',
        requiredParams: []
      },
      {
        type: OperationType.GET_TEST_CASES,
        dependencies: [OperationType.GET_PROJECTS],
        required: true,
        description: 'Get test cases',
        requiredParams: ['projectId']
      }
    ];
  });

  describe('buildDependencyGraph', () => {
    it('should build a graph with correct nodes and edges', () => {
      // Act
      const graph = resolver.buildDependencyGraph(operations);
      
      // Assert
      expect(graph.getAllOperations()).toHaveLength(3);
      expect(graph.getAllOperations()).toContain(OperationType.AUTHENTICATE);
      expect(graph.getAllOperations()).toContain(OperationType.GET_PROJECTS);
      expect(graph.getAllOperations()).toContain(OperationType.GET_TEST_CASES);
      
      expect(graph.getDependencies(OperationType.AUTHENTICATE)).toHaveLength(0);
      expect(graph.getDependencies(OperationType.GET_PROJECTS)).toContain(OperationType.AUTHENTICATE);
      expect(graph.getDependencies(OperationType.GET_TEST_CASES)).toContain(OperationType.GET_PROJECTS);
    });

    it('should handle empty operations list', () => {
      // Act
      const graph = resolver.buildDependencyGraph([]);
      
      // Assert
      expect(graph.getAllOperations()).toHaveLength(0);
    });
  });

  describe('resolveExecutionOrder', () => {
    it('should resolve correct execution order for acyclic graph', () => {
      // Arrange
      const graph = resolver.buildDependencyGraph(operations);
      
      // Act
      const order = resolver.resolveExecutionOrder(graph);
      
      // Assert
      expect(order).toHaveLength(3);
      
      // Verify dependencies come before dependents
      const authIndex = order.indexOf(OperationType.AUTHENTICATE);
      const projectsIndex = order.indexOf(OperationType.GET_PROJECTS);
      const testCasesIndex = order.indexOf(OperationType.GET_TEST_CASES);
      
      expect(authIndex).toBeLessThan(projectsIndex);
      expect(projectsIndex).toBeLessThan(testCasesIndex);
    });

    it('should return empty array for cyclic graph', () => {
      // Arrange
      const cyclicOperations: OperationDefinition[] = [
        ...operations,
        {
          type: OperationType.GET_TEST_CASE,
          dependencies: [OperationType.GET_TEST_CASES],
          required: true,
          description: 'Get a test case',
          requiredParams: ['testCaseId']
        }
      ];
      
      // Add a cycle
      cyclicOperations[0].dependencies = [OperationType.GET_TEST_CASE];
      
      const graph = resolver.buildDependencyGraph(cyclicOperations);
      
      // Act
      const order = resolver.resolveExecutionOrder(graph);
      
      // Assert
      expect(order).toHaveLength(0);
    });

    it('should handle multiple independent chains correctly', () => {
      // Arrange
      const multiChainOperations: OperationDefinition[] = [
        ...operations,
        {
          type: OperationType.GET_ATTACHMENTS,
          dependencies: [],
          required: false,
          description: 'Get attachments',
          requiredParams: []
        },
        {
          type: OperationType.GET_ATTACHMENT,
          dependencies: [OperationType.GET_ATTACHMENTS],
          required: false,
          description: 'Get an attachment',
          requiredParams: ['attachmentId']
        }
      ];
      
      const graph = resolver.buildDependencyGraph(multiChainOperations);
      
      // Act
      const order = resolver.resolveExecutionOrder(graph);
      
      // Assert
      expect(order).toHaveLength(5);
      
      // Check the two chains
      const projectsIndex = order.indexOf(OperationType.GET_PROJECTS);
      const testCasesIndex = order.indexOf(OperationType.GET_TEST_CASES);
      const attachmentsIndex = order.indexOf(OperationType.GET_ATTACHMENTS);
      const attachmentIndex = order.indexOf(OperationType.GET_ATTACHMENT);
      
      expect(projectsIndex).toBeLessThan(testCasesIndex);
      expect(attachmentsIndex).toBeLessThan(attachmentIndex);
    });
  });

  describe('validateDependencies', () => {
    it('should validate graph with no issues', () => {
      // Arrange
      const graph = resolver.buildDependencyGraph(operations);
      
      // Act
      const validation = resolver.validateDependencies(graph);
      
      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect circular dependencies', () => {
      // Arrange
      const cyclicOperations: OperationDefinition[] = [
        ...operations,
        {
          type: OperationType.GET_TEST_CASE,
          dependencies: [OperationType.GET_TEST_CASES],
          required: true,
          description: 'Get a test case',
          requiredParams: ['testCaseId']
        }
      ];
      
      // Add a cycle
      cyclicOperations[0].dependencies = [OperationType.GET_TEST_CASE];
      
      const graph = resolver.buildDependencyGraph(cyclicOperations);
      
      // Act
      const validation = resolver.validateDependencies(graph);
      
      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('circular_dependency');
    });

    it('should detect missing operations', () => {
      // Arrange
      const mockedGraph = new DependencyGraph();
      mockedGraph.addNode(OperationType.AUTHENTICATE);
      mockedGraph.addNode(OperationType.GET_PROJECTS);
      mockedGraph.addDependency(OperationType.GET_PROJECTS, OperationType.AUTHENTICATE);
      mockedGraph.addDependency(OperationType.GET_PROJECTS, OperationType.GET_TEST_CASES);
      
      // Act
      const validation = resolver.validateDependencies(mockedGraph);
      
      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('missing_operation');
      expect(validation.errors[0].operation).toBe(OperationType.GET_PROJECTS);
    });
  });

  describe('calculateMinimalOperationSet', () => {
    it('should calculate minimal operation set for a goal', () => {
      // Arrange
      const graph = resolver.buildDependencyGraph(operations);
      
      // Act
      const minimalSet = resolver.calculateMinimalOperationSet(
        graph, 
        OperationType.GET_TEST_CASES
      );
      
      // Assert
      expect(minimalSet).toHaveLength(3);
      expect(minimalSet).toContain(OperationType.AUTHENTICATE);
      expect(minimalSet).toContain(OperationType.GET_PROJECTS);
      expect(minimalSet).toContain(OperationType.GET_TEST_CASES);
    });

    it('should include only necessary operations', () => {
      // Arrange
      const extendedOperations: OperationDefinition[] = [
        ...operations,
        {
          type: OperationType.GET_ATTACHMENTS,
          dependencies: [],
          required: false,
          description: 'Get attachments',
          requiredParams: []
        },
        {
          type: OperationType.GET_ATTACHMENT,
          dependencies: [OperationType.GET_ATTACHMENTS],
          required: false,
          description: 'Get an attachment',
          requiredParams: ['attachmentId']
        }
      ];
      
      const graph = resolver.buildDependencyGraph(extendedOperations);
      
      // Act
      const minimalSet = resolver.calculateMinimalOperationSet(
        graph, 
        OperationType.GET_TEST_CASES
      );
      
      // Assert
      expect(minimalSet).toHaveLength(3);
      expect(minimalSet).not.toContain(OperationType.GET_ATTACHMENTS);
      expect(minimalSet).not.toContain(OperationType.GET_ATTACHMENT);
    });

    it('should return empty array for non-existent goal', () => {
      // Arrange
      const graph = resolver.buildDependencyGraph(operations);
      
      // Act
      const minimalSet = resolver.calculateMinimalOperationSet(
        graph, 
        OperationType.GET_ATTACHMENT
      );
      
      // Assert
      expect(minimalSet).toHaveLength(0);
    });
  });
});