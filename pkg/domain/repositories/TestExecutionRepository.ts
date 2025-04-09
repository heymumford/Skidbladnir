import { TestExecution } from '../entities/TestExecution';

/**
 * Repository interface for TestExecution entity operations
 */
export interface TestExecutionRepository {
  findById(id: string): Promise<TestExecution | null>;
  findByTestCaseId(testCaseId: string): Promise<TestExecution[]>;
  create(execution: Omit<TestExecution, 'id'>): Promise<TestExecution>;
  update(id: string, execution: Partial<TestExecution>): Promise<TestExecution | null>;
  delete(id: string): Promise<boolean>;
  getLatestExecutions(limit: number): Promise<TestExecution[]>;
  getExecutionsByDateRange(startDate: Date, endDate: Date): Promise<TestExecution[]>;
}
