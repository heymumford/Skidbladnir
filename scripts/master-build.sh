#!/bin/bash
# master-build.sh - Main orchestration script for Skíðblaðnir build pipeline

set -e

# Configuration
ENV=${1:-"qa"}  # Default to QA environment
CI_MODE=${2:-"false"}  # Running in CI or locally
BUILD_ID=$(date +%Y%m%d%H%M%S)
PROJECT_ROOT=$(pwd)
DOCKER_REGISTRY="skidbladnir"
COMPOSE_FILE="docker-compose.${ENV}.yml"

# Log configuration
echo "🚀 Starting Skíðblaðnir build for ${ENV} environment (Build: ${BUILD_ID})"

# Step 1: Setup environment-specific variables
source "${PROJECT_ROOT}/scripts/setup-env.sh" "${ENV}"

# Step 2: Run tests
echo "🧪 Running tests..."
./scripts/run-tests.sh

# Step 3: Build & optimize LLM models
echo "🧠 Building LLM models..."
./scripts/prepare-llm-models.sh "${ENV}"

# Step 4: Build containers with optimized layers
echo "📦 Building containers..."
docker compose -f "${COMPOSE_FILE}" build \
  --build-arg BUILD_ID="${BUILD_ID}" \
  --build-arg ENV="${ENV}"

# Step 5: Run integration tests with containers
echo "🔄 Running integration tests..."
./scripts/run-integration-tests.sh "${ENV}"

# Step 6: Git operations for tracking changes
if [ "${CI_MODE}" == "false" ]; then
  echo "📝 Committing build artifacts..."
  git add ./build-versions.json
  git commit -m "Build ${BUILD_ID} for ${ENV} environment" || true
fi

# Step 7: Run GitHub CI locally if requested
if [ "${CI_MODE}" == "true" ]; then
  echo "🔧 Running GitHub CI locally with act..."
  act -j build
fi

# Step 8: Deploy to environment
echo "🚀 Deploying to ${ENV}..."
./scripts/deploy.sh "${ENV}" "${BUILD_ID}"

echo "✅ Build and deployment complete for ${ENV} environment (Build: ${BUILD_ID})"