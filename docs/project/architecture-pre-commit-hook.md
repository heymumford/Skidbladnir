# Polyglot Architecture Validation Pre-Commit Hook

This document explains how the pre-commit hook works to validate polyglot architecture compliance in the Skidbladnir project.

## Overview

The pre-commit hook automatically runs before each commit to ensure that any changes comply with the Clean Architecture principles established for this project. This validation works across all three languages used in the project:

- TypeScript
- Python
- Go

## What It Validates

The pre-commit hook performs two primary validations:

1. **Clean Architecture Boundaries**: Ensures dependencies only flow in the correct direction (from outer to inner layers, never the reverse).
2. **Circular Dependencies**: Detects and prevents circular dependencies between modules.

### Architecture Layers

The project follows the Clean Architecture pattern with the following layers (from innermost to outermost):

1. **Domain** (`/pkg/domain/`): Contains core business logic and entities.
2. **Use Cases** (`/pkg/usecases/`): Contains application-specific business rules.
3. **Interfaces** (`/pkg/interfaces/`): Contains adapters for external APIs and frameworks.
4. **Infrastructure** (`/internal/typescript/`, `/internal/python/`, `/internal/go/`, `/cmd/`): Contains frameworks, tools, and other external concerns.

Dependencies should only flow inward. For example, code in the Infrastructure layer can depend on Interfaces, Use Cases, and Domain, but code in the Domain layer should not depend on any other layer.

## Installation

To install the pre-commit hook:

```bash
# Make the install script executable
chmod +x scripts/git-hooks/install.sh

# Run the installer
./scripts/git-hooks/install.sh
```

The installer will:
1. Set up the pre-commit hook
2. Use husky if it's installed in your project, or fall back to symlinks

## How It Works

When you run `git commit`, the pre-commit hook:

1. Temporarily stashes unstaged changes
2. Checks all staged files with `.ts`, `.js`, `.py`, and `.go` extensions
3. Runs the polyglot architecture validator
4. Checks for circular dependencies
5. Restores unstaged changes
6. Allows the commit if all checks pass, or blocks it if any fail

## Bypassing the Hook

It's generally not recommended to bypass the validation, but if necessary (for example, to temporarily commit work-in-progress code), you can use:

```bash
git commit --no-verify
```

## Troubleshooting

If you encounter issues with the pre-commit hook:

1. Ensure ts-node is installed globally or in your project (for TypeScript execution)
2. Check if the validator script exists at `tests/unit/architecture/cli/check-architecture.ts`
3. Make sure the hook has execution permissions (`chmod +x .git/hooks/pre-commit`)

## Adding Your Own Rules

The architecture validation is extensible. To add custom rules:

1. Modify the `ArchitectureValidator` or `PolyglotArchitectureValidator` classes in the `tests/unit/architecture` directory
2. Add appropriate tests
3. Update this documentation to reflect your changes

## For CI/CD Integration

You can also run the architecture validation as part of your CI/CD pipeline:

```bash
# In CI script
ts-node tests/unit/architecture/cli/check-architecture.ts --polyglot --circular
```