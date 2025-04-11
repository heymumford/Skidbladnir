import { TestCase } from '../../domain/entities/TestCase';
import { TestCaseRepository } from '../../domain/repositories/TestCaseRepository';
import { ValidationError, EntityNotFoundError } from '../../domain/errors/DomainErrors';

/**
 * Controller interface for test case API endpoints
 */
export interface TestCaseController {
  getTestCase(id: string): Promise<TestCaseResponse>;
  getAllTestCases(filters: TestCaseFilterParams): Promise<TestCasesListResponse>;
  createTestCase(data: CreateTestCaseRequest): Promise<TestCaseResponse>;
  updateTestCase(id: string, data: UpdateTestCaseRequest): Promise<TestCaseResponse>;
  deleteTestCase(id: string): Promise<void>;
  getTestCaseSteps(id: string): Promise<TestCaseStepsResponse>;
}

/**
 * Request type for creating a test case
 */
export interface CreateTestCaseRequest {
  title: string;
  description: string;
  status?: string;
  priority?: string;
  steps?: {
    description: string;
    expectedResult: string;
  }[];
  tags?: string[];
}

/**
 * Request type for updating a test case
 */
export interface UpdateTestCaseRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  steps?: {
    order: number;
    description: string;
    expectedResult: string;
  }[];
  tags?: string[];
}

/**
 * Response type for a single test case
 */
export interface TestCaseResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _links: {
    self: { href: string };
    steps: { href: string };
    executions: { href: string };
  };
}

/**
 * Response type for a list of test cases
 */
export interface TestCasesListResponse {
  items: TestCaseResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  _links: {
    self: { href: string };
    first: { href: string };
    prev?: { href: string };
    next?: { href: string };
    last: { href: string };
  };
}

/**
 * Response type for test case steps
 */
export interface TestCaseStepsResponse {
  testCaseId: string;
  steps: {
    order: number;
    description: string;
    expectedResult: string;
  }[];
  _links: {
    testCase: { href: string };
  };
}

/**
 * Request parameters for filtering test cases
 */
export interface TestCaseFilterParams {
  status?: string[];
  priority?: string[];
  tags?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Implementation of the test case controller
 */
export class TestCaseControllerImpl implements TestCaseController {
  constructor(
    private readonly testCaseRepository: TestCaseRepository,
    private readonly baseUrl: string
  ) {}

  async getTestCase(id: string): Promise<TestCaseResponse> {
    const testCase = await this.testCaseRepository.findById(id);
    
    if (!testCase) {
      throw new EntityNotFoundError('TestCase', id);
    }
    
    return this.mapToTestCaseResponse(testCase);
  }

  async getAllTestCases(filters: TestCaseFilterParams): Promise<TestCasesListResponse> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    
    const repositoryFilters = {
      status: filters.status,
      priority: filters.priority,
      tags: filters.tags,
      search: filters.search,
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    const testCases = await this.testCaseRepository.findAll(repositoryFilters);
    const totalCount = testCases.length; // In a real implementation, would get this from a count query
    
    const items = testCases.map(testCase => this.mapToTestCaseResponse(testCase));
    
    // Calculate pagination links
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return {
      items,
      totalCount,
      page,
      pageSize,
      _links: {
        self: { href: `${this.baseUrl}/test-cases?page=${page}&pageSize=${pageSize}` },
        first: { href: `${this.baseUrl}/test-cases?page=1&pageSize=${pageSize}` },
        prev: page > 1 ? { href: `${this.baseUrl}/test-cases?page=${page - 1}&pageSize=${pageSize}` } : undefined,
        next: page < totalPages ? { href: `${this.baseUrl}/test-cases?page=${page + 1}&pageSize=${pageSize}` } : undefined,
        last: { href: `${this.baseUrl}/test-cases?page=${totalPages}&pageSize=${pageSize}` }
      }
    };
  }

  async createTestCase(data: CreateTestCaseRequest): Promise<TestCaseResponse> {
    // Validate request data
    this.validateCreateRequest(data);
    
    // Map request to domain entity
    const testCaseData = {
      name: data.title, // Add name field for compatibility
      title: data.title,
      description: data.description,
      status: data.status ? data.status as any : 'DRAFT',
      priority: data.priority ? data.priority as any : 'MEDIUM',
      steps: data.steps ? data.steps.map((step, index) => ({
        order: index + 1,
        description: step.description,
        expectedResult: step.expectedResult
      })) : [],
      tags: data.tags || []
    };
    
    // Create test case
    const createdTestCase = await this.testCaseRepository.create(testCaseData);
    
    // Return response
    return this.mapToTestCaseResponse(createdTestCase);
  }

  async updateTestCase(id: string, data: UpdateTestCaseRequest): Promise<TestCaseResponse> {
    // Validate the test case exists
    const existingTestCase = await this.testCaseRepository.findById(id);
    
    if (!existingTestCase) {
      throw new EntityNotFoundError('TestCase', id);
    }
    
    // Map request to update data
    const updateData: Partial<TestCase> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status as any;
    if (data.priority !== undefined) updateData.priority = data.priority as any;
    if (data.tags !== undefined) updateData.tags = data.tags;
    
    if (data.steps !== undefined) {
      updateData.steps = data.steps.map(step => ({
        order: step.order,
        description: step.description,
        expectedResult: step.expectedResult
      }));
    }
    
    // Update test case
    const updatedTestCase = await this.testCaseRepository.update(id, updateData);
    
    if (!updatedTestCase) {
      throw new Error('Failed to update test case');
    }
    
    // Return response
    return this.mapToTestCaseResponse(updatedTestCase);
  }

  async deleteTestCase(id: string): Promise<void> {
    const deleted = await this.testCaseRepository.delete(id);
    
    if (!deleted) {
      throw new EntityNotFoundError('TestCase', id);
    }
  }

  async getTestCaseSteps(id: string): Promise<TestCaseStepsResponse> {
    const testCase = await this.testCaseRepository.findById(id);
    
    if (!testCase) {
      throw new EntityNotFoundError('TestCase', id);
    }
    
    return {
      testCaseId: testCase.id,
      steps: testCase.steps.map(step => ({
        order: step.order,
        description: step.description,
        expectedResult: step.expectedResult
      })),
      _links: {
        testCase: { href: `${this.baseUrl}/test-cases/${id}` }
      }
    };
  }

  private mapToTestCaseResponse(testCase: TestCase): TestCaseResponse {
    return {
      id: testCase.id,
      title: testCase.title,
      description: testCase.description,
      status: testCase.status,
      priority: testCase.priority,
      tags: testCase.tags,
      createdAt: testCase.createdAt.toISOString(),
      updatedAt: testCase.updatedAt.toISOString(),
      _links: {
        self: { href: `${this.baseUrl}/test-cases/${testCase.id}` },
        steps: { href: `${this.baseUrl}/test-cases/${testCase.id}/steps` },
        executions: { href: `${this.baseUrl}/test-cases/${testCase.id}/executions` }
      }
    };
  }

  private validateCreateRequest(data: CreateTestCaseRequest): void {
    const validationErrors: string[] = [];
    
    if (!data.title) {
      validationErrors.push('Title is required');
    }
    
    if (!data.description) {
      validationErrors.push('Description is required');
    }
    
    if (data.steps && data.steps.some(step => !step.description || !step.expectedResult)) {
      validationErrors.push('All steps must have a description and expected result');
    }
    
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid test case data', validationErrors);
    }
  }
}
