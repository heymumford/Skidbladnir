# Domain Services

Domain Services in Skidbladnir handle complex business logic that doesn't naturally fit within a single entity or value object. They coordinate between multiple entities, implement complex domain rules, and encapsulate business processes while maintaining a pure domain-focused approach.

## Design Principles

1. **Stateless Operation**: Domain services don't maintain state between operations
2. **Domain Focus**: Services operate only on domain concepts, not infrastructure
3. **Clear Purpose**: Each service addresses a specific aspect of domain logic
4. **Repository Independence**: Services operate on entities but delegate persistence to repositories
5. **Testability**: All services can be tested in isolation without infrastructure dependencies

## TestCaseService

**Path**: `/pkg/domain/services/TestCaseService.ts`

**Purpose**: Handles complex operations and validations related to test cases that span multiple entities or require complex domain knowledge.

**Interface**:
```typescript
interface TestCaseService {
  // Validation
  validateTestCase(testCase: Partial<TestCase>): string[]; // Returns validation errors
  validateTestStep(step: TestStep): string[];
  validateRelationships(testCase: TestCase): string[];
  
  // Test case generation and manipulation
  enrichTestCaseMetadata(testCase: TestCase): Promise<TestCase>;
  generateTestSteps(description: string, requirements?: string[]): Promise<TestStep[]>;
  autoGenerateExpectedResults(testSteps: TestStep[]): Promise<TestStep[]>;
  reorderTestSteps(testCase: TestCase, newOrder: string[]): TestCase;
  
  // Analysis and metrics
  calculateTestComplexity(testCase: TestCase): number;
  estimateExecutionTime(testCase: TestCase): number;
  calculateCoveragePotential(testCase: TestCase): CoverageMetrics;
  
  // Duplication and similarity
  checkForDuplicates(testCase: TestCase): Promise<TestCase[]>;
  calculateSimilarity(testCase1: TestCase, testCase2: TestCase): number;
  detectRedundantSteps(testCase: TestCase): string[]; // Returns step IDs
  
  // Workflow operations
  canTransitionStatus(testCase: TestCase, newStatus: TestCaseStatus): boolean;
  transitionStatus(testCase: TestCase, newStatus: TestCaseStatus): TestCase;
  assignToUser(testCase: TestCase, userId: string): TestCase;
  checkExecutionReadiness(testCase: TestCase): { ready: boolean; reasons: string[] };
}
```

**Key Behaviors**:
- Comprehensive validation of test case structure and relationships
- Automated test step generation and enhancement
- Complexity and coverage analysis
- Status workflow management
- Duplicate and redundancy detection

## TestSuiteService

**Path**: `/pkg/domain/services/TestSuiteService.ts`

**Purpose**: Manages operations that involve test suite organization, hierarchy, and relationship with test cases.

**Interface**:
```typescript
interface TestSuiteService {
  // Validation
  validateTestSuite(testSuite: Partial<TestSuite>): string[];
  validateHierarchy(suiteId: string, parentId: string): string[];
  
  // Structure and organization
  calculateSuiteCoverage(suiteId: string): Promise<CoverageMetrics>;
  getTestSuiteHierarchy(suiteId: string): Promise<TestSuite[]>;
  getExecutionStatus(suiteId: string): Promise<ExecutionSummary>;
  getSuiteDepth(suiteId: string): Promise<number>;
  
  // Suite operations
  mergeSuites(sourceSuiteId: string, targetSuiteId: string): Promise<TestSuite>;
  cloneSuite(suiteId: string, newName: string, includeTestCases?: boolean): Promise<TestSuite>;
  reorderTestCases(suiteId: string, newOrder: string[]): Promise<TestSuite>;
  
  // Test planning
  createExecutionPlan(suiteId: string, options?: ExecutionPlanOptions): Promise<ExecutionPlan>;
  optimizeExecutionOrder(suiteId: string, criteria?: OptimizationCriteria): Promise<string[]>; // Returns ordered test case IDs
  estimateTotalExecutionTime(suiteId: string): Promise<number>; // Returns minutes
  
  // Analysis
  findRedundantTestCases(suiteId: string): Promise<RedundancyReport>;
  analyzeCoverage(suiteId: string): Promise<CoverageAnalysis>;
  generateSuiteSummary(suiteId: string): Promise<SuiteSummary>;
}
```

