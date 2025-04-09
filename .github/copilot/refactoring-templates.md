# GitHub Copilot Refactoring Templates

This document provides structured templates for using GitHub Copilot's Agent Mode to perform refactoring tasks in the Skidbladnir project. These templates are designed to be used with Copilot Chat or as inputs to Copilot Agents.

## Table of Contents
- [Clean Architecture Alignment](#clean-architecture-alignment)
- [Extract Method](#extract-method)
- [Extract Class](#extract-class)
- [Rename for Clarity](#rename-for-clarity)
- [Simplify Conditionals](#simplify-conditionals)
- [Polyglot Consistency](#polyglot-consistency)
- [Batch Refactoring](#batch-refactoring)
- [Test-First Refactoring](#test-first-refactoring)

## Clean Architecture Alignment

```
/refactor cleanArchitecture

Analyze the following code and refactor it to better adhere to Clean Architecture principles:

```[code to refactor]```

Focus on:
1. Ensuring proper dependency direction (domain → use cases → interfaces → infrastructure)
2. Extracting interfaces for implementations where needed
3. Moving domain logic to the domain layer
4. Replacing direct infrastructure dependencies with abstractions
5. Applying dependency injection instead of direct instantiation

Keep all existing functionality intact and ensure tests continue to pass.
```

## Extract Method

```
/refactor extractMethod

Analyze the following method and extract cohesive code blocks into separate methods:

```[method to refactor]```

Guidelines:
1. Identify code blocks that perform a single logical operation
2. Create meaningful method names that describe what they do, not how
3. Pass only necessary parameters to extracted methods
4. Return only required values from extracted methods
5. Update documentation for both original and new methods
6. Maintain the original method's functionality and signature

Suggested extractions:
- [suggestion 1] - Lines x-y
- [suggestion 2] - Lines z-w
```

## Extract Class

```
/refactor extractClass

Analyze the following class and extract related functionality into one or more new classes:

```[class to refactor]```

Guidelines:
1. Identify groups of related fields and methods
2. Create appropriately named new classes for each group
3. Move the identified fields and methods to the new classes
4. Establish appropriate relationships between the original and new classes
5. Update all references to maintain functionality
6. Ensure encapsulation and access control is appropriate
7. Add proper documentation to new classes

Suggested extractions:
- [suggestion 1] - Fields/methods related to [functionality]
- [suggestion 2] - Fields/methods related to [functionality]
```

## Rename for Clarity

```
/refactor rename

Analyze the following code and suggest improved names for variables, methods, and/or classes:

```[code to rename]```

Guidelines:
1. Identify names that don't clearly convey purpose or intent
2. Suggest more descriptive names that reflect role and responsibility
3. Maintain language-specific naming conventions
4. Ensure consistent naming patterns with related code
5. Update all references and documentation

Potential renamings:
- [current name 1] → [suggested name 1]: [reasoning]
- [current name 2] → [suggested name 2]: [reasoning]
```

## Simplify Conditionals

```
/refactor simplifyConditionals

Analyze and refactor the following complex conditional logic:

```[conditional code to refactor]```

Guidelines:
1. Extract complex conditions to descriptively named methods
2. Replace nested conditionals with guard clauses where appropriate
3. Consolidate duplicate condition branches
4. Consider replacing type-checking conditionals with polymorphism
5. Look for opportunities to use the strategy pattern
6. Consider using early returns to reduce nesting
7. Maintain original behavior and edge case handling

Maintain full test coverage to ensure the refactored code's correctness.
```

## Polyglot Consistency

```
/refactor polyglotConsistency

Analyze the following equivalent implementations across languages and refactor for consistency:

TypeScript implementation:
```[TypeScript code]```

Python implementation:
```[Python code]```

Go implementation:
```[Go code]```

Guidelines:
1. Ensure consistent handling of errors, logging, and validation
2. Align naming while respecting each language's conventions
3. Maintain similar structure and responsibility boundaries
4. Leverage appropriate language-specific idioms and patterns
5. Add consistent documentation across implementations

Focus on making these implementations functionally equivalent and stylistically harmonious while respecting each language's best practices.
```

## Batch Refactoring

```
/refactor batch

Analyze the following files for refactoring opportunities and create a refactoring plan:

File 1: [file path 1]
```[file content 1]```

File 2: [file path 2]
```[file content 2]```

File 3: [file path 3]
```[file content 3]```

Guidelines:
1. Identify related changes across these files
2. Group refactorings by type (naming, structure, architecture, etc.)
3. Suggest an ordered sequence of refactorings
4. Identify dependencies between refactorings
5. For each step, outline specific changes and reasoning
6. Prioritize maintainability, readability, and alignment with project architecture

Create a refactoring plan with clear steps, rationale, and expected outcomes.
```

## Test-First Refactoring

```
/refactor testFirst

I want to refactor the following code, but first I need tests to ensure behavior remains unchanged:

```[code to refactor]```

Guidelines:
1. Analyze the code to identify key behaviors and edge cases
2. Create comprehensive tests that verify these behaviors
3. Include tests for edge cases and error conditions
4. Follow the project's testing patterns and frameworks
5. Once tests are in place, suggest refactoring approaches

Generate tests first, then we'll proceed with refactoring once behavior is verified.
```

## Agent Mode Usage Tips

1. **Prepare Context**: Before starting a refactoring task, gather all relevant files and context.

2. **Break Down Large Refactorings**: 
   - Split large refactorings into smaller, manageable pieces
   - Refactor one component or concept at a time
   - Commit after each successful refactoring step

3. **Verify After Each Step**:
   - Run tests after each refactoring operation
   - Review changes before committing
   - Ensure documentation is updated to match changes

4. **Branch Strategy**:
   - Create a dedicated branch for significant refactorings
   - Consider feature flags for major structural changes
   - Use descriptive branch names like `refactor/clean-architecture-provider-layer`

5. **Communication**:
   - Document refactoring decisions in pull request descriptions
   - Explain motivations and expected benefits
   - Reference architectural principles or patterns applied

6. **Customizing Templates**:
   - Adapt these templates to your specific needs
   - Add project-specific guidelines or constraints
   - Reference existing code patterns to maintain consistency