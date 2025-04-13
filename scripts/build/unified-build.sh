#!/bin/bash
#
# unified-build.sh - Consolidated build script for Skidbladnir
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -eo pipefail

# ===================================================
# Configuration
# ===================================================

# Detect script location and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default build parameters
ENV="dev"                   # Environment: dev, qa, prod
COMPONENTS="all"            # Components: typescript, python, go, all
CONTAINER_TYPE="podman"     # Container type: docker, podman
TEST_MODE="unit"            # Test mode: unit, integration, all, none
COVERAGE_TARGET=95          # Coverage target percentage
UI_BUILD="false"            # Build UI components: true, false
WITH_MOCKS="true"           # Include mocks: true, false
DEBUG="false"               # Debug mode: true, false
PUSH_ARTIFACTS="false"      # Push artifacts: true, false
PARALLEL_BUILD="false"      # Parallel build: true, false
CI_MODE="false"             # CI mode: true, false
SKIP_VALIDATION="false"     # Skip validation: true, false
SKIP_LINTING="false"        # Skip linting: true, false
BUILD_TIMESTAMP=$(date +%Y%m%d%H%M%S)
BUILD_ID="build-${BUILD_TIMESTAMP}"
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/build-${BUILD_TIMESTAMP}.log"

# Create logs directory
mkdir -p "${LOG_DIR}"

# ===================================================
# Helper Functions
# ===================================================

# Function for showing usage information
show_usage() {
  cat << EOF
Unified Build System for Skidbladnir

Usage: $(basename "$0") [options]

Options:
  --env=VALUE            Build environment (dev, qa, prod) [default: dev]
  --components=LIST      Components to build (typescript, python, go, all) [default: all]
  --container=TYPE       Container technology (docker, podman) [default: podman]
  --test=MODE            Test mode (unit, integration, all, none) [default: unit]
  --coverage=PERCENT     Coverage target percentage [default: 95]
  --ui=BOOL              Build UI components (true, false) [default: false]
  --with-mocks=BOOL      Include mocks (true, false) [default: true]
  --debug=BOOL           Enable debug mode (true, false) [default: false]
  --push=BOOL            Push artifacts (true, false) [default: false]
  --parallel=BOOL        Build in parallel (true, false) [default: false]
  --ci=BOOL              CI mode (true, false) [default: false]
  --skip-validation=BOOL Skip validation (true, false) [default: false]
  --skip-linting=BOOL    Skip linting (true, false) [default: false]
  --help                 Show this help message

Examples:
  $(basename "$0") --env=prod --components=all --with-mocks=false
  $(basename "$0") --env=qa --test=integration --coverage=90
  $(basename "$0") --env=dev --debug=true --skip-validation=true

EOF
}

# Function for standardized logging
log() {
  local level="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Define log colors
  local COLOR_INFO="\033[0;34m"    # Blue
  local COLOR_SUCCESS="\033[0;32m" # Green
  local COLOR_WARNING="\033[0;33m" # Yellow
  local COLOR_ERROR="\033[0;31m"   # Red
  local COLOR_DEBUG="\033[0;90m"   # Gray
  local COLOR_RESET="\033[0m"      # Reset
  
  # Determine color based on level
  local color=""
  case "${level}" in
    "INFO")     color="${COLOR_INFO}" ;;
    "SUCCESS")  color="${COLOR_SUCCESS}" ;;
    "WARNING")  color="${COLOR_WARNING}" ;;
    "ERROR")    color="${COLOR_ERROR}" ;;
    "DEBUG")    
      color="${COLOR_DEBUG}"
      if [ "${DEBUG}" != "true" ]; then
        # In non-debug mode, don't print debug messages to console
        # but still log them to file
        echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
        return
      fi
      ;;
  esac
  
  # Log to file and console
  echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
  echo -e "${color}[${timestamp}] [${level}] ${message}${COLOR_RESET}"
}

