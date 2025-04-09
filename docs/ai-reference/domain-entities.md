# Domain Entities

The core domain entities in Skidbladnir represent the primary business objects in the test asset migration system. These entities follow Domain-Driven Design principles, encapsulating both data and behavior.

## TestCase

**Path**: `/pkg/domain/entities/TestCase.ts`

**Purpose**: Represents a single test case with its complete definition, including steps, metadata, and lifecycle information.

**Properties**:
```typescript
interface TestCase {
  id: string;                  // Unique identifier
  title: string;               // Descriptive title
  description: string;         // Full test description
  status: TestCaseStatus;      // Current lifecycle status (DRAFT, READY, APPROVED, DEPRECATED)
  priority: Priority;          // Importance level (LOW, MEDIUM, HIGH, CRITICAL)
  steps: TestStep[];           // Ordered sequence of test steps
  tags: string[];              // Labels for categorization and filtering
  preconditions?: string;      // Required setup before test execution
  postconditions?: string;     // Expected system state after execution
  estimatedDuration?: number;  // Estimated execution time in minutes
  author: string;              // User who created the test
  assignee?: string;           // User assigned to the test
  sourceTool?: string;         // Original system if migrated
  sourceId?: string;           // Original ID if migrated
  attachments?: Attachment[];  // Associated files
  customFields?: Record<string, any>; // Tool-specific fields
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last modification timestamp
}
```

**Behaviors**:
- Validation of test case properties
- Status lifecycle transitions (e.g., DRAFT → READY → APPROVED)
- Step management (add, update, delete, reorder)
- Test case cloning and versioning

**Relationships**:
- Belongs to zero or more TestSuites
- Has many TestExecutions
- Associated with Users (author, assignee)

## TestSuite

**Path**: `/pkg/domain/entities/TestSuite.ts`

**Purpose**: Organizes related test cases into logical groupings, supporting hierarchical test management.

**Properties**:
```typescript
interface TestSuite {
  id: string;                 // Unique identifier
  name: string;               // Suite name
  description: string;        // Detailed description
  testCases: string[];        // IDs of contained test cases
  parentSuiteId?: string;     // Parent suite for hierarchical organization
  path?: string[];            // Full path in suite hierarchy
  tags: string[];             // Labels for categorization and filtering
  createdBy: string;          // Author
  customFields?: Record<string, any>; // Tool-specific fields
  createdAt: Date;            // Creation timestamp
  updatedAt: Date;            // Last modification timestamp
}
```

**Behaviors**:
- Hierarchical organization (parent-child relationships)
- Test case inclusion management
- Coverage calculation
- Execution planning

**Relationships**:
- Contains many TestCases
- May have a parent TestSuite
- May have many child TestSuites

## TestExecution

**Path**: `/pkg/domain/entities/TestExecution.ts`

**Purpose**: Records the execution of a test case, including results, environment details, and issue tracking.

**Properties**:
```typescript
interface TestExecution {
  id: string;                  // Unique identifier
  testCaseId: string;          // Reference to the test case
  testCaseVersion: number;     // Version of the test case used
  executionDate: Date;         // When the test was executed
  executedBy: string;          // User who executed the test
  status: ExecutionStatus;     // Result (PASSED, FAILED, BLOCKED, etc.)
  duration: number;            // Time taken in seconds
  environment: string;         // Test environment (e.g., "QA", "Staging")
  buildVersion: string;        // Software version tested
  notes: string;               // Additional comments
  defects: string[];           // Associated issue/bug IDs
  stepResults: StepResult[];   // Results for each test step
  attachments?: Attachment[];  // Evidence files (screenshots, logs)
  customFields?: Record<string, any>; // Tool-specific fields
}
```

**Behaviors**:
- Execution result tracking
- Defect association and tracking
- Test step result recording
- Evidence management (attachments)
- Execution metrics calculation

**Relationships**:
- Belongs to a TestCase
- Associated with a User (executedBy)
- May be associated with defects/issues

## User

**Path**: `/pkg/domain/entities/User.ts`

**Purpose**: Represents a system user with authentication, authorization, and preferences.

**Properties**:
```typescript
interface User {
  id: string;                  // Unique identifier
  username: string;            // Login name
  email: string;               // Email address
  firstName: string;           // First name
  lastName: string;            // Last name
  role: UserRole;              // System role (ADMIN, MANAGER, TESTER, DEVELOPER, VIEWER)
  preferences: UserPreferences; // User-specific settings
  lastLogin?: Date;            // Last login timestamp
  active: boolean;             // Account status
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last modification timestamp
}
```

**Behaviors**:
- Authentication and authorization
- Preference management
- Role-based access control

**Relationships**:
- Authors many TestCases
- Executes many TestExecutions
- Has specific permissions based on role

## Important Entity Design Principles

1. **Entity Identity**: All entities have unique identifiers accessible via the `id` property.
2. **Temporal Tracking**: Creation and modification timestamps are consistently tracked.
3. **Validation**: Entities validate their own state according to business rules.
4. **Immutability**: Direct property modification is discouraged; use provided methods instead.
5. **Customization**: CustomFields support provider-specific data requirements.
6. **Rich Behavior**: Business logic is encapsulated within the entities themselves.
7. **Anemic Models Prevention**: Entities are not merely data carriers but include domain logic.