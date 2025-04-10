#!/bin/bash
# Script to run qTest API cross-environment compatibility tests

# Set default values
DEV_ENV=${QTEST_TEST_DEV:-true}
QA_ENV=${QTEST_TEST_QA:-true}
PROD_ENV=${QTEST_TEST_PROD:-false}
REPORT_DIR="./test-results/qtest-environment-tests"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --dev) DEV_ENV="$2"; shift ;;
    --qa) QA_ENV="$2"; shift ;;
    --prod) PROD_ENV="$2"; shift ;;
    --report-dir) REPORT_DIR="$2"; shift ;;
    --help) 
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --dev <true|false>      Whether to test DEV environment (default: true)"
      echo "  --qa <true|false>       Whether to test QA environment (default: true)"
      echo "  --prod <true|false>     Whether to test PROD environment (default: false)"
      echo "  --report-dir <path>     Directory to store test reports (default: ./test-results/qtest-environment-tests)"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Ensure report directory exists
mkdir -p $REPORT_DIR

# Export environment control variables
export QTEST_TEST_DEV=$DEV_ENV
export QTEST_TEST_QA=$QA_ENV
export QTEST_TEST_PROD=$PROD_ENV

# Set up error handling
set -e
trap 'echo "Error: Command failed with status $?"; exit 1' ERR

# Print configuration
echo "=== qTest Environment Test Configuration ==="
echo "Testing DEV environment: $DEV_ENV"
echo "Testing QA environment: $QA_ENV"
echo "Testing PROD environment: $PROD_ENV"
echo "Report directory: $REPORT_DIR"
echo "========================================"

# Check for API keys
if [[ "$DEV_ENV" == "true" && -z "$QTEST_DEV_API_KEY" ]]; then
  echo "Warning: QTEST_DEV_API_KEY is not set but DEV environment testing is enabled"
fi

if [[ "$QA_ENV" == "true" && -z "$QTEST_QA_API_KEY" ]]; then
  echo "Warning: QTEST_QA_API_KEY is not set but QA environment testing is enabled"
fi

if [[ "$PROD_ENV" == "true" && -z "$QTEST_PROD_API_KEY" ]]; then
  echo "Warning: QTEST_PROD_API_KEY is not set but PROD environment testing is enabled"
fi

# Run tests
echo "Starting qTest API cross-environment compatibility tests..."
echo "This may take a few minutes depending on network conditions and API rate limits."

# Run all environment compatibility tests
mvn test -f tests/api-integration/pom.xml \
  -Dkarate.options="--tags @CrossEnvironment" \
  -Dkarate.output.dir="$REPORT_DIR"

# Check result
if [ $? -eq 0 ]; then
  echo "✅ All qTest environment compatibility tests passed!"
else
  echo "❌ Some qTest environment compatibility tests failed. See report for details."
  exit 1
fi

# Print report location
echo "Test reports available at: $REPORT_DIR"