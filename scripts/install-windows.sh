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
# Skidbladnir Windows Installer
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

# Check if running in Git Bash or MSYS
is_git_bash() {
  [[ "$(uname -s)" == MINGW* ]] && return 0 || return 1
}

# Generate PowerShell script to check if Docker Desktop is installed
check_docker_desktop() {
  local TEMP_PS_FILE
  TEMP_PS_FILE="$(mktemp -t check_docker_desktop.XXXXXX.ps1)"
  
  cat > "$TEMP_PS_FILE" << 'EOF'
$dockerDesktop = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Docker Desktop*" }
if ($dockerDesktop) {
    Write-Host "installed"
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Host "running"
    } else {
        Write-Host "stopped"
    }
} else {
    Write-Host "not_installed"
    Write-Host "not_running"
}
EOF
  
  local DOCKER_STATUS
  DOCKER_STATUS=$(powershell.exe -ExecutionPolicy Bypass -File "$TEMP_PS_FILE" | tr -d '\r')
  rm -f "$TEMP_PS_FILE"
  
  echo "$DOCKER_STATUS"
}

# Generate PowerShell script to install Scoop
install_scoop() {
  local TEMP_PS_FILE
  TEMP_PS_FILE="$(mktemp -t install_scoop.XXXXXX.ps1)"
  
  cat > "$TEMP_PS_FILE" << 'EOF'
try {
    # Check if Scoop is already installed
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "Scoop is already installed."
        exit 0
    }

    # Enable script execution
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

    # Download and install Scoop
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

    # Check if installation was successful
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "Scoop installed successfully."
        exit 0
    } else {
        Write-Host "Failed to install Scoop."
        exit 1
    }
} catch {
    Write-Host "Error installing Scoop: $_"
    exit 1
}
EOF
  
  powershell.exe -ExecutionPolicy Bypass -File "$TEMP_PS_FILE" | tr -d '\r'
  local RESULT=$?
  rm -f "$TEMP_PS_FILE"
  
  return $RESULT
}

# Generate PowerShell script to install Docker Desktop
install_docker_desktop() {
  local TEMP_PS_FILE
  TEMP_PS_FILE="$(mktemp -t install_docker_desktop.XXXXXX.ps1)"
  
  cat > "$TEMP_PS_FILE" << 'EOF'
try {
    # Check if scoop is available
    if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
        Write-Host "Scoop is not installed. Please install Docker Desktop manually."
        exit 1
    }

    # Add the extras bucket which contains Docker Desktop
    scoop bucket add extras

    # Install Docker Desktop
    scoop install extras/docker-desktop

    Write-Host "Docker Desktop installed successfully. Please start Docker Desktop manually."
    exit 0
} catch {
    Write-Host "Error installing Docker Desktop: $_"
    exit 1
}
EOF
  
  powershell.exe -ExecutionPolicy Bypass -File "$TEMP_PS_FILE" | tr -d '\r'
  local RESULT=$?
  rm -f "$TEMP_PS_FILE"
  
  return $RESULT
}

# Check if Docker Desktop is running
check_docker_running() {
  if docker info &>/dev/null; then
    return 0  # Docker is running
  else
    return 1  # Docker is not running
  fi
}

# Generate PowerShell script to check Windows version
check_windows_version() {
  local TEMP_PS_FILE
  TEMP_PS_FILE="$(mktemp -t check_windows_version.XXXXXX.ps1)"
  
  cat > "$TEMP_PS_FILE" << 'EOF'
try {
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    $version = $osInfo.Version
    $caption = $osInfo.Caption
    
    $majorVersion = $version.Split('.')[0]
    $minorVersion = $version.Split('.')[1]
    
    # Check Windows 10/11
    if ($majorVersion -eq 10) {
        if ($caption -like "*Windows 11*") {
            Write-Host "windows_11"
        } else {
            Write-Host "windows_10"
        }
    } else {
        Write-Host "other_windows"
    }
} catch {
    Write-Host "unknown"
}
EOF
  
  local WINDOWS_VERSION
  WINDOWS_VERSION=$(powershell.exe -ExecutionPolicy Bypass -File "$TEMP_PS_FILE" | tr -d '\r')
  rm -f "$TEMP_PS_FILE"
  
  echo "$WINDOWS_VERSION"
}

# Check the container runtime available on the system
check_container_runtime() {
  if command -v docker &>/dev/null; then
    echo "docker"
  elif command -v podman &>/dev/null; then
    echo "podman"
  else
    echo "none"
  fi
}

