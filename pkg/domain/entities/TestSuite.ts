/**
 * TestSuite entity representing a collection of test cases
 */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[]; // Array of TestCase IDs
  parentSuiteId?: string; // Optional parent suite ID for hierarchical organization
  createdAt: Date;
  updatedAt: Date;
}
