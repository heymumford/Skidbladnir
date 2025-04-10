/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationExecutor } from '../../../../pkg/interfaces/api/operations/OperationExecutor';
import { 
  Operation, 
  OperationContext, 
  OperationDefinition, 
  OperationType 
} from '../../../../pkg/interfaces/api/operations/types';

// Test operation types
enum TestOperationType {
  FETCH_DATA = 'FETCH_DATA',
  PROCESS_DATA = 'PROCESS_DATA',
  SAVE_RESULTS = 'SAVE_RESULTS'
}

// Mock operation factory
function createMockOperation(
  type: OperationType, 
  executeFn: (context: OperationContext) => Promise<any>,
  requiredParams: string[] = []
): Operation {
  const definition: OperationDefinition = {
    type,
    name: `${type} Operation`,
    description: `Mock operation for ${type}`,
    requiredParams
  };

  return {
    definition,
    execute: executeFn
  };
}

describe('OperationExecutor', () => {
  let executor: OperationExecutor;
  
  beforeEach(() => {
    executor = new OperationExecutor(3, 10); // 3 retries, 10ms delay for faster tests
  });

  describe('executeOperation', () => {
    it('should successfully execute an operation', async () => {
      const mockOperation = createMockOperation(
        TestOperationType.FETCH_DATA,
        async () => ({ data: [1, 2, 3] })
      );
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const result = await executor['executeOperation'](mockOperation, context);
      
      expect(result.operationType).toBe(TestOperationType.FETCH_DATA);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: [1, 2, 3] });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle operation failures', async () => {
      const errorMessage = 'Test operation failed';
      const mockOperation = createMockOperation(
        TestOperationType.FETCH_DATA,
        async () => { throw new Error(errorMessage); }
      );
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const result = await executor['executeOperation'](mockOperation, context);
      
      expect(result.operationType).toBe(TestOperationType.FETCH_DATA);
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(errorMessage);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should validate required parameters', async () => {
      const mockOperation = createMockOperation(
        TestOperationType.PROCESS_DATA,
        async () => ({ processed: true }),
        ['dataId']
      );
      
      const contextWithoutParam: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const result = await executor['executeOperation'](mockOperation, contextWithoutParam);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Missing required parameter: dataId');
      
      const contextWithParam: OperationContext = { 
        input: { dataId: '123' }, 
        results: {}
      };
      
      const successResult = await executor['executeOperation'](mockOperation, contextWithParam);
      expect(successResult.success).toBe(true);
    });
  });

  describe('executeWithResilience', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = createMockOperation(
        TestOperationType.FETCH_DATA,
        async () => ({ success: true, data: 'test data' })
      );
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const result = await executor.executeWithResilience(mockOperation, context);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, data: 'test data' });
    });

    it('should retry failed operations and handle eventual success', async () => {
      jest.setTimeout(10000); // Extend timeout for this test
      
      // Create a mock function to track calls
      const executeMock = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure 1'))
        .mockRejectedValueOnce(new Error('Temporary failure 2'))
        .mockResolvedValueOnce({ success: true, attempts: 3 });
      
      const mockOperation = {
        definition: {
          type: TestOperationType.FETCH_DATA,
          name: 'Fetch Data Operation',
          description: 'Mock operation for fetching data',
          requiredParams: []
        },
        execute: executeMock
      };
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      // Use very small delay for testing
      executor = new OperationExecutor(3, 1);
      
      const result = await executor.executeWithResilience(mockOperation, context);
      
      expect(executeMock).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, attempts: 3 });
    });

    it('should fail after max retries', async () => {
      jest.setTimeout(10000); // Extend timeout for this test
      
      // Create a mock function to track calls
      const executeMock = jest.fn()
        .mockRejectedValue(new Error('Persistent failure'));
      
      const mockOperation = {
        definition: {
          type: TestOperationType.FETCH_DATA,
          name: 'Fetch Data Operation',
          description: 'Mock operation for fetching data',
          requiredParams: []
        },
        execute: executeMock
      };
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      // Use very small delay for testing
      executor = new OperationExecutor(3, 1);
      
      const result = await executor.executeWithResilience(mockOperation, context);
      
      expect(executeMock).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Persistent failure');
    });

    it('should respect abort signals', async () => {
      const abortController = new AbortController();
      
      const mockOperation = createMockOperation(
        TestOperationType.FETCH_DATA,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { success: true };
        }
      );
      
      const context: OperationContext = { 
        input: {}, 
        results: {},
        abortSignal: abortController.signal
      };
      
      // Abort immediately
      abortController.abort();
      
      const result = await executor.executeWithResilience(mockOperation, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation was aborted');
    });
  });

  describe('executeOperations', () => {
    it('should execute operations in sequence', async () => {
      const executionOrder: string[] = [];
      
      const operations = [
        createMockOperation(
          TestOperationType.FETCH_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.FETCH_DATA);
            return { id: '123', value: 'test data' };
          }
        ),
        createMockOperation(
          TestOperationType.PROCESS_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.PROCESS_DATA);
            // Access results from previous operation
            const fetchData = context.results[TestOperationType.FETCH_DATA];
            return { 
              processedId: fetchData.id,
              processedValue: fetchData.value.toUpperCase()
            };
          }
        ),
        createMockOperation(
          TestOperationType.SAVE_RESULTS,
          async (context) => {
            executionOrder.push(TestOperationType.SAVE_RESULTS);
            // Access results from previous operation
            const processedData = context.results[TestOperationType.PROCESS_DATA];
            return { 
              saved: true,
              timestamp: new Date(),
              data: processedData
            };
          }
        )
      ];
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const results = await executor.executeOperations(operations, context);
      
      // Verify execution order
      expect(executionOrder).toEqual([
        TestOperationType.FETCH_DATA,
        TestOperationType.PROCESS_DATA,
        TestOperationType.SAVE_RESULTS
      ]);
      
      // Verify results
      expect(results.length).toBe(3);
      
      expect(results[0].operationType).toBe(TestOperationType.FETCH_DATA);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toEqual({ id: '123', value: 'test data' });
      
      expect(results[1].operationType).toBe(TestOperationType.PROCESS_DATA);
      expect(results[1].success).toBe(true);
      expect(results[1].data).toEqual({ 
        processedId: '123', 
        processedValue: 'TEST DATA' 
      });
      
      expect(results[2].operationType).toBe(TestOperationType.SAVE_RESULTS);
      expect(results[2].success).toBe(true);
      expect(results[2].data.saved).toBe(true);
      expect(results[2].data.data).toEqual({ 
        processedId: '123', 
        processedValue: 'TEST DATA' 
      });
      
      // Verify context was updated with results
      expect(context.results).toEqual({
        [TestOperationType.FETCH_DATA]: { id: '123', value: 'test data' },
        [TestOperationType.PROCESS_DATA]: { 
          processedId: '123', 
          processedValue: 'TEST DATA' 
        },
        [TestOperationType.SAVE_RESULTS]: {
          saved: true,
          timestamp: expect.any(Date),
          data: {
            processedId: '123',
            processedValue: 'TEST DATA'
          }
        }
      });
    });

    it('should stop execution when an operation fails', async () => {
      const executionOrder: string[] = [];
      
      const operations = [
        createMockOperation(
          TestOperationType.FETCH_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.FETCH_DATA);
            return { id: '123', value: 'test data' };
          }
        ),
        createMockOperation(
          TestOperationType.PROCESS_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.PROCESS_DATA);
            throw new Error('Processing failed');
          }
        ),
        createMockOperation(
          TestOperationType.SAVE_RESULTS,
          async (context) => {
            executionOrder.push(TestOperationType.SAVE_RESULTS);
            return { saved: true };
          }
        )
      ];
      
      const context: OperationContext = { 
        input: {}, 
        results: {}
      };
      
      const results = await executor.executeOperations(operations, context);
      
      // Verify only first two operations were attempted
      expect(executionOrder).toEqual([
        TestOperationType.FETCH_DATA,
        TestOperationType.PROCESS_DATA
      ]);
      
      // Verify results
      expect(results.length).toBe(2);
      
      expect(results[0].operationType).toBe(TestOperationType.FETCH_DATA);
      expect(results[0].success).toBe(true);
      
      expect(results[1].operationType).toBe(TestOperationType.PROCESS_DATA);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toBe('Processing failed');
      
      // Verify context was updated only with successful results
      expect(context.results).toEqual({
        [TestOperationType.FETCH_DATA]: { id: '123', value: 'test data' }
      });
    });

    it('should stop execution when aborted', async () => {
      const abortController = new AbortController();
      const executionOrder: string[] = [];
      
      const operations = [
        createMockOperation(
          TestOperationType.FETCH_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.FETCH_DATA);
            return { id: '123', value: 'test data' };
          }
        ),
        createMockOperation(
          TestOperationType.PROCESS_DATA,
          async (context) => {
            executionOrder.push(TestOperationType.PROCESS_DATA);
            // Abort before third operation
            abortController.abort();
            return { processed: true };
          }
        ),
        createMockOperation(
          TestOperationType.SAVE_RESULTS,
          async (context) => {
            executionOrder.push(TestOperationType.SAVE_RESULTS);
            return { saved: true };
          }
        )
      ];
      
      const context: OperationContext = { 
        input: {}, 
        results: {},
        abortSignal: abortController.signal
      };
      
      const results = await executor.executeOperations(operations, context);
      
      // Verify only first two operations were executed
      expect(executionOrder).toEqual([
        TestOperationType.FETCH_DATA,
        TestOperationType.PROCESS_DATA
      ]);
      
      // Verify results
      expect(results.length).toBe(2);
    });
  });
});