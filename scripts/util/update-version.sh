#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -e

# ===================================================
# Skidbladnir Version Management Script
# ===================================================
# Single source of truth for version management
# Updates version information across all file types
# Keeps build numbers in sync across the project
# ===================================================

# Default configuration
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PUSH_GIT=false
BUMP_TYPE="build"
INCREMENT_BUILD=true

# Git information
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(git rev-parse HEAD)
GIT_SHORT_COMMIT=$(git rev-parse --short HEAD)
GIT_TIMESTAMP=$(git log -1 --format=%ct)
GIT_TAG=$(git describe --tags --always 2>/dev/null || echo "$GIT_SHORT_COMMIT")

# Initialize console output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if xmlstarlet is installed
if ! command -v xmlstarlet &> /dev/null; then
  echo -e "${RED}Error: xmlstarlet is not installed. Please install it first.${NC}"
  echo "  Ubuntu/Debian: sudo apt-get install xmlstarlet"
  echo "  Red Hat/Fedora: sudo dnf install xmlstarlet"
  echo "  macOS: brew install xmlstarlet"
  exit 1
fi

# ===================================================
# Logging Functions
# ===================================================

log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# ===================================================
# Usage Information
# ===================================================

show_usage() {
  echo "Skidbladnir Version Management Script"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -v, --version VERSION      Set specific version (format: major.minor.patch[-bBUILD])"
  echo "  -m, --major                Bump major version (resets minor and patch to 0)"
  echo "  -n, --minor                Bump minor version (resets patch to 0)"
  echo "  -p, --patch                Bump patch version"
  echo "  -b, --build                Bump build number only (default)"
  echo "  -k, --keep-build           Keep current build number (don't increment)"
  echo "  -g, --push-git             Commit and push changes to Git"
  echo "  -h, --help                 Show this help message"
  echo ""
  echo "This script manages version information across all file types in the project."
  echo "It ensures all files are synchronized with the same version number."
  echo ""
  echo "Examples:"
  echo "  $0 -p                       # Bump patch version and build number"
  echo "  $0 -v 1.2.3                 # Set specific version with build 1"
  echo "  $0 -v 1.2.3-b50             # Set specific version with build 50"
  echo "  $0 -b -g                    # Bump build number and push to Git"
  echo ""
}

# ===================================================
# Parse Arguments
# ===================================================

SPECIFIC_VERSION=""

# Process arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--version)
      SPECIFIC_VERSION="$2"
      INCREMENT_BUILD=false
      BUMP_TYPE="specific"
      shift 2
      ;;
    -m|--major)
      BUMP_TYPE="major"
      shift
      ;;
    -n|--minor)
      BUMP_TYPE="minor"
      shift
      ;;
    -p|--patch)
      BUMP_TYPE="patch"
      shift
      ;;
    -b|--build)
      BUMP_TYPE="build"
      shift
      ;;
    -k|--keep-build)
      INCREMENT_BUILD=false
      shift
      ;;
    -g|--push-git)
      PUSH_GIT=true
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1"
      show_usage
      exit 1
      ;;
  esac
done

# ===================================================
# Version Management Functions
# ===================================================

