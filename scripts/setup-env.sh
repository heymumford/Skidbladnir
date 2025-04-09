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
# setup-env.sh - Configure environment-specific variables

set -e

ENV=${1:-"qa"}
PROJECT_ROOT=$(pwd)
ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"

echo "🔧 Setting up environment for ${ENV}"

# Create environment-specific .env file if it doesn't exist
if [ ! -f "${ENV_FILE}" ]; then
  echo "Creating default .env file for ${ENV}"
  
  # Common variables
  echo "# Skíðblaðnir Environment Configuration for ${ENV}" > "${ENV_FILE}"
  echo "BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${ENV_FILE}"
  echo "NODE_ENV=${ENV}" >> "${ENV_FILE}"
  
  # Environment-specific defaults
  if [ "${ENV}" == "prod" ]; then
    echo "LOG_LEVEL=info" >> "${ENV_FILE}"
    echo "LLM_MODEL_SIZE=standard" >> "${ENV_FILE}"
    echo "CACHE_SIZE=2048" >> "${ENV_FILE}"
    echo "USE_QUANTIZED_MODELS=true" >> "${ENV_FILE}"
    echo "API_RATE_LIMIT=100" >> "${ENV_FILE}"
    echo "RETRY_ATTEMPTS=5" >> "${ENV_FILE}"
    echo "CIRCUIT_BREAKER_THRESHOLD=10" >> "${ENV_FILE}"
  else # qa, dev
    echo "LOG_LEVEL=debug" >> "${ENV_FILE}"
    echo "LLM_MODEL_SIZE=small" >> "${ENV_FILE}"
    echo "CACHE_SIZE=512" >> "${ENV_FILE}"
    echo "USE_QUANTIZED_MODELS=true" >> "${ENV_FILE}"
    echo "API_RATE_LIMIT=500" >> "${ENV_FILE}"
    echo "RETRY_ATTEMPTS=3" >> "${ENV_FILE}"
    echo "CIRCUIT_BREAKER_THRESHOLD=5" >> "${ENV_FILE}"
  fi
fi

# Load environment variables
set -a
source "${ENV_FILE}"
set +a

# Display environment configuration
echo "🔍 Environment configuration:"
echo "  - Environment: ${ENV}"
echo "  - Log Level: ${LOG_LEVEL}"
echo "  - LLM Model Size: ${LLM_MODEL_SIZE}"
echo "  - Cache Size: ${CACHE_SIZE}"
echo "  - Using Quantized Models: ${USE_QUANTIZED_MODELS}"

# Ensure required directories exist
mkdir -p "${PROJECT_ROOT}/models/${ENV}"
mkdir -p "${PROJECT_ROOT}/data/${ENV}"
mkdir -p "${PROJECT_ROOT}/logs/${ENV}"

echo "✅ Environment setup complete for ${ENV}"