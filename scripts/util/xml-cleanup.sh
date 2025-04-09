#!/bin/bash
#
# XML cleanup script for Skidbladnir
# Uses xmlstarlet to format and validate XML files
# Ensures consistent formatting and checks for errors
#
# Copyright (c) 2025 Eric Mumford
# Licensed under the MIT License. See LICENSE file for full terms.
#

set -e

# Directory of this script
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/../..")

# Temporary directory for processed files
TMP_DIR=$(mktemp -d)
trap 'rm -rf ${TMP_DIR}' EXIT

# Command-line arguments
VALIDATE_ONLY=false
CHECK_DEPS=false
FIX_ISSUES=false
VERBOSE=false

print_help() {
  echo "XML Cleanup Script"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -v, --validate     Validate XML files without modifying them"
  echo "  -d, --check-deps   Check cross-dependencies between XML files"
  echo "  -f, --fix          Fix issues automatically when possible"
  echo "  --verbose          Show detailed output"
  echo "  -h, --help         Show this help message"
  echo ""
  echo "This script validates and formats XML files in the repository,"
  echo "ensuring consistent formatting and checking for errors."
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--validate)
      VALIDATE_ONLY=true
      shift
      ;;
    -d|--check-deps)
      CHECK_DEPS=true
      shift
      ;;
    -f|--fix)
      FIX_ISSUES=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

# Check if xmlstarlet is installed
if ! command -v xmlstarlet &> /dev/null; then
  echo "Error: xmlstarlet is not installed. Please install it first."
  echo "  Ubuntu/Debian: sudo apt-get install xmlstarlet"
  echo "  Red Hat/Fedora: sudo dnf install xmlstarlet"
  echo "  macOS: brew install xmlstarlet"
  exit 1
fi

# Function to log messages with timestamp
log() {
  local level=$1
  shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*"
}

# Function to log debug messages (only in verbose mode)
debug() {
  if [ "$VERBOSE" = true ]; then
    log "DEBUG" "$@"
  fi
}

# Function to log info messages
info() {
  log "INFO" "$@"
}

# Function to log warning messages
warn() {
  log "WARN" "$@"
}

# Function to log error messages
error() {
  log "ERROR" "$@" >&2
}

# Count of files processed
count_total=0
count_valid=0
count_invalid=0
count_fixed=0

# Find XML files in the repository (excluding node_modules, .git, etc.)
find_xml_files() {
  find "$PROJECT_ROOT" \
    -type d \( -name "node_modules" -o -name ".git" -o -name "dist" -o -name "build" \) -prune \
    -o -type f -name "*.xml" -print
}

# Validate XML file (syntax check)
validate_xml() {
  local file="$1"
  debug "Validating XML file: $file"
  if xmlstarlet val "$file" &> /dev/null; then
    debug "  ✓ Valid XML: $file"
    return 0
  else
    warn "  ✗ Invalid XML: $file"
    if [ "$VERBOSE" = true ]; then
      xmlstarlet val "$file" >&2
    fi
    return 1
  fi
}

# Format XML file (pretty-print)
format_xml() {
  local input_file="$1"
  local output_file="$2"
  debug "Formatting XML file: $input_file"
  
  # Use xmlstarlet to format (indent with 2 spaces)
  if xmlstarlet fo -s 2 "$input_file" > "$output_file"; then
    debug "  ✓ Formatted XML: $input_file"
    return 0
  else
    warn "  ✗ Failed to format XML: $input_file"
    return 1
  fi
}

# Process a single XML file
process_xml_file() {
  local file="$1"
  local rel_path="${file#$PROJECT_ROOT/}"
  
  ((count_total++))
  
  # Skip IDE configuration files
  if [[ "$file" == *".idea/"* ]]; then
    debug "Skipping IDE configuration file: $rel_path"
    return 0
  fi
  
  # Validate file
  if validate_xml "$file"; then
    ((count_valid++))
    
    # If we're only validating, stop here
    if [ "$VALIDATE_ONLY" = true ]; then
      return 0
    fi
    
    # Format file if not in validate-only mode
    local tmp_file="${TMP_DIR}/$(basename "$file")"
    if format_xml "$file" "$tmp_file"; then
      # Check if formatting changed the file
      if ! diff -q "$file" "$tmp_file" &> /dev/null; then
        if [ "$FIX_ISSUES" = true ]; then
          info "Updating file format: $rel_path"
          cp "$tmp_file" "$file"
          ((count_fixed++))
        else
          warn "File needs formatting: $rel_path"
        fi
      else
        debug "  ✓ File already properly formatted: $rel_path"
      fi
    fi
  else
    ((count_invalid++))
    
    # Try to fix issues if requested
    if [ "$FIX_ISSUES" = true ]; then
      info "Attempting to fix XML issues: $rel_path"
      
      # Try to create a valid XML file
      local tmp_file="${TMP_DIR}/$(basename "$file")"
      if xmlstarlet fo -R "$file" > "$tmp_file" 2>/dev/null && validate_xml "$tmp_file"; then
        info "  ✓ Fixed XML issues: $rel_path"
        cp "$tmp_file" "$file"
        ((count_fixed++))
        ((count_valid++))
        ((count_invalid--))
      else
        error "  ✗ Could not fix XML issues: $rel_path"
      fi
    fi
  fi
}

