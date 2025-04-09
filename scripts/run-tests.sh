#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

#!/bin/bash
# run-tests.sh - Run test suites for the project

set -e

PROJECT_ROOT=$(pwd)
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"

# Create output directory
mkdir -p "${TEST_RESULTS_DIR}"

echo "🧪 Running Skíðblaðnir test suites"

# Run tests by component with specific environment setup for each language
echo "🔬 Running TypeScript tests..."
npm run test:ts

echo "🔬 Running Python tests..."
npm run test:py

echo "🔬 Running Go tests..."
npm run test:go

# Run integration tests 
echo "🔌 Running integration tests..."
npm run test:integration

# Check test coverage
echo "📊 Checking test coverage..."
npm run coverage:check

# Run linting for all components
echo "🧹 Linting code..."
npm run lint:ts
npm run lint:py
npm run lint:go

# Run type checking
echo "🔍 Running type checks..."
npm run typecheck

# Generate test report
echo "📝 Generating test reports..."
npm run test:report

echo "✅ All tests completed successfully"

# Display summary
echo "📋 Test Summary:"
echo "  - Results Directory: ${TEST_RESULTS_DIR}"
echo "  - Coverage Report: ${TEST_RESULTS_DIR}/coverage/index.html"
echo "  - Test Report: ${TEST_RESULTS_DIR}/test-report.html"