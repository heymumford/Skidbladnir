# GitHub Copilot Prompt Templates

This document provides templates for effective prompts when working with GitHub Copilot in the Skidbladnir project.

## Table of Contents
- [Interface Implementation](#interface-implementation)
- [Cross-Language Implementation](#cross-language-implementation)
- [Test Generation](#test-generation)
- [Rate Limiter Implementation](#rate-limiter-implementation)
- [Error Handling](#error-handling)
- [Provider Integration](#provider-integration)
- [Documentation Generation](#documentation-generation)

## Interface Implementation

```
/**
 * Implement the following interface in [LANGUAGE] following Clean Architecture principles:
 * 
 * Interface: [INTERFACE_NAME]
 * Purpose: [PURPOSE]
 * Layer: [LAYER]
 * 
 * Requirements:
 * - [REQUIREMENT_1]
 * - [REQUIREMENT_2]
 * 
 * Example usage:
 * [EXAMPLE_USAGE]
 */
```

## Cross-Language Implementation

```
/**
 * Implement the equivalent of this [SOURCE_LANGUAGE] code in [TARGET_LANGUAGE]:
 * 
 * [SOURCE_CODE]
 * 
 * Follow these guidelines:
 * - Maintain Clean Architecture boundaries
 * - Use idiomatic [TARGET_LANGUAGE] patterns
 * - Keep the same business logic
 * - Follow project naming conventions
 */
```

## Test Generation

```
/**
 * Generate tests for the following [LANGUAGE] code:
 * 
 * [CODE_TO_TEST]
 * 
 * Test requirements:
 * - Test framework: [FRAMEWORK]
 * - Test edge cases for: [EDGE_CASES]
 * - Mock dependencies: [DEPENDENCIES]
 * - Include setup and teardown
 * - Follow AAA pattern (Arrange, Act, Assert)
 */
```

## Rate Limiter Implementation

```
/**
 * Implement a rate limiter for [PROVIDER_NAME] provider in [LANGUAGE].
 * 
 * Requirements:
 * - Max requests: [MAX_REQUESTS_PER_MINUTE]
 * - Initial delay: [INITIAL_DELAY_MS]
 * - Backoff factor: [BACKOFF_FACTOR]
 * - Custom headers: [CUSTOM_HEADERS]
 * - Respect Clean Architecture boundaries
 * - Include comprehensive logging
 * - Handle rate limit responses properly
 */
```

## Error Handling

```
/**
 * Implement error handling for the following code in [LANGUAGE]:
 * 
 * [CODE_TO_ENHANCE]
 * 
 * Requirements:
 * - Follow project error handling patterns
 * - Use domain-specific error types
 * - Include appropriate logging
 * - Ensure proper cleanup in error cases
 * - Maintain Clean Architecture boundaries
 */
```

## Provider Integration

```
/**
 * Create a provider adapter for [PROVIDER_NAME] in [LANGUAGE].
 * 
 * API Documentation: [LINK_TO_DOCS]
 * 
 * Requirements:
 * - Implement our standard ProviderAdapter interface
 * - Handle authentication via [AUTH_METHOD]
 * - Include rate limiting based on provider constraints
 * - Map between our canonical model and provider schema
 * - Include comprehensive error handling
 * - Add appropriate logging
 */
```

## Documentation Generation

```
/**
 * Generate documentation for the following [LANGUAGE] code:
 * 
 * [CODE_TO_DOCUMENT]
 * 
 * Requirements:
 * - Include purpose and responsibilities
 * - Document public API
 * - Explain architectural context
 * - Provide usage examples
 * - Note any edge cases or limitations
 * - Follow markdown format
 */
```

---

## Tips for Effective Prompts

1. **Be specific about language and framework**
   - Explicitly mention TypeScript, Python, or Go
   - Specify relevant frameworks (Jest, Pytest, Go testing)

2. **Provide architectural context**
   - Mention layer (domain, usecases, interfaces, infrastructure)
   - Reference Clean Architecture boundaries

3. **Include examples**
   - Show similar implementations when available
   - Provide usage examples

4. **Specify constraints**
   - Note performance requirements
   - Mention error handling expectations
   - Specify logging requirements

5. **Reference project patterns**
   - Mention existing patterns to follow
   - Reference specific files as examples