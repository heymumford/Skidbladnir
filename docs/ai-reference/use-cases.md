# Use Cases

Use cases (application services) in Skidbladnir coordinate interactions between the domain layer and external systems or interfaces. They implement specific application-level workflows by orchestrating domain entities, services, and repositories to fulfill user requirements.

## Use Case Design Principles

1. **Single Responsibility**: Each use case implements one specific application workflow
2. **Dependency Inversion**: Use cases depend on abstractions (interfaces), not implementations
3. **Explicit Input/Output**: Use cases have clearly defined input DTOs and output DTOs
4. **Transactional Boundary**: Use cases define the boundaries of transactions
5. **Error Handling**: Use cases catch and translate domain errors into application-specific errors
6. **Validation**: Use cases validate input before interacting with domain objects
7. **Authorization**: Use cases enforce authorization rules for the workflow

## MigrateTestCases

**Path**: `/pkg/usecases/migration/MigrateTestCases.ts`

**Purpose**: Coordinates the migration of test cases from one system to another.

**Interface**:
```typescript
interface MigrateTestCasesInput {
  sourceSystem: string;
  targetSystem: string;
  sourceCredentials: Record<string, any>;
  targetCredentials: Record<string, any>;
  filters?: {
    projects?: string[];
    statuses?: string[];
    tags?: string[];
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    testCaseIds?: string[];
  };
  options?: {
    includeAttachments?: boolean;
    includeHistory?: boolean;
    batchSize?: number;
    dryRun?: boolean;
    mappingRules?: Record<string, string>;
    failOnError?: boolean;
  };
  userId: string;
}

interface MigrateTestCasesOutput {
  migrationId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'IN_PROGRESS';
  summary: {
    totalTestCases: number;
    migratedSuccessfully: number;
    failedTestCases: number;
    skippedTestCases: number;
  };
  testCaseMappings: Array<{
    sourceId: string;
    targetId: string;
    status: 'SUCCESS' | 'FAILURE' | 'SKIPPED';
    error?: string;
  }>;
  errors: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
  warnings: string[];
  durationInSeconds: number;
}

class MigrateTestCasesUseCase {
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly migrationService: MigrationService,
    private readonly testCaseRepository: TestCaseRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: MigrateTestCasesInput): Promise<MigrateTestCasesOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Source and target system connection
- Filtering and selecting test cases to migrate
- Transforming between system formats
- Error handling and recovery
- Migration tracking and reporting
- Field mapping and customization

## GenerateTestCases

**Path**: `/pkg/usecases/advisory/GenerateTestCases.ts`

**Purpose**: Uses LLM capabilities to generate test cases from requirements or specifications.

**Interface**:
```typescript
interface GenerateTestCasesInput {
  requirementsText?: string;
  requirementsFiles?: string[];
  targetCount?: number;
  priorityDistribution?: Record<Priority, number>; // Percentage for each priority
  testCaseStructure?: {
    includePrerequisites?: boolean;
    includeDataTables?: boolean;
    includePostconditions?: boolean;
    desiredStepCount?: [number, number]; // Min, max
  };
  generationOptions?: {
    quality: 'draft' | 'standard' | 'high';
    creativity: number; // 0-1 scale
    focusAreas?: string[]; // E.g., "security", "performance", "edge cases"
    domainContext?: string;
  };
  targetTestSuiteId?: string;
  userId: string;
}

interface GenerateTestCasesOutput {
  generatedTestCases: TestCase[];
  metrics: {
    totalGenerated: number;
    averageStepsPerTest: number;
    qualityScore: number; // 0-100
    coverageEstimate: number; // 0-100
    priorityDistribution: Record<Priority, number>;
  };
  suggestedImprovements: string[];
  warnings: string[];
}

