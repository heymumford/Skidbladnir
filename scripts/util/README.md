# Consolidated Utility Scripts

This directory contains consolidated utility scripts for the Skidbladnir project, organized by function. These scripts are designed to provide a unified interface for common tasks across the codebase.

## Consolidated Tools

- **consolidated-build-tools.sh** - Unified build system for TypeScript, Python, and Go components
- **consolidated-test-tools.sh** - Comprehensive test runner for all test types
- **consolidated-env-tools.sh** - Environment management for development, QA, and production
- **consolidated-version-tools.sh** - Version management and Git tagging
- **xml-tools.sh** - XML validation and processing utilities

## Legacy Scripts

The following scripts are maintained for backward compatibility but will be deprecated in favor of the consolidated tools:

- **build-orchestrator.sh** - Original build system (now merged into consolidated-build-tools.sh)
- **add_headers.sh** - Adds copyright headers to source code files
- **update_license_headers.sh** - Updates license headers

## Unified CLI

These tools are designed to be used through the main CLI script:

```bash
../skidbladnir.sh [command] [subcommand] [options]
```

However, you can also use them directly if needed:

```bash
./consolidated-build-tools.sh build --env=qa
./consolidated-test-tools.sh unit --verbose
./consolidated-env-tools.sh start --env=dev
./consolidated-version-tools.sh update minor
./xml-tools.sh validate path/to/file.xml
```

## Build Tools

The consolidated build tools provide a single source of truth for all build processes:

```bash
./consolidated-build-tools.sh [command] [options]
```

Commands:
- `all` - Build and test all components (default)
- `build` - Build components only
- `test` - Run tests only
- `lint` - Run linting only
- `containers` - Build container images
- `deploy` - Deploy to specified environment
- `clean` - Clean build artifacts

Options:
- `--env=ENV` - Target environment (dev, qa, prod)
- `--components=LIST` - Components to build (typescript, python, go, all)
- `--verbose` - Show verbose output
- `--ci` - Running in CI mode
- `--push-git` - Push version changes to Git
- `--skip-tests` - Skip running tests
- `--skip-lint` - Skip linting
- `--skip-build` - Skip build process
- `--skip-deploy` - Skip deployment
- `--local` - Run build process locally (without containers)

## Test Tools

The consolidated test tools provide a unified interface for running tests:

```bash
./consolidated-test-tools.sh [command] [options]
```

Commands:
- `all` - Run all tests (default)
- `unit` - Run unit tests
- `integration` - Run integration tests
- `domain` - Run domain-specific tests
- `api` - Run API tests
- `go` - Run Go tests
- `python` - Run Python tests
- `typescript` - Run TypeScript tests
- `coverage` - Run test coverage analysis
- `report` - Generate test reports

Options:
- `--env=ENV` - Set environment (dev, qa, prod)
- `--verbose` - Enable verbose output
- `--no-cleanup` - Don't clean up containers after tests
- `--visualize` - Generate visualization for coverage reports
- `--resource-constrained` - Reduce resource usage
- `--skip-integration` - Skip integration tests
- `--skip-llm` - Skip LLM tests
- `--skip-slow` - Skip slow tests

## Environment Tools

The consolidated environment tools manage development environments:

```bash
./consolidated-env-tools.sh [command] [options]
```

Commands:
- `setup` - Configure environment variables
- `start` - Start containers
- `stop` - Stop containers
- `restart` - Restart containers
- `status` - Show container status (default)
- `logs [service]` - Show container logs
- `build` - Build development containers
- `registry` - Start local registry
- `clean` - Clean up containers and volumes

Options:
- `--env=ENV` - Environment (dev, qa, prod)
- `--timeout=SECONDS` - Timeout in seconds [default: 300]

## Contributing

When adding new functionality:

1. Extend the relevant consolidated tool rather than creating a new script
2. Follow the existing command and option patterns
3. Update this README with new commands and options
4. Make sure to add appropriate error handling and --help documentation