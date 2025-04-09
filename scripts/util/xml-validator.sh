#!/bin/bash

# XML Schema Validator Script
# This script validates XML files against their schemas and manages schema downloads.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMAS_DIR="$ROOT_DIR/schemas"
TEMP_DIR="/tmp/xml-schema-validation"

# Create directories if they don't exist
mkdir -p "$SCHEMAS_DIR"
mkdir -p "$TEMP_DIR"

# Function to download a schema if it doesn't exist locally
download_schema() {
  local schema_url=$1
  local output_file=$2
  
  if [ ! -f "$output_file" ]; then
    echo "Downloading schema from $schema_url to $output_file"
    curl -sSL "$schema_url" -o "$output_file"
    
    # Verify the downloaded file is valid XML
    if ! xmlstarlet val "$output_file" > /dev/null 2>&1; then
      echo "Error: Downloaded schema is not valid XML."
      rm "$output_file"
      return 1
    fi
  else
    echo "Schema already exists: $output_file"
  fi
  
  return 0
}

# Function to validate a single XML file
validate_xml() {
  local xml_file=$1
  local schema_file=$2
  local result=0
  
  echo "Validating $xml_file against $schema_file"
  
  if ! xmlstarlet val --err --xsd "$schema_file" "$xml_file"; then
    echo "Validation failed for $xml_file"
    result=1
  else
    echo "Validation successful for $xml_file"
  fi
  
  return $result
}

# Download common schemas if they don't exist
download_common_schemas() {
  # Maven POM 4.0.0 schema
  download_schema "https://maven.apache.org/xsd/maven-4.0.0.xsd" "$SCHEMAS_DIR/maven-4.0.0.xsd"
  
  # Other common schemas can be added here
}

# Validate XML files in the repository
validate_all_xml() {
  local pattern=${1:-"**/*.xml"}
  local errors=0
  
  echo "Validating XML files matching pattern: $pattern"
  
  # Use npm script for validation
  if ! npm run test:xml -- -p "$pattern" -s "$SCHEMAS_DIR" --verbose; then
    errors=1
  fi
  
  return $errors
}

# Main function
main() {
  local cmd=${1:-"validate"}
  local pattern=${2:-"**/*.xml"}
  
  case "$cmd" in
    download)
      download_common_schemas
      ;;
    validate)
      download_common_schemas
      validate_all_xml "$pattern"
      ;;
    help|--help|-h)
      echo "Usage: $0 [command] [pattern]"
      echo
      echo "Commands:"
      echo "  download       Download common XML schemas"
      echo "  validate       Validate XML files (default)"
      echo "  help           Show this help message"
      echo
      echo "Parameters:"
      echo "  pattern        Glob pattern for XML files to validate (default: **/*.xml)"
      echo
      echo "Examples:"
      echo "  $0                      # Validate all XML files"
      echo "  $0 validate '**/*.pom'  # Validate only POM files"
      echo "  $0 download             # Download schemas without validation"
      ;;
    *)
      echo "Unknown command: $cmd"
      echo "Use '$0 help' for usage information"
      exit 1
      ;;
  esac
}

main "$@"