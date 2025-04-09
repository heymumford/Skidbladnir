# ADR 0002: Provider Interface Design

## Status

Accepted

## Date

2025-04-09

## Context

Skíðblaðnir needs a consistent, extensible way to interact with various test management systems. Each system has its own API, authentication methods, data structures, and limitations. We need to design a provider interface that abstracts these differences while maintaining the ability to leverage system-specific features.

## Decision

We will implement a provider interface system with the following characteristics:

### 1. Interface Hierarchy

```
TestManagementProvider (base)
├── SourceProvider (extract)
└── TargetProvider (load)
```

- **TestManagementProvider**: Base interface with common methods
- **SourceProvider**: Interface for extracting data from a system
- **TargetProvider**: Interface for loading data into a system

### 2. Provider Registration

- Implement a provider registry for dynamic discovery
- Support runtime registration of provider plugins
- Enable capability-based provider selection

### 3. Provider Configuration

- System-specific configuration via a common pattern
- Secure credential management
- Runtime configuration validation

### 4. Entity Mapping

- Providers map between system-specific models and canonical models
- Clear responsibility separation between providers and the core system
- Support for custom fields and extensions

### 5. Authentication Patterns

- Support multiple authentication methods:
  - API tokens
  - OAuth flows
  - Username/password
  - Session-based authentication
  - Browser-based authentication

### 6. Standard Interfaces

```typescript
export interface TestManagementProvider {
  id: string;
  name: string;
  version: string;
  capabilities: ProviderCapabilities;
  initialize(config: ProviderConfig): Promise<void>;
  testConnection(): Promise<ConnectionStatus>;
  getMetadata(): ProviderMetadata;
}

export interface SourceProvider extends TestManagementProvider {
  getProjects(): Promise<Project[]>;
  getFolders(projectId: string): Promise<Folder[]>;
  getTestCases(projectId: string, options?: QueryOptions): Promise<PaginatedResult<TestCase>>;
  getTestCase(projectId: string, testCaseId: string): Promise<TestCase>;
  getTestCycles(projectId: string, options?: QueryOptions): Promise<PaginatedResult<TestCycle>>;
  getTestExecutions(projectId: string, testCycleId: string, options?: QueryOptions): Promise<PaginatedResult<TestExecution>>;
  getAttachmentContent(projectId: string, attachmentId: string): Promise<AttachmentContent>;
  getFieldDefinitions(projectId: string): Promise<FieldDefinition[]>;
}

export interface TargetProvider extends TestManagementProvider {
  getProjects(): Promise<Project[]>;
  createFolder(projectId: string, folder: Folder): Promise<string>;
  createTestCase(projectId: string, testCase: TestCase): Promise<string>;
  createTestSteps(projectId: string, testCaseId: string, steps: TestStep[]): Promise<void>;
  createTestCycle(projectId: string, testCycle: TestCycle): Promise<string>;
  createTestExecutions(projectId: string, testCycleId: string, executions: TestExecution[]): Promise<void>;
  uploadAttachment(projectId: string, entityType: string, entityId: string, attachment: AttachmentContent): Promise<string>;
  createFieldDefinition?(projectId: string, fieldDefinition: FieldDefinition): Promise<string>;
}
```

### 7. Provider Capabilities

```typescript
export interface ProviderCapabilities {
  canBeSource: boolean;
  canBeTarget: boolean;
  entityTypes: EntityType[];
  supportsAttachments: boolean;
  supportsExecutionHistory: boolean;
  supportsTestSteps: boolean;
  supportsHierarchy: boolean;
  supportsCustomFields: boolean;
}
```

### 8. Provider Registry

```typescript
export class ProviderRegistry {
  registerProvider(provider: TestManagementProvider): void;
  getProvider(id: string): TestManagementProvider | undefined;
  getAllProviders(): TestManagementProvider[];
  getSourceProviders(): SourceProvider[];
  getTargetProviders(): TargetProvider[];
}
```

## Consequences

### Positive

- Clear, consistent interface for all provider implementations
- Separation of concerns between core system and provider specifics
- Extensibility for new test management systems
- Type safety through TypeScript interfaces
- Runtime capability discovery

### Negative

- Additional abstraction layer between system and target APIs
- Potential limitations for system-specific features
- Need to maintain interface compatibility

### Neutral

- Each provider requires dedicated development and testing
- Varying levels of support based on target system capabilities
- Need for comprehensive documentation of each provider's implementation details

## Implementation Notes

1. **Interface Evolution**:
   - Use interface segregation for specialized capabilities
   - Maintain backward compatibility
   - Use optional methods for non-universal features

2. **Provider Implementation**:
   - Implement each provider in a separate package
   - Standardized testing approach across providers
   - Comprehensive capability documentation

3. **Authentication**:
   - Secure storage of credentials
   - Support for token refresh
   - Integration with API Bridge for session management