/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationType, OperationContext } from '../../../types';
import { ZephyrQTestAdapter, ZephyrQTestContextAdapter } from '../index';
import { OperationDefinition as ProviderOperationDefinition } from '../../../../../../../packages/common/src/interfaces/provider';

/**
 * Example usage of the Zephyr to qTest adapters
 * This demonstrates how to use the adapters during a migration workflow
 */
export function demonstrateZephyrQTestAdapter() {
  console.log('== Zephyr to qTest Adapter Usage Example ==');
  
  // 1. Operation Definition Conversion
  // ----------------------------------
  // Define a sample Zephyr operation
  const zephyrOperation: ProviderOperationDefinition = {
    type: 'get_test_case',
    dependencies: ['authenticate'],
    required: true,
    description: 'Get a specific test case from Zephyr',
    requiredParams: ['testCaseId'],
    estimatedTimeCost: 1000
  };
  
  console.log('\n1. Convert Zephyr operation definition to qTest format:');
  console.log('Original Zephyr operation:', JSON.stringify(zephyrOperation, null, 2));
  
  // Convert to qTest operation
  const qtestOperation = ZephyrQTestAdapter.toQTestOperation(zephyrOperation);
  console.log('Converted qTest operation:', JSON.stringify(qtestOperation, null, 2));
  
  // 2. Parameter Mapping
  // -------------------
  // Sample Zephyr parameters
  const zephyrParams = {
    testCaseId: 'PROJ-123',
    projectId: 'PROJ',
    includeAttachments: true
  };
  
  console.log('\n2. Map Zephyr parameters to qTest format:');
  console.log('Original Zephyr parameters:', JSON.stringify(zephyrParams, null, 2));
  
  // Convert parameters to qTest format
  const qtestParams = ZephyrQTestAdapter.mapParameters(zephyrParams);
  console.log('Converted qTest parameters:', JSON.stringify(qtestParams, null, 2));
  
  // 3. Parameter Validation
  // ----------------------
  console.log('\n3. Validate parameter compatibility with qTest:');
  
  // Check if parameters are compatible with qTest
  const validation = ZephyrQTestAdapter.validateParameterCompatibility(
    zephyrParams,
    OperationType.GET_TEST_CASE
  );
  
  console.log('Validation result:', JSON.stringify(validation, null, 2));
  
  // 4. Context Conversion
  // --------------------
  // Sample Zephyr operation context
  const zephyrContext: OperationContext = {
    input: {
      testCaseId: 'PROJ-123',
      projectId: 'PROJ'
    },
    results: {
      [OperationType.AUTHENTICATE]: { token: 'zephyr-auth-token' },
      [OperationType.GET_TEST_CASE]: {
        id: '123',
        key: 'PROJ-123',
        name: 'Login Test',
        status: 'READY',
        priority: 'HIGH',
        steps: [
          { id: 'step1', index: 1, description: 'Open login page', expectedResult: 'Login page is displayed' },
          { id: 'step2', index: 2, description: 'Enter credentials', expectedResult: 'User is logged in' }
        ]
      }
    },
    sourceProvider: { id: 'zephyr', name: 'Zephyr Scale' },
    targetProvider: { id: 'qtest', name: 'qTest Manager' },
    metadata: { migrationId: 'migration-123' }
  };
  
  console.log('\n4. Convert Zephyr operation context to qTest context:');
  console.log('Original Zephyr context (partial):', JSON.stringify({
    input: zephyrContext.input,
    results: {
      [OperationType.GET_TEST_CASE]: zephyrContext.results[OperationType.GET_TEST_CASE]
    }
  }, null, 2));
  
  // Convert the context to qTest format
  const qtestContext = ZephyrQTestContextAdapter.toQTestContext(zephyrContext);
  
  console.log('Converted qTest context (partial):', JSON.stringify({
    input: qtestContext.input,
    results: {
      [OperationType.GET_TEST_CASE]: qtestContext.results[OperationType.GET_TEST_CASE]
    }
  }, null, 2));
  
  // 5. Bidirectional Conversion
  // --------------------------
  console.log('\n5. Convert back from qTest to Zephyr (bidirectional support):');
  
  // Convert back to Zephyr format
  const reconvertedContext = ZephyrQTestContextAdapter.toZephyrContext(qtestContext);
  
  console.log('Reconverted Zephyr context (partial):', JSON.stringify({
    input: reconvertedContext.input,
    results: {
      [OperationType.GET_TEST_CASE]: reconvertedContext.results[OperationType.GET_TEST_CASE]
    }
  }, null, 2));
}

// For direct execution of this example
if (require.main === module) {
  demonstrateZephyrQTestAdapter();
}