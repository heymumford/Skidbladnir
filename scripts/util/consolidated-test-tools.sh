#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#
# consolidated-test-tools.sh
# 
# A unified test runner for all testing in the Skidbladnir project.
# This script combines functionality from various test scripts into a single tool.
#
# Usage: consolidated-test-tools.sh [command] [options]
#
# Commands:
#   all                Run all tests
#   unit               Run unit tests
#   integration        Run integration tests
#   domain             Run domain-specific tests
#   api                Run API tests
#   go                 Run Go tests
#   python             Run Python tests
#   typescript         Run TypeScript tests
#   coverage           Run test coverage analysis
#   report             Generate test reports
#   --help, -h         Show this help
#
# Options:
#   --env=ENV          Set environment (dev, qa, prod)
#   --verbose          Enable verbose output
#   --no-cleanup       Don't clean up containers after tests
#   --visualize        Generate visualization for coverage reports
#

set -e

# Get the repository root directory
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  PROJECT_ROOT=$(git rev-parse --show-toplevel)
else
  SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
  PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/../..")
fi

# Go to project root
cd "${PROJECT_ROOT}"

# Default values
COMMAND=${1:-"all"}
VERBOSE=0
ENV="dev"
CLEANUP=1
VISUALIZE=0
RESOURCE_CONSTRAINED=false
SKIP_INTEGRATION=false
SKIP_LLM_TESTS=false
SKIP_SLOW=false

# Process arguments
shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      ENV="${1#*=}"
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --no-cleanup)
      CLEANUP=0
      shift
      ;;
    --visualize)
      VISUALIZE=1
      shift
      ;;
    --resource-constrained)
      RESOURCE_CONSTRAINED=true
      shift
      ;;
    --skip-integration)
      SKIP_INTEGRATION=true
      shift
      ;;
    --skip-llm)
      SKIP_LLM_TESTS=true
      shift
      ;;
    --skip-slow)
      SKIP_SLOW=true
      shift
      ;;
    --help|-h)
      echo "Skidbladnir Test Runner"
      echo ""
      echo "Usage: $0 [command] [options]"
      echo ""
      echo "Commands:"
      echo "  all                Run all tests (default)"
      echo "  unit               Run unit tests"
      echo "  integration        Run integration tests"
      echo "  domain             Run domain-specific tests"
      echo "  api                Run API tests"
      echo "  go                 Run Go tests"
      echo "  python             Run Python tests"
      echo "  typescript         Run TypeScript tests"
      echo "  coverage           Run test coverage analysis"
      echo "  report             Generate test reports"
      echo ""
      echo "Options:"
      echo "  --env=ENV          Set environment (dev, qa, prod)"
      echo "  --verbose          Enable verbose output"
      echo "  --no-cleanup       Don't clean up containers after tests"
      echo "  --visualize        Generate visualization for coverage reports"
      echo "  --resource-constrained  Reduce resource usage"
      echo "  --skip-integration Skip integration tests"
      echo "  --skip-llm         Skip LLM tests"
      echo "  --skip-slow        Skip slow tests"
      echo ""
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# Setup test results directory
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"
mkdir -p "${TEST_RESULTS_DIR}"

# Print test run banner
print_banner() {
  local title="$1"
  echo ""
  echo "==================================================="
  echo "  ${title}"
  echo "==================================================="
  echo ""
}

# Function to run TypeScript unit tests
run_typescript_unit_tests() {
  print_banner "🧪 Running TypeScript Unit Tests"
  
  if [ "${VERBOSE}" -eq 1 ]; then
    npm run test:unit -- --verbose
  else
    npm run test:unit
  fi
}

# Function to run TypeScript integration tests
run_typescript_integration_tests() {
  if [ "${SKIP_INTEGRATION}" == "true" ]; then
    echo "⏩ Skipping TypeScript integration tests"
    return 0
  fi
  
  print_banner "🔌 Running TypeScript Integration Tests"
  
  local options=""
  if [ "${VERBOSE}" -eq 1 ]; then
    options="--verbose"
  fi
  
  npx jest --testPathPattern='tests/integration' \
    --config=jest.config.js \
    --runInBand \
    --ci \
    --forceExit \
    --json --outputFile="${TEST_RESULTS_DIR}/integration/results.json" \
    ${options}
}

