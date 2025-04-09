#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -eo pipefail

# Master build orchestration for Skidbladnir
# This script orchestrates the build, test, and deployment process
# for all components of the Skidbladnir platform.

# Configuration
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")
BUILD_TIMESTAMP=$(date +%Y%m%d%H%M%S)
BUILD_ID="build-${BUILD_TIMESTAMP}"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/${BUILD_ID}.log"

# Default parameters
ENVIRONMENT="dev"
COMPONENTS=("typescript" "python" "go" "all")
SELECTED_COMPONENTS=("all")
SKIP_TESTS=false
SKIP_LINT=false
SKIP_BUILD=false
SKIP_DEPLOY=false
VERBOSE=false
USE_CONTAINERS=true

# Create logs directory
mkdir -p "${LOG_DIR}"

# Function to show usage information
function show_usage() {
    echo "Skidbladnir Build Orchestrator"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV           Target environment (dev, qa, prod) [default: dev]"
    echo "  -c, --components COMP   Components to build (typescript, python, go, all) [default: all]"
    echo "  --skip-tests            Skip running tests"
    echo "  --skip-lint             Skip linting"
    echo "  --skip-build            Skip build process (useful for test-only runs)"
    echo "  --skip-deploy           Skip deployment"
    echo "  --local                 Run build process locally (without containers)"
    echo "  -v, --verbose           Show verbose output"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --env qa                      # Build all components for qa environment"
    echo "  $0 --components typescript,go    # Build only TypeScript and Go components"
    echo "  $0 --skip-tests --skip-lint      # Skip tests and linting"
    echo "  $0 --local                       # Build locally without containers"
    echo ""
}

# Process arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--components)
            IFS=',' read -ra SELECTED_COMPONENTS <<< "$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        --local)
            USE_CONTAINERS=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|qa|prod)$ ]]; then
    echo "Error: Environment must be one of: dev, qa, prod"
    exit 1
fi

# Validate components
for comp in "${SELECTED_COMPONENTS[@]}"; do
    if [[ ! " ${COMPONENTS[*]} " =~ " ${comp} " ]]; then
        echo "Error: Invalid component: $comp"
        echo "Valid components are: ${COMPONENTS[*]}"
        exit 1
    fi
done

# Set up logging
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Color coding
    case "$level" in
        "INFO")  color="\033[0;32m" ;; # Green
        "WARN")  color="\033[0;33m" ;; # Yellow
        "ERROR") color="\033[0;31m" ;; # Red
        *)       color="\033[0m"    ;; # Default
    esac
    
    # Log to file
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    
    # Log to console with colors
    echo -e "${color}[${timestamp}] [${level}] ${message}\033[0m"
}

# Run command with logging
run_cmd() {
    local cmd="$1"
    local desc="$2"
    
    log "INFO" "Running: ${desc}"
    
    if [ "$VERBOSE" = true ]; then
        log "INFO" "Command: ${cmd}"
    fi
    
    if eval "$cmd"; then
        log "INFO" "✓ Completed: ${desc}"
        return 0
    else
        local exit_code=$?
        log "ERROR" "✗ Failed: ${desc} (Exit code: ${exit_code})"
        return $exit_code
    fi
}

# Check if component is selected
is_component_selected() {
    local comp="$1"
    
    if [[ " ${SELECTED_COMPONENTS[*]} " =~ " all " ]]; then
        return 0
    elif [[ " ${SELECTED_COMPONENTS[*]} " =~ " ${comp} " ]]; then
        return 0
    else
        return 1
    fi
}