# Parse a version string into its components
parse_version() {
  local version_str="$1"
  local major minor patch build
  
  # Try several parsing methods for better compatibility
  
  # Method 1: Using regex with BASH_REMATCH
  if [[ "$version_str" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-b([0-9]+))?$ ]]; then
    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"
    build="${BASH_REMATCH[5]}"
  
  # Method 2: Using sed
  elif major=$(echo "$version_str" | sed -E 's/^([0-9]+)\.[0-9]+\.[0-9]+(-b[0-9]+)?$/\1/') && \
       minor=$(echo "$version_str" | sed -E 's/^[0-9]+\.([0-9]+)\.[0-9]+(-b[0-9]+)?$/\1/') && \
       patch=$(echo "$version_str" | sed -E 's/^[0-9]+\.[0-9]+\.([0-9]+)(-b[0-9]+)?$/\1/') && \
       build=$(echo "$version_str" | sed -E 's/^[0-9]+\.[0-9]+\.[0-9]+-b([0-9]+)$/\1/'); then
    # Check if we got all parts
    if [ -z "$major" ] || [ -z "$minor" ] || [ -z "$patch" ]; then
      # If build is not present in the version string, it will be empty
      :
    fi
  
  # Method 3: Simple splitting with cut
  else
    # Try parsing with cut for the simplest case
    major=$(echo "$version_str" | cut -d. -f1)
    minor=$(echo "$version_str" | cut -d. -f2)
    
    # The patch may have -bXX suffix
    patch_part=$(echo "$version_str" | cut -d. -f3)
    
    if [[ "$patch_part" =~ ^([0-9]+)-b([0-9]+)$ ]]; then
      patch="${BASH_REMATCH[1]}"
      build="${BASH_REMATCH[2]}"
    else
      patch="$patch_part"
    fi
  fi
  
  # Validate the components
  if [[ ! "$major" =~ ^[0-9]+$ ]] || [[ ! "$minor" =~ ^[0-9]+$ ]] || [[ ! "$patch" =~ ^[0-9]+$ ]]; then
    log_error "Invalid version format: $version_str"
    log_error "Expected format: major.minor.patch or major.minor.patch-bBUILD"
    log_error "Parsed: major=$major, minor=$minor, patch=$patch, build=$build"
    exit 1
  fi
  
  # Default build to 50 if not specified or invalid
  if [ -z "$build" ] || [[ ! "$build" =~ ^[0-9]+$ ]]; then
    build=50
  fi
  
  echo "$major $minor $patch $build"
}

