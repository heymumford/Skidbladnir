#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Script to run UI workflow tests for provider combinations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/test-results/ui-workflow-tests"

# Ensure the test results directory exists
mkdir -p "$RESULTS_DIR"

# Parse command line arguments
PARALLEL=false
MAX_WORKERS=4
TAGS=("@ui" "@workflow")
SPECIFIC_PROVIDERS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --parallel)
      PARALLEL=true
      shift
      ;;
    --max-workers)
      MAX_WORKERS="$2"
      shift 2
      ;;
    --tags)
      TAGS=("$2")
      shift 2
      ;;
    --source)
      SOURCE_PROVIDER="$2"
      shift 2
      ;;
    --target)
      TARGET_PROVIDER="$2"
      shift 2
      ;;
    --html-report)
      GENERATE_HTML=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --parallel             Run tests in parallel"
      echo "  --max-workers N        Maximum number of parallel workers (default: 4)"
      echo "  --tags TAG             Only run scenarios with specific tags"
      echo "  --source PROVIDER      Specify source provider (for single combination)"
      echo "  --target PROVIDER      Specify target provider (for single combination)"
      echo "  --html-report          Generate HTML report"
      echo "  --help                 Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Display run configuration
echo "=== UI Workflow Test Configuration ==="
echo "Running in parallel: $PARALLEL"
if [ "$PARALLEL" = true ]; then
  echo "Max workers: $MAX_WORKERS"
fi
echo "Tags: ${TAGS[*]}"
if [ -n "$SOURCE_PROVIDER" ] && [ -n "$TARGET_PROVIDER" ]; then
  echo "Testing specific combination: $SOURCE_PROVIDER → $TARGET_PROVIDER"
fi
echo "======================================="

# If specific providers are specified, run just that combination
if [ -n "$SOURCE_PROVIDER" ] && [ -n "$TARGET_PROVIDER" ]; then
  echo "Running tests for combination: $SOURCE_PROVIDER → $TARGET_PROVIDER"
  
  REPORT_NAME="${SOURCE_PROVIDER}-to-${TARGET_PROVIDER}-report"
  JSON_REPORT="$RESULTS_DIR/${REPORT_NAME}.json"
  
  # Build the cucumber command
  CMD="npx cucumber-js"
  for tag in "${TAGS[@]}"; do
    CMD="$CMD --tags $tag"
  done
  
  CMD="$CMD --world-parameters '{\"sourceProvider\":\"$SOURCE_PROVIDER\",\"targetProvider\":\"$TARGET_PROVIDER\"}'"
  CMD="$CMD --format json:$JSON_REPORT"
  CMD="$CMD tests/acceptance/features/ui/provider-workflows.feature"
  
  # Run the command
  echo "Executing: $CMD"
  eval "$CMD"
  
  if [ "$GENERATE_HTML" = true ]; then
    echo "Generating HTML report..."
    npx cucumber-html-reporter \
      --input "$JSON_REPORT" \
      --output "$RESULTS_DIR/${REPORT_NAME}.html" \
      --theme bootstrap \
      --reportSuiteAsScenarios true \
      --launchReport true
  fi
else
  # Run all combinations using the TypeScript runner
  echo "Running all provider combinations..."
  
  NODE_ARGS=""
  if [ "$PARALLEL" = true ]; then
    NODE_ARGS="--parallel --max-workers $MAX_WORKERS"
  fi
  
  for tag in "${TAGS[@]}"; do
    NODE_ARGS="$NODE_ARGS --tags $tag"
  done
  
  # Use ts-node to run the test runner
  npx ts-node "$PROJECT_ROOT/tests/acceptance/support/ui-test-runner.ts" $NODE_ARGS
  
  if [ "$GENERATE_HTML" = true ]; then
    echo "Generating consolidated HTML report..."
    npx cucumber-html-reporter \
      --input "$RESULTS_DIR/summary-report.json" \
      --output "$RESULTS_DIR/consolidated-report.html" \
      --theme bootstrap \
      --reportSuiteAsScenarios true \
      --launchReport true
  fi
fi

echo "Tests completed. Results available in $RESULTS_DIR"