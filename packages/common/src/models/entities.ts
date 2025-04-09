/**
 * Common entity models for TestBridge
 * 
 * These models represent the canonical data format used internally,
 * independent of source or target systems.
 */

/**
 * Base entity interface with common properties
 */
export interface BaseEntity {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
  sourceId?: string;
  targetId?: string;
}

/**
 * Test case entity
 */
export interface TestCase extends BaseEntity {
  objective?: string;
  precondition?: string;
  priority?: string;
  status?: string;
  folder?: string;
  labels?: string[];
  customFields?: Map<string, any>;
  steps: TestStep[];
  attachments?: Attachment[];
}

/**
 * Test step entity
 */
export interface TestStep {
  id?: string;
  sequence: number;
  action: string;
  expectedResult?: string;
  testData?: string;
  attachments?: Attachment[];
}

/**
 * Test cycle entity
 */
export interface TestCycle extends BaseEntity {
  folder?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  environment?: string;
  testCases: TestCycleItem[];
  customFields?: Map<string, any>;
}

/**
 * Test case reference within a test cycle
 */
export interface TestCycleItem {
  id: string;
  testCaseId: string;
  assignee?: string;
  status?: string;
  executionId?: string;
}

/**
 * Test execution entity
 */
export interface TestExecution extends BaseEntity {
  testCaseId: string;
  testCycleId: string;
  status: string;
  executedBy?: string;
  executedAt?: Date;
  environment?: string;
  duration?: number;
  results: TestStepResult[];
  defects?: Defect[];
  customFields?: Map<string, any>;
  attachments?: Attachment[];
}

/**
 * Test step execution result
 */
export interface TestStepResult {
  stepId?: string;
  sequence: number;
  status: string;
  actualResult?: string;
  comment?: string;
  attachments?: Attachment[];
}

/**
 * Defect linkage
 */
export interface Defect {
  id: string;
  summary?: string;
  url?: string;
  status?: string;
}

/**
 * Binary attachment metadata
 */
export interface Attachment {
  id?: string;
  filename: string;
  contentType: string;
  size?: number;
  storageKey?: string;
  description?: string;
  createdBy?: string;
  createdAt?: Date;
  thumbnailStorageKey?: string;
}

/**
 * Project configuration
 */
export interface Project {
  id: string;
  name: string;
  sourceProjectId: string;
  targetProjectId: string;
  sourceProjectKey?: string;
  fieldMappings?: Map<string, string>;
  statusMappings?: Map<string, string>;
  priorityMappings?: Map<string, string>;
}

/**
 * Folder structure (hierarchical)
 */
export interface Folder extends BaseEntity {
  parentId?: string;
  path?: string;
  children?: Folder[];
}

/**
 * Migration job tracking
 */
export interface MigrationJob {
  id: string;
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  progress?: number;
  error?: string;
  stats?: MigrationStats;
}

/**
 * Migration statistics
 */
export interface MigrationStats {
  totalTestCases: number;
  processedTestCases: number;
  totalTestCycles: number;
  processedTestCycles: number;
  totalExecutions: number;
  processedExecutions: number;
  totalAttachments: number;
  processedAttachments: number;
  errors: number;
}