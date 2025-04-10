#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Skidbladnir QuickStart Script
# ----------------------------
# This script provides a single-command experience to get started with Skidbladnir.
# Just clone the repo, run this script, and you're ready to go!

set -e

# ANSI colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'
NORMAL='\033[0m'

# Detect operating system to configure environment
# Function to check if running in WSL
is_wsl() {
  if grep -q "microsoft" /proc/version 2>/dev/null || grep -q "Microsoft" /proc/sys/kernel/osrelease 2>/dev/null; then
    return 0  # true in shell
  else
    return 1  # false in shell
  fi
}

# Function to check if running on Windows
is_windows() {
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    return 0  # true in shell
  else
    return 1  # false in shell
  fi
}

# Function to detect native Ubuntu
is_ubuntu() {
  if [[ -f /etc/lsb-release && "$(grep -c Ubuntu /etc/lsb-release)" -gt 0 ]]; then
    return 0  # true in shell
  else
    return 1  # false in shell
  fi
}

# Function to determine the best container runtime for the platform
detect_container_runtime() {
  if is_windows; then
    # On Windows, prefer Docker Desktop if available
    if command -v docker &> /dev/null; then
      echo "docker"
      return
    fi
  elif is_wsl; then
    # In WSL, check if Docker Desktop is available through WSL integration
    if command -v docker &> /dev/null; then
      echo "docker"
      return
    # Otherwise try podman
    elif command -v podman &> /dev/null; then
      echo "podman"
      return
    fi
  else # Linux native
    # On Linux, prefer podman if available
    if command -v podman &> /dev/null; then
      echo "podman"
      return
    elif command -v docker &> /dev/null; then
      echo "docker"
      return
    fi
  fi
  
  # Default fallback
  echo "docker"
}

# Default settings
COMPOSE_FILE="infra/compose/docker-compose.quickstart.yml"
PORT=8080
RUNTIME=$(detect_container_runtime)
BUILD="true"
OPEN_BROWSER="true"

print_banner() {
  echo -e "${BLUE}"
  echo "  _____ _    _     _ _     _           _       _    "
  echo " / ____| |  (_)   | | |   | |         | |     (_)   "
  echo "| (___ | | ___  __| | |__ | | __ _  __| |_ __  _ _ __"
  echo " \___ \| |/ / |/ _\` | '_ \| |/ _\` |/ _\` | '_ \| | '__|"
  echo " ____) |   <| | (_| | |_) | | (_| | (_| | | | | | |   "
  echo "|_____/|_|\_\_|\__,_|_.__/|_|\__,_|\__,_|_| |_|_|_|   "
  echo -e "${NC}"
  echo -e "${CYAN}Universal Test Case Migration Platform${NC}"
  echo -e "${YELLOW}https://github.com/heymumford/skidbladnir${NC}"
  echo
}

# Usage info
usage() {
  echo -e "${BOLD}Skidbladnir Quick Start${NORMAL}"
  echo
  echo "This script provides a simple way to get started with Skidbladnir."
  echo "It builds and starts all required containers for the web UI experience."
  echo
  echo "Usage: $0 [options]"
  echo
  echo "Options:"
  echo "  -p, --port PORT       Port to use for web UI (default: $PORT)"
  echo "  -r, --runtime NAME    Container runtime: docker or podman (default: $RUNTIME)"
  echo "  --no-build            Skip building containers (use pre-built images)"
  echo "  --no-browser          Don't automatically open browser"
  echo "  -h, --help            Show this help message"
  echo
  echo "Examples:"
  echo "  $0                    # Start with defaults"
  echo "  $0 -p 3000            # Use port 3000 for web UI"
  echo "  $0 -r podman          # Use podman instead of docker"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -r|--runtime)
      RUNTIME="$2"
      shift 2
      ;;
    --no-build)
      BUILD="false"
      shift
      ;;
    --no-browser)
      OPEN_BROWSER="false"
      shift
      ;;
    -h|--help)
      print_banner
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Check if runtime is available
if ! command -v $RUNTIME &> /dev/null; then
  echo -e "${RED}Error: $RUNTIME is not installed or not available in PATH${NC}"
  echo "Please install Docker from https://docs.docker.com/get-docker/"
  echo "or Podman from https://podman.io/get-started/installation"
  exit 1
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" &> /dev/null
}

