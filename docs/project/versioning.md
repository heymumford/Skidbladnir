# Skidbladnir Versioning System

This document describes the versioning system used in Skidbladnir, including how version numbers are structured, managed, and synchronized across different file types.

## Version Format

Skidbladnir uses the following version format:

```
MAJOR.MINOR.PATCH-bBUILD
```

Examples:
- `0.2.6-b50` (major: 0, minor: 2, patch: 6, build: 50)
- `1.0.0-b1` (major: 1, minor: 0, patch: 0, build: 1)

### Components

- **MAJOR**: Incremented for incompatible API changes
- **MINOR**: Incremented for new functionality in a backward-compatible manner
- **PATCH**: Incremented for backward-compatible bug fixes
- **BUILD**: Incremented for each build, always at least 50 to sync with GitHub build number

## Version Management

### Single Source of Truth

The `build-versions.json` file at the project root is the single source of truth for version information. This file contains:

- Current version string
- Major, minor, patch, and build numbers
- Build timestamp
- Git information (branch, commit, tag)
- Environment (dev, qa, prod)

### File Synchronization

The versioning system ensures that the version is synchronized across:

1. `build-versions.json` - Primary source of truth
2. `package.json` - Node.js package version
3. `pyproject.toml` - Python package version
4. Maven `pom.xml` files - Java/Maven version (major.minor.patch only, without build suffix)
5. Go version constants in source files
6. Other XML files with version attributes

### Version Update Script

The `scripts/update-version.sh` script handles all version management:

```bash
# Just update the build number
./scripts/update-version.sh

# Bump patch version and increment build number
./scripts/update-version.sh --patch

# Bump minor version and increment build number
./scripts/update-version.sh --minor

# Bump major version and increment build number
./scripts/update-version.sh --major

# Set a specific version
./scripts/update-version.sh --version 1.2.3

# Update version and commit to Git
./scripts/update-version.sh --build --push-git
```

### NPM Scripts

For convenience, the following npm scripts are available:

```bash
# Increment build number
npm run version:bump

# Bump patch version
npm run version:patch

# Bump minor version
npm run version:minor

# Bump major version
npm run version:major

# Update build number and push to Git
npm run version:push
```

## Build System Integration

The version management is integrated with the build system:

1. Each build automatically increments the build number
2. The build system synchronizes version numbers across all files
3. Version can be committed and tagged in Git (with --push-git flag)
4. Different environments (dev, qa, prod) are tracked in the version file

## Version Validation

A Git pre-push hook checks that all version numbers are synchronized:

1. Ensures package.json, build-versions.json, and pyproject.toml have the same version
2. Verifies Maven POM files have the correct version (major.minor.patch part)
3. Warns if versions are not synchronized (but allows the push to continue)

## XML Handling with xmlstarlet

The version system uses `xmlstarlet` to properly update XML files (like pom.xml) while maintaining their structure:

- Updates version nodes in Maven POM files
- Handles parent POM versions
- Updates version properties in XML files
- Preserves XML formatting and structure

## Recommendations

1. For routine development, let the build system handle version increments automatically
2. For releases, explicitly update the version with an appropriate bump:
   - `npm run version:patch` for bug fixes
   - `npm run version:minor` for new features
   - `npm run version:major` for breaking changes
3. Always commit version changes separately from code changes
4. Build numbers should always increment monotonically