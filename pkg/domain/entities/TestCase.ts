/**
 * TestCase entity representing a test case in the domain
 */
export interface TestCase {
  id: string;
  name: string;  // Added for compatibility with Zephyr and qTest
  title: string;
  description: string;
  status: TestCaseStatus;
  priority: Priority;
  steps: TestStep[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Additional fields used by providers
  customFields?: Record<string, any>;
  attachments?: Attachment[];
  history?: HistoryEntry[];
  action?: string;
  expected?: string;
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
  action?: string;  // Alternative name for description in some systems
  expected?: string; // Alternative name for expectedResult in some systems
}

export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url?: string;
  content?: Buffer;
}

export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: Date;
  user: string;
  changes?: Record<string, any>;
}