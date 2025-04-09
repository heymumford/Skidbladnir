# Utility Scripts

This directory contains utility scripts for the Skidbladnir project:

- **build-orchestrator.sh** - Unified build system that handles versioning, testing, and artifact management
- **add_headers.sh** - Adds copyright headers to source code files
- **update_license_headers.sh** - Comprehensive script for updating license headers

## Build Orchestrator

The build orchestrator provides a single source of truth for all build processes. It's responsible for:

- Incrementing build numbers and managing version information
- Running tests across all language-specific components
- Building TypeScript, Python, and Go components
- Creating container images
- Outputting detailed build summaries with test results
- Managing Git version tagging and releases

### Usage

```bash
# Direct usage
./build-orchestrator.sh [environment] [ci_mode] [verbose] [push_git]

# Recommended: use through build.sh wrapper
../build.sh -e [env] [-v] [-c] [-p]
```

Options:
- `environment`: dev, qa, prod (default: qa)
- `ci_mode`: true/false - CI-specific behavior (default: false)
- `verbose`: true/false - Show detailed output (default: false)
- `push_git`: true/false - Push version updates to Git (default: false)

## License Headers

```bash
# Add copyright headers to source files
./add_headers.sh

# Update license headers with more detailed options
./update_license_headers.sh
```

These scripts help maintain licensing and copyright information across the codebase.