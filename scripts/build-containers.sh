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

# Default environment is development
ENV=${1:-"dev"}
BUILD_ID=$(date +%Y%m%d%H%M%S)
PROJECT_ROOT=$(pwd)
REGISTRY="localhost:5000"
TAG="latest"

echo "🐳 Building containers for ${ENV} environment (Build: ${BUILD_ID})"

# Set environment-specific variables
case "${ENV}" in
  "dev")
    DOCKERFILE_DIR="${PROJECT_ROOT}/infra/dev"
    ;;
  "qa")
    DOCKERFILE_DIR="${PROJECT_ROOT}/infra/qa"
    ;;
  "prod")
    DOCKERFILE_DIR="${PROJECT_ROOT}/infra/prod"
    TAG="${BUILD_ID}"
    ;;
  *)
    echo "❌ Unknown environment: ${ENV}"
    echo "Usage: $0 [dev|qa|prod]"
    exit 1
    ;;
esac

# Build API container
echo "🔨 Building API container..."
podman build \
  -t "${REGISTRY}/testbridge/api:${TAG}" \
  -f "${DOCKERFILE_DIR}/api.Dockerfile" .
  
# Build Orchestrator container
echo "🔨 Building Orchestrator container..."
podman build \
  -t "${REGISTRY}/testbridge/orchestrator:${TAG}" \
  -f "${DOCKERFILE_DIR}/orchestrator.Dockerfile" .
  
# Build Binary Processor container
echo "🔨 Building Binary Processor container..."
podman build \
  -t "${REGISTRY}/testbridge/binary-processor:${TAG}" \
  -f "${DOCKERFILE_DIR}/binary-processor.Dockerfile" .

# For production builds, also tag as latest
if [ "${ENV}" = "prod" ]; then
  echo "🏷️ Tagging production images as latest..."
  podman tag "${REGISTRY}/testbridge/api:${TAG}" "${REGISTRY}/testbridge/api:latest"
  podman tag "${REGISTRY}/testbridge/orchestrator:${TAG}" "${REGISTRY}/testbridge/orchestrator:latest"
  podman tag "${REGISTRY}/testbridge/binary-processor:${TAG}" "${REGISTRY}/testbridge/binary-processor:latest"
fi

echo "✅ Container builds completed successfully"
echo "📦 Images available:"
podman images | grep testbridge