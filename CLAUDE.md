# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Build: `npm run build` or `task build`
- Lint: `npm run lint` or `task lint`
- Type check: `npm run typecheck`
- Run all tests: `npm test` or `task test`
- Run single test: `npm test -- -t "test name pattern"`
- Run unit tests: `npm run test:unit`
- Run integration tests: `npm run test:integration`

## Code Style Guidelines
- TypeScript: Use strict typing, follow ESLint rules
- Python: Follow PEP 8, use type hints
- Go: Follow standard Go conventions with gofmt
- Follow Clean Architecture principles and TDD approach
- Naming: PascalCase for classes/interfaces, camelCase for variables/functions
- Error handling: Return errors, don't throw exceptions in Go; use domain errors in TS
- Imports: Group by type (external, internal, relative)
- File organization: One class/interface per file
- Tests: Write descriptive test names, follow Arrange-Act-Assert pattern

Always validate code with `npm run lint && npm run typecheck` before committing changes.