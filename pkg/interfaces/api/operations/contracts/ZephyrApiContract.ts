/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  OperationType, 
  ProviderApiContract,
  OperationDefinition, 
  ValidationRule 
} from '../types';

/**
 * API contract for the Zephyr Scale provider.
 * Defines the operations, their dependencies, and provider-specific validation rules.
 */

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

export const zephyrApiContract: ProviderApiContract = {
  providerId: 'zephyr',
  operations: {
    // Add missing operations to make TypeScript happy
    ...allOperationTypes,
    [OperationType.AUTHENTICATE]: {
      type: OperationType.AUTHENTICATE,
      dependencies: [],
      required: true,
      description: 'Authenticate with Zephyr API',
      requiredParams: ['apiKey', 'baseUrl'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_PROJECTS]: {
      type: OperationType.GET_PROJECTS,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get all projects from Zephyr',
      requiredParams: [],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_PROJECT]: {
      type: OperationType.GET_PROJECT,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECTS],
      required: true,
      description: 'Get a specific project from Zephyr',
      requiredParams: ['projectId'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_TEST_CASES]: {
      type: OperationType.GET_TEST_CASES,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_PROJECT],
      required: true,
      description: 'Get test cases from a Zephyr project',
      requiredParams: ['projectId'],
      estimatedTimeCost: 5000
    },
    [OperationType.GET_TEST_CASE]: {
      type: OperationType.GET_TEST_CASE,
      dependencies: [OperationType.AUTHENTICATE],
      required: true,
      description: 'Get a specific test case from Zephyr',
      requiredParams: ['testCaseId'],
      estimatedTimeCost: 1000
    },
    [OperationType.GET_ATTACHMENTS]: {
      type: OperationType.GET_ATTACHMENTS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Get attachments for a Zephyr test case',
      requiredParams: ['testCaseId'],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_ATTACHMENT]: {
      type: OperationType.GET_ATTACHMENT,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_ATTACHMENTS],
      required: false,
      description: 'Get a specific attachment from Zephyr',
      requiredParams: ['attachmentId'],
      estimatedTimeCost: 3000
    },
    [OperationType.GET_TEST_RUNS]: {
      type: OperationType.GET_TEST_RUNS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Get test runs for a Zephyr test case',
      requiredParams: ['testCaseId'],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_TEST_EXECUTIONS]: {
      type: OperationType.GET_TEST_EXECUTIONS,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_RUNS],
      required: false,
      description: 'Get test executions for a Zephyr test run',
      requiredParams: ['testRunId'],
      estimatedTimeCost: 2000
    },
    [OperationType.GET_HISTORY]: {
      type: OperationType.GET_HISTORY,
      dependencies: [OperationType.AUTHENTICATE, OperationType.GET_TEST_CASE],
      required: false,
      description: 'Get history for a Zephyr test case',
      requiredParams: ['testCaseId'],
      estimatedTimeCost: 2000
    }
  },
  validationRules: {
    projectId: ((value: any) => typeof value === 'string' && value.length > 0) as ValidationRule,
    testCaseId: ((value: any) => typeof value === 'string' && /^[A-Z]+-\d+$/.test(value)) as ValidationRule,
    attachmentId: ((value: any) => typeof value === 'string' && value.length > 0) as ValidationRule
  }
};