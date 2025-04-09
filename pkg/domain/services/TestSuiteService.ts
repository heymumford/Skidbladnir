import { TestSuite } from '../entities/TestSuite';

/**
 * Domain service interface for test suite operations
 */
export interface TestSuiteService {
  validateTestSuite(testSuite: Partial<TestSuite>): string[];
  calculateSuiteCoverage(suiteId: string): Promise<number>;
  getTestSuiteHierarchy(suiteId: string): Promise<TestSuite[]>;
  mergeSuites(sourceSuiteId: string, targetSuiteId: string): Promise<TestSuite>;
  cloneSuite(suiteId: string, newName: string): Promise<TestSuite>;
}
