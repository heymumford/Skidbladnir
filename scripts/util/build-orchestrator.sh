#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -e

# ===================================================
# Skidbladnir Build Orchestrator
# ===================================================
# Single source of truth for all build processes
# Handles versioning, testing, building, and artifact management
# ===================================================

# Default configuration
ENV=${1:-"qa"}
CI_MODE=${2:-"false"}
VERBOSE=${3:-"false"}
PUSH_GIT=${4:-"false"}
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
BUILD_DIR="${PROJECT_ROOT}/dist"
LOG_DIR="${PROJECT_ROOT}/logs"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="${LOG_DIR}/build-${TIMESTAMP}.log"
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"

# Git information
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(git rev-parse HEAD)
GIT_SHORT_COMMIT=$(git rev-parse --short HEAD)
GIT_TIMESTAMP=$(git log -1 --format=%ct)
GIT_TAG=$(git describe --tags --always 2>/dev/null || echo "")

# Ensure required directories exist
mkdir -p "${BUILD_DIR}" "${LOG_DIR}" "${TEST_RESULTS_DIR}"

# Initialize console output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===================================================
# Logging Functions
# ===================================================

log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

verbose_log() {
  if [ "$VERBOSE" = "true" ]; then
    echo -e "$1" | tee -a "$LOG_FILE"
  else
    echo -e "$1" >> "$LOG_FILE"
  fi
}

# ===================================================
# Version Management
# ===================================================

# Initialize or read version info
init_version_info() {
  log "Initializing version information"
  
  if [ -f "$VERSION_FILE" ]; then
    log "Reading existing version file"
    VERSION_INFO=$(cat "$VERSION_FILE")
    
    # Extract current versions from JSON
    VERSION_MAJOR=$(echo "$VERSION_INFO" | grep -o '"major": *[0-9]*' | awk '{print $2}')
    VERSION_MINOR=$(echo "$VERSION_INFO" | grep -o '"minor": *[0-9]*' | awk '{print $2}')
    VERSION_PATCH=$(echo "$VERSION_INFO" | grep -o '"patch": *[0-9]*' | awk '{print $2}')
    BUILD_NUMBER=$(echo "$VERSION_INFO" | grep -o '"build": *[0-9]*' | awk '{print $2}')
    
    # Increment build number
    BUILD_NUMBER=$((BUILD_NUMBER + 1))
    log "Incrementing build number to $BUILD_NUMBER"
  else
    log_warning "No existing version file found, creating initial version"
    # Extract version from package.json
    PKG_VERSION=$(grep -o '"version": *"[^"]*"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
    VERSION_MAJOR=$(echo "$PKG_VERSION" | cut -d. -f1)
    VERSION_MINOR=$(echo "$PKG_VERSION" | cut -d. -f2)
    VERSION_PATCH=$(echo "$PKG_VERSION" | cut -d. -f3)
    BUILD_NUMBER=1
  fi
  
  # Construct full version string
  FULL_VERSION="${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}-b${BUILD_NUMBER}"
  
  log "Version: $FULL_VERSION (major: $VERSION_MAJOR, minor: $VERSION_MINOR, patch: $VERSION_PATCH, build: $BUILD_NUMBER)"
  
  # Update version file
  cat > "$VERSION_FILE" << EOF
{
  "version": "${FULL_VERSION}",
  "major": ${VERSION_MAJOR},
  "minor": ${VERSION_MINOR},
  "patch": ${VERSION_PATCH},
  "build": ${BUILD_NUMBER},
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "${ENV}",
  "git": {
    "branch": "${GIT_BRANCH}",
    "commit": "${GIT_COMMIT}",
    "shortCommit": "${GIT_SHORT_COMMIT}",
    "timestamp": ${GIT_TIMESTAMP},
    "tag": "${GIT_TAG}"
  }
}
EOF
}

# Update version in package.json and pyproject.toml
update_project_versions() {
  log "Updating project version files"
  
  # Update package.json version
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${FULL_VERSION}\"/" "$PROJECT_ROOT/package.json"
  
  # Update pyproject.toml version
  sed -i "s/version = \"[^\"]*\"/version = \"${FULL_VERSION}\"/" "$PROJECT_ROOT/pyproject.toml"
  
  log_success "Updated version to ${FULL_VERSION} in project files"
}

# ===================================================
# Test Running and Reporting
# ===================================================

# Counter variables for test statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_typescript_tests() {
  log "Running TypeScript tests"
  
  # Create test results directory
  mkdir -p "${TEST_RESULTS_DIR}/typescript"
  
  # Run TypeScript tests
  npm run test:ts -- --json --outputFile="${TEST_RESULTS_DIR}/typescript/results.json" || true
  
  # Parse test results
  if [ -f "${TEST_RESULTS_DIR}/typescript/results.json" ]; then
    TS_TOTAL=$(grep -o '"numTotalTests":[0-9]*' "${TEST_RESULTS_DIR}/typescript/results.json" | cut -d':' -f2)
    TS_PASSED=$(grep -o '"numPassedTests":[0-9]*' "${TEST_RESULTS_DIR}/typescript/results.json" | cut -d':' -f2)
    TS_FAILED=$(grep -o '"numFailedTests":[0-9]*' "${TEST_RESULTS_DIR}/typescript/results.json" | cut -d':' -f2)
    
    TOTAL_TESTS=$((TOTAL_TESTS + TS_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + TS_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + TS_FAILED))
    
    log "TypeScript tests: ${TS_PASSED}/${TS_TOTAL} passed, ${TS_FAILED} failed"
  else
    log_error "No TypeScript test results found"
  fi
}

