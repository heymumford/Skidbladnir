#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Development environment setup script
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && CYAN='' && NC='' && BOLD=''
ERRORS=(); WARNINGS=()
TOTAL_STEPS=3

# Helper functions
msg() { printf "$1$2${NC}\n"; }
step() { msg "\n${BOLD}[${BLUE}STEP $1/${TOTAL_STEPS}${NC}${BOLD}]${NC} ${BOLD}" "$2"; }
info() { msg "  ${BLUE}INFO:${NC}" "$1"; }
prog() { msg "  ${CYAN}...${NC}" "$1"; }
warn() { msg "  ${YELLOW}WARNING:${NC}" "$1"; WARNINGS+=("$1"); }
ok() { msg "  ${GREEN}✓${NC}" "$1"; }
err() { msg "  ${RED}✗${NC}" "$1"; ERRORS+=("$1"); return 1; }
fail() { err "$1"; print_summary; exit 1; }

# Print summary report at the end
print_summary() {
  echo -e "\n${BOLD}======= Setup Summary =======${NC}"
  if [ ${#ERRORS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ Environment setup complete${NC}"
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ With warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
    echo -e "\n${GREEN}Start the environment with:${NC} ${BOLD}cd infrastructure/development && podman-compose up -d${NC}"
  else
    [ ${#WARNINGS[@]} -gt 0 ] && echo -e "${YELLOW}⚠ Warnings:${NC}\n$(printf "  → %s\n" "${WARNINGS[@]}")"
    echo -e "${RED}✗ Setup failed:${NC}\n$(printf "  → %s\n" "${ERRORS[@]}")"
  fi
  echo -e "${BOLD}=============================${NC}"
}

# Check for required tools
check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "Found $2"
    return 0
  else
    err "$2 not found. Please install it first."
    return 1
  fi
}

# Package setup helper function
setup_node_package() {
  local pkg_name=$1
  local extra_deps=${2:-""}
  
  mkdir -p "packages/$pkg_name"
  (
    cd "packages/$pkg_name" || { err "Failed to access packages/$pkg_name directory"; return 1; }
    npm init -y >/dev/null 2>&1 || return 1
    npm install --save typescript @types/node jest @types/jest ts-jest $extra_deps >/dev/null 2>&1 || return 1
    npx tsc --init >/dev/null 2>&1 || return 1
  ) && ok "$pkg_name package set up" || err "Failed to set up $pkg_name package"
}

echo -e "\n${BOLD}Skidbladnir Development Environment Setup${NC}"
echo "This script will set up packages and container environment."

# STEP 1: Check prerequisites
step 1 "Checking prerequisites"
check_command "node" "Node.js" || fail "Node.js is required"
check_command "npm" "npm" || warn "npm not found, some steps may fail"
check_command "python3" "Python 3" || fail "Python 3 is required"
check_command "go" "Go" || fail "Go is required"
check_command "podman" "Podman" || fail "Podman is required"

# STEP 2: Set up project packages
step 2 "Setting up project packages"
# Typescript packages
setup_node_package "common" || fail "Failed to set up common package"
setup_node_package "zephyr-extractor" "axios" || warn "Failed to set up zephyr-extractor"
setup_node_package "qtest-loader" "axios" || warn "Failed to set up qtest-loader"
setup_node_package "transformer" || warn "Failed to set up transformer"

# Python setup
prog "Setting up Python orchestrator"
mkdir -p packages/orchestrator
(
  cd packages/orchestrator &&
  python3 -m venv venv >/dev/null 2>&1 &&
  source venv/bin/activate &&
  pip install --upgrade pip >/dev/null 2>&1 &&
  pip install pytest pytest-asyncio fastapi uvicorn pydantic sqlalchemy psycopg2-binary redis >/dev/null 2>&1 &&
  pip freeze > requirements.txt &&
  deactivate
) && ok "Python orchestrator set up" || warn "Python setup issue"

# Go setup
prog "Setting up Go binary processor"
mkdir -p packages/binary-processor/cmd packages/binary-processor/pkg
(
  cd packages/binary-processor &&
  go mod init github.com/yourusername/testbridge/binary-processor >/dev/null 2>&1 &&
  go get -u github.com/stretchr/testify/assert >/dev/null 2>&1
) && ok "Go binary processor set up" || warn "Go setup issue"

# STEP 3: Set up infrastructure
step 3 "Setting up infrastructure"
prog "Creating compose file"
mkdir -p infrastructure/development
cat > infrastructure/development/podman-compose.yml <<EOL
version: '3'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: testbridge
      POSTGRES_USER: testbridge
      POSTGRES_DB: testbridge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: testbridge
      MINIO_ROOT_PASSWORD: testbridge
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
EOL
ok "Container environment configured"

# Make the script executable
chmod +x "$0"

print_summary
[ ${#ERRORS[@]} -gt 0 ] && exit 1 || exit 0