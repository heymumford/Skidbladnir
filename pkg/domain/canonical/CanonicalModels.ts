/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Canonical data models for the translation layer.
 * 
 * These models provide a system-agnostic representation of test assets
 * that can be used for bidirectional conversion between different test
 * management systems.
 */

/**
 * Represents the lifecycle state of a test case.
 */
export enum TestCaseStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  APPROVED = 'APPROVED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Indicates the outcome of a test execution.
 */
export enum ExecutionStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  NOT_EXECUTED = 'NOT_EXECUTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SKIPPED = 'SKIPPED'
}

/**
 * Indicates the importance and urgency of a test case.
 */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Represents a file attached to a test case, step, or execution.
 */
export interface CanonicalAttachment {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  storageLocation: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  metadata?: Record<string, any>;
  content?: Buffer; // For in-memory processing
}

/**
 * Represents a custom field with its value and metadata.
 */
export interface CanonicalCustomField {
  name: string;
  value: any;
  fieldType: string;
  fieldId?: string;
  systemId?: string;
  namespace?: string;
  options?: string[];
  required?: boolean;
  isCustom?: boolean;
}

/**
 * Defines a single step within a test case.
 */
export interface CanonicalTestStep {
  id: string;
  order: number;
  action: string;
  expectedResult: string;
  data?: string;
  isDataDriven?: boolean;
  attachments?: CanonicalAttachment[];
  customFields?: CanonicalCustomField[];
  metadata?: Record<string, any>;
}

/**
 * Records the outcome of executing a single test step.
 */
export interface CanonicalStepResult {
  stepId: string;
  status: ExecutionStatus;
  actualResult?: string;
  notes?: string;
  attachments?: CanonicalAttachment[];
  executionTime?: number; // In seconds
  defects?: string[];
  metadata?: Record<string, any>;
}

/**
 * Information about test automation for a test case.
 */
export interface CanonicalAutomation {
  isAutomated?: boolean;
  scriptPath?: string;
  language?: string;
  framework?: string;
  automationId?: string;
  repository?: string;
  metadata?: Record<string, any>;
}

/**
 * Represents a tag or label attached to a test case.
 */
export interface CanonicalTag {
  name: string;
  color?: string;
  category?: string;
  systemId?: string;
}

/**
 * Represents a link to another entity, such as a requirement.
 */
export interface CanonicalLink {
  type: string; // e.g., "requirement", "defect", "test-case"
  targetId: string;
  relationship?: string; // e.g., "verifies", "blocks", "relates-to"
  url?: string;
  description?: string;
  systemId?: string;
}

/**
 * Represents a user reference.
 */
export interface CanonicalUser {
  id: string;
  username?: string;
  email?: string;
  displayName?: string;
  systemId?: string;
}

/**
 * Standard system-agnostic representation of a test case.
 */
export interface CanonicalTestCase {
  id: string;
  name: string;
  objective: string;
  status: TestCaseStatus;
  priority: Priority;
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  // Core fields
  preconditions?: string;
  description?: string;
  testSteps?: CanonicalTestStep[];
  
  // Organization
  folderPath?: string;
  suiteId?: string;
  
  // Metadata
  createdAt?: Date;
  createdBy?: CanonicalUser;
  updatedAt?: Date;
  updatedBy?: CanonicalUser;
  
  // Attribution
  owner?: CanonicalUser;
  assignee?: CanonicalUser;
  
  // Related items
  attachments?: CanonicalAttachment[];
  tags?: CanonicalTag[];
  links?: CanonicalLink[];
  customFields?: CanonicalCustomField[];
  
  // Automation
  automation?: CanonicalAutomation;
  
  // Versioning
  version?: string;
  isLatestVersion?: boolean;
  
  // Migration tracking
  migrationId?: string;
  migrationStatus?: string;
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Records the execution of a test case.
 */
export interface CanonicalTestExecution {
  id: string;
  testCaseId: string;
  status: ExecutionStatus;
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  // Core execution data
  startTime?: Date;
  endTime?: Date;
  environment?: string;
  buildVersion?: string;
  stepResults?: CanonicalStepResult[];
  