# Get current version information
get_current_version() {
  if [ -f "$VERSION_FILE" ]; then
    local version_info
    version_info=$(cat "$VERSION_FILE")
    log "Reading existing version file: $VERSION_FILE"
    
    # Extract current versions from JSON using grep and sed for better compatibility
    local version_major version_minor version_patch build_number
    version_major=$(grep -o '"major": *[0-9]*' "$VERSION_FILE" | sed 's/[^0-9]//g')
    version_minor=$(grep -o '"minor": *[0-9]*' "$VERSION_FILE" | sed 's/[^0-9]//g')
    version_patch=$(grep -o '"patch": *[0-9]*' "$VERSION_FILE" | sed 's/[^0-9]//g')
    build_number=$(grep -o '"build": *[0-9]*' "$VERSION_FILE" | sed 's/[^0-9]//g')
    
    # Validate results
    if [ -z "$version_major" ] || [ -z "$version_minor" ] || [ -z "$version_patch" ] || [ -z "$build_number" ]; then
      log_warning "Could not extract complete version from $VERSION_FILE, falling back to package.json"
      # Fall back to package.json
      if [ -f "$PROJECT_ROOT/package.json" ]; then
        local pkg_version
        pkg_version=$(grep -o '"version": *"[^"]*"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
        echo $(parse_version "$pkg_version")
        return 0
      else
        log_error "No valid version sources found (invalid build-versions.json, no package.json)"
        exit 1
      fi
    else
      echo "$version_major $version_minor $version_patch $build_number"
      return 0
    fi
  else
    log_warning "No existing version file found at $VERSION_FILE, checking package.json"
    # Extract version from package.json
    if [ -f "$PROJECT_ROOT/package.json" ]; then
      local pkg_version
      pkg_version=$(grep -o '"version": *"[^"]*"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
      log "Found version $pkg_version in package.json"
      
      # Parse the version string
      echo $(parse_version "$pkg_version")
      return 0
    else
      log_error "No version sources found (no build-versions.json or package.json)"
      exit 1
    fi
  fi
}

# Update build-versions.json file
update_version_file() {
  local major="$1"
  local minor="$2"
  local patch="$3"
  local build="$4"
  local full_version="${major}.${minor}.${patch}-b${build}"
  
  log "Updating version file to $full_version"
  
  # Create or update the version file
  cat > "$VERSION_FILE" << EOF
{
  "version": "${full_version}",
  "major": ${major},
  "minor": ${minor},
  "patch": ${patch},
  "build": ${build},
  "timestamp": "${TIMESTAMP}",
  "environment": "dev",
  "git": {
    "branch": "${GIT_BRANCH}",
    "commit": "${GIT_COMMIT}",
    "shortCommit": "${GIT_SHORT_COMMIT}",
    "timestamp": ${GIT_TIMESTAMP},
    "tag": "${GIT_TAG}"
  }
}
EOF
}

# Update Node.js package.json
update_package_json() {
  local full_version="$1"
  local package_json="$PROJECT_ROOT/package.json"
  
  if [ -f "$package_json" ]; then
    log "Updating version in package.json to $full_version"
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${full_version}\"/" "$package_json"
  else
    log_warning "package.json not found, skipping"
  fi
}

# Update Python pyproject.toml
update_pyproject_toml() {
  local full_version="$1"
  local pyproject_toml="$PROJECT_ROOT/pyproject.toml"
  
  if [ -f "$pyproject_toml" ]; then
    log "Updating version in pyproject.toml to $full_version"
    sed -i "s/version = \"[^\"]*\"/version = \"${full_version}\"/" "$pyproject_toml"
  else
    log_warning "pyproject.toml not found, skipping"
  fi
}

# Update Maven pom.xml files
update_pom_files() {
  local full_version="$1"
  local version_without_build
  
  # For Maven, we use just major.minor.patch without the build number suffix
  if [[ "$full_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    version_without_build="${BASH_REMATCH[1]}"
  else
    version_without_build="$full_version" # Fallback
  fi
  
  log "Updating version in pom.xml files to $version_without_build"
  
  # Find all pom.xml files
  local pom_files=()
  while IFS= read -r file; do
    pom_files+=("$file")
  done < <(find "$PROJECT_ROOT" -name "pom.xml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*")
  
  local pom_count=${#pom_files[@]}
  
  if [ "$pom_count" -eq 0 ]; then
    log_warning "No Maven POM files found"
    return 0
  fi
  
  log "Found $pom_count Maven POM files to update"
  
  for pom in "${pom_files[@]}"; do
    local rel_path="${pom#$PROJECT_ROOT/}"
    log "Updating version in $rel_path"
    
    # Update project version if it exists
    xmlstarlet ed -L \
      -N x="http://maven.apache.org/POM/4.0.0" \
      -u "/x:project/x:version" \
      -v "$version_without_build" \
      "$pom" 2>/dev/null || true
    
    # Update parent version if it exists and matches our project
    local parent_groupId
    parent_groupId=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:parent/x:groupId" "$pom" 2>/dev/null)
    
    if [ "$parent_groupId" = "org.skidbladnir" ]; then
      xmlstarlet ed -L \
        -N x="http://maven.apache.org/POM/4.0.0" \
        -u "/x:project/x:parent/x:version" \
        -v "$version_without_build" \
        "$pom" 2>/dev/null || true
    fi
    
    # Update version properties if they exist
    xmlstarlet ed -L \
      -N x="http://maven.apache.org/POM/4.0.0" \
      -u "/x:project/x:properties/x:skidbladnir.version" \
      -v "$version_without_build" \
      "$pom" 2>/dev/null || true
  done
}

# Update other XML files that might contain version information
update_xml_files() {
  local full_version="$1"
  local version_without_build
  
  # For XML, we use just major.minor.patch without the build number suffix
  if [[ "$full_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    version_without_build="${BASH_REMATCH[1]}"
  else
    version_without_build="$full_version" # Fallback
  fi
  
  log "Checking for version references in other XML files"
  
  # Find XML files with version attributes
  local xml_files=()
  while IFS= read -r file; do
    if grep -q "version=" "$file" || grep -q "<version>" "$file"; then
      xml_files+=("$file")
    fi
  done < <(find "$PROJECT_ROOT" -name "*.xml" -type f -not -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*")
  
  local xml_count=${#xml_files[@]}
  
  if [ "$xml_count" -eq 0 ]; then
    log "No other XML files with version references found"
    return 0
  fi
  
  log "Found $xml_count XML files with version references"
  
  for xml in "${xml_files[@]}"; do
    local rel_path="${xml#$PROJECT_ROOT/}"
    local changes_made=false
    
    # Try different version update patterns
    # 1. Check for version attributes
    if grep -q 'version="[0-9.]\+"' "$xml"; then
      log "Updating version attributes in $rel_path"
      sed -i "s/version=\"[0-9.]\+\"/version=\"${version_without_build}\"/" "$xml"
      changes_made=true
    fi
    
    # 2. Check for skidbladnir.version
    if grep -q '<skidbladnir\.version>[0-9.]\+</skidbladnir\.version>' "$xml"; then
      log "Updating skidbladnir.version in $rel_path"
      sed -i "s/<skidbladnir\.version>[0-9.]\+<\/skidbladnir\.version>/<skidbladnir\.version>${version_without_build}<\/skidbladnir\.version>/" "$xml"
      changes_made=true
    fi
    
    if [ "$changes_made" = true ]; then
      log_success "Updated version references in $rel_path"
    else
      log_warning "Found version references in $rel_path but couldn't update them automatically"
    fi
  done
}

# Update Go version constants
update_go_files() {
  local full_version="$1"
  local version_without_build
  
  # For Go, we use just major.minor.patch without the build number suffix
  if [[ "$full_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    version_without_build="${BASH_REMATCH[1]}"
  else
    version_without_build="$full_version" # Fallback
  fi
  
  log "Checking for version constants in Go files"
  
  # Find Go files with version constants
  local go_files=()
  while IFS= read -r file; do
    if grep -q "Version = " "$file" || grep -q "VERSION = " "$file" || grep -q "const version = " "$file"; then
      go_files+=("$file")
    fi
  done < <(find "$PROJECT_ROOT" -name "*.go" -type f -not -path "*/vendor/*" -not -path "*/.git/*")
  
  local go_count=${#go_files[@]}
  
  if [ "$go_count" -eq 0 ]; then
    log "No Go files with version constants found"
    return 0
  fi
  
  log "Found $go_count Go files with version constants"
  
  for go_file in "${go_files[@]}"; do
    local rel_path="${go_file#$PROJECT_ROOT/}"
    local changes_made=false
    
    # Update version constants
    if grep -q 'Version = "[0-9.]\+"' "$go_file"; then
      log "Updating Version constant in $rel_path"
      sed -i 's/Version = "[0-9.]\+"/Version = "'${version_without_build}'"/' "$go_file"
      changes_made=true
    fi
    
    if grep -q 'VERSION = "[0-9.]\+"' "$go_file"; then
      log "Updating VERSION constant in $rel_path"
      sed -i 's/VERSION = "[0-9.]\+"/VERSION = "'${version_without_build}'"/' "$go_file"
      changes_made=true
    fi
    
    if grep -q 'const version = "[0-9.]\+"' "$go_file"; then
      log "Updating version constant in $rel_path"
      sed -i 's/const version = "[0-9.]\+"/const version = "'${version_without_build}'"/' "$go_file"
      changes_made=true
    fi
    
    if [ "$changes_made" = true ]; then
      log_success "Updated version constants in $rel_path"
    else
      log_warning "Found version references in $rel_path but couldn't update them automatically"
    fi
  done
}

# Commit version changes to Git
commit_version_changes() {
  local full_version="$1"
  
  if [ "${PUSH_GIT}" = "true" ]; then
    log "Committing version changes to Git"
    
    cd "${PROJECT_ROOT}"
    
    # Add version files to Git
    git add "${VERSION_FILE}" package.json pyproject.toml $(find . -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*")
    
    # Commit changes with version message
    git commit -m "chore: Update version to ${full_version}" || true
    
    # Create tag for this version
    if [[ "$BUMP_TYPE" != "build" ]]; then
      # Only create version tags for major, minor, patch changes, not just build number changes
      git tag -a "v${full_version}" -m "Release version ${full_version}" || true
      
      # Push the tag
      git push origin "v${full_version}" || log_warning "Failed to push tag v${full_version}"
    fi
    
    # Push changes
    git push origin "${GIT_BRANCH}" || log_warning "Failed to push to origin/${GIT_BRANCH}"
    
    log_success "Version changes committed and pushed"
  else
    log "Skipping Git operations (use -g to commit and push changes)"
  fi
}

# ===================================================
# Main Process
# ===================================================

main() {
  log "Starting Skidbladnir version update"
  
  local version_major version_minor version_patch build_number
  
  # Get current version information
  local version_info
  version_info=$(get_current_version)
  
  # Parse the version info
  version_major=$(echo "$version_info" | awk '{print $1}')
  version_minor=$(echo "$version_info" | awk '{print $2}')
  version_patch=$(echo "$version_info" | awk '{print $3}')
  build_number=$(echo "$version_info" | awk '{print $4}')
  
  # Validate the parsed values
  if [ -z "$version_major" ] || [ -z "$version_minor" ] || [ -z "$version_patch" ] || [ -z "$build_number" ]; then
    log_error "Failed to parse version components from: $version_info"
    exit 1
  fi
  
  local initial_version="${version_major}.${version_minor}.${version_patch}-b${build_number}"
  log "Current version: $initial_version"
  
  # Update version based on bump type
  if [ "$BUMP_TYPE" = "specific" ]; then
    # Use specific version provided by user
    read -r version_major version_minor version_patch build_number < <(parse_version "$SPECIFIC_VERSION")
  elif [ "$BUMP_TYPE" = "major" ]; then
    version_major=$((version_major + 1))
    version_minor=0
    version_patch=0
    if [ "$INCREMENT_BUILD" = true ]; then
      build_number=$((build_number + 1))
    fi
  elif [ "$BUMP_TYPE" = "minor" ]; then
    version_minor=$((version_minor + 1))
    version_patch=0
    if [ "$INCREMENT_BUILD" = true ]; then
      build_number=$((build_number + 1))
    fi
  elif [ "$BUMP_TYPE" = "patch" ]; then
    version_patch=$((version_patch + 1))
    if [ "$INCREMENT_BUILD" = true ]; then
      build_number=$((build_number + 1))
    fi
  elif [ "$BUMP_TYPE" = "build" ]; then
    # Just increment build number
    if [ "$INCREMENT_BUILD" = true ]; then
      build_number=$((build_number + 1))
    fi
  fi
  
  # Ensure build number is always at least 50
  if [ "$build_number" -lt 50 ]; then
    log_warning "Build number $build_number is less than minimum (50), setting to 50"
    build_number=50
  fi
  
  # Construct full version string
  local full_version="${version_major}.${version_minor}.${version_patch}-b${build_number}"
  
  log "New version: $full_version"
  
  # Update all files
  update_version_file "$version_major" "$version_minor" "$version_patch" "$build_number"
  update_package_json "$full_version"
  update_pyproject_toml "$full_version"
  update_pom_files "$full_version"
  update_xml_files "$full_version"
  update_go_files "$full_version"
  
  # Commit and push changes if requested
  commit_version_changes "$full_version"
  
  log_success "Version updated successfully from $initial_version to $full_version"
}

# Run main process
main