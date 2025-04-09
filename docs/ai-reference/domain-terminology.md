# Domain Terminology

This document defines the core terminology and domain-specific language used throughout the Skidbladnir system. It serves as a glossary for AI assistants and developers to ensure consistent understanding of domain concepts.

## Status Enumerations

### TestCaseStatus

**Path**: `/pkg/domain/enums/TestCaseStatus.ts`

**Purpose**: Represents the lifecycle state of a test case.

```typescript
enum TestCaseStatus {
  DRAFT = 'DRAFT',           // Initial creation state, not ready for execution
  READY = 'READY',           // Reviewed and ready for execution
  APPROVED = 'APPROVED',     // Formally approved for test execution
  DEPRECATED = 'DEPRECATED', // No longer in active use but retained for reference
  ARCHIVED = 'ARCHIVED'      // Retained for historical purposes only
}
```

**State Transitions**:
- DRAFT → READY: When test case is complete and reviewed
- READY → APPROVED: After formal approval process
- Any → DEPRECATED: When test case is no longer relevant but still referenced
- DEPRECATED → ARCHIVED: When test case should be removed from active views

### ExecutionStatus

**Path**: `/pkg/domain/enums/ExecutionStatus.ts`

**Purpose**: Indicates the outcome of a test execution.

```typescript
enum ExecutionStatus {
  PASSED = 'PASSED',           // All steps executed successfully
  FAILED = 'FAILED',           // One or more steps failed
  BLOCKED = 'BLOCKED',         // Unable to complete due to external dependencies
  NOT_EXECUTED = 'NOT_EXECUTED', // Scheduled but not run
  IN_PROGRESS = 'IN_PROGRESS', // Currently being executed
  SKIPPED = 'SKIPPED'          // Deliberately not executed
}
```

**Categorization**:
- Terminal statuses: PASSED, FAILED, SKIPPED
- Non-terminal statuses: BLOCKED, NOT_EXECUTED, IN_PROGRESS
- Positive outcomes: PASSED
- Negative outcomes: FAILED, BLOCKED

### Priority

**Path**: `/pkg/domain/enums/Priority.ts`

**Purpose**: Indicates the importance and urgency of a test case.

```typescript
enum Priority {
  LOW = 'LOW',           // Minimal impact, can be deferred
  MEDIUM = 'MEDIUM',     // Moderate importance, standard priority
  HIGH = 'HIGH',         // Significant importance, execute early
  CRITICAL = 'CRITICAL'  // Must-test functionality, highest priority
}
```

**Numerical Mapping**:
- LOW = 1
- MEDIUM = 2
- HIGH = 3
- CRITICAL = 4

### UserRole

**Path**: `/pkg/domain/enums/UserRole.ts`

**Purpose**: Defines the role and permissions of a user in the system.

```typescript
enum UserRole {
  ADMIN = 'ADMIN',         // Full system access and configuration
  MANAGER = 'MANAGER',      // Test management and reporting access
  TESTER = 'TESTER',        // Test execution and creation rights
  DEVELOPER = 'DEVELOPER',  // Limited execution and viewing rights
  VIEWER = 'VIEWER'         // Read-only access
}
```

**Permission Hierarchy**:
- ADMIN: All permissions
- MANAGER: Create, read, update, delete test cases and suites; view all reports
- TESTER: Create, read, update test cases; execute tests; view related reports
- DEVELOPER: Read test cases; execute assigned tests; create defects
- VIEWER: Read-only access to test cases, suites, and executions

## Complex Types

### TestStep

**Path**: `/pkg/domain/types/TestStep.ts`

**Purpose**: Defines a single step within a test case.

```typescript
interface TestStep {
  id: string;                // Unique identifier for the step
  order: number;             // Sequence position in the test case
  action: string;            // What the tester should do
  expectedResult: string;    // What should happen when action is performed
  data?: string;             // Test data to use for this step
  isDataDriven: boolean;     // Whether step uses external data source
  attachments?: string[];    // Reference to attached files for this step
}
```