**Key Behaviors**:
- Hierarchical suite management
- Test case organization within suites
- Test execution planning and optimization
- Coverage and redundancy analysis
- Suite cloning and merging

## TestExecutionService

**Path**: `/pkg/domain/services/TestExecutionService.ts`

**Purpose**: Handles the execution of tests, recording results, and analyzing execution data.

**Interface**:
```typescript
interface TestExecutionService {
  // Validation
  validateExecution(execution: Partial<TestExecution>): string[];
  validateStepResults(stepResults: StepResult[], testCase: TestCase): string[];
  
  // Execution management
  createExecution(testCaseId: string, executor: string): Promise<TestExecution>;
  startExecution(executionId: string): Promise<TestExecution>;
  recordStepResult(executionId: string, stepId: string, result: StepResult): Promise<TestExecution>;
  completeExecution(executionId: string, status: ExecutionStatus, notes?: string): Promise<TestExecution>;
  
  // Results and analysis
  calculateExecutionMetrics(executions: TestExecution[]): ExecutionMetrics;
  analyzeExecutionTrend(testCaseId: string, period: number): Promise<TrendAnalysis>;
  generateExecutionReport(executionId: string): Promise<ExecutionReport>;
  compareExecutions(executionId1: string, executionId2: string): Promise<ExecutionComparison>;
  
  // Defect management
  linkDefect(executionId: string, defectId: string, details?: DefectDetails): Promise<TestExecution>;
  unlinkDefect(executionId: string, defectId: string): Promise<TestExecution>;
  analyzeDefectPatterns(testCaseId: string): Promise<DefectPatternAnalysis>;
  
  // Batch operations
  bulkUpdateExecutions(executionIds: string[], partialData: Partial<TestExecution>): Promise<number>; // Returns success count
  bulkCreateFromTestSuite(suiteId: string, executor: string): Promise<TestExecution[]>;
}
```

**Key Behaviors**:
- Test execution lifecycle management
- Detailed step result recording
- Execution metrics and trend analysis
- Defect tracking and correlation
- Batch execution operations

## AuthService

**Path**: `/pkg/domain/services/AuthService.ts`

**Purpose**: Manages authentication, authorization, and user security aspects.

**Interface**:
```typescript
interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

interface AuthService {
  // Authentication
  authenticate(username: string, password: string): Promise<AuthResult>;
  validateToken(token: string): Promise<User | null>;
  refreshToken(refreshToken: string): Promise<AuthResult | null>;
  revokeToken(token: string): Promise<boolean>;
  
  // Password management
  hashPassword(password: string): Promise<string>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  generatePasswordResetToken(email: string): Promise<string | null>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  
  // Authorization
  hasPermission(user: User, permission: Permission): boolean;
  hasRole(user: User, role: UserRole): boolean;
  getPermissionsForUser(user: User): Permission[];
  
  // Security management
  lockAccount(userId: string, reason: string): Promise<boolean>;
  unlockAccount(userId: string): Promise<boolean>;
  trackLoginAttempt(username: string, success: boolean, ipAddress?: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
}
```

**Key Behaviors**:
- User authentication and session management
- Password security and reset workflows
- Permission and role-based authorization
- Account security monitoring

## MigrationService

**Path**: `/pkg/domain/services/MigrationService.ts`

**Purpose**: Handles the core domain logic of migrating test assets between different systems.

