/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { DependencyGraph } from './DependencyGraph';
import { OperationType, OperationResult } from './types';

/**
 * Visualizes operation dependency graphs in different formats for analysis and debugging.
 */
export class DependencyGraphVisualizer {
  /**
   * Generates a Mermaid.js flowchart diagram from a dependency graph.
   * @param graph The dependency graph
   * @returns String containing a Mermaid.js flowchart diagram
   */
  generateMermaidDiagram(graph: DependencyGraph): string {
    const operations = graph.getAllOperations();
    let diagram = 'flowchart TD\n';
    
    // Add node declarations
    for (const operation of operations) {
      diagram += `    ${operation}["${operation}"]\n`;
    }
    
    // Add edges
    for (const operation of operations) {
      const dependencies = graph.getDependencies(operation);
      
      for (const dependency of dependencies) {
        diagram += `    ${dependency} --> ${operation}\n`;
      }
    }
    
    return diagram;
  }

  /**
   * Generates a DOT format diagram for use with GraphViz.
   * @param graph The dependency graph
   * @returns String containing a DOT format diagram
   */
  generateDotDiagram(graph: DependencyGraph): string {
    const operations = graph.getAllOperations();
    let dot = 'digraph DependencyGraph {\n';
    dot += '    rankdir=LR;\n';
    dot += '    node [shape=box, style=filled, fillcolor=lightblue];\n';
    
    // Add edges
    for (const operation of operations) {
      const dependencies = graph.getDependencies(operation);
      
      for (const dependency of dependencies) {
        dot += `    "${dependency}" -> "${operation}";\n`;
      }
      
      // Add isolated nodes (no dependencies)
      if (dependencies.length === 0 && graph.getDependents(operation).length === 0) {
        dot += `    "${operation}";\n`;
      }
    }
    
    dot += '}';
    
    return dot;
  }

  /**
   * Generates an HTML report with an interactive diagram.
   * @param graph The dependency graph
   * @param executionOrder The resolved execution order (if available)
   * @param executionResults The execution results (if available)
   * @returns HTML string containing an interactive diagram
   */
  generateHtmlReport(
    graph: DependencyGraph, 
    executionOrder: OperationType[] = [],
    executionResults: OperationResult[] = []
  ): string {
    const mermaidDiagram = this.generateMermaidDiagram(graph);
    const operations = graph.getAllOperations();
    
    // Build the results mapping
    const resultsMap = new Map<OperationType, OperationResult>();
    for (const result of executionResults) {
      resultsMap.set(result.operationType, result);
    }
    
    // Generate HTML
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>API Operation Dependency Graph</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .container { display: flex; }
    .graph { flex: 1; }
    .operations { flex: 1; margin-left: 20px; }
    .operation { margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
    .success { background-color: #d4edda; }
    .failure { background-color: #f8d7da; }
    .execution-order { margin-top: 20px; }
    .execution-order ol { padding-left: 20px; }
    h1, h2 { color: #333; }
  </style>
</head>
<body>
  <h1>API Operation Dependency Graph</h1>
  
  <div class="container">
    <div class="graph">
      <h2>Dependency Graph</h2>
      <div class="mermaid">
${mermaidDiagram}
      </div>
    </div>
    
    <div class="operations">
      <h2>Operations</h2>
`;

    // Add operations details
    for (const operation of operations) {
      const result = resultsMap.get(operation);
      const dependencies = graph.getDependencies(operation);
      const dependents = graph.getDependents(operation);
      
      html += `
      <div class="operation ${result ? (result.success ? 'success' : 'failure') : ''}">
        <h3>${operation}</h3>
        <p><strong>Dependencies:</strong> ${dependencies.length ? dependencies.join(', ') : 'None'}</p>
        <p><strong>Dependents:</strong> ${dependents.length ? dependents.join(', ') : 'None'}</p>
        ${result ? `
        <p><strong>Status:</strong> ${result.success ? 'Success' : 'Failure'}</p>
        <p><strong>Duration:</strong> ${result.durationMs}ms</p>
        <p><strong>Timestamp:</strong> ${result.timestamp.toLocaleString()}</p>
        ${result.error ? `<p><strong>Error:</strong> ${result.error.message}</p>` : ''}
        ` : ''}
      </div>
`;
    }

    // Add execution order if available
    if (executionOrder.length > 0) {
      html += `
      <div class="execution-order">
        <h2>Execution Order</h2>
        <ol>
`;
      
      for (const operation of executionOrder) {
        html += `          <li>${operation}</li>\n`;
      }
      
      html += `
        </ol>
      </div>
`;
    }

    html += `
    </div>
  </div>
  
  <script>
    mermaid.initialize({
      startOnLoad: true,
      securityLevel: 'loose',
      theme: 'default'
    });
  </script>
</body>
</html>
`;

    return html;
  }
}