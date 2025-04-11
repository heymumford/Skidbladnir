# Zephyr to qTest Migration: Implementation Guide

This document provides a technical implementation guide for developers working on the Zephyr Scale to qTest migration functionality in Skidbladnir.

## Architecture Overview

The Zephyr to qTest migration architecture follows the Clean Architecture principles and consists of several key components:

1. **Provider Adapters**: Interfaces to Zephyr Scale and qTest APIs
2. **Translation Layer**: Converts between data formats
3. **Migration Use Cases**: Orchestrates the migration process
4. **API Operation Dependency System**: Manages operation ordering and dependencies
5. **UI Components**: Presents the migration interface to users

## Provider Adapters

### Zephyr Adapter

The Zephyr adapter is responsible for extracting test data from Zephyr Scale.

```typescript
// Simplified example
import { ZephyrProvider } from '../../packages/providers/zephyr-extractor';

const zephyrProvider = new ZephyrProvider();
await zephyrProvider.initialize({
  baseUrl: 'https://your-jira-instance.atlassian.net/rest/zapi/latest',
  apiToken: 'your-api-token',
  projectKey: 'PROJECT'
});

const testCases = await zephyrProvider.getTestCases('PROJECT');
```

### qTest Adapter

The qTest adapter consists of several specialized components for different aspects of the qTest API:

1. **qTest Manager**: For test case structure
2. **qTest Parameters**: For parameterized testing
3. **qTest Scenario**: For BDD scenarios
4. **qTest Pulse**: For test insights
5. **qTest Data Export**: For backup/archiving

```typescript
// Simplified example
import { QTestManagerProvider } from '../../packages/providers/qtest-loader';
import { QTestParametersProvider } from '../../packages/providers/qtest/parameters-provider';

const qtestProvider = new QTestManagerProvider();
await qtestProvider.initialize({
  baseUrl: 'https://instance.qtestnet.com/api/v3',
  apiToken: 'your-api-token'
});

// For parameterized testing
const parametersProvider = new QTestParametersProvider();
await parametersProvider.initialize({
  baseUrl: 'https://instance.qtestnet.com/api/v3',
  apiToken: 'your-api-token'
});
```

## Zephyr-to-qTest API Type Adapter

To handle the differences between Zephyr Scale and qTest APIs, we use an adapter:

```typescript
import { ZephyrQTestAdapter } from '../../pkg/interfaces/api/operations/adapters/providers/ZephyrQTestAdapter';
import { ZephyrQTestContextAdapter } from '../../pkg/interfaces/api/operations/adapters/providers/ZephyrQTestContextAdapter';

// Convert a Zephyr operation to qTest format
const qtestOperation = ZephyrQTestAdapter.toQTestOperation(zephyrOperation);

// Convert operation context
const qtestContext = ZephyrQTestContextAdapter.toQTestContext(zephyrContext);
```

Key features of the adapter:
- Bidirectional conversion between Zephyr and qTest operations
- Data structure transformation for different field formats
- Support for handling missing fields and different data types
- Parameter mapping between corresponding endpoints

## Translation Layer

The translation layer converts between the canonical data model and provider-specific formats.

```typescript
import { Transformer } from '../../pkg/domain/canonical/Transformer';
import { QTestMapper } from '../../pkg/domain/canonical/mappers/QTestMapper';
import { ZephyrMapper } from '../../pkg/domain/canonical/mappers/ZephyrMapper';

// Convert Zephyr data to canonical format
const zephyrMapper = new ZephyrMapper();
const canonicalTestCase = zephyrMapper.toCanonical(zephyrTestCase);

// Convert canonical format to qTest
const qtestMapper = new QTestMapper();
const qtestTestCase = qtestMapper.fromCanonical(canonicalTestCase);

// Use the Transformer for direct conversion
const transformer = new Transformer(zephyrMapper, qtestMapper);
const transformedTestCase = transformer.transform(zephyrTestCase);
```

Custom field mappings can be defined in a configuration object:

```typescript
const fieldMappings = {
  'zephyr.priority': 'qtest.priority_id',
  'zephyr.summary': 'qtest.name',
  'zephyr.description': 'qtest.description',
  'zephyr.labels': 'qtest.properties.labels',
  // Custom transformations
  'zephyr.custom_field_1': {
    target: 'qtest.properties.custom_field_1',
    transform: (value) => value.toUpperCase()
  }
};
```

