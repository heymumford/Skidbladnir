# Repository Interfaces

Repositories in Skidbladnir provide the abstraction layer between domain entities and data storage mechanisms, following the Repository Pattern from Domain-Driven Design. They allow the domain layer to remain agnostic of persistence details while providing a collection-like interface for accessing and managing entities.

## Core Repository Pattern

**Purpose**: Define a consistent interface for data access across the system that:
- Centralizes data access logic
- Decouples domain from persistence implementation
- Enables testability through mocking
- Enforces domain invariants during persistence

## TestCaseRepository

**Path**: `/pkg/domain/repositories/TestCaseRepository.ts`

**Purpose**: Manages persistence operations for TestCase entities.

**Interface**:
```typescript
interface TestCaseFilters {
  status?: TestCaseStatus | TestCaseStatus[];
  priority?: Priority | Priority[];
  tags?: string[];
  author?: string;
  assignee?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  searchTerm?: string; // Searches title and description
}

interface TestCaseRepository {
  // Basic CRUD operations
  findById(id: string): Promise<TestCase | null>;
  findAll(filters?: TestCaseFilters, pagination?: PaginationOptions): Promise<PaginatedResult<TestCase>>;
  create(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase>;
  update(id: string, testCase: Partial<TestCase>): Promise<TestCase | null>;
  delete(id: string): Promise<boolean>;
  
  // Specialized query methods
  findByTitle(title: string, exactMatch?: boolean): Promise<TestCase[]>;
  findByStatus(status: TestCaseStatus | TestCaseStatus[]): Promise<TestCase[]>;
  findByTags(tags: string[], matchAll?: boolean): Promise<TestCase[]>;
  findByAuthor(authorId: string): Promise<TestCase[]>;
  findByAssignee(assigneeId: string): Promise<TestCase[]>;
  findBySourceInfo(sourceTool: string, sourceId: string): Promise<TestCase | null>;
  searchByText(searchTerm: string): Promise<TestCase[]>;
  
  // Statistics and analytics
  countByStatus(): Promise<Record<TestCaseStatus, number>>;
  countByPriority(): Promise<Record<Priority, number>>;
  getRecentlyModified(limit: number): Promise<TestCase[]>;
  
  // Bulk operations
  bulkCreate(testCases: Array<Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TestCase[]>;
  bulkUpdate(updates: Array<{ id: string; changes: Partial<TestCase> }>): Promise<Record<string, boolean>>;
  bulkDelete(ids: string[]): Promise<Record<string, boolean>>;
}
```

**Key Behaviors**:
- Comprehensive filtering and search capabilities
- Bulk operations for performance optimization
- Pagination support for large result sets
- Analytics and statistics methods

## TestSuiteRepository

**Path**: `/pkg/domain/repositories/TestSuiteRepository.ts`

**Purpose**: Manages persistence operations for TestSuite entities, including hierarchical relationships.

**Interface**:
```typescript
interface TestSuiteFilters {
  name?: string;
  tags?: string[];
  createdBy?: string;
  parentSuiteId?: string | null; // null means root-level suites
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

interface TestSuiteRepository {
  // Basic CRUD operations
  findById(id: string): Promise<TestSuite | null>;
  findAll(filters?: TestSuiteFilters, pagination?: PaginationOptions): Promise<PaginatedResult<TestSuite>>;
  create(testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuite>;
  update(id: string, testSuite: Partial<TestSuite>): Promise<TestSuite | null>;
  delete(id: string): Promise<boolean>;
  
  // Hierarchy operations
  findByParentId(parentId: string | null): Promise<TestSuite[]>;
  getAncestors(id: string): Promise<TestSuite[]>;
  getDescendants(id: string): Promise<TestSuite[]>;
  getFullHierarchy(): Promise<HierarchicalTestSuite[]>;
  moveSuite(id: string, newParentId: string | null): Promise<TestSuite | null>;
  
  // Test case management
  addTestCase(suiteId: string, testCaseId: string): Promise<boolean>;
  removeTestCase(suiteId: string, testCaseId: string): Promise<boolean>;
  getTestCases(suiteId: string, includeChildSuites?: boolean): Promise<TestCase[]>;
  
  // Statistics and analytics
  countTestCases(suiteId: string, includeChildSuites?: boolean): Promise<number>;
  getExecutionStats(suiteId: string): Promise<SuiteExecutionStats>;
  
  // Search and filtering
  findByName(name: string, exactMatch?: boolean): Promise<TestSuite[]>;
  findByTags(tags: string[], matchAll?: boolean): Promise<TestSuite[]>;
  findByCreator(userId: string): Promise<TestSuite[]>;
}
```

**Key Behaviors**:
- Hierarchical structure management (parent-child relationships)
- Test case association management
- Ancestor and descendant traversal
- Execution statistics calculation

## TestExecutionRepository

**Path**: `/pkg/domain/repositories/TestExecutionRepository.ts`

**Purpose**: Manages persistence operations for TestExecution entities, focusing on execution history and results.

