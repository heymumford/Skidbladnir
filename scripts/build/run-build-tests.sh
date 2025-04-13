#!/bin/bash
#
# run-build-tests.sh - Run all build system tests
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
UNIT_TEST_SCRIPT="${SCRIPT_DIR}/test-unified-build.sh"
INTEGRATION_TEST_SCRIPT="${SCRIPT_DIR}/integration-test-build.sh"
REPORT_DIR="${PROJECT_ROOT}/test-results/build-tests"

# Test options
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
MAX_INTEGRATION_TESTS=10
PARALLEL_TESTS=4
SKIP_ACTUAL_BUILD=true
DRY_RUN=false
VERBOSE=false

# Show usage information
show_usage() {
  cat << EOF
Build System Test Runner

Usage: $(basename "$0") [options]

Options:
  --unit=BOOL              Run unit tests (true, false) [default: true]
  --integration=BOOL       Run integration tests (true, false) [default: true]
  --max-integration=NUM    Maximum number of integration tests [default: 10]
  --parallel=NUM           Number of parallel test processes [default: 4]
  --skip-build=BOOL        Skip actual build operations (true, false) [default: true]
  --dry-run=BOOL           Show commands without executing (true, false) [default: false]
  --verbose=BOOL           Verbose output (true, false) [default: false]
  --help                   Show this help message

Examples:
  $(basename "$0") --unit=true --integration=false
  $(basename "$0") --max-integration=50 --parallel=8
  $(basename "$0") --skip-build=false --verbose=true

EOF
}

# Parse command line arguments
parse_args() {
  for arg in "$@"; do
    case "${arg}" in
      --unit=*)
        RUN_UNIT_TESTS="${arg#*=}"
        ;;
      --integration=*)
        RUN_INTEGRATION_TESTS="${arg#*=}"
        ;;
      --max-integration=*)
        MAX_INTEGRATION_TESTS="${arg#*=}"
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
      --verbose=*)
        VERBOSE="${arg#*=}"
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
  
  # Validate boolean parameters
  for param in RUN_UNIT_TESTS RUN_INTEGRATION_TESTS SKIP_ACTUAL_BUILD DRY_RUN VERBOSE; do
    if [[ ! "${!param}" =~ ^(true|false)$ ]]; then
      echo -e "${COLOR_RED}Invalid value for ${param}: ${!param}. Must be true or false.${COLOR_RESET}"
      exit 1
    fi
  done
  
  # Validate numeric parameters
  if ! [[ "${MAX_INTEGRATION_TESTS}" =~ ^[0-9]+$ ]]; then
    echo -e "${COLOR_RED}Invalid value for MAX_INTEGRATION_TESTS: ${MAX_INTEGRATION_TESTS}. Must be a number.${COLOR_RESET}"
    exit 1
  fi
  
  if ! [[ "${PARALLEL_TESTS}" =~ ^[0-9]+$ ]] || [ "${PARALLEL_TESTS}" -lt 1 ]; then
    echo -e "${COLOR_RED}Invalid value for PARALLEL_TESTS: ${PARALLEL_TESTS}. Must be a positive number.${COLOR_RESET}"
    exit 1
  fi
}

# Ensure test scripts exist
check_prerequisites() {
  if [ "${RUN_UNIT_TESTS}" = "true" ] && [ ! -f "${UNIT_TEST_SCRIPT}" ]; then
    echo -e "${COLOR_RED}Error: Unit test script not found at ${UNIT_TEST_SCRIPT}${COLOR_RESET}"
    exit 1
  fi
  
  if [ "${RUN_INTEGRATION_TESTS}" = "true" ] && [ ! -f "${INTEGRATION_TEST_SCRIPT}" ]; then
    echo -e "${COLOR_RED}Error: Integration test script not found at ${INTEGRATION_TEST_SCRIPT}${COLOR_RESET}"
    exit 1
  fi
  
  # Create report directory
  mkdir -p "${REPORT_DIR}"
}

