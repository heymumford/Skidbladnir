# Zephyr to qTest API Type Adapter

This document explains how to use the Zephyr Scale to qTest API Type Adapter for seamless migration between the two systems.

## Overview

The Zephyr to qTest adapter provides tools for:

1. Converting between Zephyr Scale and qTest operation definitions
2. Mapping parameters between the two systems
3. Transforming result data structures
4. Converting complete operation contexts
5. Validating parameter compatibility

These adapters are crucial for building a smooth migration workflow between Zephyr Scale and qTest Manager that handles the differences in API structures and data formats.

## Adapter Classes

The adapter functionality is split across two main classes:

### ZephyrQTestAdapter

This class handles the conversion of operation definitions and parameters between Zephyr Scale and qTest.

Key methods:
- `toQTestOperation()` - Converts a Zephyr operation to a qTest operation
- `findEquivalentQTestOperation()` - Finds the qTest equivalent for a Zephyr operation type
- `mapParameters()` - Maps Zephyr parameter names to qTest parameter names
- `validateParameterCompatibility()` - Checks if Zephyr parameters are compatible with qTest

### ZephyrQTestContextAdapter

This class handles the conversion of complete operation contexts, including result data transformations.

Key methods:
- `toQTestContext()` - Converts a Zephyr context to a qTest context
- `toZephyrContext()` - Converts a qTest context back to a Zephyr context
- Various data transformation methods for test cases, attachments, etc.

## Usage Examples

### Converting Operation Definitions

```typescript
import { ZephyrQTestAdapter } from '../../pkg/interfaces/api/operations/adapters';

// Sample Zephyr operation definition
const zephyrOperation = {
  type: 'get_test_case',
  dependencies: ['authenticate'],
  required: true,
  description: 'Get a specific test case from Zephyr',
  requiredParams: ['testCaseId'],
  estimatedTimeCost: 1000
};

// Convert to qTest operation definition
const qtestOperation = ZephyrQTestAdapter.toQTestOperation(zephyrOperation);
```

### Mapping Parameters

```typescript
// Sample Zephyr parameters
const zephyrParams = {
  testCaseId: 'PROJ-123',
  projectId: 'PROJ',
  includeAttachments: true
};

// Convert to qTest parameters
const qtestParams = ZephyrQTestAdapter.mapParameters(zephyrParams);
```

### Converting Operation Context

```typescript
import { ZephyrQTestContextAdapter } from '../../pkg/interfaces/api/operations/adapters';

// Assume zephyrContext contains the complete operation context
const qtestContext = ZephyrQTestContextAdapter.toQTestContext(zephyrContext);

// Use the converted context with qTest operations
```

### Validating Parameter Compatibility

```typescript
import { OperationType } from '../../pkg/interfaces/api/operations/types';

// Check if parameters are compatible with qTest operations
const validation = ZephyrQTestAdapter.validateParameterCompatibility(
  zephyrParams,
  OperationType.GET_TEST_CASE
);

if (validation.valid) {
  // Parameters are compatible
} else {
  // Handle validation errors
  console.error('Validation errors:', validation.errors);
}
```

## Integration in Migration Workflow

The adapters are designed to be used at different points in the migration workflow:

1. **Planning Phase**:
   - Use `ZephyrQTestAdapter.validateParameterCompatibility()` to identify potential issues

2. **Execution Phase**:
   - Use `ZephyrQTestAdapter.toQTestOperation()` to plan operation execution order
   - Use `ZephyrQTestContextAdapter.toQTestContext()` to prepare context for qTest operations

3. **Response Handling**:
   - Use `ZephyrQTestContextAdapter.toZephyrContext()` if you need compatibility with Zephyr-specific handlers

## Special Considerations

### Type Differences

Zephyr Scale and qTest use different formats for certain fields:

- **Test Case IDs**:
  - Zephyr: String format (e.g., "PROJ-123")
  - qTest: Numeric format (e.g., 123)

- **Status Values**:
  - Zephyr: String enum (e.g., "READY", "APPROVED")
  - qTest: Numeric IDs (e.g., "1", "3", "5")

The adapters handle these differences automatically.

### Missing Fields

Some fields exist in one system but not the other:

- qTest has "modules" while Zephyr has folder structures
- qTest uses properties for custom fields while Zephyr has a dedicated customFields object

The context adapter performs appropriate mappings for these differences.

## Complete Example

A complete example demonstrating all aspects of the adapter can be found in:
`/pkg/interfaces/api/operations/adapters/providers/examples/ZephyrQTestAdapterExample.ts`

To run the example:
```bash
npx ts-node /pkg/interfaces/api/operations/adapters/providers/examples/ZephyrQTestAdapterExample.ts
```

## Related Resources

- [Zephyr to qTest Migration Guide](./zephyr-qtest-demo.md)
- [Zephyr Scale API Documentation](https://support.smartbear.com/zephyr-scale-cloud/api-docs/)
- [qTest API Documentation](https://api.qasymphony.com/)