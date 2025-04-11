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

## Enhanced Version Management Tools

The project now features an improved version management system that provides better XML handling for POM files and a more consistent user experience.

### Consolidated Version Tools

The main CLI tool for version management is:

```bash
./scripts/util/consolidated-version-tools.sh [command] [options]
```

Commands:
- `update` - Update version numbers across all files
- `check` - Check version consistency across project files  
- `get` - Get current version information

Update options:
- `-M, --major` - Bump major version (X.Y.Z → X+1.0.0)
- `-m, --minor` - Bump minor version (X.Y.Z → X.Y+1.0)
- `-p, --patch` - Bump patch version (X.Y.Z → X.Y.Z+1) [default]
- `-b, --build` - Bump build number only (X.Y.Z-bN → X.Y.Z-bN+1)
- `-v, --version VER` - Set specific version (format: X.Y.Z[-bN])
- `-g, --git` - Commit changes to Git

Examples:
```bash
# Bump patch version (e.g., 1.2.3 → 1.2.4)
./scripts/util/consolidated-version-tools.sh update --patch

# Bump minor version and commit to git
./scripts/util/consolidated-version-tools.sh update -m -g

# Set specific version
./scripts/util/consolidated-version-tools.sh update -v 2.0.0

# Check version consistency
./scripts/util/consolidated-version-tools.sh check
```

### Legacy Scripts

For backward compatibility, the following scripts are still available:

```bash
# Just update the build number
./scripts/update-version.sh

# Bump patch version and increment build number
./scripts/update-version.sh --patch

# NPM scripts
npm run version:bump    # Increment build number
npm run version:patch   # Bump patch version
npm run version:minor   # Bump minor version
npm run version:major   # Bump major version
npm run version:push    # Update build number and push to Git
```

## XML Handling with xmlstarlet

The enhanced version system uses `xmlstarlet` for precise updates to XML files, particularly Maven POM files:

- Only updates the project's own version, not dependency versions
- Updates both the project version tag and the `skidbladnir.version` property if present
- Preserves XML formatting, structure, and comments
- Falls back to limited sed-based updates when xmlstarlet is not available

Example of proper POM update:

```xml
<!-- Before -->
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.skidbladnir</groupId>
  <artifactId>api-integration-tests</artifactId>
  <version>0.3.3</version>  <!-- Only this version is updated -->
  <properties>
    <skidbladnir.version>0.3.3</skidbladnir.version>  <!-- This property is updated -->
    <karate.version>1.4.1</karate.version>  <!-- This dependency version is preserved -->
  </properties>
</project>

<!-- After update to 0.4.0 -->
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.skidbladnir</groupId>
  <artifactId>api-integration-tests</artifactId>
  <version>0.4.0</version>  <!-- Updated to new version -->
  <properties>
    <skidbladnir.version>0.4.0</skidbladnir.version>  <!-- Updated to new version -->
    <karate.version>1.4.1</karate.version>  <!-- Preserved unchanged -->
  </properties>
</project>
```

## Version Consistency Checking

The new version management tools include a consistency checker that verifies versions across all files:

```bash
./scripts/util/consolidated-version-tools.sh check
```

This will:
1. Read the version from the source of truth (`build-versions.json`)
2. Check all relevant files for version information
3. Report any inconsistencies found
4. Provide instructions for fixing inconsistencies

## Implementation Details

The improved version management system consists of several components:

1. `consolidated-version-tools.sh` - Main entry point script (bash)
2. `simple-version-update.sh` - Handles file updates with xmlstarlet support
3. `version-update.js` - Node.js component for updating build-versions.json

This modular approach allows for:
- Precise XML handling through xmlstarlet
- JavaScript-based processing of JSON files
- Command-line consistency checking
- Single source of truth with propagation to other files

## Recommendations

1. Use the consolidated tools for all version management:
   ```bash
   ./scripts/util/consolidated-version-tools.sh update -p -g
   ```

2. Periodically check version consistency:
   ```bash
   ./scripts/util/consolidated-version-tools.sh check
   ```

3. For Maven-based components, define and use a `skidbladnir.version` property:
   ```xml
   <properties>
     <skidbladnir.version>0.3.3</skidbladnir.version>
   </properties>
   <dependencies>
     <dependency>
       <groupId>org.skidbladnir</groupId>
       <artifactId>common</artifactId>
       <version>${skidbladnir.version}</version>
     </dependency>
   </dependencies>
   ```

4. Always commit version changes separately from code changes with a consistent message format:
   ```
   chore: bump [type] version to X.Y.Z-bN
   ```

5. Build numbers should always increment monotonically