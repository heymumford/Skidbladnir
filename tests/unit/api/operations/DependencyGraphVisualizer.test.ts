/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DependencyGraph } from '../../../../pkg/interfaces/api/operations/DependencyGraph';
import { DependencyGraphVisualizer } from '../../../../pkg/interfaces/api/operations/DependencyGraphVisualizer';
import { OperationType, OperationResult } from '../../../../pkg/interfaces/api/operations/types';

enum TestOperationType {
  FETCH_PROJECTS = 'FETCH_PROJECTS',
  FETCH_TEST_CYCLES = 'FETCH_TEST_CYCLES',
  FETCH_TEST_CASES = 'FETCH_TEST_CASES',
  CREATE_PROJECT = 'CREATE_PROJECT',
  CREATE_CYCLE = 'CREATE_CYCLE',
  CREATE_TEST_CASE = 'CREATE_TEST_CASE'
}

describe('DependencyGraphVisualizer', () => {
  let visualizer: DependencyGraphVisualizer;
  let graph: DependencyGraph;

  beforeEach(() => {
    visualizer = new DependencyGraphVisualizer();
    graph = new DependencyGraph();
    
    // Add operations
    graph.addNode(TestOperationType.FETCH_PROJECTS);
    graph.addNode(TestOperationType.FETCH_TEST_CYCLES);
    graph.addNode(TestOperationType.FETCH_TEST_CASES);
    graph.addNode(TestOperationType.CREATE_PROJECT);
    graph.addNode(TestOperationType.CREATE_CYCLE);
    graph.addNode(TestOperationType.CREATE_TEST_CASE);
    
    // Add dependencies
    graph.addDependency(TestOperationType.FETCH_TEST_CYCLES, TestOperationType.FETCH_PROJECTS);
    graph.addDependency(TestOperationType.FETCH_TEST_CASES, TestOperationType.FETCH_TEST_CYCLES);
    graph.addDependency(TestOperationType.CREATE_PROJECT, TestOperationType.FETCH_PROJECTS);
    graph.addDependency(TestOperationType.CREATE_CYCLE, TestOperationType.CREATE_PROJECT);
    graph.addDependency(TestOperationType.CREATE_CYCLE, TestOperationType.FETCH_TEST_CYCLES);
    graph.addDependency(TestOperationType.CREATE_TEST_CASE, TestOperationType.CREATE_CYCLE);
    graph.addDependency(TestOperationType.CREATE_TEST_CASE, TestOperationType.FETCH_TEST_CASES);
  });

  describe('generateMermaidDiagram', () => {
    it('should generate a valid Mermaid diagram for the dependency graph', () => {
      const diagram = visualizer.generateMermaidDiagram(graph);
      
      // Verify the generated Mermaid diagram
      expect(diagram).toContain('flowchart TD');
      
      // Check for node declarations
      expect(diagram).toContain('FETCH_PROJECTS["FETCH_PROJECTS"]');
      expect(diagram).toContain('FETCH_TEST_CYCLES["FETCH_TEST_CYCLES"]');
      expect(diagram).toContain('FETCH_TEST_CASES["FETCH_TEST_CASES"]');
      expect(diagram).toContain('CREATE_PROJECT["CREATE_PROJECT"]');
      expect(diagram).toContain('CREATE_CYCLE["CREATE_CYCLE"]');
      expect(diagram).toContain('CREATE_TEST_CASE["CREATE_TEST_CASE"]');
      
      // Check for edges
      expect(diagram).toContain('FETCH_PROJECTS --> FETCH_TEST_CYCLES');
      expect(diagram).toContain('FETCH_TEST_CYCLES --> FETCH_TEST_CASES');
      expect(diagram).toContain('FETCH_PROJECTS --> CREATE_PROJECT');
      expect(diagram).toContain('CREATE_PROJECT --> CREATE_CYCLE');
      expect(diagram).toContain('FETCH_TEST_CYCLES --> CREATE_CYCLE');
      expect(diagram).toContain('CREATE_CYCLE --> CREATE_TEST_CASE');
      expect(diagram).toContain('FETCH_TEST_CASES --> CREATE_TEST_CASE');
    });

    it('should generate a valid Mermaid diagram for an empty graph', () => {
      const emptyGraph = new DependencyGraph();
      const diagram = visualizer.generateMermaidDiagram(emptyGraph);
      
      expect(diagram).toBe('flowchart TD\n');
    });
  });

  describe('generateDotDiagram', () => {
    it('should generate a valid DOT diagram for the dependency graph', () => {
      const diagram = visualizer.generateDotDiagram(graph);
      
      // Verify the generated DOT diagram
      expect(diagram).toContain('digraph DependencyGraph {');
      expect(diagram).toContain('rankdir=LR;');
      expect(diagram).toContain('node [shape=box, style=filled, fillcolor=lightblue];');
      
      // Check for edges
      expect(diagram).toContain('"FETCH_PROJECTS" -> "FETCH_TEST_CYCLES";');
      expect(diagram).toContain('"FETCH_TEST_CYCLES" -> "FETCH_TEST_CASES";');
      expect(diagram).toContain('"FETCH_PROJECTS" -> "CREATE_PROJECT";');
      expect(diagram).toContain('"CREATE_PROJECT" -> "CREATE_CYCLE";');
      expect(diagram).toContain('"FETCH_TEST_CYCLES" -> "CREATE_CYCLE";');
      expect(diagram).toContain('"CREATE_CYCLE" -> "CREATE_TEST_CASE";');
      expect(diagram).toContain('"FETCH_TEST_CASES" -> "CREATE_TEST_CASE";');
    });

    it('should generate a valid DOT diagram for an empty graph', () => {
      const emptyGraph = new DependencyGraph();
      const diagram = visualizer.generateDotDiagram(emptyGraph);
      
      expect(diagram).toBe('digraph DependencyGraph {\n    rankdir=LR;\n    node [shape=box, style=filled, fillcolor=lightblue];\n}');
    });

    it('should handle isolated nodes correctly', () => {
      const isolatedGraph = new DependencyGraph();
      isolatedGraph.addNode('ISOLATED_NODE');
      
      const diagram = visualizer.generateDotDiagram(isolatedGraph);
      
      expect(diagram).toContain('"ISOLATED_NODE";');
    });
  });

  describe('generateHtmlReport', () => {
    it('should generate an HTML report with the dependency graph', () => {
      const html = visualizer.generateHtmlReport(graph);
      
      // Verify the HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>API Operation Dependency Graph</title>');
      expect(html).toContain('class="mermaid"');
      
      // Check for operation details
      expect(html).toContain('<h3>FETCH_PROJECTS</h3>');
      expect(html).toContain('<h3>FETCH_TEST_CYCLES</h3>');
      expect(html).toContain('<h3>FETCH_TEST_CASES</h3>');
      expect(html).toContain('<h3>CREATE_PROJECT</h3>');
      expect(html).toContain('<h3>CREATE_CYCLE</h3>');
      expect(html).toContain('<h3>CREATE_TEST_CASE</h3>');
      
      // Verify mermaid script initialization
      expect(html).toContain('mermaid.initialize({');
    });

    it('should include execution order when provided', () => {
      const executionOrder: OperationType[] = [
        TestOperationType.FETCH_PROJECTS,
        TestOperationType.FETCH_TEST_CYCLES,
        TestOperationType.FETCH_TEST_CASES,
        TestOperationType.CREATE_PROJECT,
        TestOperationType.CREATE_CYCLE,
        TestOperationType.CREATE_TEST_CASE
      ];
      
      const html = visualizer.generateHtmlReport(graph, executionOrder);
      
      // Check for execution order section
      expect(html).toContain('<h2>Execution Order</h2>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>FETCH_PROJECTS</li>');
      expect(html).toContain('<li>FETCH_TEST_CYCLES</li>');
      expect(html).toContain('<li>FETCH_TEST_CASES</li>');
      expect(html).toContain('<li>CREATE_PROJECT</li>');
      expect(html).toContain('<li>CREATE_CYCLE</li>');
      expect(html).toContain('<li>CREATE_TEST_CASE</li>');
    });

    it('should include execution results when provided', () => {
      const timestamp = new Date();
      const executionResults: OperationResult[] = [
        {
          operationType: TestOperationType.FETCH_PROJECTS,
          success: true,
          data: { projectIds: [1, 2, 3] },
          durationMs: 150,
          timestamp
        },
        {
          operationType: TestOperationType.FETCH_TEST_CYCLES,
          success: true,
          data: { cycleIds: [100, 101] },
          durationMs: 200,
          timestamp
        },
        {
          operationType: TestOperationType.FETCH_TEST_CASES,
          success: false,
          error: new Error('API rate limit exceeded'),
          durationMs: 50,
          timestamp
        }
      ];
      
      const html = visualizer.generateHtmlReport(graph, [], executionResults);
      
      // Check for execution results
      expect(html).toContain('class="operation success"');
      expect(html).toContain('class="operation failure"');
      expect(html).toContain('<strong>Status:</strong> Success');
      expect(html).toContain('<strong>Status:</strong> Failure');
      expect(html).toContain('<strong>Duration:</strong> 150ms');
      expect(html).toContain('<strong>Duration:</strong> 200ms');
      expect(html).toContain('<strong>Duration:</strong> 50ms');
      expect(html).toContain('API rate limit exceeded');
    });
  });
});