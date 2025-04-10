# Claude 3.7 Sonnet Prompt Templates

This document provides carefully crafted prompt templates for using Claude 3.7 Sonnet with the Skidbladnir project. These templates are optimized for our clean architecture and polyglot codebase.

## Table of Contents
- [Architecture Implementation](#architecture-implementation)
- [Cross-Language Refactoring](#cross-language-refactoring)
- [Test Generation](#test-generation)
- [Code Analysis](#code-analysis)
- [Documentation Generation](#documentation-generation)
- [Bug Fixing](#bug-fixing)
- [Architecture Validation](#architecture-validation)

## Architecture Implementation

```
I need to implement a [COMPONENT_TYPE] in [LANGUAGE] following our Clean Architecture principles.

Component Purpose: [COMPONENT_PURPOSE]

Responsibilities:
- [RESPONSIBILITY_1]
- [RESPONSIBILITY_2]
- [RESPONSIBILITY_3]

Core Requirements:
- Must follow Clean Architecture boundaries
- Must not allow infrastructure to leak into domain
- Must have proper error handling following our patterns
- Must be testable in isolation

Similar Component Reference:
```typescript
[EXISTING_COMPONENT_CODE]
```

Please provide a complete implementation that includes:
1. Interface definitions
2. Implementation classes
3. Proper error handling
4. Comments explaining architectural decisions
5. Example of how to use this component
```

## Cross-Language Refactoring

```
I need to refactor this [SOURCE_LANGUAGE] code to [TARGET_LANGUAGE] while maintaining our Clean Architecture principles:

[SOURCE_CODE]

Language-Specific Considerations:
- [SOURCE_LANGUAGE] uses [PATTERN_1] which translates to [PATTERN_2] in [TARGET_LANGUAGE]
- Error handling should follow [TARGET_LANGUAGE] idioms
- Interface contracts must remain the same

Architecture Requirements:
- Domain layer must not have external dependencies
- Use case layer orchestrates the domain
- Interfaces should be in their appropriate layers
- Infrastructure implementations should be behind interfaces

Please provide a complete implementation with comments explaining your translation decisions.
```

## Test Generation

```
Please generate comprehensive tests for this [LANGUAGE] implementation:

[CODE_TO_TEST]

Test Framework: [TEST_FRAMEWORK]

Test Requirements:
- Follow Arrange-Act-Assert pattern
- Test both happy paths and error cases
- Include edge cases: [EDGE_CASE_1], [EDGE_CASE_2]
- Mock external dependencies
- Test each public method

Architecture Context:
- This is a [LAYER] component in our Clean Architecture
- It has dependencies on: [DEPENDENCY_1], [DEPENDENCY_2]
- It should enforce these business rules: [RULE_1], [RULE_2]

Similar Test Example:
```typescript
[EXISTING_TEST_CODE]
```
```

## Code Analysis

```
Please analyze this [LANGUAGE] code for adherence to our Clean Architecture principles:

[CODE_TO_ANALYZE]

Specifically check for:
1. Domain layer independence (no imports from outer layers)
2. Use case orchestration patterns
3. Interface segregation and dependency inversion
4. Error handling patterns
5. Testability concerns
6. Cross-cutting concerns handling

For each issue found, please suggest improvements that maintain our architectural boundaries.
```

## Documentation Generation

```
Please create documentation for this [LANGUAGE] component:

[CODE_TO_DOCUMENT]

The documentation should include:
1. Component purpose and responsibilities
2. Architecture placement and boundary enforcement
3. Interface contracts and their guarantees
4. Usage examples for common scenarios
5. Error handling approach
6. Testing strategy
7. Extension points

Use markdown format and include diagrams where helpful (as text representations).
```

## Bug Fixing

```
There's a bug in this [LANGUAGE] code:

[BUGGY_CODE]

Bug Description: [BUG_DESCRIPTION]
Expected Behavior: [EXPECTED_BEHAVIOR]
Current Behavior: [CURRENT_BEHAVIOR]

Architecture Context:
- This is a [LAYER] component in our Clean Architecture
- It interacts with: [COMPONENT_1], [COMPONENT_2]
- It must maintain these invariants: [INVARIANT_1], [INVARIANT_2]

Please:
1. Identify the root cause
2. Propose a fix that maintains our architectural boundaries
3. Explain your reasoning
4. Suggest tests that would have caught this bug
```

## Architecture Validation

```
Please validate this implementation against our Clean Architecture principles:

[CODE_TO_VALIDATE]

Validation Criteria:
1. Domain layer has no external dependencies
2. Use cases orchestrate domain objects
3. Interfaces are properly segregated
4. Dependencies flow inward, not outward
5. Infrastructure implementation details are hidden behind interfaces
6. Cross-cutting concerns don't violate boundaries
7. Error handling follows our patterns

For each violation, please suggest concrete improvements.
```

---

## Tips for Effective Use

1. **Provide Context**: Always include architectural context
2. **Include Examples**: Reference existing code when possible
3. **Be Specific**: List exact requirements and constraints
4. **Define Boundaries**: Clearly state what should and shouldn't cross boundaries
5. **Ask for Reasoning**: Request explanations of architectural decisions

By following these templates, we ensure consistent use of Claude 3.7 Sonnet across the project while maintaining our Clean Architecture principles in our polyglot codebase.