**Interface**:
```typescript
interface TestExecutionFilters {
  testCaseId?: string;
  executedBy?: string;
  status?: ExecutionStatus | ExecutionStatus[];
  environment?: string;
  buildVersion?: string;
  executedAfter?: Date;
  executedBefore?: Date;
  hasDefects?: boolean;
}

interface TestExecutionRepository {
  // Basic CRUD operations
  findById(id: string): Promise<TestExecution | null>;
  findAll(filters?: TestExecutionFilters, pagination?: PaginationOptions): Promise<PaginatedResult<TestExecution>>;
  create(execution: Omit<TestExecution, 'id'>): Promise<TestExecution>;
  update(id: string, execution: Partial<TestExecution>): Promise<TestExecution | null>;
  delete(id: string): Promise<boolean>;
  
  // Specialized query methods
  findByTestCaseId(testCaseId: string, limit?: number): Promise<TestExecution[]>;
  findByExecutor(userId: string): Promise<TestExecution[]>;
  findByStatus(status: ExecutionStatus | ExecutionStatus[]): Promise<TestExecution[]>;
  findByEnvironment(environment: string): Promise<TestExecution[]>;
  findByBuildVersion(buildVersion: string): Promise<TestExecution[]>;
  findWithDefects(): Promise<TestExecution[]>;
  
  // Time-based queries
  getLatestExecutions(limit: number): Promise<TestExecution[]>;
  getLatestByTestCase(testCaseId: string): Promise<TestExecution | null>;
  getExecutionsByDateRange(startDate: Date, endDate: Date): Promise<TestExecution[]>;
  
  // Statistics and analytics
  getExecutionTrend(testCaseId: string, limit: number): Promise<ExecutionTrend[]>;
  getStatusDistribution(filters?: TestExecutionFilters): Promise<Record<ExecutionStatus, number>>;
  calculatePassRate(filters?: TestExecutionFilters): Promise<number>;
  getAverageDuration(testCaseId: string): Promise<number>;
  
  // Defect tracking
  findByDefect(defectId: string): Promise<TestExecution[]>;
  linkDefect(executionId: string, defectId: string): Promise<boolean>;
  unlinkDefect(executionId: string, defectId: string): Promise<boolean>;
}
```

**Key Behaviors**:
- Execution history tracking
- Result analysis and trend calculation
- Defect correlation and management
- Time series analysis capabilities

## UserRepository

**Path**: `/pkg/domain/repositories/UserRepository.ts`

**Purpose**: Manages persistence operations for User entities, including authentication and preferences.

**Interface**:
```typescript
interface UserFilters {
  role?: UserRole | UserRole[];
  active?: boolean;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

interface UserRepository {
  // Basic CRUD operations
  findById(id: string): Promise<User | null>;
  findAll(filters?: UserFilters, pagination?: PaginationOptions): Promise<PaginatedResult<User>>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  
  // Authentication related
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<boolean>;
  
  // User management
  activateUser(id: string): Promise<boolean>;
  deactivateUser(id: string): Promise<boolean>;
  changeRole(id: string, newRole: UserRole): Promise<User | null>;
  
  // Preferences and settings
  updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User | null>;
  getPreference(id: string, key: string): Promise<any | null>;
  setPreference(id: string, key: string, value: any): Promise<boolean>;
  
  // User analytics
  countByRole(): Promise<Record<UserRole, number>>;
  getRecentlyActive(limit: number): Promise<User[]>;
  findInactiveUsers(daysSinceLogin: number): Promise<User[]>;
}
```

**Key Behaviors**:
- Authentication and identity management
- Preference and settings management
- User activity tracking
- Role-based access control support

## Repository Implementation Principles

1. **Interface Segregation**: Repositories expose only methods needed by clients.
2. **Persistence Ignorance**: Domain entities have no knowledge of how they're persisted.
3. **Unit of Work**: All changes should be atomic within a single transaction when supported.
4. **Identity Mapping**: Avoid duplicate instances of the same entity within a single operation.
5. **Domain Enforcement**: Repositories should enforce domain invariants during persistence.
6. **Optimistic Concurrency**: Use version/timestamp strategies to detect conflicts.
7. **Eager Loading**: Support for loading related entities to minimize database roundtrips.
8. **Pagination**: Always support pagination for queries that might return large result sets.

## Repository Factory

**Path**: `/pkg/infrastructure/persistence/RepositoryFactory.ts`

**Purpose**: Creates appropriate repository implementations based on configuration or environment.

**Interface**:
```typescript
interface RepositoryFactory {
  createTestCaseRepository(): TestCaseRepository;
  createTestSuiteRepository(): TestSuiteRepository;
  createTestExecutionRepository(): TestExecutionRepository;
  createUserRepository(): UserRepository;
}
```

**Key Behaviors**:
- Abstracts repository creation
- Allows for different persistence mechanisms in different environments
- Supports dependency injection and testing
- Maintains consistent repository creation patterns