## API Operation Dependency System

The API operation dependency system ensures operations are executed in the correct order.

```typescript
import { 
  OperationDependencyResolver,
  OperationExecutor
} from '../../pkg/interfaces/api/operations';

// Define operations with dependencies
const operations = [
  {
    type: 'authenticate',
    dependencies: [],
    required: true
  },
  {
    type: 'get_projects',
    dependencies: ['authenticate'],
    required: true
  },
  {
    type: 'get_test_cases',
    dependencies: ['authenticate', 'get_projects'],
    required: true
  }
];

// Resolve execution order
const resolver = new OperationDependencyResolver();
const executionOrder = resolver.resolveExecutionOrder(operations);

// Execute operations in order
const executor = new OperationExecutor();
const results = await executor.executeOperations(executionOrder, context);
```

## Migration Use Cases

The migration process is orchestrated by use cases that implement the business logic.

```typescript
import { MigrateTestCasesUseCase } from '../../pkg/usecases/migration/MigrateTestCases';
import { DependencyAwareMigrationUseCase } from '../../pkg/usecases/migration/DependencyAwareMigrationUseCase';

// Basic migration
const migrationUseCase = new MigrateTestCasesUseCase(
  sourceProviderFactory,
  targetProviderFactory,
  transformer
);

// Migration with dependency awareness
const dependencyAwareMigration = new DependencyAwareMigrationUseCase(
  sourceProviderFactory,
  targetProviderFactory,
  transformer,
  dependencyResolver,
  executor
);

// Execute migration
const result = await dependencyAwareMigration.execute({
  sourceProvider: 'zephyr',
  targetProvider: 'qtest',
  sourceProject: 'PROJECT',
  targetProject: '12345',
  options: {
    includeAttachments: true,
    fieldMappings: fieldMappings
  }
});
```

## Implementing Field Transformations

Custom field transformations can be implemented for complex data mappings:

```typescript
// Example transformations
const transformations = {
  // Convert string priority to numeric ID
  priorityTransformation: (value) => {
    const priorityMap = {
      'Highest': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4,
      'Lowest': 5
    };
    return priorityMap[value] || 3; // Default to Medium
  },
  
  // Combine fields
  combineFields: (source) => {
    return `${source.field1} - ${source.field2}`;
  },
  
  // Parse JSON stored as string
  parseJsonField: (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
};
```

## Handling Attachments

The migration process handles attachments through the binary processor:

```typescript
import { AttachmentProcessor } from '../../internal/go/binary-processor/processors/AttachmentProcessor';

// In the migration use case
const migrateAttachment = async (attachment, context) => {
  // 1. Download from source
  const attachmentData = await sourceProvider.getAttachment(
    context.sourceProject,
    attachment.id
  );
  
  // 2. Process through binary processor
  const processedAttachment = await binaryProcessor.process(attachmentData, {
    sourceType: context.sourceProvider,
    targetType: context.targetProvider,
    fileName: attachment.fileName
  });
  
  // 3. Upload to target
  return targetProvider.createAttachment(
    context.targetProject,
    processedAttachment
  );
};
```

## Error Handling and Resilience

The migration system implements comprehensive error handling:

```typescript
try {
  await operation.execute(context);
} catch (error) {
  if (error instanceof ProviderError) {
    // Provider-specific error handling
    if (error.isRetryable) {
      // Implement retry logic
      return await retryOperation(operation, context, retryOptions);
    }
  } else if (error instanceof TransformationError) {
    // Handle transformation errors
    logger.error(`Transformation error: ${error.message}`, {
      source: error.sourceField,
      target: error.targetField,
      value: error.value
    });
    
    // Apply fallback transformation if available
    if (error.fallbackAvailable) {
      return error.applyFallback();
    }
  }
  
  // General error handling
  throw new MigrationError(`Failed to execute operation: ${operation.type}`, {
    cause: error,
    context: operationContext,
    recoverable: false
  });
}
```

## UI Integration

The UI components for Zephyr-to-qTest migration include:

1. **Provider Configuration**: Setup for Zephyr and qTest connections
2. **Field Mapping**: Interface for mapping fields between systems
3. **Transformation Preview**: Real-time preview of transformations
4. **Execution Control**: Start, pause, resume, and cancel controls
5. **Monitoring Dashboard**: Progress tracking and status display

