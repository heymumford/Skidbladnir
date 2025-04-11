/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationType, OperationDefinition as ApiOperationDefinition, ValidationResult } from '../../types';
import { OperationDefinition as ProviderOperationDefinition } from '../../../../../../packages/common/src/interfaces/provider';
import { zephyrApiContract } from '../../contracts/ZephyrApiContract';
import { qtestManagerApiContract } from '../../contracts/QTestApiContract';
import { OperationTypeAdapter } from '../OperationTypeAdapter';

/**
 * API type equivalence map between Zephyr Scale and qTest operations
 * This maps Zephyr operation types to their qTest equivalents
 */
const operationTypeMap: Record<string, string> = {
  // Core operations
  'authenticate': OperationType.AUTHENTICATE,
  'get_projects': OperationType.GET_PROJECTS,
  'get_project': OperationType.GET_PROJECT,
  'get_test_cases': OperationType.GET_TEST_CASES,
  'get_test_case': OperationType.GET_TEST_CASE,
  
  // Attachment operations
  'get_attachments': OperationType.GET_ATTACHMENTS,
  'get_attachment': OperationType.GET_ATTACHMENT,
  
  // Module operations (Zephyr doesn't have direct equivalents)
  // 'get_modules': OperationType.GET_MODULES,
  // 'get_module': OperationType.GET_MODULE,
  
  // Test execution operations
  'get_test_runs': OperationType.GET_TEST_RUNS,
  'get_test_executions': OperationType.GET_TEST_EXECUTIONS,
  'get_history': OperationType.GET_HISTORY
};

/**
 * Parameter mapping between Zephyr Scale and qTest
 * This maps Zephyr parameter names to their qTest equivalents
 */
const parameterMap: Record<string, string> = {
  'testCaseId': 'testCaseId',
  'projectId': 'projectId',
  'attachmentId': 'attachmentId',
  'testRunId': 'testRunId',
  'apiKey': 'apiKey',
  'baseUrl': 'baseUrl'
};

/**
 * Adapter for converting between Zephyr Scale and qTest API operations
 */
export class ZephyrQTestAdapter {
  
  /**
   * Convert a Zephyr Scale operation definition to qTest operation definition
   * 
   * @param zephyrOperation Zephyr Scale operation definition with string type
   * @returns qTest operation definition with enum type
   */
  static toQTestOperation(zephyrOperation: ProviderOperationDefinition): ApiOperationDefinition {
    // First convert to standard API operation definition
    const apiOperation = OperationTypeAdapter.toApiOperationDefinition(zephyrOperation);
    
    // Use the qTest operation contract if available, otherwise use the converted API operation
    const operationType = apiOperation.type;
    const qtestOperation = qtestManagerApiContract.operations[operationType];
    
    if (qtestOperation) {
      return qtestOperation;
    }
    
    // If no direct mapping exists, we'll use the API operation with adjusted parameters
    return this.adjustParametersForQTest(apiOperation);
  }
  
  /**
   * Convert a list of Zephyr Scale operation definitions to qTest operation definitions
   * 
   * @param zephyrOperations Array of Zephyr Scale operation definitions
   * @returns Array of qTest operation definitions
   */
  static toQTestOperations(zephyrOperations: ProviderOperationDefinition[]): ApiOperationDefinition[] {
    return zephyrOperations.map(op => this.toQTestOperation(op));
  }
  
  /**
   * Find the qTest equivalent operation for a Zephyr Scale operation type
   * 
   * @param zephyrOperationType Zephyr Scale operation type string
   * @returns The equivalent qTest operation type as an enum, or the original if no mapping exists
   */
  static findEquivalentQTestOperation(zephyrOperationType: string): OperationType {
    const mappedType = operationTypeMap[zephyrOperationType];
    
    if (mappedType) {
      return typeof mappedType === 'string' 
        ? OperationTypeAdapter.stringToOperationType(mappedType)
        : mappedType;
    }
    
    // If no mapping exists, convert the original type to enum format
    return OperationTypeAdapter.stringToOperationType(zephyrOperationType);
  }
  
  /**
   * Map Zephyr Scale parameter names to qTest parameter names
   * 
   * @param zephyrParams An object with Zephyr Scale parameter names and values
   * @returns An object with qTest parameter names and values
   */
  static mapParameters(zephyrParams: Record<string, any>): Record<string, any> {
    const qtestParams: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(zephyrParams)) {
      const mappedKey = parameterMap[key] || key;
      qtestParams[mappedKey] = value;
    }
    
    return qtestParams;
  }
  
  /**
   * Adjust an API operation definition to match qTest requirements
   * 
   * @param apiOperation The API operation definition
   * @returns Adjusted API operation definition for qTest
   */
  private static adjustParametersForQTest(apiOperation: ApiOperationDefinition): ApiOperationDefinition {
    const adjustedOperation = { ...apiOperation };
    
    // qTest requires projectId for almost all operations
    if (!adjustedOperation.requiredParams.includes('projectId') && 
        !['AUTHENTICATE', 'GET_PROJECTS'].includes(apiOperation.type)) {
      adjustedOperation.requiredParams = [...adjustedOperation.requiredParams, 'projectId'];
    }
    
    // Special case for attachments in qTest
    if (apiOperation.type === OperationType.UPLOAD_ATTACHMENT) {
      adjustedOperation.requiredParams = ['projectId', 'testCaseId', 'attachmentData'];
    }
    
    return adjustedOperation;
  }
  
  /**
   * Validate if Zephyr Scale parameters are compatible with qTest requirements
   * 
   * @param zephyrParams An object with Zephyr Scale parameter values
   * @param operationType The operation type being performed
   * @returns Validation result with potential errors
   */
  static validateParameterCompatibility(
    zephyrParams: Record<string, any>, 
    operationType: OperationType
  ): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: []
    };
    
    // Get the qTest operation definition
    const qtestOperation = qtestManagerApiContract.operations[operationType];
    
    if (!qtestOperation) {
      result.valid = false;
      result.errors.push({
        type: 'missing_operation',
        message: `Operation ${operationType} is not supported by qTest`,
        operation: operationType
      });
      return result;
    }
    
    // Check if all required qTest parameters are provided in Zephyr parameters
    for (const requiredParam of qtestOperation.requiredParams) {
      const mappedParam = Object.entries(parameterMap)
        .find(([_, qtestParam]) => qtestParam === requiredParam)?.[0] || requiredParam;
      
      if (zephyrParams[mappedParam] === undefined && zephyrParams[requiredParam] === undefined) {
        result.valid = false;
        result.errors.push({
          type: 'missing_parameter',
          message: `Missing required parameter: ${requiredParam} for operation ${operationType}`,
          operation: operationType,
          details: { paramName: requiredParam }
        });
      }
    }
    
    // Check parameter types using qTest validation rules
    const validationRules = qtestManagerApiContract.validationRules || {};
    
    // Check for null or undefined validationRules before proceeding
    if (validationRules && typeof validationRules === 'object') {
      for (const [param, rule] of Object.entries(validationRules)) {
        if (zephyrParams[param] !== undefined && rule) {
          const isValid = rule(zephyrParams[param]);
          
          if (!isValid) {
            result.valid = false;
            result.errors.push({
              type: 'validation_failed',
              message: `Parameter ${param} failed validation for qTest compatibility`,
              operation: operationType,
              details: { paramName: param, value: zephyrParams[param] }
            });
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get a mapping of Zephyr Scale operations to their qTest equivalents
   * 
   * @returns A record mapping Zephyr operation types to qTest operation types
   */
  static getOperationTypeMap(): Record<string, string> {
    return { ...operationTypeMap };
  }
}