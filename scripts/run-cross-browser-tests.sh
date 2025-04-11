#!/bin/bash
# Script to run cross-browser compatibility tests

set -e

# Default values
DEFAULT_BROWSERS="chrome,firefox,edge"
PARALLEL=false
REPORT_DIR="cypress/reports"
SCREENSHOT_DIR="cypress/screenshots"
SPEC_PATTERN="cypress/e2e/browser-compatibility/**/*.cy.js"

# Parse command line arguments
BROWSERS=$DEFAULT_BROWSERS
while [[ $# -gt 0 ]]; do
  case "$1" in
    --browsers)
      BROWSERS="$2"
      shift 2
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --spec)
      SPEC_PATTERN="$2"
      shift 2
      ;;
    --report-dir)
      REPORT_DIR="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --browsers     Comma-separated list of browsers to test (default: chrome,firefox,edge)"
      echo "  --parallel     Run tests in parallel (one browser per process)"
      echo "  --spec         Spec pattern to run (default: cypress/e2e/browser-compatibility/**/*.cy.js)"
      echo "  --report-dir   Directory for test reports (default: cypress/reports)"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Ensure directories exist
mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR"

# Function to run tests for a specific browser
run_browser_tests() {
  local browser=$1
  local timestamp=$(date +"%Y%m%d_%H%M%S")
  local report_file="${REPORT_DIR}/report_${browser}_${timestamp}.json"
  
  echo "Starting tests for $browser browser..."
  
  # Run Cypress tests for the browser
  npx cypress run --browser "$browser" --spec "$SPEC_PATTERN" --reporter json --reporter-options "output=${report_file}"
  
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "Tests for $browser failed with exit code $exit_code"
  else
    echo "Tests for $browser completed successfully"
  fi
  
  return $exit_code
}

# Convert comma-separated browser list to array
IFS=',' read -ra BROWSER_ARRAY <<< "$BROWSERS"

# Run tests for each browser
if [ "$PARALLEL" = true ]; then
  # Run tests in parallel (each browser in its own process)
  pids=()
  for browser in "${BROWSER_ARRAY[@]}"; do
    run_browser_tests "$browser" &
    pids+=($!)
  done
  
  # Wait for all processes to complete
  exit_code=0
  for pid in "${pids[@]}"; do
    wait $pid || exit_code=1
  done
  
  if [ $exit_code -ne 0 ]; then
    echo "Some browser tests failed"
    exit 1
  fi
else
  # Run tests sequentially
  for browser in "${BROWSER_ARRAY[@]}"; do
    run_browser_tests "$browser" || exit 1
  done
fi

# Generate HTML report from JSON reports
echo "Generating consolidated cross-browser report..."
node -e "
const fs = require('fs');
const path = require('path');

// Read all JSON reports
const reportDir = '$REPORT_DIR';
const reportFiles = fs.readdirSync(reportDir)
  .filter(file => file.startsWith('report_') && file.endsWith('.json'));

if (reportFiles.length === 0) {
  console.error('No report files found');
  process.exit(1);
}

// Consolidate results
const consolidatedResults = {
  browsers: {},
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  browserSpecificIssues: []
};

reportFiles.forEach(file => {
  const filePath = path.join(reportDir, file);
  const reportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Extract browser name from filename (report_chrome_20250101_120000.json -> chrome)
  const browserMatch = file.match(/report_([^_]+)_/);
  const browser = browserMatch ? browserMatch[1] : 'unknown';
  
  // Count tests
  const numTests = reportData.stats ? reportData.stats.tests : 0;
  const numPassed = reportData.stats ? reportData.stats.passes : 0;
  const numFailed = reportData.stats ? reportData.stats.failures : 0;
  const numSkipped = reportData.stats ? reportData.stats.pending : 0;
  
  consolidatedResults.browsers[browser] = {
    tests: numTests,
    passed: numPassed,
    failed: numFailed,
    skipped: numSkipped
  };
  
  consolidatedResults.totalTests += numTests;
  consolidatedResults.passed += numPassed;
  consolidatedResults.failed += numFailed;
  consolidatedResults.skipped += numSkipped;
  
  // Track browser-specific failures
  if (reportData.results) {
    reportData.results.forEach(suite => {
      const findFailures = (suite) => {
        if (suite.tests) {
          suite.tests.forEach(test => {
            if (test.state === 'failed') {
              consolidatedResults.browserSpecificIssues.push({
                browser,
                test: test.title,
                error: test.err ? test.err.message : 'Unknown error'
              });
            }
          });
        }
        
        if (suite.suites) {
          suite.suites.forEach(findFailures);
        }
      };
      
      findFailures(suite);
    });
  }
});

// Generate HTML report
const htmlReport = \`
<!DOCTYPE html>
<html>
<head>
  <title>Cross-Browser Compatibility Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1 { color: #333; }
    .summary { margin-bottom: 20px; }
    .browsers { display: flex; margin-bottom: 20px; }
    .browser { margin-right: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .browser h3 { margin-top: 0; }
    .passed { color: green; }
    .failed { color: red; }
    .skipped { color: orange; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Cross-Browser Compatibility Test Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: \${consolidatedResults.totalTests}</p>
    <p class="passed">Passed: \${consolidatedResults.passed}</p>
    <p class="failed">Failed: \${consolidatedResults.failed}</p>
    <p class="skipped">Skipped: \${consolidatedResults.skipped}</p>
  </div>
  
  <div class="browsers">
    \${Object.entries(consolidatedResults.browsers).map(([browser, stats]) => \`
      <div class="browser">
        <h3>\${browser.charAt(0).toUpperCase() + browser.slice(1)}</h3>
        <p>Tests: \${stats.tests}</p>
        <p class="passed">Passed: \${stats.passed}</p>
        <p class="failed">Failed: \${stats.failed}</p>
        <p class="skipped">Skipped: \${stats.skipped}</p>
      </div>
    \`).join('')}
  </div>
  
  \${consolidatedResults.browserSpecificIssues.length > 0 ? \`
    <h2>Browser-Specific Issues</h2>
    <table>
      <tr>
        <th>Browser</th>
        <th>Test</th>
        <th>Error</th>
      </tr>
      \${consolidatedResults.browserSpecificIssues.map(issue => \`
        <tr>
          <td>\${issue.browser}</td>
          <td>\${issue.test}</td>
          <td>\${issue.error}</td>
        </tr>
      \`).join('')}
    </table>
  \` : ''}
  
  <p>Report generated on \${new Date().toLocaleString()}</p>
</body>
</html>
\`;

fs.writeFileSync(path.join(reportDir, 'cross-browser-report.html'), htmlReport);
console.log(\`HTML report generated: \${path.join(reportDir, 'cross-browser-report.html')}\`);
"

echo "Cross-browser tests completed!"

# Check if any browsers had failures
if [ $exit_code -ne 0 ]; then
  echo "Some tests failed. See the HTML report for details."
  exit 1
fi

echo "All tests passed successfully!"
exit 0