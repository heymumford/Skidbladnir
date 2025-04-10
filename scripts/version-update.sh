#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Version updater script

# Color and tracking setup
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''
ERRORS=(); WARNINGS=()

# Initialize
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
ACTION="build"; BUILD_ONLY=true; PUSH_GIT=false; CURRENT_VERSION=""

# Output functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }

# Get current version from package.json
get_current_version() {
  if [ -f "${SCRIPT_DIR}/../package.json" ]; then
    grep -o '"version": *"[^"]*"' "${SCRIPT_DIR}/../package.json" | cut -d'"' -f4
  else
    warn "package.json not found, using fallback version"
    echo "0.2.6-b52"
  fi
}

# Print summary of what happened
print_summary() {
  echo -e "\n${BOLD}======= Version Update Summary =======${NC}"
  if [ ${#ERRORS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ Updated to version: $NEW_VERSION${NC}"
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ With warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
  else
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ Warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
    echo -e "${RED}✗ Failed with errors:${NC}\n$(printf "  → %s\n" "${ERRORS[@]}")"
  fi
  echo -e "${BOLD}=======================================${NC}"
}

# Show help
show_help() {
  echo -e "${BOLD}Skidbladnir Version Update Utility${NC}\n"
  echo "Usage: $0 [options]"
  echo -e "\nOptions:"
  echo "  -m, --major          Bump major version"
  echo "  -n, --minor          Bump minor version" 
  echo "  -p, --patch          Bump patch version"
  echo "  -b, --build          Bump build number only (default)"
  echo "  -v, --version VER    Set specific version (format: X.Y.Z-bN)"
  echo "  -g, --push-git       Commit changes to Git"
  echo "  -h, --help           Show this help"
}

# Process arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--major) ACTION="major"; BUILD_ONLY=false; shift ;;
    -n|--minor) ACTION="minor"; BUILD_ONLY=false; shift ;;
    -p|--patch) ACTION="patch"; BUILD_ONLY=false; shift ;;
    -b|--build) ACTION="build"; BUILD_ONLY=true; shift ;;
    -v|--version) ACTION="specific"; VERSION_ARG="$2"; shift 2 ;;
    -g|--push-git) PUSH_GIT=true; shift ;;
    -h|--help) show_help; exit 0 ;;
    *) echo -e "${RED}Error: Unknown option: $1${NC}"; show_help; exit 1 ;;
  esac
done

echo -e "\n${BOLD}Skidbladnir Version Update${NC}"

# STEP 1: Determine the version update
step "Determining version update"
CURRENT_VERSION=$(get_current_version)
info "Current version: $CURRENT_VERSION"

# Determine new version
if [ "$ACTION" = "specific" ]; then
  NEW_VERSION="$VERSION_ARG"
  info "Setting specific version: $NEW_VERSION"
else
  # Parse current version
  if [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-b([0-9]+))?$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"; MINOR="${BASH_REMATCH[2]}"; PATCH="${BASH_REMATCH[3]}"; BUILD="${BASH_REMATCH[5]:-50}"
    
    # Update version based on action
    if [ "$ACTION" = "major" ]; then
      MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0; BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "minor" ]; then
      MINOR=$((MINOR + 1)); PATCH=0; BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "patch" ]; then
      PATCH=$((PATCH + 1)); BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "build" ]; then
      BUILD=$((BUILD + 1))
    fi
    
    # Ensure build number is at least 50
    [ "$BUILD" -lt 50 ] && BUILD=50 && warn "Build number adjusted to minimum value of 50"
    
    # Construct new version
    NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-b${BUILD}"
  else
    err "Could not parse current version: $CURRENT_VERSION"
    warn "Using default version: 0.2.6-b52"
    NEW_VERSION="0.2.6-b52"
  fi
fi

ok "New version determined: $NEW_VERSION"

# STEP 2: Update version in all files
step "Updating version in project files"
if ! "${SCRIPT_DIR}/util/simple-version-update.sh" "$NEW_VERSION"; then
  fail "Failed to update version with simple-version-update.sh"
fi
ok "Version updated to $NEW_VERSION"

# STEP 3: Commit changes to Git if requested
step "Finalizing version update"
if [ "$PUSH_GIT" = true ]; then
  prog "Committing changes to Git"
  cd "${SCRIPT_DIR}/.." || fail "Failed to change directory"
  
  # Create commit message and list of files
  COMMIT_MSG="chore: $([ "$BUILD_ONLY" = true ] && echo "bump build number" || echo "update version") to ${NEW_VERSION}"
  GIT_FILES=("package.json" "build-versions.json")
  [ -f "pyproject.toml" ] && GIT_FILES+=("pyproject.toml")
  
  # Add POM files if any
  for pom in $(find . -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
    GIT_FILES+=("$pom")
  done
  
  # Stage, commit and push
  git add "${GIT_FILES[@]}" || fail "Failed to stage files for commit"
  git commit -m "$COMMIT_MSG" || fail "Failed to create commit" 
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push origin "$CURRENT_BRANCH" || fail "Failed to push changes to origin"
  
  ok "Version changes committed and pushed to Git"
else
  info "Git commit skipped (use -g to commit and push changes)"
fi

print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0