# Function to run domain-specific tests
run_domain_tests() {
  print_banner "🧠 Running Domain Entity Tests"
  
  mkdir -p "${TEST_RESULTS_DIR}/domain"
  
  local options=""
  if [ "${VERBOSE}" -eq 1 ]; then
    options="--verbose"
  fi
  
  npx jest ${options} --config=jest.config.js \
    tests/unit/domain/entities/EntityValidationRules.test.ts \
    tests/unit/domain/entities/TestCaseFactory.test.ts \
    tests/unit/domain/entities/EntityRelationships.test.ts \
    tests/unit/domain/repositories/ValidatedTestCaseRepository.test.ts \
    tests/unit/domain/services/TestCaseService.test.ts \
    tests/unit/domain/services/TestSuiteService.test.ts
}

# Function to run Python tests
run_python_tests() {
  print_banner "🐍 Running Python Tests"
  
  local test_results_dir="${TEST_RESULTS_DIR}/python"
  mkdir -p "${test_results_dir}"
  
  # Set environment variables
  export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"
  export RESOURCE_CONSTRAINED="${RESOURCE_CONSTRAINED}"
  export SKIP_LLM_TESTS="${SKIP_LLM_TESTS}"
  export TEST_ENV="test"
  
  local pytest_options="-v"
  if [ "${SKIP_SLOW}" == "true" ]; then
    pytest_options="${pytest_options} -k 'not slow'"
  fi
  if [ "${SKIP_LLM_TESTS}" == "true" ]; then
    pytest_options="${pytest_options} -k 'not llm'"
  fi
  
  # Run unit tests
  echo "🧪 Running Python unit tests..."
  python -m pytest -c config/pytest.ini tests/unit/python \
    ${pytest_options} \
    --junitxml="${test_results_dir}/unit-results.xml" \
    --cov=internal/python \
    --cov-report=term \
    --cov-report=html:"${test_results_dir}/coverage" \
    --cov-report=xml:"${test_results_dir}/coverage.xml"
  
  # Run integration tests (if not skipped)
  if [ "${SKIP_INTEGRATION}" != "true" ]; then
    echo "🔌 Running Python integration tests..."
    python -m pytest -c config/pytest.ini tests/integration/python \
      ${pytest_options} \
      --junitxml="${test_results_dir}/integration-results.xml"
  else
    echo "⏩ Skipping Python integration tests"
  fi
  
  # Generate combined report
  echo "📊 Generating Python test report..."
  python -c "
import json
import os
import xml.etree.ElementTree as ET

# Parse unit test results
unit_xml = ET.parse('${test_results_dir}/unit-results.xml')
unit_results = unit_xml.getroot()
unit_passed = len(unit_results.findall('.//testcase[not(.//failure)]'))
unit_failed = len(unit_results.findall('.//testcase/failure/..'))
unit_skipped = len(unit_results.findall('.//testcase/skipped/..'))
unit_total = unit_passed + unit_failed + unit_skipped

report = {
    'unit_tests': {
        'passed': unit_passed,
        'failed': unit_failed,
        'skipped': unit_skipped,
        'total': unit_total
    }
}

# Parse integration test results if they exist
int_xml_path = '${test_results_dir}/integration-results.xml'
if os.path.exists(int_xml_path):
    int_xml = ET.parse(int_xml_path)
    int_results = int_xml.getroot()
    int_passed = len(int_results.findall('.//testcase[not(.//failure)]'))
    int_failed = len(int_results.findall('.//testcase/failure/..'))
    int_skipped = len(int_results.findall('.//testcase/skipped/..'))
    int_total = int_passed + int_failed + int_skipped
    
    report['integration_tests'] = {
        'passed': int_passed,
        'failed': int_failed,
        'skipped': int_skipped,
        'total': int_total
    }

# Write report
with open('${test_results_dir}/summary.json', 'w') as f:
    json.dump(report, f, indent=2)

# Print summary
print('\nPython Test Summary:')
print('-------------------')
print(f'Unit Tests: {unit_passed}/{unit_total} passed, {unit_failed} failed, {unit_skipped} skipped')
if 'integration_tests' in report:
    print(f'Integration Tests: {int_passed}/{int_total} passed, {int_failed} failed, {int_skipped} skipped')
"
}

