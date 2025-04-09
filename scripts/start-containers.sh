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

echo "🚀 Starting containers for ${ENV} environment"

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

# Load environment variables if .env file exists
ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
if [ -f "${ENV_FILE}" ]; then
  echo "📝 Loading environment variables from ${ENV_FILE}"
  export $(grep -v '^#' "${ENV_FILE}" | xargs)
fi

# Start the containers using podman-compose
echo "🔄 Starting services defined in ${COMPOSE_FILE}"
podman-compose -f "${COMPOSE_FILE}" up -d

# Wait for services to be healthy (5 minutes timeout)
echo "⏳ Waiting for services to be healthy..."
TIMEOUT=300
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - START_TIME))
  
  if [ "${ELAPSED_TIME}" -gt "${TIMEOUT}" ]; then
    echo "❌ Timeout reached waiting for healthy services"
    podman-compose -f "${COMPOSE_FILE}" ps
    exit 1
  fi
  
  # Check container health using podman
  UNHEALTHY_COUNT=$(podman ps --filter "name=testbridge" --format "{{.Status}}" | grep -v "healthy" | wc -l)
  
  if [ "${UNHEALTHY_COUNT}" -eq 0 ]; then
    echo "✅ All services are healthy!"
    break
  fi
  
  echo "🔄 Waiting for services to be ready... (${ELAPSED_TIME}s elapsed)"
  sleep 10
done

echo "✅ Containers started successfully"
echo "📊 Services status:"
podman-compose -f "${COMPOSE_FILE}" ps