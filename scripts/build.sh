#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# This is a wrapper script for the unified build orchestrator

set -e

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Default values
ENVIRONMENT="dev"
VERBOSE=false
CI_MODE=false
PUSH_GIT=false
SHOW_HELP=false

# Function to show usage information
show_usage() {
    echo "Skidbladnir Build Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV       Target environment (dev, qa, prod) [default: dev]"
    echo "  -v, --verbose       Show verbose output"
    echo "  -c, --ci            Running in CI mode"
    echo "  -p, --push-git      Push version changes to Git"
    echo "  -h, --help          Show this help message"
    echo ""
}

# Process arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--ci)
            CI_MODE=true
            shift
            ;;
        -p|--push-git)
            PUSH_GIT=true
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Error: Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    show_usage
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|qa|prod)$ ]]; then
    echo "Error: Environment must be one of: dev, qa, prod"
    exit 1
fi

# Run the unified build orchestrator
echo "Running Skidbladnir build orchestrator..."
echo "Environment: $ENVIRONMENT"
echo "Verbose: $VERBOSE"
echo "CI Mode: $CI_MODE"
echo "Push Git: $PUSH_GIT"
echo ""

# Execute the build orchestrator
"${SCRIPT_DIR}/util/build-orchestrator.sh" "$ENVIRONMENT" "$CI_MODE" "$VERBOSE" "$PUSH_GIT"

# Exit with the same exit code as the orchestrator
exit $?