# Print build configuration
print_config() {
    log "INFO" "Skidbladnir Build Configuration:"
    log "INFO" "  Build ID: ${BUILD_ID}"
    log "INFO" "  Environment: ${ENVIRONMENT}"
    log "INFO" "  Components: ${SELECTED_COMPONENTS[*]}"
    log "INFO" "  Skip Tests: ${SKIP_TESTS}"
    log "INFO" "  Skip Lint: ${SKIP_LINT}"
    log "INFO" "  Skip Build: ${SKIP_BUILD}"
    log "INFO" "  Skip Deploy: ${SKIP_DEPLOY}"
    log "INFO" "  Use Containers: ${USE_CONTAINERS}"
    log "INFO" "  Log File: ${LOG_FILE}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check Node.js/npm
    if ! command -v npm &> /dev/null; then
        log "WARN" "npm is not installed. TypeScript builds may fail."
    fi
    
    # Check Python/Poetry
    if ! command -v poetry &> /dev/null; then
        log "WARN" "poetry is not installed. Python builds may fail."
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        log "WARN" "go is not installed. Go builds may fail."
    fi
    
    # Check Podman/Docker
    if [ "$USE_CONTAINERS" = true ]; then
        if command -v podman &> /dev/null; then
            CONTAINER_CMD="podman"
        elif command -v docker &> /dev/null; then
            CONTAINER_CMD="docker"
        else
            log "ERROR" "Neither podman nor docker is installed. Cannot use containers."
            exit 1
        fi
        log "INFO" "Using container command: ${CONTAINER_CMD}"
    fi
}