# Check cross-dependencies in Maven POM files
check_pom_dependencies() {
  local pom_files=()
  
  # Find all pom.xml files
  while IFS= read -r file; do
    pom_files+=("$file")
  done < <(find "$PROJECT_ROOT" -name "pom.xml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*")
  
  local pom_count=${#pom_files[@]}
  
  if [ "$pom_count" -eq 0 ]; then
    info "No Maven POM files found for dependency check"
    return 0
  fi
  
  info "Checking dependencies in $pom_count Maven POM files"
  
  # Extract all group:artifact:version coordinates
  local all_coords=()
  local all_deps=()
  
  for pom in "${pom_files[@]}"; do
    # Get project coordinates
    local groupId=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:groupId" "$pom" 2>/dev/null || 
                   xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:parent/x:groupId" "$pom" 2>/dev/null)
    local artifactId=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:artifactId" "$pom" 2>/dev/null)
    local version=$(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:version" "$pom" 2>/dev/null || 
                   xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:parent/x:version" "$pom" 2>/dev/null)
    
    if [ -n "$groupId" ] && [ -n "$artifactId" ]; then
      local coord="${groupId}:${artifactId}:${version}"
      all_coords+=("$coord:$pom")
      
      # Get all dependencies
      while IFS= read -r dep; do
        if [ -n "$dep" ]; then
          all_deps+=("$dep:$pom")
        fi
      done < <(xmlstarlet sel -N x="http://maven.apache.org/POM/4.0.0" -t -v "/x:project/x:dependencies/x:dependency/x:groupId" -o ":" -v "/x:project/x:dependencies/x:dependency/x:artifactId" -o ":" -v "/x:project/x:dependencies/x:dependency/x:version" "$pom" 2>/dev/null | grep -v "::")
    fi
  done
  
  # Check for version inconsistencies
  local inconsistent=false
  
  for dep in "${all_deps[@]}"; do
    IFS=':' read -r depGroupId depArtifactId depVersion depPom <<< "$dep"
    local dep_key="${depGroupId}:${depArtifactId}"
    
    # Find all occurrences of this dependency
    local versions=()
    local poms=()
    
    for d in "${all_deps[@]}"; do
      IFS=':' read -r dGroupId dArtifactId dVersion dPom <<< "$d"
      if [ "${dGroupId}:${dArtifactId}" = "$dep_key" ]; then
        versions+=("$dVersion")
        poms+=("$dPom")
      fi
    done
    
    # Check if we have different versions
    if [ ${#versions[@]} -gt 1 ]; then
      local first_version="${versions[0]}"
      for ((i=1; i<${#versions[@]}; i++)); do
        if [ "${versions[i]}" != "$first_version" ] && [ -n "${versions[i]}" ] && [ -n "$first_version" ]; then
          inconsistent=true
          warn "Inconsistent versions for $dep_key: ${versions[*]}"
          for ((j=0; j<${#poms[@]}; j++)); do
            warn "  - ${versions[j]} in ${poms[j]#$PROJECT_ROOT/}"
          done
          break
        fi
      done
    fi
  done
  
  if [ "$inconsistent" = false ]; then
    info "No dependency inconsistencies found"
  fi
}

# Main function to process all XML files
process_all_xml_files() {
  info "Starting XML validation and cleanup"
  
  if [ "$VALIDATE_ONLY" = true ]; then
    info "Running in validation-only mode"
  fi
  
  if [ "$FIX_ISSUES" = true ]; then
    info "Automatic issue fixing is enabled"
  fi
  
  # Process all XML files
  local xml_files=()
  while IFS= read -r file; do
    xml_files+=("$file")
  done < <(find_xml_files)
  
  info "Found ${#xml_files[@]} XML files to process"
  
  for file in "${xml_files[@]}"; do
    process_xml_file "$file"
  done
  
  # Print summary
  info "XML processing summary:"
  info "  Total files: $count_total"
  info "  Valid files: $count_valid"
  info "  Invalid files: $count_invalid"
  
  if [ "$FIX_ISSUES" = true ]; then
    info "  Fixed files: $count_fixed"
  fi
  
  # Check dependencies if requested
  if [ "$CHECK_DEPS" = true ]; then
    check_pom_dependencies
  fi
  
  # Return non-zero exit code if there are invalid files
  if [ "$count_invalid" -gt 0 ]; then
    error "Found $count_invalid invalid XML files"
    return 1
  fi
  
  info "XML cleanup completed successfully"
  return 0
}

# Run the main function
process_all_xml_files