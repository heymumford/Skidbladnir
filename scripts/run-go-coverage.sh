#!/bin/bash
#
# Script to run Go test coverage and integrate with TDD metrics tool
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

# Create coverage output directory
mkdir -p test-results/go/coverage

echo "Running Go tests with coverage..."

# Run tests with coverage for all Go code
GO_PACKAGES=(
  "./internal/go/binary-processor/..."
  "./internal/go/common/..."
  "./cmd/binary-processor/..."
)

# Create a unified coverage file for the TDD metrics tool
UNIFIED_COVERAGE_FILE="$ROOT_DIR/test-results/go/coverage/coverage.out"
echo "mode: atomic" > "$UNIFIED_COVERAGE_FILE"

for package in "${GO_PACKAGES[@]}"; do
  package_name=$(echo "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
  echo "Testing package: $package_name"
  
  # Run go test with coverage
  cd "$ROOT_DIR"
  package_dir=$(dirname "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
  if [[ -d "$package_dir" ]]; then
    cd "$package_dir"
    
    coverage_file="$ROOT_DIR/test-results/go/coverage/$(echo "$package_name" | tr / _).coverage.out"
    
    # Run test with coverage
    if go test -coverprofile="$coverage_file" -covermode=atomic ./...; then
      # If tests succeed, calculate coverage percentage
      if [ -f "$coverage_file" ]; then
        coverage_output=$(go tool cover -func="$coverage_file")
        total_coverage=$(echo "$coverage_output" | grep "total:" | awk '{print $3}' | sed 's/%//g')
        
        # Display coverage
        echo "Coverage for $package_name: $total_coverage%"
        
        # Generate HTML report
        html_report="$ROOT_DIR/test-results/go/coverage/$(echo "$package_name" | tr / _).coverage.html"
        go tool cover -html="$coverage_file" -o "$html_report"
        
        # Add to unified coverage file
        tail -n +2 "$coverage_file" >> "$UNIFIED_COVERAGE_FILE"
      else
        echo "Warning: No coverage file generated for $package_name"
      fi
    else
      echo "Warning: Tests failed for $package_name, skipping coverage analysis"
      # Create an empty coverage file to avoid errors later
      echo "mode: atomic" > "$coverage_file"
    fi
  else
    echo "⚠️ Package directory $package_dir not found, skipping"
  fi
done

echo "Go test coverage completed."
echo "Running TDD metrics analysis..."

# Run TDD metrics tool for Go language using the collected coverage data
cd "$ROOT_DIR"
npx ts-node packages/tdd-metrics-tool/src/bin/tdd-metrics.ts \
  --language go \
  --source-paths internal/go cmd/binary-processor \
  --test-paths internal/go cmd/binary-processor \
  --coverage-paths test-results/go/coverage \
  --output test-results/tdd-metrics/go-metrics.json

echo "Go TDD metrics analysis completed. Results saved to test-results/tdd-metrics/go-metrics.json"

# Generate visualization if requested
if [[ "$1" == "--visualize" ]]; then
  echo "Generating visualization..."
  npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts \
    --report test-results/tdd-metrics/go-metrics.json \
    --output test-results/tdd-metrics/visualization \
    --language-breakdown \
    --file-details \
    --interactive
  echo "Visualization generated at test-results/tdd-metrics/visualization"
fi

exit 0