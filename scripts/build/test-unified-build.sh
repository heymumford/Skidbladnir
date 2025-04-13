#!/bin/bash
#
# test-unified-build.sh - Test suite for the unified build script
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -eo pipefail

# Define colors for test output
COLOR_GREEN="\033[0;32m"   # Green for passed tests
COLOR_RED="\033[0;31m"     # Red for failed tests
COLOR_YELLOW="\033[0;33m"  # Yellow for warnings/skipped
COLOR_BLUE="\033[0;34m"    # Blue for info
COLOR_RESET="\033[0m"      # Reset color

# Detect script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="${SCRIPT_DIR}/unified-build.sh"
TEST_TMP_DIR="/tmp/unified-build-test-$(date +%s)"
TEST_LOG_FILE="${TEST_TMP_DIR}/test.log"

# Ensure build script exists
if [ ! -f "${BUILD_SCRIPT}" ]; then
  echo -e "${COLOR_RED}Error: Build script not found at ${BUILD_SCRIPT}${COLOR_RESET}"
  exit 1
fi

# Create temporary test directory
mkdir -p "${TEST_TMP_DIR}"

# Track test statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to print test results
print_test_results() {
  echo
  echo -e "${COLOR_BLUE}===== Test Results =====${COLOR_RESET}"
  echo -e "Total tests: ${TOTAL_TESTS}"
  echo -e "${COLOR_GREEN}Passed: ${PASSED_TESTS}${COLOR_RESET}"
  echo -e "${COLOR_RED}Failed: ${FAILED_TESTS}${COLOR_RESET}"
  echo -e "${COLOR_YELLOW}Skipped: ${SKIPPED_TESTS}${COLOR_RESET}"
  echo
  
  if [ ${FAILED_TESTS} -eq 0 ]; then
    echo -e "${COLOR_GREEN}All tests passed!${COLOR_RESET}"
    exit 0
  else
    echo -e "${COLOR_RED}Some tests failed.${COLOR_RESET}"
    exit 1
  fi
}

# Function for cleanup on exit
cleanup() {
  echo -e "${COLOR_BLUE}Cleaning up test environment...${COLOR_RESET}"
  rm -rf "${TEST_TMP_DIR}"
}

# Register cleanup function to run on exit
trap cleanup EXIT