run_python_tests() {
  log "Running Python tests"
  
  # Create test results directory
  mkdir -p "${TEST_RESULTS_DIR}/python"
  
  # Run Python tests with JUnit XML output
  cd "${PROJECT_ROOT}"
  python -m pytest tests/unit/python -v --junitxml="${TEST_RESULTS_DIR}/python/results.xml" || true
  
  # Parse test results
  if [ -f "${TEST_RESULTS_DIR}/python/results.xml" ]; then
    PY_TOTAL=$(grep -c '<testcase' "${TEST_RESULTS_DIR}/python/results.xml")
    PY_FAILED=$(grep -c '<failure' "${TEST_RESULTS_DIR}/python/results.xml")
    PY_PASSED=$((PY_TOTAL - PY_FAILED))
    
    TOTAL_TESTS=$((TOTAL_TESTS + PY_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + PY_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + PY_FAILED))
    
    log "Python tests: ${PY_PASSED}/${PY_TOTAL} passed, ${PY_FAILED} failed"
  else
    log_error "No Python test results found"
  fi
}

run_go_tests() {
  log "Running Go tests"
  
  # Create test results directory
  mkdir -p "${TEST_RESULTS_DIR}/go"
  
  # Run Go tests with JSON output
  cd "${PROJECT_ROOT}/cmd/binary-processor"
  go test -mod=../config/go.mod ./... -json > "${TEST_RESULTS_DIR}/go/results.json" || true
  
  # Parse test results
  if [ -f "${TEST_RESULTS_DIR}/go/results.json" ]; then
    GO_TOTAL=$(grep -c '"Test"' "${TEST_RESULTS_DIR}/go/results.json")
    GO_FAILED=$(grep -c '"Action":"fail"' "${TEST_RESULTS_DIR}/go/results.json")
    GO_PASSED=$((GO_TOTAL - GO_FAILED))
    
    TOTAL_TESTS=$((TOTAL_TESTS + GO_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + GO_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + GO_FAILED))
    
    log "Go tests: ${GO_PASSED}/${GO_TOTAL} passed, ${GO_FAILED} failed"
  else
    log_error "No Go test results found"
  fi
}

