#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Consolidated XML Tools

# Color configuration
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
[ ! -t 1 ] && RED='' && GREEN='' && YELLOW='' && BLUE='' && NC='' && BOLD=''

# Initialize variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
ROOT_DIR="${SCRIPT_DIR}/../.."
SCHEMA_DIR="${ROOT_DIR}/config/schemas"
XML_FILES=()
SCHEMA_FILE=""
MAX_FILE_SIZE=5242880  # 5MB
STANDALONE_FILE=""

# Output functions
info() { echo -e "${BLUE}INFO:${NC} $1"; }
warn() { echo -e "${YELLOW}WARNING:${NC} $1"; }
error() { echo -e "${RED}ERROR:${NC} $1"; }
success() { echo -e "${GREEN}SUCCESS:${NC} $1"; }

# Show help
show_help() {
  echo -e "${BOLD}Skidbladnir XML Tools${NC}\n"
  echo "Usage: $0 [command] [options]"
  echo -e "\nCommands:"
  echo "  validate    - Validate XML files against schema"
  echo "  cleanup     - Clean and format XML files"
  echo -e "\nOptions for validate:"
  echo "  -f, --file FILE       XML file to validate"
  echo "  -d, --dir DIR         Directory to find XML files in (recursive)"
  echo "  -s, --schema SCHEMA   XSD Schema file to validate against"
  echo "  -h, --help            Show this help message"
  echo -e "\nOptions for cleanup:"
  echo "  -f, --file FILE       XML file to clean up"
  echo "  -d, --dir DIR         Directory to find XML files in (recursive)"
  echo "  -p, --pattern PATTERN File pattern to match (e.g., \"*.xml\")"
  echo "  -b, --backup          Create a backup before modification"
  echo "  -h, --help            Show this help message"
}

