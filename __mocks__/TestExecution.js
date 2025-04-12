/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock for TestExecution entity and related types
export const ExecutionStatus = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  NOT_EXECUTED: 'NOT_EXECUTED',
  IN_PROGRESS: 'IN_PROGRESS'
};

export class StepResult {
  stepOrder = 1;
  status = ExecutionStatus.PASSED;
  actualResult = 'Expected result was achieved';
  notes = 'Test notes';

  constructor(props = {}) {
    Object.assign(this, props);
  }
}

export class TestExecution {
  id = 'mock-execution-id';
  testCaseId = 'mock-test-id';
  executionDate = new Date().toISOString();
  executedBy = 'test-user@example.com';
  status = ExecutionStatus.PASSED;
  duration = 120;
  environment = 'Test Environment';
  buildVersion = '1.0.0';
  notes = 'Test execution notes';
  stepResults = [new StepResult()];

  constructor(props = {}) {
    Object.assign(this, props);
  }
}

// Default export
export default {
  ExecutionStatus,
  StepResult,
  TestExecution
};
