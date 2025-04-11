#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# ====================================================================
# Skidbladnir WSL Installer
# ====================================================================

# Colors and formatting
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'
NC='\033[0m'; BOLD='\033[1m'; DIM='\033[2m'

# Disable colors if not TTY
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && MAGENTA='' && NC='' && BOLD='' && DIM=''

# Error handling
set -o pipefail
ERRORS=0

# Helper functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "\n${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
progress() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; }
success() { msg "  ${GREEN}✓${NC}" "$1"; }
error() { msg "  ${RED}✗${NC}" "$1"; ((ERRORS++)); }
fail() { error "$1"; exit 1; }

# Get WSL version
get_wsl_version() {
  local WSL_VERSION
  if grep -q "WSL2" /proc/version 2>/dev/null; then
    WSL_VERSION="2"
  elif grep -qi "microsoft\|windows" /proc/version 2>/dev/null; then
    WSL_VERSION="1"
  else
    WSL_VERSION="unknown"
  fi
  echo "$WSL_VERSION"
}

# Check Docker Desktop integration
is_docker_desktop_integration_enabled() {
  if command -v docker &>/dev/null && docker info 2>/dev/null | grep -q "Operating System: Ubuntu"; then
    return 0  # Docker Desktop integration is enabled
  else
    return 1  # Docker Desktop integration is not enabled
  fi
}

# Install Docker Engine in WSL
install_docker_engine_wsl() {
  # Update package list
  progress "Updating package list..."
  sudo apt-get update -y &>/dev/null || { error "Failed to update package list"; return 1; }
  
  # Install prerequisites
  progress "Installing prerequisites..."
  sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common &>/dev/null || { error "Failed to install prerequisites"; return 1; }
  
  # Add Docker GPG key
  progress "Adding Docker GPG key..."
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - &>/dev/null || { error "Failed to add Docker GPG key"; return 1; }
  
  # Add Docker repository
  progress "Adding Docker repository..."
  sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" &>/dev/null || { error "Failed to add Docker repository"; return 1; }
  
  # Update package list again
  progress "Updating package list with Docker repository..."
  sudo apt-get update -y &>/dev/null || { error "Failed to update package list"; return 1; }
  
  # Install Docker
  progress "Installing Docker Engine..."
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io &>/dev/null || { error "Failed to install Docker Engine"; return 1; }
  
  # Install Docker Compose
  progress "Installing Docker Compose..."
  sudo apt-get install -y docker-compose &>/dev/null || { error "Failed to install Docker Compose"; return 1; }
  
  # Add user to docker group
  progress "Adding user to docker group..."
  sudo usermod -aG docker "$(whoami)" &>/dev/null || { warn "Failed to add user to docker group"; }
  
  # Start Docker service
  progress "Starting Docker service..."
  sudo service docker start &>/dev/null || { error "Failed to start Docker service"; return 1; }
  
  success "Docker Engine installed in WSL"
  return 0
}

# Check if .wslconfig exists and has appropriate settings
check_wsl_config() {
  local CONFIG_PATH="/mnt/c/Users/$(cmd.exe /c echo %USERNAME% 2>/dev/null | tr -d '\r')/.wslconfig"
  
  if [ ! -f "$CONFIG_PATH" ]; then
    info "No .wslconfig found. Recommending optimal settings..."
    warn "Create a .wslconfig file at ${CONFIG_PATH} with the following content:"
    echo
    echo -e "${CYAN}[wsl2]${NC}"
    echo -e "${CYAN}memory=8GB${NC}"
    echo -e "${CYAN}processors=3${NC}"
    echo -e "${CYAN}swap=2GB${NC}"
    echo
    return 1
  else
    success ".wslconfig found"
    
    # Check for memory setting
    if grep -q "memory=" "$CONFIG_PATH"; then
      success "Memory setting found in .wslconfig"
    else
      warn "No memory setting found in .wslconfig. Recommend adding: memory=8GB"
    fi
    
    # Check for processor setting
    if grep -q "processors=" "$CONFIG_PATH"; then
      success "Processor setting found in .wslconfig"
    else
      warn "No processor setting found in .wslconfig. Recommend adding: processors=3"
    fi
    
    return 0
  fi
}

