/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ProviderService } from './ProviderService';
import { TransformationService } from './TransformationService';
import { MigrationService } from './MigrationService';
import { TestCaseService } from './TestCaseService';
import { TestExecutionService } from './TestExecutionService';

// Create and export service instances
export const providerService = new ProviderService();
export const transformationService = new TransformationService();
export const migrationService = new MigrationService();
export const testCaseService = new TestCaseService();
export const testExecutionService = new TestExecutionService();

// Export service classes
export * from './ProviderService';
export * from './TransformationService';
export * from './MigrationService';
export * from './TestCaseService';
export * from './TestExecutionService';

// Export type definitions
export type { ErrorDetails, RemediationSuggestion, DetailedMigrationStatus } from './MigrationService';
export type { TestCase, TestStep, TestCaseAttachment, ProviderFormat } from './TestCaseService';
export type { TestExecution, TestExecutionAttachment, ExecutionFilter } from './TestExecutionService';