# Function to open browser
open_browser() {
  local url="$1"
  
  # Delay to allow services to start
  echo -e "${YELLOW}Waiting for services to start...${NC}"
  sleep 5
  
  echo -e "${GREEN}Opening browser at $url${NC}"
  
  # Try to open browser based on platform
  if is_windows; then
    # Windows-specific browser opening
    start "$url" &
  elif is_wsl; then
    # WSL-specific handling
    if command_exists powershell.exe; then
      # Use Windows' powershell to open the browser
      powershell.exe -Command "Start-Process '$url'"
    elif command_exists cmd.exe; then
      # Use Windows' cmd to open the browser
      cmd.exe /c start "$url"
    elif command_exists xdg-open; then
      # If X server is running in WSL
      xdg-open "$url" &
    else
      echo -e "${YELLOW}Could not automatically open browser in WSL.${NC}"
      echo -e "Please open ${CYAN}$url${NC} manually in your browser."
    fi
  elif is_ubuntu || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux-specific browser opening
    if command_exists xdg-open; then
      xdg-open "$url" &
    else
      echo -e "${YELLOW}Could not automatically open browser on Linux.${NC}"
      echo -e "Please open ${CYAN}$url${NC} manually in your browser."
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS-specific browser opening
    open "$url" &
  else
    # Generic fallback for other platforms
    echo -e "${YELLOW}Could not automatically open browser on your platform.${NC}"
    echo -e "Please open ${CYAN}$url${NC} manually in your browser."
  fi
}

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

# Main execution
print_banner

echo -e "${CYAN}Starting Skidbladnir Quick Setup...${NC}"
echo -e "This will set up a complete Skidbladnir environment with web UI."
echo

# Detect platform and show information
if is_windows; then
  echo -e "${BLUE}Detected Windows environment${NC}"
  echo -e "Using ${YELLOW}$RUNTIME${NC} as container runtime"
elif is_wsl; then
  echo -e "${BLUE}Detected Windows Subsystem for Linux (WSL)${NC}"
  echo -e "Using ${YELLOW}$RUNTIME${NC} as container runtime"
  
  # Check if Docker Desktop is configured for WSL integration
  if [ "$RUNTIME" == "docker" ]; then
    if ! docker info &>/dev/null; then
      echo -e "${YELLOW}Warning: Docker seems to be installed but not running.${NC}"
      echo -e "Please make sure Docker Desktop is running with WSL integration enabled."
      echo -e "See https://docs.docker.com/desktop/wsl/ for more information."
      read -p "Press Enter to continue anyway, or Ctrl+C to abort..."
    fi
  fi
elif is_ubuntu; then
  echo -e "${BLUE}Detected Ubuntu environment${NC}"
  echo -e "Using ${YELLOW}$RUNTIME${NC} as container runtime"
  
  # Check if running as root (common issue on Ubuntu)
  if [ "$RUNTIME" == "docker" ] && [ "$(id -u)" -ne 0 ] && ! groups | grep -q docker; then
    echo -e "${YELLOW}Warning: You might not have permission to use Docker.${NC}"
    echo -e "Consider running: sudo usermod -aG docker $USER"
    echo -e "Then log out and log back in, or run this script with sudo."
    read -p "Press Enter to continue anyway, or Ctrl+C to abort..."
  fi
else
  echo -e "${BLUE}Detected $(uname -s) environment${NC}"
  echo -e "Using ${YELLOW}$RUNTIME${NC} as container runtime"
fi

echo

# Update PORT in the compose file
echo -e "${BLUE}Configuring port to $PORT...${NC}"
# Handle both Linux and BSD sed variants (for macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/- \"8080:8080\"/- \"$PORT:8080\"/" "$COMPOSE_FILE"
else
  sed -i "s/- \"8080:8080\"/- \"$PORT:8080\"/" "$COMPOSE_FILE"
fi

# Build containers if needed
if [ "$BUILD" == "true" ]; then
  echo -e "${BLUE}Building containers (this may take a few minutes)...${NC}"
  run_compose build
fi

# Start services
echo -e "${BLUE}Starting services...${NC}"
run_compose up -d

# Show service status
echo -e "${BLUE}Service status:${NC}"
if [ "$RUNTIME" == "docker" ]; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -i skidbladnir || echo -e "${YELLOW}No containers found. They may still be starting...${NC}"
else
  podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -i skidbladnir || echo -e "${YELLOW}No containers found. They may still be starting...${NC}"
fi

# Display information about how to access the UI
echo
echo -e "${GREEN}✅ Skidbladnir is now running!${NC}"
echo
echo -e "🌐 Access the web UI at: ${CYAN}http://localhost:$PORT${NC}"
echo
echo -e "📋 Available commands:"
echo -e " - ${YELLOW}./scripts/quick-start.sh --help${NC}          Show help"
echo -e " - ${YELLOW}$RUNTIME-compose -f $COMPOSE_FILE logs -f${NC} View logs"
echo -e " - ${YELLOW}$RUNTIME-compose -f $COMPOSE_FILE down${NC}    Stop Skidbladnir"
echo

# Open browser if requested
if [ "$OPEN_BROWSER" == "true" ]; then
  open_browser "http://localhost:$PORT"
fi

echo -e "${GREEN}Happy migrating! 🚀${NC}"