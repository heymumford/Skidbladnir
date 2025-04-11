#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#
# consolidated-env-tools.sh
# 
# A unified environment management system for the Skidbladnir project.
# This script combines functionality from various environment management scripts.
#
# Usage: consolidated-env-tools.sh [command] [options]
#
# Commands:
#   setup               Configure environment variables
#   start               Start containers
#   stop                Stop containers
#   restart             Restart containers
#   status              Show container status
#   logs [service]      Show container logs
#   build               Build development containers
#   registry            Start local registry
#   clean               Clean up containers and volumes
#   --help, -h          Show this help
#
# Options:
#   --env=ENV           Environment (dev, qa, prod)
#

set -e

# Get the repository root directory
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  PROJECT_ROOT=$(git rev-parse --show-toplevel)
else
  SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
  PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/../..")
fi

# Go to project root
cd "${PROJECT_ROOT}"

# Default values
COMMAND=${1:-"status"}
ENV="dev"
REGISTRY_PORT=5000
TIMEOUT=300
SERVICE=""

# Process command
if [[ "$1" =~ ^(setup|start|stop|restart|status|logs|build|registry|clean)$ ]]; then
  COMMAND="$1"
  shift
fi

# Process optional service argument for logs
if [ "$COMMAND" = "logs" ] && [ $# -gt 0 ] && [[ ! "$1" =~ ^-- ]]; then
  SERVICE="$1"
  shift
fi

# Process arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      ENV="${1#*=}"
      shift
      ;;
    --timeout=*)
      TIMEOUT="${1#*=}"
      shift
      ;;
    --help|-h)
      echo "Skidbladnir Environment Management"
      echo ""
      echo "Usage: $0 [command] [options]"
      echo ""
      echo "Commands:"
      echo "  setup               Configure environment variables"
      echo "  start               Start containers"
      echo "  stop                Stop containers"
      echo "  restart             Restart containers"
      echo "  status              Show container status (default)"
      echo "  logs [service]      Show container logs"
      echo "  build               Build development containers"
      echo "  registry            Start local registry"
      echo "  clean               Clean up containers and volumes"
      echo ""
      echo "Options:"
      echo "  --env=ENV           Environment (dev, qa, prod) [default: dev]"
      echo "  --timeout=SECONDS   Timeout in seconds [default: 300]"
      echo ""
      echo "Examples:"
      echo "  $0 setup --env=qa           # Set up QA environment"
      echo "  $0 start --env=dev          # Start development containers"
      echo "  $0 logs api                 # Show logs for the API service"
      echo ""
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "$ENV" =~ ^(dev|qa|prod)$ ]]; then
  echo "Error: Environment must be one of: dev, qa, prod"
  exit 1
fi

# Get the appropriate compose file
get_compose_file() {
  case "${ENV}" in
    "dev")
      echo "${PROJECT_ROOT}/infra/dev/podman-compose.yml"
      ;;
    "qa")
      echo "${PROJECT_ROOT}/infra/qa/podman-compose.yml"
      ;;
    "prod")
      echo "${PROJECT_ROOT}/infra/prod/podman-compose.yml"
      ;;
  esac
}

COMPOSE_FILE=$(get_compose_file)

# Function to set up environment variables
setup_environment() {
  echo "🔧 Setting up environment for ${ENV}"
  
  ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
  
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
}

# Function to build development containers
build_containers() {
  echo "🔨 Building development containers..."
  
  # Build TypeScript development container
  echo "Building TypeScript development container..."
  podman build -t testbridge/typescript-dev:latest \
    -f "${PROJECT_ROOT}/infra/dev/typescript.Dockerfile" \
    "${PROJECT_ROOT}"
  
  # Build Python development container
  echo "Building Python development container..."
  podman build -t testbridge/python-dev:latest \
    -f "${PROJECT_ROOT}/infra/dev/python.Dockerfile" \
    "${PROJECT_ROOT}"
  
  # Build Go development container
  echo "Building Go development container..."
  podman build -t testbridge/go-dev:latest \
    -f "${PROJECT_ROOT}/infra/dev/go.Dockerfile" \
    "${PROJECT_ROOT}"
  
  echo "✅ Development containers built successfully."
}

