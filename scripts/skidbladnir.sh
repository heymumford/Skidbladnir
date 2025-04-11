#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#
# skidbladnir.sh - Master CLI for Skidbladnir project
#
# This script serves as a unified entry point for all Skidbladnir tools and utilities,
# providing a consistent interface for development, testing, building, and deployment.
#
# Usage: skidbladnir.sh [command] [subcommand] [options]
#

set -e

# Core variables and paths
VERSION_FILE="${PROJECT_ROOT}/build-versions.json"
LOG_DIR="${PROJECT_ROOT}/logs"
TOOL_COLOR="\033[1;32m"  # Bold green for tool name
WARN_COLOR="\033[1;33m"  # Bold yellow for warnings
ERROR_COLOR="\033[1;31m" # Bold red for errors
INFO_COLOR="\033[1;34m"  # Bold blue for info
RESET_COLOR="\033[0m"    # Reset to default color

# Get the repository root directory
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  PROJECT_ROOT=$(git rev-parse --show-toplevel)
else
  SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
  PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")
fi

# Go to project root
cd "${PROJECT_ROOT}"

# Create logs directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# Current date and time for logs
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="${LOG_DIR}/skidbladnir_${TIMESTAMP}.log"

# Function to log messages
log() {
  local level="$1"
  local message="$2"
  local log_timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  
  # Write to log file
  echo "[${log_timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
  
  # Display to console with color based on level
  case "${level}" in
    "INFO")
      echo -e "${INFO_COLOR}[INFO]${RESET_COLOR} ${message}"
      ;;
    "WARN")
      echo -e "${WARN_COLOR}[WARN]${RESET_COLOR} ${message}"
      ;;
    "ERROR")
      echo -e "${ERROR_COLOR}[ERROR]${RESET_COLOR} ${message}"
      ;;
    *)
      echo "[${level}] ${message}"
      ;;
  esac
}

# Function to handle errors
handle_error() {
  log "ERROR" "Command failed with exit code $1"
  log "ERROR" "See log for details: ${LOG_FILE}"
  exit $1
}

# Set error trap
trap 'handle_error $?' ERR

# Function to show usage information
show_usage() {
  echo -e "${TOOL_COLOR}Skidbladnir${RESET_COLOR} - Unified Command Line Interface"
  echo ""
  echo "Usage: $0 [command] [subcommand] [options]"
  echo ""
  echo "Commands:"
  echo "  build      Build and package components"
  echo "  test       Run tests (unit, integration, etc.)"
  echo "  env        Manage environments (dev, qa, prod)"
  echo "  version    Manage version information"
  echo "  xml        XML validation and cleanup tools"
  echo "  docs       Documentation generation tools"
  echo "  run        Run specific components"
  echo "  deploy     Deploy components"
  echo "  migration  Migration workflow tools"
  echo "  llm        LLM model tools and utilities"
  echo "  help       Show this help message"
  echo ""
  echo "Run '$0 [command] --help' for more information on a command."
  echo ""
  echo "Examples:"
  echo "  $0 build ts       # Build TypeScript components"
  echo "  $0 test unit      # Run unit tests"
  echo "  $0 env start dev  # Start development environment"
  echo "  $0 docs generate  # Generate documentation"
  echo ""
}

# Function to get version from package.json
get_version() {
  grep -o '"version": *"[^"]*"' package.json | head -1 | awk -F'"' '{print $4}'
}

# Function to show version information
show_version() {
  VERSION=$(get_version)
  BUILD_DATE=$(date +"%Y-%m-%d")
  NODE_VERSION=$(node --version 2>/dev/null || echo "Not installed")
  GO_VERSION=$(go version 2>/dev/null || echo "Not installed")
  PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}' || echo "Not installed")
  
  echo -e "${TOOL_COLOR}Skidbladnir${RESET_COLOR} v${VERSION} (${BUILD_DATE})"
  echo "Copyright (C) 2025 Eric C. Mumford (@heymumford)"
  echo "This is free software: you can redistribute it and/or modify it under the terms of the MIT License."
  echo ""
  echo "Environment:"
  echo "  Node.js:  ${NODE_VERSION}"
  echo "  Go:       ${GO_VERSION}"
  echo "  Python:   ${PYTHON_VERSION}"
  echo ""
}

