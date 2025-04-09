/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Generate HTML test report from Jest JSON output
 */

const fs = require('fs');
const path = require('path');

// Constants
const TEST_RESULTS_FILE = path.join(process.cwd(), 'test-results/test-report.json');
const OUTPUT_FILE = path.join(process.cwd(), 'test-results/test-report.html');
const COVERAGE_DIR = path.join(process.cwd(), 'test-results/coverage');

// Create output directory if it doesn't exist
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read test results
console.log(`Reading test results from ${TEST_RESULTS_FILE}`);
let testResults;
try {
  testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
} catch (error) {
  console.error(`Error reading test results: ${error.message}`);
  process.exit(1);
}

// Process test results
const summary = {
  numPassedTests: 0,
  numFailedTests: 0,
  numPendingTests: 0,
  numTotalTests: 0,
  startTime: testResults.startTime,
  endTime: testResults.endTime,
  success: testResults.success,
  testResults: []
};

testResults.testResults.forEach(suite => {
  summary.numPassedTests += suite.numPassingTests;
  summary.numFailedTests += suite.numFailingTests;
  summary.numPendingTests += suite.numPendingTests;
  summary.numTotalTests += suite.numPassingTests + suite.numFailingTests + suite.numPendingTests;
  
  // Map test results
  summary.testResults.push({
    name: suite.name,
    status: suite.status,
    tests: suite.assertionResults.map(test => ({
      title: test.fullName || test.title,
      status: test.status,
      duration: test.duration || 0
    }))
  });
});

// Check for coverage info
let coverageInfo = null;
const lcovInfo = path.join(COVERAGE_DIR, 'lcov-report', 'index.html');
if (fs.existsSync(lcovInfo)) {
  coverageInfo = {
    reportExists: true,
    reportPath: path.relative(path.dirname(OUTPUT_FILE), lcovInfo)
  };
}

// Generate HTML report
function generateHtml(summary, coverageInfo) {
  const duration = ((summary.endTime - summary.startTime) / 1000).toFixed(2);
  const successRate = ((summary.numPassedTests / summary.numTotalTests) * 100).toFixed(2);
  const statusColor = summary.success ? 'green' : 'red';
  const statusText = summary.success ? 'PASSED' : 'FAILED';
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skidbladnir Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 5px;
      border-bottom: 1px solid #e9ecef;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }
    .summary-card {
      flex: 1;
      min-width: 200px;
      margin: 10px;
      padding: 15px;
      border-radius: 5px;
      background: #f8f9fa;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 3px;
      font-weight: bold;
      color: white;
      background-color: ${statusColor};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .test-suite {
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
      border-radius: 5px;
      overflow: hidden;
    }
    .test-suite-header {
      padding: 10px 15px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-weight: bold;
      cursor: pointer;
    }
    .test-suite-body {
      display: none;
    }
    .test-result {
      padding: 10px 15px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
    }
    .test-result:last-child {
      border-bottom: none;
    }
    .test-status {
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }
    .test-status-passed {
      color: #28a745;
    }
    .test-status-failed {
      color: #dc3545;
    }
    .test-status-pending {
      color: #ffc107;
    }
    footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
      color: #6c757d;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .coverage-link {
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <h1>Skidbladnir Test Report</h1>
    <p>Test run completed on ${new Date(summary.endTime).toLocaleString()}</p>
    <div class="status-badge">${statusText}</div>
  </header>
  
  <div class="summary">
    <div class="summary-card">
      <div class="summary-value">${summary.numTotalTests}</div>
      <div>Total Tests</div>
    </div>
    <div class="summary-card">
      <div class="summary-value" style="color: #28a745;">${summary.numPassedTests}</div>
      <div>Passed</div>
    </div>
    <div class="summary-card">
      <div class="summary-value" style="color: #dc3545;">${summary.numFailedTests}</div>
      <div>Failed</div>
    </div>
    <div class="summary-card">
      <div class="summary-value" style="color: #ffc107;">${summary.numPendingTests}</div>
      <div>Pending</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${successRate}%</div>
      <div>Success Rate</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${duration}s</div>
      <div>Duration</div>
    </div>
  </div>
  
  ${coverageInfo ? `
  <div class="coverage-link">
    <a href="${coverageInfo.reportPath}" target="_blank">View Code Coverage Report</a>
  </div>
  ` : ''}
  
  <h2>Test Suites</h2>
  `;
  
  summary.testResults.forEach((suite, index) => {
    const suiteName = suite.name.replace(process.cwd(), '');
    const passedTests = suite.tests.filter(t => t.status === 'passed').length;
    const failedTests = suite.tests.filter(t => t.status === 'failed').length;
    const pendingTests = suite.tests.filter(t => t.status === 'pending').length;
    const totalTests = suite.tests.length;
    
    html += `
  <div class="test-suite">
    <div class="test-suite-header" onclick="toggleSuite(${index})">
      ${suiteName} (${passedTests}/${totalTests} passed)
    </div>
    <div class="test-suite-body" id="suite-${index}">
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    suite.tests.forEach(test => {
      const statusClass = 
        test.status === 'passed' ? 'test-status-passed' :
        test.status === 'failed' ? 'test-status-failed' : 'test-status-pending';
      
      html += `
          <tr>
            <td>${test.title}</td>
            <td><span class="test-status ${statusClass}">${test.status}</span></td>
            <td>${(test.duration / 1000).toFixed(3)}s</td>
          </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    </div>
  </div>
    `;
  });
  
  html += `
  <footer>
    <p>Generated on ${new Date().toLocaleString()} • Skidbladnir Test Platform</p>
  </footer>
  <script>
    function toggleSuite(index) {
      const suite = document.getElementById('suite-' + index);
      suite.style.display = suite.style.display === 'block' ? 'none' : 'block';
    }
    
    // Auto-expand failed suites
    document.addEventListener('DOMContentLoaded', function() {
      ${summary.numFailedTests > 0 ? `
        // Expand all suites with failures
        ${summary.testResults
          .map((suite, index) => suite.tests.some(t => t.status === 'failed') ? `toggleSuite(${index});` : '')
          .filter(Boolean)
          .join('\n        ')}
      ` : ''}
    });
  </script>
</body>
</html>
  `;
  
  return html;
}

// Write HTML report
const htmlReport = generateHtml(summary, coverageInfo);
fs.writeFileSync(OUTPUT_FILE, htmlReport);

console.log(`Test report generated at ${OUTPUT_FILE}`);
console.log(`Summary: ${summary.numPassedTests} passed, ${summary.numFailedTests} failed, ${summary.numPendingTests} pending`);

// Exit with appropriate code
process.exit(summary.success ? 0 : 1);