# Function to start the container registry
start_registry() {
  if ! podman ps | grep -q "registry:2"; then
    echo "🚀 Starting local container registry on port ${REGISTRY_PORT}..."
    podman run -d --name registry -p ${REGISTRY_PORT}:5000 registry:2
    echo "✅ Registry started. Use localhost:${REGISTRY_PORT} as your registry."
  else
    echo "✅ Registry is already running."
  fi
}

# Function to start containers
start_containers() {
  echo "🚀 Starting containers for ${ENV} environment"
  
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  # Load environment variables if .env file exists
  ENV_FILE="${PROJECT_ROOT}/.env.${ENV}"
  if [ -f "${ENV_FILE}" ]; then
    echo "📝 Loading environment variables from ${ENV_FILE}"
    export $(grep -v '^#' "${ENV_FILE}" | xargs)
  fi
  
  # Start the containers using podman-compose
  echo "🔄 Starting services defined in ${COMPOSE_FILE}"
  podman-compose -f "${COMPOSE_FILE}" up -d
  
  # Wait for services to be healthy
  echo "⏳ Waiting for services to be healthy..."
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
}

# Function to stop containers
stop_containers() {
  echo "🛑 Stopping containers for ${ENV} environment"
  
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  # Stop the containers using podman-compose
  podman-compose -f "${COMPOSE_FILE}" down
  
  echo "✅ Containers stopped successfully"
}

# Function to restart containers
restart_containers() {
  echo "🔄 Restarting containers for ${ENV} environment"
  
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  # Restart the containers using podman-compose
  podman-compose -f "${COMPOSE_FILE}" restart
  
  echo "✅ Containers restarted successfully"
  echo "📊 Services status:"
  podman-compose -f "${COMPOSE_FILE}" ps
}

# Function to show container status
show_status() {
  echo "📊 Container status for ${ENV} environment:"
  
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  # Show container status using podman-compose
  podman-compose -f "${COMPOSE_FILE}" ps
}

# Function to show container logs
show_logs() {
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  # Show logs using podman-compose
  if [ -z "${SERVICE}" ]; then
    echo "📋 Showing logs for all containers in ${ENV} environment:"
    podman-compose -f "${COMPOSE_FILE}" logs
  else
    echo "📋 Showing logs for ${SERVICE} in ${ENV} environment:"
    podman-compose -f "${COMPOSE_FILE}" logs "${SERVICE}"
  fi
}

# Function to clean up containers and volumes
clean_environment() {
  echo "🧹 Cleaning up containers and volumes for ${ENV} environment"
  
  # Check if compose file exists
  if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Compose file not found: ${COMPOSE_FILE}"
    exit 1
  fi
  
  echo "WARNING: This will remove all containers and volumes for the ${ENV} environment."
  read -p "Are you sure you want to continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stop and remove containers and volumes using podman-compose
    podman-compose -f "${COMPOSE_FILE}" down -v
    
    # For dev environment, also remove development images
    if [ "${ENV}" = "dev" ]; then
      echo "🗑️ Removing development images..."
      podman rmi testbridge/typescript-dev:latest || true
      podman rmi testbridge/python-dev:latest || true
      podman rmi testbridge/go-dev:latest || true
    fi
    
    echo "✅ Cleanup completed successfully"
  else
    echo "❌ Cleanup aborted"
  fi
}

# Execute the requested command
case "${COMMAND}" in
  "setup")
    setup_environment
    ;;
  "start")
    start_containers
    ;;
  "stop")
    stop_containers
    ;;
  "restart")
    restart_containers
    ;;
  "status")
    show_status
    ;;
  "logs")
    show_logs
    ;;
  "build")
    build_containers
    ;;
  "registry")
    start_registry
    ;;
  "clean")
    clean_environment
    ;;
  *)
    echo "❌ Unknown command: ${COMMAND}"
    echo "Use --help for usage information."
    exit 1
    ;;
esac

exit 0