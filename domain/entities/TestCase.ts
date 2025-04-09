/**
 * TestCase entity represents a test case from any testing platform
 */
export interface TestCase {
  id: string;
  title: string;
  description?: string;
  platform: string;
  steps?: TestStep[];
  expectedResults?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  status?: string;
  priority?: string;
  automationStatus?: 'automated' | 'manual' | 'planned';
}

/**
 * TestStep represents a single step within a test case
 */
export interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult?: string;
}