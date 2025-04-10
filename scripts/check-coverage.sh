#!/bin/bash
#
# Script to check unified test coverage across all languages
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.

set -e

# Get the project root directory
ROOT_DIR=$(git rev-parse --show-toplevel || pwd)
cd "$ROOT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Log with timestamp
function log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create results directory
mkdir -p test-results

log "${YELLOW}Starting unified coverage check across all languages...${NC}"

# Check TypeScript coverage
log "${YELLOW}Checking TypeScript coverage...${NC}"
if npx jest --config=config/jest.config.js --coverage; then
  log "${GREEN}✅ TypeScript coverage meets thresholds${NC}"
else
  log "${RED}❌ TypeScript coverage does not meet thresholds${NC}"
  typescript_failed=true
fi

# Check Python coverage
log "${YELLOW}Checking Python coverage...${NC}"
if cd "$ROOT_DIR" && PYTHONPATH="$ROOT_DIR" python -m pytest --cov=internal/python --cov-config="$ROOT_DIR/config/.coveragerc" tests/unit/python; then
  log "${GREEN}✅ Python coverage meets thresholds${NC}"
else
  log "${RED}❌ Python coverage does not meet thresholds${NC}"
  python_failed=true
fi

# Check Go coverage
log "${YELLOW}Checking Go coverage...${NC}"
if cd "$ROOT_DIR" && bash scripts/go-coverage-check.sh; then
  log "${GREEN}✅ Go coverage meets thresholds${NC}"
else
  log "${RED}❌ Go coverage does not meet thresholds${NC}"
  go_failed=true
fi

# Check overall results
if [ "$typescript_failed" == "true" ] || [ "$python_failed" == "true" ] || [ "$go_failed" == "true" ]; then
  log "${RED}❌ One or more language coverage checks failed${NC}"
  
  # Detailed failure report
  log "${YELLOW}Failure summary:${NC}"
  [ "$typescript_failed" == "true" ] && log "${RED}- TypeScript coverage below thresholds${NC}"
  [ "$python_failed" == "true" ] && log "${RED}- Python coverage below thresholds${NC}"
  [ "$go_failed" == "true" ] && log "${RED}- Go coverage below thresholds${NC}"
  
  log "${YELLOW}See detailed reports in test-results directory${NC}"
  exit 1
else
  log "${GREEN}✅ All language coverage checks passed${NC}"
  
  # Generate unified report if tdd-metrics-tool is available
  if [ -d "$ROOT_DIR/packages/tdd-metrics-tool" ]; then
    log "${YELLOW}Generating unified coverage report with TDD metrics tool...${NC}"
    cd "$ROOT_DIR" && npx ts-node packages/tdd-metrics-tool/src/bin/tdd-metrics.ts --config="$ROOT_DIR/config/tdd-metrics-config.json"
    log "${GREEN}✅ Unified coverage report generated in test-results/tdd-metrics${NC}"
  fi
  
  exit 0
fi