import { TestCase } from '../entities/TestCase';

/**
 * Domain service interface for test case operations
 */
export interface TestCaseService {
  validateTestCase(testCase: Partial<TestCase>): string[];
  enrichTestCaseMetadata(testCase: TestCase): Promise<TestCase>;
  generateTestSteps(description: string): Promise<TestCase['steps']>;
  calculateTestComplexity(testCase: TestCase): number;
  checkForDuplicates(testCase: TestCase): Promise<TestCase[]>;
}
