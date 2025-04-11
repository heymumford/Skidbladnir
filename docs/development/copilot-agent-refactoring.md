# GitHub Copilot Agent Mode for Refactoring

This guide explains how to use GitHub Copilot's Agent Mode for automated refactoring tasks in the Skidbladnir project.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Using Refactoring Templates](#using-refactoring-templates)
- [Refactoring Workflows](#refactoring-workflows)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

GitHub Copilot Agent Mode allows for executing complex, multi-step refactoring tasks through natural language commands. By leveraging our templates and configurations, you can automate many common refactoring operations while maintaining consistency with our architectural principles.

### Refactoring Operations Supported

- **Clean Architecture Alignment**: Restructure code to better align with Clean Architecture
- **Extract Method/Class**: Decompose large methods and classes into smaller, more focused units
- **Rename for Clarity**: Improve naming for better code understandability
- **Simplify Conditionals**: Refactor complex conditional logic
- **Polyglot Consistency**: Ensure consistent implementations across TypeScript, Python, and Go
- **Batch Refactoring**: Coordinate related changes across multiple files

## Setup

### Prerequisites

1. GitHub Copilot Chat extension installed in your IDE (VS Code, JetBrains, etc.)
2. Access to GitHub Copilot (subscription or organization access)

### Configuration

Our project includes predefined configurations and templates for Copilot Agent Mode:

- `.github/copilot/refactoring-config.json`: Defines refactoring patterns and operations
- `.github/copilot/refactoring-templates.md`: Provides structured prompts for common refactoring tasks
- `.github/copilot/refactoring-scripts.js`: Contains helper scripts for automated refactoring

## Using Refactoring Templates

Copilot Agent Mode works through structured prompts. Use our templates from `.github/copilot/refactoring-templates.md` as starting points for your refactoring tasks.

### Example: Clean Architecture Refactoring

1. Open Copilot Chat in your IDE
2. Copy the Clean Architecture template from `refactoring-templates.md`
3. Paste it into Copilot Chat, replacing `[code to refactor]` with your code or file path
4. Send the message and follow Copilot's guidance

```
/refactor cleanArchitecture

Analyze the following code and refactor it to better adhere to Clean Architecture principles:

```[your code here]```

Focus on:
1. Ensuring proper dependency direction
2. Extracting interfaces for implementations
3. Moving domain logic to domain layer
4. Replacing infrastructure dependencies with abstractions
5. Applying dependency injection
```

## Refactoring Workflows

### Workflow 1: Single File Refactoring

1. Open the file you want to refactor
2. Launch Copilot Chat
3. Use a template from `refactoring-templates.md`
4. Review Copilot's suggestions and apply them
5. Run tests to verify behavior is preserved
6. Commit the changes with a descriptive message

### Workflow 2: Multi-File Batch Refactoring

1. Identify related files that need consistent changes
2. Use the Batch Refactoring template
3. List the files and desired refactoring goal
4. Follow Copilot's step-by-step refactoring plan
5. Verify each step with tests before proceeding
6. Create a single focused commit or a series of logical commits

### Workflow 3: Test-First Refactoring

1. Identify code with insufficient test coverage
2. Use the Test-First Refactoring template
3. Ask Copilot to generate tests covering existing behavior
4. Add and verify the tests first
5. Once tests pass, proceed with refactoring
6. Verify refactored code with the new tests

## Advanced Usage

### Custom Refactoring Scripts

Use our JavaScript refactoring scripts for more complex operations:

```
/refactor extractInterface

Please use the extractInterface function from refactoring-scripts.js to 
create an interface for this class:

```[class code]```
```

### Combining Multiple Refactorings

For complex refactorings, break them down into steps:

```
I need to refactor this service class to:
1. Extract an interface
2. Apply dependency injection
3. Move domain logic to separate methods

Let's take it step by step, starting with extracting an interface.
```

### Language-Specific Considerations

- **TypeScript**: Focus on interface extraction and dependency injection
- **Python**: Use abstract base classes and dependency injection
- **Go**: Focus on interface definition and implementation

## Best Practices

1. **Always work in a dedicated branch** for significant refactorings
2. **Run tests after each refactoring step** to ensure behavior is preserved
3. **Commit frequently** with descriptive messages explaining the refactoring rationale
4. **Review changes carefully** before committing
5. **Update documentation** to reflect architectural improvements
6. **Coordinate with team members** when refactoring shared components

## Troubleshooting

### Common Issues

**Problem**: Copilot generates refactored code with syntax errors  
**Solution**: Break the refactoring into smaller steps and provide more context

**Problem**: Tests fail after refactoring  
**Solution**: Use the test-first approach and ensure all edge cases are covered

**Problem**: Copilot doesn't understand project architecture  
**Solution**: Reference specific files and patterns from our codebase in your prompts

### Getting Help

If you encounter issues with Copilot Agent Mode refactoring:

1. Review the templates and examples in `.github/copilot/`
2. Consult the [GitHub Copilot documentation](https://docs.github.com/en/copilot)
3. Reach out to the team's Copilot champions listed in CODEOWNERS