#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Consolidated Version Management Tools
# This script provides a unified interface to all version management functionality

# Color and tracking setup
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''
ERRORS=(); WARNINGS=()

# Initialize
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
ROOT_DIR="${SCRIPT_DIR}/../.."
ACTION="update"; VERSION_TYPE="patch"; GIT_COMMIT=false; VERSION_ARG=""

# Output functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }

# Print summary
print_summary() {
  echo -e "\n${BOLD}======= Version Management Summary =======${NC}"
  if [ ${#ERRORS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ Operation completed successfully${NC}"
    [ -n "$NEW_VERSION" ] && echo -e "${GREEN}✓ Version: $NEW_VERSION${NC}"
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ Warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
  else
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ Warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
    echo -e "${RED}✗ Failed with errors:${NC}\n$(printf "  → %s\n" "${ERRORS[@]}")"
  fi
  echo -e "${BOLD}=======================================${NC}"
}

# Show help
show_help() {
  echo -e "${BOLD}Skidbladnir Version Management Framework${NC}\n"
  echo "Usage: $0 [command] [options]"
  echo -e "\nCommands:"
  echo "  update      - Update version numbers (default)"
  echo "  check       - Check version consistency across project files"
  echo "  get         - Get current version information"
  echo -e "\nUpdate Options:"
  echo "  -M, --major          Bump major version"
  echo "  -m, --minor          Bump minor version" 
  echo "  -p, --patch          Bump patch version (default)"
  echo "  -b, --build          Bump build number only"
  echo "  -v, --version VER    Set specific version (format: X.Y.Z[-bN])"
  echo "  -g, --git            Commit changes to Git"
  echo "  -h, --help           Show this help"
  echo -e "\nExamples:"
  echo "  $0 update --patch             # Bump patch version (e.g., 1.2.3 → 1.2.4)"
  echo "  $0 update -m -g               # Bump minor version and commit to git"
  echo "  $0 update -v 2.0.0            # Set specific version"
  echo "  $0 check                      # Check version consistency"
}

# Check version consistency across project files
check_version_consistency() {
  echo -e "\n${BOLD}Checking Version Consistency${NC}"
  step "Finding version references"
  
  # Source of truth
  local BUILD_VERSION_FILE="${ROOT_DIR}/build-versions.json"
  if [ ! -f "$BUILD_VERSION_FILE" ]; then
    err "Source of truth (build-versions.json) is missing!"
    return 1
  fi
  
  # Get version from build-versions.json
  local SOURCE_VERSION=$(grep -o '"version": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  if [ -z "$SOURCE_VERSION" ]; then
    err "Could not extract version from build-versions.json"
    return 1
  fi
  
  info "Source of truth version: $SOURCE_VERSION"
  
  # Track inconsistencies
  local INCONSISTENCIES=0
  local CHECKED_FILES=0
  
  # Check package.json
  if [ -f "${ROOT_DIR}/package.json" ]; then
    CHECKED_FILES=$((CHECKED_FILES + 1))
    local PKG_VERSION=$(grep -o '"version": *"[^"]*"' "${ROOT_DIR}/package.json" | cut -d'"' -f4)
    if [ "$PKG_VERSION" = "$SOURCE_VERSION" ]; then
      ok "package.json: $PKG_VERSION"
    else
      warn "Inconsistent version in package.json: $PKG_VERSION (expected $SOURCE_VERSION)"
      INCONSISTENCIES=$((INCONSISTENCIES + 1))
    fi
  fi
  
  # Check pyproject.toml
  if [ -f "${ROOT_DIR}/pyproject.toml" ]; then
    CHECKED_FILES=$((CHECKED_FILES + 1))
    local PY_VERSION=$(grep -n 'version =' "${ROOT_DIR}/pyproject.toml" | head -1 | sed -E 's/.*version = "([^"]*)".*/\1/')
    if [ "$PY_VERSION" = "$SOURCE_VERSION" ]; then
      ok "pyproject.toml: $PY_VERSION"
    else
      warn "Inconsistent version in pyproject.toml: $PY_VERSION (expected $SOURCE_VERSION)"
      INCONSISTENCIES=$((INCONSISTENCIES + 1))
    fi
  fi
  
  # Extract base version without build number
  local SOURCE_BASE_VERSION
  if [[ "$SOURCE_VERSION" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-b[0-9]+)?$ ]]; then
    SOURCE_BASE_VERSION="${BASH_REMATCH[1]}"
  else
    SOURCE_BASE_VERSION="$SOURCE_VERSION"
  fi
  
  # Check POM files
  for POM_FILE in $(find "${ROOT_DIR}" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
    CHECKED_FILES=$((CHECKED_FILES + 1))
    local POM_REL_PATH="${POM_FILE#$ROOT_DIR/}"
    
    # Use xmlstarlet if available
    if command -v xmlstarlet &>/dev/null; then
      # Get project version
      local POM_VERSION=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:version" "$POM_FILE" 2>/dev/null || echo "")
      
      # Get skidbladnir.version property
      local PROPERTY_VERSION=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:properties/x:skidbladnir.version" "$POM_FILE" 2>/dev/null || echo "")
      
      if [ -n "$POM_VERSION" ]; then
        if [ "$POM_VERSION" = "$SOURCE_BASE_VERSION" ]; then
          ok "$POM_REL_PATH: project version = $POM_VERSION"
        else
          warn "Inconsistent project version in $POM_REL_PATH: $POM_VERSION (expected $SOURCE_BASE_VERSION)"
          INCONSISTENCIES=$((INCONSISTENCIES + 1))
        fi
      fi
      
      if [ -n "$PROPERTY_VERSION" ]; then
        if [ "$PROPERTY_VERSION" = "$SOURCE_BASE_VERSION" ]; then
          ok "$POM_REL_PATH: skidbladnir.version = $PROPERTY_VERSION"
        else
          warn "Inconsistent skidbladnir.version property in $POM_REL_PATH: $PROPERTY_VERSION (expected $SOURCE_BASE_VERSION)"
          INCONSISTENCIES=$((INCONSISTENCIES + 1))
        fi
      fi
    else
      # Fallback for systems without xmlstarlet
      local POM_VERSION=$(grep -o '<version>[^<]*</version>' "$POM_FILE" | head -1 | sed 's/<version>\(.*\)<\/version>/\1/')
      
      if [ -n "$POM_VERSION" ]; then
        if [ "$POM_VERSION" = "$SOURCE_BASE_VERSION" ]; then
          ok "$POM_REL_PATH: $POM_VERSION"
        else
          warn "Inconsistent version in $POM_REL_PATH: $POM_VERSION (expected $SOURCE_BASE_VERSION)"
          INCONSISTENCIES=$((INCONSISTENCIES + 1))
        fi
      else
        warn "Could not extract version from $POM_REL_PATH"
      fi
    fi
  done
  
  step "Consistency Analysis"
  if [ $CHECKED_FILES -eq 0 ]; then
    warn "No version files found to check"
    return 0
  fi
  
  if [ $INCONSISTENCIES -eq 0 ]; then
    ok "All $CHECKED_FILES files have consistent versions"
    return 0
  else
    err "Found $INCONSISTENCIES version inconsistencies across $CHECKED_FILES files"
    info "Run './scripts/util/consolidated-version-tools.sh update' to synchronize versions"
    return 1
  fi
}

# Get and display current version information
get_version_info() {
  echo -e "\n${BOLD}Current Version Information${NC}"
  
  # Source of truth
  local BUILD_VERSION_FILE="${ROOT_DIR}/build-versions.json"
  if [ ! -f "$BUILD_VERSION_FILE" ]; then
    warn "Source of truth (build-versions.json) is missing!"
    return 1
  fi
  
  # Parse JSON with minimal tools (grep, sed)
  local VERSION=$(grep -o '"version": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  local MAJOR=$(grep -o '"major": *[0-9]*' "$BUILD_VERSION_FILE" | head -1 | sed 's/.*: *\([0-9]*\)/\1/')
  local MINOR=$(grep -o '"minor": *[0-9]*' "$BUILD_VERSION_FILE" | head -1 | sed 's/.*: *\([0-9]*\)/\1/')
  local PATCH=$(grep -o '"patch": *[0-9]*' "$BUILD_VERSION_FILE" | head -1 | sed 's/.*: *\([0-9]*\)/\1/')
  local BUILD=$(grep -o '"build": *[0-9]*' "$BUILD_VERSION_FILE" | head -1 | sed 's/.*: *\([0-9]*\)/\1/')
  local TIMESTAMP=$(grep -o '"timestamp": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  local ENV=$(grep -o '"environment": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  local GIT_BRANCH=$(grep -o '"branch": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  local GIT_COMMIT=$(grep -o '"commit": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  local GIT_TAG=$(grep -o '"tag": *"[^"]*"' "$BUILD_VERSION_FILE" | head -1 | cut -d'"' -f4)
  
  echo -e "${BOLD}Version:${NC}      $VERSION"
  echo -e "${BOLD}Components:${NC}    $MAJOR.$MINOR.$PATCH (build $BUILD)"
  echo -e "${BOLD}Environment:${NC}   $ENV"
  echo -e "${BOLD}Last Updated:${NC}  $TIMESTAMP"
  echo -e "${BOLD}Git Branch:${NC}    $GIT_BRANCH"
  echo -e "${BOLD}Git Commit:${NC}    $GIT_COMMIT"
  if [ -n "$GIT_TAG" ] && [ "$GIT_TAG" != "no-tag" ]; then
    echo -e "${BOLD}Git Tag:${NC}       $GIT_TAG"
  fi
  
  # Count inconsistencies
  local INCONSISTENCIES=0
  
  # Check package.json
  if [ -f "${ROOT_DIR}/package.json" ]; then
    local PKG_VERSION=$(grep -o '"version": *"[^"]*"' "${ROOT_DIR}/package.json" | cut -d'"' -f4)
    if [ "$PKG_VERSION" != "$VERSION" ]; then
      INCONSISTENCIES=$((INCONSISTENCIES + 1))
    fi
  fi
  
  # Check pyproject.toml
  if [ -f "${ROOT_DIR}/pyproject.toml" ]; then
    local PY_VERSION=$(grep -n 'version =' "${ROOT_DIR}/pyproject.toml" | head -1 | sed -E 's/.*version = "([^"]*)".*/\1/')
    if [ "$PY_VERSION" != "$VERSION" ]; then
      INCONSISTENCIES=$((INCONSISTENCIES + 1))
    fi
  fi
  
  # Extract base version without build number
  local BASE_VERSION
  if [[ "$VERSION" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-b[0-9]+)?$ ]]; then
    BASE_VERSION="${BASH_REMATCH[1]}"
  else
    BASE_VERSION="$VERSION"
  fi
  
  # Check POM files for project version inconsistencies
  for POM_FILE in $(find "${ROOT_DIR}" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
    if command -v xmlstarlet &>/dev/null; then
      local POM_VERSION=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:version" "$POM_FILE" 2>/dev/null || echo "")
      if [ -n "$POM_VERSION" ] && [ "$POM_VERSION" != "$BASE_VERSION" ]; then
        INCONSISTENCIES=$((INCONSISTENCIES + 1))
      fi
    else
      local POM_VERSION=$(grep -o '<version>[^<]*</version>' "$POM_FILE" | head -1 | sed 's/<version>\(.*\)<\/version>/\1/')
      if [ -n "$POM_VERSION" ] && [ "$POM_VERSION" != "$BASE_VERSION" ]; then
        INCONSISTENCIES=$((INCONSISTENCIES + 1))
      fi
    fi
  done
  
  if [ $INCONSISTENCIES -gt 0 ]; then
    echo -e "\n${YELLOW}⚠ Warning: Detected $INCONSISTENCIES version inconsistencies in project files${NC}"
    echo -e "${YELLOW}→ Run './scripts/util/consolidated-version-tools.sh check' for details${NC}"
  else
    echo -e "\n${GREEN}✓ All project files have consistent versions${NC}"
  fi
  
  return 0
}

# Update versions across all files
update_versions() {
  echo -e "\n${BOLD}Updating Project Versions${NC}"
  step "Determining update type"
  
  local NODE_VERSION_UPDATER="${SCRIPT_DIR}/version-update.js"
  if [ ! -f "$NODE_VERSION_UPDATER" ]; then
    fail "Node.js version updater script not found at $NODE_VERSION_UPDATER"
  fi
  
  if [ -n "$VERSION_ARG" ]; then
    info "Setting specific version: $VERSION_ARG"
    if ! node "$NODE_VERSION_UPDATER" "specific" "$VERSION_ARG" --sync; then
      fail "Failed to update version"
    fi
    NEW_VERSION="$VERSION_ARG"
  else
    info "Performing $VERSION_TYPE version update"
    if ! node "$NODE_VERSION_UPDATER" "$VERSION_TYPE" "" --sync; then
      fail "Failed to update version"
    fi
    # Get the updated version
    NEW_VERSION=$(grep -o '"version": *"[^"]*"' "${ROOT_DIR}/build-versions.json" | head -1 | cut -d'"' -f4)
  fi
  
  ok "Version updated to $NEW_VERSION"
  
  # Git commit if requested
  if [ "$GIT_COMMIT" = true ]; then
    step "Committing changes to Git"
    cd "$ROOT_DIR" || fail "Failed to change to project root directory"
    
    # Detect if this is a major, minor, patch, or build bump
    local COMMIT_TYPE="version"
    if [ "$VERSION_TYPE" = "major" ]; then
      COMMIT_TYPE="major version"
    elif [ "$VERSION_TYPE" = "minor" ]; then
      COMMIT_TYPE="minor version"
    elif [ "$VERSION_TYPE" = "patch" ]; then
      COMMIT_TYPE="patch version"
    elif [ "$VERSION_TYPE" = "build" ]; then
      COMMIT_TYPE="build number"
    fi
    
    COMMIT_MSG="chore: bump $COMMIT_TYPE to ${NEW_VERSION}"
    
    # Find files to stage
    GIT_FILES=()
    [ -f "build-versions.json" ] && GIT_FILES+=("build-versions.json")
    [ -f "package.json" ] && GIT_FILES+=("package.json")
    [ -f "pyproject.toml" ] && GIT_FILES+=("pyproject.toml")
    
    # Add POM files if any
    for pom in $(find . -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
      GIT_FILES+=("$pom")
    done
    
    if [ ${#GIT_FILES[@]} -eq 0 ]; then
      warn "No files to commit"
    else
      prog "Staging files: ${GIT_FILES[*]}"
      
      if ! git add "${GIT_FILES[@]}"; then
        fail "Failed to stage files for commit"
      fi
      
      prog "Creating commit"
      if ! git commit -m "$COMMIT_MSG"; then
        fail "Failed to create commit"
      fi
      
      # Get current branch
      CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
      
      prog "Pushing to origin/$CURRENT_BRANCH"
      if ! git push origin "$CURRENT_BRANCH"; then
        fail "Failed to push changes to origin"
      fi
      
      ok "Changes committed and pushed to Git"
    fi
  fi
  
  return 0
}

# Process arguments
if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

COMMAND=$1
shift

# Parse command
case "$COMMAND" in
  update)
    ACTION="update"
    ;;
  check)
    ACTION="check"
    ;;
  get)
    ACTION="get"
    ;;
  help|-h|--help)
    show_help
    exit 0
    ;;
  *)
    echo -e "${RED}Error: Unknown command: $COMMAND${NC}"
    show_help
    exit 1
    ;;
esac

# Parse options for the update command
if [ "$ACTION" = "update" ]; then
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -M|--major) VERSION_TYPE="major"; shift ;;
      -m|--minor) VERSION_TYPE="minor"; shift ;;
      -p|--patch) VERSION_TYPE="patch"; shift ;;
      -b|--build) VERSION_TYPE="build"; shift ;;
      -v|--version) VERSION_ARG="$2"; shift 2 ;;
      -g|--git) GIT_COMMIT=true; shift ;;
      -h|--help) show_help; exit 0 ;;
      *) echo -e "${RED}Error: Unknown option: $1${NC}"; show_help; exit 1 ;;
    esac
  done
fi

# Execute the appropriate action
case "$ACTION" in
  update)
    update_versions
    ;;
  check)
    check_version_consistency
    ;;
  get)
    get_version_info
    ;;
esac

print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0