# Main execution
main() {
  local WSL_VERSION
  WSL_VERSION=$(get_wsl_version)
  
  step "Detecting WSL environment"
  
  if [ "$WSL_VERSION" == "unknown" ]; then
    fail "Not running in WSL environment"
  fi
  
  info "Running in WSL${WSL_VERSION}"
  
  if [ "$WSL_VERSION" == "1" ]; then
    warn "Running in WSL1. WSL2 is recommended for better container performance."
    warn "See: https://docs.microsoft.com/en-us/windows/wsl/install"
  fi
  
  step "Checking WSL configuration"
  check_wsl_config
  
  step "Setting up container runtime"
  
  if is_docker_desktop_integration_enabled; then
    success "Docker Desktop integration is enabled"
    CONTAINER_RUNTIME="docker"
  else
    info "Docker Desktop integration is not enabled"
    
    if command -v podman &>/dev/null; then
      success "Podman is installed"
      CONTAINER_RUNTIME="podman"
    elif command -v docker &>/dev/null; then
      success "Docker Engine is installed in WSL"
      CONTAINER_RUNTIME="docker"
      
      # Check if Docker service is running
      if ! docker info &>/dev/null; then
        warn "Docker service is not running"
        progress "Starting Docker service..."
        sudo service docker start &>/dev/null || { error "Failed to start Docker service"; }
      fi
    else
      info "No container runtime detected. Installing Docker Engine in WSL..."
      if install_docker_engine_wsl; then
        CONTAINER_RUNTIME="docker"
      else
        fail "Failed to install Docker Engine in WSL. Please install Docker Desktop or enable Docker Desktop integration."
      fi
    fi
  fi
  
  step "Configuring container runtime: $CONTAINER_RUNTIME"
  
  case "$CONTAINER_RUNTIME" in
    podman)
      if ! command -v podman-compose &>/dev/null; then
        progress "Installing podman-compose..."
        pip3 install podman-compose &>/dev/null || warn "Failed to install podman-compose"
      else
        success "podman-compose is already installed"
      fi
      ;;
    docker)
      if ! command -v docker-compose &>/dev/null; then
        progress "Installing docker-compose..."
        sudo apt-get update -y &>/dev/null
        sudo apt-get install -y docker-compose &>/dev/null || warn "Failed to install docker-compose"
      else
        success "docker-compose is already installed"
      fi
      ;;
  esac
  
  step "Testing container runtime"
  
  if [ "$CONTAINER_RUNTIME" == "docker" ]; then
    if docker info &>/dev/null; then
      success "Docker is configured correctly"
    else
      error "Docker is not running correctly"
      warn "Please make sure Docker Desktop is running if using Docker Desktop integration"
      warn "Or start the Docker service with: sudo service docker start"
    fi
  elif [ "$CONTAINER_RUNTIME" == "podman" ]; then
    if podman info &>/dev/null; then
      success "Podman is configured correctly"
    else
      error "Podman is not configured correctly"
    fi
  fi
  
  step "Setting up Skidbladnir"
  
  # Make the quick-start script executable
  if [ -f "./scripts/quick-start.sh" ]; then
    chmod +x ./scripts/quick-start.sh
    success "Made quick-start.sh executable"
  else
    error "quick-start.sh not found"
  fi
  
  if [ $ERRORS -gt 0 ]; then
    echo -e "\n${YELLOW}Installation completed with $ERRORS warnings or errors${NC}"
    echo -e "${YELLOW}Some features might not work correctly.${NC}"
  else
    echo -e "\n${GREEN}WSL setup completed successfully!${NC}"
  fi
  
  echo -e "\n${CYAN}Next steps:${NC}"
  echo -e "1. ${BOLD}Start Skidbladnir:${NC} ./scripts/quick-start.sh"
  echo -e "2. ${BOLD}Access the web interface:${NC} http://localhost:8080"
  echo -e "3. ${BOLD}View the logs:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml logs -f"
  echo -e "4. ${BOLD}Stop all services:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml down"
  
  if [ "$CONTAINER_RUNTIME" == "docker" ] && ! is_docker_desktop_integration_enabled; then
    echo
    echo -e "${YELLOW}Important note for Docker in WSL:${NC}"
    echo -e "You're using Docker Engine directly in WSL instead of Docker Desktop integration."
    echo -e "This works fine but doesn't share Docker contexts with Windows."
    echo -e "For a more integrated experience, consider using Docker Desktop with WSL integration."
  fi
  
  return $ERRORS
}

main "$@"