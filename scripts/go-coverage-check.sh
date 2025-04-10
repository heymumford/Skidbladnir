#!/bin/bash
#
# Script to check Go test coverage against unified thresholds
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.

set -e

# Get the project root directory
ROOT_DIR=$(git rev-parse --show-toplevel || pwd)
cd "$ROOT_DIR"

# Load coverage thresholds from unified configuration
COVERAGE_THRESHOLDS_FILE="$ROOT_DIR/config/coverage-thresholds.json"
if [[ ! -f "$COVERAGE_THRESHOLDS_FILE" ]]; then
  echo "Error: Coverage thresholds file not found at $COVERAGE_THRESHOLDS_FILE"
  exit 1
fi

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required for parsing coverage thresholds"
  echo "Please install jq:  sudo apt-get install jq"
  exit 1
fi

# Extract Go coverage thresholds
OVERALL_THRESHOLD=$(jq -r '.go.overall.lines' "$COVERAGE_THRESHOLDS_FILE")
BINARY_PROCESSOR_THRESHOLD=$(jq -r '.go.["internal/go/binary-processor"].lines' "$COVERAGE_THRESHOLDS_FILE")
COMMON_THRESHOLD=$(jq -r '.go.["internal/go/common"].lines' "$COVERAGE_THRESHOLDS_FILE")

# Default thresholds in case JSON parsing fails
if [[ -z "$OVERALL_THRESHOLD" ]]; then
  OVERALL_THRESHOLD=80
fi
if [[ -z "$BINARY_PROCESSOR_THRESHOLD" ]]; then
  BINARY_PROCESSOR_THRESHOLD=85
fi
if [[ -z "$COMMON_THRESHOLD" ]]; then
  COMMON_THRESHOLD=90
fi

# Create coverage output directory
mkdir -p test-results/go/coverage

echo "Running Go tests with coverage..."

# Run tests with coverage for all Go code
GO_PACKAGES=(
  "./internal/go/binary-processor/..."
  "./internal/go/common/..."
  "./cmd/binary-processor/..."
)

for package in "${GO_PACKAGES[@]}"; do
  package_name=$(echo "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
  echo "Testing package: $package_name"
  
  # Determine threshold based on package
  threshold=$OVERALL_THRESHOLD
  if [[ "$package_name" == *"binary-processor"* ]]; then
    threshold=$BINARY_PROCESSOR_THRESHOLD
  elif [[ "$package_name" == *"common"* ]]; then
    threshold=$COMMON_THRESHOLD
  fi
  
  # Run go test with coverage
  cd "$ROOT_DIR"
  package_dir=$(dirname "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
  if [[ -d "$package_dir" ]]; then
    cd "$package_dir"
    
    coverage_file="$ROOT_DIR/test-results/go/coverage/$(echo "$package_name" | tr / _).coverage.out"
    
    # Run test with coverage
    go test -coverprofile="$coverage_file" -covermode=atomic ./...
    
    # Calculate coverage percentage
    coverage_output=$(go tool cover -func="$coverage_file")
    total_coverage=$(echo "$coverage_output" | grep "total:" | awk '{print $3}' | sed 's/%//g')
    
    # Compare with threshold
    echo "Coverage for $package_name: $total_coverage% (threshold: $threshold%)"
    if (( $(echo "$total_coverage < $threshold" | bc -l) )); then
      echo "❌ Coverage is below threshold!"
      exit 1
    else
      echo "✅ Coverage meets or exceeds threshold"
    fi
    
    # Generate HTML report
    html_report="$ROOT_DIR/test-results/go/coverage/$(echo "$package_name" | tr / _).coverage.html"
    go tool cover -html="$coverage_file" -o "$html_report"
  else
    echo "⚠️ Package directory $package_dir not found, skipping"
  fi
done

echo "✅ All Go packages pass coverage thresholds"
exit 0