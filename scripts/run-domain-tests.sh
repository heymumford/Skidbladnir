#!/bin/bash

# This script runs the domain entity tests to validate the entity validation logic

# Set base directory to the project root
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR" || exit 1

echo "Running domain entity validation tests..."
echo "=================================="

# Use npx to run jest for the domain entity tests with verbose output
npx jest --verbose --config=jest.config.js \
  tests/unit/domain/entities/EntityValidationRules.test.ts \
  tests/unit/domain/entities/TestCaseFactory.test.ts \
  tests/unit/domain/entities/EntityRelationships.test.ts \
  tests/unit/domain/repositories/ValidatedTestCaseRepository.test.ts \
  tests/unit/domain/services/TestCaseService.test.ts \
  tests/unit/domain/services/TestSuiteService.test.ts

# Check if the tests passed
if [ $? -eq 0 ]; then
  echo "=================================="
  echo "✅ Domain entity validation tests passed"
  exit 0
else
  echo "=================================="
  echo "❌ Domain entity validation tests failed"
  exit 1
fi