#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# monitor-resources.sh
# Monitors container resource usage for Skidbladnir to help optimize memory usage
# Useful for development on laptop environments with constrained resources

set -e

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'
NORMAL='\033[0m'

# Define alert thresholds (in MB and %)
MEM_WARN=80
MEM_CRIT=90
CPU_WARN=80
CPU_CRIT=90

# Print usage info
usage() {
  echo -e "${BOLD}Skidbladnir Resource Monitor${NORMAL}"
  echo
  echo "Usage: $0 [options]"
  echo
  echo "Options:"
  echo "  -n, --namespace NAME    Container namespace/compose project (default: skidbladnir)"
  echo "  -i, --interval SEC      Refresh interval in seconds (default: 5)"
  echo "  -r, --runtime NAME      Container runtime: docker or podman (default: auto-detect)"
  echo "  -h, --help              Show this help message"
  echo
  echo "Examples:"
  echo "  $0                      # Monitor using default settings"
  echo "  $0 -i 2                 # Monitor with 2-second refresh interval"
  echo "  $0 -r podman            # Explicitly use podman for monitoring"
}

# Parse arguments
INTERVAL=5
NAMESPACE="skidbladnir"
RUNTIME="auto"

while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    -i|--interval)
      INTERVAL="$2"
      shift 2
      ;;
    -r|--runtime)
      RUNTIME="$2"
      shift 2
      ;;
    -h|--help)
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

# Auto-detect container runtime if not specified
if [ "$RUNTIME" == "auto" ]; then
  if command -v docker &> /dev/null; then
    RUNTIME="docker"
  elif command -v podman &> /dev/null; then
    RUNTIME="podman"
  else
    echo "Error: No container runtime (docker or podman) found"
    exit 1
  fi
fi

echo -e "${BOLD}Using $RUNTIME for monitoring${NORMAL}"

# Format memory usage with color based on threshold
format_memory() {
  local used=$1
  local limit=$2
  
  if [ "$limit" -eq 0 ]; then
    echo -e "${BLUE}${used}MB${NC} / unlim"
    return
  fi
  
  local percent=$((used * 100 / limit))
  
  if [ $percent -ge $MEM_CRIT ]; then
    echo -e "${RED}${used}MB${NC} / ${limit}MB (${RED}${percent}%${NC})"
  elif [ $percent -ge $MEM_WARN ]; then
    echo -e "${YELLOW}${used}MB${NC} / ${limit}MB (${YELLOW}${percent}%${NC})"
  else
    echo -e "${GREEN}${used}MB${NC} / ${limit}MB (${GREEN}${percent}%${NC})"
  fi
}

# Format CPU usage with color based on threshold
format_cpu() {
  local percent=$1
  
  if [ $percent -ge $CPU_CRIT ]; then
    echo -e "${RED}${percent}%${NC}"
  elif [ $percent -ge $CPU_WARN ]; then
    echo -e "${YELLOW}${percent}%${NC}"
  else
    echo -e "${GREEN}${percent}%${NC}"
  fi
}

# Main monitoring loop
clear
while true; do
  # Get system memory information
  if [ "$(uname)" == "Darwin" ]; then
    # macOS memory info
    TOTAL_MEM_MB=$(($(sysctl -n hw.memsize) / 1024 / 1024))
    FREE_MEM_MB=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    FREE_MEM_MB=$((FREE_MEM_MB * 4096 / 1024 / 1024))
    USED_MEM_MB=$((TOTAL_MEM_MB - FREE_MEM_MB))
  else
    # Linux memory info
    TOTAL_MEM_MB=$(($(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024))
    FREE_MEM_MB=$(($(grep MemAvailable /proc/meminfo | awk '{print $2}') / 1024))
    USED_MEM_MB=$((TOTAL_MEM_MB - FREE_MEM_MB))
  fi
  
  # Get container data
  if [ "$RUNTIME" == "docker" ]; then
    # Using Docker
    CONTAINERS=$(docker ps --format "{{.Names}}" | grep -v "POD")
  else
    # Using Podman
    CONTAINERS=$(podman ps --format "{{.Names}}" | grep -v "POD")
  fi
  
  # Print header with timestamp and system stats
  echo -e "\n${BOLD}Skidbladnir Resource Monitor${NORMAL} - $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "System Memory: ${format_memory $USED_MEM_MB $TOTAL_MEM_MB}"
  echo -e "\n${BOLD}CONTAINER RESOURCES${NORMAL}"
  printf "%-30s %-25s %-15s\n" "CONTAINER" "MEMORY" "CPU"
  echo "----------------------------------------------------------------------"
  
  # Print container stats
  for container in $CONTAINERS; do
    if [ "$RUNTIME" == "docker" ]; then
      # Docker stats
      stats=$(docker stats --no-stream --format "{{.MemUsage}}|{{.CPUPerc}}" "$container")
      mem_used=$(echo "$stats" | cut -d'|' -f1 | grep -o '[0-9.]*MiB' | sed 's/MiB//')
      mem_limit=$(echo "$stats" | cut -d'|' -f1 | grep -o '/[0-9.]*GiB' | sed 's/\///;s/GiB//' | awk '{print $1 * 1024}')
      cpu_percent=$(echo "$stats" | cut -d'|' -f2 | sed 's/%//')
    else
      # Podman stats
      stats=$(podman stats --no-stream --format "{{.MemUsage}}|{{.CPU}}" "$container")
      mem_used=$(echo "$stats" | cut -d'|' -f1 | grep -o '[0-9.]*MB' | sed 's/MB//')
      mem_limit=$(echo "$stats" | cut -d'|' -f1 | grep -o '/[0-9.]*GB' | sed 's/\///;s/GB//' | awk '{print $1 * 1024}')
      cpu_percent=$(echo "$stats" | cut -d'|' -f2 | sed 's/%//')
    fi
    
    # Handle potential empty or malformed values
    mem_used=${mem_used:-0}
    mem_limit=${mem_limit:-0}
    cpu_percent=${cpu_percent:-0}
    
    # Print formatted stats
    printf "%-30s %-25s %-15s\n" \
           "$container" \
           "$(format_memory ${mem_used%.*} ${mem_limit%.*})" \
           "$(format_cpu ${cpu_percent%.*})"
  done
  
  # Show optimization tips if resources are strained
  if (( USED_MEM_MB * 100 / TOTAL_MEM_MB >= MEM_WARN )); then
    echo -e "\n${YELLOW}Resource Optimization Tips:${NC}"
    echo " • Use 'podman-compose --profile <profile>' to start only needed services"
    echo " • Shut down LLM services when not actively using them"
    echo " • Reduce browser tabs and other applications when working on this project"
  fi
  
  # Wait for next refresh
  sleep $INTERVAL
  
  # Clear screen for next update
  clear
done