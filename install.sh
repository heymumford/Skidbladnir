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
# Skidbladnir Universal Installer Script
# ====================================================================
# This script detects your platform and launches the appropriate
# installation method for Windows, WSL, or native Linux.
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

# Print beautiful banner
print_banner() {
  clear
  echo -e "${BLUE}"
  echo "  _____ _    _     _ _     _           _       _    "
  echo " / ____| |  (_)   | | |   | |         | |     (_)   "
  echo "| (___ | | ___  __| | |__ | | __ _  __| |_ __  _ _ __"
  echo " \___ \| |/ / |/ _\` | '_ \| |/ _\` |/ _\` | '_ \| | '__|"
  echo " ____) |   <| | (_| | |_) | | (_| | (_| | | | | | |   "
  echo "|_____/|_|\_\_|\__,_|_.__/|_|\__,_|\__,_|_| |_|_|_|   "
  echo -e "${NC}"
  echo -e "${CYAN}Universal Test Case Migration Platform - Installer${NC}\n"
  echo -e "${DIM}Version 1.0.0${NC}\n"
}

# Platform detection
is_wsl() { grep -qi "microsoft\|Microsoft" /proc/version /proc/sys/kernel/osrelease 2>/dev/null; }
is_windows() { [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; }
is_macos() { [[ "$OSTYPE" == "darwin"* ]]; }
is_ubuntu() { [[ -f /etc/lsb-release && "$(grep -c Ubuntu /etc/lsb-release)" -gt 0 ]]; }
is_debian() { [[ -f /etc/debian_version ]]; }
is_fedora() { [[ -f /etc/fedora-release ]]; }
is_rhel() { [[ -f /etc/redhat-release ]]; }
is_arch() { [[ -f /etc/arch-release ]]; }

detect_platform() {
  if is_windows; then
    echo "windows"
  elif is_wsl; then
    echo "wsl"
  elif is_macos; then
    echo "macos"
  elif is_ubuntu || is_debian; then
    echo "debian"
  elif is_fedora; then
    echo "fedora"
  elif is_rhel; then
    echo "rhel"
  elif is_arch; then
    echo "arch"
  else
    echo "linux"
  fi
}

# Container runtime detection
detect_runtime() {
  if command -v podman &>/dev/null; then
    echo "podman"
  elif command -v docker &>/dev/null; then
    echo "docker"
  else
    echo "none"
  fi
}

# Helper functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "\n${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
progress() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; }
success() { msg "  ${GREEN}✓${NC}" "$1"; }
error() { msg "  ${RED}✗${NC}" "$1"; ((ERRORS++)); }
fail() { error "$1"; exit 1; }

# Main execution
main() {
  print_banner

  PLATFORM=$(detect_platform)
  RUNTIME=$(detect_runtime)
  
  echo -e "${BOLD}System Information:${NC}"
  echo -e "  ${MAGENTA}Platform:${NC} ${PLATFORM}"
  echo -e "  ${MAGENTA}Container Runtime:${NC} ${RUNTIME:-"Not detected"}"
  
  step "Checking script location"
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ ! -f "$SCRIPT_DIR/README.md" ]; then
    warn "This script should be run from the root of the Skidbladnir repository"
    info "Attempting to continue anyway..."
  else
    success "Running from correct location"
  fi
  
  step "Launching platform-specific installer"
  
  case "$PLATFORM" in
    windows)
      info "Detected Windows platform"
      if [ ! -f "$SCRIPT_DIR/scripts/install-windows.sh" ]; then
        fail "Windows installer script not found"
      fi
      bash "$SCRIPT_DIR/scripts/install-windows.sh"
      ;;
    wsl)
      info "Detected Windows Subsystem for Linux"
      if [ ! -f "$SCRIPT_DIR/scripts/install-wsl.sh" ]; then
        fail "WSL installer script not found"
      fi
      bash "$SCRIPT_DIR/scripts/install-wsl.sh"
      ;;
    macos)
      info "Detected macOS platform"
      if [ ! -f "$SCRIPT_DIR/scripts/install-macos.sh" ]; then
        fail "macOS installer script not found"
      fi
      bash "$SCRIPT_DIR/scripts/install-macos.sh"
      ;;
    debian|fedora|rhel|arch|linux)
      info "Detected Linux platform: $PLATFORM"
      if [ ! -f "$SCRIPT_DIR/scripts/install-linux.sh" ]; then
        fail "Linux installer script not found"
      fi
      bash "$SCRIPT_DIR/scripts/install-linux.sh" "$PLATFORM"
      ;;
    *)
      fail "Unsupported platform: $PLATFORM"
      ;;
  esac
  
  if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Installation completed with $ERRORS errors${NC}"
    echo -e "${YELLOW}Please check the log above for details${NC}"
    exit 1
  else
    echo -e "\n${GREEN}Installation completed successfully!${NC}"
    echo -e "${CYAN}You can now start Skidbladnir with:${NC}"
    echo -e "${BOLD}  ./scripts/quick-start.sh${NC}"
    exit 0
  fi
}

main "$@"