#!/bin/bash
#
# integration-test-build.sh - Integration tests for the build process
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -eo pipefail

# Define colors for output
COLOR_GREEN="\033[0;32m"   # Green
COLOR_RED="\033[0;31m"     # Red
COLOR_YELLOW="\033[0;33m"  # Yellow
COLOR_BLUE="\033[0;34m"    # Blue
COLOR_RESET="\033[0m"      # Reset

# Script directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_SCRIPT="${SCRIPT_DIR}/unified-build.sh"
TEST_COMBINATIONS_FILE="${SCRIPT_DIR}/test-combinations.txt"
TEST_LOG_DIR="${PROJECT_ROOT}/logs/build-integration-tests"

# Build options
SKIP_ACTUAL_BUILD="false"  # Skip actual build operations for faster testing
MAX_TEST_RUNS=0            # Max number of combinations to test (0 = all)
PARALLEL_TESTS=4           # Number of parallel test processes
DRY_RUN="false"            # Show commands without executing

# Test statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Ensure the build script exists
if [ ! -f "${BUILD_SCRIPT}" ]; then
  echo -e "${COLOR_RED}Error: Build script not found at ${BUILD_SCRIPT}${COLOR_RESET}"
  exit 1
fi

# Create log directory
mkdir -p "${TEST_LOG_DIR}"

# Show usage information
show_usage() {
  cat << EOF
Integration Tests for Unified Build System

Usage: $(basename "$0") [options]

Options:
  --combinations=FILE   File containing test combinations [default: auto-generate]
  --max-tests=NUM       Maximum number of tests to run [default: all]
  --parallel=NUM        Number of parallel test processes [default: 4]
  --skip-build=BOOL     Skip actual build operations (true, false) [default: false]
  --dry-run=BOOL        Show commands without executing (true, false) [default: false]
  --help                Show this help message

Example:
  $(basename "$0") --combinations=my-combinations.txt --max-tests=10 --parallel=2

EOF
}

# Parse command line arguments
parse_args() {
  for arg in "$@"; do
    case "${arg}" in
      --combinations=*)
        TEST_COMBINATIONS_FILE="${arg#*=}"
        ;;
      --max-tests=*)
        MAX_TEST_RUNS="${arg#*=}"
        ;;
      --parallel=*)
        PARALLEL_TESTS="${arg#*=}"
        ;;
      --skip-build=*)
        SKIP_ACTUAL_BUILD="${arg#*=}"
        ;;
      --dry-run=*)
        DRY_RUN="${arg#*=}"
        ;;
      --help)
        show_usage
        exit 0
        ;;
      *)
        echo -e "${COLOR_RED}Unknown option: ${arg}${COLOR_RESET}"
        show_usage
        exit 1
        ;;
    esac
  done
}

# Print test results
print_results() {
  echo
  echo -e "${COLOR_BLUE}====== Integration Test Results ======${COLOR_RESET}"
  echo -e "Total combinations tested: ${TOTAL_TESTS}"
  echo -e "${COLOR_GREEN}Passed: ${PASSED_TESTS}${COLOR_RESET}"
  echo -e "${COLOR_RED}Failed: ${FAILED_TESTS}${COLOR_RESET}"
  echo -e "${COLOR_YELLOW}Skipped: ${SKIPPED_TESTS}${COLOR_RESET}"
  echo
  
  if [ ${FAILED_TESTS} -eq 0 ]; then
    echo -e "${COLOR_GREEN}All build combinations tested successfully!${COLOR_RESET}"
    exit 0
  else
    echo -e "${COLOR_RED}Some build combinations failed. Check logs in ${TEST_LOG_DIR} for details.${COLOR_RESET}"
    exit 1
  fi
}

