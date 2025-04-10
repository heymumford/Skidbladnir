# API Operation Dependency System Design

## Overview

This document outlines the design for a dependency-aware operation sequencing system in the migration workflow. This system will ensure that API operations are executed in the correct order based on provider-specific requirements and dependencies between operations.

## Problem Statement

Currently, the migration process follows a fixed sequential flow that is hardcoded and not provider-specific. Different API providers may have different requirements for operation ordering:

- Some APIs require fetching project metadata before accessing test cases
- Some APIs require fetching modules/folders before test cases
- Some operations depend on identifiers from previous operations
- Some APIs have specific sequencing requirements for authentication refreshing

Without a formal way to model and enforce these dependencies, we risk:
1. API failures when operations are performed out of order
2. Inefficient execution with unnecessary waiting or retries
3. Code duplication across providers to handle similar dependencies
4. Difficulty in adding new providers with unique dependency requirements

## Solution Design

We propose implementing a **Dependency-Aware Operation Sequencer** with the following components:

### 1. Operation Dependencies Model

```typescript
// Define operation types that can be performed
export enum OperationType {
  AUTHENTICATE = 'authenticate',
  GET_PROJECTS = 'get_projects',
  GET_PROJECT = 'get_project',
  GET_TEST_CASES = 'get_test_cases',
  GET_TEST_CASE = 'get_test_case',
  CREATE_TEST_CASE = 'create_test_case',
  UPDATE_TEST_CASE = 'update_test_case',
  GET_ATTACHMENTS = 'get_attachments',
  UPLOAD_ATTACHMENT = 'upload_attachment',
  GET_HISTORY = 'get_history',
  CREATE_HISTORY = 'create_history',
  // ... other operations
}

// Define an operation with its dependencies
export interface OperationDefinition {
  type: OperationType;
  // Operations that must be completed before this one
  dependencies: OperationType[];
  // Is this operation required for the provider?
  required: boolean;
  // Description for better understanding
  description: string;
  // Parameters this operation requires
  requiredParams: string[];
  // Estimated time/cost (for optimization)
  estimatedTimeCost?: number;
}

// Define a provider's API contract including operation sequencing
export interface ProviderApiContract {
  providerId: string;
  operations: Record<OperationType, OperationDefinition>;
  // Provider-specific validation rules
  validationRules?: {
    [key: string]: (value: any) => boolean;
  };
}
```

### 2. Dependency Graph and Topological Sorting

The system will use a directed acyclic graph (DAG) to represent operation dependencies and topological sorting to determine the execution order:

```typescript
// Represents a directed graph of operation dependencies
export class DependencyGraph {
  private nodes: Map<OperationType, Set<OperationType>> = new Map();
  
  // Add node to graph
  addNode(operation: OperationType): void;
  
  // Add dependency (edge) from one operation to another
  addDependency(dependent: OperationType, dependency: OperationType): void;
  
  // Get all dependencies for an operation
  getDependencies(operation: OperationType): OperationType[];
  
  // Get all operations that depend on a given operation
  getDependents(operation: OperationType): OperationType[];
  
  // Check if graph contains cycles (impossible dependency resolution)
  hasCycles(): boolean;
  
  // Get all operations in the graph
  getAllOperations(): OperationType[];
}

// Resolves execution order using topological sorting
export class OperationDependencyResolver {
  // Build a dependency graph from operations
  buildDependencyGraph(operations: OperationDefinition[]): DependencyGraph;
  
  // Perform topological sort to determine execution order
  resolveExecutionOrder(graph: DependencyGraph): OperationType[];
  
  // Identify missing operations or circular dependencies
  validateDependencies(graph: DependencyGraph): ValidationResult;
  
  // Find the minimal set of operations needed for a specific goal
  calculateMinimalOperationSet(
    graph: DependencyGraph, 
    goalOperation: OperationType
  ): OperationType[];
}
```

### 3. Operation Executor

The execution engine will run operations in the resolved order with proper error handling and context passing:

```typescript
// Context passed between operations
export interface OperationContext {
  // Input parameters
  input: Record<string, any>;
  // Results from previous operations
  results: Record<OperationType, any>;
  // Provider instances
  sourceProvider: TestManagementProvider;
  targetProvider: TestManagementProvider;
  // Cancellation token
  abortSignal?: AbortSignal;
  // Additional metadata
  metadata: Record<string, any>;
}

// Result of an operation execution
export interface OperationResult {
  operationType: OperationType;
  success: boolean;
  data?: any;
  error?: Error;
  durationMs: number;
  timestamp: Date;
}

// Executes operations in proper order
export class OperationExecutor {
  // Execute operations in correct order with proper error handling
  executeOperations(
    operations: Operation[],
    context: OperationContext
  ): Promise<OperationResult[]>;
  
  // Handle retries and circuit breaking
  executeWithResilience(
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult>;
  
  // Run a single operation
  executeOperation(
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult>;
}
```

### 4. Provider-Specific API Contracts

Each provider will define its own contract with operation dependencies:

