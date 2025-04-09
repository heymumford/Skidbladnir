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

echo "🚀 Starting Binary Processor service in ${ENV} environment"

# Set environment-specific variables
ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
if [ -f "${ENV_FILE}" ]; then
  echo "📝 Loading environment variables from ${ENV_FILE}"
  export $(grep -v '^#' "${ENV_FILE}" | xargs)
fi

# Run the binary processor based on environment
case "${ENV}" in
  "dev")
    # In dev, run the Go source directly
    echo "🦫 Running Go binary processor in development mode"
    cd ${PROJECT_ROOT}/cmd/binary-processor
    go run -mod=../config/go.mod main.go
    ;;
  "qa"|"prod")
    # In QA/prod, run the compiled binary from dist directory
    echo "🦫 Running Go binary processor from build"
    cd ${PROJECT_ROOT}
    ./dist/binary-processor
    ;;
  *)
    echo "❌ Unknown environment: ${ENV}"
    echo "Usage: $0 [dev|qa|prod]"
    exit 1
    ;;
esac