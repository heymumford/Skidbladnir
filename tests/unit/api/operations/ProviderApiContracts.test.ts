/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationDependencyResolver } from '../../../../pkg/interfaces/api/operations/OperationDependencyResolver';
import { OperationType, ProviderApiContract } from '../../../../pkg/interfaces/api/operations/types';
import { zephyrApiContract } from '../../../../pkg/interfaces/api/operations/contracts/ZephyrApiContract';
import { qtestManagerApiContract as qTestApiContract } from '../../../../pkg/interfaces/api/operations/contracts/QTestApiContract';

describe('Provider API Contracts', () => {
  let resolver: OperationDependencyResolver;

  beforeEach(() => {
    resolver = new OperationDependencyResolver();
  });

  function validateContractStructure(contract: ProviderApiContract): void {
    expect(contract.providerId).toBeDefined();
    expect(typeof contract.providerId).toBe('string');
    expect(contract.operations).toBeDefined();
    expect(typeof contract.operations).toBe('object');

    // Check that each operation definition has the required properties
    Object.values(contract.operations).forEach(operation => {
      expect(operation.type).toBeDefined();
      expect(Object.values(OperationType)).toContain(operation.type);
      expect(operation.dependencies).toBeDefined();
      expect(Array.isArray(operation.dependencies)).toBe(true);
      expect(operation.required).toBeDefined();
      expect(typeof operation.required).toBe('boolean');
      expect(operation.description).toBeDefined();
      expect(typeof operation.description).toBe('string');
      expect(operation.requiredParams).toBeDefined();
      expect(Array.isArray(operation.requiredParams)).toBe(true);
    });

    // Validate that any validation rules are functions
    if (contract.validationRules) {
      Object.values(contract.validationRules).forEach(rule => {
        expect(typeof rule).toBe('function');
      });
    }
  }

  function validateDependenciesExist(contract: ProviderApiContract): void {
    // Check that all dependencies are defined operations
    Object.values(contract.operations).forEach(operation => {
      operation.dependencies.forEach(dependency => {
        expect(contract.operations[dependency]).toBeDefined();
      });
    });
  }

  describe('Zephyr API Contract', () => {
    it('should have a valid contract structure', () => {
      validateContractStructure(zephyrApiContract);
    });

    it('should reference only existing operations in dependencies', () => {
      validateDependenciesExist(zephyrApiContract);
    });

    it('should have no circular dependencies', () => {
      const { valid, errors } = resolver.validateDependencies(
        Object.values(zephyrApiContract.operations)
      );
      
      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('should provide a valid execution order', () => {
      const executionOrder = resolver.resolveExecutionOrder(
        Object.values(zephyrApiContract.operations)
      );
      
      expect(executionOrder.length).toBeGreaterThan(0);
      
      // Check that dependencies come before operations that depend on them
      for (let i = 0; i < executionOrder.length; i++) {
        const operation = zephyrApiContract.operations[executionOrder[i]];
        
        for (const dependency of operation.dependencies) {
          const dependencyIndex = executionOrder.indexOf(dependency);
          expect(dependencyIndex).toBeLessThan(i);
        }
      }
    });

    it('should have defined validation rules', () => {
      expect(zephyrApiContract.validationRules).toBeDefined();
      
      // Test projectId validation
      expect(zephyrApiContract.validationRules?.projectId('PRJ-123')).toBe(true);
      expect(zephyrApiContract.validationRules?.projectId('')).toBe(false);
      
      // Test testCaseId validation
      expect(zephyrApiContract.validationRules?.testCaseId('TEST-123')).toBe(true);
      expect(zephyrApiContract.validationRules?.testCaseId('123')).toBe(false);
      expect(zephyrApiContract.validationRules?.testCaseId('test-123')).toBe(false);
    });
  });

  describe('QTest API Contract', () => {
    it('should have a valid contract structure', () => {
      validateContractStructure(qTestApiContract);
    });

    it('should reference only existing operations in dependencies', () => {
      validateDependenciesExist(qTestApiContract);
    });

    it('should have no circular dependencies', () => {
      const { valid, errors } = resolver.validateDependencies(
        Object.values(qTestApiContract.operations)
      );
      
      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('should provide a valid execution order', () => {
      const executionOrder = resolver.resolveExecutionOrder(
        Object.values(qTestApiContract.operations)
      );
      
      expect(executionOrder.length).toBeGreaterThan(0);
      
      // Check that dependencies come before operations that depend on them
      for (let i = 0; i < executionOrder.length; i++) {
        const operation = qTestApiContract.operations[executionOrder[i]];
        
        for (const dependency of operation.dependencies) {
          const dependencyIndex = executionOrder.indexOf(dependency);
          expect(dependencyIndex).toBeLessThan(i);
        }
      }
    });
    
    it('should have defined validation rules', () => {
      expect(qTestApiContract.validationRules).toBeDefined();
      
      // Test projectId validation
      expect(qTestApiContract.validationRules?.projectId(123)).toBe(true);
      expect(qTestApiContract.validationRules?.projectId(0)).toBe(false);
      expect(qTestApiContract.validationRules?.projectId('123')).toBe(false);
      
      // Test moduleId validation
      expect(qTestApiContract.validationRules?.moduleId(456)).toBe(true);
      expect(qTestApiContract.validationRules?.moduleId(-1)).toBe(false);
      expect(qTestApiContract.validationRules?.moduleId('456')).toBe(false);
      
      // Test testCaseId validation
      expect(qTestApiContract.validationRules?.testCaseId(789)).toBe(true);
      expect(qTestApiContract.validationRules?.testCaseId(0)).toBe(false);
      expect(qTestApiContract.validationRules?.testCaseId('789')).toBe(false);
    });
  });

  describe('Cross-Provider Operation Compatibility', () => {
    it('should have compatible required operations', () => {
      // Get all required operations from each provider
      const zephyrRequiredOps = Object.values(zephyrApiContract.operations)
        .filter(op => op.required)
        .map(op => op.type);
      
      const qTestRequiredOps = Object.values(qTestApiContract.operations)
        .filter(op => op.required)
        .map(op => op.type);
      
      // Common core operations that should be required in all providers
      const coreOperations = [
        OperationType.AUTHENTICATE,
        OperationType.GET_PROJECTS,
        OperationType.GET_TEST_CASES
      ];
      
      // Verify that all core operations are required in both providers
      coreOperations.forEach(operation => {
        expect(zephyrRequiredOps).toContain(operation);
        expect(qTestRequiredOps).toContain(operation);
      });
    });

    it('should have compatible operation parameter names for common operations', () => {
      // Common operations to check parameter compatibility
      const commonOperations = [
        OperationType.AUTHENTICATE,
        OperationType.GET_PROJECTS,
        OperationType.GET_PROJECT,
        OperationType.GET_TEST_CASES,
        OperationType.GET_TEST_CASE
      ];
      
      // Check that parameter names are consistent across providers
      commonOperations.forEach(operation => {
        if (zephyrApiContract.operations[operation] && qTestApiContract.operations[operation]) {
          // Parameters should have the same names for consistent mapping
          const zephyrParams = zephyrApiContract.operations[operation].requiredParams;
          const qTestParams = qTestApiContract.operations[operation].requiredParams;
          
          // Allow for additional provider-specific parameters, but common ones should match
          const commonParamNames = zephyrParams.filter(param => qTestParams.includes(param));
          
          // Both providers should have at least some common parameter names
          if (zephyrParams.length > 0 && qTestParams.length > 0) {
            expect(commonParamNames.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });
});