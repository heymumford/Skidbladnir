/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Defines all possible API operation types supported by the system.
 * Used for dependency management and operation sequencing.
 */
export enum OperationType {
  AUTHENTICATE = 'authenticate',
  GET_PROJECTS = 'get_projects',
  GET_PROJECT = 'get_project',
  GET_MODULES = 'get_modules',
  GET_MODULE = 'get_module',
  GET_TEST_CASES = 'get_test_cases',
  GET_TEST_CASE = 'get_test_case',
  CREATE_TEST_CASE = 'create_test_case',
  UPDATE_TEST_CASE = 'update_test_case',
  DELETE_TEST_CASE = 'delete_test_case',
  GET_ATTACHMENTS = 'get_attachments',
  GET_ATTACHMENT = 'get_attachment',
  UPLOAD_ATTACHMENT = 'upload_attachment',
  GET_TEST_RUNS = 'get_test_runs',
  GET_TEST_RUN = 'get_test_run',
  CREATE_TEST_RUN = 'create_test_run',
  GET_TEST_EXECUTIONS = 'get_test_executions',
  CREATE_TEST_EXECUTION = 'create_test_execution',
  UPDATE_TEST_EXECUTION = 'update_test_execution',
  GET_HISTORY = 'get_history',
  CREATE_HISTORY = 'create_history',
  GET_REQUIREMENTS = 'get_requirements',
  LINK_REQUIREMENT = 'link_requirement'
}

/**
 * Definition of an API operation including its dependencies and requirements.
 */
export interface OperationDefinition {
  type: OperationType;
  dependencies: OperationType[];
  required: boolean;
  description: string;
  requiredParams: string[];
  estimatedTimeCost?: number;
}

/**
 * Definition of a provider's API contract including supported operations and validation rules.
 */
export interface ProviderApiContract {
  providerId: string;
  operations: Record<OperationType, OperationDefinition>;
  validationRules?: {
    [key: string]: (value: any) => boolean;
  };
}

/**
 * Result of an operation validation check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Detailed information about a validation error.
 */
export interface ValidationError {
  type: 'missing_operation' | 'circular_dependency' | 'missing_parameter' | 'validation_failed';
  message: string;
  operation?: OperationType;
  details?: any;
}

/**
 * Context passed between operations during execution.
 */
export interface OperationContext {
  input: Record<string, any>;
  results: Record<OperationType, any>;
  sourceProvider: any;
  targetProvider: any;
  abortSignal?: AbortSignal;
  metadata: Record<string, any>;
}

/**
 * Result of an operation execution.
 */
export interface OperationResult {
  operationType: OperationType;
  success: boolean;
  data?: any;
  error?: Error;
  durationMs: number;
  timestamp: Date;
}

/**
 * Represents an executable operation with its handler.
 */
export interface Operation {
  definition: OperationDefinition;
  execute: (context: OperationContext) => Promise<any>;
}

/**
 * Represents a plan for executing a migration with operations from source and target providers.
 */
export interface MigrationOperationPlan {
  operations: OperationDefinition[];
  operationsMap: Record<OperationType, Operation>;
}