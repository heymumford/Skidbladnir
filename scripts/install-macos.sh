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
# Skidbladnir macOS Installer
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

# Check for Homebrew
check_homebrew() {
  if command -v brew &>/dev/null; then
    return 0  # Homebrew is installed
  else
    return 1  # Homebrew is not installed
  fi
}

# Install Homebrew
install_homebrew() {
  progress "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || { error "Failed to install Homebrew"; return 1; }
  
  # Check if Homebrew is successfully installed
  if command -v brew &>/dev/null; then
    success "Homebrew installed successfully"
    return 0
  else
    error "Homebrew installation failed"
    return 1
  fi
}

# Check macOS version
check_macos_version() {
  local VERSION
  VERSION=$(sw_vers -productVersion)
  
  local MAJOR_VERSION
  MAJOR_VERSION=$(echo "$VERSION" | cut -d. -f1)
  
  echo "$MAJOR_VERSION" "$VERSION"
}

# Install package with Homebrew
install_with_brew() {
  local PACKAGE="$1"
  local CASK="$2"
  
  if [ "$CASK" == "cask" ]; then
    if brew list --cask "$PACKAGE" &>/dev/null; then
      success "$PACKAGE is already installed"
      return 0
    fi
    
    progress "Installing $PACKAGE using Homebrew Cask..."
    if brew install --cask "$PACKAGE" &>/dev/null; then
      success "Installed $PACKAGE"
      return 0
    else
      error "Failed to install $PACKAGE"
      return 1
    fi
  else
    if brew list "$PACKAGE" &>/dev/null; then
      success "$PACKAGE is already installed"
      return 0
    fi
    
    progress "Installing $PACKAGE using Homebrew..."
    if brew install "$PACKAGE" &>/dev/null; then
      success "Installed $PACKAGE"
      return 0
    else
      error "Failed to install $PACKAGE"
      return 1
    fi
  fi
}

# Check for Docker
check_docker() {
  if command -v docker &>/dev/null && docker info &>/dev/null; then
    return 0  # Docker is installed and running
  elif command -v docker &>/dev/null; then
    return 2  # Docker is installed but not running
  else
    return 1  # Docker is not installed
  fi
}

# Launch Docker Desktop
launch_docker_desktop() {
  progress "Launching Docker Desktop..."
  
  # Try to launch Docker Desktop
  open -a Docker &>/dev/null
  
  # Wait for Docker to start
  local MAX_ATTEMPTS=30
  local ATTEMPT=0
  
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker info &>/dev/null; then
      success "Docker Desktop is running"
      return 0
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 2
  done
  
  error "Docker Desktop did not start within the expected time"
  return 1
}

