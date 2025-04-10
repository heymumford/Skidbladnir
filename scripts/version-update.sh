#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Simplified version updater wrapper

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# Parse arguments
ACTION="build" # Default
BUILD_ONLY=true
PUSH_GIT=false
CURRENT_VERSION=""

# Get current version from package.json
get_current_version() {
  if [ -f "${SCRIPT_DIR}/../package.json" ]; then
    CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' "${SCRIPT_DIR}/../package.json" | cut -d'"' -f4)
    echo "$CURRENT_VERSION"
  else
    echo "0.2.6-b52" # Fallback
  fi
}

# Show help
show_help() {
  echo "Skidbladnir Version Update Utility"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -m, --major          Bump major version"
  echo "  -n, --minor          Bump minor version"
  echo "  -p, --patch          Bump patch version"
  echo "  -b, --build          Bump build number only (default)"
  echo "  -v, --version VER    Set specific version (format: X.Y.Z-bN)"
  echo "  -g, --push-git       Commit changes to Git"
  echo "  -h, --help           Show this help"
  echo ""
  echo "Examples:"
  echo "  $0                      # Increment build number only"
  echo "  $0 -p                   # Bump patch version"
  echo "  $0 -v 1.0.0-b50         # Set specific version"
  echo "  $0 -b -g                # Bump build, commit and push"
}

# Process arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--major)
      ACTION="major"
      BUILD_ONLY=false
      shift
      ;;
    -n|--minor)
      ACTION="minor"
      BUILD_ONLY=false
      shift
      ;;
    -p|--patch)
      ACTION="patch"
      BUILD_ONLY=false
      shift
      ;;
    -b|--build)
      ACTION="build"
      BUILD_ONLY=true
      shift
      ;;
    -v|--version)
      ACTION="specific"
      VERSION_ARG="$2"
      shift 2
      ;;
    -g|--push-git)
      PUSH_GIT=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Get current version
CURRENT_VERSION=$(get_current_version)
echo "Current version: $CURRENT_VERSION"

# Determine new version
if [ "$ACTION" = "specific" ]; then
  NEW_VERSION="$VERSION_ARG"
else
  # Parse current version
  if [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-b([0-9]+))?$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    BUILD="${BASH_REMATCH[5]}"
    
    # Default build to 50 if not specified
    if [ -z "$BUILD" ]; then
      BUILD=50
    fi
    
    # Update version based on action
    if [ "$ACTION" = "major" ]; then
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "minor" ]; then
      MINOR=$((MINOR + 1))
      PATCH=0
      BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "patch" ]; then
      PATCH=$((PATCH + 1))
      BUILD=$((BUILD + 1))
    elif [ "$ACTION" = "build" ]; then
      BUILD=$((BUILD + 1))
    fi
    
    # Ensure build number is at least 50
    if [ "$BUILD" -lt 50 ]; then
      BUILD=50
    fi
    
    # Construct new version
    NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-b${BUILD}"
  else
    echo "Could not parse current version: $CURRENT_VERSION"
    echo "Using default version: 0.2.6-b52"
    NEW_VERSION="0.2.6-b52"
  fi
fi

echo "Updating to version: $NEW_VERSION"

# Update version files
"${SCRIPT_DIR}/util/simple-version-update.sh" "$NEW_VERSION"

# Commit if requested
if [ "$PUSH_GIT" = true ]; then
  cd "${SCRIPT_DIR}/.."
  
  # Create commit message based on update type
  if [ "$BUILD_ONLY" = true ]; then
    COMMIT_MSG="chore: Bump build number to ${NEW_VERSION}"
  else
    COMMIT_MSG="chore: Update version to ${NEW_VERSION}"
  fi
  
  echo "Committing changes with message: $COMMIT_MSG"
  git add package.json pyproject.toml build-versions.json $(find . -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*")
  git commit -m "$COMMIT_MSG"
  git push origin "$(git rev-parse --abbrev-ref HEAD)"
  
  echo "Version changes committed and pushed"
fi