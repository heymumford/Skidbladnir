# Skíðblaðnir Clean Architecture Guide

This document provides guidance on implementing and maintaining Clean Architecture principles throughout the Skíðblaðnir codebase, in conjunction with our strict Test-Driven Development approach.

## Clean Architecture Overview

Skíðblaðnir follows Robert C. Martin's Clean Architecture principles, organizing the system into concentric layers, with dependencies pointing inward:

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌────────────────────────────────────────────────┐        │
│  │                                                │        │
│  │  ┌────────────────────────────────────┐        │        │
│  │  │                                    │        │        │
│  │  │  ┌────────────────────────┐        │        │        │
│  │  │  │                        │        │        │        │
│  │  │  │     Domain Layer       │        │        │        │
│  │  │  │                        │        │        │        │
│  │  │  └────────────────────────┘        │        │        │
│  │  │       Use Case / Application Layer  │        │        │
│  │  │                                    │        │        │
│  │  └────────────────────────────────────┘        │        │
│  │           Interface Adapters Layer              │        │
│  │                                                │        │
│  └────────────────────────────────────────────────┘        │
│               Frameworks & Drivers Layer                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Layers

#### 1. Domain Layer (Innermost)

The domain layer contains the business entities, value objects, and domain logic. It has no dependencies on other layers.

**Key characteristics:**
- No framework dependencies
- No infrastructure concerns
- Pure business logic
- Entities and value objects
- Domain services

#### 2. Use Case / Application Layer

This layer contains application-specific business rules, defining how the system interacts with the outside world.

**Key characteristics:**
- Orchestrates domain entities
- Defines boundaries with ports (interfaces)
- Contains use cases and application services
- Independent of external frameworks
- May depend only on the domain layer

#### 3. Interface Adapters Layer

This layer converts data between the formats most convenient for use cases and entities and the formats expected by external agents.

**Key characteristics:**
- Controllers and presenters
- Gateways and repositories
- Data transformers and formatters
- May depend on use case and domain layers

#### 4. Frameworks & Drivers Layer (Outermost)

This layer consists of frameworks, tools, and delivery mechanisms.

**Key characteristics:**
- Database implementations
- Web frameworks
- External service clients
- May depend on adapter, use case, and domain layers

## Clean Architecture Patterns in Skíðblaðnir

### Domain Layer

#### Entities
```typescript
// Domain entity with business rules
export class TestCase {
  private _id: string;
  private _name: string;
  private _steps: TestStep[];
  
  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
    this._steps = [];
  }
  
  // Domain business rule: Test case names must not be empty
  get name(): string {
    return this._name;
  }
  
  set name(value: string) {
    if (!value || value.trim() === '') {
      throw new DomainValidationError('Test case name cannot be empty');
    }
    this._name = value;
  }
  
  // Domain business rule: Test steps must be ordered
  addStep(step: TestStep): void {
    step.setOrder(this._steps.length + 1);
    this._steps.push(step);
  }
}
```

#### Value Objects
```typescript
// Immutable value object
export class TestStepResult {
  private readonly _status: 'passed' | 'failed' | 'blocked' | 'not_run';
  private readonly _executionTime: number;
  
  constructor(status: 'passed' | 'failed' | 'blocked' | 'not_run', executionTime: number) {
    this._status = status;
    this._executionTime = executionTime;
  }
  
  get status(): string {
    return this._status;
  }
  
  get executionTime(): number {
    return this._executionTime;
  }
  
  isPassed(): boolean {
    return this._status === 'passed';
  }
  
  // Value objects are immutable, so we create a new instance
  withStatus(newStatus: 'passed' | 'failed' | 'blocked' | 'not_run'): TestStepResult {
    return new TestStepResult(newStatus, this._executionTime);
  }
}
```

### Use Case Layer

#### Ports (Interfaces)
```typescript
// Port for accessing test cases, defined in the use case layer
export interface TestCaseRepository {
  findById(id: string): Promise<TestCase>;
  findAll(): Promise<TestCase[]>;
  save(testCase: TestCase): Promise<void>;
  delete(id: string): Promise<void>;
}
```

#### Use Cases
```typescript
// Application use case that orchestrates domain entities
export class CreateTestCaseUseCase {
  constructor(private readonly testCaseRepository: TestCaseRepository) {}
  
  async execute(id: string, name: string, steps: TestStepDto[]): Promise<TestCaseDto> {
    // Create domain entity
    const testCase = new TestCase(id, name);
    
    // Apply domain logic
    for (const stepDto of steps) {
      const step = new TestStep(stepDto.description, stepDto.expectedResult);
      testCase.addStep(step);
    }
    
    // Use port to persist
    await this.testCaseRepository.save(testCase);
    
    // Return DTO
    return new TestCaseDto(
      testCase.id,
      testCase.name,
      testCase.steps.map(s => new TestStepDto(s.description, s.expectedResult))
    );
  }
}
```

