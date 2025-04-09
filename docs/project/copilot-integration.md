# AI-Assisted Development Guide

This document outlines how AI-assisted development tools are integrated into the Skidbladnir project to enhance developer productivity, code quality, and consistency across our polyglot architecture. We leverage multiple AI tools with a primary focus on Claude 3.7 Sonnet and GitHub Copilot, each optimized for specific use cases within our development workflow.

## Table of Contents
- [Overview](#overview)
- [AI Tool Selection](#ai-tool-selection)
- [IntelliJ IDEA Ultimate Integration](#intellij-idea-ultimate-integration)
- [Claude 3.7 Sonnet Usage](#claude-37-sonnet-usage)
- [GitHub Copilot Features](#github-copilot-features)
- [Setup and Configuration](#setup-and-configuration)
- [Usage Guidelines](#usage-guidelines)
- [Best Practices](#best-practices)
- [Custom Extensions](#custom-extensions)
- [CI/CD Integration](#cicd-integration)

## Overview

Skidbladnir's polyglot architecture (TypeScript, Python, Go) and Clean Architecture approach make it an ideal candidate for leveraging AI assistance. By integrating multiple AI tools into our development workflow, we aim to:

1. Improve code consistency across languages
2. Accelerate implementation of interfaces and tests
3. Reduce cognitive load when working with multiple languages
4. Enhance code quality through automated reviews
5. Improve collaboration through AI-generated documentation
6. Streamline repetitive implementation tasks

## AI Tool Selection

We use multiple AI tools strategically based on their strengths:

| AI Tool | Primary Use Cases | Key Strengths |
|---------|------------------|---------------|
| **Claude 3.7 Sonnet** | - Cross-language refactoring<br>- Complex architecture understanding<br>- Test generation<br>- Code explanation<br>- Documentation | - Exceptional context understanding<br>- Ability to handle polyglot codebases<br>- Consistency in implementation patterns<br>- Strong understanding of Clean Architecture |
| **GitHub Copilot** | - In-IDE code completion<br>- Automated PR summaries<br>- Code review<br>- Refactoring (Edits feature) | - Deep IDE integration<br>- Real-time suggestions<br>- GitHub workflow integration<br>- Extensive training on public code |
| **Other AIs** | - Specialized tasks as needed | - Specific capabilities that complement our primary tools |

## IntelliJ IDEA Ultimate Integration

As our primary IDE, IntelliJ IDEA Ultimate is configured with both Claude integration and GitHub Copilot:

1. **Required Plugins**:
   - GitHub Copilot
   - Anthropic Claude (for Claude AI integration)
   - AI Assistant (JetBrains built-in)

2. **Configuration**:
   - AI Assistant settings customized for Skidbladnir project
   - Copilot configured for polyglot environment
   - Claude plugin configured with project-specific prompt templates

3. **Key Features**:
   - Code completion with context awareness
   - Natural language code generation
   - Integrated code explanation
   - Test generation
   - Documentation assistance

## Claude 3.7 Sonnet Usage

Claude 3.7 Sonnet excels at understanding complex codebases and generating consistent implementations across languages. We use Claude for:

### Architecture Implementation

Claude is particularly effective for implementing Clean Architecture patterns consistently:

```
I need to implement a [COMPONENT_TYPE] following Clean Architecture principles in [LANGUAGE].
The component should handle:
- [RESPONSIBILITY_1]
- [RESPONSIBILITY_2]

It should respect these boundaries:
- Domain layer should not depend on outer layers
- Use cases should orchestrate domain entities
- Infrastructure should be behind interfaces

Here's an existing similar implementation in [OTHER_LANGUAGE]:
[CODE_EXAMPLE]
```

### Cross-Language Refactoring

Claude excels at translating patterns between languages while maintaining architectural integrity:

```
Please refactor this [SOURCE_LANGUAGE] implementation to [TARGET_LANGUAGE] while maintaining Clean Architecture principles:

[CODE_TO_REFACTOR]

Specific requirements:
1. Keep the same domain logic
2. Adapt to idiomatic [TARGET_LANGUAGE] patterns 
3. Maintain interface contracts
4. Apply proper error handling for [TARGET_LANGUAGE]
```

### Test Generation

Claude can generate comprehensive test suites with proper edge cases:

```
Generate a comprehensive test suite for this [LANGUAGE] implementation:

[CODE_TO_TEST]

The tests should:
- Use [TEST_FRAMEWORK]
- Test happy paths and error paths
- Include edge cases for: [LIST_EDGE_CASES]
- Mock external dependencies
- Follow AAA pattern (Arrange, Act, Assert)
```

### Documentation Generation

Claude can create detailed documentation that explains architectural decisions:

```
Create documentation for this component that explains:
1. Its role in our Clean Architecture
2. Interface contracts
3. Dependencies and boundary enforcement
4. Usage examples
5. Implementation decisions

[CODE_TO_DOCUMENT]
```

## GitHub Copilot Features

### Code Completion

Copilot's code completion is configured to support our three primary languages. Specific settings have been applied to:

- Enforce Clean Architecture patterns
- Maintain consistent error handling approaches
- Generate implementations that match our interface contracts
- Suggest domain-driven design patterns

### Copilot Chat

Copilot Chat provides contextual assistance for developers working across language boundaries. We've configured it to assist with:

- Understanding architectural boundaries
- Explaining cross-component interfaces
- Providing guidance on test implementation
- Offering migration suggestions between providers

### Code Review

Copilot Code Review is configured to focus on:

- Interface consistency across languages
- Proper implementation of Clean Architecture patterns
- Rate limiter implementation consistency
- Error handling patterns
- Security considerations in API connections

### Pull Request Summaries

PR summaries help reviewers understand cross-language changes and their impacts, focused on:

- Changes to interface contracts
- Cross-component dependencies
- API modifications
- Test coverage implications

### Copilot Edits (Agent Mode)

Agent mode is particularly useful for repetitive tasks in our polyglot environment, including:

- Implementing new provider adapters
- Creating consistent test scenarios
- Refactoring interfaces across languages
- Generating boilerplate CRUD operations

### Custom Extensions

We're developing custom extensions for:

- Provider-specific code generation
- Test data factory creation
- Schema mapping between systems
- Documentation generation

## Setup and Configuration

### Installing Required Extensions

For IntelliJ IDEA Ultimate (Primary IDE):
1. Open IntelliJ IDEA Ultimate
2. Go to Settings → Plugins → Marketplace
3. Install the following plugins:
   - GitHub Copilot
   - Anthropic Claude
   - AI Assistant (JetBrains built-in)

For JetBrains Fleet:
- Enable GitHub Copilot integration
- Configure Claude API access

For VS Code (Secondary):
```
ext install github.copilot
ext install github.copilot-chat
ext install anthropic.claude-vscode
```

### Project-Specific Configuration

The `.github/copilot` directory contains configuration files for:

- Code review focus areas
- PR summary templates
- Language-specific suggestions
- Custom prompt templates

For Claude, we use the `.github/claude` directory with:
- Prompt templates organized by use case
- Language-specific examples
- Architecture reference diagrams
- Domain model documentation

### IDE Configuration

For IntelliJ IDEA Ultimate, configure through Settings:

1. Under **Tools → GitHub Copilot**:
   - Enable for all languages
   - Configure completion sensitivity
   - Enable inline suggestions

2. Under **Tools → AI Assistant**:
   - Configure to use project-specific prompt templates
   - Set context inclusion to include imports and related files

3. Under **Anthropic Claude Plugin**:
   - Configure API key
   - Set default system prompt to include Clean Architecture context

Additionally, the `.ijidea` directory contains shareable settings that can be imported by team members.

## Usage Guidelines

### AI Tool Selection Strategy

Choose the appropriate AI tool based on the task:

| Task | Recommended AI | Reasoning |
|------|---------------|-----------|
| Quick code completion | GitHub Copilot | Real-time inline suggestions |
| Complex refactoring | Claude 3.7 | Better architectural understanding |
| New feature implementation | Claude 3.7 | Better at following design patterns |
| Bug fixing | Either | Depends on complexity |
| Documentation | Claude 3.7 | More coherent explanations |
| Test generation | Claude 3.7 | More comprehensive tests |
| Quick code review | GitHub Copilot | Integrated into GitHub |
| In-depth code review | Claude 3.7 | Better architectural analysis |

### Effective Prompts

When using any AI assistant, structure your queries to include:

1. The specific language (TS, Python, Go)
2. The architectural layer (domain, usecases, interface, infrastructure)
3. The specific task or pattern you're implementing
4. Relevant existing examples from our codebase

Example for Claude: "I need to implement the RateLimiter interface in Go following our Clean Architecture pattern for the infrastructure layer. Here's our TypeScript implementation for reference: [CODE]"

Example for Copilot Chat: "How would I implement the RateLimiter interface in Go following our Clean Architecture pattern for the infrastructure layer?"

### Code Generation

When generating code:

1. Start with a comprehensive comment describing the component
2. Include interface requirements in the comments
3. Reference similar implementations in other languages

### Review Process

For Copilot-assisted code reviews:

1. Run automated Copilot review before human review
2. Address all AI suggestions or document reasons for declining
3. Use Copilot to generate test cases for edge conditions

## Best Practices

### Hybrid AI Approach

For optimal results, consider using Claude and Copilot together:

1. Use Claude 3.7 Sonnet for:
   - Initial architectural design discussions
   - Complex refactoring planning
   - Test strategy development
   - Documentation outlines

2. Use GitHub Copilot for:
   - Implementing the planned designs
   - Quick syntax assistance
   - Filling in implementation details
   - Inline code completions

This hybrid approach leverages Claude's strong reasoning and Copilot's real-time assistance.

### Cross-Language Consistency

- Use Claude to establish patterns that work across languages
- Have Claude review implementation consistency across language boundaries
- Generate consistent logging patterns
- Maintain similar error handling approaches

### Test-Driven Development

- Use Claude to generate comprehensive test cases first
- Ask Claude to suggest edge cases based on domain knowledge
- Use Copilot to implement the code that satisfies the tests
- Have Claude review test coverage and suggest additional tests

### Documentation

- Use Claude to generate initial documentation with architectural context
- Ask Claude to explain complex algorithms with proper context
- Generate examples of API usage across different languages
- Have Claude create documentation that explains cross-component interactions

## Custom Extensions and Integrations

We're developing custom tools and integrations to enhance our AI-assisted workflow:

### GitHub Copilot Extensions

- **Provider Generator**: Creates provider adapters based on API specifications
- **Test Factory Generator**: Creates test data factories for domain entities
- **Schema Mapper**: Maps between different provider schemas

### Claude Integrations

- **Claude Code Analyzer**: Custom tooling that feeds code to Claude with architectural context
- **Test Generator Pipeline**: Custom workflow that uses Claude to generate tests from implementation
- **Documentation Generator**: Tool that uses Claude to generate and maintain documentation
- **Cross-Language Validator**: Tool that uses Claude to verify consistency across language implementations

### IntelliJ IDEA Integrations

- **Custom Live Templates**: Pre-configured templates with AI-specific placeholders
- **Context-Aware Actions**: IntelliJ actions that gather context and send to appropriate AI
- **AI Selection Helper**: Quick-switch between different AI assistants based on task

## CI/CD Integration

Our CI/CD pipeline integrates multiple AI tools:

### GitHub Actions Workflows

GitHub Actions workflows integrate Copilot for:
- Automated code reviews on PRs
- Documentation generation
- Test coverage suggestions
- Security scanning

See the `.github/workflows/copilot.yml` file for implementation details.

### Claude Integration Pipeline

We also leverage Claude for deeper analysis in our CI pipeline:
- Architecture validation against Clean Architecture principles
- Cross-language implementation consistency checks
- Test coverage quality assessment
- Documentation completeness verification

This is implemented in `.github/workflows/claude-analysis.yml`.

### Integrated Reporting

Results from both AI tools are combined into a single report for developers, providing:
- Syntax and style recommendations (Copilot)
- Architectural insights (Claude)
- Implementation consistency checks (Claude)
- Security recommendations (Both)

---

This guide is evolving as we integrate more AI features into our workflow. Please contribute improvements and additional use cases as you discover them. Our strategy of using multiple AI tools, with a focus on Claude 3.7 Sonnet and GitHub Copilot in IntelliJ IDEA Ultimate, gives us the best of all worlds for our polyglot architecture.