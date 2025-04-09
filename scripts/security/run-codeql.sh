#!/bin/bash

# Script to run CodeQL analysis locally
# This helps developers check for security issues before pushing code

set -e

# Default values
DB_PATH="$(pwd)/codeql-db"
LANGUAGES="javascript,python,go"
OUTPUT_DIR="$(pwd)/codeql-results"
CONFIG_FILE="$(pwd)/.github/codeql/codeql-config.yml"
QUERY_SUITE="security-and-quality"

# Display help
function show_help {
  echo "CodeQL Local Analysis Tool for Skíðblaðnir"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -d, --database <path>     Path to store CodeQL database (default: ./codeql-db)"
  echo "  -l, --languages <langs>   Languages to analyze (default: javascript,python,go)"
  echo "                            Supported: cpp,csharp,go,java,javascript,python,ruby"
  echo "  -o, --output <dir>        Directory to store results (default: ./codeql-results)"
  echo "  -c, --config <file>       CodeQL config file (default: .github/codeql/codeql-config.yml)"
  echo "  -q, --query <suite>       Query suite to run (default: security-and-quality)"
  echo "                            Options: security-extended, security-and-quality"
  echo "  -h, --help                Show this help message"
  echo ""
  echo "Example: $0 --languages javascript --query security-extended"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -d|--database)
      DB_PATH="$2"
      shift 2
      ;;
    -l|--languages)
      LANGUAGES="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -c|--config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    -q|--query)
      QUERY_SUITE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Check if CodeQL CLI is installed
if ! command -v codeql &> /dev/null; then
  echo "Error: CodeQL CLI is not installed or not in your PATH."
  echo "Please follow instructions at https://github.com/github/codeql-cli-binaries to install it."
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if database already exists
if [ -d "$DB_PATH" ]; then
  read -p "Database already exists at $DB_PATH. Remove it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$DB_PATH"
  fi
fi

# Create CodeQL database
echo "Creating CodeQL database for languages: $LANGUAGES"
echo "This may take several minutes..."
codeql database create "$DB_PATH" --language="$LANGUAGES" --source-root="$(pwd)"

# Run analysis
echo "Running CodeQL analysis with query suite: $QUERY_SUITE"
codeql database analyze "$DB_PATH" "$QUERY_SUITE" --format=sarif-latest --output="$OUTPUT_DIR/results.sarif" --sarif-add-snippets --threads=0

# Check if config file exists and use it
if [ -f "$CONFIG_FILE" ]; then
  echo "Using configuration from $CONFIG_FILE"
  # Extract custom queries from config
  CUSTOM_QUERIES=$(grep -A 10 "queries:" "$CONFIG_FILE" | grep "uses:" | sed 's/.*uses: //' | tr -d ' ')
  
  if [ ! -z "$CUSTOM_QUERIES" ]; then
    echo "Running custom queries specified in config file"
    for query in $(echo $CUSTOM_QUERIES | tr ',' ' '); do
      echo "  - Running query pack: $query"
      codeql database analyze "$DB_PATH" "$query" --format=sarif-latest --output="$OUTPUT_DIR/results-$query.sarif" --sarif-add-snippets --threads=0
    done
  fi
fi

# Generate HTML report
echo "Generating HTML report..."
codeql github upload-results --repository=skidbladnir --ref=refs/heads/main --commit=$(git rev-parse HEAD) --sarif="$OUTPUT_DIR/results.sarif" --github-auth-stdin <<< "$GITHUB_TOKEN" || true

echo "Analysis complete! Results saved to: $OUTPUT_DIR/results.sarif"
echo "You can view these results using the SARIF viewer in VS Code or upload to GitHub."
echo "See docs/security-analysis.md for guidance on interpreting the results."