class GenerateTestCasesUseCase {
  constructor(
    private readonly llmAdvisorService: LLMAdvisorService,
    private readonly testCaseRepository: TestCaseRepository,
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: GenerateTestCasesInput): Promise<GenerateTestCasesOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Requirement analysis and extraction
- Test case generation with LLM
- Quality assessment and improvement
- Test suite integration
- Configuration for different generation approaches
- Coverage and quality metrics

## ImportExcelTestCases

**Path**: `/pkg/usecases/import/ImportExcelTestCases.ts`

**Purpose**: Imports test cases from Excel files into the system.

**Interface**:
```typescript
interface ImportExcelTestCasesInput {
  filePath: string;
  mappingConfig: {
    titleColumn: string;
    descriptionColumn?: string;
    priorityColumn?: string;
    statusColumn?: string;
    preconditionsColumn?: string;
    stepColumns: {
      action: string;
      expectedResult: string;
      testData?: string;
    };
    tagsColumn?: string;
    tagSeparator?: string;
    customFieldMappings?: Record<string, string>;
  };
  options?: {
    headerRow?: number;
    sheetName?: string;
    skipRows?: number[];
    createMissingTags?: boolean;
    updateExisting?: boolean;
    targetTestSuiteId?: string;
  };
  userId: string;
}

interface ImportExcelTestCasesOutput {
  importedTestCases: TestCase[];
  summary: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    skippedRows: number;
    updatedTestCases: number;
    newTestCases: number;
  };
  errors: Array<{
    row: number;
    message: string;
    details?: any;
  }>;
  warnings: string[];
}

class ImportExcelTestCasesUseCase {
  constructor(
    private readonly testCaseRepository: TestCaseRepository,
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly userRepository: UserRepository,
    private readonly excelProvider: ExcelProvider,
    private readonly logger: Logger
  ) {}

  async execute(input: ImportExcelTestCasesInput): Promise<ImportExcelTestCasesOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Excel file parsing and validation
- Field mapping configuration
- Validation and transformation
- Duplicate handling
- Error reporting and continuation

## RunTestExecution

**Path**: `/pkg/usecases/execution/RunTestExecution.ts`

**Purpose**: Executes a test case and records the results.

**Interface**:
```typescript
interface RunTestExecutionInput {
  testCaseId: string;
  environment: string;
  buildVersion: string;
  executorId: string;
  stepResults?: Array<{
    stepId: string;
    status: ExecutionStatus;
    actualResult?: string;
    notes?: string;
    attachmentPaths?: string[];
  }>;
  notes?: string;
  defectIds?: string[];
  status?: ExecutionStatus;
}

interface RunTestExecutionOutput {
  execution: TestExecution;
  metrics: {
    durationInSeconds: number;
    passedSteps: number;
    failedSteps: number;
    totalSteps: number;
    passRate: number;
  };
  testCase: TestCase;
  previousExecution?: TestExecution;
  comparisonWithPrevious?: {
    statusChanged: boolean;
    previousStatus?: ExecutionStatus;
    durationDifference: number; // in seconds
    newDefects: string[];
    resolvedDefects: string[];
  };
}

class RunTestExecutionUseCase {
  constructor(
    private readonly testCaseRepository: TestCaseRepository,
    private readonly testExecutionRepository: TestExecutionRepository,
    private readonly testExecutionService: TestExecutionService,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: RunTestExecutionInput): Promise<RunTestExecutionOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Test execution recording
- Step result validation and processing
- Attachment handling
- Defect linking
- Comparative analysis with previous executions
- Execution metrics calculation

## ManageTestSuite

**Path**: `/pkg/usecases/organization/ManageTestSuite.ts`

**Purpose**: Creates, updates, or manages test suites and their hierarchical structure.

**Interface**:
```typescript
type ManageTestSuiteAction = 'CREATE' | 'UPDATE' | 'ADD_TEST_CASES' | 'REMOVE_TEST_CASES' | 'MOVE';

interface ManageTestSuiteInput {
  action: ManageTestSuiteAction;
  suiteId?: string; // Required for all actions except CREATE
  
  // For CREATE and UPDATE
  name?: string;
  description?: string;
  parentSuiteId?: string | null; // null explicitly means root level
  tags?: string[];
  
  // For ADD_TEST_CASES and REMOVE_TEST_CASES
  testCaseIds?: string[];
  
  // For MOVE
  targetParentId?: string | null; // null explicitly means root level
  
  userId: string;
}

interface ManageTestSuiteOutput {
  suite: TestSuite;
  hierarchy?: {
    path: string[];
    depth: number;
    root: string;
  };
  testCases?: {
    total: number;
    added?: string[];
    removed?: string[];
  };
  childSuites?: TestSuite[];
  parentSuite?: TestSuite | null;
}

class ManageTestSuiteUseCase {
  constructor(
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly testCaseRepository: TestCaseRepository,
    private readonly testSuiteService: TestSuiteService,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: ManageTestSuiteInput): Promise<ManageTestSuiteOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Suite creation and organization
- Test case association management
- Hierarchical structure maintenance
- Multi-action support
- Validation of relationship integrity

## GenerateTestReport

**Path**: `/pkg/usecases/reporting/GenerateTestReport.ts`

**Purpose**: Creates comprehensive test reports for analysis and sharing.

**Interface**:
```typescript
interface GenerateTestReportInput {
  reportType: 'EXECUTION_SUMMARY' | 'TEST_CASE_DETAILS' | 'SUITE_COVERAGE' | 'DEFECT_ANALYSIS' | 'TREND_ANALYSIS';
  
