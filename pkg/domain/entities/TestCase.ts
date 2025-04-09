/**
 * TestCase entity representing a test case in the domain
 */
export interface TestCase {
  id: string;
  title: string;
  description: string;
  status: TestCaseStatus;
  priority: Priority;
  steps: TestStep[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TestCaseStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  APPROVED = 'APPROVED',
  DEPRECATED = 'DEPRECATED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface TestStep {
  order: number;
  description: string;
  expectedResult: string;
}