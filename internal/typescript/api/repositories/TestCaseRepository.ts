import { TestCase, TestCaseStatus, Priority, TestStep as _TestStep } from '../../../../pkg/domain/entities/TestCase';
import { TestCaseRepository, TestCaseFilters } from '../../../../pkg/domain/repositories/TestCaseRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory implementation of TestCaseRepository
 */
export class TestCaseRepositoryImpl implements TestCaseRepository {
  private testCases: Map<string, TestCase> = new Map();

  /**
   * Find a test case by ID
   */
  async findById(id: string): Promise<TestCase | null> {
    const testCase = this.testCases.get(id);
    return testCase ?? null;
  }

  /**
   * Find all test cases with optional filtering
   */
  async findAll(filters?: TestCaseFilters): Promise<TestCase[]> {
    let testCases = Array.from(this.testCases.values());

    // Apply filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        testCases = testCases.filter(tc => filters.status?.includes(tc.status as string));
      }

      if (filters.priority && filters.priority.length > 0) {
        testCases = testCases.filter(tc => filters.priority?.includes(tc.priority as string));
      }

      if (filters.tags && filters.tags.length > 0) {
        testCases = testCases.filter(tc => 
          filters.tags?.some(tag => tc.tags.includes(tag))
        );
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        testCases = testCases.filter(tc => 
          tc.title.toLowerCase().includes(search) || 
          tc.description.toLowerCase().includes(search)
        );
      }

      // Handle pagination
      if (filters.offset !== undefined || filters.limit !== undefined) {
        const offset = filters.offset || 0;
        const limit = filters.limit || testCases.length;
        testCases = testCases.slice(offset, offset + limit);
      }
    }

    return testCases;
  }

  /**
   * Create a new test case
   */
  async create(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const now = new Date();
    
    const newTestCase: TestCase = {
      id: uuidv4(),
      ...testCase,
      createdAt: now,
      updatedAt: now
    };

    this.testCases.set(newTestCase.id, newTestCase);
    return newTestCase;
  }

  /**
   * Update an existing test case
   */
  async update(id: string, testCase: Partial<TestCase>): Promise<TestCase | null> {
    const existingTestCase = this.testCases.get(id);
    
    if (!existingTestCase) {
      return null;
    }

    const updatedTestCase: TestCase = {
      ...existingTestCase,
      ...testCase,
      id, // Ensure ID doesn't change
      createdAt: existingTestCase.createdAt, // Preserve creation date
      updatedAt: new Date() // Update the modification date
    };

    this.testCases.set(id, updatedTestCase);
    return updatedTestCase;
  }

  /**
   * Delete a test case
   */
  async delete(id: string): Promise<boolean> {
    if (!this.testCases.has(id)) {
      return false;
    }

    return this.testCases.delete(id);
  }

  /**
   * Populate repository with sample data (for development/testing)
   */
  populateSampleData(): void {
    const sampleTestCases: TestCase[] = [
      {
        id: uuidv4(),
        name: 'Verify user login with valid credentials',
        title: 'Verify user login with valid credentials',
        description: 'Test the user login functionality with valid credentials',
        status: TestCaseStatus.READY,
        priority: Priority.HIGH,
        steps: [
          {
            order: 1,
            description: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            order: 2,
            description: 'Enter valid username and password',
            expectedResult: 'Credentials are accepted'
          },
          {
            order: 3,
            description: 'Click login button',
            expectedResult: 'User is logged in and redirected to dashboard'
          }
        ],
        tags: ['login', 'authentication', 'smoke'],
        createdAt: new Date(Date.now() - 86400000), // yesterday
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: uuidv4(),
        name: 'Verify user login with invalid credentials',
        title: 'Verify user login with invalid credentials',
        description: 'Test the user login functionality with invalid credentials',
        status: TestCaseStatus.READY,
        priority: Priority.MEDIUM,
        steps: [
          {
            order: 1,
            description: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            order: 2,
            description: 'Enter invalid username and password',
            expectedResult: 'Credentials are rejected'
          },
          {
            order: 3,
            description: 'Click login button',
            expectedResult: 'Error message is displayed'
          }
        ],
        tags: ['login', 'authentication', 'negative'],
        createdAt: new Date(Date.now() - 72000000), // 20 hours ago
        updatedAt: new Date(Date.now() - 72000000)
      },
      {
        id: uuidv4(),
        name: 'User password reset',
        title: 'User password reset',
        description: 'Test the password reset functionality',
        status: TestCaseStatus.DRAFT,
        priority: Priority.LOW,
        steps: [
          {
            order: 1,
            description: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            order: 2,
            description: 'Click on "Forgot Password" link',
            expectedResult: 'Password reset page is displayed'
          },
          {
            order: 3,
            description: 'Enter valid email address',
            expectedResult: 'Email field accepts the input'
          },
          {
            order: 4,
            description: 'Click submit button',
            expectedResult: 'Success message is displayed'
          }
        ],
        tags: ['login', 'password-reset'],
        createdAt: new Date(Date.now() - 43200000), // 12 hours ago
        updatedAt: new Date(Date.now() - 43200000)
      }
    ];

    // Add sample test cases to repository
    sampleTestCases.forEach(testCase => {
      this.testCases.set(testCase.id, testCase);
    });
  }
}