#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

set -e

PROJECT_ROOT=$(pwd)
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results/python"
RESOURCE_CONSTRAINED=${RESOURCE_CONSTRAINED:-false}
SKIP_INTEGRATION=${SKIP_INTEGRATION:-false}
SKIP_LLM_TESTS=${SKIP_LLM_TESTS:-false}
SKIP_SLOW=${SKIP_SLOW:-false}

# Create output directory
mkdir -p "${TEST_RESULTS_DIR}"

echo "🐍 Running Python tests for Skidbladnir"

# Set environment variables
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"
export RESOURCE_CONSTRAINED="${RESOURCE_CONSTRAINED}"
export SKIP_LLM_TESTS="${SKIP_LLM_TESTS}"
export TEST_ENV="test"

# Run unit tests
echo "🧪 Running unit tests..."
python -m pytest -c config/pytest.ini tests/unit/python \
    -v \
    --junitxml="${TEST_RESULTS_DIR}/unit-results.xml" \
    --cov=internal/python \
    --cov-report=term \
    --cov-report=html:"${TEST_RESULTS_DIR}/coverage" \
    --cov-report=xml:"${TEST_RESULTS_DIR}/coverage.xml" \
    ${SKIP_SLOW:+"-k 'not slow'"} \
    ${SKIP_LLM_TESTS:+"-k 'not llm'"}

# Run integration tests (if not skipped)
if [ "${SKIP_INTEGRATION}" != "true" ]; then
    echo "🔌 Running integration tests..."
    python -m pytest -c config/pytest.ini tests/integration/python \
        -v \
        --junitxml="${TEST_RESULTS_DIR}/integration-results.xml" \
        ${SKIP_SLOW:+"-k 'not slow'"} \
        ${SKIP_LLM_TESTS:+"-k 'not llm'"}
else
    echo "⏩ Skipping integration tests"
fi

# Generate combined report
echo "📊 Generating test report..."
python -c "
import json
import os
import xml.etree.ElementTree as ET

# Parse unit test results
unit_xml = ET.parse('${TEST_RESULTS_DIR}/unit-results.xml')
unit_results = unit_xml.getroot()
unit_passed = len(unit_results.findall('.//testcase[not(.//failure)]'))
unit_failed = len(unit_results.findall('.//testcase/failure/..'))
unit_skipped = len(unit_results.findall('.//testcase/skipped/..'))
unit_total = unit_passed + unit_failed + unit_skipped

report = {
    'unit_tests': {
        'passed': unit_passed,
        'failed': unit_failed,
        'skipped': unit_skipped,
        'total': unit_total
    }
}

# Parse integration test results if they exist
int_xml_path = '${TEST_RESULTS_DIR}/integration-results.xml'
if os.path.exists(int_xml_path):
    int_xml = ET.parse(int_xml_path)
    int_results = int_xml.getroot()
    int_passed = len(int_results.findall('.//testcase[not(.//failure)]'))
    int_failed = len(int_results.findall('.//testcase/failure/..'))
    int_skipped = len(int_results.findall('.//testcase/skipped/..'))
    int_total = int_passed + int_failed + int_skipped
    
    report['integration_tests'] = {
        'passed': int_passed,
        'failed': int_failed,
        'skipped': int_skipped,
        'total': int_total
    }

# Write report
with open('${TEST_RESULTS_DIR}/summary.json', 'w') as f:
    json.dump(report, f, indent=2)

# Print summary
print('\nTest Summary:')
print('-------------')
print(f'Unit Tests: {unit_passed}/{unit_total} passed, {unit_failed} failed, {unit_skipped} skipped')
if 'integration_tests' in report:
    print(f'Integration Tests: {int_passed}/{int_total} passed, {int_failed} failed, {int_skipped} skipped')
"

echo "✅ Python tests completed"