# Function to run commands with logging
run_cmd() {
  local cmd="$1"
  local desc="$2"
  local continue_on_error="${3:-false}"
  
  log "INFO" "Running: ${desc}"
  log "DEBUG" "Command: ${cmd}"
  
  # Create a temporary file for command output
  local output_file=$(mktemp)
  
  # Run the command and capture output
  if eval "${cmd}" > "${output_file}" 2>&1; then
    log "SUCCESS" "✓ ${desc} completed successfully"
    
    if [ "${DEBUG}" = "true" ]; then
      log "DEBUG" "Output: $(cat ${output_file})"
    fi
    
    rm "${output_file}"
    return 0
  else
    local exit_code=$?
    log "ERROR" "✗ ${desc} failed with exit code ${exit_code}"
    log "ERROR" "Output: $(cat ${output_file})"
    
    rm "${output_file}"
    
    if [ "${continue_on_error}" = "true" ]; then
      return ${exit_code}
    else
      exit ${exit_code}
    fi
  fi
}

# Function to validate parameters
validate_parameters() {
  if [ "${SKIP_VALIDATION}" = "true" ]; then
    log "WARNING" "Skipping parameter validation"
    return 0
  fi
  
  log "INFO" "Validating build parameters"
  
  # Validate environment
  if [[ ! "${ENV}" =~ ^(dev|qa|prod)$ ]]; then
    log "ERROR" "Invalid environment: ${ENV}. Must be one of: dev, qa, prod"
    exit 1
  fi
  
  # Validate components
  if [[ ! "${COMPONENTS}" =~ ^(typescript|python|go|all)$ ]]; then
    log "ERROR" "Invalid components: ${COMPONENTS}. Must be one of: typescript, python, go, all"
    exit 1
  fi
  
  # Validate container type
  if [[ ! "${CONTAINER_TYPE}" =~ ^(docker|podman)$ ]]; then
    log "ERROR" "Invalid container type: ${CONTAINER_TYPE}. Must be one of: docker, podman"
    exit 1
  fi
  
  # Validate test mode
  if [[ ! "${TEST_MODE}" =~ ^(unit|integration|all|none)$ ]]; then
    log "ERROR" "Invalid test mode: ${TEST_MODE}. Must be one of: unit, integration, all, none"
    exit 1
  fi
  
  # Validate coverage target
  if ! [[ "${COVERAGE_TARGET}" =~ ^[0-9]+$ ]] || [ "${COVERAGE_TARGET}" -lt 0 ] || [ "${COVERAGE_TARGET}" -gt 100 ]; then
    log "ERROR" "Invalid coverage target: ${COVERAGE_TARGET}. Must be a number between 0 and 100"
    exit 1
  fi
  
  # Validate boolean parameters
  for param in UI_BUILD WITH_MOCKS DEBUG PUSH_ARTIFACTS PARALLEL_BUILD CI_MODE SKIP_VALIDATION SKIP_LINTING; do
    value="${!param}"
    if [[ ! "${value}" =~ ^(true|false)$ ]]; then
      log "ERROR" "Invalid value for ${param}: ${value}. Must be either true or false"
      exit 1
    fi
  done
  
  log "SUCCESS" "All parameters validated successfully"
}

# Check for required tools
check_prerequisites() {
  log "INFO" "Checking build prerequisites"
  
  # Check for Git
  if ! command -v git &> /dev/null; then
    log "ERROR" "git is not installed"
    exit 1
  fi
  
  # Check for container tool
  if [ "${CONTAINER_TYPE}" = "podman" ]; then
    if ! command -v podman &> /dev/null; then
      log "ERROR" "podman is not installed"
      exit 1
    fi
  elif [ "${CONTAINER_TYPE}" = "docker" ]; then
    if ! command -v docker &> /dev/null; then
      log "ERROR" "docker is not installed"
      exit 1
    fi
  fi
  
  # Check Node.js/npm for TypeScript builds
  if [ "${COMPONENTS}" = "typescript" ] || [ "${COMPONENTS}" = "all" ]; then
    if ! command -v npm &> /dev/null; then
      log "ERROR" "npm is not installed"
      exit 1
    fi
  fi
  
  # Check Python for Python builds
  if [ "${COMPONENTS}" = "python" ] || [ "${COMPONENTS}" = "all" ]; then
    if ! command -v python &> /dev/null; then
      log "ERROR" "python is not installed"
      exit 1
    fi
  fi
  
  # Check Go for Go builds
  if [ "${COMPONENTS}" = "go" ] || [ "${COMPONENTS}" = "all" ]; then
    if ! command -v go &> /dev/null; then
      log "ERROR" "go is not installed"
      exit 1
    fi
  fi
  
  log "SUCCESS" "All prerequisites satisfied"
}

