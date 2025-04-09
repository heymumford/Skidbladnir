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

ENV=${1:-"qa"}
PROJECT_ROOT=$(pwd)
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results/integration"

# Create output directory
mkdir -p "${TEST_RESULTS_DIR}"

echo "🔄 Running Skíðblaðnir integration tests in ${ENV} environment"

# Set environment variables - try to use .env.{ENV} if it exists
if [ -f "${PROJECT_ROOT}/.env.${ENV}" ]; then
  echo "📝 Loading environment variables from .env.${ENV}"
  export $(grep -v '^#' "${PROJECT_ROOT}/.env.${ENV}" | xargs)
fi

# For integration tests, set the flag to use mocks in development
# but use real implementations in QA/prod
if [ "${ENV}" = "dev" ]; then
  export USE_MOCKS="true"
else
  export USE_MOCKS="false"
fi

echo "📣 Running with USE_MOCKS=${USE_MOCKS}"

# Start test containers if not already running
if [ "${ENV}" != "dev" ]; then
  echo "🚀 Starting containers for ${ENV} environment..."
  
  # Determine the compose file based on environment
  case "${ENV}" in
    "qa")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/qa/podman-compose.yml"
      ;;
    "prod")
      COMPOSE_FILE="${PROJECT_ROOT}/infra/prod/podman-compose.yml"
      ;;
    *)
      echo "❌ Unknown environment: ${ENV}"
      exit 1
      ;;
  esac
  
  # Check if containers are already running
  CONTAINERS_RUNNING=$(podman ps --format '{{.Names}}' | grep -c "testbridge" || echo "0")
  
  if [ "${CONTAINERS_RUNNING}" -eq "0" ]; then
    echo "🐳 Starting containers..."
    podman-compose -f "${COMPOSE_FILE}" up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    TIMEOUT=60
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
      sleep 5
    done
  else
    echo "✅ Containers already running"
  fi
else
  # For dev, we'll use the local dev services
  echo "🚀 Using local development services"
  # We could start the dev services here if needed
fi

# Run the integration tests
echo "🧪 Running integration tests..."
mkdir -p "${TEST_RESULTS_DIR}/reports"

# Run tests with Jest
npx jest --testPathPattern='tests/integration' \
  --config=jest.config.js \
  --runInBand \
  --ci \
  --forceExit \
  --json --outputFile="${TEST_RESULTS_DIR}/results.json"

TEST_EXIT_CODE=$?

# Generate summary
echo "📊 Integration Test Summary:"
if [ -f "${TEST_RESULTS_DIR}/results.json" ]; then
  PASSED=$(grep -o '"numPassedTests":[0-9]*' "${TEST_RESULTS_DIR}/results.json" | cut -d':' -f2)
  FAILED=$(grep -o '"numFailedTests":[0-9]*' "${TEST_RESULTS_DIR}/results.json" | cut -d':' -f2)
  TOTAL=$(grep -o '"numTotalTests":[0-9]*' "${TEST_RESULTS_DIR}/results.json" | cut -d':' -f2)
  
  echo "  - Total Tests  : ${TOTAL}"
  echo "  - Passed Tests : ${PASSED}"
  echo "  - Failed Tests : ${FAILED}"
  echo "  - Success      : $([ ${FAILED} -eq 0 ] && echo 'Yes' || echo 'No')"
fi

# Cleanup containers if we started them, but only if explicitly requested
if [ "${ENV}" != "dev" ] && [ "${2}" = "cleanup" ] && [ "${CONTAINERS_RUNNING}" -eq "0" ]; then
  echo "🧹 Stopping containers..."
  podman-compose -f "${COMPOSE_FILE}" down
fi

echo "✅ Integration tests completed"
echo "  - Results Directory: ${TEST_RESULTS_DIR}"

# Exit with the test exit code
exit ${TEST_EXIT_CODE}