#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# laptop-dev.sh
# Helps manage Skidbladnir development environment for laptop-friendly resource usage
# Designed for Windows 10/11 with 16GB RAM, 4-core 3GHz processor

set -e

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'
NORMAL='\033[0m'

# Default settings
COMPOSE_FILE="infra/dev/podman-compose-laptop.yml"
RUNTIME="podman"
COMMAND=""
SERVICES=""
SHOW_MEMORY=true

# Available service groups
MINIMAL_SERVICES="postgres redis minio"
API_SERVICES="postgres redis minio"
PROVIDER_SERVICES="postgres redis minio"
LLM_SERVICES="postgres redis minio llm-advisor"
ALL_SERVICES="postgres redis minio llm-advisor"

# Print usage info
usage() {
  echo -e "${BOLD}Skidbladnir Laptop-Friendly Development Environment${NORMAL}"
  echo
  echo "Usage: $0 [options] COMMAND [services...]"
  echo
  echo "Commands:"
  echo "  up         Start services"
  echo "  down       Stop services"
  echo "  restart    Restart services"
  echo "  status     Show service status"
  echo "  shell      Start a shell in the specified service"
  echo "  logs       Show logs for specified services"
  echo
  echo "Service Groups:"
  echo "  minimal     Minimum required services (postgres, redis, minio)"
  echo "  api         Services for API development"
  echo "  provider    Services for provider development"
  echo "  llm         Services for LLM development (includes LLM service)"
  echo "  typescript  Start TypeScript development container"
  echo "  python      Start Python development container"
  echo "  go          Start Go development container"
  echo "  all         All services"
  echo
  echo "Options:"
  echo "  -f, --file FILE      Compose file to use (default: $COMPOSE_FILE)"
  echo "  -r, --runtime NAME   Container runtime: docker or podman (default: $RUNTIME)"
  echo "  -m, --memory         Show memory usage after operation"
  echo "  -h, --help           Show this help message"
  echo
  echo "Examples:"
  echo "  $0 up minimal             # Start minimal required services"
  echo "  $0 up typescript          # Start TypeScript dev environment"
  echo "  $0 up llm                 # Start LLM development services"
  echo "  $0 shell typescript       # Open shell in TypeScript container"
  echo "  $0 logs -f api            # Follow logs for API service"
  echo "  $0 down                   # Stop all services"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    -r|--runtime)
      RUNTIME="$2"
      shift 2
      ;;
    -m|--memory)
      SHOW_MEMORY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    up|down|restart|status|shell|logs)
      COMMAND="$1"
      shift
      break
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Process services
if [[ $# -gt 0 ]]; then
  case $1 in
    minimal)
      SERVICES="$MINIMAL_SERVICES"
      ;;
    api)
      SERVICES="$API_SERVICES"
      ;;
    provider)
      SERVICES="$PROVIDER_SERVICES"
      ;;
    llm)
      SERVICES="$LLM_SERVICES"
      ;;
    typescript|python|go)
      SERVICES="$MINIMAL_SERVICES $1"
      ;;
    all)
      SERVICES="$ALL_SERVICES"
      ;;
    *)
      SERVICES="$@"
      ;;
  esac
fi

# Check required arguments
if [ -z "$COMMAND" ]; then
  echo "Error: No command specified"
  usage
  exit 1
fi

# Ensure compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: Compose file not found: $COMPOSE_FILE"
  exit 1
fi

# Ensure runtime is available
if ! command -v $RUNTIME &> /dev/null; then
  echo "Error: $RUNTIME is not installed or not available in PATH"
  exit 1
fi

# Function to run compose commands
run_compose() {
  local cmd="$1"
  shift
  
  echo -e "${BLUE}Running: ${RUNTIME}-compose -f $COMPOSE_FILE $cmd $@${NC}"
  
  if [ "$RUNTIME" == "docker" ]; then
    docker-compose -f "$COMPOSE_FILE" $cmd $@
  else
    podman-compose -f "$COMPOSE_FILE" $cmd $@
  fi
}

# Execute command
case "$COMMAND" in
  up)
    # For 'up', make sure to include '-d' for detached mode
    if [ -z "$SERVICES" ]; then
      run_compose up -d
    else
      run_compose up -d $SERVICES
    fi
    
    echo -e "${GREEN}Services started successfully!${NC}"
    ;;
    
  down)
    run_compose down
    echo -e "${GREEN}Services stopped successfully!${NC}"
    ;;
    
  restart)
    if [ -z "$SERVICES" ]; then
      run_compose restart
    else
      run_compose restart $SERVICES
    fi
    echo -e "${GREEN}Services restarted successfully!${NC}"
    ;;
    
  status)
    if [ "$RUNTIME" == "docker" ]; then
      docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
      podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    ;;
    
  shell)
    if [ -z "$SERVICES" ]; then
      echo "Error: No service specified for shell"
      usage
      exit 1
    fi
    
    # Only use the first service from the list
    SERVICE=$(echo $SERVICES | awk '{print $1}')
    
    echo -e "${BLUE}Starting shell in $SERVICE...${NC}"
    if [ "$RUNTIME" == "docker" ]; then
      docker exec -it $(docker ps -q -f name=$SERVICE) /bin/sh -c "[ -e /bin/bash ] && /bin/bash || /bin/sh"
    else
      podman exec -it $(podman ps -q -f name=$SERVICE) /bin/sh -c "[ -e /bin/bash ] && /bin/bash || /bin/sh"
    fi
    ;;
    
  logs)
    if [ -z "$SERVICES" ]; then
      run_compose logs
    else
      run_compose logs $SERVICES
    fi
    ;;
    
  *)
    echo "Error: Unknown command '$COMMAND'"
    usage
    exit 1
    ;;
esac

# Show memory usage if requested
if [ "$SHOW_MEMORY" = true ]; then
  echo -e "\n${YELLOW}Memory usage:${NC}"
  if [ "$RUNTIME" == "docker" ]; then
    docker stats --no-stream
  else
    podman stats --no-stream
  fi
fi

echo -e "\n${GREEN}Done!${NC}"