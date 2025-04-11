/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationType, ProviderApiContract } from '../types';

/**
 * API contract for the qTest Manager provider.
 * Defines the operations, their dependencies, and provider-specific validation rules.
 */
// Import the correct types
import { OperationDefinition, ValidationRule } from '../types';

// Define mock implementations for all operations to satisfy TypeScript
const defaultOperation: OperationDefinition = {
  type: OperationType.AUTHENTICATE,
  dependencies: [],
  required: false,
  description: 'Default operation implementation',
  requiredParams: []
};

const allOperationTypes: Record<OperationType, OperationDefinition> = 
  Object.values(OperationType).reduce((acc, type) => {
    acc[type] = { ...defaultOperation, type };
    return acc;
  }, {} as Record<OperationType, OperationDefinition>);

export const qtestManagerApiContract: ProviderApiContract = {
  providerId: 'qtest_manager',
  operations: {
    // Add missing operations to make TypeScript happy
    ...allOperationTypes,
    [OperationType.AUTHENTICATE]: {
      type: OperationType.AUTHENTICATE,
      dependencies: [],
      required: true,
      description: 'Authenticate with qTest API',
      requiredParams: ['apiKey', 'baseUrl'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_PROJECTS]: {
      type: OperationType.GET_PROJECTS,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get all projects from qTest',
      requiredParams: [],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_PROJECT]: {
      type: OperationType.GET_PROJECT,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECTS],
      required: true,
      description: 'Get a specific project from qTest',
      requiredParams: ['projectId'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_MODULES]: {
      type: OperationType.GET_MODULES,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECT],
      required: true,
      description: 'Get modules from a qTest project',
      requiredParams: ['projectId'],
      estimatedTimeCost: 3000
    },
    [OperationType.GET_MODULE]: {
      type: OperationType.GET_MODULE,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_MODULES],
      required: true,
      description: 'Get a specific module from qTest',
      requiredParams: ['moduleId'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_TEST_CASES]: {
      type: OperationType.GET_TEST_CASES,
      dependencies: [
        OperationType.AUTHENTICATE, 
        OperationType.GET_PROJECT, 
        OperationType.GET_MODULE
      ],
      required: true,
      description: 'Get test cases from a qTest module',
      requiredParams: ['projectId', 'moduleId'],
      estimatedTimeCost: 5000
    },
    [OperationType.GET_TEST_CASE]: {
      type: OperationType.GET_TEST_CASE,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get a specific test case from qTest',
      requiredParams: ['testCaseId', 'projectId'],
      estimatedTimeCost: 1000
    },
    [OperationType.CREATE_TEST_CASE]: {
      type: OperationType.CREATE_TEST_CASE,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_MODULE],
      required: true,
      description: 'Create a test case in qTest',
      requiredParams: ['projectId', 'moduleId', 'testCaseData'],
      estimatedTimeCost: 2000
    },
    [OperationType.UPDATE_TEST_CASE]: {
      type: OperationType.UPDATE_TEST_CASE,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Update a test case in qTest',
      requiredParams: ['projectId', 'testCaseId', 'testCaseData'],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_ATTACHMENTS]: {
      type: OperationType.GET_ATTACHMENTS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Get attachments for a qTest test case',
      requiredParams: ['projectId', 'testCaseId'],
      estimatedTimeCost: 2000
    },
    [OperationType.UPLOAD_ATTACHMENT]: {
      type: OperationType.UPLOAD_ATTACHMENT,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Upload an attachment to a qTest test case',
      requiredParams: ['projectId', 'testCaseId', 'attachmentData'],
      estimatedTimeCost: 3000
    },
    [OperationType.GET_TEST_RUNS]: {
      type: OperationType.GET_TEST_RUNS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Get test runs for a qTest test case',
      requiredParams: ['projectId', 'testCaseId'],
      estimatedTimeCost: 2000
    },
    [OperationType.CREATE_TEST_RUN]: {
      type: OperationType.CREATE_TEST_RUN,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Create a test run for a qTest test case',
      requiredParams: ['projectId', 'testCaseId', 'testRunData'],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_TEST_EXECUTIONS]: {
      type: OperationType.GET_TEST_EXECUTIONS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_RUNS],
      required: false,
      description: 'Get test executions for a qTest test run',
      requiredParams: ['projectId', 'testRunId'],
      estimatedTimeCost: 2000
    },
    [OperationType.CREATE_TEST_EXECUTION]: {
      type: OperationType.CREATE_TEST_EXECUTION,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_RUNS],
      required: false,
      description: 'Create a test execution for a qTest test run',
      requiredParams: ['projectId', 'testRunId', 'executionData'],
      estimatedTimeCost: 2000
    }
  },
  validationRules: {
    projectId: ((value: any) => typeof value === 'number' && value > 0) as ValidationRule,
    moduleId: ((value: any) => typeof value === 'number' && value > 0) as ValidationRule,
    testCaseId: ((value: any) => typeof value === 'number' && value > 0) as ValidationRule,
    testRunId: ((value: any) => typeof value === 'number' && value > 0) as ValidationRule
  }
};