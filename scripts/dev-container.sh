#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

#!/bin/bash
set -e

# Script to launch an interactive development container

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Default values
DEFAULT_CONTAINER="typescript"
PODMAN_NETWORK="testbridge_default"

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "Error: Podman is required but not installed."
    echo "Please install Podman and try again."
    exit 1
fi

# Function to show usage information
show_usage() {
    echo "TestBridge Development Container"
    echo ""
    echo "Usage: $0 [container_type]"
    echo ""
    echo "Container Types:"
    echo "  typescript    TypeScript/Node.js development container"
    echo "  python        Python development container"
    echo "  go            Go development container"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo ""
}

# Process arguments
CONTAINER_TYPE=$1

if [ -z "${CONTAINER_TYPE}" ]; then
    CONTAINER_TYPE=${DEFAULT_CONTAINER}
fi

case "${CONTAINER_TYPE}" in
    typescript)
        CONTAINER_IMAGE="testbridge/typescript-dev:latest"
        WORKDIR="/app/packages"
        ;;
    python)
        CONTAINER_IMAGE="testbridge/python-dev:latest"
        WORKDIR="/app/packages/orchestrator"
        ;;
    go)
        CONTAINER_IMAGE="testbridge/go-dev:latest"
        WORKDIR="/app/packages/binary-processor"
        ;;
    --help|-h|help)
        show_usage
        exit 0
        ;;
    *)
        echo "Error: Unknown container type '${CONTAINER_TYPE}'"
        show_usage
        exit 1
        ;;
esac

# Check if the development environment is running
if ! podman network ls | grep -q "${PODMAN_NETWORK}"; then
    echo "Error: Development environment network not found."
    echo "Please start the development environment first with:"
    echo "./scripts/dev-env.sh up"
    exit 1
fi

# Check if the container image exists
if ! podman image exists "${CONTAINER_IMAGE}"; then
    echo "Error: Container image '${CONTAINER_IMAGE}' not found."
    echo "Please build the development containers first with:"
    echo "./scripts/dev-env.sh build"
    exit 1
fi

# Launch the development container
echo "Launching ${CONTAINER_TYPE} development container..."
podman run \
    --rm \
    -it \
    --network="${PODMAN_NETWORK}" \
    -v "${PROJECT_ROOT}:/app:Z" \
    -w "${WORKDIR}" \
    --name "testbridge-${CONTAINER_TYPE}-dev" \
    "${CONTAINER_IMAGE}"

exit 0