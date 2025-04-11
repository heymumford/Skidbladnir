#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Enhanced version update script with proper XML handling
# This script updates version information across multiple file types
# and ensures proper XML handling for POM files

# Color and tracking setup
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''
ERRORS=(); WARNINGS=()

# Set up script parameters
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
NEW_VERSION=${1:-"0.2.6-b51"}
VERBOSE=${2:-"false"}

# Output functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }
verbose() { [[ "$VERBOSE" == "true" ]] && echo -e "    $1"; }

# Summary printer
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

# Check for required dependencies
check_dependencies() {
  local missing=false
  local deps=("xmlstarlet" "sed" "find" "date" "git")
  
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" &>/dev/null; then
      warn "Missing dependency: $dep"
      missing=true
    fi
  done
  
  if [[ "$missing" == "true" ]]; then
    if command -v apt-get &>/dev/null; then
      info "You may install missing dependencies with: sudo apt-get install xmlstarlet git"
    elif command -v yum &>/dev/null; then
      info "You may install missing dependencies with: sudo yum install xmlstarlet git"
    elif command -v brew &>/dev/null; then
      info "You may install missing dependencies with: brew install xmlstarlet git"
    fi
    return 1
  fi
  
  return 0
}

# Announce the process
echo -e "\n${BOLD}Skidbladnir Version Update${NC}"

# STEP 0: Check dependencies
step "Checking dependencies"
if ! check_dependencies; then
  warn "Some dependencies are missing, will use fallback methods where possible"
fi

# STEP 1: Parse version components
step "Parsing version components"