# Function to handle build commands
handle_build() {
  log "INFO" "Executing build command: $*"
  "${PROJECT_ROOT}/scripts/util/consolidated-build-tools.sh" "$@"
  log "INFO" "Build completed successfully"
}

# Function to handle test commands
handle_test() {
  log "INFO" "Executing test command: $*"
  "${PROJECT_ROOT}/scripts/util/consolidated-test-tools.sh" "$@"
  log "INFO" "Tests completed successfully"
}

# Function to handle environment commands
handle_env() {
  log "INFO" "Executing environment command: $*"
  "${PROJECT_ROOT}/scripts/util/consolidated-env-tools.sh" "$@"
  log "INFO" "Environment command completed successfully"
}

# Function to handle version commands
handle_version() {
  if [ $# -eq 0 ]; then
    show_version
  else
    log "INFO" "Executing version command: $*"
    "${PROJECT_ROOT}/scripts/util/consolidated-version-tools.sh" "$@"
    log "INFO" "Version command completed successfully"
  fi
}

# Function to handle XML commands
handle_xml() {
  log "INFO" "Executing XML command: $*"
  "${PROJECT_ROOT}/scripts/util/xml-tools.sh" "$@"
  log "INFO" "XML command completed successfully"
}

# Function to handle documentation commands
handle_docs() {
  log "INFO" "Executing documentation command: $*"
  
  case "$1" in
    "generate" | "gen")
      # Generate documentation
      if [[ "$2" == "api" ]]; then
        log "INFO" "Generating API documentation"
        npm run docs:api
      elif [[ "$2" == "ui" ]]; then
        log "INFO" "Generating UI component documentation"
        npm run docs:ui
      else
        log "INFO" "Generating all documentation"
        npm run docs
      fi
      ;;
      
    "serve" | "s")
      # Serve documentation
      log "INFO" "Serving documentation"
      npm run docs:serve
      ;;
      
    "help" | "--help" | "-h" | "")
      echo "Documentation Tools"
      echo ""
      echo "Usage: $0 docs [subcommand] [options]"
      echo ""
      echo "Subcommands:"
      echo "  generate, gen  Generate documentation"
      echo "  serve, s       Serve documentation"
      echo ""
      echo "Options for generate:"
      echo "  api            Generate API documentation only"
      echo "  ui             Generate UI component documentation only"
      echo ""
      ;;
      
    *)
      log "ERROR" "Unknown docs subcommand: $1"
      echo "Run '$0 docs --help' for usage information."
      exit 1
      ;;
  esac
  
  log "INFO" "Documentation command completed successfully"
}

# Function to handle run commands
handle_run() {
  log "INFO" "Executing run command: $*"
  
  case "$1" in
    "api" | "a")
      # Run API
      log "INFO" "Starting API server"
      npm run dev:api
      ;;
      
    "orchestrator" | "o")
      # Run orchestrator
      log "INFO" "Starting orchestrator"
      npm run dev:orchestrator
      ;;
      
    "binary" | "b")
      # Run binary processor
      log "INFO" "Starting binary processor"
      npm run dev:binary
      ;;
      
    "all")
      # Run all components
      log "INFO" "Starting all components"
      npm run dev
      ;;
      
    "help" | "--help" | "-h" | "")
      echo "Run Tools"
      echo ""
      echo "Usage: $0 run [subcommand] [options]"
      echo ""
      echo "Subcommands:"
      echo "  api, a           Start the API server"
      echo "  orchestrator, o  Start the orchestrator"
      echo "  binary, b        Start the binary processor"
      echo "  all              Start all components"
      echo ""
      ;;
      
    *)
      log "ERROR" "Unknown run subcommand: $1"
      echo "Run '$0 run --help' for usage information."
      exit 1
      ;;
  esac
  
  log "INFO" "Run command completed successfully"
}