# Function to run Go tests and coverage
run_go_tests() {
  print_banner "🔍 Running Go Tests"
  
  # Create coverage output directory
  mkdir -p test-results/go/coverage
  
  local go_test_options=""
  if [ "${VERBOSE}" -eq 1 ]; then
    go_test_options="-v"
  fi
  
  # Run tests with coverage for all Go code
  GO_PACKAGES=(
    "./internal/go/binary-processor/..."
    "./internal/go/common/..."
    "./cmd/binary-processor/..."
  )
  
  # Create a unified coverage file for the TDD metrics tool
  UNIFIED_COVERAGE_FILE="${TEST_RESULTS_DIR}/go/coverage/coverage.out"
  echo "mode: atomic" > "${UNIFIED_COVERAGE_FILE}"
  
  for package in "${GO_PACKAGES[@]}"; do
    package_name=$(echo "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
    echo "Testing package: $package_name"
    
    # Run go test with coverage
    cd "${PROJECT_ROOT}"
    package_dir=$(dirname "$package" | sed 's/\.\///g' | sed 's/\/\.\.\.//g')
    if [[ -d "$package_dir" ]]; then
      cd "$package_dir"
      
      coverage_file="${TEST_RESULTS_DIR}/go/coverage/$(echo "$package_name" | tr / _).coverage.out"
      
      # Run test with coverage
      if go test ${go_test_options} -coverprofile="${coverage_file}" -covermode=atomic ./...; then
        # If tests succeed, calculate coverage percentage
        if [ -f "${coverage_file}" ]; then
          coverage_output=$(go tool cover -func="${coverage_file}")
          total_coverage=$(echo "$coverage_output" | grep "total:" | awk '{print $3}' | sed 's/%//g')
          
          # Display coverage
          echo "Coverage for $package_name: $total_coverage%"
          
          # Generate HTML report
          html_report="${TEST_RESULTS_DIR}/go/coverage/$(echo "$package_name" | tr / _).coverage.html"
          go tool cover -html="${coverage_file}" -o "${html_report}"
          
          # Add to unified coverage file
          tail -n +2 "${coverage_file}" >> "${UNIFIED_COVERAGE_FILE}"
        else
          echo "Warning: No coverage file generated for $package_name"
        fi
      else
        echo "Warning: Tests failed for $package_name, skipping coverage analysis"
        # Create an empty coverage file to avoid errors later
        echo "mode: atomic" > "${coverage_file}"
      fi
    else
      echo "⚠️ Package directory $package_dir not found, skipping"
    fi
  done
  
  echo "Go test coverage completed."
  
  # Run TDD metrics analysis if requested
  if [ "${VISUALIZE}" -eq 1 ]; then
    echo "Running TDD metrics analysis..."
    
    npx ts-node packages/tdd-metrics-tool/src/bin/tdd-metrics.ts \
      --language go \
      --source-paths internal/go cmd/binary-processor \
      --test-paths internal/go cmd/binary-processor \
      --coverage-paths test-results/go/coverage \
      --output test-results/tdd-metrics/go-metrics.json
    
    echo "Go TDD metrics analysis completed. Results saved to test-results/tdd-metrics/go-metrics.json"
    
    # Generate visualization
    echo "Generating visualization..."
    npx ts-node packages/tdd-metrics-tool/src/bin/visualize-coverage.ts \
      --report test-results/tdd-metrics/go-metrics.json \
      --output test-results/tdd-metrics/visualization \
      --language-breakdown \
      --file-details \
      --interactive
    echo "Visualization generated at test-results/tdd-metrics/visualization"
  fi
}

# Function to run API tests
run_api_tests() {
  print_banner "🔌 Running API Tests"
  
  KARATE_DIR="${PROJECT_ROOT}/tests/api-integration"
  
  # Check if Maven is installed
  if ! command -v mvn &> /dev/null; then
    echo "Maven is required to run Karate tests. Please install Maven first."
    return 1
  fi
  
  # Check if Java is installed
  if ! command -v java &> /dev/null; then
    echo "Java is required to run Karate tests. Please install Java 11 or higher."
    return 1
  fi
  
  echo "Running Karate API tests with environment: ${ENV}"
  
  # Run the tests
  cd "${KARATE_DIR}"
  mvn clean test -Dkarate.env="${ENV}"
  
  # Check if tests were successful
  if [ $? -eq 0 ]; then
    echo "API tests completed successfully!"
    echo "Report available at: ${KARATE_DIR}/target/cucumber-reports/"
  else
    echo "API tests failed. Check the logs for details."
    return 1
  fi
}

# Function to run the integration test environment
run_integration_environment() {
  if [ "${ENV}" = "dev" ]; then
    echo "🚀 Using local development services"
    export USE_MOCKS="true"
    return 0
  fi
  
  echo "🚀 Starting containers for ${ENV} environment..."
  export USE_MOCKS="false"
  
  # Determine the compose file based on environment
  case "${ENV}" in
    "qa")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/qa/podman-compose.yml"
      ;;
    "prod")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/prod/podman-compose.yml"
      ;;
    *)
      echo "❌ Unknown environment: ${ENV}"
      return 1
      ;;
  esac
  
  # Check if containers are already running
  CONTAINERS_RUNNING=$(podman ps --format '{{.Names}}' | grep -c "testbridge" || echo "0")
  
  if [ "${CONTAINERS_RUNNING}" -eq "0" ]; then
    echo "🐳 Starting containers..."
    podman-compose -f "${COMPOSE_FILE}" up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    TIMEOUT=60
    START_TIME=$(date +%s)
    
    while true; do
      CURRENT_TIME=$(date +%s)
      ELAPSED_TIME=$((CURRENT_TIME - START_TIME))
      
      if [ "${ELAPSED_TIME}" -gt "${TIMEOUT}" ]; then
        echo "❌ Timeout reached waiting for healthy services"
        podman-compose -f "${COMPOSE_FILE}" ps
        return 1
      fi
      
      # Check container health using podman
      UNHEALTHY_COUNT=$(podman ps --filter "name=testbridge" --format "{{.Status}}" | grep -v "healthy" | wc -l)
      
      if [ "${UNHEALTHY_COUNT}" -eq 0 ]; then
        echo "✅ All services are healthy!"
        break
      fi
      
      echo "🔄 Waiting for services to be ready... (${ELAPSED_TIME}s elapsed)"
      sleep 5
    done
  else
    echo "✅ Containers already running"
  fi
}

