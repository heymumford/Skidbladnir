#!/bin/bash
#
# Script to run Karate API tests for Skidbladnir
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KARATE_DIR="${PROJECT_ROOT}/tests/api-integration"

# Default environment is 'dev'
ENVIRONMENT=${1:-dev}

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Maven is required to run Karate tests. Please install Maven first."
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is required to run Karate tests. Please install Java 11 or higher."
    exit 1
fi

echo "Running Karate API tests with environment: ${ENVIRONMENT}"

# Run the tests
cd "${KARATE_DIR}"
mvn clean test -Dkarate.env="${ENVIRONMENT}"

# Check if tests were successful
if [ $? -eq 0 ]; then
    echo "API tests completed successfully!"
    echo "Report available at: ${KARATE_DIR}/target/cucumber-reports/"
else
    echo "API tests failed. Check the logs for details."
    exit 1
fi