```typescript
// Zephyr Example
export const zephyrApiContract: ProviderApiContract = {
  providerId: 'zephyr',
  operations: {
    [OperationType.AUTHENTICATE]: {
      type: OperationType.AUTHENTICATE,
      dependencies: [],
      required: true,
      description: 'Authenticate with Zephyr API',
      requiredParams: ['apiKey', 'baseUrl']
    },
    [OperationType.GET_PROJECTS]: {
      type: OperationType.GET_PROJECTS,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get all projects from Zephyr',
      requiredParams: []
    },
    [OperationType.GET_TEST_CASES]: {
      type: OperationType.GET_TEST_CASES,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECTS],
      required: true,
      description: 'Get test cases from a project',
      requiredParams: ['projectId']
    },
    // ... other operations
  }
};

// QTest Manager Example
export const qtestManagerApiContract: ProviderApiContract = {
  providerId: 'qtest_manager',
  operations: {
    [OperationType.AUTHENTICATE]: {
      type: OperationType.AUTHENTICATE,
      dependencies: [],
      required: true,
      description: 'Authenticate with QTest API',
      requiredParams: ['apiKey', 'baseUrl']
    },
    [OperationType.GET_PROJECTS]: {
      type: OperationType.GET_PROJECTS,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get all projects from QTest',
      requiredParams: []
    },
    // Note: QTest requires getting modules before test cases
    [OperationType.GET_MODULES]: {
      type: OperationType.GET_MODULES, 
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECTS],
      required: true,
      description: 'Get modules from a project',
      requiredParams: ['projectId']
    },
    [OperationType.GET_TEST_CASES]: {
      type: OperationType.GET_TEST_CASES,
      dependencies: [
        OperationType.AUTHENTICATE, 
        OperationType.GET_PROJECTS, 
        OperationType.GET_MODULES
      ],
      required: true,
      description: 'Get test cases from a module',
      requiredParams: ['projectId', 'moduleId']
    },
    // ... other operations
  }
};
```

### 5. Integration with Migration System

```typescript
// Enhanced migration use case
export class DependencyAwareMigrationUseCase extends MigrateTestCasesUseCase {
  constructor(
    private readonly sourceProviderFactory: ProviderFactory,
    private readonly targetProviderFactory: ProviderFactory,
    private readonly operationResolver: OperationDependencyResolver,
    private readonly operationExecutor: OperationExecutor,
    loggerService?: LoggerService
  ) {
    super(sourceProviderFactory, targetProviderFactory, loggerService);
  }
  
  async execute(input: MigrateTestCasesInput): Promise<MigrateTestCasesResult> {
    // Get providers
    const sourceProvider = this.sourceProviderFactory.createProvider(input.sourceSystem);
    const targetProvider = this.targetProviderFactory.createProvider(input.targetSystem);
    
    // Get API contracts
    const sourceContract = await sourceProvider.getApiContract();
    const targetContract = await targetProvider.getApiContract();
    
    // Build operation plan
    const migrationPlan = this.buildMigrationPlan(
      sourceContract,
      targetContract,
      input
    );
    
    // Resolve dependencies
    const graph = this.operationResolver.buildDependencyGraph(migrationPlan.operations);
    const executionOrder = this.operationResolver.resolveExecutionOrder(graph);
    
    // Execute operations in order
    const context = this.createOperationContext(input, sourceProvider, targetProvider);
    await this.operationExecutor.executeOperations(
      executionOrder.map(type => migrationPlan.operationsMap[type]),
      context
    );
    
    // Return results
    return this.buildResult(context);
  }
}
```

### 6. Visualizing Operation Dependencies

We'll create a visualization tool for operation dependencies to help with debugging and understanding the execution flow:

```typescript
// Visualizer for dependency graphs
export class DependencyGraphVisualizer {
  // Generate mermaid.js diagram for dependency graph
  generateMermaidDiagram(graph: DependencyGraph): string;
  
  // Generate DOT format for use with GraphViz
  generateDotDiagram(graph: DependencyGraph): string;
  
  // Generate HTML report with interactive diagram
  generateHtmlReport(
    graph: DependencyGraph, 
    executionOrder: OperationType[],
    executionResults?: OperationResult[]
  ): string;
}
```

## Implementation Plan

1. **Phase 1: Core Dependency System**
   - Define operation types and interfaces
   - Implement dependency graph data structure
   - Implement topological sorting algorithm
   - Add validation for dependency cycles
   - Write tests for graph operations and sorting

2. **Phase 2: Provider API Contracts**
   - Define API contract interface
   - Implement Zephyr API contract
   - Implement QTest API contracts (Manager, Parameters, Scenario)
   - Add validation for contract completeness

3. **Phase 3: Execution Engine**
   - Implement operation executor
   - Add context passing between operations
   - Integrate with existing resilience patterns
   - Support for parallel execution where possible

4. **Phase 4: Migration Integration**
   - Enhance migration use case
   - Update provider interfaces to expose API contracts
   - Integrate with existing workflow state management
   - Add telemetry for operation dependencies

5. **Phase 5: Visualization and Tooling**
   - Implement dependency graph visualizer
   - Add debugging tools for dependency issues
   - Create documentation for extending with new operations
   - Add monitoring for operation execution

## Benefits

1. **Correctness**: Ensures operations are executed in valid order
2. **Efficiency**: Minimizes redundant operations and allows parallelization where possible
3. **Flexibility**: Makes adding new providers easier with explicit dependency declaration
4. **Understandability**: Visualizations make complex API dependencies easier to understand
5. **Reliability**: Better error handling for dependency-related failures

## Conclusion

The API Operation Dependency System will significantly improve the robustness and flexibility of our migration process. By explicitly modeling operation dependencies, we can ensure correct execution order and better handle provider-specific requirements. This system will allow us to easily onboard new providers with unique API contract requirements without code duplication or hardcoded sequences.