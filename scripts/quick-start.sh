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
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'
NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''

# Track errors and set defaults
ERRORS=(); WARNINGS=()
COMPOSE_FILE="infra/compose/docker-compose.quickstart.yml"
PORT=8080; BUILD="true"; OPEN_BROWSER="true"

# Status reporting functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "${BOLD}[${BLUE}STEP${NC}${BOLD}]${NC} ${BOLD}" "$1"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }

# Platform detection functions
is_wsl() { grep -q "microsoft\|Microsoft" /proc/version /proc/sys/kernel/osrelease 2>/dev/null; }
is_windows() { [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; }
is_ubuntu() { [[ -f /etc/lsb-release && "$(grep -c Ubuntu /etc/lsb-release)" -gt 0 ]]; }

# Detect best container runtime
detect_runtime() {
  if is_windows && command -v docker &>/dev/null; then echo "docker"
  elif is_wsl && command -v docker &>/dev/null; then echo "docker"
  elif is_wsl && command -v podman &>/dev/null; then echo "podman"
  elif command -v podman &>/dev/null; then echo "podman"
  elif command -v docker &>/dev/null; then echo "docker"
  else echo "docker"; fi
}

# Run compose commands
run_compose() {
  prog "Running: ${RUNTIME}-compose -f $COMPOSE_FILE $@"
  if [ "$RUNTIME" == "docker" ]; then
    docker-compose -f "$COMPOSE_FILE" "$@" || return 1
  else
    podman-compose -f "$COMPOSE_FILE" "$@" || return 1
  fi
}

# Opening browser on different platforms
open_browser() {
  local url="$1"
  prog "Opening browser at $url"
  if is_windows; then start "$url" &
  elif is_wsl; then
    { command -v powershell.exe &>/dev/null && powershell.exe -Command "Start-Process '$url'"; } || 
    { command -v cmd.exe &>/dev/null && cmd.exe /c start "$url"; } || 
    { command -v xdg-open &>/dev/null && xdg-open "$url" &; } || 
    warn "Please open $url manually"
  elif [[ "$OSTYPE" == "darwin"* ]]; then open "$url" &
  elif command -v xdg-open &>/dev/null; then xdg-open "$url" &
  else warn "Please open $url manually"; fi
}

# Print banner
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
}

# Print summary
print_summary() {
  echo -e "\n${BOLD}======= QuickStart Summary =======${NC}"
  if [ ${#ERRORS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Skidbladnir is running at: ${CYAN}http://localhost:$PORT${NC}"
    echo -e "\n${GREEN}Commands:${NC}"
    echo -e "  ${YELLOW}$RUNTIME-compose -f $COMPOSE_FILE logs -f${NC}  # View logs"
    echo -e "  ${YELLOW}$RUNTIME-compose -f $COMPOSE_FILE down${NC}     # Stop services"
    echo -e "\n${GREEN}Happy migrating! 🚀${NC}"
  else
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ Warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
    echo -e "${RED}✗ Failed with ${#ERRORS[@]} error(s):${NC}\n$(printf "  → %s\n" "${ERRORS[@]}")"
  fi
  echo -e "${BOLD}=================================${NC}"
}

# Parse arguments
RUNTIME=$(detect_runtime)
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port) PORT="$2"; shift 2 ;;
    -r|--runtime) RUNTIME="$2"; shift 2 ;;
    --no-build) BUILD="false"; shift ;;
    --no-browser) OPEN_BROWSER="false"; shift ;;
    -h|--help)
      print_banner
      echo -e "\n${BOLD}Usage:${NC} $0 [options]"
      echo -e "\n${BOLD}Options:${NC}"
      echo "  -p, --port PORT       Port for web UI (default: $PORT)"
      echo "  -r, --runtime NAME    Runtime: docker or podman (default: $RUNTIME)"
      echo "  --no-build            Skip building containers"
      echo "  --no-browser          Don't open browser"
      echo "  -h, --help            Show help"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Main execution begins
print_banner
echo -e "\n${BOLD}Skidbladnir QuickStart${NC}"

# 1. Check environment
step "Checking environment"
[ ! -f "$COMPOSE_FILE" ] && fail "Compose file not found at $COMPOSE_FILE"
if ! command -v $RUNTIME &>/dev/null; then fail "$RUNTIME is not installed"; fi
if [ "$RUNTIME" == "docker" ] && ! command -v docker-compose &>/dev/null; then fail "docker-compose is not installed"; fi
if [ "$RUNTIME" == "podman" ] && ! command -v podman-compose &>/dev/null; then fail "podman-compose is not installed"; fi
info "Using $RUNTIME on port $PORT"

# 2. Configure port
sed -i${OSTYPE/darwin*/\' \'} "s/- \"8080:8080\"/- \"$PORT:8080\"/" "$COMPOSE_FILE" || fail "Failed to update port"

# 3. Build containers if needed
step "Preparing containers"
if [ "$BUILD" == "true" ]; then
  run_compose build || fail "Failed to build containers"
else
  info "Using pre-built containers"
fi

# 4. Start services
step "Starting services"
run_compose up -d || fail "Failed to start containers"

# 5. Open browser
step "Finalizing setup"
if [ "$OPEN_BROWSER" == "true" ]; then
  # Give services time to start up
  sleep 3
  open_browser "http://localhost:$PORT"
else
  info "Access the application at: http://localhost:$PORT"
fi

print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0