**Usage Context**:
- Part of TestCase entity
- Ordered sequence within test steps
- Referenced by StepResult during execution

### StepResult

**Path**: `/pkg/domain/types/StepResult.ts`

**Purpose**: Records the outcome of executing a single test step.

```typescript
interface StepResult {
  stepId: string;                    // Reference to test step
  status: ExecutionStatus;           // Outcome of the step
  actualResult?: string;             // What actually happened
  notes?: string;                    // Tester comments
  attachments?: string[];            // Evidence files (screenshots, logs)
  executionTime?: number;            // Time in seconds
  defects?: string[];                // Associated issues
}
```

**Usage Context**:
- Part of TestExecution record
- Collected for all steps in an execution
- Used for detailed execution analysis

### Attachment

**Path**: `/pkg/domain/types/Attachment.ts`

**Purpose**: Represents a file attached to a test case, step, or execution.

```typescript
interface Attachment {
  id: string;                  // Unique identifier
  fileName: string;            // Original file name
  fileType: string;            // MIME type
  size: number;                // File size in bytes
  storageLocation: string;     // Where the file is stored
  description?: string;        // Optional description
  uploadedBy: string;          // User who added the attachment
  uploadedAt: Date;            // When it was attached
  metadata?: Record<string, any>; // Additional file metadata
}
```

**Usage Context**:
- Associated with TestCase for specifications or resources
- Associated with TestStep for step-specific resources
- Associated with StepResult for evidence or screenshots

### UserPreferences

**Path**: `/pkg/domain/types/UserPreferences.ts`