  // Filters for what data to include
  filters: {
    startDate?: Date;
    endDate?: Date;
    testSuiteIds?: string[];
    testCaseIds?: string[];
    executionStatuses?: ExecutionStatus[];
    environments?: string[];
    buildVersions?: string[];
    executors?: string[];
    tags?: string[];
  };
  
  // Output format configuration
  outputFormat: 'PDF' | 'HTML' | 'EXCEL' | 'JSON';
  
  // Report-specific options
  options?: {
    includeCharts?: boolean;
    includeAttachments?: boolean;
    includeScreenshots?: boolean;
    includeTrends?: boolean;
    compareWithPreviousPeriod?: boolean;
    periodDuration?: number; // days
    maxItems?: number;
    groupBy?: string[];
    sortBy?: string;
    customFields?: string[];
  };
  
  userId: string;
}

interface GenerateTestReportOutput {
  reportId: string;
  reportUrl: string;
  reportData?: any; // For JSON output format
  summary: {
    generatedAt: Date;
    recordCount: number;
    dateRange: [Date, Date];
    passRate?: number;
    executionCount?: number;
    defectCount?: number;
  };
  insights?: string[]; // AI-generated insights
}

class GenerateTestReportUseCase {
  constructor(
    private readonly testCaseRepository: TestCaseRepository,
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly testExecutionRepository: TestExecutionRepository,
    private readonly reportingService: ReportingService,
    private readonly llmAdvisorService: LLMAdvisorService,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: GenerateTestReportInput): Promise<GenerateTestReportOutput> {
    // Implementation details...
  }
}
```

**Key Behaviors**:
- Flexible report configuration
- Multiple output format support
- Rich filtering capabilities
- Data aggregation and analysis
- Trend identification and visualization
- AI-generated insights

## Common Use Case Implementation Structure

All use cases in Skidbladnir follow a consistent implementation pattern:

1. **Input Validation**: Validate input parameters before processing
2. **Authorization Check**: Ensure the user has permission to perform the operation
3. **Resource Acquisition**: Retrieve necessary domain objects and dependencies
4. **Operation Execution**: Coordinate domain services and entities to perform the workflow
5. **Result Compilation**: Assemble the output DTO with results and metadata
6. **Error Handling**: Catch and transform exceptions into meaningful application errors
7. **Logging & Monitoring**: Log operation details and metrics for observability
8. **Result Return**: Return the formatted output to the caller

## Use Case Factory

**Path**: `/pkg/usecases/UseCaseFactory.ts`

**Purpose**: Creates use case instances with appropriate dependencies.

**Interface**:
```typescript
interface UseCaseFactory {
  createMigrateTestCasesUseCase(): MigrateTestCasesUseCase;
  createGenerateTestCasesUseCase(): GenerateTestCasesUseCase;
  createImportExcelTestCasesUseCase(): ImportExcelTestCasesUseCase;
  createRunTestExecutionUseCase(): RunTestExecutionUseCase;
  createManageTestSuiteUseCase(): ManageTestSuiteUseCase;
  createGenerateTestReportUseCase(): GenerateTestReportUseCase;
  // Additional use case factory methods...
}
```

**Key Behaviors**:
- Dependency injection for use cases
- Configuration of cross-cutting concerns
- Environment-specific implementation selection
- Consistent use case creation pattern