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
# Skidbladnir Linux Installer
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

# Install functions
install_package() {
  local PACKAGE="$1"
  local INSTALL_CMD="$2"
  
  if command -v "$PACKAGE" &>/dev/null; then
    success "$PACKAGE is already installed"
    return 0
  fi
  
  progress "Installing $PACKAGE..."
  if eval "$INSTALL_CMD" &>/dev/null; then
    success "Installed $PACKAGE"
    return 0
  else
    error "Failed to install $PACKAGE"
    return 1
  fi
}

# Get distro-specific commands
setup_package_manager() {
  local DISTRO="$1"
  
  case "$DISTRO" in
    debian|ubuntu)
      PKG_UPDATE="sudo apt-get update -y"
      PKG_INSTALL="sudo apt-get install -y"
      PODMAN_INSTALL="$PKG_UPDATE && $PKG_INSTALL podman podman-compose"
      DOCKER_INSTALL="$PKG_UPDATE && $PKG_INSTALL docker.io docker-compose"
      PREREQ_INSTALL="$PKG_INSTALL curl git"
      ;;
    fedora)
      PKG_UPDATE="sudo dnf check-update -y || true"
      PKG_INSTALL="sudo dnf install -y"
      PODMAN_INSTALL="$PKG_INSTALL podman podman-compose"
      DOCKER_INSTALL="$PKG_INSTALL docker docker-compose"
      PREREQ_INSTALL="$PKG_INSTALL curl git"
      ;;
    rhel|centos)
      PKG_UPDATE="sudo dnf check-update -y || true"
      PKG_INSTALL="sudo dnf install -y"
      PODMAN_INSTALL="$PKG_INSTALL podman podman-compose"
      DOCKER_INSTALL="$PKG_INSTALL docker docker-compose"
      PREREQ_INSTALL="$PKG_INSTALL curl git"
      ;;
    arch)
      PKG_UPDATE="sudo pacman -Sy"
      PKG_INSTALL="sudo pacman -S --noconfirm"
      PODMAN_INSTALL="$PKG_INSTALL podman podman-compose"
      DOCKER_INSTALL="$PKG_INSTALL docker docker-compose"
      PREREQ_INSTALL="$PKG_INSTALL curl git"
      ;;
    *)
      warn "Unknown Linux distribution. Using generic installation methods."
      PKG_UPDATE="echo 'Skipping package update'"
      PKG_INSTALL="echo 'Skipping package installation for'"
      PODMAN_INSTALL="echo 'Please install podman and podman-compose manually'"
      DOCKER_INSTALL="echo 'Please install docker and docker-compose manually'"
      PREREQ_INSTALL="echo 'Please install curl and git manually'"
      ;;
  esac
}

# Add current user to docker group
add_user_to_group() {
  local GROUP="$1"
  
  if groups | grep -q "$GROUP"; then
    success "User already in $GROUP group"
    return 0
  fi
  
  progress "Adding user to $GROUP group..."
  if sudo usermod -aG "$GROUP" "$(whoami)" &>/dev/null; then
    success "Added user to $GROUP group"
    warn "You may need to log out and back in for this change to take effect"
    return 0
  else
    error "Failed to add user to $GROUP group"
    return 1
  fi
}

# Test container runtime
test_container_runtime() {
  local RUNTIME="$1"
  
  progress "Testing $RUNTIME..."
  if $RUNTIME run --rm hello-world &>/dev/null; then
    success "$RUNTIME is working properly"
    return 0
  else
    error "$RUNTIME test failed"
    warn "You may need to start the $RUNTIME service: sudo systemctl start $RUNTIME"
    return 1
  fi
}

# Main execution
main() {
  local DISTRO="$1"
  
  if [ -z "$DISTRO" ]; then
    DISTRO="linux"
  fi
  
  step "Setting up package manager for $DISTRO"
  setup_package_manager "$DISTRO"
  
  step "Installing prerequisites"
  eval "$PKG_UPDATE" &>/dev/null || warn "Package update failed, continuing anyway"
  install_package "curl" "$PREREQ_INSTALL curl" || warn "Failed to install curl"
  install_package "git" "$PREREQ_INSTALL git" || warn "Failed to install git"
  
  step "Installing container runtime"
  
  if command -v podman &>/dev/null; then
    success "Podman is already installed"
    CONTAINER_RUNTIME="podman"
  elif command -v docker &>/dev/null; then
    success "Docker is already installed"
    CONTAINER_RUNTIME="docker"
  else
    info "No container runtime detected, attempting to install podman (preferred)"
    if install_package "podman" "$PODMAN_INSTALL"; then
      CONTAINER_RUNTIME="podman"
    else
      warn "Podman installation failed, trying Docker instead"
      if install_package "docker" "$DOCKER_INSTALL"; then
        CONTAINER_RUNTIME="docker"
        add_user_to_group "docker"
        if ! systemctl is-active --quiet docker; then
          progress "Starting Docker service..."
          sudo systemctl start docker || warn "Failed to start Docker service"
        fi
      else
        fail "Failed to install any container runtime. Please install Docker or Podman manually."
      fi
    fi
  fi
  
  step "Configuring container runtime: $CONTAINER_RUNTIME"
  
  case "$CONTAINER_RUNTIME" in
    podman)
      install_package "podman-compose" "$PODMAN_INSTALL" || warn "Failed to install podman-compose"
      ;;
    docker)
      install_package "docker-compose" "$DOCKER_INSTALL" || warn "Failed to install docker-compose"
      # Ensure service is running
      if ! systemctl is-active --quiet docker; then
        progress "Starting Docker service..."
        sudo systemctl start docker || warn "Failed to start Docker service"
      fi
      ;;
  esac
  
  step "Testing container runtime"
  test_container_runtime "$CONTAINER_RUNTIME" || warn "Container runtime test failed"
  
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
    echo -e "\n${GREEN}Linux setup completed successfully!${NC}"
  fi
  
  echo -e "\n${CYAN}Next steps:${NC}"
  echo -e "1. ${BOLD}Start Skidbladnir:${NC} ./scripts/quick-start.sh"
  echo -e "2. ${BOLD}Access the web interface:${NC} http://localhost:8080"
  echo -e "3. ${BOLD}View the logs:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml logs -f"
  echo -e "4. ${BOLD}Stop all services:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml down"
  
  return $ERRORS
}

main "$@"