### Interface Adapters Layer

#### Controllers
```typescript
// Controller in the adapter layer
export class TestCaseController {
  constructor(private readonly createTestCaseUseCase: CreateTestCaseUseCase) {}
  
  // Converts from external format to use case format
  async createTestCase(request: CreateTestCaseRequest): Promise<TestCaseResponse> {
    try {
      const testCaseDto = await this.createTestCaseUseCase.execute(
        request.id,
        request.name,
        request.steps.map(s => new TestStepDto(s.description, s.expectedResult))
      );
      
      return {
        id: testCaseDto.id,
        name: testCaseDto.name,
        steps: testCaseDto.steps.map(s => ({
          description: s.description,
          expectedResult: s.expectedResult
        })),
        status: 'success'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}
```

#### Repositories
```typescript
// Repository implementation in the adapter layer
export class SqlTestCaseRepository implements TestCaseRepository {
  constructor(private readonly dbClient: DatabaseClient) {}
  
  async findById(id: string): Promise<TestCase> {
    const testCaseData = await this.dbClient.query(
      'SELECT * FROM test_cases WHERE id = ?',
      [id]
    );
    
    if (!testCaseData) {
      throw new RepositoryError('Test case not found');
    }
    
    return this.mapToEntity(testCaseData);
  }
  
  // More implementation details...
  
  private mapToEntity(data: any): TestCase {
    const testCase = new TestCase(data.id, data.name);
    // Map other properties
    return testCase;
  }
}
```

### Frameworks & Drivers Layer

#### Provider Implementations
```typescript
// Infrastructure implementation of a provider
export class JiraProvider implements SourceProvider {
  constructor(
    private readonly apiClient: JiraApiClient,
    private readonly logger: LoggerService
  ) {}
  
  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.apiClient.get('/rest/api/2/project');
      return response.data.map(this.mapToProject);
    } catch (error) {
      this.logger.error('Failed to fetch Jira projects', error);
      throw new ProviderError('Failed to fetch projects', error);
    }
  }
  
  // More implementation details...
}
```

## Testing Strategy for Clean Architecture

### Domain Layer Tests

Domain layer tests focus on business rules and domain logic without any external dependencies.

```typescript
describe('TestCase', () => {
  it('should not allow empty names', () => {
    // Arrange
    const testCase = new TestCase('TC-1', 'Valid Name');
    
    // Act & Assert
    expect(() => {
      testCase.name = '';
    }).toThrow(DomainValidationError);
  });
  
  it('should assign correct order to steps', () => {
    // Arrange
    const testCase = new TestCase('TC-1', 'Test Case');
    const step1 = new TestStep('Step 1', 'Result 1');
    const step2 = new TestStep('Step 2', 'Result 2');
    
    // Act
    testCase.addStep(step1);
    testCase.addStep(step2);
    
    // Assert
    expect(step1.order).toBe(1);
    expect(step2.order).toBe(2);
  });
});
```

### Use Case Layer Tests

Use case tests validate application logic, mocking out dependencies on external systems.

```typescript
describe('CreateTestCaseUseCase', () => {
  let useCase: CreateTestCaseUseCase;
  let mockRepository: jest.Mocked<TestCaseRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    };
    
    useCase = new CreateTestCaseUseCase(mockRepository);
  });
  
  it('should create and save a test case with steps', async () => {
    // Arrange
    const id = 'TC-1';
    const name = 'Test Case';
    const steps = [
      { description: 'Step 1', expectedResult: 'Result 1' },
      { description: 'Step 2', expectedResult: 'Result 2' }
    ];
    
    // Act
    await useCase.execute(id, name, steps);
    
    // Assert
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    
    const savedTestCase = mockRepository.save.mock.calls[0][0];
    expect(savedTestCase.id).toBe(id);
    expect(savedTestCase.name).toBe(name);
    expect(savedTestCase.steps.length).toBe(2);
    expect(savedTestCase.steps[0].description).toBe('Step 1');
    expect(savedTestCase.steps[1].description).toBe('Step 2');
  });
});
```

### Interface Adapters Layer Tests

Adapter tests validate the translation between external formats and domain formats.