# Run unit tests
run_unit_tests() {
  if [ "${RUN_UNIT_TESTS}" != "true" ]; then
    echo -e "${COLOR_YELLOW}Skipping unit tests (--unit=false)${COLOR_RESET}"
    return 0
  fi
  
  echo -e "${COLOR_BLUE}Running unit tests...${COLOR_RESET}"
  
  local log_file="${REPORT_DIR}/unit-tests-$(date +%Y%m%d%H%M%S).log"
  local start_time=$(date +%s)
  
  # Run unit tests
  if [ "${DRY_RUN}" = "true" ]; then
    echo -e "${COLOR_YELLOW}[DRY RUN] Would execute: ${UNIT_TEST_SCRIPT}${COLOR_RESET}"
    echo "Unit tests passed (dry run)" > "${log_file}"
    local success=true
  else
    if "${UNIT_TEST_SCRIPT}" > "${log_file}" 2>&1; then
      local success=true
    else
      local success=false
    fi
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Display results
  if [ "${success}" = "true" ]; then
    echo -e "${COLOR_GREEN}✓ Unit tests passed (${duration}s)${COLOR_RESET}"
    if [ "${VERBOSE}" = "true" ]; then
      cat "${log_file}"
    fi
    return 0
  else
    echo -e "${COLOR_RED}✗ Unit tests failed (${duration}s)${COLOR_RESET}"
    echo -e "${COLOR_RED}See log file for details: ${log_file}${COLOR_RESET}"
    if [ "${VERBOSE}" = "true" ]; then
      cat "${log_file}"
    fi
    return 1
  fi
}

# Run integration tests
run_integration_tests() {
  if [ "${RUN_INTEGRATION_TESTS}" != "true" ]; then
    echo -e "${COLOR_YELLOW}Skipping integration tests (--integration=false)${COLOR_RESET}"
    return 0
  fi
  
  echo -e "${COLOR_BLUE}Running integration tests...${COLOR_RESET}"
  
  local log_file="${REPORT_DIR}/integration-tests-$(date +%Y%m%d%H%M%S).log"
  local start_time=$(date +%s)
  
  # Build integration test command
  local cmd="${INTEGRATION_TEST_SCRIPT}"
  cmd="${cmd} --max-tests=${MAX_INTEGRATION_TESTS}"
  cmd="${cmd} --parallel=${PARALLEL_TESTS}"
  cmd="${cmd} --skip-build=${SKIP_ACTUAL_BUILD}"
  
  if [ "${DRY_RUN}" = "true" ]; then
    cmd="${cmd} --dry-run=true"
  fi
  
  # Run integration tests
  if [ "${DRY_RUN}" = "true" ]; then
    echo -e "${COLOR_YELLOW}[DRY RUN] Would execute: ${cmd}${COLOR_RESET}"
    echo "Integration tests passed (dry run)" > "${log_file}"
    local success=true
  else
    if ${cmd} > "${log_file}" 2>&1; then
      local success=true
    else
      local success=false
    fi
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Display results
  if [ "${success}" = "true" ]; then
    echo -e "${COLOR_GREEN}✓ Integration tests passed (${duration}s)${COLOR_RESET}"
    if [ "${VERBOSE}" = "true" ]; then
      cat "${log_file}"
    fi
    return 0
  else
    echo -e "${COLOR_RED}✗ Integration tests failed (${duration}s)${COLOR_RESET}"
    echo -e "${COLOR_RED}See log file for details: ${log_file}${COLOR_RESET}"
    if [ "${VERBOSE}" = "true" ]; then
      cat "${log_file}"
    fi
    return 1
  fi
}

