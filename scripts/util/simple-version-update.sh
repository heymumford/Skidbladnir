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

# Simple version update script
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
NEW_VERSION=${1:-"0.2.6-b51"}

echo "Updating to version: $NEW_VERSION"

# Extract major.minor.patch without build number for POM files
if [[ "$NEW_VERSION" =~ ^([0-9]+\.[0-9]+\.[0-9]+) ]]; then
  VERSION_BASE="${BASH_REMATCH[1]}"
else
  VERSION_BASE="$NEW_VERSION"
fi

# Extract parts for version file
VERSION_MAJOR=$(echo "$NEW_VERSION" | cut -d. -f1)
VERSION_MINOR=$(echo "$NEW_VERSION" | cut -d. -f2)

# Extract patch and build
PATCH_PART=$(echo "$NEW_VERSION" | cut -d. -f3)
if [[ "$PATCH_PART" =~ ^([0-9]+)-b([0-9]+)$ ]]; then
  VERSION_PATCH="${BASH_REMATCH[1]}"
  BUILD_NUMBER="${BASH_REMATCH[2]}"
else
  VERSION_PATCH="$PATCH_PART"
  BUILD_NUMBER="51"
fi

echo "Version parts: Major=$VERSION_MAJOR, Minor=$VERSION_MINOR, Patch=$VERSION_PATCH, Build=$BUILD_NUMBER"

# Update package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" "$PROJECT_ROOT/package.json"
echo "Updated package.json"

# Update pyproject.toml if it exists
if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  # Only update the version in the [tool.poetry] section to avoid updating python_version in mypy
  sed -i "/\[tool\.poetry\]/,/\[.*\]/{s/version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/}" "$PROJECT_ROOT/pyproject.toml"
  echo "Updated pyproject.toml"
fi

# Update version file
echo "Updating build-versions.json"
cat > "$VERSION_FILE" << EOF
{
  "version": "${NEW_VERSION}",
  "major": ${VERSION_MAJOR},
  "minor": ${VERSION_MINOR},
  "patch": ${VERSION_PATCH},
  "build": ${BUILD_NUMBER},
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "dev",
  "git": {
    "branch": "$(git rev-parse --abbrev-ref HEAD)",
    "commit": "$(git rev-parse HEAD)",
    "shortCommit": "$(git rev-parse --short HEAD)",
    "timestamp": $(git log -1 --format=%ct),
    "tag": "$(git describe --tags --always 2>/dev/null || echo "")"
  }
}
EOF

# Update POM file(s) if xmlstarlet is available
if command -v xmlstarlet &> /dev/null; then
  echo "Updating POM files to version: $VERSION_BASE"
  
  find "$PROJECT_ROOT" -name "pom.xml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r pom_file; do
    echo "Updating $pom_file"
    
    # Update project version
    xmlstarlet ed -L \
      -N x="http://maven.apache.org/POM/4.0.0" \
      -u "/x:project/x:version" \
      -v "$VERSION_BASE" \
      "$pom_file" 2>/dev/null || true
      
    # Update skidbladnir.version property
    xmlstarlet ed -L \
      -N x="http://maven.apache.org/POM/4.0.0" \
      -u "/x:project/x:properties/x:skidbladnir.version" \
      -v "$VERSION_BASE" \
      "$pom_file" 2>/dev/null || true
  done
else
  echo "xmlstarlet not found, skipping POM updates"
fi

echo "Version update complete: $NEW_VERSION"