# XML Cleanup Guide

This document explains how Skidbladnir manages XML files, including formatting, validation, and dependency management.

## Overview

Skidbladnir uses [XMLStarlet](http://xmlstar.sourceforge.net/) to:

1. Validate XML files for well-formedness and correctness
2. Format XML files consistently (indentation, structure)
3. Check for inconsistent dependencies in Maven POM files
4. Fix common XML issues automatically

The XML cleanup process runs automatically as part of the build pipeline (every 10 builds) and can also be run manually.

## Automated XML Cleanup

The XML cleanup process is integrated into our build pipeline:

- **Frequency**: Automatically runs every 10 builds
- **Location**: `scripts/util/xml-cleanup.sh`
- **Configuration**: Can be customized in the script or via command-line arguments

The automated process:
1. Finds all XML files in the repository (excluding node_modules, .git, etc.)
2. Validates each file for well-formedness
3. Formats files consistently (when not in validation-only mode)
4. Fixes common issues (when auto-fix is enabled)
5. Checks Maven POM files for dependency inconsistencies
6. Generates a summary report

## Manual XML Validation and Cleanup

You can run the XML cleanup process manually using the following command:

```bash
./scripts/util/xml-cleanup.sh [options]
```

### Options

- `-v, --validate`: Validate XML files without modifying them
- `-d, --check-deps`: Check cross-dependencies between XML files (especially Maven POMs)
- `-f, --fix`: Fix issues automatically when possible
- `--verbose`: Show detailed output
- `-h, --help`: Show help information

### Examples

```bash
# Validate XML files without modifying them
./scripts/util/xml-cleanup.sh --validate

# Check and fix XML files
./scripts/util/xml-cleanup.sh --fix

# Validate XML files and check dependencies
./scripts/util/xml-cleanup.sh --validate --check-deps

# Full check with verbose output
./scripts/util/xml-cleanup.sh --fix --check-deps --verbose
```

## Maven POM File Management

For Maven POM files, the tool provides additional checks:

- Detecting inconsistent dependency versions across multiple POM files
- Identifying missing dependencies
- Validating Maven structure and namespaces

### Dependency Consistency

The tool checks all POM files to ensure that dependencies are used consistently:

- The same version of a dependency is used across all POM files
- Parent/child relationships are correctly configured
- Required dependencies are properly declared

## Implementation Details

The XML cleanup process:

1. Uses XMLStarlet for XML operations
2. Applies a 2-space indentation standard
3. Preserves XML namespaces and declarations
4. Skips IDE configuration files in `.idea/` directories
5. Creates a backup of files before modifying them
6. Returns non-zero exit code if invalid files are found

## Requirements

- XMLStarlet must be installed on the system
- Installation instructions are provided if the tool is not found

## Integration with CI/CD

In CI/CD environments, the XML validation runs as part of the build process:

- XML validation errors will cause the build to fail
- The build log includes detailed information about any issues
- Fixed files can be automatically committed in the build process

## Handling Special XML Files

Some XML files require special handling:

- **IDE Configuration Files**: Generally skipped to avoid unnecessary modifications
- **Generated Files**: Files in build/dist/target directories are excluded
- **Third-Party Files**: Files in node_modules or vendor directories are excluded

## Troubleshooting

If you encounter issues with XML validation:

1. Run the script with `--verbose` to see detailed error messages
2. Manually validate problematic files using XMLStarlet
3. Check for non-standard or malformed XML constructs
4. For Maven POM issues, use `mvn validate` to check for Maven-specific problems