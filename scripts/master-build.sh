#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# master-build.sh - Main orchestration script for Skíðblaðnir build pipeline

set -e

# Configuration
ENV=${1:-"qa"}  # Default to QA environment
CI_MODE=${2:-"false"}  # Running in CI or locally
SKIP_XML_CHECK=${3:-"false"}  # Skip XML validation/cleanup

# This script is now a wrapper around the centralized build orchestrator
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Build counter file
BUILD_COUNTER_FILE="${PROJECT_ROOT}/.build-counter"

# Initialize build counter if not exists
if [ ! -f "$BUILD_COUNTER_FILE" ]; then
  echo "1" > "$BUILD_COUNTER_FILE"
fi

# Read and increment build counter
BUILD_NUMBER=$(cat "$BUILD_COUNTER_FILE")
NEXT_BUILD_NUMBER=$((BUILD_NUMBER + 1))
echo "$NEXT_BUILD_NUMBER" > "$BUILD_COUNTER_FILE"

echo "🚀 Starting Skíðblaðnir master build #${BUILD_NUMBER} for ${ENV} environment"

# Run XML validation/cleanup every 10 builds or when explicitly requested
XML_CHECK_INTERVAL=10
if [ "$SKIP_XML_CHECK" != "true" ] && [ "$((BUILD_NUMBER % XML_CHECK_INTERVAL))" -eq 0 ]; then
  echo "🔍 Running XML validation and cleanup (build #${BUILD_NUMBER} is a multiple of ${XML_CHECK_INTERVAL})"
  "${SCRIPT_DIR}/util/xml-cleanup.sh" --fix --check-deps
elif [ "$SKIP_XML_CHECK" != "true" ] && [ -n "$XML_CHECK" ]; then
  echo "🔍 Running XML validation and cleanup (explicitly requested)"
  "${SCRIPT_DIR}/util/xml-cleanup.sh" --fix --check-deps
fi

echo "🔄 Delegating to unified build orchestrator..."

# Run the build orchestrator with appropriate flags for master build
PUSH_GIT="true"  # Master builds should always commit versions
VERBOSE="true"   # Master builds should be verbose

"${SCRIPT_DIR}/util/build-orchestrator.sh" "$ENV" "$CI_MODE" "$VERBOSE" "$PUSH_GIT"
BUILD_RESULT=$?

# Run GitHub CI locally if requested and build was successful
if [ "${CI_MODE}" == "true" ] && [ $BUILD_RESULT -eq 0 ]; then
  echo "🔧 Running GitHub CI locally with act..."
  act -j build
fi

# Display summary location
echo "📋 Build summary available at: ${PROJECT_ROOT}/logs/build-summary-latest.txt"

exit $BUILD_RESULT