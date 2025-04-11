#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#
# skidbladnir.sh - Master CLI for Skidbladnir project
#
# This script serves as a unified entry point for all Skidbladnir tools and utilities,
# providing a consistent interface for development, testing, building, and deployment.
#
# Usage: skidbladnir.sh [command] [subcommand] [options]
#

set -e

# Get the repository root directory
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  PROJECT_ROOT=$(git rev-parse --show-toplevel)
else
  SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
  PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")
fi

# Go to project root
cd "${PROJECT_ROOT}"

# Function to show usage information
show_usage() {
  echo "Skidbladnir - Unified Command Line Interface"
  echo ""
  echo "Usage: $0 [command] [subcommand] [options]"
  echo ""
  echo "Commands:"
  echo "  build     Build and package components"
  echo "  test      Run tests (unit, integration, etc.)"
  echo "  env       Manage environments (dev, qa, prod)"
  echo "  version   Manage version information"
  echo "  xml       XML validation and cleanup tools"
  echo "  help      Show this help message"
  echo ""
  echo "Run '$0 [command] --help' for more information on a command."
  echo ""
}

# Function to show version information
show_version() {
  VERSION=$(grep -o '"version": *"[^"]*"' package.json | awk -F'"' '{print $4}')
  echo "Skidbladnir v${VERSION}"
  echo "Copyright (C) 2025 Eric C. Mumford (@heymumford)"
  echo "This is free software: you can redistribute it and/or modify it under the terms of the MIT License."
}

# No arguments, show usage
if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

# Process command
COMMAND="$1"
shift

case "${COMMAND}" in
  "build" | "b")
    # Forward to build tools
    "${PROJECT_ROOT}/scripts/util/consolidated-build-tools.sh" "$@"
    ;;
    
  "test" | "t")
    # Forward to test tools
    "${PROJECT_ROOT}/scripts/util/consolidated-test-tools.sh" "$@"
    ;;
    
  "env" | "e")
    # Forward to environment tools
    "${PROJECT_ROOT}/scripts/util/consolidated-env-tools.sh" "$@"
    ;;
    
  "version" | "v")
    if [ $# -eq 0 ]; then
      show_version
    else
      # Forward to version tools
      "${PROJECT_ROOT}/scripts/util/consolidated-version-tools.sh" "$@"
    fi
    ;;
    
  "xml" | "x")
    # Forward to XML tools
    "${PROJECT_ROOT}/scripts/util/xml-tools.sh" "$@"
    ;;
    
  "help" | "--help" | "-h")
    show_usage
    ;;
    
  *)
    echo "Error: Unknown command '${COMMAND}'"
    echo "Run '$0 help' for usage information."
    exit 1
    ;;
esac

exit 0