**Interface**:
```typescript
interface MigrationContext {
  sourceSystem: string;
  targetSystem: string;
  userId: string;
  options: MigrationOptions;
}

interface MigrationService {
  // Validation
  validateMigrationConfig(config: MigrationConfig): string[];
  validateSourceConnection(sourceSystem: string, credentials: any): Promise<ConnectionValidationResult>;
  validateTargetConnection(targetSystem: string, credentials: any): Promise<ConnectionValidationResult>;
  
  // Migration planning
  analyzeMigrationScope(context: MigrationContext): Promise<MigrationAnalysis>;
  createMigrationPlan(context: MigrationContext): Promise<MigrationPlan>;
  estimateMigrationTime(plan: MigrationPlan): Promise<number>; // Returns estimated minutes
  
  // Migration execution
  executeMigration(plan: MigrationPlan): Promise<MigrationExecution>;
  pauseMigration(executionId: string): Promise<boolean>;
  resumeMigration(executionId: string): Promise<boolean>;
  cancelMigration(executionId: string): Promise<boolean>;
  
  // Monitoring and results
  getMigrationStatus(executionId: string): Promise<MigrationStatus>;
  getMigrationSummary(executionId: string): Promise<MigrationSummary>;
  getMigrationLogs(executionId: string): Promise<MigrationLog[]>;
  
  // Reconciliation
  validateMigrationResults(executionId: string): Promise<ValidationResults>;
  reconcileMigrationIssues(executionId: string): Promise<ReconciliationResults>;
  rollbackMigration(executionId: string): Promise<RollbackResults>;
}
```

**Key Behaviors**:
- Migration validation and planning
- Execution monitoring and control
- Result verification and reconciliation
- Rollback capabilities
- Comprehensive logging and reporting

## LLMAdvisorService

**Path**: `/pkg/domain/services/LLMAdvisorService.ts`

**Purpose**: Provides domain-specific LLM-based assistance for test asset management.

**Interface**:
```typescript
interface LLMAdvisorService {
  // Test generation
  generateTestCasesFromRequirements(requirements: string, count?: number): Promise<TestCase[]>;
  enhanceTestCase(testCase: TestCase): Promise<TestCase>;
  suggestAdditionalTestCases(testSuiteId: string): Promise<TestCaseSuggestion[]>;
  generateTestStepsFromDescription(description: string): Promise<TestStep[]>;
  
  // Translation and mapping
  mapFieldsAcrossSystems(sourceSystem: string, targetSystem: string, fields: Record<string, any>): Promise<FieldMapping>;
  translateTestCaseFormat(testCase: TestCase, targetSystem: string): Promise<any>; // Returns system-specific format
  suggestFieldMappings(sourceFields: string[], targetFields: string[]): Promise<FieldMappingSuggestion[]>;
  
  // Analysis and optimization
  analyzeTestCaseQuality(testCase: TestCase): Promise<QualityAnalysis>;
  detectRedundantTests(testCases: TestCase[]): Promise<RedundancyAnalysis>;
  suggestTestCaseImprovements(testCaseId: string): Promise<ImprovementSuggestion[]>;
  
  // Knowledge and guidance
  explainTestingConcept(concept: string): Promise<ConceptExplanation>;
  suggestTestingApproach(featureDescription: string): Promise<TestingApproachSuggestion>;
  recommendTestAutomationStrategy(testCase: TestCase): Promise<AutomationRecommendation>;
}
```

**Key Behaviors**:
- AI-assisted test generation and enhancement
- Cross-system field mapping and translation
- Test quality analysis and improvement
- Domain knowledge recommendations

## Important Domain Service Characteristics

1. **Domain Purity**: Services operate exclusively on domain concepts without infrastructure dependencies.
2. **Single Responsibility**: Each service has a clear and focused purpose.
3. **Composition Over Inheritance**: Services compose behavior rather than inheriting it.
4. **Dependency Injection**: Services receive their dependencies rather than creating them.
5. **Interface-Based Design**: All services are defined by interfaces for implementation flexibility.
6. **Rich Validation**: Services include comprehensive validation logic for their operations.
7. **Behavior Grouping**: Methods are organized by related behaviors and purposes.
8. **Contextual Parameters**: Operations that need context receive it explicitly rather than relying on global state.