# Function to handle migration commands
handle_migration() {
  log "INFO" "Executing migration command: $*"
  
  case "$1" in
    "zephyr-to-qtest" | "z2q")
      # Run Zephyr to qTest migration demo
      shift
      log "INFO" "Starting Zephyr to qTest migration demo"
      node "${PROJECT_ROOT}/packages/migration/zephyr-to-qtest-demo.js" "$@"
      ;;
      
    "verify" | "v")
      # Verify migration
      shift
      log "INFO" "Verifying migration"
      node "${PROJECT_ROOT}/packages/migration/verify-migration.js" "$@"
      ;;
      
    "help" | "--help" | "-h" | "")
      echo "Migration Tools"
      echo ""
      echo "Usage: $0 migration [subcommand] [options]"
      echo ""
      echo "Subcommands:"
      echo "  zephyr-to-qtest, z2q  Run Zephyr to qTest migration demo"
      echo "  verify, v             Verify migration results"
      echo ""
      echo "Options for zephyr-to-qtest:"
      echo "  --source-token TOKEN  Zephyr API token"
      echo "  --target-token TOKEN  qTest API token"
      echo "  --project-key KEY     Zephyr project key"
      echo "  --project-id ID       qTest project ID"
      echo ""
      ;;
      
    *)
      log "ERROR" "Unknown migration subcommand: $1"
      echo "Run '$0 migration --help' for usage information."
      exit 1
      ;;
  esac
  
  log "INFO" "Migration command completed successfully"
}

# Function to handle LLM commands
handle_llm() {
  log "INFO" "Executing LLM command: $*"
  
  case "$1" in
    "configure" | "c")
      # Configure LLM models
      log "INFO" "Configuring LLM models"
      "${PROJECT_ROOT}/scripts/configure-llm-containers.sh" "${@:2}"
      ;;
      
    "prepare" | "p")
      # Prepare LLM models
      log "INFO" "Preparing LLM models"
      "${PROJECT_ROOT}/scripts/prepare-llm-models.sh" "${@:2}"
      ;;
      
    "help" | "--help" | "-h" | "")
      echo "LLM Tools"
      echo ""
      echo "Usage: $0 llm [subcommand] [options]"
      echo ""
      echo "Subcommands:"
      echo "  configure, c  Configure LLM models"
      echo "  prepare, p    Prepare LLM models for use"
      echo ""
      ;;
      
    *)
      log "ERROR" "Unknown LLM subcommand: $1"
      echo "Run '$0 llm --help' for usage information."
      exit 1
      ;;
  esac
  
  log "INFO" "LLM command completed successfully"
}

# No arguments, show usage
if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

# Process command
COMMAND="$1"
shift

log "INFO" "Starting Skidbladnir CLI with command: ${COMMAND} $*"

case "${COMMAND}" in
  # Build commands
  "build" | "b")
    handle_build "$@"
    ;;
    
  # Test commands
  "test" | "t")
    handle_test "$@"
    ;;
    
  # Environment commands
  "env" | "e")
    handle_env "$@"
    ;;
    
  # Version commands
  "version" | "v")
    handle_version "$@"
    ;;
    
  # XML tools
  "xml" | "x")
    handle_xml "$@"
    ;;
    
  # Documentation tools
  "docs" | "d")
    handle_docs "$@"
    ;;
    
  # Run commands
  "run" | "r")
    handle_run "$@"
    ;;
    
  # Migration commands
  "migration" | "m")
    handle_migration "$@"
    ;;
    
  # LLM commands
  "llm" | "l")
    handle_llm "$@"
    ;;
    
  # Help commands
  "help" | "--help" | "-h")
    show_usage
    ;;
    
  # Version flag
  "--version")
    show_version
    ;;
    
  *)
    log "ERROR" "Unknown command '${COMMAND}'"
    echo "Run '$0 help' for usage information."
    exit 1
    ;;
esac

log "INFO" "Skidbladnir CLI execution completed successfully"

exit 0