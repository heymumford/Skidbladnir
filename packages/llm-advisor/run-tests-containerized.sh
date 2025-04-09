#!/bin/bash
# Containerized test runner for LLM Advisor
# This script builds test containers and runs all tests in isolated environments
# It's designed for minimal rebuild and recompile cycles

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_IMAGE_NAME="llm-advisor-tests"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
DOCKER_CACHE_DIR="/tmp/llm-advisor-docker-cache"

# Create output directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$DOCKER_CACHE_DIR"

echo "🔍 Running LLM Advisor Tests in Containers"

# Clean up containers on exit
cleanup() {
  echo "Cleaning up test containers..."
  docker ps -a --filter "name=llm-advisor-test-*" -q | xargs -r docker rm -f > /dev/null 2>&1
  echo "Cleanup complete"
}
trap cleanup EXIT

# Build test image with layer caching
build_test_image() {
  echo "📦 Building test container with optimized layers..."
  
  # Build the test container with cache optimization
  docker build \
    --cache-from="$TEST_IMAGE_NAME:latest" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --tag "$TEST_IMAGE_NAME:latest" \
    --file "$PROJECT_ROOT/packages/llm-advisor/Dockerfile.test" \
    "$PROJECT_ROOT"
    
  # Save the image to cache if build succeeds
  docker save "$TEST_IMAGE_NAME:latest" | gzip > "$DOCKER_CACHE_DIR/$TEST_IMAGE_NAME-latest.tar.gz"
  
  echo "✅ Test container built successfully"
}

# Load cached image if available
if [ -f "$DOCKER_CACHE_DIR/$TEST_IMAGE_NAME-latest.tar.gz" ]; then
  echo "🔄 Loading cached test image..."
  docker load < "$DOCKER_CACHE_DIR/$TEST_IMAGE_NAME-latest.tar.gz" || build_test_image
else
  build_test_image
fi

# Run the tests in parallel
run_test_suite() {
  local test_type="$1"
  local container_name="llm-advisor-test-$test_type"
  local log_file="$TEST_RESULTS_DIR/$test_type.log"
  local report_file="$TEST_RESULTS_DIR/$test_type-report.xml"
  
  echo "🧪 Running $test_type tests..."
  
  # Run tests in container with bind mount for test results
  docker run \
    --name "$container_name" \
    --rm \
    -v "$TEST_RESULTS_DIR:/app/test-results" \
    -e "TEST_TYPE=$test_type" \
    "$TEST_IMAGE_NAME:latest" \
    npm run test:$test_type -- --reporters=default --reporters=jest-junit \
    > "$log_file" 2>&1 &
    
  echo "📊 Started $test_type test container (results will be in $log_file)"
}

# Start all test suites in parallel
run_test_suite "unit"
run_test_suite "integration" 
run_test_suite "system"

# Wait for all tests to complete
echo "⏳ Waiting for all test suites to complete..."
wait

# Check all test results
echo "🔍 Checking test results..."
TEST_SUCCESS=true

# Process each log file
for test_type in unit integration system; do
  LOG_FILE="$TEST_RESULTS_DIR/$test_type.log"
  
  if grep -q "FAIL " "$LOG_FILE"; then
    echo "❌ $test_type tests failed!"
    TEST_SUCCESS=false
  else
    echo "✅ $test_type tests passed!"
  fi
done

# Generate combined report
echo "📊 Generating combined test report..."
node "$PROJECT_ROOT/packages/llm-advisor/scripts/generate-test-report.js"

# Final status
if [ "$TEST_SUCCESS" = true ]; then
  echo "🎉 All tests passed successfully!"
  exit 0
else
  echo "❌ Some tests failed. Check logs for details."
  exit 1
fi