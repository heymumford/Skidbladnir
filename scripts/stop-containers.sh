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
PROJECT_ROOT=$(pwd)

echo "🛑 Stopping containers for ${ENV} environment"

# Set environment-specific variables
case "${ENV}" in
  "dev")
    COMPOSE_FILE="${PROJECT_ROOT}/infra/dev/podman-compose.yml"
    ;;
  "qa")
    COMPOSE_FILE="${PROJECT_ROOT}/infra/qa/podman-compose.yml"
    ;;
  "prod")
    COMPOSE_FILE="${PROJECT_ROOT}/infra/prod/podman-compose.yml"
    ;;
  *)
    echo "❌ Unknown environment: ${ENV}"
    echo "Usage: $0 [dev|qa|prod]"
    exit 1
    ;;
esac

# Stop containers
echo "🔄 Stopping services defined in ${COMPOSE_FILE}"
podman-compose -f "${COMPOSE_FILE}" down

# Optional: Remove volumes if the second parameter is "clean"
if [ "$2" = "clean" ]; then
  echo "🧹 Removing volumes..."
  podman-compose -f "${COMPOSE_FILE}" down -v
fi

echo "✅ Containers stopped successfully"