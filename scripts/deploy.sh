#!/bin/bash
# deploy.sh - Deploy Skíðblaðnir to target environment

set -e

ENV=${1:-"qa"}
BUILD_ID=${2:-$(date +%Y%m%d%H%M%S)}
PROJECT_ROOT=$(pwd)
DOCKER_REGISTRY="skidbladnir"
COMPOSE_FILE="docker-compose.${ENV}.yml"

echo "🚀 Deploying Skíðblaðnir to ${ENV} environment (Build: ${BUILD_ID})"

# Load environment variables
source "${PROJECT_ROOT}/.env.${ENV}"

# Create deployment record
DEPLOY_RECORD="${PROJECT_ROOT}/deployments/${ENV}/${BUILD_ID}.json"
mkdir -p "$(dirname "${DEPLOY_RECORD}")"

cat > "${DEPLOY_RECORD}" << EOF
{
  "buildId": "${BUILD_ID}",
  "environment": "${ENV}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
  "deployedBy": "$(whoami)"
}
EOF

# Tag images for deployment
echo "🏷️ Tagging images for deployment..."
docker compose -f "${COMPOSE_FILE}" config --format=json | jq -r '.services | keys[]' | while read service; do
  docker tag "${DOCKER_REGISTRY}/${service}:latest" "${DOCKER_REGISTRY}/${service}:${BUILD_ID}"
  
  # For production, also update the 'stable' tag
  if [ "${ENV}" == "prod" ]; then
    docker tag "${DOCKER_REGISTRY}/${service}:latest" "${DOCKER_REGISTRY}/${service}:stable"
  fi
done

# Deploy logic based on environment
if [ "${ENV}" == "prod" ]; then
  echo "🌎 Deploying to production environment..."
  
  # For production, we would use a more sophisticated deployment method
  # This is just a placeholder - replace with your actual production deployment
  
  # Example: Deploy with blue/green methodology
  echo "Performing blue/green deployment..."
  
  # 1. Prepare new environment
  echo "Preparing new environment..."
  ./scripts/prepare-env.sh "${ENV}" "blue"
  
  # 2. Deploy to new environment
  echo "Deploying to new environment..."
  docker compose -f "${COMPOSE_FILE}" -f docker-compose.prod.blue.yml up -d
  
  # 3. Run smoke tests
  echo "Running smoke tests..."
  ./scripts/smoke-tests.sh "${ENV}" "blue"
  
  # 4. Switch traffic
  echo "Switching traffic to new environment..."
  ./scripts/switch-traffic.sh "blue"
  
  # 5. Finalize deployment
  echo "Finalizing deployment..."
  ./scripts/finalize-deployment.sh "${ENV}" "${BUILD_ID}"
  
else
  # For non-production environments, simple deployment
  echo "Deploying to ${ENV} environment..."
  docker compose -f "${COMPOSE_FILE}" up -d
  
  # Wait for services to be healthy
  echo "Waiting for services to be healthy..."
  ./scripts/wait-for-healthy.sh "${COMPOSE_FILE}"
  
  # Run post-deployment validation
  echo "Running post-deployment validation..."
  ./scripts/validate-deployment.sh "${ENV}"
fi

# Update deployment status
echo "Updating deployment status..."
cat > "${DEPLOY_RECORD}" << EOF
{
  "buildId": "${BUILD_ID}",
  "environment": "${ENV}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
  "deployedBy": "$(whoami)",
  "status": "completed",
  "completedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ Deployment to ${ENV} environment completed successfully (Build: ${BUILD_ID})"
echo "📊 Services available at: http://localhost:${WEB_PORT:-3000}"