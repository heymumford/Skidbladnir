import { TestSuite } from '../entities/TestSuite';

/**
 * Repository interface for TestSuite entity operations
 */
export interface TestSuiteRepository {
  findById(id: string): Promise<TestSuite | null>;
  findByParentId(parentId: string | null): Promise<TestSuite[]>;
  findAll(): Promise<TestSuite[]>;
  create(testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuite>;
  update(id: string, testSuite: Partial<TestSuite>): Promise<TestSuite | null>;
  delete(id: string): Promise<boolean>;
  addTestCase(suiteId: string, testCaseId: string): Promise<boolean>;
  removeTestCase(suiteId: string, testCaseId: string): Promise<boolean>;
}
