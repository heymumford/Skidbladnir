/**
 * TestExecution entity representing an execution of a test case
 */
export interface TestExecution {
  id: string;
  testCaseId: string;
  executionDate: Date;
  executedBy: string;
  status: ExecutionStatus;
  duration: number; // in seconds
  environment: string;
  buildVersion: string;
  notes: string;
  stepResults: StepResult[];
}

export enum ExecutionStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  NOT_EXECUTED = 'NOT_EXECUTED',
  IN_PROGRESS = 'IN_PROGRESS'
}

export interface StepResult {
  stepOrder: number;
  status: ExecutionStatus;
  actualResult: string;
  notes: string;
}
