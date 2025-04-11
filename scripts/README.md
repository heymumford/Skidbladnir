# Skidbladnir Scripts

This directory contains scripts for building, testing, managing, and operating the Skidbladnir project.

## Unified CLI

The main entry point for all scripts is the enhanced unified CLI:

```bash
./scripts/skidbladnir.sh [command] [subcommand] [options]
```

This CLI provides a consistent interface for all operations, with improved logging, error handling, and a more comprehensive command set.

## Core Commands

- **build** - Build and package components
  - Example: `./scripts/skidbladnir.sh build ts` (Build TypeScript components)
  - Example: `./scripts/skidbladnir.sh build py` (Build Python components)
  - Example: `./scripts/skidbladnir.sh build go` (Build Go components)
  - Example: `./scripts/skidbladnir.sh build all --env=qa` (Build all components for QA)
  
- **test** - Run tests (unit, integration, etc.)
  - Example: `./scripts/skidbladnir.sh test unit` (Run unit tests)
  - Example: `./scripts/skidbladnir.sh test integration` (Run integration tests)
  - Example: `./scripts/skidbladnir.sh test all --verbose` (Run all tests with verbose output)
  
- **env** - Manage environments (dev, qa, prod)
  - Example: `./scripts/skidbladnir.sh env start dev` (Start development environment)
  - Example: `./scripts/skidbladnir.sh env stop` (Stop current environment)
  - Example: `./scripts/skidbladnir.sh env status` (Check environment status)
  
- **version** - Manage version information
  - Example: `./scripts/skidbladnir.sh version update patch` (Increment patch version)
  - Example: `./scripts/skidbladnir.sh version update minor` (Increment minor version)
  - Example: `./scripts/skidbladnir.sh version` (Show current version)
  
- **xml** - XML validation and cleanup tools
  - Example: `./scripts/skidbladnir.sh xml validate path/to/file.xml` (Validate XML)
  - Example: `./scripts/skidbladnir.sh xml cleanup path/to/file.xml` (Cleanup XML)

## Extended Commands

- **docs** - Documentation generation tools
  - Example: `./scripts/skidbladnir.sh docs generate` (Generate all documentation)
  - Example: `./scripts/skidbladnir.sh docs generate api` (Generate API documentation)
  - Example: `./scripts/skidbladnir.sh docs serve` (Serve documentation locally)

- **run** - Run specific components
  - Example: `./scripts/skidbladnir.sh run api` (Run API server)
  - Example: `./scripts/skidbladnir.sh run orchestrator` (Run orchestrator)
  - Example: `./scripts/skidbladnir.sh run binary` (Run binary processor)
  - Example: `./scripts/skidbladnir.sh run all` (Run all components)

- **migration** - Migration workflow tools
  - Example: `./scripts/skidbladnir.sh migration zephyr-to-qtest --source-token TOKEN --target-token TOKEN` (Run migration)
  - Example: `./scripts/skidbladnir.sh migration verify --migration-id ID` (Verify migration)

- **llm** - LLM model tools and utilities
  - Example: `./scripts/skidbladnir.sh llm configure` (Configure LLM models)
  - Example: `./scripts/skidbladnir.sh llm prepare` (Prepare LLM models)

## Consolidated Tool Architecture

The CLI implements a layered architecture:

1. **User Interface Layer** - `skidbladnir.sh` provides the command-line interface
2. **Command Handlers** - Functions for each command category
3. **Tool Implementation** - Consolidated tool scripts in the `util/` directory
4. **Specific Tool Scripts** - Individual scripts for specific operations

All scripts include:
- Standardized logging with timestamps and levels
- Consistent error handling
- Help documentation
- Copyright and license information

## Directory Structure

```
scripts/
├── README.md                # This documentation
├── skidbladnir.sh           # Unified CLI entry point
├── build.sh                 # Legacy script (use skidbladnir.sh build)
├── test.sh                  # Legacy script (use skidbladnir.sh test)
├── env-tools.sh             # Legacy script (use skidbladnir.sh env)
├── version-tools.sh         # Legacy script (use skidbladnir.sh version)
├── xml-validator.sh         # Legacy script (use skidbladnir.sh xml)
├── build-containers.sh      # Container build script
├── configure-llm-containers.sh  # LLM container configuration
├── prepare-llm-models.sh    # LLM model preparation
├── util/
│   ├── consolidated-build-tools.sh    # Build implementation
│   ├── consolidated-test-tools.sh     # Test implementation
│   ├── consolidated-env-tools.sh      # Environment implementation
│   ├── consolidated-version-tools.sh  # Version implementation
│   └── xml-tools.sh                   # XML tools implementation
├── git-hooks/               # Git hooks for quality checks
│   ├── pre-commit           # Pre-commit hook
│   └── pre-push             # Pre-push hook
├── github-migration/        # GitHub migration tools
└── security/                # Security scanning tools
```

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

## Enhanced Logging

The unified CLI now includes enhanced logging with:

- Color-coded output for different message types
- Timestamp-based log files in the `logs/` directory
- Consistent log format across all commands
- Proper error handling and reporting

Example log output:
```
[INFO] Starting Skidbladnir CLI with command: build ts
[INFO] Executing build command: ts
[INFO] Building TypeScript components...
[INFO] TypeScript build completed successfully
[INFO] Build completed successfully
[INFO] Skidbladnir CLI execution completed successfully
```

## Adding New Scripts

When adding new scripts:

1. Create your implementation in the appropriate directory:
   - General utilities go in `util/`
   - Command-specific scripts go in their own directory

2. Make it executable with `chmod +x`

3. Add a command handler in `skidbladnir.sh`:
   ```bash
   # Function to handle your new command
   handle_new_command() {
     log "INFO" "Executing new command: $*"
     # Implementation here
     log "INFO" "New command completed successfully"
   }
   
   # Add to case statement
   case "${COMMAND}" in
     # ...
     "new-command" | "nc")
       handle_new_command "$@"
       ;;
     # ...
   esac
   ```

4. Update this README with documentation for your new command

## Script Standards

All scripts follow these standards:

- **Header**: Include copyright and license header
- **Documentation**: Provide clear usage information with `--help`
- **Error Handling**: Properly catch and report errors
- **Logging**: Use the standard logging functions
- **Exit Codes**: Return appropriate exit codes
- **Idempotency**: Scripts should be idempotent where appropriate
- **Parameter Validation**: Validate all input parameters
- **Help Text**: Include detailed help text

## Usage Examples

```bash
# Build the project for production
./scripts/skidbladnir.sh build all --env=prod

# Run unit tests with coverage
./scripts/skidbladnir.sh test unit --coverage

# Start the development environment with specific components
./scripts/skidbladnir.sh env start dev --components=api,orchestrator

# Update version and tag
./scripts/skidbladnir.sh version update minor --tag --message="New feature release"

# Validate and clean up an XML file
./scripts/skidbladnir.sh xml validate tests/api-integration/pom.xml --fix

# Generate API documentation
./scripts/skidbladnir.sh docs generate api

# Run Zephyr to qTest migration demo
./scripts/skidbladnir.sh migration zephyr-to-qtest --source-token TOKEN --target-token TOKEN --project-key KEY --project-id ID

# Configure LLM models
./scripts/skidbladnir.sh llm configure --model=default --memory=4G
```

For more detailed information on any command, use the `--help` option:

```bash
./scripts/skidbladnir.sh <command> --help
```