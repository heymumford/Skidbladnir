import { TestExecution } from '../entities/TestExecution';

/**
 * Domain service interface for test execution operations
 */
export interface TestExecutionService {
  validateExecution(execution: Partial<TestExecution>): string[];
  calculateExecutionMetrics(executions: TestExecution[]): ExecutionMetrics;
  generateExecutionReport(executionId: string): Promise<ExecutionReport>;
  compareExecutions(executionId1: string, executionId2: string): Promise<ExecutionComparison>;
}

export interface ExecutionMetrics {
  passRate: number;
  failRate: number;
  blockRate: number;
  avgDuration: number;
  totalExecutions: number;
}

export interface ExecutionReport {
  executionId: string;
  testCaseDetails: {
    id: string;
    title: string;
  };
  summary: {
    status: string;
    duration: number;
    executedBy: string;
    executionDate: Date;
  };
  stepResults: {
    order: number;
    description: string;
    expectedResult: string;
    actualResult: string;
    status: string;
  }[];
  notes: string;
}

export interface ExecutionComparison {
  execution1: {
    id: string;
    date: Date;
    status: string;
  };
  execution2: {
    id: string;
    date: Date;
    status: string;
  };
  differences: {
    stepNumber: number;
    status1: string;
    status2: string;
    actualResult1: string;
    actualResult2: string;
  }[];
}