run_integration_tests() {
  log "Running integration tests"
  
  # Create test results directory
  mkdir -p "${TEST_RESULTS_DIR}/integration"
  
  # Run integration tests
  cd "${PROJECT_ROOT}"
  bash scripts/run-integration-tests.sh "${ENV}" > "${TEST_RESULTS_DIR}/integration/output.log" 2>&1 || true
  
  # Parse test results
  if [ -f "${TEST_RESULTS_DIR}/integration/results.json" ]; then
    INT_TOTAL=$(grep -o '"numTotalTests":[0-9]*' "${TEST_RESULTS_DIR}/integration/results.json" | cut -d':' -f2)
    INT_PASSED=$(grep -o '"numPassedTests":[0-9]*' "${TEST_RESULTS_DIR}/integration/results.json" | cut -d':' -f2)
    INT_FAILED=$(grep -o '"numFailedTests":[0-9]*' "${TEST_RESULTS_DIR}/integration/results.json" | cut -d':' -f2)
    
    TOTAL_TESTS=$((TOTAL_TESTS + INT_TOTAL))
    PASSED_TESTS=$((PASSED_TESTS + INT_PASSED))
    FAILED_TESTS=$((FAILED_TESTS + INT_FAILED))
    
    log "Integration tests: ${INT_PASSED}/${INT_TOTAL} passed, ${INT_FAILED} failed"
  else
    log_error "No integration test results found"
  fi
}

# ===================================================
# Build Functions
# ===================================================

build_typescript() {
  log "Building TypeScript components"
  
  cd "${PROJECT_ROOT}"
  npm run build:ts
  
  if [ $? -eq 0 ]; then
    log_success "TypeScript build succeeded"
    return 0
  else
    log_error "TypeScript build failed"
    return 1
  fi
}

build_python() {
  log "Building Python components"
  
  cd "${PROJECT_ROOT}"
  npm run build:py
  
  if [ $? -eq 0 ]; then
    log_success "Python build succeeded"
    return 0
  else
    log_error "Python build failed"
    return 1
  fi
}

build_go() {
  log "Building Go components"
  
  cd "${PROJECT_ROOT}"
  npm run build:go
  
  if [ $? -eq 0 ]; then
    log_success "Go build succeeded"
    return 0
  else
    log_error "Go build failed"
    return 1
  fi
}

# Build containers if needed
build_containers() {
  if [ "${ENV}" != "dev" ]; then
    log "Building containers for ${ENV} environment"
    
    cd "${PROJECT_ROOT}"
    npm run containers:build -- --env "${ENV}" --version "${FULL_VERSION}"
    
    if [ $? -eq 0 ]; then
      log_success "Container build succeeded"
      return 0
    else
      log_error "Container build failed"
      return 1
    fi
  else
    log "Skipping container build in dev environment"
    return 0
  fi
}

# ===================================================
# Git Operations
# ===================================================

commit_version_changes() {
  if [ "${PUSH_GIT}" = "true" ]; then
    log "Committing version changes to Git"
    
    cd "${PROJECT_ROOT}"
    
    # Add version files to Git
    git add "${VERSION_FILE}" package.json pyproject.toml
    
    # Commit changes with version message
    git commit -m "Build ${BUILD_NUMBER}: Version bump to ${FULL_VERSION} for ${ENV} environment" || true
    
    # Create tag for this build
    git tag -a "v${FULL_VERSION}" -m "Release version ${FULL_VERSION} for ${ENV} environment" || true
    
    # Push changes if requested
    if [ "${CI_MODE}" != "true" ]; then
      git push origin "${GIT_BRANCH}" || log_warning "Failed to push to origin/${GIT_BRANCH}"
      git push origin "v${FULL_VERSION}" || log_warning "Failed to push tag v${FULL_VERSION}"
    fi
    
    log_success "Version changes committed and tagged"
  else
    log "Skipping Git operations (PUSH_GIT=${PUSH_GIT})"
  fi
}

# ===================================================
# Summary Report
# ===================================================

