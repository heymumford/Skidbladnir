#!/bin/bash
# run-tests.sh - Run test suites for the project

set -e

PROJECT_ROOT=$(pwd)
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"

# Create output directory
mkdir -p "${TEST_RESULTS_DIR}"

echo "🧪 Running Skíðblaðnir test suites"

# Run unit tests for all packages in parallel
echo "🔬 Running unit tests..."
npm run test:unit -- --ci --coverage

# Run LLM advisor specific tests
echo "🧠 Running LLM advisor tests..."
cd "${PROJECT_ROOT}/packages/llm-advisor"
./run-tests-containerized.sh

# Run API integration tests
echo "🔌 Running API integration tests..."
cd "${PROJECT_ROOT}"
npm run test:integration

# Check test coverage
echo "📊 Checking test coverage..."
npm run coverage:check

# Run linting
echo "🧹 Linting code..."
npm run lint

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