# Generate test report
generate_report() {
  local unit_result=$1
  local integration_result=$2
  local report_file="${REPORT_DIR}/build-test-report-$(date +%Y%m%d%H%M%S).html"
  
  # Determine overall status
  if [ "${unit_result}" = "0" ] && [ "${integration_result}" = "0" ]; then
    local overall_status="PASS"
    local status_color="green"
  else
    local overall_status="FAIL"
    local status_color="red"
  fi
  
  # Create HTML report
  cat > "${report_file}" << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Skidbladnir Build Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    .pass { color: green; }
    .fail { color: red; }
    .skip { color: orange; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Skidbladnir Build Test Report</h1>
  
  <h2>Test Summary</h2>
  <table>
    <tr>
      <th>Test Type</th>
      <th>Status</th>
      <th>Details</th>
    </tr>
    <tr>
      <td>Unit Tests</td>
      <td class="$([ "${unit_result}" = "0" ] && echo "pass" || echo "fail")">$([ "${unit_result}" = "0" ] && echo "PASS" || echo "FAIL")</td>
      <td>$([ "${RUN_UNIT_TESTS}" = "true" ] && echo "Executed" || echo "Skipped")</td>
    </tr>
    <tr>
      <td>Integration Tests</td>
      <td class="$([ "${integration_result}" = "0" ] && echo "pass" || echo "fail")">$([ "${integration_result}" = "0" ] && echo "PASS" || echo "FAIL")</td>
      <td>$([ "${RUN_INTEGRATION_TESTS}" = "true" ] && echo "Executed (max: ${MAX_INTEGRATION_TESTS})" || echo "Skipped")</td>
    </tr>
    <tr>
      <td><strong>Overall Status</strong></td>
      <td class="${status_color}"><strong>${overall_status}</strong></td>
      <td>Generated: $(date)</td>
    </tr>
  </table>
  
  <h2>Test Configuration</h2>
  <table>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Run Unit Tests</td>
      <td>${RUN_UNIT_TESTS}</td>
    </tr>
    <tr>
      <td>Run Integration Tests</td>
      <td>${RUN_INTEGRATION_TESTS}</td>
    </tr>
    <tr>
      <td>Max Integration Tests</td>
      <td>${MAX_INTEGRATION_TESTS}</td>
    </tr>
    <tr>
      <td>Parallel Tests</td>
      <td>${PARALLEL_TESTS}</td>
    </tr>
    <tr>
      <td>Skip Actual Build</td>
      <td>${SKIP_ACTUAL_BUILD}</td>
    </tr>
    <tr>
      <td>Dry Run</td>
      <td>${DRY_RUN}</td>
    </tr>
    <tr>
      <td>Verbose Output</td>
      <td>${VERBOSE}</td>
    </tr>
  </table>
  
  <h2>System Information</h2>
  <table>
    <tr>
      <th>Item</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Hostname</td>
      <td>$(hostname)</td>
    </tr>
    <tr>
      <td>Date/Time</td>
      <td>$(date)</td>
    </tr>
    <tr>
      <td>OS</td>
      <td>$(uname -a)</td>
    </tr>
    <tr>
      <td>Git Commit</td>
      <td>$(cd "${PROJECT_ROOT}" && git rev-parse HEAD)</td>
    </tr>
  </table>
</body>
</html>
EOF

  echo -e "${COLOR_BLUE}Test report generated: ${report_file}${COLOR_RESET}"
  
  # Create a symlink to the latest report
  ln -sf "${report_file}" "${REPORT_DIR}/latest-test-report.html"
}

# Main function
main() {
  local test_run_id="build-test-$(date +%Y%m%d%H%M%S)"
  echo -e "${COLOR_BLUE}Starting build system tests (${test_run_id})${COLOR_RESET}"
  
  # Create report directory for this run
  mkdir -p "${REPORT_DIR}/${test_run_id}"
  
  # Check prerequisites
  check_prerequisites
  
  # Run tests
  if run_unit_tests; then
    local unit_result=0
  else
    local unit_result=1
  fi
  
  if run_integration_tests; then
    local integration_result=0
  else
    local integration_result=1
  fi
  
  # Generate test report
  generate_report "${unit_result}" "${integration_result}"
  
  # Determine exit code
  if [ "${unit_result}" = "0" ] && [ "${integration_result}" = "0" ]; then
    echo -e "${COLOR_GREEN}All tests passed${COLOR_RESET}"
    exit 0
  else
    echo -e "${COLOR_RED}One or more tests failed${COLOR_RESET}"
    exit 1
  fi
}

# Parse arguments and run main
parse_args "$@"
main