import { TestCase } from '../entities/TestCase';

/**
 * Repository interface for TestCase entity operations
 */
export interface TestCaseRepository {
  findById(id: string): Promise<TestCase | null>;
  findAll(filters?: TestCaseFilters): Promise<TestCase[]>;
  create(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase>;
  update(id: string, testCase: Partial<TestCase>): Promise<TestCase | null>;
  delete(id: string): Promise<boolean>;
}

export interface TestCaseFilters {
  status?: string[];
  priority?: string[];
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}
