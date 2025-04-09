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

echo "🚀 Starting Orchestrator service in ${ENV} environment"

# Set environment-specific variables
ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
if [ -f "${ENV_FILE}" ]; then
  echo "📝 Loading environment variables from ${ENV_FILE}"
  export $(grep -v '^#' "${ENV_FILE}" | xargs)
fi

# Run the orchestrator based on environment
case "${ENV}" in
  "dev")
    # In dev, run with Python directly
    echo "🐍 Running Python orchestrator in development mode"
    cd ${PROJECT_ROOT}/cmd/orchestrator
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ;;
  "qa"|"prod")
    # In QA/prod, run the built version from dist directory
    echo "🐍 Running Python orchestrator from build"
    cd ${PROJECT_ROOT}/dist/python/orchestrator
    python -m uvicorn main:app --host 0.0.0.0 --port 8000
    ;;
  *)
    echo "❌ Unknown environment: ${ENV}"
    echo "Usage: $0 [dev|qa|prod]"
    exit 1
    ;;
esac