# TestBridge Provider Interface Specification

This document defines the standardized interface for implementing new test management system providers in TestBridge. The provider interface enables a plugin architecture where multiple source and target systems can be supported.

## Provider Interface Design

### Core Provider Interface

Each provider must implement this base interface:

```typescript
export interface TestManagementProvider {
  /**
   * Unique identifier for this provider
   */
  id: string;
  
  /**
   * Human-readable name for this provider
   */
  name: string;
  
  /**
   * Provider version
   */
  version: string;
  
  /**
   * Provider capabilities
   */
  capabilities: ProviderCapabilities;
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Test connection with the remote system
   */
  testConnection(): Promise<ConnectionStatus>;
  
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;
}
```

### Provider Capabilities

Providers declare which features they support:

```typescript
export interface ProviderCapabilities {
  /**
   * Can act as a source system (extract data)
   */
  canBeSource: boolean;
  
  /**
   * Can act as a target system (load data)
   */
  canBeTarget: boolean;
  
  /**
   * Supported entity types
   */
  entityTypes: EntityType[];
  
  /**
   * Supports attachments
   */
  supportsAttachments: boolean;
  
  /**
   * Supports execution history
   */
  supportsExecutionHistory: boolean;
  
  /**
   * Supports test steps
   */
  supportsTestSteps: boolean;
  
  /**
   * Supports folders/hierarchies
   */
  supportsHierarchy: boolean;
  
  /**
   * Supports custom fields
   */
  supportsCustomFields: boolean;
}
```

### Source Provider Interface

For extracting data from a source system:

```typescript
export interface SourceProvider extends TestManagementProvider {
  /**
   * Get projects from the source system
   */
  getProjects(): Promise<Project[]>;
  
  /**
   * Get test folders/hierarchical structure
   */
  getFolders(projectId: string): Promise<Folder[]>;
  
  /**
   * Get test cases
   */
  getTestCases(
    projectId: string,
    options?: TestCaseQueryOptions
  ): Promise<PaginatedResult<TestCase>>;
  
  /**
   * Get a single test case with details
   */
  getTestCase(
    projectId: string,
    testCaseId: string
  ): Promise<TestCase>;
  
  /**
   * Get test cycles
   */
  getTestCycles(
    projectId: string,
    options?: TestCycleQueryOptions
  ): Promise<PaginatedResult<TestCycle>>;
  
  /**
   * Get test executions
   */
  getTestExecutions(
    projectId: string,
    testCycleId: string,
    options?: ExecutionQueryOptions
  ): Promise<PaginatedResult<TestExecution>>;
  
  /**
   * Get attachment content
   */
  getAttachmentContent(
    projectId: string,
    attachmentId: string
  ): Promise<AttachmentContent>;
  
  /**
   * Get field definitions (including custom fields)
   */
  getFieldDefinitions(
    projectId: string
  ): Promise<FieldDefinition[]>;
}
```

### Target Provider Interface

For loading data into a target system:

```typescript
export interface TargetProvider extends TestManagementProvider {
  /**
   * Get projects from the target system (for mapping)
   */
  getProjects(): Promise<Project[]>;
  
  /**
   * Create or update a folder structure
   */
  createFolder(
    projectId: string,
    folder: Folder
  ): Promise<string>;
  
  /**
   * Create or update a test case
   */
  createTestCase(
    projectId: string,
    testCase: TestCase
  ): Promise<string>;
  
  /**
   * Create or update test steps
   */
  createTestSteps(
    projectId: string,
    testCaseId: string,
    steps: TestStep[]
  ): Promise<void>;
  
  /**
   * Create or update a test cycle
   */
  createTestCycle(
    projectId: string,
    testCycle: TestCycle
  ): Promise<string>;
  
  /**
   * Create or update test executions
   */
  createTestExecutions(
    projectId: string,
    testCycleId: string,
    executions: TestExecution[]
  ): Promise<void>;
  
  /**
   * Upload an attachment
   */
  uploadAttachment(
    projectId: string,
    entityType: string,
    entityId: string,
    attachment: AttachmentContent
  ): Promise<string>;
  
  /**
   * Create or update field definitions (if supported)
   */
  createFieldDefinition?(
    projectId: string,
    fieldDefinition: FieldDefinition
  ): Promise<string>;
}
```

## Query Options for Data Filtering

```typescript
export interface BaseQueryOptions {
  page?: number;
  pageSize?: number;
  startAt?: number;
  maxResults?: number;
  modifiedSince?: Date;
}

export interface TestCaseQueryOptions extends BaseQueryOptions {
  folderId?: string;
  includeSteps?: boolean;
  includeAttachments?: boolean;
}

export interface TestCycleQueryOptions extends BaseQueryOptions {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ExecutionQueryOptions extends BaseQueryOptions {
  status?: string;
  executedBy?: string;
  executedSince?: Date;
}
```

## Provider Registration System

```typescript
export class ProviderRegistry {
  private providers: Map<string, TestManagementProvider> = new Map();
  
  /**
   * Register a provider with the registry
   */
  registerProvider(provider: TestManagementProvider): void {
    this.providers.set(provider.id, provider);
  }
  
  /**
   * Get a provider by ID
   */
  getProvider(id: string): TestManagementProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * Get all registered providers
   */
  getAllProviders(): TestManagementProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get providers that can act as source systems
   */
  getSourceProviders(): SourceProvider[] {
    return this.getAllProviders()
      .filter(p => p.capabilities.canBeSource)
      .map(p => p as SourceProvider);
  }
  
  /**
   * Get providers that can act as target systems
   */
  getTargetProviders(): TargetProvider[] {
    return this.getAllProviders()
      .filter(p => p.capabilities.canBeTarget)
      .map(p => p as TargetProvider);
  }
}
```

## Implementing a New Provider

To implement a new provider:

1. Create a class that implements `SourceProvider` and/or `TargetProvider`
2. Register provider capabilities accurately
3. Implement all required methods
4. Register the provider with the `ProviderRegistry`

Example provider registration:

```typescript
const zephyrProvider = new ZephyrProvider();
const qtestProvider = new QTestProvider();
const hpAlmProvider = new HPALMProvider();
const azureDevOpsProvider = new AzureDevOpsProvider();
const rallyProvider = new RallyProvider();
const excelProvider = new ExcelProvider();

const registry = new ProviderRegistry();
registry.registerProvider(zephyrProvider);
registry.registerProvider(qtestProvider);
registry.registerProvider(hpAlmProvider);
registry.registerProvider(azureDevOpsProvider);
registry.registerProvider(rallyProvider);
registry.registerProvider(excelProvider);
```

## Provider Configuration

Each provider can define its own configuration schema:

```typescript
export interface ZephyrProviderConfig extends ProviderConfig {
  baseUrl: string;
  apiToken: string;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraApiToken?: string;
}

export interface QTestProviderConfig extends ProviderConfig {
  baseUrl: string;
  apiToken: string;
}

export interface HPALMProviderConfig extends ProviderConfig {
  baseUrl: string;
  username: string;
  password: string;
  domain: string;
  project: string;
}

export interface ExcelProviderConfig extends ProviderConfig {
  templateType: 'standard' | 'custom';
  mappingDefinition?: Record<string, string>;
}
```