# Main execution
main() {
  step "Checking macOS version"
  
  read -r MAJOR_VERSION FULL_VERSION < <(check_macos_version)
  
  if [ "$MAJOR_VERSION" -ge 11 ]; then
    success "Running on macOS $FULL_VERSION (Big Sur or newer)"
  else
    warn "Running on macOS $FULL_VERSION. macOS 11 (Big Sur) or newer is recommended"
  fi
  
  step "Checking for Homebrew"
  
  if check_homebrew; then
    success "Homebrew is installed"
  else
    info "Homebrew is not installed, it's required for installing dependencies"
    info "Would you like to install Homebrew? (y/n)"
    read -r INSTALL_BREW
    
    if [[ "$INSTALL_BREW" =~ ^[Yy]$ ]]; then
      if ! install_homebrew; then
        fail "Cannot continue without Homebrew"
      fi
    else
      fail "Cannot continue without Homebrew"
    fi
  fi
  
  step "Checking for container runtime"
  
  DOCKER_STATUS=$(check_docker)
  
  if [ "$DOCKER_STATUS" -eq 0 ]; then
    success "Docker is installed and running"
    CONTAINER_RUNTIME="docker"
  elif [ "$DOCKER_STATUS" -eq 2 ]; then
    info "Docker is installed but not running"
    info "Attempting to start Docker Desktop..."
    
    if launch_docker_desktop; then
      CONTAINER_RUNTIME="docker"
    else
      warn "Please start Docker Desktop manually and try again"
      fail "Cannot continue without Docker running"
    fi
  else
    info "Docker is not installed"
    info "Would you like to install Docker Desktop for Mac? (y/n)"
    read -r INSTALL_DOCKER
    
    if [[ "$INSTALL_DOCKER" =~ ^[Yy]$ ]]; then
      if install_with_brew "docker" "cask"; then
        info "Docker Desktop installed, launching..."
        
        if launch_docker_desktop; then
          CONTAINER_RUNTIME="docker"
        else
          warn "Please start Docker Desktop manually and try again"
          fail "Cannot continue without Docker running"
        fi
      else
        fail "Cannot continue without Docker"
      fi
    else
      # See if Podman is available as an alternative
      if command -v podman &>/dev/null; then
        success "Podman is installed"
        CONTAINER_RUNTIME="podman"
      else
        info "Would you like to install Podman as an alternative to Docker? (y/n)"
        read -r INSTALL_PODMAN
        
        if [[ "$INSTALL_PODMAN" =~ ^[Yy]$ ]]; then
          if install_with_brew "podman" ""; then
            CONTAINER_RUNTIME="podman"
          else
            fail "Cannot continue without a container runtime"
          fi
        else
          fail "A container runtime (Docker or Podman) is required"
        fi
      fi
    fi
  fi
  
  step "Configuring container runtime: $CONTAINER_RUNTIME"
  
  case "$CONTAINER_RUNTIME" in
    docker)
      if ! command -v docker-compose &>/dev/null; then
        info "Installing docker-compose..."
        install_with_brew "docker-compose" "" || warn "Failed to install docker-compose"
      else
        success "docker-compose is already installed"
      fi
      ;;
    podman)
      if ! command -v podman-compose &>/dev/null; then
        info "Installing podman-compose..."
        
        # Check if Python and pip are available
        if command -v pip3 &>/dev/null; then
          progress "Installing podman-compose using pip..."
          pip3 install podman-compose &>/dev/null || warn "Failed to install podman-compose"
        else
          progress "Installing Python first..."
          install_with_brew "python" "" || warn "Failed to install Python"
          
          if command -v pip3 &>/dev/null; then
            progress "Installing podman-compose using pip..."
            pip3 install podman-compose &>/dev/null || warn "Failed to install podman-compose"
          else
            warn "Failed to install podman-compose. Install it manually with 'pip3 install podman-compose'"
          fi
        fi
      else
        success "podman-compose is already installed"
      fi
      
      # Initialize Podman machine if needed
      if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
        progress "Initializing Podman machine..."
        podman machine init &>/dev/null && podman machine start &>/dev/null || warn "Failed to initialize Podman machine"
      fi
      ;;
  esac
  
  step "Testing container runtime"
  
  case "$CONTAINER_RUNTIME" in
    docker)
      if docker info &>/dev/null; then
        success "Docker is running properly"
      else
        error "Docker is not running properly"
        warn "Please make sure Docker Desktop is running and try again"
      fi
      ;;
    podman)
      if podman info &>/dev/null; then
        success "Podman is running properly"
      else
        error "Podman is not running properly"
        warn "Try initializing Podman with 'podman machine init && podman machine start'"
      fi
      ;;
  esac
  
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
    echo -e "\n${GREEN}macOS setup completed successfully!${NC}"
  fi
  
  echo -e "\n${CYAN}Next steps:${NC}"
  echo -e "1. ${BOLD}Start Skidbladnir:${NC} ./scripts/quick-start.sh"
  echo -e "2. ${BOLD}Access the web interface:${NC} http://localhost:8080"
  echo -e "3. ${BOLD}View the logs:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml logs -f"
  echo -e "4. ${BOLD}Stop all services:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml down"
  
  return $ERRORS
}

main "$@"