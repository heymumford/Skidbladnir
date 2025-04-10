# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Build: `npm run build` or `task build`
- Lint: `npm run lint` or `task lint`
- Type check: `npm run typecheck`
- Run all tests: `npm test` or `task test`
- Run unit tests: `npm run test:unit`
- Run integration tests: `npm run test:integration`
- Run specific test: `npm test -- -t "test name pattern"`
- Run Python tests: `npm run test:py` or `npm run test:py:unit`
- Run Go tests: `npm run test:go` or `cd cmd/binary-processor && go test ./...`
- Run API tests: `npm run test:api`
- Run TDD metrics: `npm run tdd-metrics:all`

## Code Style Guidelines
- TypeScript: Use strict typing, follow ESLint rules
- Python: Follow PEP 8, use type hints, docstrings for classes and methods
- Go: Follow standard Go conventions with gofmt
- Follow Clean Architecture principles and TDD approach
- Naming: PascalCase for classes/interfaces, camelCase for variables/functions
- Error handling: Return errors in Go; use domain-specific error types in TypeScript
- Imports: Group by external, internal, relative
- File organization: One class/interface per file
- Tests: Follow Arrange-Act-Assert pattern with descriptive names
- Documentation: Include JSDoc, typedoc in TypeScript; docstrings in Python
- Logging: Use consistent logger from respective language

Always validate code with `npm run lint && npm run typecheck` before committing changes.