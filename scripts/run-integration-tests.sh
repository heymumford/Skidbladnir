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
# run-integration-tests.sh - Run integration tests with containers

set -e

ENV=${1:-"qa"}
PROJECT_ROOT=$(pwd)
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results/integration"
COMPOSE_FILE="docker-compose.${ENV}.yml"

# Create output directory
mkdir -p "${TEST_RESULTS_DIR}"

echo "🔄 Running Skíðblaðnir integration tests in ${ENV} environment"

# Ensure we have the environment variables
source "${PROJECT_ROOT}/.env.${ENV}"

# Start test containers
echo "🚀 Starting test containers..."
docker compose -f "${COMPOSE_FILE}" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
# Custom function to check if services are ready
check_services_ready() {
  local max_attempts=30
  local attempt=1
  local all_ready=false
  
  while [ $attempt -le $max_attempts ]; do
    echo "Checking services (attempt $attempt/$max_attempts)..."
    
    # Check if all services are healthy
    local unhealthy_count=$(docker compose -f "${COMPOSE_FILE}" ps --format "{{.Health}}" | grep -v "healthy" | wc -l)
    
    if [ $unhealthy_count -eq 0 ]; then
      all_ready=true
      break
    fi
    
    attempt=$((attempt + 1))
    sleep 5
  done
  
  if [ "$all_ready" = true ]; then
    echo "✅ All services are ready"
    return 0
  else
    echo "❌ Some services failed to start properly"
    docker compose -f "${COMPOSE_FILE}" ps
    return 1
  fi
}

# Check if services are ready
check_services_ready

# Run the integration tests
echo "🧪 Running integration tests..."
docker compose -f "${COMPOSE_FILE}" exec -T llm-advisor npm run test:integration -- \
  --ci \
  --reporters=default --reporters=jest-junit \
  --outputFile="${TEST_RESULTS_DIR}/junit.xml"

# Run the API contract tests
echo "📝 Running API contract tests..."
docker compose -f "${COMPOSE_FILE}" exec -T api-bridge npm run test:contract

# Run the end-to-end tests
echo "🌐 Running end-to-end tests..."
docker compose -f "${COMPOSE_FILE}" exec -T ui npm run test:e2e -- \
  --headless \
  --reporter=junit \
  --reporter-options="outputFile=${TEST_RESULTS_DIR}/e2e-junit.xml"

# Generate combined test report
echo "📊 Generating combined test report..."
docker compose -f "${COMPOSE_FILE}" exec -T llm-advisor node scripts/generate-test-report.js \
  --input="${TEST_RESULTS_DIR}" \
  --output="${TEST_RESULTS_DIR}/integration-report.html"

# Collect container logs for debugging
echo "📝 Collecting container logs..."
docker compose -f "${COMPOSE_FILE}" logs > "${TEST_RESULTS_DIR}/container-logs.txt"

# Stop containers
echo "🛑 Stopping test containers..."
docker compose -f "${COMPOSE_FILE}" down

echo "✅ Integration tests completed"

# Display summary
echo "📋 Integration Test Summary:"
echo "  - Results Directory: ${TEST_RESULTS_DIR}"
echo "  - Test Report: ${TEST_RESULTS_DIR}/integration-report.html"
echo "  - Container Logs: ${TEST_RESULTS_DIR}/container-logs.txt"