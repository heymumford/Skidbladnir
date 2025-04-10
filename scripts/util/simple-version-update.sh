#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Simple version update script

# Color and tracking setup
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''
ERRORS=(); WARNINGS=()

# Set up script parameters
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
NEW_VERSION=${1:-"0.2.6-b51"}

# Output functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }

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

# Announce the process
echo -e "\n${BOLD}Skidbladnir Version Update${NC}"

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

# STEP 2: Update files
step "Updating files"

# Update package.json if it exists
if [ -f "$PROJECT_ROOT/package.json" ]; then
  prog "Updating package.json"
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" "$PROJECT_ROOT/package.json" || fail "Failed to update package.json"
else
  fail "package.json not found at $PROJECT_ROOT/package.json"
fi

# Update pyproject.toml if it exists
if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  prog "Updating pyproject.toml"
  sed -i "/\[tool\.poetry\]/,/\[.*\]/{s/version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/}" "$PROJECT_ROOT/pyproject.toml" || warn "Failed to update pyproject.toml"
fi

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

# STEP 3: Update POM files
step "Updating Maven POM files"

# Skip POM updates if xmlstarlet is not available
if ! command -v xmlstarlet &>/dev/null; then
  warn "xmlstarlet not found, skipping POM updates"
else
  # Find and update all POM files
  pom_count=0; pom_updated=0
  for pom_file in $(find "$PROJECT_ROOT" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo ""); do
    pom_count=$((pom_count + 1))
    prog "Updating $pom_file"
    
    # Update project version
    if xmlstarlet ed -L -N x="http://maven.apache.org/POM/4.0.0" -u "/x:project/x:version" -v "$VERSION_BASE" "$pom_file" 2>/dev/null; then
      pom_updated=$((pom_updated + 1))
      # Update skidbladnir.version property
      xmlstarlet ed -L -N x="http://maven.apache.org/POM/4.0.0" -u "/x:project/x:properties/x:skidbladnir.version" -v "$VERSION_BASE" "$pom_file" 2>/dev/null
    else
      warn "Failed to update version in $pom_file"
    fi
  done
  
  [ $pom_count -eq 0 ] && info "No POM files found" || ok "Updated $pom_updated of $pom_count POM files"
fi

ok "Version update complete"

print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0