```tsx
// Example UI components
import { 
  MigrationWizard,
  ProviderConfigPanel,
  FieldMappingPanel,
  TransformationPreviewPanel,
  ExecutionControlPanel,
  MigrationDashboard
} from '../../packages/ui/src/components';

function ZephyrToQTestMigration() {
  return (
    <MigrationWizard
      sourceProvider="zephyr"
      targetProvider="qtest"
      steps={[
        {
          label: "Configure Providers",
          component: <ProviderConfigPanel />
        },
        {
          label: "Map Fields",
          component: <FieldMappingPanel />
        },
        {
          label: "Preview Transformation",
          component: <TransformationPreviewPanel />
        },
        {
          label: "Execute Migration",
          component: <ExecutionControlPanel />
        },
        {
          label: "Monitor Progress",
          component: <MigrationDashboard />
        }
      ]}
    />
  );
}
```

## Testing and Validation

### Unit Tests

Test specific components of the migration system:

```typescript
describe('ZephyrQTestAdapter', () => {
  it('converts Zephyr operations to qTest format', () => {
    const zephyrOperation = {
      type: 'get_test_case',
      dependencies: ['authenticate'],
      required: true
    };
    
    const qtestOperation = ZephyrQTestAdapter.toQTestOperation(zephyrOperation);
    
    expect(qtestOperation.type).toBe('get_test_case');
    expect(qtestOperation.dependencies).toContain('authenticate');
    expect(qtestOperation.required).toBe(true);
  });
});
```

### Integration Tests

Test the complete migration flow:

```typescript
describe('Zephyr to qTest Migration Integration', () => {
  it('migrates test cases from Zephyr to qTest', async () => {
    // Setup mock providers
    const mockZephyrProvider = createMockZephyrProvider();
    const mockQTestProvider = createMockQTestProvider();
    
    // Configure use case with mocks
    const migrationUseCase = new MigrateTestCasesUseCase(
      () => mockZephyrProvider,
      () => mockQTestProvider,
      new Transformer(new ZephyrMapper(), new QTestMapper())
    );
    
    // Execute migration
    const result = await migrationUseCase.execute({
      sourceProvider: 'zephyr',
      targetProvider: 'qtest',
      sourceProject: 'TEST',
      targetProject: '12345'
    });
    
    // Assertions
    expect(result.status).toBe('completed');
    expect(result.migratedCount).toBe(10);
    expect(mockQTestProvider.createTestCase).toHaveBeenCalledTimes(10);
  });
});
```

### Contract Tests

Validate API contracts using Karate:

```
Feature: Zephyr Scale API Contract Validation

  Scenario: Authenticate with Zephyr Scale API
    Given url zephyrBaseUrl
    And path '/auth/1/session'
    And header Content-Type = 'application/json'
    And request { username: '#(username)', password: '#(password)' }
    When method POST
    Then status 200
    And match response contains { token: '#notnull' }
```

## Performance Considerations

- **Batch Processing**: Group operations for efficiency
- **Parallel Execution**: Execute independent operations concurrently
- **Rate Limiting**: Respect API rate limits
- **Caching**: Cache frequently accessed data
- **Incremental Migration**: Support for resuming interrupted migrations

```typescript
// Example of batch processing
const batchSize = 25;
for (let i = 0; i < testCases.length; i += batchSize) {
  const batch = testCases.slice(i, i + batchSize);
  await Promise.all(batch.map(tc => migrateTestCase(tc, context)));
  
  // Update progress
  progress.update({
    completed: i + batch.length,
    total: testCases.length
  });
}
```

## Debugging and Troubleshooting

Enable detailed logging for troubleshooting:

```typescript
import { LoggerService } from '../../pkg/domain/services/LoggerService';

const logger = LoggerService.getInstance();
logger.setLevel('debug');

// Log API operations
logger.debug('Executing operation', {
  type: operation.type,
  provider: provider.id,
  params: operation.params
});

// Log transformation details
logger.debug('Transforming field', {
  sourceField: field.source,
  sourceValue: field.value,
  targetField: field.target,
  transformedValue: transformedValue
});
```

## Reference

- [API Operation Dependency System](../../docs/api/operation-dependency-system.md)
- [Provider Interface Design](../../docs/adrs/0002-provider-interface-design.md)
- [API Bridge Architecture](../../docs/adrs/0003-api-bridge-architecture.md)
- [TDD Test Completeness](../../docs/project/tdd-test-completeness.md)