# Find XML files in directory recursively
find_xml_files() {
  local dir=$1
  local pattern=$2
  
  if [ -z "$pattern" ]; then
    pattern="*.xml"
  fi
  
  local files=()
  while IFS= read -r file; do
    # Skip files larger than MAX_FILE_SIZE
    if [ "$(stat -c%s "$file")" -gt "$MAX_FILE_SIZE" ]; then
      warn "Skipping large file: $file ($(stat -c%s "$file") bytes)"
      continue
    fi
    files+=("$file")
  done < <(find "$dir" -type f -name "$pattern" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*")
  
  echo "${files[@]}"
}

# Validate XML files against schema
validate_xml() {
  local xml_file=$1
  local schema_file=$2
  
  # Check if xmllint is available
  if ! command -v xmllint &> /dev/null; then
    error "xmllint is not installed. Please install libxml2-utils."
    return 1
  fi
  
  # Validate XML file against schema
  if xmllint --noout --schema "$schema_file" "$xml_file" 2>/dev/null; then
    success "✓ $xml_file is valid"
    return 0
  else
    local errors=$(xmllint --schema "$schema_file" "$xml_file" 2>&1 >/dev/null)
    error "✗ $xml_file is invalid:"
    echo "$errors" | grep -E "error|warning"
    return 1
  fi
}

# Clean up XML file
cleanup_xml() {
  local xml_file=$1
  local backup=$2
  
  # Create backup if requested
  if [ "$backup" = true ]; then
    cp "$xml_file" "${xml_file}.bak"
  fi
  
  # Check if xmllint is available
  if ! command -v xmllint &> /dev/null; then
    error "xmllint is not installed. Please install libxml2-utils."
    return 1
  fi
  
  # Check if file is valid XML
  if ! xmllint --noout "$xml_file" 2>/dev/null; then
    error "✗ $xml_file is not valid XML, skipping cleanup"
    return 1
  fi
  
  # Format the XML file
  local temp_file="${xml_file}.tmp"
  
  # Normalize and format with xmllint
  xmllint --format --c14n "$xml_file" > "$temp_file"
  
  # Additional cleanup (remove trailing whitespace, ensure single final newline)
  sed -i 's/[[:space:]]*$//' "$temp_file"
  echo "" >> "$temp_file"
  
  # Replace the original file
  mv "$temp_file" "$xml_file"
  
  success "✓ Cleaned up $xml_file"
  return 0
}

# Process validate command
process_validate_command() {
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--file)
        STANDALONE_FILE="$2"
        shift 2
        ;;
      -d|--dir)
        XML_FILES=($(find_xml_files "$2"))
        shift 2
        ;;
      -s|--schema)
        SCHEMA_FILE="$2"
        shift 2
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
  
  # Check if schema file exists and is readable
  if [ -z "$SCHEMA_FILE" ]; then
    error "No schema file specified"
    show_help
    exit 1
  fi
  
  if [ ! -f "$SCHEMA_FILE" ] || [ ! -r "$SCHEMA_FILE" ]; then
    error "Schema file does not exist or is not readable: $SCHEMA_FILE"
    exit 1
  fi
  
  # Process XML files
  local fail_count=0
  local success_count=0
  
  # Process standalone file if specified
  if [ -n "$STANDALONE_FILE" ]; then
    if [ -f "$STANDALONE_FILE" ] && [ -r "$STANDALONE_FILE" ]; then
      if validate_xml "$STANDALONE_FILE" "$SCHEMA_FILE"; then
        ((success_count++))
      else
        ((fail_count++))
      fi
    else
      error "File does not exist or is not readable: $STANDALONE_FILE"
      exit 1
    fi
  fi
  
  # Process files from directory if specified
  for file in "${XML_FILES[@]}"; do
    if validate_xml "$file" "$SCHEMA_FILE"; then
      ((success_count++))
    else
      ((fail_count++))
    fi
  done
  
  # Print summary
  echo -e "\n${BOLD}Validation Summary:${NC}"
  echo "Total files: $((success_count + fail_count))"
  echo -e "${GREEN}Valid: $success_count${NC}"
  echo -e "${RED}Invalid: $fail_count${NC}"
  
  [ $fail_count -eq 0 ]
  return $?
}

# Process cleanup command
process_cleanup_command() {
  local dir=""
  local pattern=""
  local backup=false
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--file)
        STANDALONE_FILE="$2"
        shift 2
        ;;
      -d|--dir)
        dir="$2"
        shift 2
        ;;
      -p|--pattern)
        pattern="$2"
        shift 2
        ;;
      -b|--backup)
        backup=true
        shift
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
  
  # Process standalone file if specified
  if [ -n "$STANDALONE_FILE" ]; then
    if [ -f "$STANDALONE_FILE" ] && [ -r "$STANDALONE_FILE" ]; then
      cleanup_xml "$STANDALONE_FILE" $backup
    else
      error "File does not exist or is not readable: $STANDALONE_FILE"
      exit 1
    fi
  fi
  
  # Process files from directory if specified
  if [ -n "$dir" ]; then
    if [ -d "$dir" ] && [ -r "$dir" ]; then
      XML_FILES=($(find_xml_files "$dir" "$pattern"))
      for file in "${XML_FILES[@]}"; do
        cleanup_xml "$file" $backup
      done
    else
      error "Directory does not exist or is not readable: $dir"
      exit 1
    fi
  fi
  
  # If no file or directory specified, show help
  if [ -z "$STANDALONE_FILE" ] && [ -z "$dir" ]; then
    error "No file or directory specified"
    show_help
    exit 1
  fi
  
  return 0
}

# Command dispatcher
if [ $# -eq 0 ]; then
  show_help
  exit 1
fi

COMMAND=$1
shift

case "$COMMAND" in
  validate)
    process_validate_command "$@"
    exit $?
    ;;
  cleanup)
    process_cleanup_command "$@"
    exit $?
    ;;
  *)
    error "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac