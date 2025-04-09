import { TestCase } from '../../../../pkg/domain/entities/TestCase';
import { TestCaseFactory } from '../../../../pkg/domain/entities/TestCaseFactory';
import { TestCaseRepository, TestCaseFilters } from '../../../../pkg/domain/repositories/TestCaseRepository';
import { TestCaseRepositoryImpl } from './TestCaseRepository';
import { ValidationError } from '../../../../pkg/domain/errors/DomainErrors';

/**
 * Decorator for TestCaseRepository that validates entities using domain rules
 * This ensures all entities passing through the repository conform to business rules
 */
export class ValidatedTestCaseRepository implements TestCaseRepository {
  private repository: TestCaseRepository;

  constructor(repository?: TestCaseRepository) {
    // Use the provided repository or create a new in-memory one
    this.repository = repository || new TestCaseRepositoryImpl();
  }

  /**
   * Find a test case by ID
   */
  async findById(id: string): Promise<TestCase | null> {
    const testCase = await this.repository.findById(id);
    
    // If no test case found, return null
    if (!testCase) {
      return null;
    }
    
    // Validate the test case before returning it
    return TestCaseFactory.reconstitute(testCase);
  }

  /**
   * Find all test cases with optional filtering
   */
  async findAll(filters?: TestCaseFilters): Promise<TestCase[]> {
    const testCases = await this.repository.findAll(filters);
    
    // Validate all test cases before returning them
    return testCases.map(testCase => TestCaseFactory.reconstitute(testCase));
  }

  /**
   * Create a new test case
   */
  async create(testCaseData: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    // Create a valid test case using the factory
    const testCase = TestCaseFactory.create({
      title: testCaseData.title,
      description: testCaseData.description,
      status: testCaseData.status,
      priority: testCaseData.priority,
      steps: testCaseData.steps,
      tags: testCaseData.tags
    });
    
    // Store the validated test case
    // We're stripping off id, createdAt, and updatedAt because the underlying repository
    // will generate these, but we've already validated the entity
    const { id, createdAt, updatedAt, ...testCaseToCreate } = testCase;
    
    return this.repository.create(testCaseToCreate);
  }

  /**
   * Update an existing test case
   */
  async update(id: string, updateData: Partial<TestCase>): Promise<TestCase | null> {
    // First check if the test case exists
    const existingTestCase = await this.repository.findById(id);
    if (!existingTestCase) {
      return null;
    }
    
    // Create a merged test case with the updates
    const updatedTestCase = {
      ...existingTestCase,
      ...updateData,
      id, // Ensure ID doesn't change
      createdAt: existingTestCase.createdAt // Preserve creation date
      // Don't include updatedAt - the underlying repository will set it
    };
    
    // Validate the updated test case
    try {
      TestCaseFactory.reconstitute(updatedTestCase as TestCase);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error; // Re-throw validation errors
      }
      throw new Error(`Failed to validate test case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Pass the update to the underlying repository
    return this.repository.update(id, updateData);
  }

  /**
   * Delete a test case
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
  
  /**
   * Add a step to a test case
   */
  async addStep(id: string, description: string, expectedResult: string): Promise<TestCase | null> {
    // First get the existing test case
    const testCase = await this.repository.findById(id);
    if (!testCase) {
      return null;
    }
    
    // Add the step using the factory method to ensure validation
    const updatedTestCase = TestCaseFactory.addStep(testCase, description, expectedResult);
    
    // Update in the repository
    return this.repository.update(id, {
      steps: updatedTestCase.steps,
      updatedAt: updatedTestCase.updatedAt
    });
  }
  
  /**
   * Update the status of a test case
   */
  async updateStatus(id: string, status: string): Promise<TestCase | null> {
    // First get the existing test case
    const testCase = await this.repository.findById(id);
    if (!testCase) {
      return null;
    }
    
    // Update the status using the factory method to ensure validation
    const updatedTestCase = TestCaseFactory.updateStatus(testCase, status as any);
    
    // Update in the repository
    return this.repository.update(id, {
      status: updatedTestCase.status,
      updatedAt: updatedTestCase.updatedAt
    });
  }
  
  /**
   * If the underlying repository is an in-memory implementation,
   * allow populating with sample data
   */
  populateSampleData(): void {
    if (this.repository instanceof TestCaseRepositoryImpl) {
      this.repository.populateSampleData();
    }
  }
}