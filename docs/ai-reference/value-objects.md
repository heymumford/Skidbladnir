# Value Objects

Value objects in Skidbladnir are immutable objects that represent concepts from the domain with no identity. They are defined by their attributes and are considered equal if all attributes are equal. Value objects are used for representing concepts that don't need separate identity tracking.

## Identifier

**Path**: `/pkg/domain/value-objects/Identifier.ts`

**Purpose**: A type-safe wrapper for entity identifiers that ensures consistent handling and validation.

**Implementation**:
```typescript
class Identifier {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Identifier {
    if (!value || value.trim() === '') {
      throw new Error('Identifier value cannot be empty');
    }
    return new Identifier(value.trim());
  }

  static createRandom(): Identifier {
    return new Identifier(uuid.v4());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Identifier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Key Behaviors**:
- Immutability (all properties are readonly)
- Factory creation methods that enforce validation
- Value equality (not reference equality)
- Random creation for new entities

## Email

**Path**: `/pkg/domain/value-objects/Email.ts`

**Purpose**: Represents and validates email addresses throughout the system.

**Implementation**:
```typescript
class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Email {
    if (!Email.isValid(value)) {
      throw new Error('Invalid email format');
    }
    return new Email(value.toLowerCase().trim());
  }

  static isValid(email: string): boolean {
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Key Behaviors**:
- Format validation
- Consistent normalization (lowercase, trimming)
- Domain and local part extraction
- Value equality

## Priority

**Path**: `/pkg/domain/value-objects/Priority.ts`

**Purpose**: Represents the importance level of a test case with associated numeric values for sorting and filtering.

**Implementation**:
```typescript
enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

class Priority {
  private readonly level: PriorityLevel;
  private readonly value: number;
  
  private constructor(level: PriorityLevel) {
    this.level = level;
    this.value = Priority.getPriorityValue(level);
  }

  static create(level: PriorityLevel): Priority {
    return new Priority(level);
  }

  static fromString(level: string): Priority {
    const upperLevel = level.toUpperCase();
    if (!Object.values(PriorityLevel).includes(upperLevel as PriorityLevel)) {
      throw new Error(`Invalid priority level: ${level}`);
    }
    return new Priority(upperLevel as PriorityLevel);
  }

  static fromValue(value: number): Priority {
    switch (value) {
      case 1: return new Priority(PriorityLevel.LOW);
      case 2: return new Priority(PriorityLevel.MEDIUM);
      case 3: return new Priority(PriorityLevel.HIGH);
      case 4: return new Priority(PriorityLevel.CRITICAL);
      default: throw new Error(`Invalid priority value: ${value}`);
    }
  }

  private static getPriorityValue(level: PriorityLevel): number {
    switch (level) {
      case PriorityLevel.LOW: return 1;
      case PriorityLevel.MEDIUM: return 2;
      case PriorityLevel.HIGH: return 3;
      case PriorityLevel.CRITICAL: return 4;
    }
  }

  getLevel(): PriorityLevel {
    return this.level;
  }

  getValue(): number {
    return this.value;
  }

  equals(other: Priority): boolean {
    return this.level === other.level;
  }
  
  isHigherThan(other: Priority): boolean {
    return this.value > other.value;
  }
  
  isLowerThan(other: Priority): boolean {
    return this.value < other.value;
  }

  toString(): string {
    return this.level;
  }
}
```

**Key Behaviors**:
- Enumerated constants
- Numeric value mapping
- Comparison operations
- Creation from various formats

## TestStep

**Path**: `/pkg/domain/value-objects/TestStep.ts`

**Purpose**: Represents an individual step within a test case, including the action to perform and the expected result.

**Implementation**:
```typescript
interface TestStep {
  id: string;                // Step identifier
  order: number;             // Sequence number
  action: string;            // What to do
  expectedResult: string;    // What should happen
  data?: string;             // Test data to use
  isDataDriven: boolean;     // Whether step uses external data
  attachments?: string[];    // Related files
}

class TestStepVO {
  readonly id: string;
  readonly order: number;
  readonly action: string;
  readonly expectedResult: string;
  readonly data?: string;
  readonly isDataDriven: boolean;
  readonly attachments: string[];

  private constructor(props: TestStep) {
    this.id = props.id;
    this.order = props.order;
    this.action = props.action;
    this.expectedResult = props.expectedResult;
    this.data = props.data;
    this.isDataDriven = props.isDataDriven || false;
    this.attachments = props.attachments || [];
  }

  static create(props: Omit<TestStep, 'id'>): TestStepVO {
    if (!props.action || props.action.trim() === '') {
      throw new Error('Test step action cannot be empty');
    }
    
    if (!props.expectedResult || props.expectedResult.trim() === '') {
      throw new Error('Test step expected result cannot be empty');
    }
    
    if (props.order < 1) {
      throw new Error('Test step order must be positive');
    }
    
    return new TestStepVO({
      ...props,
      id: uuid.v4(),
      isDataDriven: props.isDataDriven || false,
      attachments: props.attachments || []
    });
  }

  static reconstitute(props: TestStep): TestStepVO {
    return new TestStepVO(props);
  }

  withUpdatedAction(action: string): TestStepVO {
    return new TestStepVO({
      ...this,
      action
    });
  }

  withUpdatedExpectedResult(expectedResult: string): TestStepVO {
    return new TestStepVO({
      ...this,
      expectedResult
    });
  }

  withUpdatedOrder(order: number): TestStepVO {
    return new TestStepVO({
      ...this,
      order
    });
  }

  toDTO(): TestStep {
    return {
      id: this.id,
      order: this.order,
      action: this.action,
      expectedResult: this.expectedResult,
      data: this.data,
      isDataDriven: this.isDataDriven,
      attachments: this.attachments
    };
  }
}
```

**Key Behaviors**:
- Sequence ordering
- Validation of required fields
- Immutable updates (return new instances)
- DTO conversion for persistence

## ExecutionStatus

**Path**: `/pkg/domain/value-objects/ExecutionStatus.ts`

**Purpose**: Represents the outcome of a test execution with associated metadata for reporting and analysis.

**Implementation**:
```typescript
enum ExecutionStatusType {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  NOT_EXECUTED = 'NOT_EXECUTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SKIPPED = 'SKIPPED'
}

class ExecutionStatus {
  readonly type: ExecutionStatusType;
  readonly isTerminal: boolean;
  readonly color: string;
  
  private constructor(type: ExecutionStatusType) {
    this.type = type;
    this.isTerminal = this.determineIsTerminal(type);
    this.color = this.determineColor(type);
  }

  private determineIsTerminal(type: ExecutionStatusType): boolean {
    return [
      ExecutionStatusType.PASSED,
      ExecutionStatusType.FAILED,
      ExecutionStatusType.SKIPPED
    ].includes(type);
  }

  private determineColor(type: ExecutionStatusType): string {
    switch (type) {
      case ExecutionStatusType.PASSED: return '#4CAF50';  // Green
      case ExecutionStatusType.FAILED: return '#F44336';  // Red
      case ExecutionStatusType.BLOCKED: return '#FFC107'; // Amber
      case ExecutionStatusType.NOT_EXECUTED: return '#9E9E9E'; // Gray
      case ExecutionStatusType.IN_PROGRESS: return '#2196F3'; // Blue
      case ExecutionStatusType.SKIPPED: return '#673AB7';  // Purple
    }
  }

  static create(type: ExecutionStatusType): ExecutionStatus {
    return new ExecutionStatus(type);
  }

  static fromString(value: string): ExecutionStatus {
    const upperValue = value.toUpperCase();
    if (!Object.values(ExecutionStatusType).includes(upperValue as ExecutionStatusType)) {
      throw new Error(`Invalid execution status: ${value}`);
    }
    return new ExecutionStatus(upperValue as ExecutionStatusType);
  }

  isPassed(): boolean {
    return this.type === ExecutionStatusType.PASSED;
  }

  isFailed(): boolean {
    return this.type === ExecutionStatusType.FAILED;
  }

  equals(other: ExecutionStatus): boolean {
    return this.type === other.type;
  }

  toString(): string {
    return this.type;
  }
}
```

**Key Behaviors**:
- Status categorization (pass/fail/etc.)
- Terminal state identification
- Visual representation (colors)
- Convenience status checking methods

## Value Object Design Principles

1. **Immutability**: All value objects are immutable; modification creates new instances.
2. **Self-Validation**: Objects validate their state upon creation.
3. **Factory Methods**: Creation is handled through static factory methods, not constructors.
4. **Value Equality**: Objects with the same values are considered equal.
5. **Rich Behavior**: Include domain-specific behavior, not just data.
6. **Encapsulation**: Internal state is protected, accessed through specific methods.
7. **Domain Language**: Value objects represent domain vocabulary precisely.