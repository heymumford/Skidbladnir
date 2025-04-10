#!/bin/bash
#
# Script to run TDD metrics collection for all languages
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

# Create output directory
mkdir -p test-results/tdd-metrics

echo "Running TDD metrics collection for all languages..."

# 1. Run TypeScript tests with coverage
echo "Running TypeScript tests with coverage..."
npm run coverage:check || echo "Warning: TypeScript tests failed, but continuing with metrics collection"

# 2. Run Go tests with coverage
echo "Running Go tests with coverage..."
./scripts/run-go-coverage.sh || echo "Warning: Go coverage collection failed, but continuing with metrics collection"

# 3. Run Python tests with coverage
echo "Running Python tests with coverage..."
npm run test:py -- --coverage || echo "Warning: Python tests failed, but continuing with metrics collection"

# 4. Run unified TDD metrics analysis
echo "Running unified TDD metrics analysis..."
npx ts-node packages/tdd-metrics-tool/src/bin/tdd-metrics.ts \
  --all-languages \
  --source-paths internal pkg packages cmd \
  --test-paths tests internal/go cmd/binary-processor internal/python \
  --coverage-paths test-results/coverage test-results/go/coverage .coverage \
  --output test-results/tdd-metrics/unified-metrics.json

# 5. Generate visualization if requested
if [[ "$1" == "--visualize" ]]; then
  echo "Generating visualization..."
  mkdir -p test-results/tdd-metrics/visualization
  
  npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts \
    --report test-results/tdd-metrics/unified-metrics.json \
    --output test-results/tdd-metrics/visualization \
    --language-breakdown \
    --architectural-layers \
    --file-details \
    --interactive
    
  echo "Visualization generated at test-results/tdd-metrics/visualization"
fi

echo "TDD metrics analysis completed. Results saved to test-results/tdd-metrics/unified-metrics.json"
exit 0