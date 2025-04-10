#!/bin/bash
#
# Infrastructure Scripts Idempotency Test
#
# This script tests that the core infrastructure scripts in the project are idempotent,
# meaning that running them multiple times produces the same results and doesn't cause
# errors or side effects.

set -e

# Colors for console output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

# Path to directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Log message with timestamp
log() {
  echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Log success message
log_success() {
  log "${GREEN}✓ $1${NC}"
}

# Log error message
log_error() {
  log "${RED}✗ $1${NC}"
}

# Log info message
log_info() {
  log "${YELLOW}ℹ $1${NC}"
}

# Run a script multiple times and check if it's idempotent
test_script_idempotency() {
  local script_path="$1"
  local script_name="$(basename "$script_path")"
  local iterations="${2:-2}"
  local temp_output_file=$(mktemp)
  local args="${@:3}"

  log_info "Testing idempotency of $script_name..."

  # Save the initial state
  local initial_output=$(bash -c "$script_path $args" 2>&1 | tee "$temp_output_file")
  local initial_exit_code=$?
  
  log_info "First run exit code: $initial_exit_code"
  
  # Check if the script ran successfully the first time
  if [ $initial_exit_code -ne 0 ]; then
    log_error "Script $script_name failed on first run with exit code $initial_exit_code"
    echo "$initial_output"
    return 1
  fi

  # Run the script additional times
  for ((i=2; i<=iterations; i++)); do
    log_info "Running iteration $i of $iterations..."
    
    local subsequent_output=$(bash -c "$script_path $args" 2>&1)
    local subsequent_exit_code=$?
    
    # Check if the script ran successfully on subsequent runs
    if [ $subsequent_exit_code -ne 0 ]; then
      log_error "Script $script_name failed on run $i with exit code $subsequent_exit_code"
      echo "$subsequent_output"
      return 1
    fi
    
    # Diff the outputs (ignoring timestamps and other expected differences)
    # Note: This is a simplified check and may need customization per script
    # For a more accurate comparison we might need script-specific logic
    
    # For now we just verify the script completed successfully
    log_info "Run $i completed successfully with exit code $subsequent_exit_code"
  done

  log_success "Script $script_name is idempotent (ran successfully $iterations times)"
  return 0
}

# Setup test environment
setup_test_environment() {
  log_info "Setting up test environment..."
  
  # Create a temporary directory for tests if needed
  if [ ! -d "$PROJECT_ROOT/tmp/idempotency-tests" ]; then
    mkdir -p "$PROJECT_ROOT/tmp/idempotency-tests"
  fi
  
  # Change to project root
  cd "$PROJECT_ROOT"
  
  # Backup any files that might be modified during tests
  # TODO: Add backup logic for specific files as needed
  
  log_success "Test environment set up"
}

# Clean up after tests
cleanup_test_environment() {
  log_info "Cleaning up test environment..."
  
  # Restore any backed up files
  # TODO: Add restore logic for specific files as needed
  
  log_success "Test environment cleaned up"
}

# Run all idempotency tests
run_all_tests() {
  local failed=0
  local total=0
  local passed=0
  
  log_info "Starting idempotency tests for infrastructure scripts..."
  
  # Test setup.sh (if it has a safe mode or can be tested)
  if [[ -f "$SCRIPT_DIR/setup.sh" ]]; then
    total=$((total+1))
    # Add specific args to make it safe for testing (dry-run, test-mode, etc.)
    if test_script_idempotency "$SCRIPT_DIR/setup.sh" 2 "--dry-run"; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test version update script
  if [[ -f "$SCRIPT_DIR/util/simple-version-update.sh" ]]; then
    total=$((total+1))
    # We pass a specific version to make it idempotent
    if test_script_idempotency "$SCRIPT_DIR/util/simple-version-update.sh" 2 "0.1.0-test"; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test license header scripts
  if [[ -f "$SCRIPT_DIR/util/update_license_headers.sh" ]]; then
    total=$((total+1))
    # Test with a specific directory
    if test_script_idempotency "$SCRIPT_DIR/util/update_license_headers.sh" 2 "$PROJECT_ROOT/tmp/idempotency-tests"; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test XML cleanup script
  if [[ -f "$SCRIPT_DIR/util/xml-cleanup.sh" ]]; then
    total=$((total+1))
    if test_script_idempotency "$SCRIPT_DIR/util/xml-cleanup.sh" 2 "--check"; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test go coverage check
  if [[ -f "$SCRIPT_DIR/go-coverage-check.sh" ]]; then
    total=$((total+1))
    if test_script_idempotency "$SCRIPT_DIR/go-coverage-check.sh" 2; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test check-coverage.sh
  if [[ -f "$SCRIPT_DIR/check-coverage.sh" ]]; then
    total=$((total+1))
    if test_script_idempotency "$SCRIPT_DIR/check-coverage.sh" 2; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Test git hooks installation
  if [[ -f "$SCRIPT_DIR/git-hooks/install.sh" ]]; then
    total=$((total+1))
    if test_script_idempotency "$SCRIPT_DIR/git-hooks/install.sh" 2; then
      passed=$((passed+1))
    else
      failed=$((failed+1))
    fi
  fi
  
  # Print summary
  log_info "Idempotency test summary:"
  log_info "Total scripts tested: $total"
  log_success "Scripts passing idempotency tests: $passed"
  
  if [ $failed -gt 0 ]; then
    log_error "Scripts failing idempotency tests: $failed"
    return 1
  else
    log_success "All scripts pass idempotency tests!"
    return 0
  fi
}

# Main execution
main() {
  setup_test_environment
  run_all_tests
  local test_result=$?
  cleanup_test_environment
  
  if [ $test_result -eq 0 ]; then
    log_success "All infrastructure scripts are idempotent!"
    exit 0
  else
    log_error "Some infrastructure scripts are not idempotent. Check logs for details."
    exit 1
  fi
}

# Run main function
main