# Main execution
main() {
  if ! is_git_bash; then
    warn "This installer works best in Git Bash on Windows"
    warn "If you're experiencing issues, please install Git Bash and try again"
  fi
  
  step "Checking Windows version"
  local WINDOWS_VERSION
  WINDOWS_VERSION=$(check_windows_version)
  
  if [ "$WINDOWS_VERSION" == "windows_11" ]; then
    success "Running on Windows 11"
  elif [ "$WINDOWS_VERSION" == "windows_10" ]; then
    success "Running on Windows 10"
  else
    warn "Running on $WINDOWS_VERSION. Windows 10 or 11 recommended"
  fi
  
  step "Checking container runtime"
  local CONTAINER_RUNTIME
  CONTAINER_RUNTIME=$(check_container_runtime)
  
  if [ "$CONTAINER_RUNTIME" == "none" ]; then
    info "No container runtime detected, checking Docker Desktop"
    
    # Check Docker Desktop status
    local DOCKER_DESKTOP_STATUS
    read -r DOCKER_INSTALLED DOCKER_RUNNING < <(check_docker_desktop)
    
    if [ "$DOCKER_INSTALLED" == "installed" ]; then
      success "Docker Desktop is installed"
      
      if [ "$DOCKER_RUNNING" == "running" ]; then
        success "Docker Desktop is running"
      else
        warn "Docker Desktop is installed but not running"
        warn "Please start Docker Desktop manually to continue"
        
        info "Would you like to try starting Docker Desktop? (y/n)"
        read -r START_DOCKER
        
        if [[ "$START_DOCKER" =~ ^[Yy]$ ]]; then
          progress "Attempting to start Docker Desktop..."
          
          # Try to start Docker Desktop
          if "/c/Program Files/Docker/Docker/Docker Desktop.exe" &>/dev/null & then
            success "Docker Desktop starting"
            info "Please wait for Docker Desktop to start completely"
            info "This may take a few minutes"
            info "Please press any key once Docker Desktop is running"
            read -n 1 -s
          else
            error "Failed to start Docker Desktop"
            warn "Please start Docker Desktop manually and try again"
          fi
        fi
      fi
    else
      warn "Docker Desktop is not installed"
      info "Would you like to install Docker Desktop? (y/n)"
      read -r INSTALL_DOCKER
      
      if [[ "$INSTALL_DOCKER" =~ ^[Yy]$ ]]; then
        progress "Installing Scoop package manager..."
        
        if install_scoop; then
          success "Scoop installed successfully"
          
          progress "Installing Docker Desktop using Scoop..."
          if install_docker_desktop; then
            success "Docker Desktop installed successfully"
            info "Please start Docker Desktop manually and then press any key to continue"
            read -n 1 -s
          else
            error "Failed to install Docker Desktop"
            warn "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
            warn "Then run this installer again"
            exit 1
          fi
        else
          error "Failed to install Scoop package manager"
          warn "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
          warn "Then run this installer again"
          exit 1
        fi
      else
        error "Docker Desktop is required for Skidbladnir"
        warn "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        warn "Then run this installer again"
        exit 1
      fi
    fi
    
    # Set container runtime to docker since we've now installed it
    CONTAINER_RUNTIME="docker"
  else
    success "Container runtime detected: $CONTAINER_RUNTIME"
  fi
  
  step "Testing container runtime: $CONTAINER_RUNTIME"
  
  if [ "$CONTAINER_RUNTIME" == "docker" ]; then
    if check_docker_running; then
      success "Docker is running correctly"
    else
      error "Docker is not running correctly"
      warn "Please make sure Docker Desktop is running and try again"
      exit 1
    fi
  elif [ "$CONTAINER_RUNTIME" == "podman" ]; then
    if podman info &>/dev/null; then
      success "Podman is running correctly"
    else
      error "Podman is not running correctly"
      exit 1
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
    echo -e "\n${GREEN}Windows setup completed successfully!${NC}"
  fi
  
  echo -e "\n${CYAN}Next steps:${NC}"
  echo -e "1. ${BOLD}Start Skidbladnir:${NC} ./scripts/quick-start.sh"
  echo -e "2. ${BOLD}Access the web interface:${NC} http://localhost:8080"
  echo -e "3. ${BOLD}View the logs:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml logs -f"
  echo -e "4. ${BOLD}Stop all services:${NC} $CONTAINER_RUNTIME-compose -f infra/compose/docker-compose.quickstart.yml down"
  
  return $ERRORS
}

main "$@"