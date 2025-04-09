#!/bin/bash
set -e

# Script to run tests in containerized environment

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Function to show usage information
show_usage() {
    echo "TestBridge Test Runner"
    echo ""
    echo "Usage: $0 [options] [test_type]"
    echo ""
    echo "Test Types:"
    echo "  all           Run all tests (default)"
    echo "  unit          Run only unit tests"
    echo "  integration   Run only integration tests"
    echo "  e2e           Run only end-to-end tests"
    echo ""
    echo "Options:"
    echo "  --verbose     Show detailed test output"
    echo "  --help, -h    Show this help message"
    echo ""
}

# Default values
TEST_TYPE="all"
VERBOSE=0

# Process arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        all|unit|integration|e2e)
            TEST_TYPE="$1"
            shift
            ;;
        --verbose)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option '$1'"
            show_usage
            exit 1
            ;;
    esac
done

# Function to run TypeScript tests
run_typescript_tests() {
    echo "Running TypeScript tests..."
    
    TEST_CMD="cd /app && npm test"
    if [ "${TEST_TYPE}" = "unit" ]; then
        TEST_CMD="cd /app && npm run test:unit"
    elif [ "${TEST_TYPE}" = "integration" ]; then
        TEST_CMD="cd /app && npm run test:integration"
    fi
    
    if [ "${VERBOSE}" -eq 1 ]; then
        TEST_CMD="${TEST_CMD} -- --verbose"
    fi
    
    podman run \
        --rm \
        --network=testbridge_default \
        -v "${PROJECT_ROOT}:/app:Z" \
        testbridge/typescript-dev:latest \
        /bin/sh -c "${TEST_CMD}"
}

# Function to run Python tests
run_python_tests() {
    echo "Running Python tests..."
    
    TEST_CMD="cd /app/packages/orchestrator && python -m pytest"
    if [ "${TEST_TYPE}" = "unit" ]; then
        TEST_CMD="${TEST_CMD} tests/unit"
    elif [ "${TEST_TYPE}" = "integration" ]; then
        TEST_CMD="${TEST_CMD} tests/integration"
    fi
    
    if [ "${VERBOSE}" -eq 1 ]; then
        TEST_CMD="${TEST_CMD} -v"
    fi
    
    podman run \
        --rm \
        --network=testbridge_default \
        -v "${PROJECT_ROOT}:/app:Z" \
        testbridge/python-dev:latest \
        /bin/sh -c "${TEST_CMD}"
}

# Function to run Go tests
run_go_tests() {
    echo "Running Go tests..."
    
    TEST_CMD="cd /app/packages/binary-processor && go test ./..."
    if [ "${TEST_TYPE}" = "unit" ]; then
        TEST_CMD="${TEST_CMD} -short"
    elif [ "${TEST_TYPE}" = "integration" ]; then
        TEST_CMD="${TEST_CMD} -run Integration"
    fi
    
    if [ "${VERBOSE}" -eq 1 ]; then
        TEST_CMD="${TEST_CMD} -v"
    fi
    
    podman run \
        --rm \
        --network=testbridge_default \
        -v "${PROJECT_ROOT}:/app:Z" \
        testbridge/go-dev:latest \
        /bin/sh -c "${TEST_CMD}"
}

# Function to run end-to-end tests
run_e2e_tests() {
    if [ "${TEST_TYPE}" = "all" ] || [ "${TEST_TYPE}" = "e2e" ]; then
        echo "Running end-to-end tests..."
        
        TEST_CMD="cd /app/tests && npm run test:e2e"
        if [ "${VERBOSE}" -eq 1 ]; then
            TEST_CMD="${TEST_CMD} -- --verbose"
        fi
        
        podman run \
            --rm \
            --network=testbridge_default \
            -v "${PROJECT_ROOT}:/app:Z" \
            testbridge/typescript-dev:latest \
            /bin/sh -c "${TEST_CMD}"
    fi
}

# Check if the development containers are built
if ! podman image exists testbridge/typescript-dev:latest || \
   ! podman image exists testbridge/python-dev:latest || \
   ! podman image exists testbridge/go-dev:latest; then
    echo "Error: Development container images not found."
    echo "Please build the development containers first with:"
    echo "./scripts/dev-env.sh build"
    exit 1
fi

# Run the tests
echo "Starting TestBridge tests (type: ${TEST_TYPE})..."

# Run TypeScript tests
run_typescript_tests

# Run Python tests
run_python_tests

# Run Go tests
run_go_tests

# Run end-to-end tests
run_e2e_tests

echo "All tests completed."
exit 0