# Setup build environment
setup_environment() {
    log "INFO" "Setting up build environment..."
    
    # Create build metadata file
    local metadata_file="${PROJECT_ROOT}/build-metadata.json"
    
    cat > "$metadata_file" << EOF
{
  "buildId": "${BUILD_ID}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "components": $(printf '%s\n' "${SELECTED_COMPONENTS[@]}" | jq -R . | jq -s .),
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOF
    
    # Source environment-specific variables
    if [ -f "${PROJECT_ROOT}/scripts/env/${ENVIRONMENT}.env" ]; then
        source "${PROJECT_ROOT}/scripts/env/${ENVIRONMENT}.env"
        log "INFO" "Loaded environment variables from ${ENVIRONMENT}.env"
    fi
}

# Run linting
run_linting() {
    if [ "$SKIP_LINT" = true ]; then
        log "INFO" "Skipping linting"
        return 0
    fi
    
    log "INFO" "Running linting..."
    
    # TypeScript linting
    if is_component_selected "typescript"; then
        run_cmd "cd ${PROJECT_ROOT} && npm run lint" "TypeScript linting"
    fi
    
    # Python linting
    if is_component_selected "python"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app poetry:latest run flake8 packages/*/python" "Python linting (flake8)"
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app poetry:latest run black --check packages/*/python" "Python formatting check (black)"
        else
            run_cmd "cd ${PROJECT_ROOT} && poetry run flake8 packages/*/python" "Python linting (flake8)"
            run_cmd "cd ${PROJECT_ROOT} && poetry run black --check packages/*/python" "Python formatting check (black)"
        fi
    fi
    
    # Go linting
    if is_component_selected "go"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app golang:1.18 go vet ./packages/*/go/..." "Go linting (go vet)"
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app golangci/golangci-lint:latest golangci-lint run ./packages/*/go/..." "Go linting (golangci-lint)"
        else
            run_cmd "cd ${PROJECT_ROOT} && go vet ./packages/*/go/..." "Go linting (go vet)"
            run_cmd "cd ${PROJECT_ROOT} && golangci-lint run ./packages/*/go/..." "Go linting (golangci-lint)"
        fi
    fi
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log "INFO" "Skipping tests"
        return 0
    fi
    
    log "INFO" "Running tests..."
    
    # TypeScript tests
    if is_component_selected "typescript"; then
        run_cmd "cd ${PROJECT_ROOT} && npm run test" "TypeScript tests"
    fi
    
    # Python tests
    if is_component_selected "python"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app poetry:latest run pytest packages/*/python" "Python tests (pytest)"
        else
            run_cmd "cd ${PROJECT_ROOT} && poetry run pytest packages/*/python" "Python tests (pytest)"
        fi
    fi
    
    # Go tests
    if is_component_selected "go"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app golang:1.18 go test -v ./packages/*/go/..." "Go tests"
        else
            run_cmd "cd ${PROJECT_ROOT} && go test -v ./packages/*/go/..." "Go tests"
        fi
    fi
}

# Build components
build_components() {
    if [ "$SKIP_BUILD" = true ]; then
        log "INFO" "Skipping build"
        return 0
    fi
    
    log "INFO" "Building components..."
    
    # TypeScript build
    if is_component_selected "typescript"; then
        run_cmd "cd ${PROJECT_ROOT} && npm run build" "TypeScript build"
    fi
    
    # Python build
    if is_component_selected "python"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app poetry:latest build" "Python build"
        else
            run_cmd "cd ${PROJECT_ROOT} && poetry build" "Python build"
        fi
    fi
    
    # Go build
    if is_component_selected "go"; then
        if [ "$USE_CONTAINERS" = true ]; then
            run_cmd "${CONTAINER_CMD} run --rm -v ${PROJECT_ROOT}:/app -w /app golang:1.18 go build -o dist/binary-processor ./packages/binary-processor/cmd/main.go" "Go build"
        else
            run_cmd "cd ${PROJECT_ROOT} && go build -o dist/binary-processor ./packages/binary-processor/cmd/main.go" "Go build"
        fi
    fi
    
    # Build containers if needed
    if [ "$USE_CONTAINERS" = true ] && [[ "$ENVIRONMENT" != "dev" ]]; then
        log "INFO" "Building containers..."
        
        local compose_file="docker-compose.${ENVIRONMENT}.yml"
        
        if [ -f "${PROJECT_ROOT}/infra/compose/${compose_file}" ]; then
            run_cmd "cd ${PROJECT_ROOT} && ${CONTAINER_CMD}-compose -f infra/compose/${compose_file} build --build-arg BUILD_ID=${BUILD_ID}" "Building containers with ${compose_file}"
        else
            log "ERROR" "Compose file not found: infra/compose/${compose_file}"
            exit 1
        fi
    fi
}

# Deploy the application
deploy_application() {
    if [ "$SKIP_DEPLOY" = true ]; then
        log "INFO" "Skipping deployment"
        return 0
    fi
    
    log "INFO" "Deploying to ${ENVIRONMENT} environment..."
    
    if [ -f "${PROJECT_ROOT}/scripts/deploy.sh" ]; then
        run_cmd "${PROJECT_ROOT}/scripts/deploy.sh ${ENVIRONMENT} ${BUILD_ID}" "Deployment to ${ENVIRONMENT}"
    else
        log "ERROR" "Deployment script not found: ${PROJECT_ROOT}/scripts/deploy.sh"
        exit 1
    fi
}

# Generate build report
generate_report() {
    log "INFO" "Generating build report..."
    
    local report_file="${PROJECT_ROOT}/build-reports/${BUILD_ID}.html"
    mkdir -p "$(dirname "$report_file")"
    
    # Create basic HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Skidbladnir Build Report: ${BUILD_ID}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .success { color: green; }
        .failure { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Skidbladnir Build Report</h1>
    <p><strong>Build ID:</strong> ${BUILD_ID}</p>
    <p><strong>Environment:</strong> ${ENVIRONMENT}</p>
    <p><strong>Timestamp:</strong> $(date -u +%Y-%m-%d\ %H:%M:%S\ UTC)</p>
    <p><strong>Components:</strong> ${SELECTED_COMPONENTS[*]}</p>
    <p><strong>Git Commit:</strong> $(git rev-parse HEAD)</p>
    <p><strong>Git Branch:</strong> $(git rev-parse --abbrev-ref HEAD)</p>
    
    <h2>Build Log</h2>
    <pre>$(cat "${LOG_FILE}")</pre>
</body>
</html>
EOF
    
    log "INFO" "Build report generated: ${report_file}"
}

# Main build process
main() {
    print_config
    check_prerequisites
    setup_environment
    
    # Run build phases
    run_linting
    run_tests
    build_components
    deploy_application
    
    # Generate report
    generate_report
    
    log "INFO" "Build completed successfully: ${BUILD_ID}"
    log "INFO" "Log file: ${LOG_FILE}"
}

# Run the main function
main