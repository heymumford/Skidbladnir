# API Operation Dependency System

## Overview

The API Operation Dependency System is a powerful feature that ensures operations are executed in the correct order based on their dependencies. This enhances reliability and efficiency by:

1. Preventing API failures from incorrect operation ordering
2. Reducing unnecessary retries and failures
3. Minimizing code duplication across providers
4. Facilitating easier addition of new provider types with unique requirements

The system automatically determines the optimal execution order for complex workflows, handling dependencies between operations across different providers and components.

## Key Components

### 1. Operation Types and Definitions

Each provider defines operations it supports along with their requirements:

```typescript
// Example operation definition
{
  type: "get_test_cases",
  dependencies: ["authenticate", "get_project"],
  required: true,
  description: "Get test cases from a project",
  requiredParams: ["projectId"],
  estimatedTimeCost: 3000
}
```

This clearly specifies:
- What operation does (`description`)
- What it depends on (`dependencies`) 
- Required parameters (`requiredParams`)
- Approximate execution time (`estimatedTimeCost`)

### 2. Dependency Graph

The system builds a directed acyclic graph (DAG) representing operation dependencies:

```
authenticate → get_projects → get_project → get_test_cases
                                          ↘ 
                                            get_attachments → get_attachment
```

The graph helps:
- Identify circular dependencies (impossible to resolve)
- Calculate minimal operation sets for specific goals
- Visualize complex operation relationships

### 3. Topological Sorting

The system performs topological sorting to determine a valid execution order respecting all dependencies. For example:

```
1. authenticate
2. get_projects
3. get_project
4. get_test_cases
5. get_attachments
6. get_attachment
```

### 4. Smart Execution

The execution engine:
- Runs operations in the correct sequence
- Passes context data between operations
- Handles errors with intelligent retry logic
- Supports parallel execution where dependencies allow
- Provides detailed reporting on execution progress and results

## Using the Operation Dependency System

### REST API Endpoints

The system exposes several RESTful endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/operations` | GET | List all available operations |
| `/api/operations/dependency-graph` | GET | Get the dependency graph |
| `/api/operations/validate` | POST | Validate operation dependencies |
| `/api/operations/visualize` | POST | Generate visualization |
| `/api/operations/minimal-set` | POST | Calculate minimal operation set |

### Visualizing Dependencies

The system can generate visualizations in multiple formats:

- **HTML**: Interactive dependency graph with execution details
- **Mermaid**: Flowchart diagram for embedding in documentation
- **DOT**: Format for use with GraphViz and other tools

#### Example Visualization

![Example Dependency Graph](../assets/dependency-graph-example.png)

### Integrating in Custom Code

To use the dependency system in your code:

```typescript
// 1. Create the resolver and executor
const resolver = new OperationDependencyResolver();
const executor = new OperationExecutor();

// 2. Get API contracts from providers
const sourceContract = await sourceProvider.getApiContract();
const targetContract = await targetProvider.getApiContract();

// 3. Build the operation plan
const operations = [
  ...Object.values(sourceContract.operations),
  ...Object.values(targetContract.operations)
];

// 4. Create the dependency graph and resolve order
const graph = resolver.buildDependencyGraph(operations);
const executionOrder = resolver.resolveExecutionOrder(graph);

// 5. Execute operations in proper order
const context = createOperationContext();
const results = await executor.executeOperations(
  executionOrder.map(type => operationsMap[type]),
  context
);
```

## Provider-Specific API Contracts

Each provider in the system defines its own API contract specifying operation dependencies. Here are examples:

### Zephyr Scale Provider

```typescript
{
  providerId: 'zephyr',
  operations: {
    'authenticate': {
      type: 'authenticate',
      dependencies: [],
      required: true,
      description: 'Authenticate with Zephyr API',
      requiredParams: ['apiKey', 'baseUrl']
    },
    'get_projects': {
      type: 'get_projects',
      dependencies: ['authenticate'],
      required: true,
      description: 'Get all projects from Zephyr',
      requiredParams: []
    },
    'get_test_cases': {
      type: 'get_test_cases',
      dependencies: ['authenticate', 'get_project'],
      required: true,
      description: 'Get test cases from a Zephyr project',
      requiredParams: ['projectId']
    }
    // Additional operations...
  }
}
```

### QTest Provider

```typescript
{
  providerId: 'qtest',
  operations: {
    'authenticate': {
      type: 'authenticate',
      dependencies: [],
      required: true,
      description: 'Authenticate with QTest API',
      requiredParams: ['apiKey', 'baseUrl']
    },
    'get_projects': {
      type: 'get_projects',
      dependencies: ['authenticate'],
      required: true,
      description: 'Get all projects from QTest',
      requiredParams: []
    },
    // Note: QTest requires modules before test cases
    'get_modules': {
      type: 'get_modules',
      dependencies: ['authenticate', 'get_project'],
      required: true,
      description: 'Get modules from a project',
      requiredParams: ['projectId']
    },
    'get_test_cases': {
      type: 'get_test_cases',
      dependencies: ['authenticate', 'get_project', 'get_modules'],
      required: true,
      description: 'Get test cases from a QTest module',
      requiredParams: ['projectId', 'moduleId']
    }
    // Additional operations...
  }
}
```

## Error Handling

The system provides detailed validation and error reporting:

### Circular Dependencies

If operations form a cycle (A → B → C → A), the system will:
- Detect the cycle during validation
- Report detailed error information
- Prevent execution of invalid operation sets

### Missing Dependencies

If an operation depends on another that doesn't exist, the system will:
- Identify the missing dependency
- Report which operation(s) are affected
- Suggest possible corrections

### Parameter Validation

The system validates that all required parameters are present before execution, preventing runtime errors from missing data.

## Performance Optimization

The Operation Dependency System includes several optimizations:

1. **Minimal Operation Sets**: Calculate the smallest set of operations needed for a specific goal
2. **Parallel Execution**: Identify operations that can run concurrently
3. **Cost Estimation**: Use estimated time costs to prioritize long-running operations
4. **Intelligent Retries**: Apply backoff strategies for failed operations
5. **Selective Execution**: Skip unnecessary operations based on context

## Extending the System

To add support for a new provider:

1. Define the provider's operations and their dependencies
2. Implement the operation execution logic
3. Register the provider with the system

The system will automatically incorporate the new provider's operations into the dependency graph and execution planning.

## Best Practices

1. **Be explicit about dependencies**: Clearly define what each operation requires
2. **Keep dependency chains as short as possible**: Minimize the depth of dependencies
3. **Avoid optional dependencies**: If an operation truly depends on another, mark it as required
4. **Document operation behavior**: Include clear descriptions for each operation
5. **Validate API contracts**: Use the system's validation features to detect issues early

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Circular dependencies | Review your dependency graph and break cycles |
| Missing operations | Ensure all referenced operations are defined |
| Parameter errors | Verify all required parameters are in the context |
| Slow execution | Check for bottlenecks and optimize expensive operations |
| Execution failures | Review error logs and operation dependencies |

## Conclusion

The API Operation Dependency System provides a robust foundation for managing complex API workflows while ensuring correct operation sequencing. By explicitly modeling operation dependencies, the system enhances reliability, efficiency, and maintainability across diverse provider integrations.