# Extract version parts
if [[ "$NEW_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-b([0-9]+))?$ ]]; then
  VERSION_MAJOR="${BASH_REMATCH[1]}"
  VERSION_MINOR="${BASH_REMATCH[2]}"
  VERSION_PATCH="${BASH_REMATCH[3]}"
  BUILD_NUMBER="${BASH_REMATCH[5]:-51}"
  VERSION_BASE="${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}"
else
  warn "Could not parse version: $NEW_VERSION"
  VERSION_MAJOR=0; VERSION_MINOR=2; VERSION_PATCH=6; BUILD_NUMBER=51
  VERSION_BASE="$VERSION_MAJOR.$VERSION_MINOR.$VERSION_PATCH"
fi

info "Version: $VERSION_BASE (build $BUILD_NUMBER)"
verbose "Full version: $NEW_VERSION"
verbose "Major: $VERSION_MAJOR, Minor: $VERSION_MINOR, Patch: $VERSION_PATCH, Build: $BUILD_NUMBER"

# STEP 2: Update build-versions.json as the single source of truth
step "Creating version source of truth"

# Create build-versions.json
prog "Creating build-versions.json"
cat > "$VERSION_FILE" << EOF || fail "Failed to create build-versions.json"
{
  "version": "${NEW_VERSION}",
  "major": ${VERSION_MAJOR},
  "minor": ${VERSION_MINOR},
  "patch": ${VERSION_PATCH},
  "build": ${BUILD_NUMBER},
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "dev",
  "git": {
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "shortCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "timestamp": $(git log -1 --format=%ct 2>/dev/null || echo "$(date +%s)"),
    "tag": "$(git describe --tags --always 2>/dev/null || echo "")"
  }
}
EOF

ok "Created build-versions.json"

# STEP 3: Update files
step "Updating package files"

# Update package.json if it exists
if [ -f "$PROJECT_ROOT/package.json" ]; then
  prog "Updating package.json"
  
  if ! sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" "$PROJECT_ROOT/package.json"; then
    warn "Failed to update package.json"
  else
    ok "Updated package.json"
  fi
else
  warn "package.json not found at $PROJECT_ROOT/package.json"
fi

# Update pyproject.toml if it exists
if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  prog "Updating pyproject.toml"
  
  # More reliable pattern for poetry version
  if ! sed -i "s/^\(version = \)\"[^\"]*\"/\1\"${NEW_VERSION}\"/" "$PROJECT_ROOT/pyproject.toml"; then
    warn "Failed to update pyproject.toml"
  else
    ok "Updated pyproject.toml"
  fi
fi

# STEP 4: Update POM files
step "Updating Maven POM files"

# Check for xmlstarlet
if ! command -v xmlstarlet &>/dev/null; then
  warn "xmlstarlet not found, using fallback method for POM updates"
  use_xmlstarlet=false
else
  use_xmlstarlet=true
fi

# Find and update all POM files
pom_count=0; pom_updated=0
for pom_file in $(find "$PROJECT_ROOT" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
  pom_count=$((pom_count + 1))
  prog "Processing $pom_file"
  
  if [[ "$use_xmlstarlet" == "true" ]]; then
    # Use xmlstarlet for precise XML manipulation
    
    # Create temp file for error handling
    temp_file=$(mktemp)
    
    # 1. Check if the POM has a project/version tag
    if xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:version" "$pom_file" &> /dev/null; then
      # Update project version
      if xmlstarlet ed -L -N x="http://maven.apache.org/POM/4.0.0" -u "/x:project/x:version" -v "$VERSION_BASE" "$pom_file" 2>"$temp_file"; then
        verbose "Updated project version to $VERSION_BASE"
        pom_updated=$((pom_updated + 1))
      else
        warn "Failed to update project version in $pom_file: $(cat "$temp_file")"
      fi
    else
      verbose "No project version tag found in $pom_file, skipping project version update"
    fi
    
    # 2. Check if the POM has a skidbladnir.version property
    if xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:properties/x:skidbladnir.version" "$pom_file" &> /dev/null; then
      # Update skidbladnir.version property
      if xmlstarlet ed -L -N x="http://maven.apache.org/POM/4.0.0" -u "/x:project/x:properties/x:skidbladnir.version" -v "$VERSION_BASE" "$pom_file" 2>"$temp_file"; then
        verbose "Updated skidbladnir.version property to $VERSION_BASE"
      else
        warn "Failed to update skidbladnir.version property in $pom_file: $(cat "$temp_file")"
      fi
    else
      verbose "No skidbladnir.version property found in $pom_file, skipping property update"
    fi
    
    # Clean up temp file
    rm -f "$temp_file"
    
  else
    # Fallback for systems without xmlstarlet - more limited
    warn "Using limited sed-based POM update for $pom_file"
    
    # Only update top-level version tag (first occurrence)
    if sed -i "0,/<version>[^<]*<\/version>/{s/<version>[^<]*<\/version>/<version>${VERSION_BASE}<\/version>/}" "$pom_file"; then
      pom_updated=$((pom_updated + 1))
      verbose "Updated project version using sed fallback"
    else
      warn "Failed to update version in $pom_file using sed"
    fi
    
    # Try to update skidbladnir.version property if it exists
    if grep -q "<skidbladnir.version>" "$pom_file"; then
      if sed -i "s/<skidbladnir.version>[^<]*<\/skidbladnir.version>/<skidbladnir.version>${VERSION_BASE}<\/skidbladnir.version>/" "$pom_file"; then
        verbose "Updated skidbladnir.version property using sed fallback"
      else
        warn "Failed to update skidbladnir.version property in $pom_file using sed"
      fi
    fi
  fi
done

[ $pom_count -eq 0 ] && info "No POM files found" || ok "Updated $pom_updated of $pom_count POM files"

# STEP 5: Verify version consistency (if xmlstarlet is available)
if [[ "$use_xmlstarlet" == "true" ]] && [[ "$pom_count" -gt 0 ]]; then
  step "Verifying version consistency"
  
  inconsistencies=0
  for pom_file in $(find "$PROJECT_ROOT" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
    # Get the POM version
    pom_version=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:version" "$pom_file" 2>/dev/null || echo "")
    
    # Get the skidbladnir.version property
    property_version=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:properties/x:skidbladnir.version" "$pom_file" 2>/dev/null || echo "")
    
    # Check for inconsistencies
    if [[ -n "$pom_version" ]] && [[ "$pom_version" != "$VERSION_BASE" ]]; then
      warn "Version inconsistency in $pom_file: Expected $VERSION_BASE, got $pom_version"
      inconsistencies=$((inconsistencies + 1))
    fi
    
    if [[ -n "$property_version" ]] && [[ "$property_version" != "$VERSION_BASE" ]]; then
      warn "Property version inconsistency in $pom_file: Expected $VERSION_BASE, got $property_version"
      inconsistencies=$((inconsistencies + 1))
    fi
  done
  
  if [[ "$inconsistencies" -eq 0 ]]; then
    ok "All POM files have consistent versions"
  else
    warn "Found $inconsistencies version inconsistencies in POM files"
  fi
fi

ok "Version update complete"
print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0