  // Attribution
  executedBy?: CanonicalUser;
  
  // Test cycle reference
  testCycleId?: string;
  
  // Description and timing
  description?: string;
  executionTime?: number; // In seconds
  
  // Related items
  attachments?: CanonicalAttachment[];
  defects?: string[];
  comments?: string[];
  customFields?: CanonicalCustomField[];
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Group of related test cases.
 */
export interface CanonicalTestSuite {
  id: string;
  name: string;
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  // Organization
  description?: string;
  parentId?: string;
  path?: string;
  
  // Content references
  testCaseIds?: string[];
  
  // Metadata
  createdAt?: Date;
  createdBy?: CanonicalUser;
  updatedAt?: Date;
  updatedBy?: CanonicalUser;
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Represents a test execution cycle or test run.
 */
export interface CanonicalTestCycle {
  id: string;
  name: string;
  status: string; // Open, Closed, In Progress
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  // Core fields
  description?: string;
  environment?: string;
  buildVersion?: string;
  
  // Time boundaries
  startDate?: Date;
  endDate?: Date;
  
  // Content references
  testCaseIds?: string[];
  executionIds?: string[];
  folderPath?: string;
  
  // Attribution
  owner?: CanonicalUser;
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Represents a requirement linked to test cases.
 */
export interface CanonicalRequirement {
  id: string;
  name: string;
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  description?: string;
  priority?: string;
  status?: string;
  
  // Organization
  parentId?: string;
  path?: string;
  
  // References
  testCaseIds?: string[];
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Represents a defect or issue linked to test executions.
 */
export interface CanonicalDefect {
  id: string;
  title: string;
  
  // System identifiers
  sourceSystem?: string;
  externalId?: string;
  systemId?: string;
  
  description?: string;
  severity?: string;
  priority?: string;
  status?: string;
  
  // Attribution
  reporter?: CanonicalUser;
  assignee?: CanonicalUser;
  
  // Dates
  createdAt?: Date;
  updatedAt?: Date;
  
  // References
  testCaseIds?: string[];
  executionIds?: string[];
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Records a translation from one system to another.
 */
export interface CanonicalTranslation {
  sourceSystem: string;
  targetSystem: string;
  entityType: string; // test-case, test-step, etc.
  sourceId: string;
  targetId: string;
  status: string; // success, error, partial
  timestamp: Date;
  sourceData?: Record<string, any>;
  targetData?: Record<string, any>;
  messages?: string[];
  
  // Migration tracking
  migrationId?: string;
  
  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Context for a transformation operation.
 */
export interface TransformationContext {
  sourceSystem: string;
  targetSystem: string;
  migrationId?: string;
  userId?: string;
  fieldMappings?: Record<string, string>;
  valueMappings?: Record<string, Record<string, any>>;
  options?: Record<string, any>;
}

/**
 * Represents a migration job with source and target configurations.
 */
export interface MigrationJob {
  id: string;
  name: string;
  
  // System configuration
  sourceSystem: string;
  sourceConfig: Record<string, any>;
  targetSystem: string;
  targetConfig: Record<string, any>;
  
  // Scope
  entityTypes: string[]; // test-case, test-suite, etc.
  
  description?: string;
  filters?: Record<string, any>;
  
  // Configuration
  fieldMappings?: Record<string, Record<string, string>>; // by entity type
  valueMappings?: Record<string, Record<string, Record<string, any>>>; // by entity type and field
  
  // Status tracking
  status: string; // CREATED, RUNNING, COMPLETED, FAILED, PAUSED
  startTime?: Date;
  endTime?: Date;
  
  // Progress tracking
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  
  // Attribution
  createdBy?: string;
  createdAt: Date;
  
  // Additional data
  metadata?: Record<string, any>;
}