# Function to clean up the integration environment
cleanup_integration_environment() {
  if [ "${ENV}" = "dev" ] || [ "${CLEANUP}" -eq 0 ]; then
    return 0
  fi
  
  echo "🧹 Stopping containers..."
  
  # Determine the compose file based on environment
  case "${ENV}" in
    "qa")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/qa/podman-compose.yml"
      ;;
    "prod")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/prod/podman-compose.yml"
      ;;
    *)
      echo "❌ Unknown environment: ${ENV}"
      return 1
      ;;
  esac
  
  podman-compose -f "${COMPOSE_FILE}" down
}

# Function to run all tests
run_all_tests() {
  print_banner "🧪 Running All Skidbladnir Tests"
  
  # Run TypeScript unit tests
  run_typescript_unit_tests
  
  # Run domain tests
  run_domain_tests
  
  # Run Python tests
  run_python_tests
  
  # Run Go tests
  run_go_tests
  
  # Setup integration environment if needed
  run_integration_environment
  
  # Run TypeScript integration tests
  run_typescript_integration_tests
  
  # Run API tests
  run_api_tests
  
  # Cleanup if needed
  cleanup_integration_environment
  
  print_banner "✅ All Tests Completed"
  echo "Results Directory: ${TEST_RESULTS_DIR}"
}

# Function to generate test reports
generate_test_reports() {
  print_banner "📊 Generating Test Reports"
  
  # Create report directory
  mkdir -p "${TEST_RESULTS_DIR}/reports"
  
  # Generate consolidated report
  if [ -f "scripts/generate-test-report.js" ]; then
    node scripts/generate-test-report.js
  fi
  
  echo "✅ Test reports generated in ${TEST_RESULTS_DIR}/reports"
}

# Main command execution
case "${COMMAND}" in
  "all")
    run_all_tests
    generate_test_reports
    ;;
  "unit")
    run_typescript_unit_tests
    run_domain_tests
    run_python_tests
    run_go_tests
    ;;
  "integration")
    run_integration_environment
    run_typescript_integration_tests
    cleanup_integration_environment
    ;;
  "domain")
    run_domain_tests
    ;;
  "api")
    run_integration_environment
    run_api_tests
    cleanup_integration_environment
    ;;
  "go")
    run_go_tests
    ;;
  "python")
    run_python_tests
    ;;
  "typescript")
    run_typescript_unit_tests
    run_typescript_integration_tests
    ;;
  "coverage")
    # Run coverage for each language
    run_go_tests
    run_python_tests
    run_typescript_unit_tests
    ;;
  "report")
    generate_test_reports
    ;;
  *)
    echo "Error: Unknown command '${COMMAND}'"
    echo "Use --help for usage information."
    exit 1
    ;;
esac

exit 0