generate_build_summary() {
  SUMMARY_FILE="${PROJECT_ROOT}/build-summary-${TIMESTAMP}.txt"
  log "Generating build summary to ${SUMMARY_FILE}"
  
  TEST_SUCCESS=$((FAILED_TESTS == 0))
  BUILD_SUCCESS=$((TS_BUILD_RESULT + PY_BUILD_RESULT + GO_BUILD_RESULT == 0))
  
  cat > "${SUMMARY_FILE}" << EOF
============================================================
           SKIDBLADNIR BUILD SUMMARY
============================================================
Build Date  : $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Environment : ${ENV}
Version     : ${FULL_VERSION}
Build #     : ${BUILD_NUMBER}
Git Branch  : ${GIT_BRANCH}
Git Commit  : ${GIT_COMMIT}
Git Tag     : ${GIT_TAG}
============================================================
TEST RESULTS
============================================================
Total Tests : ${TOTAL_TESTS}
Passed Tests: ${PASSED_TESTS}
Failed Tests: ${FAILED_TESTS}
Success Rate: $(awk "BEGIN { printf \"%.2f%%\", (${PASSED_TESTS}/${TOTAL_TESTS})*100 }")

TypeScript Tests: $(grep "TypeScript tests:" "${LOG_FILE}" | tail -n1 | cut -d':' -f2-)
Python Tests    : $(grep "Python tests:" "${LOG_FILE}" | tail -n1 | cut -d':' -f2-)
Go Tests        : $(grep "Go tests:" "${LOG_FILE}" | tail -n1 | cut -d':' -f2-)
Integration     : $(grep "Integration tests:" "${LOG_FILE}" | tail -n1 | cut -d':' -f2-)
============================================================
BUILD RESULTS
============================================================
TypeScript: $([ ${TS_BUILD_RESULT} -eq 0 ] && echo "SUCCESS" || echo "FAILED")
Python    : $([ ${PY_BUILD_RESULT} -eq 0 ] && echo "SUCCESS" || echo "FAILED")
Go        : $([ ${GO_BUILD_RESULT} -eq 0 ] && echo "SUCCESS" || echo "FAILED")
Containers: $([ ${ENV} = "dev" ] && echo "SKIPPED" || ([ ${CONTAINER_BUILD_RESULT} -eq 0 ] && echo "SUCCESS" || echo "FAILED"))
============================================================
OVERALL RESULT: $([ ${TEST_SUCCESS} -eq 1 ] && [ ${BUILD_SUCCESS} -eq 1 ] && echo "SUCCESS" || echo "FAILED")
============================================================
EOF

  # Print summary to console
  cat "${SUMMARY_FILE}"
  
  # Also save a copy in the log directory
  cp "${SUMMARY_FILE}" "${LOG_DIR}/build-summary-${TIMESTAMP}.txt"
  
  # Update the latest summary symlink
  ln -sf "${LOG_DIR}/build-summary-${TIMESTAMP}.txt" "${LOG_DIR}/build-summary-latest.txt"
}

# ===================================================
# Main Build Process
# ===================================================

main() {
  log "Starting Skidbladnir build process for ${ENV} environment"
  log "Build timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  
  # Initialize version information
  init_version_info
  
  # Update project version files
  update_project_versions
  
  # Setup environment variables
  log "Setting up environment variables"
  source "${PROJECT_ROOT}/scripts/setup-env.sh" "${ENV}"
  
  # Run tests
  log "Running tests"
  run_typescript_tests
  run_python_tests
  run_go_tests
  run_integration_tests
  
  # Build components
  log "Building components"
  build_typescript
  TS_BUILD_RESULT=$?
  
  build_python
  PY_BUILD_RESULT=$?
  
  build_go
  GO_BUILD_RESULT=$?
  
  # Build containers if needed
  build_containers
  CONTAINER_BUILD_RESULT=$?
  
  # Commit version changes to Git
  commit_version_changes
  
  # Generate build summary
  generate_build_summary
  
  # Final success/failure determination
  if [ ${FAILED_TESTS} -eq 0 ] && [ $((TS_BUILD_RESULT + PY_BUILD_RESULT + GO_BUILD_RESULT)) -eq 0 ]; then
    log_success "Build completed successfully!"
    exit 0
  else
    log_error "Build completed with errors!"
    exit 1
  fi
}

# Run main process
main