**Purpose**: Stores user-specific settings and preferences.

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';   // UI theme preference
  language: string;                      // Preferred language code
  dateFormat: string;                    // How to display dates
  timeFormat: string;                    // How to display times
  timezone: string;                      // User's timezone
  notifications: {
    email: boolean;                      // Email notification flag
    inApp: boolean;                      // In-app notification flag
    executionCompleted: boolean;         // Notification when executions complete
    assignedTestCase: boolean;           // Notification when assigned
    mentionedInComment: boolean;         // Notification when mentioned
  };
  defaultView: string;                   // Starting view preference
  itemsPerPage: number;                  // Pagination preference
  customFields?: Record<string, any>;    // User-defined preferences
}
```

**Usage Context**:
- Part of User entity
- Used for UI customization
- Used for notification routing

## Domain-Specific Terms

### Provider

**Concept**: A connection to an external test management system.

**Details**:
- Implements a standardized interface for interacting with external systems
- Handles authentication, rate limiting, and data mapping
- Examples include ZephyrProvider, QTestProvider, ALMProvider

**Related Interfaces**:
- `ProviderInterface`: Base interface for all providers
- `ExtractionProvider`: For reading from source systems
- `LoadingProvider`: For writing to target systems

### Migration

**Concept**: The process of transferring test assets between systems.

**Details**:
- Includes extraction, transformation, and loading phases
- Preserves relationships and metadata
- Includes validation and reconciliation

**Component Types**:
- `MigrationPlan`: Configuration and scope of migration
- `MigrationExecution`: Runtime instance of a migration
- `MigrationResult`: Outcome and statistics of a migration

### TestSuite Hierarchy

**Concept**: Nested organization of test suites.

**Details**:
- Parent-child relationships between suites
- Path representation for location in hierarchy
- Depth indicates nesting level from root

**Terminology**:
- `Root Suite`: Top-level suite with no parent
- `Child Suite`: Suite contained within another suite
- `Path`: Array of suite IDs from root to current suite
- `Depth`: Number of levels from root (0 for root suites)

### Execution Plan

**Concept**: Organized schedule for executing a set of test cases.

**Details**:
- Assigns test cases to executors
- Sets priorities and sequences
- May include time estimates and dependencies

**Components**:
- `ExecutionSlot`: Scheduled time for test execution
- `ExecutorAssignment`: Assignment of test to executor
- `ExecutionSequence`: Ordered list of tests to execute

### Defect Linking

**Concept**: Association between test executions and tracked defects.

**Details**:
- Bi-directional linking between execution failures and defects
- Tracks defect lifecycle alongside test execution
- Supports root cause analysis

**Related Concepts**:
- `DefectStatus`: Current state of a defect (Open, Fixed, Verified)
- `DefectSeverity`: Impact level of the defect
- `DefectLifecycle`: Progression of defect states

## Translation Layer Concepts

### Canonical Data Model

**Concept**: Standardized internal representation of test assets.

**Details**:
- System-neutral representation of test data
- Serves as an intermediary format for transformation
- Enforces consistent data structure

**Components**:
- `CanonicalTestCase`: Standard test case representation
- `CanonicalMapping`: Rules for transformation to/from canonical form
- `ValidationRules`: Constraints for canonical model integrity

### Provider Adapter

**Concept**: Component that translates between canonical model and provider-specific format.

**Details**:
- Implements bidirectional mapping
- Handles system-specific quirks and limitations
- Manages API version differences

**Methods**:
- `toCanonical`: Converts from provider format to canonical model
- `fromCanonical`: Converts from canonical model to provider format
- `validateMapping`: Ensures data integrity during conversion

### Field Mapping

**Concept**: Configuration of how fields translate between systems.

**Details**:
- Maps field names between different systems
- Defines transformation rules for values
- Handles data type conversions

**Mapping Types**:
- `DirectMapping`: 1:1 field mapping
- `TransformationMapping`: Value conversion required
- `CompositeMapping`: Multiple source fields to one target field
- `SplitMapping`: One source field to multiple target fields

## Testing Methodology Terms

### Coverage Analysis

**Concept**: Assessment of test coverage against requirements or features.

**Details**:
- Measures what percentage of requirements are tested
- Identifies gaps in test coverage
- Informs test planning priorities

**Metrics**:
- `RequirementCoverage`: Percentage of requirements with associated tests
- `FeatureCoverage`: Percentage of features with associated tests
- `CriticalPathCoverage`: Coverage of essential user journeys

### Test Complexity

**Concept**: Measure of test case difficulty and comprehensiveness.

**Details**:
- Calculated from number of steps, paths, and conditions
- Used for effort estimation and quality assessment
- Informs resource allocation

**Calculation Factors**:
- Number of test steps
- Number of decision points or conditions
- Data variations required
- Technical knowledge required

### Execution Metrics

**Concept**: Statistical measures of test execution results.

**Details**:
- Track pass/fail rates over time
- Measure execution efficiency and effectiveness
- Support trend analysis and forecasting

**Key Metrics**:
- `PassRate`: Percentage of passed test executions
- `DefectDensity`: Number of defects per test case
- `ExecutionVelocity`: Test cases executed per time period
- `MeanTimeToDetect`: Average time to find defects

## LLM-Specific Terms

### Test Case Generation

**Concept**: Using LLM to create test cases from requirements.

**Details**:
- Analyzes requirements text for testable aspects
- Creates comprehensive test cases with steps
- Optimizes for coverage and quality

**Parameters**:
- `Creativity`: Controls variation in generated tests
- `Detail`: Controls depth and complexity of steps
- `FocusAreas`: Specific types of testing to emphasize

### Test Quality Analysis

**Concept**: LLM-based assessment of test case quality.

**Details**:
- Evaluates clarity, completeness, and correctness
- Suggests improvements for low-quality tests
- Assigns quality scores for comparison

**Quality Dimensions**:
- `Clarity`: How clear and unambiguous the test is
- `Completeness`: Coverage of necessary scenarios
- `Maintainability`: Ease of updating the test
- `Executability`: How easily it can be executed