# Function to run a test
# $1: Test name
# $2: Test function name
run_test() {
  local test_name="$1"
  local test_function="$2"
  
  echo -e "${COLOR_BLUE}Running test: ${test_name}${COLOR_RESET}"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  # Run the test function
  if ${test_function}; then
    echo -e "${COLOR_GREEN}✓ PASS: ${test_name}${COLOR_RESET}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${COLOR_RED}✗ FAIL: ${test_name}${COLOR_RESET}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Function to run a build script with params and check exit code
# $1: Expected exit code
# $@: Remaining arguments to pass to build script
run_build_test() {
  local expected_exit_code=$1
  shift
  
  # Create mock functions to prevent actual operations
  export MOCK_BUILD=true
  
  # Run the build script with arguments and capture exit code
  (
    source "${BUILD_SCRIPT}" >/dev/null 2>&1
    parse_args "$@"
    validate_parameters
    exit $?
  )
  local actual_exit_code=$?
  
  # Check if exit code matches expected
  if [ ${actual_exit_code} -eq ${expected_exit_code} ]; then
    return 0
  else
    echo "Expected exit code ${expected_exit_code}, got ${actual_exit_code}"
    return 1
  fi
}

# ===================================================
# Parameter Validation Tests
# ===================================================

# Test valid environment values
test_valid_environment_values() {
  local valid_envs=("dev" "qa" "prod")
  
  for env in "${valid_envs[@]}"; do
    if ! run_build_test 0 "--env=${env}"; then
      echo "Valid environment ${env} failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test invalid environment value
test_invalid_environment_value() {
  run_build_test 1 "--env=invalid"
}

# Test valid component values
test_valid_component_values() {
  local valid_components=("typescript" "python" "go" "all")
  
  for component in "${valid_components[@]}"; do
    if ! run_build_test 0 "--components=${component}"; then
      echo "Valid component ${component} failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test invalid component value
test_invalid_component_value() {
  run_build_test 1 "--components=invalid"
}

# Test valid container type values
test_valid_container_types() {
  local valid_containers=("docker" "podman")
  
  for container in "${valid_containers[@]}"; do
    if ! run_build_test 0 "--container=${container}"; then
      echo "Valid container type ${container} failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test invalid container type
test_invalid_container_type() {
  run_build_test 1 "--container=invalid"
}

# Test valid test mode values
test_valid_test_modes() {
  local valid_modes=("unit" "integration" "all" "none")
  
  for mode in "${valid_modes[@]}"; do
    if ! run_build_test 0 "--test=${mode}"; then
      echo "Valid test mode ${mode} failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test invalid test mode
test_invalid_test_mode() {
  run_build_test 1 "--test=invalid"
}

# Test valid coverage values
test_valid_coverage_values() {
  local valid_coverages=(0 50 95 100)
  
  for coverage in "${valid_coverages[@]}"; do
    if ! run_build_test 0 "--coverage=${coverage}"; then
      echo "Valid coverage ${coverage} failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test invalid coverage values
test_invalid_coverage_values() {
  # Test non-numeric value
  if ! run_build_test 1 "--coverage=invalid"; then
    return 1
  fi
  
  # Test negative value
  if ! run_build_test 1 "--coverage=-10"; then
    return 1
  fi
  
  # Test value > 100
  if ! run_build_test 1 "--coverage=101"; then
    return 1
  fi
  
  return 0
}

# Test valid boolean parameter values
test_valid_boolean_values() {
  local bool_params=("ui" "with-mocks" "debug" "push" "parallel" "ci" "skip-validation" "skip-linting")
  local bool_values=("true" "false")
  
  for param in "${bool_params[@]}"; do
    for value in "${bool_values[@]}"; do
      if ! run_build_test 0 "--${param}=${value}"; then
        echo "Valid boolean ${param}=${value} failed validation"
        return 1
      fi
    done
  done
  
  return 0
}

# Test invalid boolean values
test_invalid_boolean_values() {
  local bool_params=("ui" "with-mocks" "debug" "push" "parallel" "ci" "skip-validation" "skip-linting")
  
  for param in "${bool_params[@]}"; do
    if ! run_build_test 1 "--${param}=invalid"; then
      echo "Invalid boolean ${param}=invalid should have failed validation"
      return 1
    fi
  done
  
  return 0
}

# Test multiple parameter combinations
test_parameter_combinations() {
  # Test multiple valid parameters together
  if ! run_build_test 0 "--env=qa" "--components=typescript" "--test=unit" "--coverage=90"; then
    echo "Valid parameter combination failed"
    return 1
  fi
  
  # Test valid parameters with one invalid parameter
  if ! run_build_test 1 "--env=qa" "--components=typescript" "--test=invalid"; then
    echo "Invalid test mode should have failed validation"
    return 1
  fi
  
  return 0
}

# ===================================================
# Environment Behavior Tests
# ===================================================

# Test production environment special handling
test_prod_environment_restrictions() {
  # Test that prod env with test=none fails
  if ! run_build_test 1 "--env=prod" "--test=none"; then
    echo "Production build with test=none should have failed"
    return 1
  fi
  
  # Test that prod env with valid test mode passes
  if ! run_build_test 0 "--env=prod" "--test=unit"; then
    echo "Production build with test=unit should have passed"
    return 1
  fi
  
  return 0
}

# ===================================================
# Script Functions Unit Tests 
# ===================================================

# Mock test for the log function
test_log_function() {
  local log_output="${TEST_TMP_DIR}/log_test.out"
  
  # Source the script to get access to functions
  source "${BUILD_SCRIPT}" > /dev/null
  
  # Redirect log output
  LOG_FILE="${log_output}"
  DEBUG="true"
  
  # Call the log function with different levels
  log "INFO" "Test info message" > "${log_output}.console"
  log "ERROR" "Test error message" >> "${log_output}.console"
  log "DEBUG" "Test debug message" >> "${log_output}.console"
  
  # Verify log file contents
  grep -q "\[INFO\] Test info message" "${log_output}" || return 1
  grep -q "\[ERROR\] Test error message" "${log_output}" || return 1
  grep -q "\[DEBUG\] Test debug message" "${log_output}" || return 1
  
  # Verify console output
  grep -q "\[INFO\] Test info message" "${log_output}.console" || return 1
  grep -q "\[ERROR\] Test error message" "${log_output}.console" || return 1
  grep -q "\[DEBUG\] Test debug message" "${log_output}.console" || return 1
  
  # Test debug mode off
  DEBUG="false"
  log "DEBUG" "This should not appear in console" > "${log_output}.debug_off"
  grep -q "This should not appear in console" "${log_output}.debug_off" && return 1
  
  return 0
}

# Mock test for run_cmd function
test_run_cmd_function() {
  local cmd_output="${TEST_TMP_DIR}/cmd_test.out"
  
  # Source the script to get access to functions
  source "${BUILD_SCRIPT}" > /dev/null
  
  # Setup log file
  LOG_FILE="${cmd_output}.log"
  touch "${LOG_FILE}"
  
  # Test successful command
  run_cmd "echo 'success'" "Test successful command" > "${cmd_output}.success"
  grep -q "completed successfully" "${cmd_output}.success" || return 1
  
  # Test failed command
  if run_cmd "exit 1" "Test failed command" true > "${cmd_output}.fail" 2>&1; then
    return 1
  fi
  grep -q "failed with exit code" "${cmd_output}.fail" || return 1
  
  return 0
}

# Generate pairwise test combinations
generate_pairwise_tests() {
  echo "Generating pairwise test combinations..."
  
  # Define parameter sets for pairwise testing
  local envs=("dev" "qa" "prod")
  local components=("typescript" "python" "go" "all")
  local test_modes=("unit" "integration" "all" "none")
  local containers=("docker" "podman")
  local bools=("true" "false")
  
  # Generate a representative subset of combinations
  echo -e "${COLOR_BLUE}Pairwise test combinations:${COLOR_RESET}"
  
  # A small set of representative combinations
  cat << EOF > "${TEST_TMP_DIR}/pairwise_combinations.txt"
--env=dev --components=typescript --test=unit --container=docker --ui=true --debug=false
--env=dev --components=python --test=integration --container=podman --ui=false --debug=true
--env=qa --components=go --test=all --container=docker --ui=true --debug=true
--env=qa --components=all --test=none --container=podman --ui=false --debug=false
--env=prod --components=typescript --test=all --container=docker --ui=false --debug=false
--env=prod --components=python --test=unit --container=podman --ui=true --debug=false
--env=dev --components=go --test=none --container=docker --ui=false --debug=true
--env=qa --components=typescript --test=integration --container=podman --ui=true --debug=false
--env=prod --components=all --test=integration --container=docker --ui=true --debug=true
EOF

  cat "${TEST_TMP_DIR}/pairwise_combinations.txt"
  
  # Test each combination
  local pass_count=0
  local fail_count=0
  local total_count=0
  
  while read -r combination; do
    total_count=$((total_count + 1))
    
    # Skip combinations that we know should fail
    if [[ "$combination" == *"--env=prod --test=none"* ]]; then
      echo -e "${COLOR_YELLOW}Skipping known invalid combination: ${combination}${COLOR_RESET}"
      continue
    fi
    
    echo -e "${COLOR_BLUE}Testing combination: ${combination}${COLOR_RESET}"
    if run_build_test 0 ${combination}; then
      echo -e "${COLOR_GREEN}✓ Combination passed${COLOR_RESET}"
      pass_count=$((pass_count + 1))
    else
      echo -e "${COLOR_RED}✗ Combination failed${COLOR_RESET}"
      fail_count=$((fail_count + 1))
    fi
  done < "${TEST_TMP_DIR}/pairwise_combinations.txt"
  
  echo "Pairwise tests: ${pass_count} passed, ${fail_count} failed out of ${total_count} valid combinations"
  
  return $((fail_count > 0))
}

# Run negative test combinations
test_negative_combinations() {
  # Generate known invalid combinations
  cat << EOF > "${TEST_TMP_DIR}/negative_combinations.txt"
--env=invalid --components=typescript
--env=dev --components=invalid
--env=dev --components=typescript --test=invalid
--env=dev --components=typescript --container=invalid
--env=dev --components=typescript --coverage=invalid
--env=dev --components=typescript --ui=invalid
--env=prod --test=none
EOF

  local pass_count=0
  local fail_count=0
  local total_count=0
  
  while read -r combination; do
    total_count=$((total_count + 1))
    echo -e "${COLOR_BLUE}Testing negative combination: ${combination}${COLOR_RESET}"
    
    if run_build_test 1 ${combination}; then
      echo -e "${COLOR_GREEN}✓ Correctly rejected invalid combination${COLOR_RESET}"
      pass_count=$((pass_count + 1))
    else
      echo -e "${COLOR_RED}✗ Failed to reject invalid combination${COLOR_RESET}"
      fail_count=$((fail_count + 1))
    fi
  done < "${TEST_TMP_DIR}/negative_combinations.txt"
  
  echo "Negative tests: ${pass_count} passed, ${fail_count} failed out of ${total_count} combinations"
  
  return $((fail_count > 0))
}

# ===================================================
# Run the Tests
# ===================================================

# Parameter validation tests
run_test "Valid Environment Values" test_valid_environment_values
run_test "Invalid Environment Value" test_invalid_environment_value
run_test "Valid Component Values" test_valid_component_values
run_test "Invalid Component Value" test_invalid_component_value
run_test "Valid Container Types" test_valid_container_types
run_test "Invalid Container Type" test_invalid_container_type
run_test "Valid Test Modes" test_valid_test_modes
run_test "Invalid Test Mode" test_invalid_test_mode
run_test "Valid Coverage Values" test_valid_coverage_values
run_test "Invalid Coverage Values" test_invalid_coverage_values
run_test "Valid Boolean Values" test_valid_boolean_values
run_test "Invalid Boolean Values" test_invalid_boolean_values
run_test "Parameter Combinations" test_parameter_combinations

# Environment behavior tests
run_test "Production Environment Restrictions" test_prod_environment_restrictions

# Script function unit tests
run_test "Log Function" test_log_function
run_test "Run Command Function" test_run_cmd_function

# Pairwise testing
run_test "Pairwise Test Combinations" generate_pairwise_tests
run_test "Negative Test Combinations" test_negative_combinations

# Print final test results
print_test_results