```typescript
describe('TestCaseController', () => {
  let controller: TestCaseController;
  let mockUseCase: jest.Mocked<CreateTestCaseUseCase>;
  
  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn()
    } as any;
    
    controller = new TestCaseController(mockUseCase);
  });
  
  it('should convert request to use case format and return response', async () => {
    // Arrange
    const request = {
      id: 'TC-1',
      name: 'Test Case',
      steps: [
        { description: 'Step 1', expectedResult: 'Result 1' }
      ]
    };
    
    mockUseCase.execute.mockResolvedValue({
      id: 'TC-1',
      name: 'Test Case',
      steps: [
        { description: 'Step 1', expectedResult: 'Result 1' }
      ]
    });
    
    // Act
    const response = await controller.createTestCase(request);
    
    // Assert
    expect(mockUseCase.execute).toHaveBeenCalledWith(
      'TC-1',
      'Test Case',
      [{ description: 'Step 1', expectedResult: 'Result 1' }]
    );
    
    expect(response).toEqual({
      id: 'TC-1',
      name: 'Test Case',
      steps: [
        { description: 'Step 1', expectedResult: 'Result 1' }
      ],
      status: 'success'
    });
  });
});
```

### Frameworks & Drivers Layer Tests

These tests validate that infrastructure implementations correctly fulfill the contracts defined by the adapter interfaces.

```typescript
describe('SqlTestCaseRepository', () => {
  let repository: SqlTestCaseRepository;
  let mockDbClient: jest.Mocked<DatabaseClient>;
  
  beforeEach(() => {
    mockDbClient = {
      query: jest.fn(),
      execute: jest.fn()
    } as any;
    
    repository = new SqlTestCaseRepository(mockDbClient);
  });
  
  it('should find a test case by id', async () => {
    // Arrange
    const testCaseData = {
      id: 'TC-1',
      name: 'Test Case',
      steps: []
    };
    
    mockDbClient.query.mockResolvedValue(testCaseData);
    
    // Act
    const testCase = await repository.findById('TC-1');
    
    // Assert
    expect(mockDbClient.query).toHaveBeenCalledWith(
      'SELECT * FROM test_cases WHERE id = ?',
      ['TC-1']
    );
    
    expect(testCase).toBeInstanceOf(TestCase);
    expect(testCase.id).toBe('TC-1');
    expect(testCase.name).toBe('Test Case');
  });
});
```

## Architecture Boundary Tests

Architecture boundary tests explicitly validate that architectural layers respect their boundaries.

```typescript
describe('Architecture Boundaries', () => {
  it('domain layer should not depend on other layers', () => {
    // Test that domain layer doesn't import from other layers
    // Using tools like dependency-cruiser or custom logic
  });
  
  it('use case layer should only depend on domain layer', () => {
    // Test that use case layer only imports from domain layer
  });
  
  it('adapter layer should only depend on domain and use case layers', () => {
    // Test that adapter layer only imports from domain and use case layers
  });
});
```

## Common Clean Architecture Anti-Patterns to Avoid

1. **Domain Entities with Infrastructure Dependencies**: Domain entities should never depend on databases, frameworks, or external services.

2. **Use Cases with Direct Framework Dependencies**: Use cases should only interact with domain entities and ports, never directly with frameworks.

3. **Circumventing Ports**: Always interact with external systems through the defined ports, never directly.

4. **Bidirectional Dependencies**: Dependencies should only point inward, never outward or bidirectionally.

5. **Anemic Domain Model**: Domain entities should contain both data and behavior, not just be data holders.

6. **Leaky Abstractions**: Adapter implementations should not leak into the use case or domain layers.

## Dependency Injection in Clean Architecture

Skíðblaðnir uses dependency injection to maintain clean architecture boundaries while allowing for runtime composition.

### Composition Root
```typescript
// Frameworks & Drivers Layer
const dbClient = new PostgresClient(config.dbConnectionString);
const loggerService = new PinoLogger(config.logLevel);
const apiClient = new AxiosApiClient(config.baseUrl);

// Interface Adapters Layer
const testCaseRepository = new SqlTestCaseRepository(dbClient);
const jiraProvider = new JiraProvider(apiClient, loggerService);

// Use Case Layer
const createTestCaseUseCase = new CreateTestCaseUseCase(testCaseRepository);
const migrateTestCasesUseCase = new MigrateTestCasesUseCase(
  jiraProvider, 
  testCaseRepository,
  loggerService
);

// Wire up controllers
const testCaseController = new TestCaseController(createTestCaseUseCase);
const migrationController = new MigrationController(migrateTestCasesUseCase);
```

## Clean Architecture Review Checklist

When reviewing code for clean architecture compliance, check:

- [ ] Domain entities contain business logic and are free from framework dependencies
- [ ] Use cases depend only on domain entities and port interfaces
- [ ] Dependencies point inward, never outward
- [ ] External systems are accessed through port interfaces
- [ ] Adapters properly translate between domain and external formats
- [ ] Implementations are injected at the composition root
- [ ] Tests validate behavioral correctness and architectural boundaries
- [ ] DTOs are used to transfer data between layers

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [The Clean Architecture - Robert C. Martin (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Getting Started with Clean Architecture](https://www.freecodecamp.org/news/a-quick-introduction-to-clean-architecture-990c014448d2/)