# Generate test combinations if no file provided
generate_test_combinations() {
  if [ ! -f "${TEST_COMBINATIONS_FILE}" ]; then
    echo -e "${COLOR_BLUE}No test combinations file provided. Generating pairwise combinations...${COLOR_RESET}"
    
    # Generate combinations using Python script
    if [ -f "${SCRIPT_DIR}/generate-build-combinations.py" ]; then
      "${SCRIPT_DIR}/generate-build-combinations.py" --generate-file "${TEST_COMBINATIONS_FILE}"
    else
      echo -e "${COLOR_RED}Error: Combination generator script not found.${COLOR_RESET}"
      exit 1
    fi
  fi
  
  # Ensure combinations file exists
  if [ ! -f "${TEST_COMBINATIONS_FILE}" ]; then
    echo -e "${COLOR_RED}Error: Test combinations file not found at ${TEST_COMBINATIONS_FILE}${COLOR_RESET}"
    exit 1
  fi
  
  # Count combinations
  local count=$(wc -l < "${TEST_COMBINATIONS_FILE}")
  echo -e "${COLOR_BLUE}Found ${count} test combinations in ${TEST_COMBINATIONS_FILE}${COLOR_RESET}"
  
  # Limit if max tests specified
  if [ "${MAX_TEST_RUNS}" -gt 0 ] && [ "${MAX_TEST_RUNS}" -lt "${count}" ]; then
    echo -e "${COLOR_YELLOW}Limiting to ${MAX_TEST_RUNS} test combinations${COLOR_RESET}"
    head -n "${MAX_TEST_RUNS}" "${TEST_COMBINATIONS_FILE}" > "${TEST_COMBINATIONS_FILE}.limited"
    TEST_COMBINATIONS_FILE="${TEST_COMBINATIONS_FILE}.limited"
  fi
}

# Test a single build combination
test_build_combination() {
  local combination=$1
  local log_file="${TEST_LOG_DIR}/build-$(echo "${combination}" | md5sum | cut -d' ' -f1).log"
  local success=true
  
  echo -e "${COLOR_BLUE}Testing build combination: ${combination}${COLOR_RESET}"
  
  # Skip actual build operations if requested
  if [ "${SKIP_ACTUAL_BUILD}" = "true" ]; then
    combination="${combination} --skip-validation=true"
  fi
  
  # Execute build command or show it in dry run mode
  if [ "${DRY_RUN}" = "true" ]; then
    echo -e "${COLOR_YELLOW}[DRY RUN] Would execute: ${BUILD_SCRIPT} ${combination}${COLOR_RESET}"
    echo "Test passed (dry run)" > "${log_file}"
  else
    echo "Running: ${BUILD_SCRIPT} ${combination}" > "${log_file}"
    if ! ${BUILD_SCRIPT} ${combination} >> "${log_file}" 2>&1; then
      success=false
    fi
  fi
  
  # Check result
  if [ "${success}" = "true" ]; then
    echo -e "${COLOR_GREEN}✓ Passed: ${combination}${COLOR_RESET}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "\nTEST RESULT: PASS" >> "${log_file}"
    return 0
  else
    echo -e "${COLOR_RED}✗ Failed: ${combination}${COLOR_RESET}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "\nTEST RESULT: FAIL" >> "${log_file}"
    return 1
  fi
}

# Run tests in parallel
run_parallel_tests() {
  local combinations=()
  while IFS= read -r line; do
    combinations+=("$line")
  done < "${TEST_COMBINATIONS_FILE}"
  
  TOTAL_TESTS=${#combinations[@]}
  
  # Create a FIFO for job control
  local fifo="${TEST_LOG_DIR}/jobcontrol.fifo"
  rm -f "${fifo}"
  mkfifo "${fifo}"
  
  # Start job control
  exec 3<> "${fifo}"
  rm -f "${fifo}"
  
  # Initialize job control with tokens
  for ((i=1; i<=PARALLEL_TESTS; i++)); do
    echo >&3
  done
  
  echo -e "${COLOR_BLUE}Running ${TOTAL_TESTS} build combinations with ${PARALLEL_TESTS} parallel processes${COLOR_RESET}"
  
  # Process each combination in parallel
  for combination in "${combinations[@]}"; do
    # Wait for a job slot
    read -u3
    
    # Run test in background
    (
      if test_build_combination "${combination}"; then
        result="PASS"
      else
        result="FAIL"
      fi
      
      # Return the job slot
      echo >&3
    ) &
  done
  
  # Wait for all jobs to complete
  wait
  
  # Close job control
  exec 3>&-
}

# Main function
main() {
  echo -e "${COLOR_BLUE}Starting build integration tests${COLOR_RESET}"
  
  # Create test metadata
  TEST_RUN_ID="build-$(date +%Y%m%d%H%M%S)"
  mkdir -p "${TEST_LOG_DIR}/${TEST_RUN_ID}"
  
  # Generate or verify test combinations
  generate_test_combinations
  
  # Run tests in parallel
  run_parallel_tests
  
  # Print results
  print_results
}

# Parse arguments and run main
parse_args "$@"
main