# ===================================================
# Build Functions
# ===================================================

# Run linting
run_linting() {
  if [ "${SKIP_LINTING}" = "true" ]; then
    log "INFO" "Skipping linting"
    return 0
  fi
  
  log "INFO" "Running linting"
  
  local linting_success=true
  
  # TypeScript linting
  if [ "${COMPONENTS}" = "typescript" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running TypeScript linting"
    run_cmd "cd ${PROJECT_ROOT} && npm run lint" "TypeScript linting" true
    if [ $? -ne 0 ]; then
      linting_success=false
    fi
  fi
  
  # Python linting
  if [ "${COMPONENTS}" = "python" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running Python linting"
    run_cmd "cd ${PROJECT_ROOT} && python -m flake8 internal/python" "Python linting" true
    if [ $? -ne 0 ]; then
      linting_success=false
    fi
  fi
  
  # Go linting
  if [ "${COMPONENTS}" = "go" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running Go linting"
    run_cmd "cd ${PROJECT_ROOT} && go vet ./internal/go/..." "Go linting" true
    if [ $? -ne 0 ]; then
      linting_success=false
    fi
  fi
  
  if [ "${linting_success}" = "true" ]; then
    log "SUCCESS" "All linting passed"
    return 0
  else
    log "ERROR" "Some linting checks failed"
    if [ "${ENV}" = "prod" ]; then
      log "ERROR" "Failing build due to linting errors in production build"
      exit 1
    else
      log "WARNING" "Continuing despite linting errors in non-production build"
      return 1
    fi
  fi
}

# Run tests based on test mode
run_tests() {
  if [ "${TEST_MODE}" = "none" ]; then
    log "INFO" "Skipping tests (--test=none specified)"
    return 0
  fi
  
  log "INFO" "Running tests (mode: ${TEST_MODE})"
  
  local test_success=true
  
  # TypeScript tests
  if [ "${COMPONENTS}" = "typescript" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running TypeScript tests"
    
    if [ "${TEST_MODE}" = "unit" ] || [ "${TEST_MODE}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run test:unit" "TypeScript unit tests" true
      if [ $? -ne 0 ]; then
        test_success=false
      fi
    fi
    
    if [ "${TEST_MODE}" = "integration" ] || [ "${TEST_MODE}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run test:integration" "TypeScript integration tests" true
      if [ $? -ne 0 ]; then
        test_success=false
      fi
    fi
  fi
  
  # Python tests
  if [ "${COMPONENTS}" = "python" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running Python tests"
    
    if [ "${TEST_MODE}" = "unit" ] || [ "${TEST_MODE}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run test:py:unit" "Python unit tests" true
      if [ $? -ne 0 ]; then
        test_success=false
      fi
    fi
    
    if [ "${TEST_MODE}" = "integration" ] || [ "${TEST_MODE}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run test:py:integration" "Python integration tests" true
      if [ $? -ne 0 ]; then
        test_success=false
      fi
    fi
  fi
  
  # Go tests
  if [ "${COMPONENTS}" = "go" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Running Go tests"
    
    if [ "${TEST_MODE}" = "unit" ] || [ "${TEST_MODE}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && cd cmd/binary-processor && go test -mod=../config/go.mod ./..." "Go tests" true
      if [ $? -ne 0 ]; then
        test_success=false
      fi
    fi
  fi
  
  # Check test results
  if [ "${test_success}" = "true" ]; then
    log "SUCCESS" "All tests passed"
    return 0
  else
    log "ERROR" "Some tests failed"
    if [ "${ENV}" = "prod" ]; then
      log "ERROR" "Failing build due to test failures in production build"
      exit 1
    else
      log "WARNING" "Continuing despite test failures in non-production build"
      return 1
    fi
  fi
}

# Run coverage checks
check_coverage() {
  if [ "${TEST_MODE}" = "none" ]; then
    log "INFO" "Skipping coverage checks (--test=none specified)"
    return 0
  fi
  
  log "INFO" "Running coverage checks (target: ${COVERAGE_TARGET}%)"
  
  run_cmd "cd ${PROJECT_ROOT} && npm run coverage:unified -- --target=${COVERAGE_TARGET}" "Unified coverage check" true
  local coverage_result=$?
  
  if [ ${coverage_result} -eq 0 ]; then
    log "SUCCESS" "Coverage meets target threshold"
    return 0
  else
    log "ERROR" "Coverage does not meet target threshold"
    
    # Display AI recommendations if available
    if [ -f "${PROJECT_ROOT}/test-results/coverage/ai-recommendations.txt" ]; then
      log "INFO" "AI Coverage Recommendations:"
      cat "${PROJECT_ROOT}/test-results/coverage/ai-recommendations.txt" >> "${LOG_FILE}"
      if [ "${DEBUG}" = "true" ]; then
        cat "${PROJECT_ROOT}/test-results/coverage/ai-recommendations.txt"
      fi
    fi
    
    if [ "${ENV}" = "prod" ]; then
      log "ERROR" "Failing build due to coverage issues in production build"
      exit 1
    else
      log "WARNING" "Continuing despite coverage issues in non-production build"
      return 1
    fi
  fi
}

# Build components
build_components() {
  log "INFO" "Building components (env: ${ENV}, components: ${COMPONENTS})"
  
  local build_success=true
  local build_args=""
  
  # Set build args
  if [ "${UI_BUILD}" = "true" ]; then
    build_args="${build_args} --ui"
  fi
  
  if [ "${WITH_MOCKS}" = "true" ]; then
    build_args="${build_args} --with-mocks"
  fi
  
  if [ "${DEBUG}" = "true" ]; then
    build_args="${build_args} --verbose"
  fi
  
  # TypeScript build
  if [ "${COMPONENTS}" = "typescript" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Building TypeScript components"
    
    if [ "${PARALLEL_BUILD}" = "true" ] && [ "${COMPONENTS}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run build:ts &" "TypeScript build (parallel)" true
    else
      run_cmd "cd ${PROJECT_ROOT} && npm run build:ts" "TypeScript build" true
      if [ $? -ne 0 ]; then
        build_success=false
      fi
    fi
  fi
  
  # Python build
  if [ "${COMPONENTS}" = "python" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Building Python components"
    
    if [ "${PARALLEL_BUILD}" = "true" ] && [ "${COMPONENTS}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run build:py &" "Python build (parallel)" true
    else
      run_cmd "cd ${PROJECT_ROOT} && npm run build:py" "Python build" true
      if [ $? -ne 0 ]; then
        build_success=false
      fi
    fi
  fi
  
  # Go build
  if [ "${COMPONENTS}" = "go" ] || [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Building Go components"
    
    if [ "${PARALLEL_BUILD}" = "true" ] && [ "${COMPONENTS}" = "all" ]; then
      run_cmd "cd ${PROJECT_ROOT} && npm run build:go &" "Go build (parallel)" true
    else
      run_cmd "cd ${PROJECT_ROOT} && npm run build:go" "Go build" true
      if [ $? -ne 0 ]; then
        build_success=false
      fi
    fi
  fi
  
  # If parallel build, wait for all background jobs to complete
  if [ "${PARALLEL_BUILD}" = "true" ] && [ "${COMPONENTS}" = "all" ]; then
    log "INFO" "Waiting for parallel builds to complete"
    wait
    
    # Check if any of the parallel builds failed
    if ! ls -la "${PROJECT_ROOT}/dist" | grep -q typescript || \
       ! ls -la "${PROJECT_ROOT}/dist" | grep -q python || \
       ! ls -la "${PROJECT_ROOT}/dist" | grep -q go; then
      build_success=false
    fi
  fi
  
  # Check build results
  if [ "${build_success}" = "true" ]; then
    log "SUCCESS" "All components built successfully"
    return 0
  else
    log "ERROR" "Some component builds failed"
    exit 1
  fi
}

# Build containers
build_containers() {
  # Skip for dev environment unless explicitly requested
  if [ "${ENV}" = "dev" ] && [ "${PUSH_ARTIFACTS}" != "true" ]; then
    log "INFO" "Skipping container builds for dev environment"
    return 0
  fi
  
  log "INFO" "Building containers (env: ${ENV}, container: ${CONTAINER_TYPE})"
  
  local container_success=true
  local container_cmd="${CONTAINER_TYPE}"
  local container_args=""
  
  # Set container build args
  if [ "${WITH_MOCKS}" = "true" ]; then
    container_args="${container_args} true"
  else
    container_args="${container_args} false"
  fi
  
  # Run container build script
  run_cmd "cd ${PROJECT_ROOT} && scripts/build-containers.sh ${ENV} ${container_args}" "Container build" true
  if [ $? -ne 0 ]; then
    container_success=false
  fi
  
  # Push containers if requested
  if [ "${PUSH_ARTIFACTS}" = "true" ]; then
    log "INFO" "Pushing container images"
    
    if [ "${container_success}" = "true" ]; then
      local registry="localhost:5000"
      local tag="latest"
      
      if [ "${ENV}" = "prod" ]; then
        tag="${BUILD_ID}"
      fi
      
      run_cmd "${container_cmd} push ${registry}/testbridge/api:${tag}" "Push API container" true
      run_cmd "${container_cmd} push ${registry}/testbridge/orchestrator:${tag}" "Push Orchestrator container" true
      run_cmd "${container_cmd} push ${registry}/testbridge/binary-processor:${tag}" "Push Binary Processor container" true
      
      if [ $? -ne 0 ]; then
        log "ERROR" "Failed to push one or more containers"
        container_success=false
      else
        log "SUCCESS" "All containers pushed successfully"
      fi
    else
      log "ERROR" "Cannot push containers because build failed"
    fi
  fi
  
  # Check container build results
  if [ "${container_success}" = "true" ]; then
    log "SUCCESS" "Container build and push completed successfully"
    return 0
  else
    log "ERROR" "Container build or push failed"
    if [ "${ENV}" = "prod" ]; then
      exit 1
    else
      return 1
    fi
  fi
}

# Generate build report
generate_report() {
  log "INFO" "Generating build report"
  
  # Create report directory
  local report_dir="${PROJECT_ROOT}/build-reports"
  mkdir -p "${report_dir}"
  
  # Get build information
  local build_status="SUCCESS"
  local end_time=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  
  # Check for coverage report
  local coverage_info="Not available"
  if [ -f "${PROJECT_ROOT}/test-results/unified-coverage-summary.json" ]; then
    coverage_info=$(jq -r '.aggregate.coverage | tostring + "%"' "${PROJECT_ROOT}/test-results/unified-coverage-summary.json" 2>/dev/null || echo "Not available")
  fi
  
  # Generate report
  local report_file="${report_dir}/build-report-${BUILD_TIMESTAMP}.html"
  
  cat > "${report_file}" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Skidbladnir Build Report - ${BUILD_ID}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        .success { color: green; }
        .failure { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .parameters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .parameter { background-color: #f5f5f5; padding: 10px; border-radius: 4px; }
        .parameter .name { font-weight: bold; }
        .parameter .value { color: #0066cc; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Skidbladnir Build Report</h1>
    
    <h2>Build Information</h2>
    <table>
        <tr><th>Build ID</th><td>${BUILD_ID}</td></tr>
        <tr><th>Environment</th><td>${ENV}</td></tr>
        <tr><th>Start Time</th><td>$(date -r "${LOG_FILE}" -u +"%Y-%m-%d %H:%M:%S UTC")</td></tr>
        <tr><th>End Time</th><td>${end_time}</td></tr>
        <tr><th>Git Branch</th><td>${GIT_BRANCH}</td></tr>
        <tr><th>Git Commit</th><td>${GIT_COMMIT}</td></tr>
        <tr><th>Coverage</th><td>${coverage_info}</td></tr>
        <tr><th>Status</th><td class="success">${build_status}</td></tr>
    </table>
    
    <h2>Build Parameters</h2>
    <div class="parameters">
        <div class="parameter">
            <div class="name">Environment:</div>
            <div class="value">${ENV}</div>
        </div>
        <div class="parameter">
            <div class="name">Components:</div>
            <div class="value">${COMPONENTS}</div>
        </div>
        <div class="parameter">
            <div class="name">Container Type:</div>
            <div class="value">${CONTAINER_TYPE}</div>
        </div>
        <div class="parameter">
            <div class="name">Test Mode:</div>
            <div class="value">${TEST_MODE}</div>
        </div>
        <div class="parameter">
            <div class="name">Coverage Target:</div>
            <div class="value">${COVERAGE_TARGET}%</div>
        </div>
        <div class="parameter">
            <div class="name">UI Build:</div>
            <div class="value">${UI_BUILD}</div>
        </div>
        <div class="parameter">
            <div class="name">With Mocks:</div>
            <div class="value">${WITH_MOCKS}</div>
        </div>
        <div class="parameter">
            <div class="name">Debug Mode:</div>
            <div class="value">${DEBUG}</div>
        </div>
        <div class="parameter">
            <div class="name">Push Artifacts:</div>
            <div class="value">${PUSH_ARTIFACTS}</div>
        </div>
        <div class="parameter">
            <div class="name">Parallel Build:</div>
            <div class="value">${PARALLEL_BUILD}</div>
        </div>
        <div class="parameter">
            <div class="name">CI Mode:</div>
            <div class="value">${CI_MODE}</div>
        </div>
        <div class="parameter">
            <div class="name">Skip Validation:</div>
            <div class="value">${SKIP_VALIDATION}</div>
        </div>
    </div>
    
    <h2>Build Log</h2>
    <pre>$(cat "${LOG_FILE}")</pre>
</body>
</html>
EOF
  
  log "SUCCESS" "Build report generated: ${report_file}"
  
  # Create a symlink to the latest report
  ln -sf "${report_file}" "${report_dir}/latest-build-report.html"
}

# ===================================================
# Main Execution
# ===================================================

# Parse command-line arguments
parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --env=*)
        ENV="${1#*=}"
        ;;
      --components=*)
        COMPONENTS="${1#*=}"
        ;;
      --container=*)
        CONTAINER_TYPE="${1#*=}"
        ;;
      --test=*)
        TEST_MODE="${1#*=}"
        ;;
      --coverage=*)
        COVERAGE_TARGET="${1#*=}"
        ;;
      --ui=*)
        UI_BUILD="${1#*=}"
        ;;
      --with-mocks=*)
        WITH_MOCKS="${1#*=}"
        ;;
      --debug=*)
        DEBUG="${1#*=}"
        ;;
      --push=*)
        PUSH_ARTIFACTS="${1#*=}"
        ;;
      --parallel=*)
        PARALLEL_BUILD="${1#*=}"
        ;;
      --ci=*)
        CI_MODE="${1#*=}"
        ;;
      --skip-validation=*)
        SKIP_VALIDATION="${1#*=}"
        ;;
      --skip-linting=*)
        SKIP_LINTING="${1#*=}"
        ;;
      --help)
        show_usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
    esac
    shift
  done
}

# Main function
main() {
  log "INFO" "Starting Skidbladnir build process (${BUILD_ID})"
  log "DEBUG" "Build parameters: ENV=${ENV}, COMPONENTS=${COMPONENTS}, TEST_MODE=${TEST_MODE}"
  
  # Special handling for production builds
  if [ "${ENV}" = "prod" ]; then
    log "INFO" "Production build detected - enforcing stricter requirements"
    
    # Production builds require tests and coverage
    if [ "${TEST_MODE}" = "none" ]; then
      log "ERROR" "Production builds require tests. Cannot use --test=none for production"
      exit 1
    fi
    
    # Production builds should not use mocks
    if [ "${WITH_MOCKS}" = "true" ]; then
      log "WARNING" "Disabling mocks for production build"
      WITH_MOCKS="false"
    fi
  fi
  
  # Run build stages
  validate_parameters
  check_prerequisites
  run_linting
  run_tests
  check_coverage
  build_components
  build_containers
  generate_report
  
  log "SUCCESS" "Build process completed successfully (${BUILD_ID})"
  return 0
}

# Parse arguments and run main
parse_args "$@"
main