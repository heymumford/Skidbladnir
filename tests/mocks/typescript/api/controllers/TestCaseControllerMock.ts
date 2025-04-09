/**
 * Mock implementation of the TestCaseController
 * Used for TDD during build system implementation
 */
import { TestCase } from '../../../../../pkg/domain/entities/TestCase';
import { TestCaseFilterParams } from '../../../../../pkg/interfaces/api/TestCaseController';

export class TestCaseControllerMock {
  private testCases: TestCase[] = [];
  
  constructor() {
    // Initialize with sample data
    this.testCases = [
      {
        id: 'TC-001',
        title: 'Login Test',
        description: 'Test user login functionality',
        status: 'READY',
        priority: 'HIGH',
        steps: [
          { order: 1, description: 'Navigate to login page', expectedResult: 'Login page is displayed' },
          { order: 2, description: 'Enter credentials', expectedResult: 'User is logged in' }
        ],
        tags: ['login', 'authentication'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'TC-002',
        title: 'Logout Test',
        description: 'Test user logout functionality',
        status: 'READY',
        priority: 'MEDIUM',
        steps: [
          { order: 1, description: 'Click logout button', expectedResult: 'User is logged out' }
        ],
        tags: ['logout', 'authentication'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
  
  async getTestCase(id: string): Promise<any> {
    const testCase = this.testCases.find(tc => tc.id === id);
    if (!testCase) {
      throw new Error(`Test case with ID ${id} not found`);
    }
    
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
        self: { href: `/test-cases/${testCase.id}` },
        steps: { href: `/test-cases/${testCase.id}/steps` },
        executions: { href: `/test-cases/${testCase.id}/executions` }
      }
    };
  }
  
  async getAllTestCases(filters: TestCaseFilterParams): Promise<any> {
    let filteredCases = [...this.testCases];
    
    // Apply filters if provided
    if (filters.status && filters.status.length > 0) {
      filteredCases = filteredCases.filter(tc => filters.status?.includes(tc.status as string));
    }
    
    if (filters.priority && filters.priority.length > 0) {
      filteredCases = filteredCases.filter(tc => filters.priority?.includes(tc.priority as string));
    }
    
    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedCases = filteredCases.slice(startIndex, endIndex);
    
    return {
      items: paginatedCases.map(tc => ({
        id: tc.id,
        title: tc.title,
        description: tc.description,
        status: tc.status,
        priority: tc.priority,
        tags: tc.tags,
        createdAt: tc.createdAt.toISOString(),
        updatedAt: tc.updatedAt.toISOString(),
        _links: {
          self: { href: `/test-cases/${tc.id}` },
          steps: { href: `/test-cases/${tc.id}/steps` },
          executions: { href: `/test-cases/${tc.id}/executions` }
        }
      })),
      totalCount: filteredCases.length,
      page,
      pageSize,
      _links: {
        self: { href: `/test-cases?page=${page}&pageSize=${pageSize}` },
        first: { href: `/test-cases?page=1&pageSize=${pageSize}` },
        prev: page > 1 ? { href: `/test-cases?page=${page-1}&pageSize=${pageSize}` } : undefined,
        next: endIndex < filteredCases.length ? { href: `/test-cases?page=${page+1}&pageSize=${pageSize}` } : undefined,
        last: { href: `/test-cases?page=${Math.ceil(filteredCases.length / pageSize)}&pageSize=${pageSize}` }
      }
    };
  }
  
  async createTestCase(data: any): Promise<any> {
    const newTestCase: TestCase = {
      id: `TC-${this.testCases.length + 1}`.padStart(6, '0'),
      title: data.title,
      description: data.description,
      status: data.status || 'DRAFT',
      priority: data.priority || 'MEDIUM',
      steps: data.steps?.map((step: any, index: number) => ({
        order: index + 1,
        description: step.description,
        expectedResult: step.expectedResult
      })) || [],
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.testCases.push(newTestCase);
    
    return {
      id: newTestCase.id,
      title: newTestCase.title,
      description: newTestCase.description,
      status: newTestCase.status,
      priority: newTestCase.priority,
      tags: newTestCase.tags,
      createdAt: newTestCase.createdAt.toISOString(),
      updatedAt: newTestCase.updatedAt.toISOString(),
      _links: {
        self: { href: `/test-cases/${newTestCase.id}` },
        steps: { href: `/test-cases/${newTestCase.id}/steps` },
        executions: { href: `/test-cases/${newTestCase.id}/executions` }
      }
    };
  }
}