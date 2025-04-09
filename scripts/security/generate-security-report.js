#!/usr/bin/env node

/**
 * Security Report Generator
 * 
 * This script generates HTML and Markdown reports from CodeQL SARIF output.
 * It's used to provide a more user-friendly view of security scan results.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Configuration
const RESULTS_DIR = path.join(process.cwd(), 'codeql-results');
const OUTPUT_DIR = path.join(process.cwd(), 'security-reports');
const SARIF_FILE = path.join(RESULTS_DIR, 'results.sarif');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check if results file exists
if (!fs.existsSync(SARIF_FILE)) {
  console.error(`Error: SARIF file not found at ${SARIF_FILE}`);
  console.error('Run CodeQL analysis first with: npm run security:codeql');
  process.exit(1);
}

// Read and parse the SARIF file
const sarifData = JSON.parse(fs.readFileSync(SARIF_FILE, 'utf8'));

// Extract relevant information
const runs = sarifData.runs || [];
let allResults = [];

runs.forEach(run => {
  const tool = run.tool?.driver?.name || 'Unknown Tool';
  const results = run.results || [];
  
  results.forEach(result => {
    const rule = run.tool?.driver?.rules?.find(r => r.id === result.ruleId) || { name: 'Unknown Rule' };
    const location = result.locations?.[0]?.physicalLocation;
    const filePath = location?.artifactLocation?.uri || 'Unknown file';
    const startLine = location?.region?.startLine || 0;
    const endLine = location?.region?.endLine || startLine;
    const message = result.message?.text || 'No description available';
    const severity = result.level || 'warning';
    
    allResults.push({
      tool,
      ruleId: result.ruleId,
      ruleName: rule.name,
      message,
      filePath,
      startLine,
      endLine,
      severity,
      codeSnippet: location?.region?.snippet?.text || ''
    });
  });
});

// Sort results by severity and file path
allResults.sort((a, b) => {
  if (a.severity === b.severity) {
    return a.filePath.localeCompare(b.filePath);
  }
  
  // Sort by severity (error > warning > note > none)
  const severityOrder = { error: 0, warning: 1, note: 2, none: 3 };
  return severityOrder[a.severity] - severityOrder[b.severity];
});

// Count issues by severity
const issueCounts = {
  error: allResults.filter(r => r.severity === 'error').length,
  warning: allResults.filter(r => r.severity === 'warning').length,
  note: allResults.filter(r => r.severity === 'note').length,
  none: allResults.filter(r => r.severity === 'none').length,
  total: allResults.length
};

// Generate HTML report
function generateHtmlReport() {
  const reportDate = new Date().toISOString().split('T')[0];
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skíðblaðnir Security Report - ${reportDate}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4 { margin-top: 1.5em; }
    .summary { 
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }
    .stat {
      padding: 15px;
      border-radius: 5px;
      flex: 1;
      text-align: center;
    }
    .stat.error { background-color: #f8d7da; color: #721c24; }
    .stat.warning { background-color: #fff3cd; color: #856404; }
    .stat.note { background-color: #cce5ff; color: #004085; }
    .stat.total { background-color: #e2e3e5; color: #383d41; }
    .number { font-size: 24px; font-weight: bold; }
    .issue {
      border: 1px solid #ddd;
      border-radius: 5px;
      margin-bottom: 15px;
      padding: 15px;
      background-color: #f8f9fa;
    }
    .issue.error { border-left: 5px solid #dc3545; }
    .issue.warning { border-left: 5px solid #ffc107; }
    .issue.note { border-left: 5px solid #17a2b8; }
    .issue.none { border-left: 5px solid #6c757d; }
    .location {
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 5px;
      border-radius: 3px;
    }
    .snippet {
      font-family: monospace;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 5px;
      overflow-x: auto;
      white-space: pre;
      margin-top: 10px;
    }
    .severity {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: bold;
      text-transform: uppercase;
    }
    .severity.error { background-color: #dc3545; color: white; }
    .severity.warning { background-color: #ffc107; color: black; }
    .severity.note { background-color: #17a2b8; color: white; }
    .severity.none { background-color: #6c757d; color: white; }
    .rule-id {
      font-size: 0.8em;
      color: #6c757d;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>Skíðblaðnir Security Report</h1>
  <p>Generated on ${reportDate}</p>
  
  <h2>Summary</h2>
  <div class="summary">
    <div class="stat error">
      <div class="number">${issueCounts.error}</div>
      <div>Errors</div>
    </div>
    <div class="stat warning">
      <div class="number">${issueCounts.warning}</div>
      <div>Warnings</div>
    </div>
    <div class="stat note">
      <div class="number">${issueCounts.note}</div>
      <div>Notes</div>
    </div>
    <div class="stat total">
      <div class="number">${issueCounts.total}</div>
      <div>Total Issues</div>
    </div>
  </div>
  
  <h2>Issues</h2>`;
  
  if (allResults.length === 0) {
    html += `<p>No security issues found. Great job!</p>`;
  } else {
    allResults.forEach(issue => {
      html += `
  <div class="issue ${issue.severity}">
    <div>
      <span class="severity ${issue.severity}">${issue.severity}</span>
      <strong>${issue.ruleName}</strong>
      <span class="rule-id">${issue.ruleId}</span>
    </div>
    <p>${issue.message}</p>
    <div class="location">
      ${issue.filePath}:${issue.startLine}${issue.endLine !== issue.startLine ? `-${issue.endLine}` : ''}
    </div>
    ${issue.codeSnippet ? `<div class="snippet">${issue.codeSnippet}</div>` : ''}
  </div>`;
    });
  }
  
  html += `
  <h2>Recommendations</h2>
  <ul>
    <li>Review all error-level issues as soon as possible</li>
    <li>Address warnings during normal development cycles</li>
    <li>Consult the <a href="../docs/security-analysis.md">Security Analysis documentation</a> for guidance</li>
    <li>Run security scans regularly with <code>npm run security:scan</code></li>
  </ul>
  
  <footer>
    <p>
      This report was generated using CodeQL and ESLint security plugins. 
      For more information, see <a href="../docs/security-analysis.md">Security Analysis documentation</a>.
    </p>
  </footer>
</body>
</html>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'security-report.html'), html);
  console.log(`HTML report generated: ${path.join(OUTPUT_DIR, 'security-report.html')}`);
}

// Generate Markdown report
function generateMarkdownReport() {
  const reportDate = new Date().toISOString().split('T')[0];
  
  let markdown = `# Skíðblaðnir Security Report

Generated on ${reportDate}

## Summary

- **Errors**: ${issueCounts.error}
- **Warnings**: ${issueCounts.warning}
- **Notes**: ${issueCounts.note}
- **Total Issues**: ${issueCounts.total}

## Issues

`;

  if (allResults.length === 0) {
    markdown += `No security issues found. Great job!\n`;
  } else {
    allResults.forEach(issue => {
      markdown += `### ${issue.severity.toUpperCase()}: ${issue.ruleName} (${issue.ruleId})

${issue.message}

**Location**: \`${issue.filePath}:${issue.startLine}${issue.endLine !== issue.startLine ? `-${issue.endLine}` : ''}\`

${issue.codeSnippet ? `\`\`\`\n${issue.codeSnippet}\n\`\`\`\n` : ''}

`;
    });
  }
  
  markdown += `## Recommendations

- Review all error-level issues as soon as possible
- Address warnings during normal development cycles
- Consult the [Security Analysis documentation](../docs/security-analysis.md) for guidance
- Run security scans regularly with \`npm run security:scan\`

---

This report was generated using CodeQL and ESLint security plugins. For more information, see [Security Analysis documentation](../docs/security-analysis.md).
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'security-report.md'), markdown);
  console.log(`Markdown report generated: ${path.join(OUTPUT_DIR, 'security-report.md')}`);
}

// Generate JSON report (for CI/CD integration)
function generateJsonReport() {
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: issueCounts,
    issues: allResults
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'security-report.json'), JSON.stringify(jsonReport, null, 2));
  console.log(`JSON report generated: ${path.join(OUTPUT_DIR, 'security-report.json')}`);
}

// Generate all reports
generateHtmlReport();
generateMarkdownReport();
generateJsonReport();

console.log(`Security reports generated in ${OUTPUT_DIR}`);

// Exit with non-zero status code if there are error-level issues
if (issueCounts.error > 0) {
  console.error(`Found ${issueCounts.error} error-level security issues.`);
  process.exit(1);
}