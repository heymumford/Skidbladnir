# Skidbladnir Scripts

This directory contains scripts for building, testing, and managing the Skidbladnir project.

## Unified CLI

The main entry point for all scripts is the unified CLI:

```bash
./scripts/skidbladnir.sh [command] [subcommand] [options]
```

This CLI provides a consistent interface for all operations.

## Commands

- **build** - Build and package components
  - Example: `./scripts/skidbladnir.sh build --env=qa`
  
- **test** - Run tests (unit, integration, etc.)
  - Example: `./scripts/skidbladnir.sh test unit --verbose`
  
- **env** - Manage environments (dev, qa, prod)
  - Example: `./scripts/skidbladnir.sh env start --env=dev`
  
- **version** - Manage version information
  - Example: `./scripts/skidbladnir.sh version update patch`
  
- **xml** - XML validation and cleanup tools
  - Example: `./scripts/skidbladnir.sh xml validate path/to/file.xml`

## Consolidated Tools

The implementation is organized into consolidated tool scripts in the `util/` directory:

- `consolidated-build-tools.sh` - For building and packaging
- `consolidated-test-tools.sh` - For running tests
- `consolidated-env-tools.sh` - For environment management
- `consolidated-version-tools.sh` - For version management
- `xml-tools.sh` - For XML processing

Each of these scripts can be run directly, but it's recommended to use the unified CLI.

## Directory Structure

- **util/**: Consolidated utility scripts and tools
  - Contains all the consolidated tool implementations
  
- **git-hooks/**: Git hooks for automated quality checks
  - Pre-commit and pre-push hooks
  
- **github-migration/**: Scripts for GitHub migration
  - Tools for migrating to GitHub and setting up Actions

- **security/**: Security-related scripts
  - Scripts for security scanning and reports

## Provider API Testing Scripts

The following scripts are available for testing provider API connectivity:

- **test-zephyr-connectivity.js** - Tests connectivity to Zephyr Scale API
- **test-qtest-parameters-connectivity.js** - Tests qTest Parameters API
- **test-qtest-scenario-connectivity.js** - Tests qTest Scenario API
- **test-qtest-data-export-connectivity.js** - Tests qTest Data Export API

### Usage Examples

```bash
# Zephyr Scale API test
npm run test:zephyr -- --token YOUR_API_TOKEN --project-key YOUR_PROJECT_KEY

# qTest Parameters API test
npm run test:qtest:parameters -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# qTest Scenario API test
npm run test:qtest:scenario -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# qTest Data Export API test
npm run test:qtest:data-export -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN
```

## Adding New Scripts

When adding new scripts:

1. Create your implementation in `util/` directory
2. Make it executable with `chmod +x`
3. Add a command handler in `skidbladnir.sh` if needed

## Script Standards

- All scripts should:
  - Include copyright and license header
  - Handle errors gracefully
  - Provide clear usage information with `--help`
  - Use consistent logging patterns
  - Follow bash best practices

## Examples

```bash
# Build the project for production
./scripts/skidbladnir.sh build --env=prod

# Run all tests with verbose output
./scripts/skidbladnir.sh test all --verbose

# Start the development environment
./scripts/skidbladnir.sh env start --env=dev

# Update version
./scripts/skidbladnir.sh version update minor

# Validate an XML file
./scripts/skidbladnir.sh xml validate tests/api-integration/pom.xml
```

Check the individual scripts for more detailed usage instructions.